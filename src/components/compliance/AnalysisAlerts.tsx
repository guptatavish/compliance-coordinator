
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { InfoIcon, AlertTriangle } from 'lucide-react';

interface AnalysisAlertsProps {
  hasApiKey: boolean;
  pythonBackendAvailable: boolean | null;
}

const AnalysisAlerts: React.FC<AnalysisAlertsProps> = ({ 
  hasApiKey, 
  pythonBackendAvailable 
}) => {
  const navigate = useNavigate();
  
  return (
    <>
      {!hasApiKey && (
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
    </>
  );
};

export default AnalysisAlerts;
