
"""
Python Backend for ComplianceSync

This file serves as a starting point for implementing the Python backend
for the ComplianceSync application. It provides a Flask API that handles
requests from the React frontend and interacts with the Perplexity API
to analyze compliance requirements.

Requirements:
- Flask
- requests
- python-dotenv (optional, for loading .env file)
- flask-cors
- reportlab (for PDF generation)

To run:
1. Install dependencies: pip install flask requests flask-cors reportlab python-dotenv xlsxwriter
2. Run the server: python app.py
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import requests
import json
import os
import uuid
import time
from typing import Dict, List, Any, Optional
from datetime import datetime
import io
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
import csv
import xlsxwriter
import traceback

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Store analysis results in memory (in a real app, this would be in a database)
stored_analysis_results = {}
document_cache = {}

# Routes
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify the backend is running."""
    return jsonify({"status": "ok", "message": "Python backend is running"}), 200

@app.route('/analyze-compliance', methods=['POST'])
def analyze_compliance():
    """
    Analyze compliance based on company profile and jurisdiction.
    
    Expects a JSON payload with:
    - apiKey: Perplexity API key
    - companyProfile: Company profile data
    - jurisdiction: Jurisdiction to analyze (e.g., 'us', 'eu')
    """
    try:
        data = request.json
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        api_key = data.get('apiKey')
        company_profile = data.get('companyProfile')
        jurisdiction = data.get('jurisdiction')
        
        if not api_key or not company_profile or not jurisdiction:
            return jsonify({"error": "Missing required fields"}), 400
        
        # Generate a cache key for this analysis request
        cache_key = f"{jurisdiction}_{company_profile.get('companyName', '')}_{company_profile.get('industry', '')}"
        
        # Check if we have a recent cached result (less than 1 hour old)
        current_time = time.time()
        if cache_key in stored_analysis_results and (current_time - stored_analysis_results[cache_key]['timestamp'] < 3600):
            print(f"Using cached result for {cache_key}")
            return jsonify(stored_analysis_results[cache_key]['data']), 200
        
        # Get compliance analysis from Perplexity API
        compliance_data = get_compliance_from_perplexity(api_key, company_profile, jurisdiction)
        
        if not compliance_data:
            return jsonify({"error": "Failed to get compliance data from Perplexity API"}), 500
        
        # Process and format the response
        formatted_response = format_compliance_response(compliance_data, jurisdiction)
        
        # Store the result in our cache
        stored_analysis_results[cache_key] = {
            'timestamp': current_time,
            'data': formatted_response
        }
        
        return jsonify(formatted_response), 200
        
    except Exception as e:
        print(f"Error processing request: {str(e)}")
        traceback.print_exc()  # Print the full stack trace for debugging
        return jsonify({"error": f"Failed to process request: {str(e)}"}), 500

@app.route('/export-report/<format>', methods=['POST'])
def export_report(format):
    """
    Export a compliance report in the specified format.
    
    Expects a JSON payload with:
    - data: The compliance data to include in the report
    
    Parameters:
    - format: 'pdf', 'excel' or 'csv'
    """
    try:
        data = request.json
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        report_data = data.get('data')
        if not report_data:
            return jsonify({"error": "No report data provided"}), 400
        
        if format == 'pdf':
            # Generate a proper PDF file using ReportLab
            pdf_bytes = generate_pdf_report(report_data)
            
            # Create a BytesIO object from the PDF content
            bytes_io = io.BytesIO(pdf_bytes)
            bytes_io.seek(0)
            
            return send_file(
                bytes_io,
                mimetype='application/pdf',
                as_attachment=True,
                download_name=f"compliance_report_{datetime.now().strftime('%Y%m%d')}.pdf"
            )
            
        elif format == 'excel':
            # Generate a proper Excel file
            excel_bytes = generate_excel_report(report_data)
            
            # Create a BytesIO object from the Excel content
            bytes_io = io.BytesIO(excel_bytes)
            bytes_io.seek(0)
            
            return send_file(
                bytes_io,
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                as_attachment=True,
                download_name=f"compliance_report_{datetime.now().strftime('%Y%m%d')}.xlsx"
            )
            
        elif format == 'csv':
            # Generate a proper CSV file
            csv_bytes = generate_csv_report(report_data)
            
            # Create a BytesIO object from the CSV content
            bytes_io = io.BytesIO(csv_bytes)
            bytes_io.seek(0)
            
            return send_file(
                bytes_io,
                mimetype='text/csv',
                as_attachment=True,
                download_name=f"compliance_report_{datetime.now().strftime('%Y%m%d')}.csv"
            )
            
        else:
            return jsonify({"error": "Unsupported format"}), 400
            
    except Exception as e:
        print(f"Error exporting report: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Failed to export report: {str(e)}"}), 500

