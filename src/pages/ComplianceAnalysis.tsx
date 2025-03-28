
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ComplianceCard from '../components/ComplianceCard';
import StatusChart from '../components/StatusChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { jurisdictions } from '../components/JurisdictionSelect';
import { useAuth } from '../contexts/AuthContext';
import { getPerplexityApiKey, hasPerplexityApiKey } from '@/utils/apiKeys';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, BookOpen, Calendar, CheckSquare, Clock, Download, FileText, History, InfoIcon, LineChart, RefreshCw } from 'lucide-react';
import { 
  analyzeComplianceWithPython, 
  checkPythonBackendHealth, 
  ComplianceStatus, 
  ComplianceLevel, 
  Requirement, 
  ComplianceResult, 
  exportFullComplianceReport, 
  RegulatoryReference 
} from '../services/ComplianceService';

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
  analysisDate?: string;
  regulatoryReferences?: RegulatoryReference[];
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
  const [historicalAnalyses, setHistoricalAnalyses] = useState<JurisdictionData[][]>([]);
  const [activeHistoryIndex, setActiveHistoryIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  
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

  // Load previous analyses from local storage
  useEffect(() => {
    const loadPreviousAnalyses = () => {
      const savedAnalyses = localStorage.getItem('historicalAnalyses');
      
      if (savedAnalyses) {
        try {
          const parsedAnalyses = JSON.parse(savedAnalyses) as JurisdictionData[][];
          setHistoricalAnalyses(parsedAnalyses);
          
          // If we have historical analyses, set the latest one as active
          if (parsedAnalyses.length > 0) {
            setJurisdictionsData(parsedAnalyses[0]);
            setAnalysisComplete(true);
          }
        } catch (error) {
          console.error("Error parsing saved analyses:", error);
        }
      }
    };
    
    loadPreviousAnalyses();
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
      const currentDate = new Date().toISOString();
      
      for (const jurisdictionId of companyProfileData.currentJurisdictions) {
        console.log(`Analyzing jurisdiction: ${jurisdictionId}`);
        
        try {
          const result = await analyzeComplianceWithPython(jurisdictionId);
          
          const matchingJurisdiction = jurisdictions.find(j => j.id === result.jurisdictionId);
          const enrichedResult = {
            ...result,
            flag: matchingJurisdiction?.flag || '🏳️',
            analysisDate: currentDate
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
              
              if (analysisData) {
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
            error: err instanceof Error ? err.message : 'Unknown error',
            analysisDate: currentDate
          });
        }
      }
      
      setJurisdictionsData(analysisResults);
      setAnalysisComplete(true);
      
      // Update historical analyses
      const updatedHistory = [analysisResults, ...historicalAnalyses];
      setHistoricalAnalyses(updatedHistory);
      setActiveHistoryIndex(0);
      
      // Save to localStorage
      localStorage.setItem('historicalAnalyses', JSON.stringify(updatedHistory));
      
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

  const handleViewHistoricalAnalysis = (index: number) => {
    if (index >= 0 && index < historicalAnalyses.length) {
      setJurisdictionsData(historicalAnalyses[index]);
      setActiveHistoryIndex(index);
    }
  };

  const handleExportFullReport = async () => {
    if (!selectedJurisdiction) {
      toast({
        title: "No Jurisdiction Selected",
        description: "Please select a jurisdiction first to export its report.",
        variant: "destructive",
      });
      return;
    }
    
    setIsExporting(true);
    
    try {
      const blob = await exportFullComplianceReport(selectedJurisdiction);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance_report_${selectedJurisdiction}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Report Downloaded",
        description: "Full compliance report has been downloaded successfully.",
      });
    } catch (error) {
      console.error("Error exporting report:", error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const selectedData = selectedJurisdiction
    ? jurisdictionsData.find(j => j.jurisdictionId === selectedJurisdiction)
    : null;

  const getJurisdictionName = (jurisdictionId: string): string => {
    const jurisdiction = jurisdictions.find(j => j.id === jurisdictionId);
    return jurisdiction ? jurisdiction.name : jurisdictionId;
  };

  const getCategoryAnalysisData = () => {
    if (!selectedData) return [];
    
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
    if (!selectedData) return [];
    
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <Layout showFooter={false}>
      <div className="container px-4 py-8 mt-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Compliance Analysis</h1>
          <p className="text-muted-foreground">
            Analyze regulatory requirements and compliance status across jurisdictions.
          </p>
        </div>
        
        {!hasPerplexityApiKey() && (
          <Alert className="mb-8 border-warning-500/50 bg-warning-50/50">
            <InfoIcon className="h-4 w-4 text-warning-500" />
            <AlertTitle className="text-warning-500">Perplexity API Key Required</AlertTitle>
            <AlertDescription className="text-warning-600">
              You need to add a Perplexity API key in the Settings page before you can run a compliance analysis.
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-4" 
                onClick={() => navigate('/settings')}
              >
                Go to Settings
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {pythonBackendAvailable === false && (
          <Alert className="mb-8 border-danger-500/50 bg-danger-50/50">
            <AlertTriangle className="h-4 w-4 text-danger-500" />
            <AlertTitle className="text-danger-500">Python Backend Not Available</AlertTitle>
            <AlertDescription className="text-danger-600">
              The Python backend is not running or not accessible. Please start the Python backend and refresh this page.
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-4"
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="mb-8 flex justify-between items-center">
          <div>
            {historicalAnalyses.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Analysis History:</span>
                <div className="flex flex-wrap gap-2">
                  {historicalAnalyses.map((analysis, index) => (
                    <Button 
                      key={index} 
                      variant={activeHistoryIndex === index ? "default" : "outline"} 
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => handleViewHistoricalAnalysis(index)}
                    >
                      <History className="h-3 w-3" />
                      {index === 0 ? 'Latest' : `#${historicalAnalyses.length - index}`}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <Button 
            onClick={handleRunAnalysis} 
            disabled={!hasPerplexityApiKey() || isAnalyzing || pythonBackendAvailable === false}
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Run New Analysis
              </>
            )}
          </Button>
        </div>
        
        {isAnalyzing && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                  <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">Running Analysis</h2>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  Analyzing regulatory requirements and compliance status across all jurisdictions...
                </p>
                <div className="max-w-md mx-auto flex flex-col gap-2 text-left">
                  <p className="text-sm">• Retrieving jurisdictional data</p>
                  <p className="text-sm">• Analyzing regulatory requirements</p>
                  <p className="text-sm">• Comparing current compliance status</p>
                  <p className="text-sm">• Generating recommendations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {!isAnalyzing && !analysisComplete && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                  <LineChart className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">Run Compliance Analysis</h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  Analyze your compliance status across all jurisdictions to identify gaps and receive recommendations.
                </p>
                <Button 
                  onClick={handleRunAnalysis} 
                  disabled={!hasPerplexityApiKey() || pythonBackendAvailable === false}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Run Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {analysisComplete && (
          <div className="space-y-8">
            {activeHistoryIndex === 0 && (
              <Alert className="border-warning-500/50 bg-warning-50/50">
                <AlertTriangle className="h-4 w-4 text-warning-500" />
                <AlertTitle className="text-warning-500">Compliance Gaps Detected</AlertTitle>
                <AlertDescription className="text-warning-600">
                  We've identified several compliance gaps across your jurisdictions. Review the analysis below for details and recommendations.
                </AlertDescription>
              </Alert>
            )}
            
            {historicalAnalyses.length > 0 && activeHistoryIndex < historicalAnalyses.length && (
              <div className="bg-muted/30 p-3 rounded-md flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {activeHistoryIndex === 0 
                      ? 'Latest analysis performed on ' 
                      : `Analysis #${historicalAnalyses.length - activeHistoryIndex} performed on `}
                    {formatDate(historicalAnalyses[activeHistoryIndex][0]?.analysisDate)}
                  </span>
                </div>
              </div>
            )}
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Jurisdictions</h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={!selectedJurisdiction || isExporting}
                  onClick={handleExportFullReport}
                >
                  {isExporting ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export Full Report
                    </>
                  )}
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {jurisdictionsData.map((jurisdiction) => (
                  <div 
                    key={jurisdiction.jurisdictionId}
                    className={`transition-all duration-300 transform ${
                      selectedJurisdiction === jurisdiction.jurisdictionId ? 'scale-[1.02] ring-2 ring-primary' : ''
                    }`}
                  >
                    <ComplianceCard
                      {...jurisdiction}
                      onClick={() => setSelectedJurisdiction(jurisdiction.jurisdictionId)}
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {selectedData && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{selectedData.flag}</span>
                  <h2 className="text-xl font-semibold">{selectedData.jurisdictionName} Analysis</h2>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <StatusChart 
                    title="Compliance by Category" 
                    description="Compliance status breakdown by regulatory category"
                    data={getCategoryAnalysisData()}
                    type="bar"
                    categories={['Met', 'Partial', 'Not Met']}
                    colors={['#10B981', '#F59E0B', '#EF4444']}
                  />
                  
                  <StatusChart 
                    title="Risk Assessment" 
                    description="Distribution of requirements by risk level"
                    data={getRiskAnalysisData()}
                    type="pie"
                    colors={['#EF4444', '#F59E0B', '#10B981']}
                  />
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Requirements and Recommendations</CardTitle>
                    <CardDescription>
                      Review compliance requirements and actionable recommendations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="all">
                      <TabsList className="mb-4">
                        <TabsTrigger value="all">All Requirements</TabsTrigger>
                        <TabsTrigger value="issues">Compliance Issues</TabsTrigger>
                        <TabsTrigger value="met">Requirements Met</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="all" className="space-y-4">
                        {selectedData.requirementsList.map((req, index) => (
                          <div 
                            key={req.id || index} 
                            className={`p-4 rounded-lg border ${
                              req.status === 'met'
                                ? 'border-success-100 bg-success-50/30'
                                : req.status === 'partial'
                                ? 'border-warning-100 bg-warning-50/30'
                                : 'border-danger-100 bg-danger-50/30'
                            }`}
                          >
                            <div className="flex items-start">
                              <div className={`p-2 rounded-full mr-3 ${
                                req.status === 'met'
                                  ? 'bg-success-100 text-success-500'
                                  : req.status === 'partial'
                                  ? 'bg-warning-100 text-warning-500'
                                  : 'bg-danger-100 text-danger-500'
                              }`}>
                                {req.status === 'met' ? (
                                  <CheckSquare className="h-4 w-4" />
                                ) : req.status === 'partial' ? (
                                  <Clock className="h-4 w-4" />
                                ) : (
                                  <AlertTriangle className="h-4 w-4" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between mb-1">
                                  <h4 className="font-medium text-sm">{req.title}</h4>
                                  <span className="text-xs px-2 py-1 rounded-full bg-muted">
                                    {req.category}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {req.description}
                                </p>
                                {req.recommendation && (
                                  <div className="mt-2 text-sm">
                                    <span className="font-medium">Recommendation: </span>
                                    {req.recommendation}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </TabsContent>
                      
                      <TabsContent value="issues" className="space-y-4">
                        {selectedData.requirementsList
                          .filter(req => req.status !== 'met')
                          .map((req, index) => (
                            <div 
                              key={req.id || `issue-${index}`} 
                              className={`p-4 rounded-lg border ${
                                req.status === 'partial'
                                  ? 'border-warning-100 bg-warning-50/30'
                                  : 'border-danger-100 bg-danger-50/30'
                              }`}
                            >
                              <div className="flex items-start">
                                <div className={`p-2 rounded-full mr-3 ${
                                  req.status === 'partial'
                                    ? 'bg-warning-100 text-warning-500'
                                    : 'bg-danger-100 text-danger-500'
                                }`}>
                                  {req.status === 'partial' ? (
                                    <Clock className="h-4 w-4" />
                                  ) : (
                                    <AlertTriangle className="h-4 w-4" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex justify-between mb-1">
                                    <h4 className="font-medium text-sm">{req.title}</h4>
                                    <span className="text-xs px-2 py-1 rounded-full bg-muted">
                                      {req.category}
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {req.description}
                                  </p>
                                  {req.recommendation && (
                                    <div className="mt-2 text-sm">
                                      <span className="font-medium">Recommendation: </span>
                                      {req.recommendation}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                        ))}
                      </TabsContent>
                      
                      <TabsContent value="met" className="space-y-4">
                        {selectedData.requirementsList
                          .filter(req => req.status === 'met')
                          .map((req, index) => (
                            <div 
                              key={req.id || `met-${index}`} 
                              className="p-4 rounded-lg border border-success-100 bg-success-50/30"
                            >
                              <div className="flex items-start">
                                <div className="p-2 rounded-full mr-3 bg-success-100 text-success-500">
                                  <CheckSquare className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex justify-between mb-1">
                                    <h4 className="font-medium text-sm">{req.title}</h4>
                                    <span className="text-xs px-2 py-1 rounded-full bg-muted">
                                      {req.category}
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {req.description}
                                  </p>
                                </div>
                              </div>
                            </div>
                        ))}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Regulatory References</CardTitle>
                    <CardDescription>
                      Key regulations and guidelines for {selectedData.jurisdictionName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedData.regulatoryReferences && selectedData.regulatoryReferences.length > 0 ? (
                        selectedData.regulatoryReferences.map((ref) => (
                          <div key={ref.id} className="flex items-start p-3 border rounded-lg">
                            <div className="p-2 rounded-full mr-3 bg-primary/10">
                              <BookOpen className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-medium text-sm">{ref.title}</h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {ref.type === 'government' ? 'Official government source' : 'Regulatory resource'}
                              </p>
                              {ref.url && (
                                <div className="mt-2">
                                  <Button 
                                    variant="link" 
                                    size="sm" 
                                    className="h-auto p-0 text-primary"
                                    onClick={() => window.open(ref.url, '_blank')}
                                  >
                                    <FileText className="h-3 w-3 mr-1" />
                                    View Document
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        [1, 2, 3].map((i) => (
                          <div key={i} className="flex items-start p-3 border rounded-lg">
                            <div className="p-2 rounded-full mr-3 bg-primary/10">
                              <BookOpen className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-medium text-sm">
                                {selectedData.jurisdictionName} Financial Regulation Document {i}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                Official regulatory documentation for financial operations in {selectedData.jurisdictionName}
                              </p>
                              <div className="mt-2">
                                <Button variant="link" size="sm" className="h-auto p-0 text-primary">
                                  <FileText className="h-3 w-3 mr-1" />
                                  View Document
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ComplianceAnalysis;
