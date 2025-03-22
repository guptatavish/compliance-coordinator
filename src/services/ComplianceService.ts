
import { supabase } from '@/integrations/supabase/client';

// Detect environment and set the base URL accordingly
const isProd = import.meta.env.PROD;
const PYTHON_API_URL = isProd 
  ? 'http://localhost:5000' // In production, this would be your deployed API URL
  : 'http://localhost:5000'; // In development, connect to the local Python server

class ComplianceService {
  async analyzeRegulations(companyProfile: any, apiKey: string, mistralApiKey?: string, uploadedDocuments?: any[], useAiJudge?: boolean) {
    try {
      console.log('Analyzing regulations with Python backend directly');
      const response = await fetch(`${PYTHON_API_URL}/analyze-regulations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          companyProfile,
          apiKey,
          mistralApiKey,
          uploadedDocuments: uploadedDocuments || [],
          useAiJudge: useAiJudge || false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Python API error:', errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error analyzing regulations:', error);
      throw error;
    }
  }

  async uploadDocuments(files: File[]) {
    try {
      console.log('Uploading documents to Python backend');
      const formData = new FormData();
      for (const file of files) {
        formData.append('files[]', file);
      }

      const response = await fetch(`${PYTHON_API_URL}/upload-company-documents`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading documents:', error);
      throw error;
    }
  }

  async fetchSavedAnalyses(companyName: string) {
    try {
      console.log('Fetching saved analyses from Python backend');
      const response = await fetch(`${PYTHON_API_URL}/fetch-saved-analyses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyName })
      });

      if (!response.ok) {
        throw new Error(`Fetch failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching saved analyses:', error);
      throw error;
    }
  }

  async analyzeCompliance(companyProfile: any, jurisdiction: string, documents: any[], apiKey: string) {
    try {
      console.log('Analyzing compliance with Python backend');
      const response = await fetch(`${PYTHON_API_URL}/analyze-compliance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyProfile,
          jurisdiction,
          documents,
          apiKey
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error analyzing compliance:', error);
      throw error;
    }
  }

  async exportReport(format: string, data: any) {
    try {
      console.log(`Exporting report in ${format} format from Python backend`);
      const response = await fetch(`${PYTHON_API_URL}/export-report/${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Error exporting report:', error);
      throw error;
    }
  }

  async exportRegulatoryDoc(jurisdiction: string, docType: string) {
    try {
      console.log(`Exporting regulatory document for ${jurisdiction} from Python backend`);
      const response = await fetch(`${PYTHON_API_URL}/export-regulatory-doc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jurisdiction, docType })
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Error exporting regulatory document:', error);
      throw error;
    }
  }
}

export default new ComplianceService();