@app.route('/export-regulatory-doc', methods=['POST'])
def export_regulatory_doc():
    """
    Export a regulatory reference document.
    
    Expects a JSON payload with:
    - apiKey: Perplexity API key
    - jurisdiction: Jurisdiction to get regulations for
    - docType: Type of document ('full', 'summary', 'guidance')
    - companyProfile: Company profile data for context
    """
    try:
        data = request.json
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        api_key = data.get('apiKey')
        jurisdiction = data.get('jurisdiction')
        doc_type = data.get('docType', 'full')
        company_profile = data.get('companyProfile')
        
        if not api_key or not jurisdiction or not company_profile:
            return jsonify({"error": "Missing required fields"}), 400
        
        # Generate a cache key for this document request
        cache_key = f"reg_doc_{jurisdiction}_{doc_type}_{company_profile.get('industry', '')}"
        
        # Check if we have a cached document (valid for 24 hours)
        current_time = time.time()
        if cache_key in document_cache and (current_time - document_cache[cache_key]['timestamp'] < 86400):
            print(f"Using cached regulatory document for {cache_key}")
            document_content = document_cache[cache_key]['content']
        else:
            # Get regulatory document from Perplexity API
            document_content = get_regulatory_document(api_key, jurisdiction, doc_type, company_profile)
            
            # Store in cache
            document_cache[cache_key] = {
                'timestamp': current_time,
                'content': document_content
            }
        
        # Generate a proper PDF document
        pdf_bytes = generate_regulatory_pdf(document_content, jurisdiction)
        
        # Create a BytesIO object from the PDF content
        bytes_io = io.BytesIO(pdf_bytes)
        bytes_io.seek(0)
        
        return send_file(
            bytes_io,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"regulatory_reference_{jurisdiction}_{datetime.now().strftime('%Y%m%d')}.pdf"
        )
            
    except Exception as e:
        print(f"Error exporting regulatory document: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Failed to export regulatory document: {str(e)}"}), 500

