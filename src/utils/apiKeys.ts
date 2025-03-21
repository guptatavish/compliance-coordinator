
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
