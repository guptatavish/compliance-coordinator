
import { getPerplexityApiKey, PYTHON_API_URL } from "../utils/apiKeys";

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
}

export interface RegulatoryReference {
  id: string;
  title: string;
  url: string;
  type: "government" | "other";
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
    items?: Array<{ id: string; status: string; title?: string; description?: string }>;
  };
  requirementsList: Requirement[];
  regulatoryReferences?: RegulatoryReference[];
  recentChanges?: number;
  summary?: string;
  fullReport?: string;
  recommendations?: Recommendation[];
  error?: string; // Optional error property
  timestamp?: number; // When the analysis was performed
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
    // First check if the Python backend is running
    const isBackendHealthy = await checkPythonBackendHealth();
    if (!isBackendHealthy) {
      throw new Error('Python backend is not running or not accessible');
    }
    
    // Create FormData for file upload
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
    // Get saved analyses from localStorage
    const historicalAnalysesStr = localStorage.getItem('historicalAnalyses');
    if (!historicalAnalysesStr) {
      return [];
    }
    
    // Parse analyses and return the most recent set
    const historicalAnalyses = JSON.parse(historicalAnalysesStr);
    if (Array.isArray(historicalAnalyses) && historicalAnalyses.length > 0) {
      return historicalAnalyses[0]; // Return the most recent analysis
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
    // Get company profile from localStorage
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
 * Analyzes company compliance based on company profile and jurisdiction using Perplexity API
 */
export const analyzeComplianceWithPython = async (
  jurisdiction: string,
  uploadedDocuments?: UploadedDocument[]
): Promise<ComplianceResult> => {
  try {
    // Get company profile from localStorage
    const companyProfileStr = localStorage.getItem('companyProfile');
    if (!companyProfileStr) {
      throw new Error('Company profile not found');
    }
    
    const companyProfile = JSON.parse(companyProfileStr) as CompanyProfile;
    const perplexityApiKey = getPerplexityApiKey();
    
    if (!perplexityApiKey) {
      throw new Error('Perplexity API key not found');
    }
    
    // First check if the Python backend is running
    const isBackendHealthy = await checkPythonBackendHealth();
    if (!isBackendHealthy) {
      throw new Error('Python backend is not running or not accessible');
    }
    
    console.log('Sending analysis request with company profile:', companyProfile);
    console.log(`Sending request to Python backend at ${PYTHON_API_URL}/analyze-compliance`);
    
    const response = await fetch(`${PYTHON_API_URL}/analyze-compliance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: perplexityApiKey,
        companyProfile,
        jurisdiction,
        documents: uploadedDocuments || [],
        usePerplexity: true // Use Perplexity API for analysis
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Python API request failed: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Received compliance data from Python backend:', result);
    
    // Process requirements to ensure they have the correct format
    if (result.requirementsList) {
      result.requirementsList = result.requirementsList.map((req: any) => ({
        ...req,
        isMet: req.status === 'met',
      }));
    }
    
    // Add timestamp to the result
    const timestampedResult = {
      ...result,
      timestamp: Date.now()
    };
    
    // Save to localStorage (for history)
    saveComplianceAnalysisToHistory(timestampedResult);
    
    return timestampedResult;
  } catch (error) {
    console.error('Error analyzing compliance:', error);
    // Return fallback data with error indication
    return {
      jurisdictionId: jurisdiction,
      jurisdictionName: getJurisdictionName(jurisdiction),
      complianceScore: 0,
      status: 'non-compliant' as ComplianceStatus,
      riskLevel: 'high' as ComplianceLevel,
      requirements: {
        total: 0,
        met: 0,
      },
      requirementsList: [],
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Save a compliance analysis to local storage history
 */
const saveComplianceAnalysisToHistory = (analysis: ComplianceResult): void => {
  try {
    // Get existing history
    const historicalAnalysesStr = localStorage.getItem('historicalAnalyses');
    let historicalAnalyses: ComplianceResult[][] = [];
    
    if (historicalAnalysesStr) {
      historicalAnalyses = JSON.parse(historicalAnalysesStr);
    }
    
    // Create a new entry for this analysis
    const newEntry = [analysis];
    
    // Add to the beginning of the array (most recent first)
    historicalAnalyses.unshift(newEntry);
    
    // Keep only the last 10 analyses
    if (historicalAnalyses.length > 10) {
      historicalAnalyses = historicalAnalyses.slice(0, 10);
    }
    
    // Save back to localStorage
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
    // First check if the Python backend is running
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
    
    // Get the file blob
    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('Error exporting report:', error);
    throw error;
  }
};

/**
 * Export full compliance evaluation report as generated by Perplexity
 */
export const exportFullComplianceReport = async (
  jurisdictionId: string
): Promise<Blob> => {
  try {
    // First check if the Python backend is running
    const isBackendHealthy = await checkPythonBackendHealth();
    if (!isBackendHealthy) {
      throw new Error('Python backend is not running or not accessible');
    }
    
    // Get company profile for context
    const companyProfileStr = localStorage.getItem('companyProfile');
    if (!companyProfileStr) {
      throw new Error('Company profile not found');
    }
    
    const companyProfile = JSON.parse(companyProfileStr) as CompanyProfile;
    const perplexityApiKey = getPerplexityApiKey();
    
    if (!perplexityApiKey) {
      throw new Error('Perplexity API key not found');
    }
    
    console.log(`Sending request to Python backend at ${PYTHON_API_URL}/export-full-compliance-report`);
    
    const response = await fetch(`${PYTHON_API_URL}/export-full-compliance-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: perplexityApiKey,
        companyProfile,
        jurisdictionId
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Export failed: ${response.status} - ${errorText}`);
    }
    
    // Get the file blob
    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('Error exporting full compliance report:', error);
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
    // First check if the Python backend is running
    const isBackendHealthy = await checkPythonBackendHealth();
    if (!isBackendHealthy) {
      throw new Error('Python backend is not running or not accessible');
    }
    
    // Get company profile for context
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
    
    // Get the file blob
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