def generate_pdf_report(report_data):
    """Generate a proper PDF report from compliance data using ReportLab."""
    # ... keep existing code (PDF generation function)
    jurisdiction = report_data.get('jurisdictionName', 'Unknown')
    compliance_score = report_data.get('complianceScore', 0)
    risk_level = report_data.get('riskLevel', 'Unknown')
    status = report_data.get('status', 'Unknown')
    requirements = report_data.get('requirementsList', [])
    
    # Create a PDF in memory
    buffer = io.BytesIO()
    
    # Create the PDF document using ReportLab
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = styles['Title']
    heading_style = styles['Heading1']
    normal_style = styles['Normal']
    
    # Create header style for requirement titles
    req_title_style = ParagraphStyle(
        'ReqTitle',
        parent=styles['Heading2'],
        fontSize=12,
        spaceAfter=6
    )
    
    # Build the document content
    content = []
    
    # Add title
    content.append(Paragraph("COMPLIANCE ANALYSIS REPORT", title_style))
    content.append(Spacer(1, 12))
    
    # Add generated date
    content.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", normal_style))
    content.append(Spacer(1, 12))
    
    # Add jurisdiction
    content.append(Paragraph(f"JURISDICTION: {jurisdiction}", heading_style))
    content.append(Spacer(1, 12))
    
    # Summary section
    content.append(Paragraph("SUMMARY", heading_style))
    content.append(Spacer(1, 6))
    
    summary_data = [
        ["Compliance Score:", f"{compliance_score}%"],
        ["Risk Level:", risk_level],
        ["Status:", status]
    ]
    
    summary_table = Table(summary_data, colWidths=[150, 300])
    summary_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    
    content.append(summary_table)
    content.append(Spacer(1, 12))
    
    # Requirements summary
    content.append(Paragraph("REQUIREMENTS SUMMARY", heading_style))
    content.append(Spacer(1, 6))
    
    req_summary_data = [
        ["Total Requirements:", str(report_data.get('requirements', {}).get('total', 0))],
        ["Requirements Met:", str(report_data.get('requirements', {}).get('met', 0))]
    ]
    
    req_summary_table = Table(req_summary_data, colWidths=[150, 300])
    req_summary_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    
    content.append(req_summary_table)
    content.append(Spacer(1, 12))
    
    # Detailed requirements
    content.append(Paragraph("DETAILED REQUIREMENTS", heading_style))
    content.append(Spacer(1, 12))
    
    for req in requirements:
        # Create a colored background based on status
        status_color = colors.green if req.get('status') == 'met' else colors.orange if req.get('status') == 'partial' else colors.red
        
        # Add requirement title with ID
        req_title = f"{req.get('title', 'Untitled')} (ID: {req.get('id', 'Unknown')})"
        content.append(Paragraph(req_title, req_title_style))
        
        # Create requirement details table
        req_details = [
            ["Category:", req.get('category', 'Uncategorized')],
            ["Status:", req.get('status', 'Unknown')],
            ["Risk:", req.get('risk', 'Unknown')]
        ]
        
        req_table = Table(req_details, colWidths=[100, 350])
        req_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        content.append(req_table)
        content.append(Spacer(1, 6))
        
        # Description
        content.append(Paragraph("<b>Description:</b>", normal_style))
        content.append(Paragraph(req.get('description', 'No description provided'), normal_style))
        content.append(Spacer(1, 6))
        
        # Recommendation (if any)
        if req.get('recommendation'):
            content.append(Paragraph("<b>Recommendation:</b>", normal_style))
            content.append(Paragraph(req.get('recommendation'), normal_style))
        
        content.append(Spacer(1, 12))
    
    # Build the PDF
    doc.build(content)
    
    # Get the PDF content
    pdf_content = buffer.getvalue()
    buffer.close()
    
    return pdf_content

