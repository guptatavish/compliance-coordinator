
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ComplianceCard, { ComplianceStatus, ComplianceLevel } from '../components/ComplianceCard';
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
import { AlertTriangle, BookOpen, CheckSquare, Clock, Download, FileText, InfoIcon, LineChart, RefreshCw } from 'lucide-react';

interface Requirement {
  id?: string;
  category: string;
  title: string;
  description: string;
  status: 'met' | 'partial' | 'not-met';
  risk: ComplianceLevel;
  recommendation?: string;
}

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
  
  // Check if there's a stored profile
  const hasCompanyProfile = !!localStorage.getItem('companyProfile');
  const companyProfileData = hasCompanyProfile 
    ? JSON.parse(localStorage.getItem('companyProfile')!) 
    : null;
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Redirect to company profile page if no profile is set up
  useEffect(() => {
    if (isAuthenticated && !hasCompanyProfile) {
      navigate('/company-profile');
    }
  }, [isAuthenticated, hasCompanyProfile, navigate]);

  const handleRunAnalysis = async () => {
    if (!hasPerplexityApiKey()) {
      toast({
        title: "API Key Required",
        description: "Please add your Perplexity API key in Settings before running analysis.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const apiKey = getPerplexityApiKey();
      
      // Save company profile to database
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
        .single();
      
      if (companyError) {
        console.error("Error saving company profile:", companyError);
        throw new Error("Failed to save company profile");
      }
      
      companyId = companyData.id;
      
      // Call the Supabase Edge Function to analyze regulations
      const { data, error } = await supabase.functions.invoke('analyze-regulations', {
        body: { 
          companyProfile: companyProfileData,
          apiKey
        }
      });
      
      if (error) {
        console.error("Edge function error:", error);
        throw new Error("Analysis failed: " + error.message);
      }
      
      const { analysisResults } = data;
      
      // Add flags to the results
      const enrichedResults = analysisResults.map((result: JurisdictionData) => {
        const matchingJurisdiction = jurisdictions.find(j => j.id === result.jurisdictionId);
        return {
          ...result,
          flag: matchingJurisdiction?.flag || '🏳️'
        };
      });
      
      // Save analysis results to database
      for (const result of enrichedResults) {
        // Save analysis
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
          .single();
        
        if (analysisError) {
          console.error("Error saving analysis:", analysisError);
          continue;
        }
        
        // Save requirements
        const analysisId = analysisData.id;
        const requirementsToInsert = result.requirementsList.map(req => ({
          analysis_id: analysisId,
          category: req.category,
          title: req.title,
          description: req.description,
          status: req.status,
          risk: req.risk,
          recommendation: req.recommendation
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
      
      setJurisdictionsData(enrichedResults);
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

  const selectedData = selectedJurisdiction
    ? jurisdictionsData.find(j => j.jurisdictionId === selectedJurisdiction)
    : null;

  // Chart data for selected jurisdiction
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
                  disabled={!hasPerplexityApiKey()}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Run Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
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
        
        {analysisComplete && (
          <div className="space-y-8">
            {/* Summary Alert */}
            <Alert className="border-warning-500/50 bg-warning-50/50">
              <AlertTriangle className="h-4 w-4 text-warning-500" />
              <AlertTitle className="text-warning-500">Compliance Gaps Detected</AlertTitle>
              <AlertDescription className="text-warning-600">
                We've identified several compliance gaps across your jurisdictions. Review the analysis below for details and recommendations.
              </AlertDescription>
            </Alert>
            
            {/* Jurisdictions Grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Jurisdictions</h2>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export Analysis
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
            
            {/* Selected Jurisdiction Details */}
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
                
                {/* Regulatory References */}
                <Card>
                  <CardHeader>
                    <CardTitle>Regulatory References</CardTitle>
                    <CardDescription>
                      Key regulations and guidelines for {selectedData.jurisdictionName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
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
                      ))}
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
