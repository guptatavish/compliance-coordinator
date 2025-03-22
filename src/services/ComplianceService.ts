import { getPerplexityApiKey, PYTHON_API_URL } from "../utils/apiKeys";
import { supabase } from "../integrations/supabase/client";

export type ComplianceStatus = 'compliant' | 'partial' | 'non-compliant';
export type ComplianceLevel = 'high' | 'medium' | 'low';
export type RequirementStatus = 'met' | 'partial' | 'not-met';
export type RiskLevel = 'high' | 'medium' | 'low';

export interface Requirement {
  id: string;
  title: string;
  description: string;
  isMet: boolean;
  status: RequirementStatus;
  category: string;
  risk: RiskLevel;
  recommendation?: string;
  detailedExplanation?: string;
  solution?: string;
  regulatoryReferences?: RegulatoryReference[];
}

export interface RegulatoryReference {
  id: string;
  title: string;
  description: string;
  url: string;
  documentType: string;
  issuer: string;
  publishDate?: string;
}

export interface ComplianceResult {
  jurisdictionId: string;
  jurisdictionName: string;
  flag?: string;
  complianceScore: number;
  status: ComplianceStatus;
  riskLevel: ComplianceLevel;
  requirements: {
    total: number;
    met: number;
  };
  requirementsList: Requirement[];
  recentChanges?: number;
  summary?: string;
  fullReport?: string;
  recommendations?: Recommendation[];
  error?: string; // Optional error property
  timestamp?: number; // When the analysis was performed
  regulatoryReferences?: RegulatoryReference[];
}

export interface CompanyProfile {
  companyName: string;
  companySize: string;
  industry: string;
  description: string;
  currentJurisdictions: string[];
  targetJurisdictions: string[];
  files?: string[]; // Names of uploaded files
  savedDocuments?: string[]; // Previously saved documents
  registrationNumber?: string;
  address?: string;
  website?: string;
  phone?: string;
  email?: string;
  foundedYear?: string;
  businessType?: string;
}

export interface Recommendation {
  description: string;
  priority: 'high' | 'medium' | 'low';
  timeframe: string;
}

export interface UploadedDocument {
  file_name: string;
  content: string; // base64 encoded content
  size: number;
}

export type ReportFormat = 'pdf' | 'excel' | 'csv';
export type RegulatoryDocType = 'full' | 'summary' | 'guidance';

/**
 * Checks if the Python backend is running
 */
export const checkPythonBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${PYTHON_API_URL}/health`, {
      method: 'GET',
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error checking Python backend health:', error);
    return false;
  }
};

/**
 * Upload company documents for analysis
 */
export const uploadCompanyDocuments = async (
  files: File[]
): Promise<UploadedDocument[]> => {
  try {
    const isBackendHealthy = await checkPythonBackendHealth();
    if (!isBackendHealthy) {
      throw new Error('Python backend is not running or not accessible');
    }
    
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files[]', file);
    });
    
    console.log(`Uploading ${files.length} documents to Python backend`);
    
    const response = await fetch(`${PYTHON_API_URL}/upload-company-documents`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Document upload failed: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Document upload response:', result);
    
    return result.documents || [];
  } catch (error) {
    console.error('Error uploading documents:', error);
    throw error;
  }
};

/**
 * Fetch saved compliance analyses from local storage
 */
export const fetchLocalComplianceAnalyses = (): ComplianceResult[] => {
  try {
    const historicalAnalysesStr = localStorage.getItem('historicalAnalyses');
    if (!historicalAnalysesStr) {
      return [];
    }
    
    const historicalAnalyses = JSON.parse(historicalAnalysesStr);
    if (Array.isArray(historicalAnalyses) && historicalAnalyses.length > 0) {
      return historicalAnalyses[0];
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching saved compliance analyses from localStorage:', error);
    return [];
  }
};

/**
 * Fetch saved compliance analyses from Python backend
 */
export const fetchSavedComplianceAnalyses = async (): Promise<ComplianceResult[]> => {
  try {
    const companyProfileStr = localStorage.getItem('companyProfile');
    if (!companyProfileStr) {
      return [];
    }
    
    const companyProfile = JSON.parse(companyProfileStr) as CompanyProfile;
    
    console.log('Fetching saved compliance analyses from Python backend');
    
    const response = await fetch(`${PYTHON_API_URL}/fetch-saved-analyses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyName: companyProfile.companyName
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch saved analyses: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Fetched saved compliance analyses:', result);
    
    return result.analyses || [];
  } catch (error) {
    console.error('Error fetching saved compliance analyses:', error);
    return [];
  }
};

