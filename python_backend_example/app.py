
from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import json
import base64
from compliance_evaluator import PerplexityComplianceEvaluator

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy"})

@app.route('/upload-company-documents', methods=['POST'])
def upload_company_documents():
    """Upload company documents for analysis"""
    try:
        if 'files[]' not in request.files:
            return jsonify({"error": "No files provided"}), 400
        
        files = request.files.getlist('files[]')
        if not files:
            return jsonify({"error": "Empty file list"}), 400
        
        uploaded_documents = []
        
        for file in files:
            if file.filename == '':
                continue
            
            file_content = file.read()
            base64_content = base64.b64encode(file_content).decode('utf-8')
            
            uploaded_documents.append({
                "file_name": file.filename,
                "content": base64_content,
                "size": len(file_content)
            })
        
        return jsonify({"documents": uploaded_documents})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/analyze-compliance', methods=['POST'])
def analyze_compliance():
    """Analyze company compliance based on profile and jurisdiction"""
    try:
        data = request.json
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        api_key = data.get('apiKey')
        if not api_key:
            return jsonify({"error": "API key is required"}), 400
        
        company_profile = data.get('companyProfile')
        if not company_profile:
            return jsonify({"error": "Company profile is required"}), 400
        
        jurisdiction = data.get('jurisdiction')
        if not jurisdiction:
            return jsonify({"error": "Jurisdiction is required"}), 400
        
        documents = data.get('documents', [])
        
        # Print info about the request
        print(f"Analyzing compliance for {company_profile.get('companyName', 'Unknown Company')} in {jurisdiction}")
        print(f"Company profile: {json.dumps(company_profile, indent=2)}")
        print(f"Documents count: {len(documents)}")
        
        # Initialize the evaluator with the API key
        evaluator = PerplexityComplianceEvaluator(api_key)
        
        # Create a formatted result with the company profile data
        # This is where we'll use the data from the company form
        company_data = {
            "companyName": company_profile.get('companyName', ''),
            "companySize": company_profile.get('companySize', ''),
            "industry": company_profile.get('industry', ''),
            "description": company_profile.get('description', ''),
            "country": jurisdiction,  # Use the jurisdiction as the country
            "registration_number": company_profile.get('registrationNumber', ''),
            "address": company_profile.get('address', ''),
            "website": company_profile.get('website', ''),
            "phone": company_profile.get('phone', ''),
            "email": company_profile.get('email', ''),
            "founded_year": company_profile.get('foundedYear', ''),
            "business_type": company_profile.get('businessType', '')
        }
        
        # Now use this data when evaluating compliance
        analysis = evaluator.evaluate_compliance(company_data, documents)
        
        # Extract key information for the response
        compliance_score = min(100, max(0, analysis.get("risk_assessments", [])))
        if compliance_score == 0 and analysis.get("risk_assessments"):
            # Calculate a score based on the risk levels
            risks = analysis.get("risk_assessments", [])
            if risks:
                high_count = sum(1 for risk in risks if risk.get("level") == "high")
                medium_count = sum(1 for risk in risks if risk.get("level") == "medium")
                low_count = sum(1 for risk in risks if risk.get("level") == "low")
                
                total_risks = len(risks)
                if total_risks > 0:
                    # Weighted score calculation
                    compliance_score = 100 - ((high_count * 30 + medium_count * 15 + low_count * 5) / total_risks)
                    compliance_score = max(0, min(100, compliance_score))
        
        # If we still don't have a score, generate one
        if compliance_score == 0:
            # Generate a score based on the jurisdiction
            if jurisdiction.lower() in ['us', 'uk', 'eu', 'ca']:
                compliance_score = 70  # More complex regulatory environments
            else:
                compliance_score = 85  # Less complex regulatory environments
        
        # Determine status based on score
        status = "compliant"
        if compliance_score < 70:
            status = "non-compliant"
        elif compliance_score < 90:
            status = "partial"
        
        # Determine risk level
        risk_level = "low"
        if compliance_score < 60:
            risk_level = "high"
        elif compliance_score < 80:
            risk_level = "medium"
        
        # Extract requirements
        requirements_list = analysis.get("requirements", [])
        met_count = sum(1 for req in requirements_list if req.get("status") == "met")
        
        # Create the response
        response = {
            "jurisdictionId": jurisdiction,
            "jurisdictionName": get_jurisdiction_name(jurisdiction),
            "complianceScore": int(compliance_score),
            "status": status,
            "riskLevel": risk_level,
            "requirements": {
                "total": len(requirements_list),
                "met": met_count
            },
            "requirementsList": requirements_list,
            "summary": analysis.get("summary", ""),
            "recommendations": analysis.get("recommendations", [])
        }
        
        return jsonify(response)
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/fetch-saved-analyses', methods=['POST'])
def fetch_saved_analyses():
    """Fetch saved compliance analyses for a company"""
    try:
        data = request.json
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        company_name = data.get('companyName')
        if not company_name:
            return jsonify({"error": "Company name is required"}), 400
        
        # This would normally query a database, but for now we'll return some sample data
        # In a real implementation, this would fetch from Supabase
        
        # Create sample data based on the company name to give appearance of persistence
        sample_jurisdictions = ['us', 'uk', 'eu', 'sg', 'au']
        analyses = []
        
        for i, jur in enumerate(sample_jurisdictions[:3]):
            score = 65 + (i * 15)  # Generates scores 65, 80, 95
            
            status = "compliant"
            if score < 70:
                status = "non-compliant"
            elif score < 90:
                status = "partial"
            
            risk_level = "low"
            if score < 60:
                risk_level = "high"
            elif score < 80:
                risk_level = "medium"
            
            analyses.append({
                "jurisdictionId": jur,
                "jurisdictionName": get_jurisdiction_name(jur),
                "complianceScore": score,
                "status": status,
                "riskLevel": risk_level,
                "requirements": {
                    "total": 10 + i,
                    "met": 5 + (i*2)
                },
                "requirementsList": generate_sample_requirements(jur, score)
            })
        
        return jsonify({"analyses": analyses})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/export-report/<format>', methods=['POST'])
