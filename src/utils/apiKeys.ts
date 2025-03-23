
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
 * Gets the stored Mistral API key from localStorage
 */
export const getMistralApiKey = (): string | null => {
  return localStorage.getItem('mistral_api_key');
};

/**
 * Checks if the Mistral API key is available
 */
export const hasMistralApiKey = (): boolean => {
  const key = getMistralApiKey();
  return !!key && key.trim().length > 0;
};

/**
 * Saves the Mistral API key to localStorage
 */
export const saveMistralApiKey = (apiKey: string): void => {
  localStorage.setItem('mistral_api_key', apiKey);
};

/**
 * Base URL for the Python backend API
 * Change this to your actual Python API URL when deployed
 */
export const PYTHON_API_URL = 'http://localhost:5000';
