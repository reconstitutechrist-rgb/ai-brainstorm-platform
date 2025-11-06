import { customsearch_v1, google } from 'googleapis';
import { retryWithBackoff, CircuitBreaker } from '../utils/retryUtil';

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
}

export class GoogleSearchService {
  private customSearch: customsearch_v1.Customsearch;
  private apiKey: string;
  private searchEngineId: string;
  private circuitBreaker: CircuitBreaker;

  constructor() {
    this.apiKey = process.env.GOOGLE_SEARCH_API_KEY || '';
    this.searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || '';

    if (!this.apiKey || !this.searchEngineId) {
      console.warn('[GoogleSearchService] API key or Search Engine ID not configured');
    }

    this.customSearch = google.customsearch('v1');
    this.circuitBreaker = new CircuitBreaker(5, 60000); // 5 failures, 1 minute timeout
  }

  /**
   * Search Google and return results with retry logic and circuit breaker
   */
  async search(
    query: string,
    maxResults: number = 10
  ): Promise<SearchResult[]> {
    if (!this.apiKey || !this.searchEngineId) {
      throw new Error('Google Search API not configured. Set GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID in .env');
    }

    // Wrap the search operation with circuit breaker and retry logic
    return await this.circuitBreaker.execute(async () => {
      return await retryWithBackoff(
        async () => {
          console.log(`[GoogleSearchService] Searching for: "${query}"`);

          const response = await this.customSearch.cse.list({
            auth: this.apiKey,
            cx: this.searchEngineId,
            q: query,
            num: Math.min(maxResults, 10), // Google API max is 10 per request
          });

          const items = response.data.items || [];
          
          const results: SearchResult[] = items.map((item: any) => ({
            url: item.link || '',
            title: item.title || 'Untitled',
            snippet: item.snippet || '',
          }));

          console.log(`[GoogleSearchService] Found ${results.length} results`);
          return results;
        },
        {
          maxRetries: 3,
          initialDelayMs: 1000,
          maxDelayMs: 5000,
          backoffMultiplier: 2,
        }
      );
    }).catch((error: any) => {
      console.error('[GoogleSearchService] Search error:', error.message);
      
      // Provide specific, actionable error messages
      if (error.message?.includes('Circuit breaker')) {
        throw new Error('Google Search is temporarily unavailable. Please try again in a few minutes.');
      } else if (error.code === 400 || error.status === 400) {
        throw new Error('Invalid search query. Please try a different search term.');
      } else if (error.code === 403 || error.status === 403) {
        throw new Error('Google Search API quota exceeded or invalid API key. Check your API configuration.');
      } else if (error.code === 429 || error.status === 429) {
        throw new Error('Google Search rate limit exceeded. Please wait a moment and try again.');
      } else if (error.message?.includes('quota exceeded')) {
        throw new Error('Google Search daily quota (100 searches) exceeded. Quota resets at midnight Pacific Time.');
      }
      
      throw new Error(`Google Search failed: ${error.message || 'Unknown error'}`);
    });
  }

  /**
   * Check if the service is configured
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey && this.searchEngineId);
  }

  /**
   * Get circuit breaker state for monitoring
   */
  getCircuitBreakerState() {
    return this.circuitBreaker.getState();
  }

  /**
   * Manually reset the circuit breaker
   */
  resetCircuitBreaker() {
    this.circuitBreaker.reset();
  }
}
