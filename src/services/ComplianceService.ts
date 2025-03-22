
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
  requirementsList: Requirement[];
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
    // First try to fetch from the database
    const profileData = localStorage.getItem('companyProfile');
    if (profileData) {
      const { companyName } = JSON.parse(profileData);
      
      // Try to get company profile from database
      const { data: companies } = await supabase
        .from('company_profiles')
        .select('id')
        .eq('company_name', companyName)
        .maybeSingle();
      
      if (companies) {
        const { data: documents } = await supabase
          .from('regulatory_documents')
          .select('*')
          .eq('company_profile_id', companies.id)
          .eq('jurisdiction_id', jurisdictionId);
          
        if (documents && documents.length > 0) {
          return documents.map(doc => ({
            id: doc.id,
            title: doc.document_type,
            description: doc.description || 'Regulatory document',
            url: doc.file_url || '',
            documentType: doc.document_type,
            issuer: doc.issuer || 'Regulatory Authority',
            publishDate: doc.generated_at
          }));
        }
      }
    }
    
    // Fallback to API if no documents in database
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
export const exportComplianceReport = async (data: any, format: string): Promise<Blob> => {
  try {
    // First save the report to the database
    const profileData = localStorage.getItem('companyProfile');
    
    if (profileData) {
      const { companyName } = JSON.parse(profileData);
      
      // Try to get company profile from database
      const { data: companies } = await supabase
        .from('company_profiles')
        .select('id')
        .eq('company_name', companyName)
        .maybeSingle();
        
      if (companies) {
        const { error } = await supabase
          .from('compliance_reports')
          .insert({
            company_profile_id: companies.id,
            jurisdiction_id: data.jurisdictionId,
            report_type: format,
            generated_at: new Date().toISOString()
          });
          
        if (error) {
          console.error('Error saving report to database:', error);
        }
      }
    }
    
    // Then generate the report
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

// Function to fetch certifications required for a company
export const fetchRequiredCertifications = async (companyProfile: any): Promise<RegulatoryReference[]> => {
  try {
    // First try to fetch from the database
    const { data: companies } = await supabase
      .from('company_profiles')
      .select('id')
      .eq('company_name', companyProfile.companyName)
      .maybeSingle();
      
    if (companies) {
      const { data: documents } = await supabase
        .from('regulatory_documents')
        .select('*')
        .eq('company_profile_id', companies.id)
        .eq('document_type', 'certification');
        
      if (documents && documents.length > 0) {
        return documents.map(doc => ({
          id: doc.id,
          title: doc.title || doc.document_type,
          description: doc.description || 'Required certification',
          url: doc.file_url || '',
          documentType: 'certification',
          issuer: doc.issuer || 'Certification Authority',
          publishDate: doc.generated_at
        }));
      }
    }
    
    // Fallback to API if no documents in database
    const response = await fetch(`${PYTHON_API_URL}/required-certifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(companyProfile)
    });

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }

    const certifications = await response.json();
    
    // Store certifications in database if company exists
    if (companies && certifications.length > 0) {
      const certsToInsert = certifications.map((cert: RegulatoryReference) => ({
        company_profile_id: companies.id,
        document_type: 'certification',
        title: cert.title,
        description: cert.description,
        file_url: cert.url,
        jurisdiction_id: cert.issuer,
        issuer: cert.issuer
      }));
      
      const { error } = await supabase
        .from('regulatory_documents')
        .insert(certsToInsert);
        
      if (error) {
        console.error('Error storing certifications in database:', error);
      }
    }

    return certifications;
  } catch (error) {
    console.error('Error fetching required certifications:', error);
    return [];
  }
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

      const result = await response.json();
      
      // Store the analysis result in the database
      await this.storeAnalysisInDatabase(result, companyProfile);
      
      return result;
    } catch (error) {
      console.error('Error analyzing regulations:', error);
      throw error;
    }
  }
  
  async storeAnalysisInDatabase(analysisResult: ComplianceResult, companyProfile: any) {
    try {
      // Check if company exists in database
      const { data: company, error: companyError } = await supabase
        .from('company_profiles')
        .select('id')
        .eq('company_name', companyProfile.companyName)
        .maybeSingle();
        
      if (companyError) {
        console.error('Error fetching company profile:', companyError);
        return;
      }
      
      let companyId: string;
      
      if (!company) {
        // Create company profile if it doesn't exist
        const { data: newCompany, error: newCompanyError } = await supabase
          .from('company_profiles')
          .insert({
            company_name: companyProfile.companyName,
            company_size: companyProfile.companySize,
            industry: companyProfile.industry,
            description: companyProfile.description || '',
            current_jurisdictions: companyProfile.currentJurisdictions || [],
            target_jurisdictions: companyProfile.targetJurisdictions || []
          })
          .select('id')
          .maybeSingle();
          
        if (newCompanyError || !newCompany) {
          console.error('Error creating company profile:', newCompanyError);
          return;
        }
        
        companyId = newCompany.id;
      } else {
        companyId = company.id;
      }
      
      // Store the analysis
      const { data: newAnalysis, error: analysisError } = await supabase
        .from('compliance_analysis')
        .insert({
          company_profile_id: companyId,
          jurisdiction_id: analysisResult.jurisdictionId,
          jurisdiction_name: analysisResult.jurisdictionName,
          compliance_score: analysisResult.complianceScore,
          status: analysisResult.status,
          risk_level: analysisResult.riskLevel
        })
        .select('id')
        .maybeSingle();
        
      if (analysisError || !newAnalysis) {
        console.error('Error storing compliance analysis:', analysisError);
        return;
      }
      
      // Store requirements
      if (analysisResult.requirementsList && analysisResult.requirementsList.length > 0) {
        const requirementsToInsert = analysisResult.requirementsList.map(req => ({
          analysis_id: newAnalysis.id,
          title: req.title,
          description: req.description,
          category: req.category,
          status: req.status,
          risk: req.risk,
          recommendation: req.recommendation || null
        }));
        
        const { error: requirementsError } = await supabase
          .from('compliance_requirements')
          .insert(requirementsToInsert);
          
        if (requirementsError) {
          console.error('Error storing requirements:', requirementsError);
        }
      }
      
      // Store regulatory references
      if (analysisResult.regulatoryReferences && analysisResult.regulatoryReferences.length > 0) {
        const referencesToInsert = analysisResult.regulatoryReferences.map(ref => ({
          company_profile_id: companyId,
          jurisdiction_id: analysisResult.jurisdictionId,
          document_type: ref.documentType,
          title: ref.title,
          description: ref.description,
          file_url: ref.url,
          issuer: ref.issuer
        }));
        
        const { error: referencesError } = await supabase
          .from('regulatory_documents')
          .insert(referencesToInsert);
          
        if (referencesError) {
          console.error('Error storing regulatory references:', referencesError);
        }
      }
      
      console.log('Successfully stored analysis in database');
      
    } catch (error) {
      console.error('Error storing analysis in database:', error);
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
      console.log('Fetching saved analyses from database');
      
      // First try to get from database
      const { data: company } = await supabase
        .from('company_profiles')
        .select('id')
        .eq('company_name', companyName)
        .maybeSingle();
        
      if (company) {
        const { data: analyses } = await supabase
          .from('compliance_analysis')
          .select('*, compliance_requirements(*)')
          .eq('company_profile_id', company.id);
          
        if (analyses && analyses.length > 0) {
          return analyses.map(analysis => {
            return {
              jurisdictionId: analysis.jurisdiction_id,
              jurisdictionName: analysis.jurisdiction_name,
              complianceScore: analysis.compliance_score,
              status: analysis.status as ComplianceStatus,
              riskLevel: analysis.risk_level as ComplianceLevel,
              requirements: {
                total: analysis.compliance_requirements?.length || 0,
                met: analysis.compliance_requirements?.filter((req: any) => req.status === 'met').length || 0
              },
              riskAreas: {
                high: analysis.compliance_requirements?.filter((req: any) => req.risk === 'high').length || 0,
                medium: analysis.compliance_requirements?.filter((req: any) => req.risk === 'medium').length || 0,
                low: analysis.compliance_requirements?.filter((req: any) => req.risk === 'low').length || 0
              },
              lastUpdated: analysis.updated_at,
              requirementsList: analysis.compliance_requirements?.map((req: any) => ({
                id: req.id,
                title: req.title,
                description: req.description,
                status: req.status,
                category: req.category,
                risk: req.risk,
                recommendation: req.recommendation
              })) || []
            };
          });
        }
      }
      
      // Fallback to Python backend if no data in database
      console.log('No analyses found in database, fetching from Python backend');
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
