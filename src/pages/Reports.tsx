import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  FileText, 
  Filter,
  ChevronDown,
  CheckCircle,
  Clock,
  Calendar,
  ChevronRight,
  FileBarChart,
  FileSpreadsheet,
  ExternalLink,
  Eye,
  Loader2 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { jurisdictions } from '../components/JurisdictionSelect';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { exportComplianceReport, checkPythonBackendHealth, ComplianceResult } from '../services/ComplianceService';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  jurisdictions: string[];
  type: 'compliance' | 'gap' | 'risk';
  format: 'pdf' | 'excel' | 'csv';
}

interface GeneratedReport {
  id: string;
  name: string;
  date: string;
  jurisdictions: string[];
  format: 'pdf' | 'excel' | 'csv';
  status: 'ready' | 'processing';
  template: string;
  data?: ComplianceResult;
}

const Reports: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'templates' | 'history'>('templates');
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [pythonBackendAvailable, setPythonBackendAvailable] = useState<boolean | null>(null);
  const [selectedReport, setSelectedReport] = useState<GeneratedReport | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  
  const hasCompanyProfile = !!localStorage.getItem('companyProfile');
  const companyProfileData = hasCompanyProfile 
    ? JSON.parse(localStorage.getItem('companyProfile')!) 
    : null;
  
  const storedAnalysisResults = localStorage.getItem('complianceAnalysisResults');
  const analysisResults = storedAnalysisResults 
    ? JSON.parse(storedAnalysisResults) as ComplianceResult[]
    : [];
  
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

  const reportTemplates: ReportTemplate[] = [
    {
      id: 'template-1',
      name: 'Comprehensive Compliance Report',
      description: 'Complete compliance status across all jurisdictions with detailed breakdowns',
      jurisdictions: companyProfileData?.currentJurisdictions || [],
      type: 'compliance',
      format: 'pdf',
    },
    {
      id: 'template-2',
      name: 'Compliance Gap Analysis',
      description: 'Analysis of gaps between current compliance status and regulatory requirements',
      jurisdictions: companyProfileData?.currentJurisdictions || [],
      type: 'gap',
      format: 'excel',
    },
    {
      id: 'template-3',
      name: 'Risk Assessment Report',
      description: 'Breakdown of compliance risks by severity and potential impact',
      jurisdictions: companyProfileData?.currentJurisdictions || [],
      type: 'risk',
      format: 'pdf',
    },
    {
      id: 'template-4',
      name: 'Quarterly Compliance Summary',
      description: 'Executive summary of compliance status for quarterly review',
      jurisdictions: companyProfileData?.currentJurisdictions || [],
      type: 'compliance',
      format: 'pdf',
    },
    {
      id: 'template-5',
      name: 'Regulatory Change Impact Assessment',
      description: 'Analysis of how recent regulatory changes impact compliance status',
      jurisdictions: companyProfileData?.currentJurisdictions || [],
      type: 'compliance',
      format: 'excel',
    },
  ];

  const [reportsHistory, setReportsHistory] = useState<GeneratedReport[]>(() => {
    const initialReports: GeneratedReport[] = analysisResults.map((result, index) => ({
      id: `report-analysis-${index}`,
      name: `${result.jurisdictionName} Compliance Report`,
      date: new Date().toISOString().split('T')[0],
      jurisdictions: [result.jurisdictionId],
      format: 'pdf',
      status: 'ready',
      template: 'Comprehensive Compliance Report',
      data: result
    }));
    
    if (initialReports.length === 0) {
      initialReports.push(
        {
          id: 'report-1',
          name: 'Q3 Compliance Report',
          date: '2023-09-15',
          jurisdictions: companyProfileData?.currentJurisdictions?.slice(0, 2) || [],
          format: 'pdf',
          status: 'ready',
          template: 'Comprehensive Compliance Report',
        },
        {
          id: 'report-2',
          name: 'Compliance Gap Analysis - August',
          date: '2023-08-22',
          jurisdictions: companyProfileData?.currentJurisdictions?.slice(0, 3) || [],
          format: 'excel',
          status: 'ready',
          template: 'Compliance Gap Analysis',
        }
      );
    }
    
    return initialReports;
  });

  const handleGenerateReport = (templateId: string) => {
    if (!pythonBackendAvailable) {
      toast({
        title: "Python Backend Not Available",
        description: "The Python backend is not running. Please start the Python backend and try again.",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(templateId);
    
    setTimeout(() => {
      const template = reportTemplates.find(t => t.id === templateId);
      
      if (template) {
        const matchingAnalysis = analysisResults.length > 0 ? 
          analysisResults[Math.floor(Math.random() * analysisResults.length)] : null;
        
        const newReport: GeneratedReport = {
          id: `report-${Date.now()}`,
          name: template.name,
          date: new Date().toISOString().split('T')[0],
          jurisdictions: template.jurisdictions,
          format: template.format,
          status: 'ready',
          template: template.name,
          data: matchingAnalysis || undefined
        };
        
        setReportsHistory([newReport, ...reportsHistory]);
        setActiveTab('history');
        
        toast({
          title: "Report Generated",
          description: "Your report has been generated successfully.",
        });
      }
      
      setIsGenerating(null);
    }, 2000);
  };

  const handleExportReport = async (report: GeneratedReport) => {
    if (!pythonBackendAvailable) {
      toast({
        title: "Python Backend Not Available",
        description: "The Python backend is not running. Please start the Python backend and try again.",
        variant: "destructive",
      });
      return;
    }
    
    if (!report.data) {
      toast({
        title: "No Data Available",
        description: "This report does not have associated compliance data.",
        variant: "destructive",
      });
      return;
    }
    
    setIsExporting(true);
    
    try {
      const blob = await exportComplianceReport(report.format, report.data);
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.name.replace(/\s+/g, '_')}_${report.date}.${report.format}`;
      document.body.appendChild(a);
      a.click();
      
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Report Downloaded",
        description: `Your ${report.format.toUpperCase()} report has been downloaded.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export report",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleViewReport = (report: GeneratedReport) => {
    setSelectedReport(report);
    setIsViewerOpen(true);
  };

  const getFormatIcon = (format: 'pdf' | 'excel' | 'csv') => {
    switch (format) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-danger-500" />;
      case 'excel':
        return <FileSpreadsheet className="h-4 w-4 text-success-500" />;
      case 'csv':
        return <FileBarChart className="h-4 w-4 text-warning-500" />;
    }
  };

  const getJurisdictionNames = (ids: string[]) => {
    return ids.map(id => {
      const jurisdiction = jurisdictions.find(j => j.id === id);
      return jurisdiction ? `${jurisdiction.flag} ${jurisdiction.name}` : id;
    }).join(', ');
  };

  return (
    <Layout showFooter={false}>
      <div className="container px-4 py-8 mt-16">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground">
              Generate and manage compliance reports for your jurisdictions.
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex">
              <Button
                variant={activeTab === 'templates' ? 'default' : 'outline'}
                className="rounded-r-none"
                onClick={() => setActiveTab('templates')}
              >
                Templates
              </Button>
              <Button
                variant={activeTab === 'history' ? 'default' : 'outline'}
                className="rounded-l-none"
                onClick={() => setActiveTab('history')}
              >
                History
              </Button>
            </div>
          </div>
        </div>
        
        {!pythonBackendAvailable && (
          <Card className="mb-6 border-warning-500/50 bg-warning-50/50">
            <CardContent className="pt-6">
              <div className="flex gap-4 items-start">
                <div className="p-2 rounded-full bg-warning-100 text-warning-500">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-1 text-warning-700">Python Backend Not Available</h3>
                  <p className="text-warning-600">
                    The Python backend is not running. Report generation and export functionality will be limited.
                    Please start the Python backend to enable full functionality.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {activeTab === 'templates' ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative sm:max-w-xs w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search templates..."
                  className="pl-8"
                />
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Filter By</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>All Templates</DropdownMenuItem>
                  <DropdownMenuItem>Compliance Reports</DropdownMenuItem>
                  <DropdownMenuItem>Gap Analysis</DropdownMenuItem>
                  <DropdownMenuItem>Risk Assessment</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reportTemplates.map((template) => (
                <Card key={template.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-1">Format</p>
                        <div className="flex items-center">
                          {getFormatIcon(template.format)}
                          <span className="ml-2 text-sm capitalize">{template.format}</span>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium mb-1">Includes</p>
                        <p className="text-sm text-muted-foreground">
                          {template.jurisdictions.length} {template.jurisdictions.length === 1 ? 'jurisdiction' : 'jurisdictions'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      onClick={() => handleGenerateReport(template.id)}
                      disabled={!!isGenerating}
                    >
                      {isGenerating === template.id ? (
                        <>
                          <Clock className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Generate Report
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative sm:max-w-xs w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search reports..."
                  className="pl-8"
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Select defaultValue="all">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Report Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="gap">Gap Analysis</SelectItem>
                    <SelectItem value="risk">Risk Assessment</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select defaultValue="all">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Formats</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Generated Reports</CardTitle>
                <CardDescription>
                  History of all reports generated for your company
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report Name</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Jurisdictions</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportsHistory.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.name}</TableCell>
                        <TableCell>{report.date}</TableCell>
                        <TableCell>
                          {report.jurisdictions.length} jurisdictions
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {getFormatIcon(report.format)}
                            <span className="ml-2 capitalize">{report.format}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {report.status === 'ready' ? (
                            <span className="inline-flex items-center rounded-full bg-success-50 px-2 py-1 text-xs font-medium text-success-600">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs font-medium">
                              <Clock className="mr-1 h-3 w-3" />
                              Processing
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewReport(report)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleExportReport(report)}
                              disabled={isExporting || !report.data}
                            >
                              {isExporting ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4 mr-1" />
                              )}
                              Download
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Scheduled Reports</CardTitle>
                <CardDescription>
                  Automatically generated reports on a recurring schedule
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Calendar className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No Scheduled Reports</h3>
                  <p className="text-muted-foreground max-w-md mb-6">
                    Set up recurring reports to automatically generate and notify team members on a regular schedule.
                  </p>
                  <Button>
                    Schedule a Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedReport?.name}</DialogTitle>
            <DialogDescription>
              Generated on {selectedReport?.date} • {selectedReport?.format.toUpperCase()} Report
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport?.data ? (
            <div className="space-y-6 py-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{selectedReport.data.flag}</div>
                  <div>
                    <h3 className="font-semibold">{selectedReport.data.jurisdictionName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedReport.data.requirements.met} of {selectedReport.data.requirements.total} requirements met
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="text-center px-4 py-2 bg-muted rounded-md">
                    <div className="text-2xl font-bold">{selectedReport.data.complianceScore}%</div>
                    <div className="text-xs text-muted-foreground">Compliance Score</div>
                  </div>
                  
                  <div className={`text-center px-4 py-2 rounded-md ${
                    selectedReport.data.riskLevel === 'low' 
                      ? 'bg-success-50 text-success-700' 
                      : selectedReport.data.riskLevel === 'medium' 
                      ? 'bg-warning-50 text-warning-700'
                      : 'bg-danger-50 text-danger-700'
                  }`}>
                    <div className="text-2xl font-bold capitalize">{selectedReport.data.riskLevel}</div>
                    <div className="text-xs">Risk Level</div>
                  </div>
                </div>
              </div>
              
              {selectedReport.data.requirementsList.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Requirements</h3>
                  {selectedReport.data.requirementsList.map((req) => (
                    <div 
                      key={req.id} 
                      className={`p-4 rounded-lg border ${
                        req.status === 'met'
                          ? 'border-success-100 bg-success-50/30'
                          : req.status === 'partial'
                          ? 'border-warning-100 bg-warning-50/30'
                          : 'border-danger-100 bg-danger-50/30'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start gap-3">
                        <div className={`p-2 rounded-full ${
                          req.status === 'met'
                            ? 'bg-success-100 text-success-500'
                            : req.status === 'partial'
                            ? 'bg-warning-100 text-warning-500'
                            : 'bg-danger-100 text-danger-500'
                        }`}>
                          {req.status === 'met' ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : req.status === 'partial' ? (
                            <Clock className="h-4 w-4" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                            <h4 className="font-medium">{req.title}</h4>
                            <span className="text-xs px-2 py-1 rounded-full bg-muted whitespace-nowrap">
                              {req.category}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {req.description}
                          </p>
                          {req.recommendation && (
                            <div className="mt-2 p-2 bg-muted/30 rounded text-sm">
                              <span className="font-medium">Recommendation: </span>
                              {req.recommendation}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">No detailed requirements information available.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-medium mb-2">No Report Data Available</h3>
              <p className="text-muted-foreground mb-4">
                This report does not have associated compliance data.
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsViewerOpen(false)}
            >
              Close
            </Button>
            {selectedReport?.data && (
              <Button 
                onClick={() => {
                  setIsViewerOpen(false);
                  if (selectedReport) handleExportReport(selectedReport);
                }}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

function Search(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export default Reports;
