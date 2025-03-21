
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface AnalysisHeaderProps {
  isAnalyzing: boolean;
  onRunAnalysis: () => void;
  hasPerplexityApiKey: boolean;
  pythonBackendAvailable: boolean | null;
}

const AnalysisHeader: React.FC<AnalysisHeaderProps> = ({
  isAnalyzing,
  onRunAnalysis,
  hasPerplexityApiKey,
  pythonBackendAvailable,
}) => {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold tracking-tight">Compliance Analysis</h1>
      <p className="text-muted-foreground">
        Analyze regulatory requirements and compliance status across jurisdictions.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button 
          onClick={onRunAnalysis} 
          disabled={!hasPerplexityApiKey || pythonBackendAvailable === false || isAnalyzing}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
        </Button>
      </div>
    </div>
  );
};

export default AnalysisHeader;
