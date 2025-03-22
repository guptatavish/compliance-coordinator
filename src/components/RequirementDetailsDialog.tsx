
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Clock, BookOpen, CheckSquare, FileText, Link2, ExternalLink } from 'lucide-react';
import { Requirement, getRequirementDetails } from '../services/ComplianceService';
import { toast } from '@/components/ui/use-toast';

interface RequirementDetailsDialogProps {
  requirementId: string;
  jurisdictionId: string;
  initialRequirement: Requirement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RequirementDetailsDialog: React.FC<RequirementDetailsDialogProps> = ({
  requirementId,
  jurisdictionId,
  initialRequirement,
  open,
  onOpenChange,
}) => {
  const [requirement, setRequirement] = useState<Requirement>(initialRequirement);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      setLoading(true);
      getRequirementDetails(requirementId, jurisdictionId)
        .then((data) => {
          setRequirement({ ...initialRequirement, ...data });
        })
        .catch((error) => {
          console.error('Error fetching requirement details:', error);
          toast({
            title: "Error",
            description: "Failed to fetch detailed requirement information.",
            variant: "destructive",
          });
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, requirementId, jurisdictionId, initialRequirement]);

  const getStatusIcon = () => {
    switch (requirement.status) {
      case 'met':
        return <CheckSquare className="h-5 w-5 text-success-500" />;
      case 'partial':
        return <Clock className="h-5 w-5 text-warning-500" />;
      case 'not-met':
        return <AlertTriangle className="h-5 w-5 text-danger-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (requirement.status) {
      case 'met':
        return 'Compliance Requirement Met';
      case 'partial':
        return 'Partially Compliant';
      case 'not-met':
        return 'Compliance Issue';
      default:
        return '';
    }
  };

  const getStatusClass = () => {
    switch (requirement.status) {
      case 'met':
        return 'text-success-500';
      case 'partial':
        return 'text-warning-500';
      case 'not-met':
        return 'text-danger-500';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="w-3/4 h-8" />
            <Skeleton className="w-full h-24" />
            <Skeleton className="w-full h-32" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                {getStatusIcon()}
                <span className={`text-sm font-medium ${getStatusClass()}`}>
                  {getStatusText()}
                </span>
                <span className="ml-auto text-xs px-2 py-1 rounded-full bg-muted">
                  {requirement.category}
                </span>
              </div>
              <DialogTitle className="text-xl">{requirement.title}</DialogTitle>
              <DialogDescription>
                {requirement.description}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="explanation">
              <TabsList className="mb-4">
                <TabsTrigger value="explanation">Detailed Explanation</TabsTrigger>
                <TabsTrigger value="solution">Recommended Solution</TabsTrigger>
                <TabsTrigger value="references">Regulatory References</TabsTrigger>
              </TabsList>
              
              <TabsContent value="explanation" className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Detailed Explanation</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {requirement.detailedExplanation || 
                      "This requirement is important for maintaining regulatory compliance within your jurisdiction. " +
                      "It involves ensuring that your business processes adhere to established standards and practices " +
                      "that protect consumers, maintain market integrity, and reduce operational risks.\n\n" +
                      "Failure to meet this requirement may result in regulatory penalties, reputational damage, " +
                      "or increased scrutiny from authorities."}
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Risk Level: {requirement.risk.charAt(0).toUpperCase() + requirement.risk.slice(1)}</h4>
                  <p className="text-sm text-muted-foreground">
                    {requirement.risk === 'high' 
                      ? "High-risk requirements demand immediate attention and action. Non-compliance could result in significant penalties, legal consequences, or business disruption."
                      : requirement.risk === 'medium'
                      ? "Medium-risk requirements should be addressed as part of your compliance strategy. While not immediately critical, they are important for maintaining good standing with regulators."
                      : "Low-risk requirements are generally administrative in nature but still contribute to overall compliance health and should be incorporated into your compliance processes."}
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="solution" className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Recommended Actions</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {requirement.solution || requirement.recommendation || 
                      "To address this compliance requirement, we recommend:\n\n" +
                      "1. Review your current policies and procedures related to this requirement\n" +
                      "2. Identify any gaps between current practices and regulatory expectations\n" +
                      "3. Develop an implementation plan to bridge these gaps\n" +
                      "4. Allocate appropriate resources to implement the necessary changes\n" +
                      "5. Establish monitoring mechanisms to ensure ongoing compliance\n\n" +
                      "Consider consulting with a regulatory specialist for personalized guidance."}
                  </p>
                </div>
                
                {requirement.status !== 'met' && (
                  <div className={`p-4 rounded-lg ${
                    requirement.risk === 'high' 
                      ? 'bg-danger-50/30 border-danger-100' 
                      : requirement.risk === 'medium'
                      ? 'bg-warning-50/30 border-warning-100'
                      : 'bg-muted/30 border'
                  }`}>
                    <h4 className="font-medium mb-2">Implementation Timeframe</h4>
                    <p className="text-sm text-muted-foreground">
                      {requirement.risk === 'high' 
                        ? "Immediate action required (0-30 days)"
                        : requirement.risk === 'medium'
                        ? "Implement within the next quarter (30-90 days)"
                        : "Implement within the next six months (90-180 days)"}
                    </p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="references" className="space-y-4">
                {requirement.regulatoryReferences && requirement.regulatoryReferences.length > 0 ? (
                  requirement.regulatoryReferences.map((reference, index) => (
                    <div key={index} className="p-4 border rounded-lg flex items-start">
                      <div className="p-2 rounded-full mr-3 bg-primary/10">
                        <BookOpen className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{reference.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{reference.description}</p>
                        <div className="mt-2 flex items-center">
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="h-auto p-0 text-primary"
                            onClick={() => window.open(reference.url, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View Official Document
                          </Button>
                          {reference.issuer && (
                            <span className="text-xs text-muted-foreground ml-4">
                              Issued by: {reference.issuer}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium">Related Regulations</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      This requirement is derived from multiple regulatory sources within {jurisdictionId.toUpperCase()}. 
                      Detailed regulatory references are being compiled and will be available soon.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RequirementDetailsDialog;