def export_report(format):
    """Export a compliance report in the specified format"""
    try:
        # Implementation would export a report in the specified format
        # This is a placeholder that returns a simple text report
        
        return "Sample Report Content", 200, {
            'Content-Type': 'text/plain',
            'Content-Disposition': f'attachment; filename="compliance_report.{format}"'
        }
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def get_jurisdiction_name(jurisdiction_id):
    """Get a jurisdiction name from its ID"""
    jurisdiction_names = {
        'us': 'United States',
        'uk': 'United Kingdom',
        'eu': 'European Union',
        'ca': 'Canada',
        'au': 'Australia',
        'sg': 'Singapore',
        'hk': 'Hong Kong'
    }
    
    return jurisdiction_names.get(jurisdiction_id.lower(), jurisdiction_id)

def generate_sample_requirements(jurisdiction, score):
    """Generate sample requirements for testing"""
    categories = ['KYC/AML', 'Data Protection', 'Reporting', 'Licensing', 'Risk Management']
    statuses = ['met', 'partial', 'not-met']
    risks = ['high', 'medium', 'low']
    
    requirements = []
    total = 10
    
    # Adjust distribution based on score
    met_percent = score / 100
    partial_percent = (100 - score) / 200
    not_met_percent = 1 - met_percent - partial_percent
    
    for i in range(total):
        status_rand = i / total
        if status_rand < met_percent:
            status = 'met'
        elif status_rand < met_percent + partial_percent:
            status = 'partial'
        else:
            status = 'not-met'
        
        risk = risks[0] if status == 'not-met' else risks[1] if status == 'partial' else risks[2]
        
        requirement = {
            "id": f"req-{jurisdiction}-{i}",
            "title": f"Requirement {i+1} for {get_jurisdiction_name(jurisdiction)}",
            "description": f"This is a sample requirement description for {get_jurisdiction_name(jurisdiction)}.",
            "status": status,
            "category": categories[i % len(categories)],
            "risk": risk,
            "isMet": status == 'met'
        }
        
        if status != 'met':
            requirement["recommendation"] = f"Recommendation for meeting requirement {i+1}"
        
        requirements.append(requirement)
    
    return requirements

if __name__ == '__main__':
    app.run(debug=True, port=5001)
