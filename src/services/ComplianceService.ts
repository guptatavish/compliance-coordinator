
import { supabase } from '@/integrations/supabase/client';

// Detect environment and set the base URL accordingly
const isProd = import.meta.env.PROD;
const PYTHON_API_URL = isProd 
  ? 'http://localhost:5000' // In production, this would be your deployed API URL
  : 'http://localhost:5000'; // In development, connect to the local Python server

// Define types for compliance analysis
export type ComplianceLevel = 'high' | 'medium' | 'low';
export type ComplianceStatus = 'compliant' | 'partial' | 'non-compliant';

export interface RegulatoryReference {
  id: string;
  title: string;
  description: string;
  url: string;
  documentType: string;
  issuer: string;
  publishDate?: string;
}

export interface Requirement {
  id: string;
  title: string;
  description: string;
  status: 'met' | 'partial' | 'not-met';
  category: string;
  risk: 'high' | 'medium' | 'low';
  detailedExplanation?: string;
  solution?: string;
  recommendation?: string;
  regulatoryReferences?: RegulatoryReference[];
  isMet?: boolean;
}

export interface ComplianceResult {
  jurisdictionId: string;
  jurisdictionName: string;
  complianceScore: number;
  status: ComplianceStatus;
  riskLevel: ComplianceLevel;
  requirements: {
    total: number;
    met: number;
  };
  riskAreas: {
    high: number;
    medium: number;
    low: number;
  };
  lastUpdated: string;
  regulatoryReferences?: RegulatoryReference[];
  requirementsList?: Requirement[];
  flag?: string;
}

// Mock function for fetching local compliance analyses (from localStorage)
export const fetchLocalComplianceAnalyses = (): ComplianceResult[] => {
  try {
    const saved = localStorage.getItem('complianceAnalyses');
    if (saved) {
      return JSON.parse(saved);
    }
    return [];
  } catch (error) {
    console.error('Error fetching local analyses:', error);
    return [];
  }
};

// Function to save compliance analyses to localStorage
export const saveComplianceAnalysis = (analysis: ComplianceResult): void => {
  try {
    const existing = fetchLocalComplianceAnalyses();
    const index = existing.findIndex(a => a.jurisdictionId === analysis.jurisdictionId);
    
    if (index >= 0) {
      existing[index] = analysis;
    } else {
      existing.push(analysis);
    }
    
    localStorage.setItem('complianceAnalyses', JSON.stringify(existing));
  } catch (error) {
    console.error('Error saving analysis:', error);
  }
};

// Function to fetch saved compliance analyses from the backend
export const fetchSavedComplianceAnalyses = async (): Promise<ComplianceResult[]> => {
  try {
    // Get company name from localStorage
    const profileData = localStorage.getItem('companyProfile');
    if (!profileData) {
      return [];
    }
    
    const { companyName } = JSON.parse(profileData);
    return await new ComplianceService().fetchSavedAnalyses(companyName);
  } catch (error) {
    console.error('Error fetching saved analyses:', error);
    return [];
  }
};

// Function to check Python backend health
export const checkPythonBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${PYTHON_API_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('Python backend health check failed:', error);
    return false;
  }
};

// Function to get regulatory documents for a jurisdiction
export const getRegulatoryDocuments = async (jurisdictionId: string): Promise<RegulatoryReference[]> => {
  try {
    const response = await fetch(`${PYTHON_API_URL}/regulatory-documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jurisdictionId })
    });

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching regulatory documents:', error);
    return [];
  }
};

// Function to get requirement details
export const getRequirementDetails = async (requirementId: string, jurisdictionId: string): Promise<Partial<Requirement>> => {
  try {
    const response = await fetch(`${PYTHON_API_URL}/requirement-details`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requirementId, jurisdictionId })
    });

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching requirement details:', error);
    return {};
  }
};

// Function to get regulation details
export const getRegulationDetails = async (regulationId: string, jurisdictionId: string): Promise<string> => {
  try {
    const response = await fetch(`${PYTHON_API_URL}/regulation-details`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ regulationId, jurisdictionId })
    });

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }

    return await response.json().then(data => data.content);
  } catch (error) {
    console.error('Error fetching regulation details:', error);
    return "Regulation details could not be loaded.";
  }
};

// Function to export compliance report
export const exportComplianceReport = async (format: string, data: any): Promise<Blob> => {
  try {
    const response = await fetch(`${PYTHON_API_URL}/export-report/${format}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }

    return await response.blob();
  } catch (error) {
    console.error('Error exporting report:', error);
    throw error;
  }
};

// Function to analyze compliance with Python backend
export const analyzeComplianceWithPython = async (
  jurisdictionId: string,
  useAiJudge: boolean = false
): Promise<ComplianceResult> => {
  return await new ComplianceService().analyzeRegulations(
    jurisdictionId,
    useAiJudge
  );
};

class ComplianceService {
  async analyzeRegulations(jurisdictionId: string, useAiJudge: boolean = false) {
    try {
      console.log('Analyzing regulations with Python backend directly');
      // Get company profile from localStorage
      const profileData = localStorage.getItem('companyProfile');
      if (!profileData) {
        throw new Error("Company profile not found");
      }
      
      const companyProfile = JSON.parse(profileData);
      // Get API keys from localStorage
      const apiKey = localStorage.getItem('perplexity_api_key') || '';
      const mistralApiKey = localStorage.getItem('mistral_api_key') || '';
      
      const response = await fetch(`${PYTHON_API_URL}/analyze-regulations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          companyProfile,
          apiKey,
          mistralApiKey,
          jurisdictionId,
          useAiJudge: useAiJudge || false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Python API error:', errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error analyzing regulations:', error);
      throw error;
    }
  }

  async uploadDocuments(files: File[]) {
    try {
      console.log('Uploading documents to Python backend');
      const formData = new FormData();
      for (const file of files) {
        formData.append('files[]', file);
      }

      const response = await fetch(`${PYTHON_API_URL}/upload-company-documents`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading documents:', error);
      throw error;
    }
  }

  async fetchSavedAnalyses(companyName: string) {
    try {
      console.log('Fetching saved analyses from Python backend');
      const response = await fetch(`${PYTHON_API_URL}/fetch-saved-analyses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyName })
      });

      if (!response.ok) {
        throw new Error(`Fetch failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching saved analyses:', error);
      throw error;
    }
  }

  async analyzeCompliance(companyProfile: any, jurisdiction: string, documents: any[], apiKey: string) {
    try {
      console.log('Analyzing compliance with Python backend');
      const response = await fetch(`${PYTHON_API_URL}/analyze-compliance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyProfile,
          jurisdiction,
          documents,
          apiKey
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error analyzing compliance:', error);
      throw error;
    }
  }

  async exportReport(format: string, data: any) {
    try {
      console.log(`Exporting report in ${format} format from Python backend`);
      const response = await fetch(`${PYTHON_API_URL}/export-report/${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Error exporting report:', error);
      throw error;
    }
  }

  async exportRegulatoryDoc(jurisdiction: string, docType: string) {
    try {
      console.log(`Exporting regulatory document for ${jurisdiction} from Python backend`);
      const response = await fetch(`${PYTHON_API_URL}/export-regulatory-doc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jurisdiction, docType })
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Error exporting regulatory document:', error);
      throw error;
    }
  }
}

export default new ComplianceService();
