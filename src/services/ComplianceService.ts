import { getPerplexityApiKey, PYTHON_API_URL } from "../utils/apiKeys";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
  error?: string; // Optional error property
}

export interface CompanyProfile {
  companyName: string;
  companySize: string;
  industry: string;
  description: string;
  currentJurisdictions: string[];
  targetJurisdictions: string[];
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
 * Get company profile from Supabase
 */
export const getCompanyProfile = async (): Promise<CompanyProfile | null> => {
  try {
    // First try to get from Supabase
    const { data, error } = await supabase
      .from('company_profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching company profile from Supabase:', error);
      // Fall back to localStorage temporarily until migration is complete
      const profileStr = localStorage.getItem('companyProfile');
      if (profileStr) {
        return JSON.parse(profileStr) as CompanyProfile;
      }
      return null;
    }
    
    if (data) {
      // Convert from DB schema to application schema
      return {
        companyName: data.company_name,
        companySize: data.company_size,
        industry: data.industry,
        description: data.description || '',
        currentJurisdictions: data.current_jurisdictions || [],
        targetJurisdictions: data.target_jurisdictions || []
      };
    }
    
    // Fall back to localStorage temporarily until migration is complete
    const profileStr = localStorage.getItem('companyProfile');
    if (profileStr) {
      return JSON.parse(profileStr) as CompanyProfile;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting company profile:', error);
    return null;
  }
};

/**
 * Analyzes company compliance based on company profile and jurisdiction
 */
export const analyzeComplianceWithPython = async (
  jurisdiction: string
): Promise<ComplianceResult> => {
  try {
    // Validate jurisdiction input
    if (!jurisdiction) {
      throw new Error('Invalid jurisdiction: jurisdiction cannot be null or empty');
    }
    
    // Get company profile from Supabase
    const companyProfile = await getCompanyProfile();
    if (!companyProfile) {
      throw new Error('Company profile not found');
    }
    
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
        jurisdiction
      }),
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Python API request failed: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Received compliance data from Python backend:', result);
    
    // Enhanced validation of the result structure
    if (!result) {
      throw new Error('Empty response from Python backend');
    }
    
    if (typeof result !== 'object') {
      throw new Error(`Invalid response type: expected object, got ${typeof result}`);
    }
    
    // Validate and normalize essential fields
    const normalizedResult: ComplianceResult = {
      jurisdictionId: result.jurisdictionId || jurisdiction,
      jurisdictionName: result.jurisdictionName || getJurisdictionName(jurisdiction),
      flag: result.flag || getJurisdictionFlag(jurisdiction),
      complianceScore: typeof result.complianceScore === 'number' ? result.complianceScore : 0,
      status: validateComplianceStatus(result.status),
      riskLevel: validateComplianceLevel(result.riskLevel),
      requirements: {
        total: typeof result.requirements?.total === 'number' ? result.requirements.total : 0,
        met: typeof result.requirements?.met === 'number' ? result.requirements.met : 0,
      },
      requirementsList: Array.isArray(result.requirementsList) 
        ? result.requirementsList.map(normalizeRequirement)
        : [],
    };
    
    // Store the analysis result in Supabase
    try {
      // Get the company profile ID
      const { data: profileData } = await supabase
        .from('company_profiles')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (profileData) {
        // Insert the analysis into the database
        const { data: analysisData, error: analysisError } = await supabase
          .from('compliance_analysis')
          .insert([{
            company_profile_id: profileData.id,
            jurisdiction_id: normalizedResult.jurisdictionId,
            jurisdiction_name: normalizedResult.jurisdictionName,
            compliance_score: normalizedResult.complianceScore,
            status: normalizedResult.status,
            risk_level: normalizedResult.riskLevel
          }])
          .select();
        
        if (analysisError) {
          console.error('Error storing compliance analysis:', analysisError);
        } else if (analysisData && analysisData.length > 0) {
          // Store the requirements
          const analysisId = analysisData[0].id;
          const requirementsToInsert = normalizedResult.requirementsList.map(req => ({
            analysis_id: analysisId,
            title: req.title,
            description: req.description,
            status: req.status,
            category: req.category,
            risk: req.risk,
            recommendation: req.recommendation
          }));
          
          const { error: reqError } = await supabase
            .from('compliance_requirements')
            .insert(requirementsToInsert);
          
          if (reqError) {
            console.error('Error storing compliance requirements:', reqError);
          }
        }
      }
    } catch (dbError) {
      console.error('Error storing analysis in database:', dbError);
      // Continue without failing since this is just for persistence
    }
    
    return normalizedResult;
  } catch (error: any) {
    console.error('Error analyzing compliance:', error);
    
    // Rethrow with a clear message for the UI
    throw new Error(`Compliance analysis failed: ${error.message || "Unknown error"}`);
  }
};

/**
 * Validates and normalizes a compliance status value
 */
