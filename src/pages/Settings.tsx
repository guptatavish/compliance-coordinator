
import React, { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageTransition from '@/components/PageTransition';
import { ShieldCheck, Server, Brain } from 'lucide-react';
import { 
  getPerplexityApiKey, 
  savePerplexityApiKey, 
  getMistralApiKey,
  saveMistralApiKey,
  PYTHON_API_URL 
} from "@/utils/apiKeys";

const Settings = () => {
  const [perplexityApiKey, setPerplexityApiKey] = useState("");
  const [mistralApiKey, setMistralApiKey] = useState("");
  const [isSavingPerplexity, setIsSavingPerplexity] = useState(false);
  const [isSavingMistral, setIsSavingMistral] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [backendStatus, setBackendStatus] = useState<"connected" | "disconnected" | "checking">("checking");
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    // Try to load the API keys from localStorage if available
    const savedPerplexityApiKey = getPerplexityApiKey();
    if (savedPerplexityApiKey) {
      setPerplexityApiKey(savedPerplexityApiKey);
    }
    
    const savedMistralApiKey = getMistralApiKey();
    if (savedMistralApiKey) {
      setMistralApiKey(savedMistralApiKey);
    }
    
    // Check backend connection
    checkBackendConnection();
  }, []);
  
  const checkBackendConnection = async () => {
    setBackendStatus("checking");
    try {
      const response = await fetch(`${PYTHON_API_URL}/health`, { 
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Small timeout to prevent long waits
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        setBackendStatus("connected");
      } else {
        setBackendStatus("disconnected");
      }
    } catch (error) {
      console.error("Error connecting to backend:", error);
      setBackendStatus("disconnected");
    }
  };

  const handleSavePerplexityApiKey = () => {
    setIsSavingPerplexity(true);
    try {
      // Store the API key in localStorage
      savePerplexityApiKey(perplexityApiKey);
      
      toast({
        title: "Perplexity API Key Saved",
        description: "Your Perplexity API key has been saved successfully.",
      });
    } catch (error) {
      console.error("Error saving Perplexity API key:", error);
      toast({
        title: "Error",
        description: "Failed to save your Perplexity API key. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPerplexity(false);
    }
  };

  const handleSaveMistralApiKey = () => {
    setIsSavingMistral(true);
    try {
      // Store the API key in localStorage
      saveMistralApiKey(mistralApiKey);
      
      toast({
        title: "Mistral API Key Saved",
        description: "Your Mistral API key has been saved successfully.",
      });
    } catch (error) {
      console.error("Error saving Mistral API key:", error);
      toast({
        title: "Error",
        description: "Failed to save your Mistral API key. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingMistral(false);
    }
  };

  return (
    <PageTransition>
      <div className="container px-4 py-6 md:py-10 max-w-5xl mx-auto mt-16">
        <div className="flex items-center gap-2 mb-8">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        </div>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Configure API keys used by ComplianceSync to provide regulatory insights.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="perplexity-api-key">Perplexity API Key</Label>
              <Input 
                id="perplexity-api-key"
                type="password"
                value={perplexityApiKey}
                onChange={(e) => setPerplexityApiKey(e.target.value)}
                placeholder="Enter your Perplexity API key"
              />
              <p className="text-sm text-muted-foreground">
                This key is used to retrieve regulatory information using the Perplexity API.
                <a 
                  href="https://www.perplexity.ai/settings/api" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-1 text-primary hover:underline"
                >
                  Get an API key
                </a>
              </p>
              <div className="flex justify-end">
                <Button 
                  onClick={handleSavePerplexityApiKey} 
                  disabled={isSavingPerplexity || !perplexityApiKey}
                  size="sm"
                >
                  {isSavingPerplexity ? "Saving..." : "Save Perplexity API Key"}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <Label htmlFor="mistral-api-key">Mistral AI API Key</Label>
              </div>
              <Input 
                id="mistral-api-key"
                type="password"
                value={mistralApiKey}
                onChange={(e) => setMistralApiKey(e.target.value)}
                placeholder="Enter your Mistral AI API key"
              />
              <p className="text-sm text-muted-foreground">
                This key is used for OCR and advanced document processing capabilities.
                <a 
                  href="https://console.mistral.ai/api-keys/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-1 text-primary hover:underline"
                >
                  Get an API key
                </a>
              </p>
              <div className="flex justify-end">
                <Button 
                  onClick={handleSaveMistralApiKey} 
                  disabled={isSavingMistral || !mistralApiKey}
                  size="sm"
                >
                  {isSavingMistral ? "Saving..." : "Save Mistral API Key"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              <CardTitle>Python Backend Status</CardTitle>
            </div>
            <CardDescription>
              Configure connection to your Python backend that processes company regulations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Backend Connection Status</Label>
                <div className="flex items-center gap-2">
                  <div 
                    className={`h-3 w-3 rounded-full ${
                      backendStatus === "connected" 
                        ? "bg-success-500" 
                        : backendStatus === "checking" 
                        ? "bg-warning-500" 
                        : "bg-danger-500"
                    }`} 
                  />
                  <span className="text-sm font-medium">
                    {backendStatus === "connected" 
                      ? "Connected" 
                      : backendStatus === "checking" 
                      ? "Checking..." 
                      : "Disconnected"}
                  </span>
                </div>
              </div>
              
              <div className="p-4 bg-muted rounded-md">
                <h4 className="text-sm font-semibold mb-2">Python Backend Setup Instructions</h4>
                <ol className="text-sm space-y-2 list-decimal pl-5">
                  <li>
                    Clone the Python backend repository (Download files from the provided link or create a new project)
                  </li>
                  <li>
                    Install dependencies with <code className="bg-background text-xs p-1 rounded">pip install -r requirements.txt</code>
                  </li>
                  <li>
                    Start the server with <code className="bg-background text-xs p-1 rounded">python app.py</code>
                  </li>
                  <li>
                    The backend should be running at <code className="bg-background text-xs p-1 rounded">{PYTHON_API_URL}</code>
                  </li>
                </ol>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <span className="text-xs text-muted-foreground">
              The Python backend is required for real-time compliance analysis.
            </span>
            <Button 
              variant="outline" 
              onClick={checkBackendConnection}
              disabled={isConnecting}
            >
              {isConnecting ? "Checking..." : "Check Connection"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </PageTransition>
  );
};

export default Settings;
