import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { jurisdictions } from '../components/JurisdictionSelect';
import StatusChart from '../components/StatusChart';
import ComplianceCard from '../components/ComplianceCard';
import { AlertTriangle, CheckCircle, FileText, Bell, Calendar, Download } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Extract user's name from metadata
  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';

  // Check if company profile exists
  const hasCompanyProfile = !!localStorage.getItem('companyProfile');
  
  // If not authenticated, redirect to login
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // If authenticated but no company profile, suggest creating one
  useEffect(() => {
    if (isAuthenticated && !hasCompanyProfile) {
      // Could show a toast here suggesting to create a profile
    }
  }, [isAuthenticated, hasCompanyProfile]);

  // Check if there's a stored profile
  const companyProfileData = hasCompanyProfile 
    ? JSON.parse(localStorage.getItem('companyProfile')!) 
    : null;

  // Sample compliance data (in a real app, this would come from an API)
  const complianceData = companyProfileData?.currentJurisdictions?.map((id: string) => {
    const jurisdiction = jurisdictions.find(j => j.id === id);
    
    // Generate random compliance data for demo
    const score = Math.floor(Math.random() * 70) + 30;
    let status: 'compliant' | 'partial' | 'non-compliant';
    let riskLevel: 'high' | 'medium' | 'low';
    
    if (score >= 80) {
      status = 'compliant';
      riskLevel = 'low';
    } else if (score >= 60) {
      status = 'partial';
      riskLevel = 'medium';
    } else {
      status = 'non-compliant';
      riskLevel = 'high';
    }
    
    const totalReqs = Math.floor(Math.random() * 30) + 20;
    const metReqs = Math.floor(totalReqs * (score / 100));
    
    return {
      jurisdictionId: id,
      jurisdictionName: jurisdiction?.name || id,
      flag: jurisdiction?.flag || '🏳️',
      complianceScore: score,
      status,
      riskLevel,
      requirements: {
        total: totalReqs,
        met: metReqs,
      },
      recentChanges: Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0,
    };
  }) || [];

  // Sample chart data
  const complianceByTypeData = [
    { name: 'KYC/AML', value: 45 },
    { name: 'Data Protection', value: 25 },
    { name: 'Reporting', value: 15 },
    { name: 'Licensing', value: 15 },
  ];

  const complianceProgressData = [
    { name: 'Jan', score: 30 },
    { name: 'Feb', score: 35 },
    { name: 'Mar', score: 40 },
    { name: 'Apr', score: 45 },
    { name: 'May', score: 50 },
    { name: 'Jun', score: 55 },
    { name: 'Jul', score: 62 },
    { name: 'Aug', score: 68 },
    { name: 'Sep', score: 75 },
  ];

  const complianceByRegionData = [
    { name: 'North America', compliant: 45, partial: 30, nonCompliant: 25 },
    { name: 'Europe', compliant: 60, partial: 30, nonCompliant: 10 },
    { name: 'Asia', compliant: 30, partial: 40, nonCompliant: 30 },
    { name: 'Other', compliant: 40, partial: 35, nonCompliant: 25 },
  ];

  const recentAlerts = [
    { 
      id: 1, 
      title: 'KYC Regulation Update', 
      description: 'New KYC regulations in Singapore effective Oct 15, 2023', 
      date: '3 days ago',
      severity: 'high',
    },
    { 
      id: 2, 
      title: 'Reporting Deadline', 
      description: 'Quarterly reporting deadline for US operations', 
      date: '1 week ago',
      severity: 'medium',
    },
    { 
      id: 3, 
      title: 'Policy Update Required', 
      description: 'Privacy policy update required for EU operations', 
      date: '2 weeks ago',
      severity: 'medium',
    },
  ];

  // Dashboard content based on profile status
  const renderDashboardContent = () => {
    if (!hasCompanyProfile) {
      return (
        <div className="flex flex-col items-center text-center max-w-md mx-auto py-16">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Complete Your Profile</h2>
          <p className="text-muted-foreground mb-8">
            To get started with ComplianceSync, create your company profile to receive tailored compliance insights.
          </p>
          <Button onClick={() => navigate('/company-profile')}>
            Create Company Profile
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 rounded-full bg-success-50">
                  <CheckCircle className="h-5 w-5 text-success-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Compliant Requirements</p>
                  <p className="text-2xl font-bold">
                    {complianceData.reduce((acc: number, curr: any) => acc + curr.requirements.met, 0)}
                    <span className="text-base font-normal text-muted-foreground">
                      /{complianceData.reduce((acc: number, curr: any) => acc + curr.requirements.total, 0)}
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 rounded-full bg-danger-50">
                  <AlertTriangle className="h-5 w-5 text-danger-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Non-Compliant Items</p>
                  <p className="text-2xl font-bold">
                    {complianceData.reduce((acc: number, curr: any) => {
                      return acc + (curr.requirements.total - curr.requirements.met);
                    }, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 rounded-full bg-warning-50">
                  <Bell className="h-5 w-5 text-warning-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Recent Alerts</p>
                  <p className="text-2xl font-bold">{recentAlerts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 rounded-full bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Upcoming Deadlines</p>
                  <p className="text-2xl font-bold">2</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StatusChart 
            title="Compliance Progress" 
            description="Overall compliance score trend over time"
            data={complianceProgressData}
            type="line"
            categories={['score']}
            colors={['#3B82F6']}
          />
          
          <StatusChart 
            title="Compliance by Type" 
            description="Breakdown of compliance requirements by category"
            data={complianceByTypeData}
            type="pie"
          />
        </div>
        
        {/* Compliance by Jurisdiction */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Compliance by Jurisdiction</h2>
            <Button variant="outline" size="sm" onClick={() => navigate('/compliance-analysis')}>
              View All
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {complianceData.slice(0, 3).map((jurisdiction: any) => (
              <ComplianceCard
                key={jurisdiction.jurisdictionId}
                {...jurisdiction}
                onClick={() => navigate('/compliance-analysis')}
              />
            ))}
          </div>
        </div>
        
        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Alerts</CardTitle>
                <CardDescription>Regulatory updates and compliance notifications</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAlerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className="flex items-start p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className={`p-2 rounded-full mr-4 bg-${alert.severity === 'high' ? 'danger' : 'warning'}-50`}>
                    <AlertTriangle 
                      className={`h-5 w-5 text-${alert.severity === 'high' ? 'danger' : 'warning'}-500`} 
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-medium">{alert.title}</h4>
                      <span className="text-xs text-muted-foreground">{alert.date}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Additional Charts */}
        <StatusChart 
          title="Compliance Status by Region" 
          description="Breakdown of compliance status across different regions"
          data={complianceByRegionData}
          type="bar"
          categories={['compliant', 'partial', 'nonCompliant']}
          colors={['#10B981', '#F59E0B', '#EF4444']}
        />
        
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="p-3 rounded-full bg-primary/10 mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium mb-2">Generate Report</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create comprehensive compliance reports for your jurisdictions
              </p>
              <Button variant="outline" size="sm" className="mt-auto" onClick={() => navigate('/reports')}>
                <Download className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="p-3 rounded-full bg-primary/10 mb-4">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium mb-2">Compliance Analysis</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Analyze and address compliance gaps in your operations
              </p>
              <Button variant="outline" size="sm" className="mt-auto" onClick={() => navigate('/compliance-analysis')}>
                Run Analysis
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="p-3 rounded-full bg-primary/10 mb-4">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium mb-2">Notification Settings</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Customize your alert preferences and notification thresholds
              </p>
              <Button variant="outline" size="sm" className="mt-auto">
                Manage Alerts
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <Layout showFooter={false}>
      <div className="container px-4 py-8 mt-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {userName}. Here's your compliance overview.
          </p>
        </div>
        
        {renderDashboardContent()}
      </div>
    </Layout>
  );
};

export default Dashboard;
