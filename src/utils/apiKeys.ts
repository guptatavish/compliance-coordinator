
/**
 * Gets the stored Perplexity API key from localStorage
 */
export const getPerplexityApiKey = (): string | null => {
  return localStorage.getItem('perplexity_api_key');
};

/**
 * Checks if the Perplexity API key is available
 */
export const hasPerplexityApiKey = (): boolean => {
  const key = getPerplexityApiKey();
  return !!key && key.trim().length > 0;
};

/**
 * Saves the Perplexity API key to localStorage
 */
export const savePerplexityApiKey = (apiKey: string): void => {
  localStorage.setItem('perplexity_api_key', apiKey);
};

/**
 * Base URL for the Python backend API
 * Change this to your actual Python API URL when deployed
 */
export const PYTHON_API_URL = 'http://localhost:5000';
