
"""
Example Python Backend for ComplianceSync

This file serves as a starting point for implementing the Python backend
for the ComplianceSync application. It provides a Flask API that handles
requests from the React frontend and interacts with the Perplexity API
to analyze compliance requirements.

Requirements:
- Flask
- requests
- python-dotenv (optional, for loading .env file)
- flask-cors

To run:
1. Install dependencies: pip install -r requirements.txt
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
import base64
from compliance_evaluator import PerplexityComplianceEvaluator
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
        
        # Extract any uploaded documents (if available)
        documents = data.get('documents', [])
        
        # Check if we have a Mistral API key for OCR
        mistral_api_key = os.environ.get('MISTRAL_API_KEY')
        
        # Create a PerplexityComplianceEvaluator instance
        evaluator = PerplexityComplianceEvaluator(
            perplexity_api_key=api_key,
            mistral_api_key=mistral_api_key
        )
        
        # Run the compliance evaluation
        evaluation_results = evaluator.evaluate_compliance(company_profile, documents)
        
        # Check for errors in the evaluation
        if 'error' in evaluation_results:
            return jsonify({"error": evaluation_results['error']}), 500
        
        # Format the response for the frontend
        formatted_response = {
            "jurisdictionId": jurisdiction,
            "jurisdictionName": get_jurisdiction_name(jurisdiction),
            "flag": get_jurisdiction_flag(jurisdiction),
            "complianceScore": calculate_compliance_score(evaluation_results),
            "status": determine_compliance_status(evaluation_results),
            "riskLevel": determine_risk_level(evaluation_results),
            "requirements": {
                "total": len(evaluation_results.get('requirements', [])),
                "met": sum(1 for req in evaluation_results.get('requirements', []) if req.get('status') == 'met')
            },
            "requirementsList": evaluation_results.get('requirements', []),
            "summary": evaluation_results.get('summary', ''),
            "fullReport": evaluation_results.get('content', ''),
            "recommendations": evaluation_results.get('recommendations', []),
            "recentChanges": 0  # Default to 0
        }
        
        # Store the result in our cache
        stored_analysis_results[cache_key] = {
            'timestamp': current_time,
            'data': formatted_response
        }
        
        return jsonify(formatted_response), 200
        
    except Exception as e:
        print(f"Error processing request: {str(e)}")
        import traceback
        traceback.print_exc()
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
        
        # In a real implementation, you would generate the actual file here
        # For this example, we'll return a placeholder file
        
        if format == 'pdf':
            # Create a simple placeholder PDF report
            # In a real implementation, you'd use a PDF generation library
            report_content = generate_pdf_report(report_data)
            
            # Convert text to bytes for serving as a file
            bytes_io = io.BytesIO(report_content.encode('utf-8'))
            
            return send_file(
                bytes_io,
                mimetype='application/pdf',
                as_attachment=True,
                download_name=f"compliance_report_{datetime.now().strftime('%Y%m%d')}.pdf"
            )
            
        elif format == 'excel':
            # In a real implementation, you'd use an Excel generation library
            report_content = generate_excel_report(report_data)
            
            # Convert text to bytes for serving as a file
            bytes_io = io.BytesIO(report_content.encode('utf-8'))
            
            return send_file(
                bytes_io,
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                as_attachment=True,
                download_name=f"compliance_report_{datetime.now().strftime('%Y%m%d')}.xlsx"
            )
            
        elif format == 'csv':
            # In a real implementation, you'd use a CSV generation library
            report_content = generate_csv_report(report_data)
            
            # Convert text to bytes for serving as a file
            bytes_io = io.BytesIO(report_content.encode('utf-8'))
            
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
        
        # Convert text to bytes for serving as a file
        bytes_io = io.BytesIO(document_content.encode('utf-8'))
        
        return send_file(
            bytes_io,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"regulatory_reference_{jurisdiction}_{datetime.now().strftime('%Y%m%d')}.pdf"
        )
            
    except Exception as e:
        print(f"Error exporting regulatory document: {str(e)}")
        return jsonify({"error": f"Failed to export regulatory document: {str(e)}"}), 500

@app.route('/upload-company-documents', methods=['POST'])
def upload_company_documents():
    """
    Upload and process company documents for analysis.
    
    Expects a multipart form-data with files
    """
    try:
        if 'files[]' not in request.files:
            return jsonify({"error": "No files provided"}), 400
            
        files = request.files.getlist('files[]')
        if not files or len(files) == 0:
            return jsonify({"error": "No files provided"}), 400
            
        processed_documents = []
        
        for file in files:
            # Process each file
            file_content = file.read()
            file_name = file.filename
            
            # Store base64 encoded content
            document = {
                "file_name": file_name,
                "content": base64.b64encode(file_content).decode('utf-8'),
                "size": len(file_content)
            }
            
            processed_documents.append(document)
            
        return jsonify({
            "message": f"Successfully processed {len(processed_documents)} documents",
            "documents": processed_documents
        }), 200
            
    except Exception as e:
        print(f"Error processing documents: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to process documents: {str(e)}"}), 500

def calculate_compliance_score(evaluation_results):
    """Calculate a compliance score based on requirements."""
    requirements = evaluation_results.get('requirements', [])
    if not requirements:
        return 50  # Default score if no requirements
        
    # Calculate based on requirement status
    total = len(requirements)
    met = sum(1 for req in requirements if req.get('status') == 'met')
    partial = sum(1 for req in requirements if req.get('status') == 'partial')
    
    # Partial requirements count as half
    score = (met + (partial * 0.5)) / total * 100
    
    # Adjust based on risk factors
    high_risks = sum(1 for risk in evaluation_results.get('risks', []) if risk.get('level') == 'high')
    if high_risks > 0:
        # Reduce score based on number of high risks
        score = max(10, score - (high_risks * 5))
        
    return round(score)

def determine_compliance_status(evaluation_results):
    """Determine overall compliance status."""
    score = calculate_compliance_score(evaluation_results)
    
    if score >= 80:
        return "compliant"
    elif score >= 50:
        return "partial"
    else:
        return "non-compliant"

def determine_risk_level(evaluation_results):
    """Determine overall risk level."""
    risks = evaluation_results.get('risks', [])
    requirements = evaluation_results.get('requirements', [])
    
    # Count high risks
    high_risks = sum(1 for risk in risks if risk.get('level') == 'high')
    high_risk_reqs = sum(1 for req in requirements if req.get('risk') == 'high' and req.get('status') != 'met')
    
    # If we have multiple high risks, overall risk is high
    if high_risks > 0 or high_risk_reqs > 1:
        return "high"
        
    # Count medium risks
    medium_risks = sum(1 for risk in risks if risk.get('level') == 'medium')
    medium_risk_reqs = sum(1 for req in requirements if req.get('risk') == 'medium' and req.get('status') != 'met')
    
    # If we have multiple medium risks, overall risk is medium
    if medium_risks > 1 or medium_risk_reqs > 2:
        return "medium"
        
    # Default to low risk
    return "low"

def generate_pdf_report(report_data):
    """Generate a PDF report from compliance data."""
    jurisdiction = report_data.get('jurisdictionName', 'Unknown')
    compliance_score = report_data.get('complianceScore', 0)
    risk_level = report_data.get('riskLevel', 'Unknown')
    status = report_data.get('status', 'Unknown')
    requirements = report_data.get('requirementsList', [])
    full_report = report_data.get('fullReport', '')
    
    # If we have a full report, just return that
    if full_report:
        return full_report
    
    # Create a text-based representation of the PDF (in a real app, use a PDF library)
    content = f"""
