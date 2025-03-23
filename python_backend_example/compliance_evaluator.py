
import os
import json
import time
import requests
from typing import Dict, List, Optional, Union, Any
from datetime import datetime
import re
import io
import base64
import tempfile
import PyPDF2
from pdf2image import convert_from_bytes
import pytesseract

# Update imports for Mistral AI client
# The updated import paths to be compatible with current mistralai package
try:
    from mistralai.client import MistralClient
    from mistralai.models.chat_completion import ChatMessage
except ImportError:
    # Fallback for newer versions of the mistralai package
    try:
        from mistralai.client import MistralClient
        # In newer versions, ChatMessage might be in a different location or structure
        try:
            from mistralai.models import ChatMessage
        except ImportError:
            # Create a simple ChatMessage class if not available
            class ChatMessage:
                def __init__(self, role, content):
                    self.role = role
                    self.content = content

    except ImportError:
        # If mistralai package can't be imported at all
        MistralClient = None
        
        # Create placeholder ChatMessage class
        class ChatMessage:
            def __init__(self, role, content):
                self.role = role
                self.content = content

class PerplexityComplianceEvaluator:
    """
    A class that evaluates company compliance with financial regulations
    using the Perplexity API and optionally Mistral AI for document processing.
    """
    
    def __init__(self, perplexity_api_key: str, mistral_api_key: Optional[str] = None):
        """
        Initialize the Financial Compliance Evaluator
        
        Args:
            perplexity_api_key (str): Perplexity API key for regulatory information retrieval
            mistral_api_key (str, optional): Mistral API key for OCR and document analysis
        """
        self.perplexity_api_key = perplexity_api_key
        self.mistral_api_key = mistral_api_key
        self.mistral_client = None
        
        if mistral_api_key:
            try:
                if MistralClient is not None:
                    self.mistral_client = MistralClient(api_key=mistral_api_key)
                    print("Mistral AI client initialized successfully")
            except Exception as e:
                print(f"Failed to initialize Mistral AI client: {e}")
                self.mistral_client = None
    
    def extract_text_from_pdf(self, pdf_content: bytes) -> str:
        """
        Extract text from PDF content using PyPDF2 with fallback to OCR
        
        Args:
            pdf_content (bytes): PDF file content
            
        Returns:
            str: Extracted text
        """
        try:
            # First try PyPDF2 for text extraction
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_content))
            text = ""
            for page_num in range(len(pdf_reader.pages)):
                page_text = pdf_reader.pages[page_num].extract_text() or ""
                text += page_text + "\n"
            
            # If the extracted text is too short, try OCR
            if len(text.strip()) < 100:
                print("Text extraction with PyPDF2 yielded limited results. Trying OCR...")
                return self.ocr_pdf(pdf_content)
            
            return text
        except Exception as e:
            print(f"Error extracting text from PDF: {e}")
            # Fall back to OCR if PyPDF2 fails
            return self.ocr_pdf(pdf_content)
    
    def ocr_pdf(self, pdf_content: bytes) -> str:
        """
        Perform OCR on PDF content using pytesseract
        
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
                
                # Process each page
                for i, image in enumerate(images):
                    # Save the image temporarily
                    image_path = os.path.join(temp_dir, f'page_{i}.png')
                    image.save(image_path, 'PNG')
                    
                    # Perform OCR
                    page_text = pytesseract.image_to_string(image_path) or ""
                    text += page_text + "\n"
            
            # If Mistral AI client is available, use it to enhance the OCR results
            if self.mistral_client and text.strip():
                enhanced_text = self.enhance_ocr_with_mistral(text)
                if enhanced_text:
                    return enhanced_text
            
            return text
        except Exception as e:
            print(f"Error performing OCR on PDF: {e}")
            return ""
    
    def enhance_ocr_with_mistral(self, ocr_text: str) -> Optional[str]:
        """
        Enhance OCR results using Mistral AI
        
        Args:
            ocr_text (str): Raw OCR text
            
        Returns:
            str: Enhanced OCR text or None if enhancement fails
        """
        if not self.mistral_client:
            return None
        
        try:
            # Prepare the prompt for Mistral
            prompt = f"""I need help cleaning and structuring OCR text extracted from a financial or compliance document. 
            The text may have errors, missing spaces, or formatting issues. Please fix any obvious OCR errors, 
            add proper spacing and paragraph breaks, and format the document in a readable way. 
            Focus especially on numbers, dates, and financial terms which might be critical.

            Here is the raw OCR text:
            
            {ocr_text[:4000]}  # Limit text to avoid token limits
            """
            
            # Try both newer and older API formats
            try:
                # Try the newer API format first
                messages = [{"role": "user", "content": prompt}]
                
                chat_response = self.mistral_client.chat(
                    model="mistral-large-latest",
                    messages=messages,
                    temperature=0.1,
                    max_tokens=4000
                )
                
                # Extract content based on response structure
                if hasattr(chat_response, 'choices') and len(chat_response.choices) > 0:
                    if hasattr(chat_response.choices[0], 'message'):
                        return chat_response.choices[0].message.content
                    elif isinstance(chat_response.choices[0], dict) and 'message' in chat_response.choices[0]:
                        return chat_response.choices[0]['message']['content']
                
                # Fallback return
                return str(chat_response)
                
            except (AttributeError, TypeError) as e:
                # Try the older ChatMessage API format
                print(f"Falling back to older Mistral API format: {e}")
                try:
                    messages = [ChatMessage(role="user", content=prompt)]
                    
                    chat_response = self.mistral_client.chat(
                        model="mistral-large-latest",
                        messages=messages,
                        temperature=0.1,
                        max_tokens=4000
                    )
                    
                    return chat_response.choices[0].message.content
                except Exception as inner_e:
                    print(f"Error with fallback Mistral API format: {inner_e}")
                    return None
            
        except Exception as e:
            print(f"Error enhancing OCR with Mistral: {e}")
            return None
    
    def analyze_documents(self, documents: List[Dict[str, Any]]) -> str:
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
                    try:
                        content = base64.b64decode(content)
                    except Exception as base64_error:
                        print(f"Error decoding base64 content: {base64_error}")
                        # If it's not proper base64, treat it as plain text
                        all_text += f"\n\n--- Document: {file_name} ---\n\n{content}"
                        continue
                
                print(f"Processing document: {file_name}")
                
                # Handle PDF files
                if file_name.lower().endswith('.pdf'):
                    text = self.extract_text_from_pdf(content)
                    all_text += f"\n\n--- Document: {file_name} ---\n\n{text}"
                
                # Handle text files
                elif file_name.lower().endswith(('.txt', '.md', '.csv')):
                    try:
                        text = content.decode('utf-8', errors='ignore')
                        all_text += f"\n\n--- Document: {file_name} ---\n\n{text}"
                    except Exception as decode_error:
                        print(f"Error decoding text from {file_name}: {decode_error}")
                
                # Add more file type handlers as needed
                else:
                    print(f"Unsupported file type for {file_name}, skipping")
                
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
    
    def summarize_with_mistral(self, text: str) -> Optional[str]:
        """
        Summarize text using Mistral AI
        
        Args:
            text (str): Text to summarize
            
        Returns:
            str: Summarized text or None if summarization fails
        """
        if not self.mistral_client:
            return None
        
        try:
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
                
                # Try both newer and older API formats
                try:
                    # Try the newer API format first
                    messages = [{"role": "user", "content": prompt}]
                    
                    chat_response = self.mistral_client.chat(
                        model="mistral-large-latest",
                        messages=messages,
                        temperature=0.1,
                        max_tokens=2000
                    )
                    
                    # Extract content based on response structure
                    if hasattr(chat_response, 'choices') and len(chat_response.choices) > 0:
                        if hasattr(chat_response.choices[0], 'message'):
                            summaries.append(chat_response.choices[0].message.content)
                        elif isinstance(chat_response.choices[0], dict) and 'message' in chat_response.choices[0]:
                            summaries.append(chat_response.choices[0]['message']['content'])
                    
                except Exception as e:
                    print(f"Error with newer Mistral API format: {e}")
                    # Try the older ChatMessage API format
                    try:
                        messages = [ChatMessage(role="user", content=prompt)]
                        
                        chat_response = self.mistral_client.chat(
                            model="mistral-large-latest",
                            messages=messages,
                            temperature=0.1,
                            max_tokens=2000
                        )
                        
                        summaries.append(chat_response.choices[0].message.content)
                    except Exception as inner_e:
                        print(f"Error with fallback Mistral API format: {inner_e}")
                        summaries.append(f"Error summarizing chunk {i+1}: {inner_e}")
            
            # If we have multiple summaries, combine them
            if len(summaries) > 1:
                combined_summary = "\n\n".join(summaries)
                
                # Create a meta-summary of all the chunks
                meta_prompt = f"""I have summarized a large document in chunks. Please provide a cohesive, 
                unified summary that combines all these summaries into a single coherent analysis. 
                Organize the information logically by topic rather than by chunk:
                
                {combined_summary}
                """
                
                # Try both newer and older API formats for meta-summary
                try:
                    messages = [{"role": "user", "content": meta_prompt}]
                    
                    chat_response = self.mistral_client.chat(
                        model="mistral-large-latest",
                        messages=messages,
                        temperature=0.1,
                        max_tokens=3000
                    )
                    
                    # Extract content based on response structure
                    if hasattr(chat_response, 'choices') and len(chat_response.choices) > 0:
                        if hasattr(chat_response.choices[0], 'message'):
                            return chat_response.choices[0].message.content
                        elif isinstance(chat_response.choices[0], dict) and 'message' in chat_response.choices[0]:
                            return chat_response.choices[0]['message']['content']
                
                except Exception as e:
                    print(f"Error with newer Mistral API meta-summary: {e}")
                    # Try the older ChatMessage API format
                    try:
                        messages = [ChatMessage(role="user", content=meta_prompt)]
                        
                        chat_response = self.mistral_client.chat(
                            model="mistral-large-latest",
                            messages=messages,
                            temperature=0.1,
                            max_tokens=3000
                        )
                        
                        return chat_response.choices[0].message.content
                    except Exception as inner_e:
                        print(f"Error with fallback Mistral API meta-summary: {inner_e}")
                        return combined_summary
                
                return combined_summary
            else:
                return summaries[0] if summaries else None
        
        except Exception as e:
            print(f"Error summarizing with Mistral: {e}")
            return None
    
    def query_perplexity_api(self, query: str) -> Dict[str, Any]:
        """
        Query the Perplexity API with the given prompt using Sonar Pro
        
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
        
        # Use Sonar Pro model for comprehensive internet search
        payload = {
            "model": "llama-3.1-sonar-large-128k-online",  # Advanced model for comprehensive analysis
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
        
        max_retries = 3
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                print("Sending request to Perplexity API...")
                
                response = requests.post(API_URL, headers=headers, json=payload, timeout=60)
                
                # Display status code
                print(f"Response status code: {response.status_code}")
                
                # Handle error cases
                if response.status_code != 200:
                    print(f"Error details: {response.text}")
                    
                    # Rate limiting - implement exponential backoff
                    if response.status_code == 429:
                        retry_count += 1
                        wait_time = 2 ** retry_count  # Exponential backoff: 2, 4, 8 seconds
                        print(f"Rate limited. Retrying in {wait_time} seconds... (Attempt {retry_count}/{max_retries})")
                        time.sleep(wait_time)
                        continue
                    
                    raise requests.exceptions.HTTPError(f"API error: {response.status_code}")
                
                result = response.json()
                return result
            
            except requests.exceptions.HTTPError as e:
                # Already handled rate limits above
                if "429" not in str(e):
                    print(f"HTTP Error: {e}")
                    raise
            
            except requests.exceptions.RequestException as e:
                print(f"Request error: {e}")
                retry_count += 1
                if retry_count < max_retries:
                    print(f"Retrying in {retry_count * 2} seconds...")
                    time.sleep(retry_count * 2)
                else:
                    print("Maximum retries reached. Giving up.")
                    raise
            
            except Exception as e:
                print(f"Unexpected error querying Perplexity API: {e}")
                raise
        
        # If we've exhausted all retries
        raise Exception("Failed to get a valid response from Perplexity API after multiple attempts")
    
    def evaluate_compliance(self, company_data: Dict[str, Any], documents: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """
        Evaluate the company's compliance with financial regulations
        
        Args:
            company_data (dict): Company profile data
            documents (list, optional): List of document objects
            
        Returns:
            dict: Evaluation results
        """
        start_time = time.time()
        print(f"Starting compliance evaluation for {company_data.get('companyName', 'Unknown Company')}")
        
        # Process any documents first to extract text
        document_text = ""
        if documents:
            print(f"Processing {len(documents)} uploaded documents")
            document_text = self.analyze_documents(documents)
            print(f"Document processing complete. Extracted {len(document_text)} characters of text")
        
        # Extract key information from company data
        company_name = company_data.get('companyName', '')
        company_description = company_data.get('description', '')
        company_location = ""
        if 'address' in company_data:
            company_location = company_data.get('address', '')
        
        # Get country from the jurisdiction data
        country = ""
        if 'currentJurisdictions' in company_data and company_data['currentJurisdictions']:
            # Convert jurisdiction codes to country names
            jurisdiction_mapping = {
                'us': 'United States',
                'uk': 'United Kingdom',
                'eu': 'European Union',
                'ca': 'Canada',
                'au': 'Australia',
                'sg': 'Singapore',
                'hk': 'Hong Kong'
            }
            jurisdictions = company_data['currentJurisdictions']
            if jurisdictions and len(jurisdictions) > 0:
                country = jurisdiction_mapping.get(jurisdictions[0].lower(), jurisdictions[0])
        
        # Extract all other company information
        industry = company_data.get('industry', '')
        company_size = company_data.get('companySize', '')
        registration_number = company_data.get('registrationNumber', '')
        website = company_data.get('website', '')
        email = company_data.get('email', '')
        phone = company_data.get('phone', '')
        founded_year = company_data.get('foundedYear', '')
        business_type = company_data.get('businessType', '')
        
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
            financial_data += f"- **Address**: {company_location}\n"
        if country:
            financial_data += f"- **Primary Jurisdiction**: {country}\n"
        if registration_number:
            financial_data += f"- **Registration Number**: {registration_number}\n"
        if website:
            financial_data += f"- **Website**: {website}\n"
        if email:
            financial_data += f"- **Email**: {email}\n"
        if phone:
            financial_data += f"- **Phone**: {phone}\n"
        if founded_year:
            financial_data += f"- **Founded Year**: {founded_year}\n"
        if business_type:
            financial_data += f"- **Business Type**: {business_type}\n"
        
        if company_description:
            financial_data += f"\n**Description**: {company_description}\n"
        
        # Add document content if available
        document_section = ""
        if document_text:
            # Limit the document content to avoid exceeding token limits
            doc_excerpt = document_text[:3000] + "..." if len(document_text) > 3000 else document_text
            document_section = f"\n\n## Document Analysis\n\nThe following information was extracted from the provided documents:\n\n{doc_excerpt}\n\n"
        
        # Target jurisdictions
        target_jurisdictions = ""
        if 'targetJurisdictions' in company_data and company_data['targetJurisdictions']:
            jurisdiction_mapping = {
                'us': 'United States',
                'uk': 'United Kingdom',
                'eu': 'European Union',
                'ca': 'Canada',
                'au': 'Australia',
                'sg': 'Singapore',
                'hk': 'Hong Kong'
            }
            target_juris = []
            for j in company_data['targetJurisdictions']:
                target_juris.append(jurisdiction_mapping.get(j.lower(), j))
            
            if target_juris:
                target_jurisdictions = f"\n## Expansion Plans\n\nThe company is planning to expand to the following jurisdictions: {', '.join(target_juris)}.\n"
        
        # Construct the query for Perplexity API to evaluate compliance
        query = f"""
# Financial Compliance Evaluation Request

## Company Profile
{financial_data}
{document_section}
{target_jurisdictions}

## Evaluation Request - COMPLIANCE SCORE CALCULATION

I need a detailed compliance score assessment for this company based on the information provided. Please:

1. Evaluate the company's compliance with financial regulations in {country or company_location or "its operating jurisdictions"}
2. Calculate a numerical compliance score from 0-100 based on how well the company meets the relevant regulatory requirements
3. Break down the score by major compliance categories (tax, reporting, employment, etc.)
4. Identify specific compliance gaps and risks
5. For each requirement, state whether it is:
   - Met (fully compliant)
   - Partially met (partial compliance)
   - Not met (non-compliant)
6. Include a detailed explanation of how you arrived at the overall score

FORMAT YOUR RESPONSE AS FOLLOWS:
1. First provide a short executive summary with the overall compliance score
2. List each major regulatory requirement with its individual score and compliance status
3. Provide a detailed breakdown of how you calculated the overall score
4. Conclude with specific recommendations

IMPORTANT: Base your evaluation only on the data provided about the company and current regulations. If information is missing to evaluate a specific requirement, note this and make a reasonable assumption based on industry standards, but reduce the confidence level for that particular score.
        """
        
        print("Evaluating financial compliance with Perplexity API as judge...")
        
        try:
            # Query the Perplexity API
            result = self.query_perplexity_api(query)
            
            # Extract the content from the API response
            content = result.get('choices', [{}])[0].get('message', {}).get('content', '')
            
            # Process the content to ensure proper Markdown formatting
            processed_content = self.process_markdown_content(content, company_name, today)
            
            # Extract key data from the content
            compliance_score = self.extract_compliance_score(processed_content)
            compliance_status = self.determine_compliance_status(compliance_score)
            risk_level = self.determine_risk_level(compliance_score)
            risk_assessments = self.extract_risk_assessments(processed_content)
            recommendations = self.extract_recommendations(processed_content)
            requirements = self.extract_requirements(processed_content)
            regulatory_references = self.extract_regulatory_references(processed_content)
            summary = self.generate_summary(processed_content)
            
            # Calculate execution time
            execution_time = time.time() - start_time
            print(f"Compliance evaluation completed in {execution_time:.2f} seconds")
            print(f"Calculated compliance score: {compliance_score}")
            print(f"Compliance status: {compliance_status}")
            print(f"Risk level: {risk_level}")
            
            # Return results
            return {
                "jurisdictionId": company_data.get('currentJurisdictions', ['unknown'])[0],
                "jurisdictionName": country or "Unknown",
                "company_name": company_name,
                "complianceScore": compliance_score,
                "status": compliance_status,
                "riskLevel": risk_level,
                "requirements": {
                    "total": len(requirements),
                    "met": sum(1 for req in requirements if req.get("status") == "met")
                },
                "requirementsList": requirements,
                "summary": summary,
                "fullReport": processed_content,
                "recommendations": recommendations,
                "timestamp": int(datetime.now().timestamp() * 1000),
                "regulatoryReferences": regulatory_references,
                "execution_time": execution_time
            }
        
        except Exception as e:
            print(f"Error in compliance evaluation: {e}")
            import traceback
            traceback.print_exc()
            
            return {
                "error": str(e),
                "jurisdictionId": company_data.get('currentJurisdictions', ['unknown'])[0],
                "jurisdictionName": country or "Unknown",
                "company_name": company_name,
                "complianceScore": 0,
                "status": "non-compliant",
                "riskLevel": "high",
                "requirements": {
                    "total": 0,
                    "met": 0
                },
                "requirementsList": [],
                "timestamp": int(datetime.now().timestamp() * 1000),
                "error_details": traceback.format_exc()
            }
    
    def extract_compliance_score(self, content: str) -> int:
        """
        Extract the compliance score from the evaluation content
        
        Args:
            content (str): Evaluation content
            
        Returns:
            int: Compliance score (0-100)
        """
        # Look for explicit score mentions
        score_patterns = [
            r'compliance score:?\s*(\d{1,3})(?:\s*\/\s*100)?',
            r'overall compliance score:?\s*(\d{1,3})(?:\s*\/\s*100)?',
            r'overall score:?\s*(\d{1,3})(?:\s*\/\s*100)?',
            r'score:?\s*(\d{1,3})(?:\s*\/\s*100)?',
            r'compliance rating:?\s*(\d{1,3})(?:\s*\/\s*100)?',
            r'compliance assessment:?\s*(\d{1,3})(?:\s*\/\s*100)?',
            r'scored\s*(\d{1,3})(?:\s*\/\s*100)?'
        ]
        
        for pattern in score_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            if matches:
                try:
                    score = int(matches[0])
                    # Validate score is between 0-100
                    if 0 <= score <= 100:
                        return score
                except (ValueError, IndexError):
                    continue
        
        # If no explicit score, approximate one based on compliance language
        if re.search(r'fully compliant|100% compliant|complete compliance', content, re.IGNORECASE):
            return 95
        elif re.search(r'mostly compliant|high compliance|well compliant', content, re.IGNORECASE):
            return 85
        elif re.search(r'partially compliant|moderate compliance', content, re.IGNORECASE):
            return 65
        elif re.search(r'minimally compliant|low compliance', content, re.IGNORECASE):
            return 35
        elif re.search(r'non-compliant|not compliant|zero compliance', content, re.IGNORECASE):
            return 15
        
        # Default middle score if unable to determine
        return 50
        
    def determine_compliance_status(self, score: int) -> str:
        """
        Determine compliance status based on score
        
        Args:
            score (int): Compliance score
            
        Returns:
            str: Compliance status
        """
        if score >= 80:
            return "compliant"
        elif score >= 50:
            return "partial"
        else:
            return "non-compliant"
            
    def determine_risk_level(self, score: int) -> str:
        """
        Determine risk level based on compliance score
        
        Args:
            score (int): Compliance score
            
        Returns:
            str: Risk level
        """
        if score >= 80:
            return "low"
        elif score >= 50:
            return "medium"
        else:
            return "high"
    
    def process_markdown_content(self, content: str, company_name: str, date: str) -> str:
        """
        Process and enhance the Markdown content from the API
        
        Args:
            content (str): Original content from API
            company_name (str): Company name for the title
            date (str): Date for the report
            
        Returns:
            str: Processed Markdown content
        """
        # Add report header if not present
        if not content.startswith("# Financial Compliance Evaluation"):
            header = f"# Financial Compliance Evaluation for {company_name}\n\n"
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
                    if ('.gov.' in domain or domain.endswith('.gov') or 
                        '.europa.eu' in domain or domain.endswith('.europa.eu') or
                        '.gc.ca' in domain or domain.endswith('.gc.ca') or
                        '.gov.uk' in domain or domain.endswith('.gov.uk') or
                        '.gov.au' in domain or domain.endswith('.gov.au') or
                        '.gov.sg' in domain or domain.endswith('.gov.sg')):
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
    
    def generate_summary(self, content: str) -> str:
        """
        Extract and enhance the executive summary from the compliance evaluation
        
        Args:
            content (str): Markdown content
            
        Returns:
            str: Summary text
        """
        # Try to extract the executive summary
        summary_match = re.search(r'## Executive Summary\s*(.*?)(?=\n## |\n# )', content, re.DOTALL)
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
    
    def extract_risk_assessments(self, content: str) -> List[Dict[str, str]]:
        """
        Extract risk assessments from the evaluation
        
        Args:
            content (str): Markdown content
            
        Returns:
            list: Risk assessments
        """
        risks = []
        
        # Look for a risk section
        risk_section_match = re.search(r'## (?:Risk Assessments?|Risk Analysis|Risks?|Compliance Risks?|Key Risks?)\s*(.*?)(?=\n## |\n# |$)', 
                                      content, re.DOTALL | re.IGNORECASE)
        
        if risk_section_match:
            risk_text = risk_section_match.group(1).strip()
            
            # Extract bullet points or numbered items
            risk_items = re.findall(r'^(?:\d+\.|\*|\-)\s*(.*?)$', risk_text, re.MULTILINE)
            
            if risk_items:
                for item in risk_items:
                    risk_level = "medium"  # Default
                    if re.search(r'high risk|severe|critical', item, re.IGNORECASE):
                        risk_level = "high"
                    elif re.search(r'low risk|minor', item, re.IGNORECASE):
                        risk_level = "low"
                    
                    risks.append({
                        "description": item,
                        "level": risk_level
                    })
            else:
                # If no bullet points, add the whole section as one risk
                risks.append({
                    "description": risk_text,
                    "level": "medium"
                })
        
        # If no specific risk section, look for risk mentions throughout the document
        if not risks:
            risk_mentions = re.findall(r'(?:high|medium|significant|low|moderate|severe|critical)\s+risk\s+(?:of|for|related to)?\s+(.*?)(?:\.|$)', 
                                     content, re.IGNORECASE)
            
            for mention in risk_mentions:
                risk_level = "medium"  # Default
                if re.search(r'high|severe|critical', mention, re.IGNORECASE):
                    risk_level = "high"
                elif re.search(r'low|minor', mention, re.IGNORECASE):
                    risk_level = "low"
                
                risks.append({
                    "description": mention.strip(),
                    "level": risk_level
                })
        
        return risks
    
    def extract_recommendations(self, content: str) -> List[Dict[str, str]]:
        """
        Extract recommendations from the evaluation
        
        Args:
            content (str): Markdown content
            
        Returns:
            list: Recommendations
        """
        recommendations = []
        
        # Look for a recommendations section
        rec_section_match = re.search(r'## (?:Recommendations?|Action Items?|Next Steps?|Suggested Actions?|Action Plan)\s*(.*?)(?=\n## |\n# |$)', 
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
                    timeframe_match = re.search(r'within (\d+\s+(?:days?|weeks?|months?|years?))|immediately|as soon as possible', item, re.IGNORECASE)
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
    
    def extract_requirements(self, content: str) -> List[Dict[str, Any]]:
        """
        Extract compliance requirements from the evaluation
        
        Args:
            content (str): Markdown content
            
        Returns:
            list: Requirements
        """
        requirements = []
        
        # Look for a requirements section
        req_section_match = re.search(r'## (?:Requirements|Regulations?|Compliance Requirements?|Regulatory Requirements?|Key Regulatory Considerations)\s*(.*?)(?=\n## |\n# |$)', 
                                     content, re.DOTALL | re.IGNORECASE)
        
        if req_section_match:
            req_text = req_section_match.group(1).strip()
            
            # Extract bullet points or numbered items
            req_items = re.findall(r'^(?:\d+\.|\*|\-)\s*(.*?)$', req_text, re.MULTILINE)
            
            if req_items:
                for i, item in enumerate(req_items, 1):
                    # Try to determine status
                    status = "not-met"  # Default
                    if re.search(r'compliant|in compliance|meets? requirements?|fully implemented', item, re.IGNORECASE):
                        status = "met"
                    elif re.search(r'partially|in progress|some compliance|partially implemented', item, re.IGNORECASE):
                        status = "partial"
                    
                    # Try to determine category
                    category = "General"
                    for cat in ["Tax", "Reporting", "Financial", "Data Protection", "Privacy", "Employment", 
                              "Banking", "Securities", "AML", "KYC", "Environmental", "Health", "Registration", 
                              "Licensing", "Capital", "Insurance"]:
                        if re.search(cat, item, re.IGNORECASE):
                            category = cat
                            break
                    
                    # Try to determine risk
                    risk = "medium"  # Default
                    if re.search(r'high risk|severe|critical', item, re.IGNORECASE):
                        risk = "high"
                    elif re.search(r'low risk|minor', item, re.IGNORECASE):
                        risk = "low"
                    
                    # Extract reg reference if available
                    reg_reference_match = re.search(r'\[([^\]]+)\]\((https?://[^\)]+)\)', item)
                    regulatory_references = []
                    if reg_reference_match:
                        ref_title = reg_reference_match.group(1)
                        ref_url = reg_reference_match.group(2)
                        regulatory_references.append({
                            "id": f"ref-{i}",
                            "title": ref_title,
                            "description": f"Regulatory reference for {ref_title}",
                            "url": ref_url,
                            "documentType": "Regulation",
                            "issuer": self.get_issuer_from_url(ref_url)
                        })
                    
                    requirements.append({
                        "id": f"req-{i}",
                        "title": item[:50] + "..." if len(item) > 50 else item,
                        "description": item,
                        "category": category,
                        "status": status,
                        "risk": risk,
                        "regulatoryReferences": regulatory_references if regulatory_references else None,
                        "isMet": status == "met"
                    })
            else:
                # If no bullet points, try to split by sentences
                sentences = re.split(r'(?<=[.!?])\s+', req_text)
                for i, sentence in enumerate(sentences, 1):
                    if len(sentence.strip()) > 10:  # Avoid very short fragments
                        status = "not-met"  # Default
                        if re.search(r'compliant|in compliance|meets? requirements?|fully implemented', sentence, re.IGNORECASE):
                            status = "met"
                        elif re.search(r'partially|in progress|some compliance|partially implemented', sentence, re.IGNORECASE):
                            status = "partial"
                            
                        requirements.append({
                            "id": f"req-{i}",
                            "title": sentence[:50] + "..." if len(sentence) > 50 else sentence,
                            "description": sentence,
                            "category": "General",
                            "status": status,
                            "risk": "medium",
                            "isMet": status == "met"
                        })
        
        # If no specific requirements found, create some based on the content
        if not requirements:
            # Look for mentions of specific regulations
            reg_mentions = re.findall(r'(?:under|according to|compliant with|compliance with|regulated by)\s+([^.]+?)(?:\.|$)', 
                                    content, re.IGNORECASE)
            
            for i, mention in enumerate(reg_mentions, 1):
                if len(mention.strip()) > 10:  # Avoid very short fragments
                    requirements.append({
                        "id": f"req-{i}",
                        "title": mention[:50] + "..." if len(mention) > 50 else mention,
                        "description": mention,
                        "category": "General",
                        "status": "not-met",
                        "risk": "medium",
                        "isMet": False
                    })
        
        return requirements
    
    def extract_regulatory_references(self, content: str) -> List[Dict[str, str]]:
        """
        Extract regulatory references from the evaluation
        
        Args:
            content (str): Markdown content
            
        Returns:
            list: Regulatory references
        """
        references = []
        
        # Look for a references section
        ref_section_match = re.search(r'## (?:References|Regulatory References|Citations|Sources)\s*(.*?)(?=\n## |\n# |$)', 
                                    content, re.DOTALL | re.IGNORECASE)
        
        if ref_section_match:
            ref_text = ref_section_match.group(1).strip()
            
            # Extract numbered references
            ref_items = re.findall(r'^(?:\d+\.)\s*(.*?)$', ref_text, re.MULTILINE)
            
            for i, item in enumerate(ref_items, 1):
                # Extract URL if available
                url_match = re.search(r'\[(.*?)\]\((https?://[^\)]+)\)', item)
                if url_match:
                    title = url_match.group(1)
                    url = url_match.group(2)
                    
                    # Try to determine document type
                    doc_type = "Regulation"
                    for dtype in ["Act", "Law", "Regulation", "Directive", "Guidelines", "Standard", "Framework", "Rulebook"]:
                        if re.search(dtype, title, re.IGNORECASE):
                            doc_type = dtype
                            break
                    
                    references.append({
                        "id": f"ref-{i}",
                        "title": title,
                        "description": item,
                        "url": url,
                        "documentType": doc_type,
                        "issuer": self.get_issuer_from_url(url),
                        "publishDate": self.extract_date_from_text(item)
                    })
        
        # If no specific references section, extract all links
        if not references:
            # Extract all links
            link_matches = re.findall(r'\[(.*?)\]\((https?://[^\)]+)\)', content)
            
            for i, (title, url) in enumerate(link_matches, 1):
                # Skip any links that don't look like regulatory references
                if not any(term in title.lower() for term in ["act", "law", "regulation", "directive", "guidelines", 
                                                           "compliance", "requirements", "rules", "standards"]):
                    continue
                
                # Try to determine document type
                doc_type = "Regulation"
                for dtype in ["Act", "Law", "Regulation", "Directive", "Guidelines", "Standard", "Framework", "Rulebook"]:
                    if re.search(dtype, title, re.IGNORECASE):
                        doc_type = dtype
                        break
                
                references.append({
                    "id": f"ref-{i}",
                    "title": title,
                    "description": f"Reference to {title}",
                    "url": url,
                    "documentType": doc_type,
                    "issuer": self.get_issuer_from_url(url)
                })
        
        return references
    
    def get_issuer_from_url(self, url: str) -> str:
        """
        Determine the issuer of a document based on its URL
        
        Args:
            url (str): Document URL
            
        Returns:
            str: Issuer name
        """
        try:
            domain = url.split('/')[2]
            
            # Check for common government domains
            issuer_map = {
                'sec.gov': 'Securities and Exchange Commission',
                'consumerfinance.gov': 'Consumer Financial Protection Bureau',
                'fdic.gov': 'Federal Deposit Insurance Corporation',
                'fca.org.uk': 'Financial Conduct Authority',
                'fca.gov.uk': 'Financial Conduct Authority',
                'bankofengland.co.uk': 'Bank of England',
                'gov.uk': 'UK Government',
                'europa.eu': 'European Union',
                'esma.europa.eu': 'European Securities and Markets Authority',
                'ec.europa.eu': 'European Commission',
                'eba.europa.eu': 'European Banking Authority',
                'mas.gov.sg': 'Monetary Authority of Singapore',
                'acra.gov.sg': 'Accounting and Corporate Regulatory Authority',
                'pdpc.gov.sg': 'Personal Data Protection Commission',
                'asic.gov.au': 'Australian Securities and Investments Commission',
                'apra.gov.au': 'Australian Prudential Regulation Authority',
                'oaic.gov.au': 'Office of the Australian Information Commissioner',
            }
            
            # Check for exact matches
            for key, value in issuer_map.items():
                if key in domain:
                    return value
            
            # For .gov domains not specifically mapped
            if '.gov' in domain:
                parts = domain.split('.')
                if len(parts) >= 3:
                    agency = parts[0].upper()
                    return f"{agency} - Government Agency"
                return "Government Agency"
            
            # For other domains, use the domain name
            return domain
        
        except Exception as e:
            print(f"Error determining issuer from URL: {e}")
            return "Unknown Issuer"
    
    def extract_date_from_text(self, text: str) -> Optional[str]:
        """
        Extract a date from text if present
        
        Args:
            text (str): Text to search for date
            
        Returns:
            str: Date string if found, None otherwise
        """
        # Look for common date formats
        date_patterns = [
            r'(\d{4}-\d{2}-\d{2})',  # YYYY-MM-DD
            r'(\d{2}/\d{2}/\d{4})',  # MM/DD/YYYY or DD/MM/YYYY
            r'(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})',  # DD Mon YYYY
            r'((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})',  # Mon DD, YYYY
            r'(\d{4})'  # Just year
        ]
        
        for pattern in date_patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1)
        
        return None
