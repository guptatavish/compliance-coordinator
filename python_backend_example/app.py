
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

from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json
import os
from typing import Dict, List, Any, Optional

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

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
            
        # Get compliance analysis from Perplexity API
        compliance_data = get_compliance_from_perplexity(api_key, company_profile, jurisdiction)
        
        # Process and format the response
        formatted_response = format_compliance_response(compliance_data, jurisdiction)
        
        return jsonify(formatted_response), 200
        
    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return jsonify({"error": f"Failed to process request: {str(e)}"}), 500

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
    
    Please provide:
    1. A list of 5-8 key compliance requirements for this company in this jurisdiction
    2. For each requirement, provide:
       - A short title
       - A brief description
       - An assessment of whether this type of company would typically meet this requirement (true/false)
    3. An overall compliance score (0-100)
    4. Overall risk level (high, medium, or low)
    5. Overall compliance status (compliant, partial, or non-compliant)
    
    Format your response as a JSON object with the following structure:
    {
      "requirements": [
        {
          "id": "req1",
          "title": "Requirement Title",
          "description": "Brief description of the requirement",
          "isMet": true or false
        },
        ...more requirements...
      ],
      "complianceScore": 75,
      "riskLevel": "medium",
      "status": "partial"
    }
    
    Respond ONLY with the JSON object, no other text.
    """
    
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
        "temperature": 0.2,
        "max_tokens": 2000
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
    # Count the number of met requirements
    requirements_list = compliance_data.get("requirements", [])
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
