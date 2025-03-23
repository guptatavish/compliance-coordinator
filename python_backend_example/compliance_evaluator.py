
import os
import json
import time
import pandas as pd
import requests
from tqdm import tqdm
from datetime import datetime
import re
import io
import base64
import tempfile
import PyPDF2
from pdf2image import convert_from_bytes
import pytesseract
from mistralai import Mistral

class PerplexityComplianceEvaluator:
    def __init__(self, perplexity_api_key, mistral_api_key=None):
        """
        Initialize the Financial Compliance Evaluator using Perplexity API
        
        Args:
            perplexity_api_key (str): Perplexity API key
            mistral_api_key (str, optional): Mistral API key for OCR and document analysis
        """
        self.perplexity_api_key = perplexity_api_key
        self.mistral_api_key = mistral_api_key
        self.mistral_client = None
        if mistral_api_key:
            self.mistral_client = Mistral(api_key=mistral_api_key)
        
    def extract_text_from_pdf(self, pdf_content):
        """
        Extract text from PDF content
        
        Args:
            pdf_content (bytes): PDF file content
            
        Returns:
            str: Extracted text
        """
        try:
            # First try PyPDF2
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_content))
            text = ""
            for page_num in range(len(pdf_reader.pages)):
                text += pdf_reader.pages[page_num].extract_text() + "\n"
            
            # If the extracted text is too short, try OCR
            if len(text.strip()) < 100:
                print("Text extraction with PyPDF2 yielded limited results. Trying OCR...")
                return self.ocr_pdf(pdf_content)
            
            return text
        except Exception as e:
            print(f"Error extracting text from PDF: {e}")
            return self.ocr_pdf(pdf_content)
            
    def ocr_pdf(self, pdf_content):
        """
        Perform OCR on PDF content
        
        Args:
            pdf_content (bytes): PDF file content
            
        Returns:
            str: OCR'd text
        """
        try:
            text = ""
            # Create temporary files for the images
            with tempfile.TemporaryDirectory() as temp_dir:
                # Convert PDF to images
                images = convert_from_bytes(pdf_content)
                for i, image in enumerate(images):
                    # Save the image temporarily
                    image_path = os.path.join(temp_dir, f'page_{i}.png')
                    image.save(image_path, 'PNG')
                    # Perform OCR
                    text += pytesseract.image_to_string(image_path) + "\n"
            
            # If the Mistral API client is available, use it to enhance the OCR results
            if self.mistral_client and text.strip():
                enhanced_text = self.enhance_ocr_with_mistral(text)
                if enhanced_text:
                    return enhanced_text
                    
            return text
        except Exception as e:
            print(f"Error performing OCR on PDF: {e}")
            return ""
            
    def enhance_ocr_with_mistral(self, ocr_text):
        """
        Enhance OCR results using Mistral AI
        
        Args:
            ocr_text (str): Raw OCR text
            
        Returns:
            str: Enhanced OCR text
        """
        try:
            if not self.mistral_client:
                return ocr_text
                
            # Prepare the prompt for Mistral
            prompt = f"""I need help cleaning and structuring OCR text extracted from a financial or compliance document. 
            The text may have errors, missing spaces, or formatting issues. Please fix any obvious OCR errors, 
            add proper spacing and paragraph breaks, and format the document in a readable way. 
            Focus especially on numbers, dates, and financial terms which might be critical.

            Here is the raw OCR text:
            
            {ocr_text[:4000]}  # Limit text to avoid token limits
            """
            
            chat_response = self.mistral_client.chat.complete(
                model="mistral-large-latest",
                messages = [{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=4000
            )
            
            return chat_response.choices[0].message.content
        except Exception as e:
            print(f"Error enhancing OCR with Mistral: {e}")
            return ocr_text
            
    def analyze_documents(self, documents):
        """
        Analyze uploaded documents to extract compliance-relevant information
        
        Args:
            documents (list): List of document objects with content and file_name
            
        Returns:
            str: Extracted and analyzed document text
        """
        if not documents:
            return ""
            
        all_text = ""
        
        for doc in documents:
            try:
                file_name = doc.get('file_name', 'Unknown document')
                content = doc.get('content')
                
                if not content:
                    continue
                    
                # Convert base64 to bytes if needed
                if isinstance(content, str) and content.startswith('data:'):
                    # Extract the base64 part
                    content = content.split(',')[1]
                    content = base64.b64decode(content)
                elif isinstance(content, str):
                    content = base64.b64decode(content)
                
                print(f"Processing document: {file_name}")
                
                # Handle PDF files
                if file_name.lower().endswith('.pdf'):
                    text = self.extract_text_from_pdf(content)
                    all_text += f"\n\n--- Document: {file_name} ---\n\n{text}"
                # Handle text files
                elif file_name.lower().endswith(('.txt', '.md', '.csv')):
                    text = content.decode('utf-8', errors='ignore')
                    all_text += f"\n\n--- Document: {file_name} ---\n\n{text}"
                # Add more file type handlers as needed
                
            except Exception as e:
                print(f"Error processing document {file_name}: {e}")
        
        # If we have a lot of text and Mistral is available, summarize it
        if len(all_text) > 10000 and self.mistral_client:
            try:
                summary = self.summarize_with_mistral(all_text)
                if summary:
                    all_text = f"# Document Summary\n\n{summary}\n\n# Full Document Text\n\n{all_text}"
            except Exception as e:
                print(f"Error summarizing documents with Mistral: {e}")
                
        return all_text
    
    def summarize_with_mistral(self, text):
        """
        Summarize text using Mistral AI
        
        Args:
            text (str): Text to summarize
            
        Returns:
            str: Summarized text
        """
        try:
            if not self.mistral_client:
                return ""
                
            # Prepare chunks of text to handle large documents
            chunks = [text[i:i+8000] for i in range(0, len(text), 8000)]
            summaries = []
            
            for i, chunk in enumerate(chunks):
                prompt = f"""You are a financial and regulatory specialist. 
                Please extract and summarize all key financial and compliance information from this document.
                Focus on identifying:
                1. Financial metrics and data
                2. Regulatory requirements mentioned
                3. Compliance status indicators
                4. Risk factors
                5. Deadlines or important dates
                
                This is chunk {i+1} of {len(chunks)} from the full document:
                
                {chunk}
                """
                
                chat_response = self.mistral_client.chat.complete(
                    model="mistral-large-latest",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.1,
                    max_tokens=2000
                )
                
                summaries.append(chat_response.choices[0].message.content)
                
            # If we have multiple summaries, combine them
            if len(summaries) > 1:
                combined_summary = "\n\n".join(summaries)
                
                # Create a meta-summary of all the chunks
                meta_prompt = f"""I have summarized a large document in chunks. Please provide a cohesive, 
                unified summary that combines all these summaries into a single coherent analysis. 
                Organize the information logically by topic rather than by chunk:
                
                {combined_summary}
                """
                
                chat_response = self.mistral_client.chat.complete(
                    model="mistral-large-latest",
                    messages=[{"role": "user", "content": meta_prompt}],
                    temperature=0.1,
                    max_tokens=3000
                )
                
                return chat_response.choices[0].message.content
            else:
                return summaries[0] if summaries else ""
                
        except Exception as e:
            print(f"Error summarizing with Mistral: {e}")
            return ""
    
    def query_perplexity_api(self, query):
        """
        Query the Perplexity API with the given prompt
        
        Args:
            query (str): Query to send to Perplexity API
            
        Returns:
            dict: API response
        """
        API_URL = "https://api.perplexity.ai/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {self.perplexity_api_key}",
            "Content-Type": "application/json"
        }
        
        # Use llama-3.1-sonar-large-128k-online model for comprehensive internet search
        payload = {
            "model": "llama-3.1-sonar-large-128k-online",
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
8. IMPORTANT: Provide a clear numerical compliance score from 0-100 in a section called "Compliance Score"

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
    
    def evaluate_compliance(self, company_data, jurisdiction, documents=None):
        """
        Evaluate the company's compliance with financial regulations
        
        Args:
            company_data (dict): Company profile data
            jurisdiction (str): Jurisdiction to analyze
            documents (list, optional): List of document objects
            
        Returns:
            dict: Evaluation results
        """
        # Process any documents first to extract text
        document_text = ""
        if documents:
            document_text = self.analyze_documents(documents)
        
        # Extract key information from company data
        company_name = company_data.get('companyName', '')
        company_description = company_data.get('description', '')
        
        # Get location based on jurisdiction
        jurisdiction_mapping = {
            'us': 'United States',
            'uk': 'United Kingdom',
            'eu': 'European Union',
            'ca': 'Canada',
            'au': 'Australia',
            'sg': 'Singapore',
            'hk': 'Hong Kong'
        }
        company_location = jurisdiction_mapping.get(jurisdiction.lower(), jurisdiction)
        
        industry = company_data.get('industry', '')
        company_size = company_data.get('companySize', '')
        
        # Today's date for the report
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Construct comprehensive financial data section from the company data
        financial_data = "## Company Information:\n\n"
        
        # Add fields that exist in the company data
        if company_name:
            financial_data += f"- **Company Name**: {company_name}\n"
        if company_size:
            financial_data += f"- **Company Size**: {company_size}\n"
        if industry:
            financial_data += f"- **Industry**: {industry}\n"
        if company_location:
            financial_data += f"- **Primary Jurisdiction**: {company_location}\n"
            
        if company_description:
            financial_data += f"\n**Description**: {company_description}\n"
        
        # Add document content if available
        document_section = ""
        if document_text:
            document_section = f"\n\n## Document Analysis\n\nThe following information was extracted from the provided documents:\n\n{document_text[:2000]}...\n\n"
        
        # Construct the query for Perplexity API
        query = f"""
# Financial Compliance Evaluation Request

## Company Profile
{financial_data}
{document_section}

## Evaluation Request

I need a detailed markdown report on this company's compliance with financial regulations in {company_location}. The report should:

1. Identify all relevant financial regulations for this specific company based on its location, industry, and size
2. Analyze the company's current compliance status for each regulation
3. Identify specific compliance gaps and risks unique to this company's situation
4. Provide detailed, actionable recommendations with implementation steps
5. Include citations to official government websites and regulatory resources

IMPORTANT: Include a dedicated section titled "Compliance Score" with a numerical score from 0-100 that represents the overall compliance level. Also indicate whether this score represents "compliant" (80-100), "partial" (40-79), or "non-compliant" (0-39) status.

Please create a comprehensive evaluation focused on both current compliance issues and preventative measures. The report should be formatted as a professional Markdown document with proper headings, sections, and citation links.

Only cite official government websites, regulatory bodies, and authoritative legal sources. Do not make up or assume information not provided about the company. If more information is needed about a specific area, note this as a recommendation for further internal review.

Focus on providing deep insights specific to this company, not generic compliance advice. All recommendations should address the company's exact situation based on the data provided.
        """
        
        print("Evaluating financial compliance...")
        
        try:
            result = self.query_perplexity_api(query)
            
            # Extract the content from the API response
            content = result.get('choices', [{}])[0].get('message', {}).get('content', '')
            
            # Process the content to ensure proper Markdown formatting
            processed_content = self.process_markdown_content(content, company_name, today, jurisdiction)
            
            # Extract compliance score, status, risk level, and requirements
            compliance_score = self.extract_compliance_score(processed_content)
            compliance_status = self.determine_compliance_status(compliance_score)
            risk_level = self.determine_risk_level(compliance_score)
            requirements = self.extract_requirements(processed_content)
            
            # Generate a summary section
            summary = self.generate_summary(processed_content)
            
            # Return results
            return {
                "jurisdictionId": jurisdiction,
                "jurisdictionName": jurisdiction_mapping.get(jurisdiction.lower(), jurisdiction),
                "companyName": company_name,
                "evaluation_date": datetime.now().isoformat(),
                "content": processed_content,
                "summary": summary,
                "complianceScore": compliance_score,
                "status": compliance_status,
                "riskLevel": risk_level,
                "requirements": {
                    "total": len(requirements),
                    "met": sum(1 for req in requirements if req.get('status') == 'met'),
                },
                "requirementsList": requirements,
                "recommendations": self.extract_recommendations(processed_content),
                "regulatoryReferences": self.extract_regulatory_references(processed_content)
            }
            
        except Exception as e:
            print(f"Error in compliance evaluation: {e}")
            import traceback
            traceback.print_exc()
            return {
                "error": str(e),
                "jurisdictionId": jurisdiction,
                "jurisdictionName": jurisdiction_mapping.get(jurisdiction.lower(), jurisdiction),
                "complianceScore": 0,
                "status": "non-compliant",
                "riskLevel": "high",
                "requirements": {"total": 0, "met": 0},
                "requirementsList": []
            }
    
    def process_markdown_content(self, content, company_name, date, jurisdiction):
        """
        Process and enhance the Markdown content from the API
        
        Args:
            content (str): Original content from API
            company_name (str): Company name for the title
            date (str): Date for the report
            jurisdiction (str): Jurisdiction being analyzed
            
        Returns:
            str: Processed Markdown content
        """
        # Add report header if not present
        if not content.startswith("# Financial Compliance Evaluation"):
            header = f"# Financial Compliance Evaluation for {company_name} in {jurisdiction.upper()}\n\n"
            header += f"**Date**: {date}\n\n"
            content = header + content
            
        # Ensure citations are properly formatted and collected at the end
        citation_pattern = r'\[([^\]]+)\]\((https?://[^\)]+)\)'
        citations = re.findall(citation_pattern, content)
        
        # Check if we have a references section already
        if not re.search(r'# References|## References', content, re.IGNORECASE):
            # Add references section
            content += "\n\n## References\n\n"
            
            # Add numbered references
            for i, (text, url) in enumerate(citations, 1):
                if url.startswith(("http://", "https://")):
                    # Check if it's a government URL
                    domain = url.split('/')[2]
                    if ('.gov.' in domain or domain.endswith('.gov')):
                        content += f"{i}. [{text}]({url}) - Official Government Source\n"
                    else:
                        content += f"{i}. [{text}]({url})\n"
            
        # Ensure there's a clear executive summary
        if not re.search(r'## Executive Summary|## Summary', content, re.IGNORECASE):
            content = re.sub(r'(# Financial Compliance Evaluation.*?\n\n\*\*Date\*\*:.*?\n\n)', 
                            r'\1## Executive Summary\n\nThis report evaluates the financial compliance status of ' + 
                            company_name + ' against applicable regulations. The evaluation identifies key compliance ' +
                            'issues and provides specific recommendations for achieving full compliance.\n\n', 
                            content)
        
        return content
    
    def extract_compliance_score(self, content):
        """
        Extract compliance score from the content
        
        Args:
            content (str): Markdown content
            
        Returns:
            int: Compliance score (0-100)
        """
        # Look for a dedicated compliance score section
        score_section_match = re.search(r'## Compliance Score\s*(.*?)(?=\n## |\n# |$)', 
                                     content, re.DOTALL | re.IGNORECASE)
        
        if score_section_match:
            score_text = score_section_match.group(1)
            # Extract numbers from the text
            score_matches = re.findall(r'(\d+)(?:\s*\/\s*100|\s*percent|\s*%)', score_text)
            if score_matches:
                return int(score_matches[0])
        
        # If no dedicated section, look for score mentions
        score_mentions = re.findall(r'compliance\s+score\s+(?:is|of)\s+(\d+)(?:\s*\/\s*100|\s*percent|\s*%)', 
                                  content, re.IGNORECASE)
        
        if score_mentions:
            return int(score_mentions[0])
        
        # If all else fails, try to infer from "compliant", "partially compliant", "non-compliant" mentions
        if re.search(r'fully\s+compliant|complete\s+compliance', content, re.IGNORECASE):
            return 90
        elif re.search(r'largely\s+compliant|mostly\s+compliant', content, re.IGNORECASE):
            return 75
        elif re.search(r'partially\s+compliant|partial\s+compliance', content, re.IGNORECASE):
            return 50
        elif re.search(r'non.?compliant|not\s+compliant', content, re.IGNORECASE):
            return 20
        
        # Default to a middle value if we can't determine
        return 50
    
    def determine_compliance_status(self, score):
        """
        Determine compliance status based on score
        
        Args:
            score (int): Compliance score
            
        Returns:
            str: 'compliant', 'partial', or 'non-compliant'
        """
        if score >= 80:
            return 'compliant'
        elif score >= 40:
            return 'partial'
        else:
            return 'non-compliant'
    
    def determine_risk_level(self, score):
        """
        Determine risk level based on compliance score
        
        Args:
            score (int): Compliance score
            
        Returns:
            str: 'low', 'medium', or 'high'
        """
        if score >= 80:
            return 'low'
        elif score >= 40:
            return 'medium'
        else:
            return 'high'
    
    def generate_summary(self, content):
        """
        Extract and enhance the executive summary from the compliance evaluation
        
        Args:
            content (str): Markdown content
            
        Returns:
            str: Summary text
        """
        # Try to extract the executive summary
        summary_match = re.search(r'## Executive Summary\s*(.*?)(?=\n## |\n# )', content, re.DOTALL | re.IGNORECASE)
        if summary_match:
            return summary_match.group(1).strip()
        else:
            # If no executive summary section, extract the first few paragraphs
            paragraphs = content.split('\n\n')
            summary_paragraphs = []
            
            # Skip the title
            for p in paragraphs[1:5]:  # Take up to 4 paragraphs
                if not p.startswith('#'):  # Skip headers
                    summary_paragraphs.append(p)
            
            if summary_paragraphs:
                return "\n\n".join(summary_paragraphs)
            else:
                return "Please refer to the full compliance evaluation report for detailed analysis."
    
    def extract_requirements(self, content):
        """
        Extract compliance requirements from the evaluation
        
        Args:
            content (str): Markdown content
            
        Returns:
            list: Requirements
        """
        requirements = []
        
        # Look for a requirements section
        req_section_match = re.search(r'## (?:Requirements|Regulations?|Compliance Requirements?|Regulatory Requirements?)\s*(.*?)(?=\n## |\n# |$)', 
                                     content, re.DOTALL | re.IGNORECASE)
        
        if req_section_match:
            req_text = req_section_match.group(1).strip()
            
            # Extract bullet points or numbered items
            req_items = re.findall(r'^(?:\d+\.|\*|\-)\s*(.*?)$', req_text, re.MULTILINE)
            
            if req_items:
                for item in req_items:
                    # Try to determine status
                    status = "not-met"  # Default
                    if re.search(r'compliant|in compliance|meets? requirements?', item, re.IGNORECASE):
                        status = "met"
                    elif re.search(r'partially|in progress|some compliance', item, re.IGNORECASE):
                        status = "partial"
                        
                    # Try to determine category
                    category = "General"
                    for cat in ["Tax", "Reporting", "Financial", "Data Protection", "Employment", "Banking", "Securities", "Environmental", "Health"]:
                        if re.search(cat, item, re.IGNORECASE):
                            category = cat
                            break
                    
                    # Try to determine risk
                    risk = "medium"  # Default
                    if re.search(r'high risk|severe|critical', item, re.IGNORECASE):
                        risk = "high"
                    elif re.search(r'low risk|minor', item, re.IGNORECASE):
                        risk = "low"
                    
                    requirements.append({
                        "title": item[:50] + "..." if len(item) > 50 else item,
                        "description": item,
                        "category": category,
                        "status": status,
                        "risk": risk,
                        "id": f"req-{len(requirements) + 1}"
                    })
            else:
                # If no bullet points, try to split by sentences
                sentences = re.split(r'(?<=[.!?])\s+', req_text)
                for i, sentence in enumerate(sentences):
                    if len(sentence.strip()) > 10:  # Avoid very short fragments
                        requirements.append({
                            "title": sentence[:50] + "..." if len(sentence) > 50 else sentence,
                            "description": sentence,
                            "category": "General",
                            "status": "not-met",
                            "risk": "medium",
                            "id": f"req-{len(requirements) + 1}"
                        })
        
        # If no requirements found yet, try looking in other sections
        if not requirements:
            # Try looking in a "Findings" or "Analysis" section
            findings_section_match = re.search(r'## (?:Findings|Analysis|Assessment|Evaluation)\s*(.*?)(?=\n## |\n# |$)', 
                                             content, re.DOTALL | re.IGNORECASE)
            
            if findings_section_match:
                findings_text = findings_section_match.group(1).strip()
                
                # Extract bullet points or numbered items
                findings_items = re.findall(r'^(?:\d+\.|\*|\-)\s*(.*?)$', findings_text, re.MULTILINE)
                
                if findings_items:
                    for item in findings_items:
                        # Filter out items that aren't likely to be requirements
                        if len(item.strip()) < 10 or not re.search(r'require|regulat|comply|law|rule', item, re.IGNORECASE):
                            continue
                            
                        status = "not-met"
                        if re.search(r'compliant|in compliance|meets? requirements?', item, re.IGNORECASE):
                            status = "met"
                        elif re.search(r'partially|in progress|some compliance', item, re.IGNORECASE):
                            status = "partial"
                            
                        requirements.append({
                            "title": item[:50] + "..." if len(item) > 50 else item,
                            "description": item,
                            "category": "General",
                            "status": status,
                            "risk": "medium",
                            "id": f"req-{len(requirements) + 1}"
                        })
        
        # If still no requirements found, create generic ones based on compliance score
        if not requirements:
            score = self.extract_compliance_score(content)
            
            # Create at least one requirement
            if score >= 80:
                requirements.append({
                    "title": "General regulatory compliance",
                    "description": "The company appears to be largely compliant with applicable regulations based on available information.",
                    "category": "General",
                    "status": "met",
                    "risk": "low",
                    "id": "req-1"
                })
            elif score >= 40:
                requirements.append({
                    "title": "Partial regulatory compliance",
                    "description": "The company has partial compliance with applicable regulations. Further documentation and actions are recommended.",
                    "category": "General",
                    "status": "partial",
                    "risk": "medium",
                    "id": "req-1"
                })
            else:
                requirements.append({
                    "title": "Insufficient regulatory compliance",
                    "description": "The company shows significant gaps in compliance with applicable regulations. Immediate attention is required.",
                    "category": "General",
                    "status": "not-met",
                    "risk": "high",
                    "id": "req-1"
                })
        
        return requirements
    
    def extract_recommendations(self, content):
        """
        Extract recommendations from the evaluation
        
        Args:
            content (str): Markdown content
            
        Returns:
            list: Recommendations
        """
        recommendations = []
        
        # Look for a recommendations section
        rec_section_match = re.search(r'## (?:Recommendations?|Action Items?|Next Steps?|Suggested Actions?)\s*(.*?)(?=\n## |\n# |$)', 
                                    content, re.DOTALL | re.IGNORECASE)
        
        if rec_section_match:
            rec_text = rec_section_match.group(1).strip()
            
            # Extract bullet points or numbered items
            rec_items = re.findall(r'^(?:\d+\.|\*|\-)\s*(.*?)$', rec_text, re.MULTILINE)
            
            if rec_items:
                for item in rec_items:
                    priority = "medium"  # Default
                    if re.search(r'immediately|urgent|critical|high priority', item, re.IGNORECASE):
                        priority = "high"
                    elif re.search(r'when possible|consider|may want to|low priority', item, re.IGNORECASE):
                        priority = "low"
                        
                    # Try to extract timeframe
                    timeframe_match = re.search(r'within (\d+\s+(?:days?|weeks?|months?|years?))', item, re.IGNORECASE)
                    timeframe = timeframe_match.group(0) if timeframe_match else "As soon as possible"
                    
                    recommendations.append({
                        "description": item,
                        "priority": priority,
                        "timeframe": timeframe
                    })
            else:
                # If no bullet points, add the whole section as one recommendation
                recommendations.append({
                    "description": rec_text,
                    "priority": "medium",
                    "timeframe": "As soon as possible"
                })
        
        # If no specific recommendations section, look for recommendation mentions
        if not recommendations:
            rec_mentions = re.findall(r'(?:recommend|should|must|need to|advised to)\s+(.*?)(?:\.|$)', 
                                   content, re.IGNORECASE)
            
            for mention in rec_mentions:
                priority = "medium"  # Default
                if re.search(r'immediately|urgent|critical', mention, re.IGNORECASE):
                    priority = "high"
                elif re.search(r'when possible|consider|may want to', mention, re.IGNORECASE):
                    priority = "low"
                    
                recommendations.append({
                    "description": mention.strip(),
                    "priority": priority,
                    "timeframe": "As soon as possible"
                })
        
        return recommendations
    
    def extract_regulatory_references(self, content):
        """
        Extract regulatory references from the evaluation
        
        Args:
            content (str): Markdown content
            
        Returns:
            list: Regulatory references
        """
        references = []
        
        # Look for references section
        ref_section_match = re.search(r'## (?:References|Sources|Citations|Regulatory Sources)\s*(.*?)(?=\n## |\n# |$)', 
                                    content, re.DOTALL | re.IGNORECASE)
        
        if ref_section_match:
            ref_text = ref_section_match.group(1).strip()
            
            # Extract numbered references
            ref_items = re.findall(r'^(?:\d+\.|\*|\-)\s*(.*?)$', ref_text, re.MULTILINE)
            
            if ref_items:
                for i, item in enumerate(ref_items):
                    # Extract URL if present
                    url_match = re.search(r'\[(.*?)\]\((https?://[^\)]+)\)', item)
                    url = url_match.group(2) if url_match else ""
                    
                    # Clean up the text
                    text = url_match.group(1) if url_match else item
                    
                    references.append({
                        "id": f"ref-{i+1}",
                        "title": text,
                        "url": url,
                        "type": "government" if url and ('.gov' in url) else "other"
                    })
        
        # If no references found in dedicated section, extract from citations in text
        if not references:
            citation_pattern = r'\[([^\]]+)\]\((https?://[^\)]+)\)'
            citations = re.findall(citation_pattern, content)
            
            for i, (text, url) in enumerate(citations):
                references.append({
                    "id": f"ref-{i+1}",
                    "title": text,
                    "url": url,
                    "type": "government" if '.gov' in url else "other"
                })
        
        return references