/**
 * Analyze compliance with regulations for a specific jurisdiction
 * @param jurisdictionId - The ID of the jurisdiction to analyze
 * @param useAiJudge - Whether to use the AI Judge for advanced analysis
 * @returns Promise with compliance results
 */
export const analyzeComplianceWithPython = async (
  jurisdictionId: string,
  useAiJudge: boolean = false
): Promise<ComplianceResult> => {
  try {
    console.log(`Starting compliance analysis for jurisdiction: ${jurisdictionId}`);
    
    const companyProfile = JSON.parse(localStorage.getItem('companyProfile') || '{}');
    if (!companyProfile) {
      throw new Error('No company profile found in local storage');
    }
    
    // Get API keys
    const perplexityApiKey = getPerplexityApiKey();
    
    // Call the Supabase function
    const { data, error } = await supabase.functions.invoke(
      'analyze-regulations', 
      {
        body: {
          companyProfile,
          apiKey: perplexityApiKey,
          mistralApiKey: null,  // We're not using Mistral AI for this request
          useAiJudge: useAiJudge  // Pass the flag to use AI judge
        }
      }
    );
    
    if (error) {
      console.error('Error calling analyze-regulations function:', error);
      throw new Error(error.message || 'Failed to analyze compliance');
    }
    
    if (!data) {
      throw new Error('No data returned from compliance analysis');
    }
    
    return data;
  } catch (error) {
    console.error('Error in analyzeComplianceWithPython:', error);
    throw error;
  }
};

/**
 * Save a compliance analysis to local storage history
 */
const saveComplianceAnalysisToHistory = (analysis: ComplianceResult): void => {
  try {
    const historicalAnalysesStr = localStorage.getItem('historicalAnalyses');
    let historicalAnalyses: ComplianceResult[][] = [];
    
    if (historicalAnalysesStr) {
      historicalAnalyses = JSON.parse(historicalAnalysesStr);
    }
    
    const newEntry = [analysis];
    
    historicalAnalyses.unshift(newEntry);
    
    if (historicalAnalyses.length > 10) {
      historicalAnalyses = historicalAnalyses.slice(0, 10);
    }
    
    localStorage.setItem('historicalAnalyses', JSON.stringify(historicalAnalyses));
  } catch (error) {
    console.error('Error saving compliance analysis to history:', error);
  }
};

/**
 * Export a compliance report in the specified format
 */
export const exportComplianceReport = async (
  data: ComplianceResult,
  format: ReportFormat
): Promise<Blob> => {
  try {
    const isBackendHealthy = await checkPythonBackendHealth();
    if (!isBackendHealthy) {
      throw new Error('Python backend is not running or not accessible');
    }
    
    console.log(`Sending request to Python backend at ${PYTHON_API_URL}/export-report/${format}`);
    
    const response = await fetch(`${PYTHON_API_URL}/export-report/${format}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Export failed: ${response.status} - ${errorText}`);
    }
    
    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('Error exporting report:', error);
    throw error;
  }
};

/**
 * Export regulatory reference document
 */
export const exportRegulatoryDocument = async (
  jurisdiction: string,
  docType: RegulatoryDocType = 'full'
): Promise<Blob> => {
  try {
    const isBackendHealthy = await checkPythonBackendHealth();
    if (!isBackendHealthy) {
      throw new Error('Python backend is not running or not accessible');
    }
    
    const companyProfileStr = localStorage.getItem('companyProfile');
    if (!companyProfileStr) {
      throw new Error('Company profile not found');
    }
    
    const companyProfile = JSON.parse(companyProfileStr) as CompanyProfile;
    const perplexityApiKey = getPerplexityApiKey();
    
    if (!perplexityApiKey) {
      throw new Error('Perplexity API key not found');
    }
    
    console.log(`Sending request to Python backend at ${PYTHON_API_URL}/export-regulatory-doc`);
    
    const response = await fetch(`${PYTHON_API_URL}/export-regulatory-doc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: perplexityApiKey,
        jurisdiction,
        docType,
        companyProfile
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Export failed: ${response.status} - ${errorText}`);
    }
    
    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('Error exporting regulatory document:', error);
    throw error;
  }
};

