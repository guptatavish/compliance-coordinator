import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { hasPerplexityApiKey } from '@/utils/apiKeys';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { jurisdictions } from '../components/JurisdictionSelect';
import { analyzeComplianceWithPython, checkPythonBackendHealth, ComplianceStatus, ComplianceLevel, Requirement, exportComplianceReport, exportRegulatoryDocument } from '../services/ComplianceService';
import AnalysisHeader from '@/components/compliance/AnalysisHeader';
import AnalysisAlerts from '@/components/compliance/AnalysisAlerts';
import AnalysisStatusCard from '@/components/compliance/AnalysisStatusCard';
import JurisdictionCardGrid from '@/components/compliance/JurisdictionCardGrid';
import JurisdictionDetails from '@/components/compliance/JurisdictionDetails';

interface JurisdictionData {
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
  recentChanges?: number;
  requirementsList: Requirement[];
  error?: string;
}

const ComplianceAnalysis: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [jurisdictionsData, setJurisdictionsData] = useState<JurisdictionData[]>([]);
  const [pythonBackendAvailable, setPythonBackendAvailable] = useState<boolean | null>(null);
  
  const hasCompanyProfile = !!localStorage.getItem('companyProfile');
  const companyProfileData = hasCompanyProfile 
    ? JSON.parse(localStorage.getItem('companyProfile')!) 
    : null;
  
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated && !hasCompanyProfile) {
      navigate('/company-profile');
    }
  }, [isAuthenticated, hasCompanyProfile, navigate]);

  useEffect(() => {
    const checkBackendHealth = async () => {
      const isHealthy = await checkPythonBackendHealth();
      setPythonBackendAvailable(isHealthy);
    };
    
    checkBackendHealth();
  }, []);

  const handleRunAnalysis = async () => {
    if (!hasPerplexityApiKey()) {
      toast({
        title: "API Key Required",
        description: "Please add your Perplexity API key in Settings before running analysis.",
        variant: "destructive",
      });
      return;
    }
    
    if (!pythonBackendAvailable) {
      toast({
        title: "Python Backend Not Available",
        description: "The Python backend is not running or not accessible. Please start the Python backend and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      let companyId: string | null = null;
      const { data: companyData, error: companyError } = await supabase
        .from('company_profiles')
        .insert([{
          company_name: companyProfileData.companyName,
          company_size: companyProfileData.companySize,
          industry: companyProfileData.industry,
          description: companyProfileData.description,
          current_jurisdictions: companyProfileData.currentJurisdictions,
          target_jurisdictions: companyProfileData.targetJurisdictions
        }])
        .select('id')
        .maybeSingle();
      
      if (companyError) {
        console.error("Error saving company profile:", companyError);
      } else if (companyData) {
        companyId = companyData.id;
      }
      
      const analysisResults: JurisdictionData[] = [];
      
      const validJurisdictions = companyProfileData.currentJurisdictions.filter(j => j);
      
      if (validJurisdictions.length === 0) {
        toast({
          title: "No Valid Jurisdictions",
          description: "Please select at least one jurisdiction in your company profile.",
          variant: "destructive",
        });
        setIsAnalyzing(false);
        return;
      }
      
      for (const jurisdictionId of validJurisdictions) {
        console.log(`Analyzing jurisdiction: ${jurisdictionId}`);
        
        try {
          const result = await analyzeComplianceWithPython(jurisdictionId);
          
          if (result && result.jurisdictionId) {
            const matchingJurisdiction = jurisdictions.find(j => j.id === result.jurisdictionId);
            const enrichedResult = {
              ...result,
              flag: matchingJurisdiction?.flag || '🏳️'
            };
            
            analysisResults.push(enrichedResult);
            
            if (companyId) {
              try {
                const { data: analysisData, error: analysisError } = await supabase
                  .from('compliance_analysis')
                  .insert([{
                    company_profile_id: companyId,
                    jurisdiction_id: result.jurisdictionId,
                    jurisdiction_name: result.jurisdictionName,
                    compliance_score: result.complianceScore,
                    status: result.status,
                    risk_level: result.riskLevel
                  }])
                  .select('id')
                  .maybeSingle();
                
                if (analysisError) {
                  console.error("Error saving analysis:", analysisError);
                  continue;
                }
                
                if (analysisData && analysisData.id && result.requirementsList && result.requirementsList.length > 0) {
                  const analysisId = analysisData.id;
                  
                  const requirementsToInsert = result.requirementsList.map(req => ({
                    analysis_id: analysisId,
                    title: req.title,
                    description: req.description,
                    category: req.category,
                    status: req.status,
                    risk: req.risk,
                    recommendation: req.recommendation || null,
                    is_met: req.isMet
                  }));
                  
                  if (requirementsToInsert.length > 0) {
                    const { error: reqError } = await supabase
                      .from('compliance_requirements')
                      .insert(requirementsToInsert);
                    
                    if (reqError) {
                      console.error("Error saving requirements:", reqError);
                    }
                  }
                }
              } catch (err) {
                console.error("Error saving analysis to database:", err);
              }
            }
          } else {
            console.error(`Invalid or incomplete result received for jurisdiction ${jurisdictionId}:`, result);
            
            analysisResults.push({
              jurisdictionId: jurisdictionId,
              jurisdictionName: getJurisdictionName(jurisdictionId),
              complianceScore: 0,
              status: 'non-compliant',
              riskLevel: 'high',
              requirements: {
                total: 0,
                met: 0,
              },
              requirementsList: [],
              error: 'Invalid or incomplete analysis result'
            });
          }
        } catch (err) {
          console.error(`Error analyzing jurisdiction ${jurisdictionId}:`, err);
          
          analysisResults.push({
            jurisdictionId: jurisdictionId,
            jurisdictionName: getJurisdictionName(jurisdictionId),
            complianceScore: 0,
            status: 'non-compliant',
            riskLevel: 'high',
            requirements: {
              total: 0,
              met: 0,
            },
            requirementsList: [],
            error: err instanceof Error ? err.message : 'Unknown error'
          });
        }
      }
      
      setJurisdictionsData(analysisResults);
      
      if (analysisResults.length > 0 && analysisResults[0] && analysisResults[0].jurisdictionId) {
        setSelectedJurisdiction(analysisResults[0].jurisdictionId);
      } else {
        setSelectedJurisdiction(null);
      }
      
      setAnalysisComplete(true);
      
      toast({
        title: "Analysis Complete",
        description: "Compliance analysis has been completed successfully.",
      });
      
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportAnalysis = async (format: 'pdf' | 'excel' | 'csv' = 'pdf') => {
    if (!selectedData) {
      toast({
        title: "No jurisdiction selected",
        description: "Please select a jurisdiction to export analysis.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsAnalyzing(true);
      
      toast({
        title: "Generating report",
        description: "Please wait while we generate your report...",
      });
      
      const blob = await exportComplianceReport(selectedData, format);
      
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance_report_${selectedData.jurisdictionId}_${format}.${format}`;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Report generated",
        description: "Your report has been downloaded successfully.",
      });
    } catch (error) {
      console.error("Error exporting report:", error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportRegulatoryDocument = async (docType: 'full' | 'summary' | 'guidance' = 'full') => {
    if (!selectedData) {
      toast({
        title: "No jurisdiction selected",
        description: "Please select a jurisdiction to export regulatory document.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsAnalyzing(true);
      
      toast({
        title: "Generating document",
        description: "Please wait while we generate your regulatory document...",
      });
      
      const blob = await exportRegulatoryDocument(selectedData.jurisdictionId, docType);
      
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `regulatory_document_${selectedData.jurisdictionId}_${docType}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Document generated",
        description: "Your regulatory document has been downloaded successfully.",
      });
    } catch (error) {
      console.error("Error exporting regulatory document:", error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const selectedData = selectedJurisdiction
    ? jurisdictionsData.find(j => j && j.jurisdictionId === selectedJurisdiction) || null
    : null;

  const getJurisdictionName = (jurisdictionId: string): string => {
    const jurisdiction = jurisdictions.find(j => j.id === jurisdictionId);
    return jurisdiction ? jurisdiction.name : jurisdictionId;
  };

  const getCategoryAnalysisData = () => {
    if (!selectedData || !selectedData.requirementsList) return [];
    
    const categoryCounts: Record<string, Record<string, number>> = {};
    
    selectedData.requirementsList.forEach(req => {
      if (!categoryCounts[req.category]) {
        categoryCounts[req.category] = { met: 0, partial: 0, 'not-met': 0 };
      }
      categoryCounts[req.category][req.status]++;
    });
    
    return Object.entries(categoryCounts).map(([category, counts]) => ({
      name: category,
      Met: counts.met,
      Partial: counts.partial,
      "Not Met": counts['not-met']
    }));
  };

  const getRiskAnalysisData = () => {
    if (!selectedData || !selectedData.requirementsList) return [];
    
    const riskCounts = { high: 0, medium: 0, low: 0 };
    
    selectedData.requirementsList.forEach(req => {
      riskCounts[req.risk]++;
    });
    
    return [
      { name: 'High Risk', value: riskCounts.high },
      { name: 'Medium Risk', value: riskCounts.medium },
      { name: 'Low Risk', value: riskCounts.low },
    ];
  };

  return (
    <Layout showFooter={false}>
      <div className="container px-4 py-8 mt-16">
        <AnalysisHeader 
          isAnalyzing={isAnalyzing}
          onRunAnalysis={handleRunAnalysis}
          hasPerplexityApiKey={hasPerplexityApiKey()}
          pythonBackendAvailable={pythonBackendAvailable}
        />
        
        <AnalysisAlerts 
          hasApiKey={hasPerplexityApiKey()}
          pythonBackendAvailable={pythonBackendAvailable}
        />
        
        {!isAnalyzing && !analysisComplete && (
          <AnalysisStatusCard 
            isAnalyzing={isAnalyzing}
            analysisComplete={analysisComplete}
            onRunAnalysis={handleRunAnalysis}
            hasPerplexityApiKey={hasPerplexityApiKey()}
          />
        )}
        
        {isAnalyzing && (
          <AnalysisStatusCard 
            isAnalyzing={isAnalyzing}
            analysisComplete={analysisComplete}
            onRunAnalysis={handleRunAnalysis}
            hasPerplexityApiKey={hasPerplexityApiKey()}
          />
        )}
        
        {analysisComplete && (
          <div className="space-y-8">
            <AnalysisStatusCard 
              isAnalyzing={isAnalyzing}
              analysisComplete={analysisComplete}
              onRunAnalysis={handleRunAnalysis}
              hasPerplexityApiKey={hasPerplexityApiKey()}
            />
            
            <JurisdictionCardGrid 
              jurisdictionsData={jurisdictionsData}
              selectedJurisdiction={selectedJurisdiction}
              setSelectedJurisdiction={(id) => setSelectedJurisdiction(id)}
              onExportAnalysis={() => handleExportAnalysis('pdf')}
            />
            
            {selectedData && (
              <JurisdictionDetails 
                selectedData={selectedData}
                onExportRegulatoryDocument={handleExportRegulatoryDocument}
                getCategoryAnalysisData={getCategoryAnalysisData}
                getRiskAnalysisData={getRiskAnalysisData}
              />
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ComplianceAnalysis;
