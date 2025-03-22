import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import ComplianceCard from '../components/ComplianceCard';
import StatusChart from '../components/StatusChart';
import { useAuth } from '../contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComplianceResult, fetchSavedComplianceAnalyses } from '@/services/ComplianceService';
import { useToast } from '@/components/ui/use-toast';
import { FileText, LineChart, PlusCircle, User2, Wallet } from 'lucide-react';
import { jurisdictions } from '@/components/JurisdictionSelect';

const Dashboard: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [savedAnalyses, setSavedAnalyses] = useState<ComplianceResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        const profileData = localStorage.getItem('companyProfile');
        if (profileData) {
          setCompanyProfile(JSON.parse(profileData));
        }
        
        const analyses = await fetchSavedComplianceAnalyses();
        setSavedAnalyses(analyses);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, toast]);

  const calculateOverallCompliance = (): number => {
    if (savedAnalyses.length === 0) return 0;
    
    const totalScore = savedAnalyses.reduce((sum, analysis) => sum + analysis.complianceScore, 0);
    return Math.round(totalScore / savedAnalyses.length);
  };

  const getStatusCount = (status: 'compliant' | 'partial' | 'non-compliant'): number => {
    return savedAnalyses.filter(analysis => analysis.status === status).length;
  };

  const getStatusChartData = () => {
    return [
      { name: 'Compliant', value: getStatusCount('compliant') },
      { name: 'Partial', value: getStatusCount('partial') },
      { name: 'Non-Compliant', value: getStatusCount('non-compliant') },
    ];
  };

  const getExtremeJurisdictions = () => {
    if (savedAnalyses.length === 0) return { highest: null, lowest: null };
    
    const sorted = [...savedAnalyses].sort((a, b) => b.complianceScore - a.complianceScore);
    return {
      highest: sorted[0],
      lowest: sorted[sorted.length - 1]
    };
  };

  const calculateRequirementStats = () => {
    let total = 0;
    let met = 0;
    
    savedAnalyses.forEach(analysis => {
      total += analysis.requirements.total;
      met += analysis.requirements.met;
    });
    
    return { total, met, percentage: total > 0 ? Math.round((met / total) * 100) : 0 };
  };

  const { highest, lowest } = getExtremeJurisdictions();
  const requirementStats = calculateRequirementStats();
  const overallScore = calculateOverallCompliance();

  const formatJurisdictionName = (jurisdictionId: string): string => {
    const jurisdiction = jurisdictions.find(j => j.id === jurisdictionId);
    return jurisdiction ? jurisdiction.name : jurisdictionId;
  };

  return (
    <Layout>
      <div className="container px-4 py-8 mt-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor compliance status and key metrics across all jurisdictions.
          </p>
        </div>

        {!companyProfile ? (
          <Alert className="mb-8">
            <User2 className="h-4 w-4" />
            <AlertTitle>Company Profile Not Found</AlertTitle>
            <AlertDescription>
              Please create a company profile to get started with compliance analysis.
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-4"
                onClick={() => navigate('/company-profile')}
              >
                Create Profile
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Overall Compliance</CardTitle>
                  <CardDescription>Average compliance score across jurisdictions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center h-[140px]">
                    {isLoading ? (
                      <div className="animate-pulse w-32 h-32 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-muted-foreground">Loading...</span>
                      </div>
                    ) : savedAnalyses.length > 0 ? (
                      <div className="relative w-32 h-32">
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="10"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke={
                              overallScore > 80 ? "#10B981" :
                              overallScore > 50 ? "#F59E0B" : "#EF4444"
                            }
                            strokeWidth="10"
                            strokeDasharray={`${overallScore * 2.83} 283`}
                            strokeLinecap="round"
                            transform="rotate(-90 50 50)"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-3xl font-bold">{overallScore}%</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-muted-foreground">No data available</div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2" 
                          onClick={() => navigate('/compliance-analysis')}
                        >
                          Run Analysis
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Requirements Status</CardTitle>
                  <CardDescription>Progress on meeting regulatory requirements</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4 animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-6 bg-muted rounded"></div>
                      <div className="h-4 bg-muted rounded w-1/2"></div>
                    </div>
                  ) : savedAnalyses.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span>Requirements Met</span>
                        <span className="font-medium">{requirementStats.met} / {requirementStats.total}</span>
                      </div>
                      <Progress value={requirementStats.percentage} className="h-3" />
                      <div className="text-sm text-muted-foreground">
                        {requirementStats.percentage}% of requirements met across all jurisdictions
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-muted-foreground">No requirements data</div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2" 
                        onClick={() => navigate('/compliance-analysis')}
                      >
                        Run Analysis
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Jurisdiction Status</CardTitle>
                  <CardDescription>Compliance status by jurisdiction</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4 animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-1/2"></div>
                      <div className="h-4 bg-muted rounded w-2/3"></div>
                    </div>
                  ) : savedAnalyses.length > 0 ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span>Compliant</span>
                        <span className="font-medium">{getStatusCount('compliant')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Partial Compliance</span>
                        <span className="font-medium">{getStatusCount('partial')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Non-Compliant</span>
                        <span className="font-medium">{getStatusCount('non-compliant')}</span>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <span className="text-muted-foreground">Total Jurisdictions: {savedAnalyses.length}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-muted-foreground">No jurisdictions analyzed</div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2" 
                        onClick={() => navigate('/compliance-analysis')}
                      >
                        Run Analysis
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {savedAnalyses.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Compliance Overview</CardTitle>
                      <CardDescription>Status breakdown across jurisdictions</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <StatusChart 
                          title="Compliance Status Distribution"
                          type="pie"
                          data={getStatusChartData()}
                          colors={['#10B981', '#F59E0B', '#EF4444']}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Key Insights</CardTitle>
                      <CardDescription>Important compliance highlights</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {highest && (
                        <div className="p-4 bg-success-50 border border-success-200 rounded-lg">
                          <div className="font-medium text-success-700">Highest Compliance</div>
                          <div className="text-success-800">
                            {formatJurisdictionName(highest.jurisdictionId)}: {highest.complianceScore}%
                          </div>
                        </div>
                      )}
                      
                      {lowest && (
                        <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg">
                          <div className="font-medium text-danger-700">Needs Attention</div>
                          <div className="text-danger-800">
                            {formatJurisdictionName(lowest.jurisdictionId)}: {lowest.complianceScore}%
                          </div>
                        </div>
                      )}
                      
                      <div className="p-4 bg-muted border rounded-lg">
                        <div className="font-medium">Requirements Overview</div>
                        <div className="mt-1">
                          {requirementStats.met} of {requirementStats.total} requirements met ({requirementStats.percentage}%)
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => navigate('/compliance-analysis')}
                      >
                        <LineChart className="h-4 w-4 mr-2" />
                        View Detailed Analysis
                      </Button>
                    </CardFooter>
                  </Card>
                </div>

                <div>
                  <h2 className="text-xl font-semibold mb-4">Recent Analyses</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {savedAnalyses.slice(0, 3).map((analysis) => (
                      <ComplianceCard 
                        key={analysis.jurisdictionId} 
                        {...analysis}
                        onClick={() => navigate('/compliance-analysis')}
                      />
                    ))}
                    
                    {savedAnalyses.length > 3 && (
                      <Card className="flex items-center justify-center p-6">
                        <Button 
                          variant="outline" 
                          onClick={() => navigate('/compliance-analysis')}
                        >
                          View All Analyses
                        </Button>
                      </Card>
                    )}
                  </div>
                </div>
              </>
            )}

            {!isLoading && savedAnalyses.length === 0 && companyProfile && (
              <Card className="p-8 flex flex-col items-center text-center">
                <div className="mb-4 p-4 bg-primary/10 rounded-full">
                  <LineChart className="h-12 w-12 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">No Analyses Available</h2>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Run your first compliance analysis to see detailed compliance status across all jurisdictions.
                </p>
                <Button onClick={() => navigate('/compliance-analysis')}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Run Compliance Analysis
                </Button>
              </Card>
            )}

            {companyProfile && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Company Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <div className="text-sm text-muted-foreground">Company Name</div>
                      <div className="font-medium">{companyProfile.companyName}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Industry</div>
                      <div className="font-medium">{companyProfile.industry}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Size</div>
                      <div className="font-medium">{companyProfile.companySize}</div>
                    </div>
                    {companyProfile.currentJurisdictions && (
                      <div>
                        <div className="text-sm text-muted-foreground">Operating Jurisdictions</div>
                        <div className="font-medium">{companyProfile.currentJurisdictions.map(formatJurisdictionName).join(', ')}</div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => navigate('/company-profile')}
                    >
                      <User2 className="h-4 w-4 mr-2" />
                      View Full Profile
                    </Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                      onClick={() => navigate('/compliance-analysis')}
                    >
                      <LineChart className="h-4 w-4 mr-2" />
                      Run Compliance Analysis
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                      onClick={() => navigate('/reports')}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Reports
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                      onClick={() => navigate('/settings')}
                    >
                      <Wallet className="h-4 w-4 mr-2" />
                      Manage API Keys
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="space-y-4 animate-pulse">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                        <div className="h-4 bg-muted rounded w-2/3"></div>
                      </div>
                    ) : savedAnalyses.length > 0 ? (
                      <div className="space-y-4">
                        {savedAnalyses.slice(0, 3).map((analysis, index) => (
                          <div key={index} className="flex items-start space-x-3 text-sm">
                            <div className={`w-2 h-2 mt-1.5 rounded-full ${
                              analysis.status === 'compliant' ? 'bg-success-500' :
                              analysis.status === 'partial' ? 'bg-warning-500' : 'bg-danger-500'
                            }`}></div>
                            <div>
                              <div className="font-medium">
                                {formatJurisdictionName(analysis.jurisdictionId)} Analysis
                              </div>
                              <div className="text-muted-foreground">
                                Score: {analysis.complianceScore}% - {analysis.status}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        No recent activity
                      </div>
                    )}
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

export default Dashboard;
