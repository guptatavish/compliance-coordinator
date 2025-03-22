
import os
import json
import time
import pandas as pd
import requests
from tqdm import tqdm
from datetime import datetime
import re

class PerplexityComplianceEvaluator:
    def __init__(self, api_key, company_data=None, compliance_docs=None):
        """
        Initialize the Financial Compliance Evaluator using Perplexity API
        
        Args:
            api_key (str): Perplexity API key
            company_data (dict, optional): Company data dictionary
            compliance_docs (str, optional): Compliance documents text
        """
        self.api_key = api_key
        self.company_data = company_data
        self.compliance_text = compliance_docs
        self.evaluation_results = None
    
    def query_perplexity_api(self, query):
        """
        Query the Perplexity API with the given prompt using Sonar Pro
        
        Args:
            query (str): Query to send to Perplexity API
            
        Returns:
            dict: API response
        """
        API_URL = "https://api.perplexity.ai/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # Use Sonar Pro model for comprehensive internet search
        payload = {
            "model": "sonar-medium-online",  # Alternative if sonar-pro-online is not available
            "messages": [
                {
                    "role": "system", 
                    "content": """You are a financial compliance expert who specializes in evaluating businesses against government regulations. 
Your task is to analyze a company's financial data and provide a detailed compliance report with the following characteristics:

1. ONLY cite official government websites, regulatory bodies, and authoritative legal sources
2. Format your analysis as a professional Markdown document with proper headings, bullet points, and sections
3. Include direct links to government websites and regulatory documents whenever possible
4. Provide company-specific insights that directly address their unique situation
5. Structure your response to be both comprehensive for professionals and understandable to non-experts
6. When recommending solutions, be specific about implementation timelines, responsibilities, and expected outcomes
7. Include a "References" section at the end with numbered citations to all government sources

Be thorough in your research and analysis. Use current regulations and requirements appropriate to the company's location and industry."""
                },
                {"role": "user", "content": query}
            ],
            "temperature": 0.1,  # Low temperature for factual responses
            "max_tokens": 4000,  # Allow for comprehensive analysis
        }
        
        try:
            print("Sending request to Perplexity API...")
            
            response = requests.post(API_URL, headers=headers, json=payload)
            
            # Display status code
            print(f"Response status code: {response.status_code}")
            
            # Handle error cases
            if response.status_code != 200:
                print(f"Error details: {response.text}")
                raise requests.exceptions.HTTPError(f"API error: {response.status_code}")
                
            response.raise_for_status()
            
            result = response.json()
            return result
        except requests.exceptions.HTTPError as e:
            print(f"HTTP Error: {e}")
            if response.status_code == 429:
                print("Rate limited. Waiting 60 seconds...")
                time.sleep(60)
                return self.query_perplexity_api(query)
            raise
        except Exception as e:
            print(f"Error querying Perplexity API: {e}")
            raise
    
    def evaluate_compliance(self, jurisdiction):
        """
        Evaluate the company's compliance with financial regulations
        
        Args:
            jurisdiction (str): The jurisdiction to evaluate compliance for
            
        Returns:
            dict: Evaluation results including compliance analysis and score
        """
        if not self.company_data:
            raise ValueError("No company data provided.")
        
        # Extract key information from company data
        company_name = self.company_data.get('companyName', '')
        company_description = self.company_data.get('description', '')
        company_size = self.company_data.get('companySize', '')
        industry = self.company_data.get('industry', '')
        
        # Get jurisdiction-specific compliance text
        compliance_content = self.generate_jurisdiction_compliance_text(jurisdiction)
        if compliance_content:
            self.compliance_text = compliance_content
        
        # Today's date for the report
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Construct the query for Perplexity API
        query = f"""
# Financial Compliance Evaluation Request

## Company Profile
- **Company Name**: {company_name}
- **Industry**: {industry}
- **Company Size**: {company_size}
- **Description**: {company_description}
- **Jurisdiction**: {jurisdiction}

## Compliance Context
{self.compliance_text if self.compliance_text else ""}

## Evaluation Request

I need a detailed assessment of this company's compliance with financial and business regulations in {jurisdiction}. Please provide:

1. A numeric score from 0-100 representing the overall compliance level based on the company profile
2. At least 10 specific regulatory requirements that apply to this company
3. For each requirement, determine if the company is likely:
   - Fully compliant (met)
   - Partially compliant (partial)
   - Not compliant (not-met)
4. For each requirement, assess the risk level (high, medium, low)
5. For non-compliant or partially compliant items, provide a specific recommendation
6. Group requirements by category (e.g., Tax, Financial Reporting, Labor, Industry-specific)

Format your response as JSON with the following structure:
```json
{
  "jurisdictionId": "{jurisdiction}",
  "jurisdictionName": "Full Jurisdiction Name",
  "complianceScore": 70,
  "status": "partially-compliant",
  "riskLevel": "medium",
  "requirements": {
    "total": 12,
    "met": 8
  },
  "requirementsList": [
    {
      "id": "req1",
      "title": "Annual Financial Statement Filing",
      "description": "Companies must file annual financial statements...",
      "category": "Financial Reporting",
      "status": "met",
      "risk": "high",
      "isMet": true,
      "recommendation": null
    },
    {
      "id": "req2",
      "title": "VAT Registration",
      "description": "Companies with revenue exceeding threshold must register...",
      "category": "Tax",
      "status": "partial",
      "risk": "medium",
      "isMet": false,
      "recommendation": "Complete VAT registration by..."
    }
  ]
}
```

Important: 
1. Ensure the response is valid JSON
2. Base your analysis on industry standards and realistic regulatory requirements
3. Don't assume compliance - if it's unclear, mark as "partial" and recommend verification
4. Create unique IDs for each requirement
5. The overall compliance score should reflect the proportion of requirements met, weighted by risk
"""
        
        print(f"Evaluating compliance for {company_name} in {jurisdiction}...")
        
        try:
            result = self.query_perplexity_api(query)
            
            # Extract the content from the API response
            content = result.get('choices', [{}])[0].get('message', {}).get('content', '')
            
            # Extract the JSON part from the content
            json_match = re.search(r'```json\s*(.*?)\s*```', content, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                # If no json code block, try to find JSON directly
                json_str = re.search(r'(\{.*\})', content, re.DOTALL)
                if json_str:
                    json_str = json_str.group(1)
                else:
                    raise ValueError("Could not extract JSON from the API response")
            
            try:
                compliance_data = json.loads(json_str)
            except json.JSONDecodeError:
                # Try to fix common JSON issues
                json_str = json_str.replace("'", '"')  # Replace single quotes with double quotes
                json_str = re.sub(r',\s*}', '}', json_str)  # Remove trailing commas
                compliance_data = json.loads(json_str)
            
            # Store and return results
            self.evaluation_results = compliance_data
            
            return compliance_data
            
        except Exception as e:
            print(f"Error in compliance evaluation: {e}")
            print("Detailed error information:")
            import traceback
            traceback.print_exc()
            
            # Return a basic error response
            return {
                "jurisdictionId": jurisdiction,
                "jurisdictionName": self.get_jurisdiction_name(jurisdiction),
                "complianceScore": 0,
                "status": "error",
                "riskLevel": "high",
                "error": str(e),
                "requirements": {
                    "total": 0,
                    "met": 0
                },
                "requirementsList": []
            }
    
    def generate_jurisdiction_compliance_text(self, jurisdiction):
        """
        Generate compliance text for the specified jurisdiction
        
        Args:
            jurisdiction (str): Jurisdiction ID
            
        Returns:
            str: Compliance text for the jurisdiction
        """
        if jurisdiction.lower() == "in" or jurisdiction.lower() == "india":
            return self.generate_india_compliance_text()
        # Add other jurisdictions as needed
        return None
    
    def generate_india_compliance_text(self):
        """
        Generate India compliance text
        
        Returns:
            str: Compliance text for India
        """
        return """
FINANCIAL COMPLIANCE REQUIREMENTS FOR BUSINESSES IN INDIA

1. COMPANY REGISTRATION AND FILINGS
   * Companies Act, 2013 requirements:
     - Annual filing of financial statements and annual returns with the Registrar of Companies (ROC)
     - Filing of MGT-7 (Annual Return) and AOC-4 (Financial Statements) within 60 days and 30 days respectively after the Annual General Meeting
     - Maintaining statutory registers and minutes of board meetings
     - Having a valid Digital Signature Certificate (DSC) for directors
     - ACTIVE compliance (INC-22A) for company status to remain "Active"

2. GOODS AND SERVICES TAX (GST)
   * CGST Act, 2017 and related state SGST Acts:
     - Registration required if turnover exceeds ₹20 lakhs (₹10 lakhs for special category states)
     - Monthly/quarterly filing of GSTR returns depending on turnover
     - GSTR-1: Details of outward supplies
     - GSTR-3B: Summary return including payment details
     - GSTR-9: Annual return to be filed by December 31 following the financial year
     - E-invoicing mandatory for businesses with turnover above ₹10 crore
     - Proper maintenance of input tax credit records
     - GST audit requirements for businesses with turnover above ₹2 crore

3. INCOME TAX
   * Income Tax Act, 1961:
     - Filing annual income tax returns by due dates:
       * For companies: October 31 (non-audit cases), November 30 (audit cases)
     - Tax Audit under Section 44AB if turnover exceeds ₹1 crore (₹10 crore if digital transactions exceed 95%)
     - Advance tax payment in four installments (15% by June 15, 45% by September 15, 75% by December 15, 100% by March 15)
     - TDS (Tax Deducted at Source) compliance:
       * Monthly TDS filing and payment
       * Quarterly TDS returns (Form 24Q, 26Q, 27Q)
       * Issuance of Form 16/16A to deductees
     - Transfer pricing documentation for international transactions

4. EMPLOYEE-RELATED COMPLIANCES
   * Employees' Provident Fund (EPF) under EPF Act, 1952:
     - Registration mandatory if employing 20+ employees
     - Monthly contribution at 12% of basic wages by both employer and employee
     - Filing of ECR (Electronic Challan cum Return) monthly
   
   * Employees' State Insurance (ESI) under ESI Act, 1948:
     - Registration mandatory if employing 10+ employees with wages up to ₹21,000
     - Monthly contribution at 3.25% by employer and 0.75% by employee
     - Filing of monthly returns

   * Professional Tax:
     - Registration and payment as per state-specific regulations
     - Monthly/quarterly/annual payment and returns

5. MSME COMPLIANCE
   * MSME Registration:
     - Udyam Registration mandatory for micro, small and medium enterprises
     - Classification based on investment in plant & machinery/equipment and turnover

6. ACCOUNTING AND AUDIT REQUIREMENTS
   * Compliance with Indian Accounting Standards (Ind AS)
   * Audited financial statements for all companies
   * Internal financial controls reporting
   * Statutory audit by a qualified Chartered Accountant
   * Cost audit for specified companies

7. BANKING AND FINANCE COMPLIANCE
   * Know Your Customer (KYC) requirements
   * FEMA compliance for foreign transactions
   * RBI regulations for foreign investments and overseas operations
   * Declaration of overseas assets and income

8. SECRETARIAL COMPLIANCE
   * Annual Secretarial Audit (Form MR-3) for listed companies and certain public companies
   * Annual Secretarial Compliance Report for listed entities
   * Filing of significant beneficial ownership details
   * Board meeting compliance (minimum four meetings per year)

9. INDUSTRY-SPECIFIC REGULATIONS
   * IT/ITES Companies:
     - Software Technology Parks of India (STPI) compliance if registered
     - Information Technology Act compliance
     - Data protection and privacy regulations
     - Specific SEZ compliance if operating in Special Economic Zones

10. RECENT REGULATORY CHANGES
    * E-invoicing has been made mandatory for businesses with turnover above ₹10 crore from October 1, 2022
    * Faceless assessment and appeals for income tax
    * New labor codes consolidating various labor laws (to be implemented)
    * Updated CSR provisions under the Companies Act, 2013

IMPORTANT GOVERNMENT RESOURCES:
* Ministry of Corporate Affairs: www.mca.gov.in
* Income Tax Department: www.incometaxindia.gov.in
* GST Portal: www.gst.gov.in
* EPFO Portal: www.epfindia.gov.in
* ESIC Portal: www.esic.nic.in
* MSME Ministry: www.msme.gov.in
* Reserve Bank of India: www.rbi.org.in
"""
    
    def get_jurisdiction_name(self, jurisdiction_id):
        """
        Get the full name of a jurisdiction from its ID
        
        Args:
            jurisdiction_id (str): Jurisdiction ID
            
        Returns:
            str: Full jurisdiction name
        """
        jurisdiction_map = {
            "us": "United States",
            "uk": "United Kingdom",
            "eu": "European Union",
            "in": "India",
            "sg": "Singapore",
            "au": "Australia",
            "ca": "Canada",
            "de": "Germany",
            "fr": "France",
            "jp": "Japan",
            "cn": "China",
            "br": "Brazil",
            "za": "South Africa",
            "ae": "United Arab Emirates"
        }
        
        return jurisdiction_map.get(jurisdiction_id.lower(), jurisdiction_id)

# Helper function to convert company profile data
def convert_company_profile_to_evaluator_format(company_profile):
    """
    Convert company profile data from the frontend format to the evaluator format
    
    Args:
        company_profile (dict): Company profile data from frontend
        
    Returns:
        dict: Formatted company data for the evaluator
    """
    return {
        "companyName": company_profile.get("companyName", ""),
        "description": company_profile.get("description", ""),
        "companySize": company_profile.get("companySize", ""),
        "industry": company_profile.get("industry", ""),
        "currentJurisdictions": company_profile.get("currentJurisdictions", []),
        "targetJurisdictions": company_profile.get("targetJurisdictions", [])
    }
