
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PYTHON_API_URL = 'http://localhost:5000';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyProfile, apiKey, mistralApiKey, uploadedDocuments, useAiJudge } = await req.json();
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Perplexity API key is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!companyProfile) {
      return new Response(
        JSON.stringify({ error: "Company profile data is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Forwarding regulation analysis request to Python backend at ${PYTHON_API_URL}/analyze-regulations`);
    
    // Forward the request to the Python backend with all necessary data
    const pythonResponse = await fetch(`${PYTHON_API_URL}/analyze-regulations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        companyProfile, 
        apiKey, 
        mistralApiKey: mistralApiKey || null,
        uploadedDocuments: uploadedDocuments || [],
        useAiJudge: useAiJudge || false,
        storeResults: true  // Flag to indicate results should be stored
      })
    });
    
    if (!pythonResponse.ok) {
      const errorData = await pythonResponse.text();
      console.error("Python backend error:", errorData);
      throw new Error(`Python backend error: ${pythonResponse.status} - ${errorData}`);
    }
    
    const data = await pythonResponse.json();
    
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("Error in analyze-regulations function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
