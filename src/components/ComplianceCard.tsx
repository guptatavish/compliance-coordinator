
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, CheckCircle, AlertTriangle, AlertCircle, AlertOctagon } from 'lucide-react';

export type ComplianceLevel = 'high' | 'medium' | 'low';
export type ComplianceStatus = 'compliant' | 'partial' | 'non-compliant';

interface ComplianceCardProps {
  jurisdictionId: string;
  jurisdictionName?: string; // Made optional since it might not be provided
  flag?: string; 
  complianceScore: number;
  status: ComplianceStatus;
  riskLevel: ComplianceLevel;
  requirements: {
    total: number;
    met: number;
  };
  recentChanges?: number;
  error?: string;
  onClick?: () => void;
}

const ComplianceCard: React.FC<ComplianceCardProps> = ({
  jurisdictionId,
  jurisdictionName = 'Unknown Jurisdiction', // Default value to prevent undefined
  flag,
  complianceScore,
  status,
  riskLevel,
  requirements,
  recentChanges,
  error,
  onClick,
}) => {
  const getStatusColor = (status: ComplianceStatus): string => {
    switch (status) {
      case 'compliant':
        return 'success';
      case 'partial':
        return 'warning';
      case 'non-compliant':
        return 'danger';
      default:
        return 'muted';
    }
  };

  const getStatusIcon = (status: ComplianceStatus) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="h-4 w-4" />;
      case 'partial':
        return <AlertTriangle className="h-4 w-4" />;
      case 'non-compliant':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getRiskBadge = (level: ComplianceLevel) => {
    switch (level) {
      case 'high':
        return (
          <Badge variant="outline" className="bg-danger-50 text-danger-600 border-danger-100">
            High Risk
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="outline" className="bg-warning-50 text-warning-600 border-warning-100">
            Medium Risk
          </Badge>
        );
      case 'low':
        return (
          <Badge variant="outline" className="bg-success-50 text-success-600 border-success-100">
            Low Risk
          </Badge>
        );
      default:
        return null;
    }
  };

  const statusColor = getStatusColor(status);
  
  // Helper to get the correct indicator class based on status
  const getIndicatorClass = (status: ComplianceStatus) => {
    switch (status) {
      case 'compliant':
        return 'bg-success-500';
      case 'partial':
        return 'bg-warning-500';
      case 'non-compliant':
        return 'bg-danger-500';
      default:
        return 'bg-primary';
    }
  };

  // If there's an error, display error state
  if (error) {
    return (
      <Card 
        className="overflow-hidden transition-all hover:border-primary/50 hover:shadow-md cursor-pointer bg-muted/30"
        onClick={onClick}
      >
        <div className="h-1.5 bg-danger-500 w-full" />
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-2">
              {flag && <span className="text-2xl">{flag}</span>}
              <CardTitle className="text-lg">{jurisdictionName}</CardTitle>
            </div>
          </div>
          <CardDescription>Compliance status unavailable</CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="flex items-center justify-center py-6 text-center">
            <div className="space-y-2">
              <AlertOctagon className="h-10 w-10 text-danger-500 mx-auto" />
              <p className="text-sm text-muted-foreground">
                {error || "Unable to analyze compliance. Try again later."}
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="ghost" size="sm" className="w-full justify-between">
            <span>Retry</span>
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card 
      className="overflow-hidden transition-all hover:border-primary/50 hover:shadow-md cursor-pointer"
      onClick={onClick}
    >
      <div className={`h-1.5 ${getIndicatorClass(status)} w-full`} />
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2">
            {flag && <span className="text-2xl">{flag}</span>}
            <CardTitle className="text-lg">{jurisdictionName}</CardTitle>
          </div>
          {recentChanges && recentChanges > 0 && (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              {recentChanges} recent {recentChanges === 1 ? 'change' : 'changes'}
            </Badge>
          )}
        </div>
        <CardDescription>Compliance status and requirements</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Compliance Score</span>
              <span className={`text-sm font-semibold`}>
                {complianceScore}%
              </span>
            </div>
            <Progress 
              value={complianceScore} 
              className="h-2 bg-muted" 
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium`}>
                {getStatusIcon(status)}
                <span className="ml-1 capitalize">
                  {status && status.replace('-', ' ')}
                </span>
              </span>
            </div>
            {getRiskBadge(riskLevel)}
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span>Requirements Met:</span>
            <span className="font-medium">
              {requirements?.met || 0} / {requirements?.total || 0}
            </span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button variant="ghost" size="sm" className="w-full justify-between">
          <span>View details</span>
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ComplianceCard;
