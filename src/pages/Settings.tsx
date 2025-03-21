
import React, { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageTransition from '@/components/PageTransition';
import { ShieldCheck } from 'lucide-react';

const Settings = () => {
  const [perplexityApiKey, setPerplexityApiKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    // Try to load the API key from localStorage if available
    const savedApiKey = localStorage.getItem('perplexity_api_key');
    if (savedApiKey) {
      setPerplexityApiKey(savedApiKey);
    }
  }, []);

  const handleSaveApiKey = () => {
    setIsSaving(true);
    try {
      // Store the API key in localStorage
      localStorage.setItem('perplexity_api_key', perplexityApiKey);
      
      toast({
        title: "API Key Saved",
        description: "Your Perplexity API key has been saved successfully.",
      });
    } catch (error) {
      console.error("Error saving API key:", error);
      toast({
        title: "Error",
        description: "Failed to save your API key. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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
          <CardContent className="space-y-4">
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
                  href="https://docs.perplexity.ai/docs/getting-started" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-1 text-primary hover:underline"
                >
                  Get an API key
                </a>
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleSaveApiKey} 
              disabled={isSaving || !perplexityApiKey}
            >
              {isSaving ? "Saving..." : "Save API Key"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </PageTransition>
  );
};

export default Settings;
