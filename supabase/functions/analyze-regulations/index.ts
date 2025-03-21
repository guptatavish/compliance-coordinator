
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyProfile, apiKey } = await req.json();
    
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

    // Validate currentJurisdictions array
    if (!companyProfile.currentJurisdictions || !Array.isArray(companyProfile.currentJurisdictions) || companyProfile.currentJurisdictions.length === 0) {
      return new Response(
        JSON.stringify({ error: "Company profile must include at least one jurisdiction" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Analyzing regulations for company:", companyProfile.companyName);
    
    const analysisResults = [];
    
    // Process each jurisdiction
    for (const jurisdictionId of companyProfile.currentJurisdictions) {
      if (!jurisdictionId) {
        console.warn("Skipping null or undefined jurisdiction");
        continue; // Skip this iteration if jurisdictionId is null or undefined
      }
      
      console.log(`Analyzing jurisdiction: ${jurisdictionId}`);
      
      // Generate system prompt based on company profile
      const systemPrompt = `
        You are a financial regulatory compliance expert specialized in global jurisdictions.
        Analyze compliance requirements for a ${companyProfile.industry} company with ${companyProfile.companySize} employees 
        operating in the specified jurisdiction.
        Format your response as structured JSON only, without any explanations or additional text.
      `;
      
      // Generate user prompt for specific jurisdiction analysis
      const userPrompt = `
        Analyze financial compliance requirements for ${companyProfile.companyName}, 
        a ${companyProfile.industry} company with ${companyProfile.companySize} employees, 
        operating in ${jurisdictionId}.
        
        ${companyProfile.description ? `Company description: ${companyProfile.description}` : ''}
        
        Return a detailed JSON with the following structure:
        {
          "jurisdictionName": "Full name of jurisdiction",
          "complianceScore": number between 0-100 representing overall compliance likelihood,
          "status": "compliant" or "partial" or "non-compliant",
          "riskLevel": "low" or "medium" or "high",
          "requirements": {
            "total": total number of requirements,
            "met": estimated number of requirements met based on the company profile
          },
          "requirementsList": [
            {
              "category": "Category name (e.g., KYC/AML, Data Protection)",
              "title": "Short name of requirement",
              "description": "Detailed description of the requirement",
              "status": "met" or "partial" or "not-met" based on company profile,
              "risk": "low" or "medium" or "high",
              "recommendation": "Actionable recommendation if status is not met"
            }
          ]
        }
        
        Include at least 8-12 specific requirements across 4-6 categories.
        Make the assessment realistic based on the company's industry and size.
      `;
      
      try {
        // Call Perplexity API
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.1-sonar-small-128k-online',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.2,
            max_tokens: 4000
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Perplexity API error:", errorData);
          throw new Error(`Perplexity API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Received analysis for jurisdiction:", jurisdictionId);
        
        try {
          // Extract and parse the JSON response
          const content = data.choices[0].message.content;
          const analysisData = JSON.parse(content);
          
          // Add jurisdiction ID to the response
          analysisData.jurisdictionId = jurisdictionId;
          analysisResults.push(analysisData);
        } catch (parseError) {
          console.error("Error parsing Perplexity response:", parseError);
          console.log("Raw response:", data.choices[0].message.content);
          // Add a placeholder with error info
          analysisResults.push({
            jurisdictionId,
            jurisdictionName: jurisdictionId,
            error: "Failed to parse analysis",
            complianceScore: 50,
            status: "partial",
            riskLevel: "medium",
            requirements: { total: 0, met: 0 },
            requirementsList: []
          });
        }
      } catch (jurisdictionError) {
        console.error(`Error processing jurisdiction ${jurisdictionId}:`, jurisdictionError);
        // Add a placeholder with error info for this specific jurisdiction
        analysisResults.push({
          jurisdictionId,
          jurisdictionName: jurisdictionId,
          error: `Error analyzing jurisdiction: ${jurisdictionError.message}`,
          complianceScore: 50,
          status: "partial",
          riskLevel: "medium",
          requirements: { total: 0, met: 0 },
          requirementsList: []
        });
      }
    }
    
    if (analysisResults.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "No valid jurisdictions could be analyzed",
          analysisResults: [] 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ analysisResults }),
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
