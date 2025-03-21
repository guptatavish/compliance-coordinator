
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
1. Install dependencies: pip install flask requests flask-cors
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

def generate_pdf_report(report_data):
    """Generate a PDF report from compliance data."""
    jurisdiction = report_data.get('jurisdictionName', 'Unknown')
    compliance_score = report_data.get('complianceScore', 0)
    risk_level = report_data.get('riskLevel', 'Unknown')
    status = report_data.get('status', 'Unknown')
    requirements = report_data.get('requirementsList', [])
    
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

def get_compliance_from_perplexity(api_key: str, company_profile: Dict[str, Any], jurisdiction: str) -> Dict[str, Any]:
    """
    Use Perplexity API to analyze compliance requirements.
    
    Args:
        api_key: Perplexity API key
        company_profile: Company profile data
        jurisdiction: Jurisdiction to analyze
    
    Returns:
        Dict containing compliance analysis
    """
    # Create a prompt for the Perplexity API
    prompt = f"""
    I need a compliance analysis for a {company_profile.get('companySize', '')} company in the {company_profile.get('industry', '')} industry 
    operating in {jurisdiction}. The company description is: {company_profile.get('description', 'No description provided')}.
    
    Please provide a detailed compliance analysis with the following structure:
    1. A list of 5-8 key compliance requirements for this company in this jurisdiction
    2. For each requirement, provide:
       - A unique ID (like "req1", "req2", etc.)
       - A short title
       - A brief description
       - A category (e.g., Data Protection, Financial Reporting, etc.)
       - Status: whether this type of company would typically meet this requirement ("met", "partial", or "not-met")
       - Risk level if not met ("high", "medium", or "low")
       - A recommendation if the requirement is not fully met
    3. An overall compliance score (0-100)
    4. Overall risk level (high, medium, or low)
    5. Overall compliance status (compliant, partial, or non-compliant)
    
    Format your response as a JSON object with the following structure:
    {{
       "requirements": [
        {{
           "id": "req1",
           "title": "Requirement Title",
           "description": "Brief description of the requirement",
           "category": "Category Name",
           "status": "met|partial|not-met",
           "risk": "high|medium|low",
           "recommendation": "Recommendation if not met",
           "isMet": true|false
        }},
        ...more requirements...
       ],
       "complianceScore": 75,
       "riskLevel": "medium",
       "status": "partial"
    }}
    
    Respond ONLY with the JSON object, no other text.
    """
    
    # Set a consistent seed value to get more consistent results
    seed_value = hash(f"{jurisdiction}_{company_profile.get('companyName', '')}_{company_profile.get('industry', '')}") % 10000
    
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
                "content": "You are a compliance expert specializing in financial regulations. Provide only JSON responses with no additional text."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.1,  # Lower temperature for more consistent results
        "max_tokens": 2000,
        "random_seed": seed_value  # Add seed for consistency
    }
    
    response = requests.post(
        "https://api.perplexity.ai/chat/completions", 
        headers=headers, 
        json=payload
    )
    
    if response.status_code != 200:
        raise Exception(f"Perplexity API error: {response.text}")
    
    result = response.json()
    
    # Extract the JSON part from the response
    response_text = result.get("choices", [{}])[0].get("message", {}).get("content", "{}")
    
    # Clean up the response to handle potential formatting issues
    response_text = response_text.strip()
    
    # If the response starts with a code block, remove it
    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]
    
    response_text = response_text.strip()
    
    # Parse the JSON response
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        raise Exception("Failed to parse Perplexity response as JSON")

def format_compliance_response(compliance_data: Dict[str, Any], jurisdiction: str) -> Dict[str, Any]:
    """
    Format the compliance data into the expected response format.
    
    Args:
        compliance_data: Raw compliance data from Perplexity
        jurisdiction: Jurisdiction ID
    
    Returns:
        Formatted compliance response
    """
    # Add missing ID fields to requirements if needed
    requirements_list = compliance_data.get("requirements", [])
    for i, req in enumerate(requirements_list):
        if "id" not in req:
            req["id"] = f"req{i+1}"
    
    # Count the number of met requirements
    met_count = sum(1 for req in requirements_list if req.get("isMet", False))
    total_count = len(requirements_list)
    
    # Get jurisdiction name
    jurisdiction_name = get_jurisdiction_name(jurisdiction)
    
    # Format the response
    return {
        "jurisdictionId": jurisdiction,
        "jurisdictionName": jurisdiction_name,
        "flag": get_jurisdiction_flag(jurisdiction),
        "complianceScore": compliance_data.get("complianceScore", 0),
        "status": compliance_data.get("status", "non-compliant"),
        "riskLevel": compliance_data.get("riskLevel", "high"),
        "requirements": {
            "total": total_count,
            "met": met_count
        },
        "requirementsList": requirements_list,
        "recentChanges": 0  # Default to 0
    }

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