/**
 * Get a jurisdiction name from its ID (placeholder implementation)
 */
function getJurisdictionName(jurisdictionId: string): string {
  const jurisdictions: Record<string, string> = {
    'us': 'United States',
    'eu': 'European Union',
    'uk': 'United Kingdom',
    'sg': 'Singapore',
    'au': 'Australia',
    // Add more as needed
  };
  
  return jurisdictions[jurisdictionId] || jurisdictionId;
}

/**
 * Get detailed information about a specific requirement
 */
export const getRequirementDetails = async (
  requirementId: string,
  jurisdiction: string
): Promise<Requirement> => {
  try {
    const isBackendHealthy = await checkPythonBackendHealth();
    if (!isBackendHealthy) {
      throw new Error('Python backend is not running or not accessible');
    }
    
    console.log(`Fetching requirement details for ${requirementId} in ${jurisdiction}`);
    
    const response = await fetch(`${PYTHON_API_URL}/requirement-details`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requirementId,
        jurisdiction
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch requirement details: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Fetched requirement details:', result);
    
    return result.requirement;
  } catch (error) {
    console.error('Error fetching requirement details:', error);
    throw error;
  }
};

/**
 * Get regulatory documents for a specific jurisdiction
 */
export const getRegulatoryDocuments = async (
  jurisdiction: string
): Promise<RegulatoryReference[]> => {
  try {
    const isBackendHealthy = await checkPythonBackendHealth();
    if (!isBackendHealthy) {
      throw new Error('Python backend is not running or not accessible');
    }
    
    console.log(`Fetching regulatory documents for ${jurisdiction}`);
    
    const response = await fetch(`${PYTHON_API_URL}/regulatory-documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jurisdiction
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch regulatory documents: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Fetched regulatory documents:', result);
    
    return result.documents || [];
  } catch (error) {
    console.error('Error fetching regulatory documents:', error);
    return getFallbackRegulatoryDocuments(jurisdiction);
  }
};

/**
 * Get fallback regulatory documents when the API call fails
 */
const getFallbackRegulatoryDocuments = (jurisdiction: string): RegulatoryReference[] => {
  const jurisdictionMap: Record<string, RegulatoryReference[]> = {
    'us': [
      {
        id: 'us-finreg-1',
        title: 'US Financial Regulation Document',
        description: 'Consumer Financial Protection Bureau (CFPB) guidance for financial institutions',
        url: 'https://www.consumerfinance.gov/rules-policy/regulations/',
        documentType: 'Regulation',
        issuer: 'Consumer Financial Protection Bureau',
        publishDate: '2023-01-15'
      },
      {
        id: 'us-finreg-2',
        title: 'SEC Disclosure Requirements',
        description: 'Securities and Exchange Commission requirements for public companies',
        url: 'https://www.sec.gov/regulation',
        documentType: 'Regulation',
        issuer: 'Securities and Exchange Commission',
        publishDate: '2022-11-10'
      },
      {
        id: 'us-finreg-3',
        title: 'FDIC Banking Regulations',
        description: 'Federal Deposit Insurance Corporation regulations for insured banks',
        url: 'https://www.fdic.gov/resources/regulations/',
        documentType: 'Regulation',
        issuer: 'Federal Deposit Insurance Corporation',
        publishDate: '2023-03-22'
      }
    ],
    'eu': [
      {
        id: 'eu-gdpr-1',
        title: 'General Data Protection Regulation (GDPR)',
        description: 'EU regulation on data protection and privacy',
        url: 'https://gdpr.eu/tag/gdpr/',
        documentType: 'Regulation',
        issuer: 'European Union',
        publishDate: '2018-05-25'
      },
      {
        id: 'eu-mifid-2',
        title: 'Markets in Financial Instruments Directive II (MiFID II)',
        description: 'EU legislation for investment services in financial markets',
        url: 'https://www.esma.europa.eu/policy-rules/mifid-ii-and-mifir',
        documentType: 'Directive',
        issuer: 'European Securities and Markets Authority',
        publishDate: '2018-01-03'
      },
      {
        id: 'eu-aml-3',
        title: 'Anti-Money Laundering Directive (AMLD)',
        description: 'EU legislation to prevent money laundering and terrorist financing',
        url: 'https://ec.europa.eu/info/business-economy-euro/banking-and-finance/financial-supervision-and-risk-management/anti-money-laundering-and-counter-terrorist-financing_en',
        documentType: 'Directive',
        issuer: 'European Commission',
        publishDate: '2020-01-10'
      }
    ],
    'uk': [
      {
        id: 'uk-fca-1',
        title: 'FCA Handbook',
        description: 'Financial Conduct Authority rulebook for regulated firms',
        url: 'https://www.handbook.fca.org.uk/',
        documentType: 'Handbook',
        issuer: 'Financial Conduct Authority',
        publishDate: '2023-02-15'
      },
      {
        id: 'uk-pra-2',
        title: 'Prudential Regulation Authority Rulebook',
        description: 'PRA rules for banks, building societies, credit unions, insurers and major investment firms',
        url: 'https://www.bankofengland.co.uk/prudential-regulation/rulebook',
        documentType: 'Rulebook',
        issuer: 'Prudential Regulation Authority',
        publishDate: '2022-12-05'
      },
      {
        id: 'uk-dpa-3',
        title: 'UK Data Protection Act 2018',
        description: 'UK\'s implementation of GDPR principles',
        url: 'https://ico.org.uk/for-organisations/guide-to-data-protection/',
        documentType: 'Legislation',
        issuer: 'Information Commissioner\'s Office',
        publishDate: '2018-05-23'
      }
    ],
    'sg': [
      {
        id: 'sg-mas-1',
        title: 'Monetary Authority of Singapore Regulations',
        description: 'Financial regulatory framework for Singapore',
        url: 'https://www.mas.gov.sg/regulation',
        documentType: 'Regulation',
        issuer: 'Monetary Authority of Singapore',
        publishDate: '2023-01-20'
      },
      {
        id: 'sg-pdpa-2',
        title: 'Personal Data Protection Act',
        description: 'Singapore\'s data protection framework',
        url: 'https://www.pdpc.gov.sg/Overview-of-PDPA/The-Legislation/Personal-Data-Protection-Act',
        documentType: 'Legislation',
        issuer: 'Personal Data Protection Commission',
        publishDate: '2021-02-01'
      },
      {
        id: 'sg-acra-3',
        title: 'Accounting and Corporate Regulatory Authority Guidelines',
        description: 'Business registration and corporate compliance in Singapore',
        url: 'https://www.acra.gov.sg/legislation-and-resources',
        documentType: 'Guidelines',
        issuer: 'Accounting and Corporate Regulatory Authority',
        publishDate: '2022-08-15'
      }
    ],
    'au': [
      {
        id: 'au-asic-1',
        title: 'Australian Securities and Investments Commission Regulations',
        description: 'Financial services regulation in Australia',
        url: 'https://asic.gov.au/regulatory-resources/find-a-document/regulatory-guides/',
        documentType: 'Regulation',
        issuer: 'Australian Securities and Investments Commission',
        publishDate: '2023-02-10'
      },
      {
        id: 'au-apra-2',
        title: 'Australian Prudential Regulation Authority Standards',
        description: 'Prudential standards for banking, insurance and superannuation',
        url: 'https://www.apra.gov.au/industries/banking',
        documentType: 'Standards',
        issuer: 'Australian Prudential Regulation Authority',
        publishDate: '2022-09-05'
      },
      {
        id: 'au-oaic-3',
        title: 'Privacy Act 1988',
        description: 'Australian privacy principles and data protection',
        url: 'https://www.oaic.gov.au/privacy/the-privacy-act',
        documentType: 'Legislation',
        issuer: 'Office of the Australian Information Commissioner',
        publishDate: '2021-12-12'
      }
    ]
  };
  
  return jurisdictionMap[jurisdiction] || [];
};

/**
 * Get detailed explanation for a specific regulatory document
 */
export const getRegulationDetails = async (
  documentId: string,
  jurisdiction: string
): Promise<string> => {
  try {
    const isBackendHealthy = await checkPythonBackendHealth();
    if (!isBackendHealthy) {
      throw new Error('Python backend is not running or not accessible');
    }
    
    console.log(`Fetching regulation details for ${documentId} in ${jurisdiction}`);
    
    const response = await fetch(`${PYTHON_API_URL}/regulation-details`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId,
        jurisdiction
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch regulation details: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Fetched regulation details:', result);
    
    return result.content || '';
  } catch (error) {
    console.error('Error fetching regulation details:', error);
    return "Sorry, the detailed content for this regulatory document is not available at the moment. Please try again later or visit the official website.";
  }
};