function validateComplianceStatus(status: any): ComplianceStatus {
  if (status === 'compliant' || status === 'partial' || status === 'non-compliant') {
    return status;
  }
  
  // Try to normalize string values that might be close
  if (typeof status === 'string') {
    const lowercaseStatus = status.toLowerCase();
    if (lowercaseStatus.includes('comply') || lowercaseStatus.includes('compliant')) {
      return 'compliant';
    } else if (lowercaseStatus.includes('partial')) {
      return 'partial';
    } else if (lowercaseStatus.includes('non') || lowercaseStatus.includes('not')) {
      return 'non-compliant';
    }
  }
  
  // Default fallback
  return 'non-compliant';
}

/**
 * Validates and normalizes a compliance level value
 */
function validateComplianceLevel(level: any): ComplianceLevel {
  if (level === 'high' || level === 'medium' || level === 'low') {
    return level;
  }
  
  // Try to normalize string values that might be close
  if (typeof level === 'string') {
    const lowercaseLevel = level.toLowerCase();
    if (lowercaseLevel.includes('high')) {
      return 'high';
    } else if (lowercaseLevel.includes('med')) {
      return 'medium';
    } else if (lowercaseLevel.includes('low')) {
      return 'low';
    }
  }
  
  // Default fallback
  return 'high';
}

/**
 * Normalizes a requirement object to ensure it has all required fields
 */
function normalizeRequirement(req: any): Requirement {
  if (!req || typeof req !== 'object') {
    return {
      id: `gen-${Math.random().toString(36).substring(2, 9)}`,
      title: 'Unknown Requirement',
      description: 'No description available',
      isMet: false,
      status: 'not-met',
      category: 'General',
      risk: 'high'
    };
  }
  
  return {
    id: req.id || `gen-${Math.random().toString(36).substring(2, 9)}`,
    title: req.title || 'Untitled Requirement',
    description: req.description || 'No description provided',
    isMet: !!req.isMet,
    status: validateRequirementStatus(req.status),
    category: req.category || 'General',
    risk: validateRiskLevel(req.risk),
    recommendation: req.recommendation
  };
}

/**
 * Validates and normalizes a requirement status
 */
function validateRequirementStatus(status: any): RequirementStatus {
  if (status === 'met' || status === 'partial' || status === 'not-met') {
    return status;
  }
  
  // Try to normalize string values
  if (typeof status === 'string') {
    const lowercaseStatus = status.toLowerCase();
    if (lowercaseStatus.includes('met') && !lowercaseStatus.includes('not')) {
      return 'met';
    } else if (lowercaseStatus.includes('partial')) {
      return 'partial';
    }
  }
  
  // Default fallback
  return 'not-met';
}

/**
 * Validates and normalizes a risk level
 */
function validateRiskLevel(risk: any): RiskLevel {
  if (risk === 'high' || risk === 'medium' || risk === 'low') {
    return risk;
  }
  
  // Try to normalize string values
  if (typeof risk === 'string') {
    const lowercaseRisk = risk.toLowerCase();
    if (lowercaseRisk.includes('high')) {
      return 'high';
    } else if (lowercaseRisk.includes('med')) {
      return 'medium';
    } else if (lowercaseRisk.includes('low')) {
      return 'low';
    }
  }
  
  // Default fallback
  return 'high';
}

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
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Export failed: ${response.status} - ${errorText}`);
    }
    
    // Get the file blob
    const blob = await response.blob();
    
    // Store report reference in Supabase
    try {
      const { data: profileData } = await supabase
        .from('company_profiles')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (profileData) {
        await supabase
          .from('compliance_reports')
          .insert([{
            company_profile_id: profileData.id,
            jurisdiction_id: data.jurisdictionId,
            report_type: format,
            generated_at: new Date().toISOString()
          }]);
      }
    } catch (dbError) {
      console.error('Error storing report reference:', dbError);
      // Continue without failing since this is just for record-keeping
    }
    
    return blob;
  } catch (error: any) {
    console.error('Error exporting report:', error);
    throw new Error(`Report export failed: ${error.message || "Unknown error"}`);
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
    const companyProfile = await getCompanyProfile();
    if (!companyProfile) {
      throw new Error('Company profile not found');
    }
    
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
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(60000) // 60 second timeout for document generation
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Export failed: ${response.status} - ${errorText}`);
    }
    
    // Get the file blob
    const blob = await response.blob();
    
    // Store document reference in Supabase
    try {
      const { data: profileData } = await supabase
        .from('company_profiles')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (profileData) {
        await supabase
          .from('regulatory_documents')
          .insert([{
            company_profile_id: profileData.id,
            jurisdiction_id: jurisdiction,
            document_type: docType,
            generated_at: new Date().toISOString()
          }]);
      }
    } catch (dbError) {
      console.error('Error storing document reference:', dbError);
      // Continue without failing since this is just for record-keeping
    }
    
    return blob;
  } catch (error: any) {
    console.error('Error exporting regulatory document:', error);
    throw new Error(`Document export failed: ${error.message || "Unknown error"}`);
  }
};

/**
 * Get a jurisdiction name from its ID
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
 * Get a flag emoji for a jurisdiction
 */
function getJurisdictionFlag(jurisdictionId: string): string {
  const flags: Record<string, string> = {
    'us': '🇺🇸',
    'eu': '🇪🇺',
    'uk': '🇬🇧',
    'sg': '🇸🇬',
    'au': '🇦🇺',
    // Add more as needed
  };
  
  return flags[jurisdictionId] || '🏳️';
}