COMPLIANCE ANALYSIS REPORT
==========================
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

JURISDICTION: {jurisdiction}

SUMMARY
-------
Compliance Score: {compliance_score}%
Risk Level: {risk_level}
Status: {status}

REQUIREMENTS SUMMARY
-------------------
Total Requirements: {report_data.get('requirements', {}).get('total', 0)}
Requirements Met: {report_data.get('requirements', {}).get('met', 0)}

DETAILED REQUIREMENTS
--------------------
"""
    
    for req in requirements:
        content += f"""
{req.get('title', 'Untitled')}
{"=" * len(req.get('title', 'Untitled'))}
ID: {req.get('id', 'Unknown')}
Category: {req.get('category', 'Uncategorized')}
Status: {req.get('status', 'Unknown')}
Risk: {req.get('risk', 'Unknown')}

Description:
{req.get('description', 'No description provided')}

"""
        if req.get('recommendation'):
            content += f"""
Recommendation:
{req.get('recommendation')}

"""
    
    return content

def generate_excel_report(report_data):
    """Generate an Excel report from compliance data."""
    # In a real implementation, you'd use a library like openpyxl
    # This is a simplified text representation
    jurisdiction = report_data.get('jurisdictionName', 'Unknown')
    compliance_score = report_data.get('complianceScore', 0)
    requirements = report_data.get('requirementsList', [])
    
    # Create header
    content = f"Compliance Report - {jurisdiction}\tGenerated: {datetime.now().strftime('%Y-%m-%d')}\n"
    content += f"Compliance Score\t{compliance_score}%\n\n"
    
    # Create requirements table
    content += "ID\tTitle\tCategory\tStatus\tRisk\tDescription\tRecommendation\n"
    
    for req in requirements:
        content += f"{req.get('id', '')}\t{req.get('title', '')}\t{req.get('category', '')}\t"
        content += f"{req.get('status', '')}\t{req.get('risk', '')}\t{req.get('description', '')}\t"
        content += f"{req.get('recommendation', '')}\n"
    
    return content

def generate_csv_report(report_data):
    """Generate a CSV report from compliance data."""
    jurisdiction = report_data.get('jurisdictionName', 'Unknown')
    compliance_score = report_data.get('complianceScore', 0)
    requirements = report_data.get('requirementsList', [])
    
    # Create header
    content = f"Jurisdiction,{jurisdiction}\n"
    content += f"Generated,{datetime.now().strftime('%Y-%m-%d')}\n"
    content += f"Compliance Score,{compliance_score}%\n\n"
    
    # Create requirements table
    content += "ID,Title,Category,Status,Risk,Description,Recommendation\n"
    
    for req in requirements:
        # Escape quotes and commas in fields
        description = req.get('description', '').replace('"', '""')
        recommendation = req.get('recommendation', '').replace('"', '""')
        title = req.get('title', '').replace('"', '""')
        
        content += f"{req.get('id', '')},\"{title}\",{req.get('category', '')},{req.get('status', '')},"
        content += f"{req.get('risk', '')},\"{description}\",\"{recommendation}\"\n"
    
    return content

def get_regulatory_document(api_key, jurisdiction, doc_type, company_profile):
    """Generate a regulatory reference document using Perplexity."""
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
    
    # Call the Perplexity API
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "llama-3.1-sonar-large-128k-online",
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
    
    response = requests.post(
        "https://api.perplexity.ai/chat/completions", 
        headers=headers, 
        json=payload
    )
    
    if response.status_code != 200:
        raise Exception(f"Perplexity API error: {response.text}")
    
    result = response.json()
    
    # Extract the content from the response
    document_content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
    
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

def get_jurisdiction_name(jurisdiction_id: str) -> str:
    """Get the name of a jurisdiction from its ID."""
    jurisdiction_map = {
        "us": "United States",
        "eu": "European Union",
        "uk": "United Kingdom",
        "sg": "Singapore",
        "au": "Australia",
        "ca": "Canada",
        "ch": "Switzerland",
        "hk": "Hong Kong",
        "jp": "Japan",
        "br": "Brazil"
    }
    return jurisdiction_map.get(jurisdiction_id, jurisdiction_id)

def get_jurisdiction_flag(jurisdiction_id: str) -> str:
    """Get the flag emoji for a jurisdiction."""
    flag_map = {
        "us": "🇺🇸",
        "eu": "🇪🇺",
        "uk": "🇬🇧",
        "sg": "🇸🇬",
        "au": "🇦🇺",
        "ca": "🇨🇦",
        "ch": "🇨🇭",
        "hk": "🇭🇰",
        "jp": "🇯🇵",
        "br": "🇧🇷"
    }
    return flag_map.get(jurisdiction_id, "🌐")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
