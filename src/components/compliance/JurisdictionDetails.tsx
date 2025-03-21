
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import StatusChart from '../StatusChart';
import { BookOpen, CheckSquare, Clock, Download, AlertTriangle } from 'lucide-react';

interface Requirement {
  id: string;
  title: string;
  description: string;
  isMet: boolean;
  status: string;
  category: string;
  risk: string;
  recommendation?: string;
}

interface JurisdictionDetailsProps {
  selectedData: {
    jurisdictionId: string;
    jurisdictionName: string;
    flag?: string;
    complianceScore: number;
    status: string;
    riskLevel: string;
    requirements: {
      total: number;
      met: number;
    };
    requirementsList: Requirement[];
  } | null;
  onExportRegulatoryDocument: (docType: 'full' | 'summary' | 'guidance') => void;
  getCategoryAnalysisData: () => any[];
  getRiskAnalysisData: () => any[];
}

const JurisdictionDetails: React.FC<JurisdictionDetailsProps> = ({
  selectedData,
  onExportRegulatoryDocument,
  getCategoryAnalysisData,
  getRiskAnalysisData,
}) => {
  if (!selectedData) return null;

  return (
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
      
      <RequirementsCard requirementsList={selectedData.requirementsList} />
      
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
                <div className="flex-1">
                  <h4 className="font-medium text-sm">
                    {selectedData.jurisdictionName} Financial Regulation Document {i}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Official regulatory documentation for financial operations in {selectedData.jurisdictionName}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="h-auto p-0 text-primary"
                      onClick={() => onExportRegulatoryDocument(i === 1 ? 'full' : i === 2 ? 'summary' : 'guidance')}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download Document
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Extract the requirements card as a separate component
const RequirementsCard: React.FC<{ requirementsList: Requirement[] }> = ({ requirementsList }) => {
  return (
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
            {requirementsList && requirementsList.map((req, index) => (
              <RequirementItem key={req.id || `req-${index}`} requirement={req} />
            ))}
          </TabsContent>
          
          <TabsContent value="issues" className="space-y-4">
            {requirementsList && requirementsList
              .filter(req => req.status !== 'met')
              .map((req, index) => (
                <RequirementItem key={req.id || `issue-${index}`} requirement={req} />
              ))}
          </TabsContent>
          
          <TabsContent value="met" className="space-y-4">
            {requirementsList && requirementsList
              .filter(req => req.status === 'met')
              .map((req, index) => (
                <RequirementItem key={req.id || `met-${index}`} requirement={req} />
              ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

// Extract the requirement item as a separate component
const RequirementItem: React.FC<{ requirement: Requirement }> = ({ requirement: req }) => {
  return (
    <div 
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
  );
};

export default JurisdictionDetails;