def generate_excel_report(report_data):
    """Generate a proper Excel report from compliance data."""
    # ... keep existing code (Excel generation function)
    # Create a BytesIO object to save the workbook to
    output = io.BytesIO()
    
    # Create a workbook and add a worksheet
    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet("Compliance Report")
    
    # Add formatting
    title_format = workbook.add_format({'bold': True, 'font_size': 16, 'align': 'center'})
    header_format = workbook.add_format({'bold': True, 'bg_color': '#D8E4BC', 'border': 1})
    cell_format = workbook.add_format({'border': 1})
    met_format = workbook.add_format({'bg_color': '#C6EFCE', 'border': 1})
    partial_format = workbook.add_format({'bg_color': '#FFEB9C', 'border': 1})
    not_met_format = workbook.add_format({'bg_color': '#FFC7CE', 'border': 1})
    
    # Set column widths
    worksheet.set_column('A:A', 10)  # ID
    worksheet.set_column('B:B', 30)  # Title
    worksheet.set_column('C:C', 20)  # Category
    worksheet.set_column('D:D', 15)  # Status
    worksheet.set_column('E:E', 15)  # Risk
    worksheet.set_column('F:F', 40)  # Description
    worksheet.set_column('G:G', 40)  # Recommendation
    
    # Write title
    worksheet.merge_range('A1:G1', f"COMPLIANCE REPORT - {report_data.get('jurisdictionName', 'Unknown')}", title_format)
    worksheet.merge_range('A2:G2', f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", workbook.add_format({'align': 'center'}))
    
    # Write summary
    worksheet.merge_range('A4:G4', "SUMMARY", workbook.add_format({'bold': True, 'font_size': 14}))
    worksheet.write('A5', "Compliance Score:", workbook.add_format({'bold': True}))
    worksheet.write('B5', f"{report_data.get('complianceScore', 0)}%")
    worksheet.write('A6', "Risk Level:", workbook.add_format({'bold': True}))
    worksheet.write('B6', report_data.get('riskLevel', 'Unknown'))
    worksheet.write('A7', "Status:", workbook.add_format({'bold': True}))
    worksheet.write('B7', report_data.get('status', 'Unknown'))
    
    # Write requirements summary
    worksheet.merge_range('A9:G9', "REQUIREMENTS SUMMARY", workbook.add_format({'bold': True, 'font_size': 14}))
    worksheet.write('A10', "Total Requirements:", workbook.add_format({'bold': True}))
    worksheet.write('B10', report_data.get('requirements', {}).get('total', 0))
    worksheet.write('A11', "Requirements Met:", workbook.add_format({'bold': True}))
    worksheet.write('B11', report_data.get('requirements', {}).get('met', 0))
    
    # Write requirements table header
    row = 13
    worksheet.merge_range(f'A{row}:G{row}', "DETAILED REQUIREMENTS", workbook.add_format({'bold': True, 'font_size': 14}))
    row += 1
    
    # Write header row
    headers = ["ID", "Title", "Category", "Status", "Risk", "Description", "Recommendation"]
    for col, header in enumerate(headers):
        worksheet.write(row, col, header, header_format)
    
    # Write data rows
    requirements = report_data.get('requirementsList', [])
    for req in requirements:
        row += 1
        
        # Determine format based on status
        if req.get('status') == 'met':
            format_to_use = met_format
        elif req.get('status') == 'partial':
            format_to_use = partial_format
        else:
            format_to_use = not_met_format
        
        # Write requirement data
        worksheet.write(row, 0, req.get('id', ''), format_to_use)
        worksheet.write(row, 1, req.get('title', ''), format_to_use)
        worksheet.write(row, 2, req.get('category', ''), format_to_use)
        worksheet.write(row, 3, req.get('status', ''), format_to_use)
        worksheet.write(row, 4, req.get('risk', ''), format_to_use)
        worksheet.write(row, 5, req.get('description', ''), format_to_use)
        worksheet.write(row, 6, req.get('recommendation', ''), format_to_use)
    
    # Close the workbook
    workbook.close()
    
    # Get the Excel content
    excel_content = output.getvalue()
    output.close()
    
    return excel_content

def generate_csv_report(report_data):
    """Generate a proper CSV report from compliance data."""
    # ... keep existing code (CSV generation function)
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header information
    writer.writerow(["Jurisdiction", report_data.get('jurisdictionName', 'Unknown')])
    writer.writerow(["Generated", datetime.now().strftime('%Y-%m-%d %H:%M:%S')])
    writer.writerow(["Compliance Score", f"{report_data.get('complianceScore', 0)}%"])
    writer.writerow(["Risk Level", report_data.get('riskLevel', 'Unknown')])
    writer.writerow(["Status", report_data.get('status', 'Unknown')])
    writer.writerow([])
    
    # Write requirements summary
    writer.writerow(["REQUIREMENTS SUMMARY"])
    writer.writerow(["Total Requirements", report_data.get('requirements', {}).get('total', 0)])
    writer.writerow(["Requirements Met", report_data.get('requirements', {}).get('met', 0)])
    writer.writerow([])
    
    # Write requirements header
    writer.writerow(["DETAILED REQUIREMENTS"])
    writer.writerow(["ID", "Title", "Category", "Status", "Risk", "Description", "Recommendation"])
    
    # Write requirements data
    requirements = report_data.get('requirementsList', [])
    for req in requirements:
        writer.writerow([
            req.get('id', ''),
            req.get('title', ''),
            req.get('category', ''),
            req.get('status', ''),
            req.get('risk', ''),
            req.get('description', ''),
            req.get('recommendation', '')
        ])
    
    # Get the CSV content
    csv_content = output.getvalue().encode('utf-8')
    output.close()
    
    return csv_content

def generate_regulatory_pdf(document_content, jurisdiction):
    """Generate a proper PDF document for regulatory content using ReportLab."""
    # ... keep existing code (regulatory PDF generation function)
    # Create a PDF in memory
    buffer = io.BytesIO()
    
    # Create the PDF document using ReportLab
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = styles['Title']
    heading_style = styles['Heading1']
    subheading_style = styles['Heading2']
    normal_style = styles['Normal']
    
    # Build the document content
    content = []
    
    # Add title
    content.append(Paragraph("REGULATORY REFERENCE DOCUMENT", title_style))
    content.append(Spacer(1, 12))
    
    # Add jurisdiction and date
    content.append(Paragraph(f"Jurisdiction: {get_jurisdiction_name(jurisdiction)}", subheading_style))
    content.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", normal_style))
    content.append(Spacer(1, 12))
    
    # Parse and format the document content
    lines = document_content.split('\n')
    current_section = None
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Check if it's a heading (all caps or ending with colon)
        if line.isupper() or (len(line) > 20 and line.endswith(':')):
            current_section = line
            content.append(Paragraph(line, heading_style))
            content.append(Spacer(1, 6))
        elif line.startswith('#') or line.startswith('##'):
            # Markdown style heading
            heading_level = line.count('#')
            heading_text = line.lstrip('#').strip()
            if heading_level == 1:
                content.append(Paragraph(heading_text, heading_style))
            else:
                content.append(Paragraph(heading_text, subheading_style))
            content.append(Spacer(1, 6))
        else:
            content.append(Paragraph(line, normal_style))
            content.append(Spacer(1, 3))
    
    # Build the PDF
    doc.build(content)
    
    # Get the PDF content
    pdf_content = buffer.getvalue()
    buffer.close()
    
    return pdf_content

def get_regulatory_document(api_key, jurisdiction, doc_type, company_profile):
    """Generate a regulatory reference document using Perplexity."""
    # ... keep existing code (Perplexity API function)
    # Create a prompt for the Perplexity API
    prompt = f"""
    Create a detailed regulatory reference document for a {company_profile.get('companySize', '')} company in the {company_profile.get('industry', '')} industry 
    operating in {jurisdiction}. This document should serve as a comprehensive reference guide for regulatory compliance.
    
    The document should be focused on the type: {doc_type} (full regulations, summary, or compliance guidance).
    
    Please structure the document with the following sections:
    
    1. Executive Summary
    2. Regulatory Framework Overview
    3. Key Regulatory Bodies
    4. Primary Regulations and Standards
    5. Compliance Requirements
       - Include specific regulations with reference numbers where applicable
       - Note deadlines and reporting requirements
    6. Common Compliance Challenges
    7. Recommended Compliance Strategies
    8. Resources and References
    
    Make the document specific to {company_profile.get('industry', '')} in {jurisdiction} and include as much specific regulatory information as possible including actual regulation names, articles, and compliance deadlines.
    
    Format the response as a well-structured document suitable for a professional audience.
    """
    
    # Set a consistent seed value
    seed_value = hash(f"reg_doc_{jurisdiction}_{doc_type}_{company_profile.get('industry', '')}") % 10000
    
    try:
        # Call the Perplexity API
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "llama-3.1-sonar-small-128k-online",
            "messages": [
                {
                    "role": "system",
                    "content": "You are a regulatory compliance expert specializing in creating accurate, detailed regulatory reference documents. Your responses should be well-structured, comprehensive, and include specific regulatory details."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.2,  # Lower temperature for more factual and consistent results
            "max_tokens": 4000,
            "random_seed": seed_value
        }
        
        print(f"Sending request to Perplexity API for regulatory document: {jurisdiction}, {doc_type}")
        
        response = requests.post(
            "https://api.perplexity.ai/chat/completions", 
            headers=headers, 
            json=payload,
            timeout=60  # 60 second timeout
        )
        
        print(f"Received response from Perplexity API: Status {response.status_code}")
        
        if response.status_code != 200:
            print(f"Perplexity API error: {response.text}")
            return f"""
REGULATORY REFERENCE DOCUMENT
============================
Jurisdiction: {jurisdiction}
Industry: {company_profile.get('industry', 'Not specified')}
Document Type: {doc_type}
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Error generating document: API returned status code {response.status_code}.

Please try again later.
            """
        
        result = response.json()
        
        # Extract the content from the response
        document_content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        
        if not document_content:
            print("Empty response from Perplexity API")
            return f"""
REGULATORY REFERENCE DOCUMENT
============================
Jurisdiction: {jurisdiction}
Industry: {company_profile.get('industry', 'Not specified')}
Document Type: {doc_type}
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Error generating document: API returned an empty response.

Please try again later.
            """
        
        # Format as a document
        formatted_document = f"""
REGULATORY REFERENCE DOCUMENT
============================
Jurisdiction: {jurisdiction}
Industry: {company_profile.get('industry', 'Not specified')}
Document Type: {doc_type}
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

{document_content}
        """
        
        return formatted_document
        
    except Exception as e:
        print(f"Error getting regulatory document: {str(e)}")
        traceback.print_exc()
        
        # Return a basic document with the error
        return f"""
REGULATORY REFERENCE DOCUMENT
============================
Jurisdiction: {jurisdiction}
Industry: {company_profile.get('industry', 'Not specified')}
Document Type: {doc_type}
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Error generating document: {str(e)}

Please try again later.
        """

def get_compliance_from_perplexity(api_key, company_profile, jurisdiction):
    """
    Use Perplexity API to analyze compliance requirements.
    
    Args:
        api_key: Perplexity API key
        company_profile: Company profile data
        jurisdiction: Jurisdiction to analyze
    
    Returns:
        Dict containing compliance analysis
    """
    try:
        # Create a prompt for the LLM that requests a structured compliance analysis
        prompt = f"""
        Analyze the compliance requirements for a {company_profile.get('companySize', '')} company in the {company_profile.get('industry', '')} industry operating in {jurisdiction}.
        
        Company details:
        - Name: {company_profile.get('companyName', 'Company')}
        - Size: {company_profile.get('companySize', '')}
        - Industry: {company_profile.get('industry', '')}
        - Description: {company_profile.get('description', '')}
        
        Please provide a detailed compliance analysis with the following structure:
        
        1. Overall compliance status (compliant, partial, non-compliant)
        2. Risk level assessment (high, medium, low)
        3. Compliance score (0-100)
        4. List of key compliance requirements with:
           - Requirement title
           - Description
           - Category (e.g. Financial, Data Protection, Employment)
           - Status (met, partial, not-met)
           - Risk level for each requirement (high, medium, low)
           - Recommendations for requirements not fully met
           
        Format your response as a structured JSON object with the following format:
        ```json
        {
            "status": "compliant|partial|non-compliant",
            "riskLevel": "high|medium|low",
            "complianceScore": 85,
            "requirementsList": [
                {
                    "id": "unique-id",
                    "title": "Requirement Title",
                    "description": "Detailed description",
                    "category": "Category",
                    "status": "met|partial|not-met",
                    "risk": "high|medium|low",
                    "recommendation": "Only include for non-met or partial requirements"
                }
            ]
        }
        ```
        
        Provide specific, relevant requirements for {jurisdiction} that would apply to this type of company.
        Include at least 12 detailed requirements covering different regulatory areas.
        """
        
        # Set a random seed value for consistent results
        seed_value = hash(f"{jurisdiction}_{company_profile.get('companyName', '')}_{company_profile.get('industry', '')}") % 10000
        
        print(f"Sending request to Perplexity API for compliance analysis: {jurisdiction}")
        
        # Call the Perplexity API
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "llama-3.1-sonar-small-128k-online",
            "messages": [
                {
                    "role": "system",
                    "content": "You are a regulatory compliance expert specializing in assessing company compliance with regulatory frameworks across different jurisdictions. You provide detailed, accurate compliance analyses and structured JSON outputs."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.3,  # Lower temperature for more factual results
            "max_tokens": 4000,
            "random_seed": seed_value
        }
        
        response = requests.post(
            "https://api.perplexity.ai/chat/completions", 
            headers=headers, 
            json=payload,
            timeout=60  # 60 second timeout
        )
        
        print(f"Received response from Perplexity API: Status {response.status_code}")
        
        if response.status_code != 200:
            print(f"Perplexity API error: {response.text}")
            return None
        
        result = response.json()
        
        # Extract the content from the response
        content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        
        if not content:
            print("Empty response from Perplexity API")
            return None
        
        # Extract JSON from the content
        # The LLM might return extra text, so we need to find the JSON part
        json_start = content.find('{')
        json_end = content.rfind('}') + 1
        
        if json_start == -1 or json_end == 0:
            print("Could not find JSON in response")
            print(f"Content: {content}")
            
            # Try to parse the whole content as JSON
            try:
                return json.loads(content)
            except:
                return None
        
        json_content = content[json_start:json_end]
        
        try:
            compliance_data = json.loads(json_content)
            return compliance_data
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON from Perplexity response: {e}")
            print(f"JSON content: {json_content}")
            return None
            
    except Exception as e:
        print(f"Error calling Perplexity API: {str(e)}")
        traceback.print_exc()
        return None

def format_compliance_response(compliance_data, jurisdiction):
    """
    Format the compliance data into the expected response format.
    
    Args:
        compliance_data: Raw compliance data from Perplexity
        jurisdiction: Jurisdiction ID
    
    Returns:
        Formatted compliance response
    """
    try:
        if not compliance_data:
            print("Empty compliance data, cannot format")
            return None
            
        # Extract total requirements
        requirements_list = compliance_data.get('requirementsList', [])
        total_requirements = len(requirements_list)
        
        # Count met requirements
        met_requirements = sum(1 for req in requirements_list if req.get('status') == 'met')
        
        # Build the response structure
        formatted_response = {
            'jurisdictionId': jurisdiction,
            'jurisdictionName': get_jurisdiction_name(jurisdiction),
            'flag': get_jurisdiction_flag(jurisdiction),
            'complianceScore': compliance_data.get('complianceScore', 0),
            'status': compliance_data.get('status', 'non-compliant'),
            'riskLevel': compliance_data.get('riskLevel', 'high'),
            'requirements': {
                'total': total_requirements,
                'met': met_requirements,
            },
            'requirementsList': requirements_list,
        }
        
        return formatted_response
    except Exception as e:
        print(f"Error formatting compliance response: {str(e)}")
        traceback.print_exc()
        return None

def get_jurisdiction_name(jurisdiction_id):
    """Get the name of a jurisdiction from its ID."""
    jurisdictions = {
        'us': 'United States',
        'eu': 'European Union',
        'uk': 'United Kingdom',
        'sg': 'Singapore',
        'au': 'Australia',
        'ca': 'Canada',
        'de': 'Germany',
        'fr': 'France',
        'jp': 'Japan',
        'cn': 'China',
        'in': 'India',
        'br': 'Brazil',
        'za': 'South Africa',
        'ae': 'United Arab Emirates',
        'ch': 'Switzerland',
    }
    
    return jurisdictions.get(jurisdiction_id, jurisdiction_id.upper())

def get_jurisdiction_flag(jurisdiction_id):
    """Get the flag emoji for a jurisdiction."""
    flags = {
        'us': '🇺🇸',
        'eu': '🇪🇺',
        'uk': '🇬🇧',
        'sg': '🇸🇬',
        'au': '🇦🇺',
        'ca': '🇨🇦',
        'de': '🇩🇪',
        'fr': '🇫🇷',
        'jp': '🇯🇵',
        'cn': '🇨🇳',
        'in': '🇮🇳',
        'br': '🇧🇷',
        'za': '🇿🇦',
        'ae': '🇦🇪',
        'ch': '🇨🇭',
    }
    
    return flags.get(jurisdiction_id, '🏳️')

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug_mode = os.environ.get("DEBUG", "True").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
