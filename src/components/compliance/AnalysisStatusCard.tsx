
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, LineChart, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AnalysisStatusCardProps {
  isAnalyzing: boolean;
  analysisComplete: boolean;
  onRunAnalysis: () => void;
  hasPerplexityApiKey: boolean;
}

const AnalysisStatusCard: React.FC<AnalysisStatusCardProps> = ({ 
  isAnalyzing, 
  analysisComplete, 
  onRunAnalysis,
  hasPerplexityApiKey
}) => {
  if (analysisComplete) {
    return (
      <Alert className="border-warning-500/50 bg-warning-50/50 mb-8">
        <AlertTriangle className="h-4 w-4 text-warning-500" />
        <AlertTitle className="text-warning-500">Compliance Gaps Detected</AlertTitle>
        <AlertDescription className="text-warning-600">
          We've identified several compliance gaps across your jurisdictions. Review the analysis below for details and recommendations.
        </AlertDescription>
      </Alert>
    );
  }

  if (isAnalyzing) {
    return (
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
    );
  }

  return (
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
            onClick={onRunAnalysis} 
            disabled={!hasPerplexityApiKey}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Run Analysis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalysisStatusCard;
