import { BaseAgent } from './base';
import { ReferenceAnalysisAgent } from './referenceAnalysis';
import { SynthesisAgent } from './synthesisAgent';
import { supabase } from '../services/supabase';
import { GoogleSearchService } from '../services/googleSearchService';
import { cacheService, CacheKeys } from '../services/cacheService';
import { contentExtractionService } from '../services/contentExtractionService';
import { sourceQualityService, SourceQualityScore } from '../services/sourceQualityService';

export interface ResearchResult {
  query: string;
  sources: Array<{
    url: string;
    title: string;
    snippet: string;
    content?: string;
    analysis?: string;
    qualityScore?: SourceQualityScore;
  }>;
  synthesis: string;
  savedReferences: string[]; // Reference IDs
  metadata: {
    totalSources: number;
    successfulCrawls: number;
    failedCrawls: number;
    duration: number;
    averageQualityScore?: number;
    highQualitySources?: number;
  };
}

export class LiveResearchAgent extends BaseAgent {
  private referenceAnalysisAgent: ReferenceAnalysisAgent;
  private synthesisAgent: SynthesisAgent;
  private googleSearchService: GoogleSearchService;

  constructor() {
    const systemPrompt = `You are the Live Research Agent.

YOUR PURPOSE:
Autonomously research topics on the web, analyze findings, and provide comprehensive summaries.

CAPABILITIES:
1. Search the web for relevant information
2. Crawl and extract content from URLs
3. Analyze extracted content for key insights
4. Synthesize findings into actionable reports
5. Save researched content as references

RESEARCH PROCESS:
1. Understand the research query intent
2. Identify best search keywords
3. Extract and prioritize relevant sources
4. Analyze content quality and relevance
5. Synthesize findings into structured report`;

    super('LiveResearchAgent', systemPrompt);
    this.referenceAnalysisAgent = new ReferenceAnalysisAgent();
    this.synthesisAgent = new SynthesisAgent();
    this.googleSearchService = new GoogleSearchService();
  }

  /**
   * Main research entry point with progress tracking
   */
  async research(
    query: string,
    projectId: string,
    userId: string,
    options: {
      maxSources?: number;
      includeAnalysis?: boolean;
      saveToDB?: boolean;
      assessQuality?: boolean;
      minQualityScore?: number;
    } = {},
    callbacks?: {
      onSearchComplete?: (count: number) => Promise<void>;
      onCrawlComplete?: (count: number) => Promise<void>;
      onAnalysisComplete?: (count: number) => Promise<void>;
      onQualityAssessment?: (count: number) => Promise<void>;
    }
  ): Promise<ResearchResult> {
    const startTime = Date.now();
    const { 
      maxSources = 5, 
      includeAnalysis = true, 
      saveToDB = true,
      assessQuality = true,
      minQualityScore = 0
    } = options;

    this.log(`Starting research for query: "${query}"`);
    this.log(`Options: maxSources=${maxSources}, includeAnalysis=${includeAnalysis}, saveToDB=${saveToDB}, assessQuality=${assessQuality}, minQualityScore=${minQualityScore}`);

    try {
      // Step 1: Search the web
      const searchResults = await this.searchWeb(query, maxSources);
      this.log(`Found ${searchResults.length} search results`);

      // Callback: Search complete
      if (callbacks?.onSearchComplete) {
        await callbacks.onSearchComplete(searchResults.length);
      }

      // Step 2: Crawl top results
      const crawledSources = await this.crawlUrls(searchResults);
      this.log(`Successfully crawled ${crawledSources.filter(s => s.content).length}/${searchResults.length} sources`);

      // Callback: Crawl complete
      if (callbacks?.onCrawlComplete) {
        await callbacks.onCrawlComplete(crawledSources.filter(s => s.content).length);
      }

      // Step 2.5: Assess source quality (if requested)
      let qualityScores: SourceQualityScore[] = [];
      if (assessQuality && crawledSources.length > 0) {
        this.log(`Assessing quality for ${crawledSources.length} sources...`);
        
        const assessmentPromises = crawledSources
          .filter(source => source.content)
          .map(async (source) => {
            try {
              const score = await sourceQualityService.assessSource({
                url: source.url,
                title: source.title,
                content: source.content || '',
              });
              return score;
            } catch (error) {
              this.log(`Failed to assess quality for ${source.url}: ${error}`);
              return null;
            }
          });

        const scores = await Promise.all(assessmentPromises);
        qualityScores = scores.filter(s => s !== null) as SourceQualityScore[];

        this.log(`Quality assessment complete: ${qualityScores.length} sources scored`);
        
        // Callback: Quality assessment complete
        if (callbacks?.onQualityAssessment) {
          await callbacks.onQualityAssessment(qualityScores.length);
        }

        // Filter by minimum quality score if specified
        if (minQualityScore > 0) {
          const beforeCount = crawledSources.length;
          const filteredIndices = new Set<number>();
          
          qualityScores.forEach((score, index) => {
            if (score.overall >= minQualityScore) {
              filteredIndices.add(index);
            }
          });

          const filtered = crawledSources.filter((_, index) => filteredIndices.has(index));
          const filteredScores = qualityScores.filter(score => score.overall >= minQualityScore);

          this.log(`Filtered ${beforeCount - filtered.length} sources below quality threshold (${minQualityScore})`);
          
          // Update sources and scores
          crawledSources.length = 0;
          crawledSources.push(...filtered);
          qualityScores = filteredScores;
        }
      }

      // Step 3: Analyze each source (if requested)
      const sourcesWithAnalysis: Array<{
        url: string;
        title: string;
        snippet: string;
        content?: string;
        analysis?: string;
        qualityScore?: SourceQualityScore;
      }> = [];

      let analyses: Array<{ filename: string; analysis: string; type?: string }> = [];
      if (includeAnalysis && crawledSources.length > 0) {
        this.log(`Analyzing ${crawledSources.length} sources...`);

        // Create a map to store analyses by URL for correct matching
        const analysisMap = new Map<string, string>();

        const analysisPromises = crawledSources
          .filter(source => source.content && source.content.length > 100)
          .map(async (source) => {
            try {
              const analysisResult = await this.referenceAnalysisAgent.analyze('url', {
                url: source.url,
                type: 'url',
                extractedContent: source.content,
                contentType: 'text' as const,
              });

              const analysisText = analysisResult.message || 'No analysis generated';
              analysisMap.set(source.url, analysisText);

              return {
                filename: source.title || source.url,
                analysis: analysisText,
                type: 'url',
              };
            } catch (error) {
              this.log(`Failed to analyze ${source.url}: ${error}`);
              const errorText = `Error analyzing source: ${error}`;
              analysisMap.set(source.url, errorText);

              return {
                filename: source.title || source.url,
                analysis: errorText,
                type: 'url',
              };
            }
          });

        analyses = await Promise.all(analysisPromises);

        // Callback: Analysis complete
        if (callbacks?.onAnalysisComplete) {
          await callbacks.onAnalysisComplete(analyses.length);
        }

        // Merge sources with analyses and quality scores using URL matching
        crawledSources.forEach((source, index) => {
          sourcesWithAnalysis.push({
            ...source,
            analysis: analysisMap.get(source.url),
            qualityScore: qualityScores[index],
          });
        });
      } else {
        crawledSources.forEach((source, index) => sourcesWithAnalysis.push({
          ...source,
          qualityScore: qualityScores[index],
        }));
      }

      // Step 4: Generate synthesis
      let synthesis = '';
      if (analyses.length >= 2) {
        this.log('Generating synthesis from analyses...');
        try {
          const synthesisResult = await this.synthesisAgent.synthesize(analyses);
          synthesis = synthesisResult.synthesis;
        } catch (error) {
          this.log(`Synthesis failed, creating fallback summary: ${error}`);
          synthesis = this.createFallbackSynthesis(query, sourcesWithAnalysis);
        }
      } else {
        synthesis = this.createFallbackSynthesis(query, sourcesWithAnalysis);
      }

      // Step 5: Save to database (if requested)
      let savedReferences: string[] = [];
      if (saveToDB && sourcesWithAnalysis.length > 0) {
        this.log(`Saving ${sourcesWithAnalysis.length} sources to database...`);
        savedReferences = await this.saveResearches(
          sourcesWithAnalysis,
          analyses,
          projectId,
          userId,
          query
        );
        this.log(`Saved ${savedReferences.length} references to database`);
      }

      const duration = Date.now() - startTime;
      this.log(`Research completed in ${duration}ms`);

      // Calculate quality statistics
      const averageQualityScore = qualityScores.length > 0
        ? qualityScores.reduce((sum, s) => sum + s.overall, 0) / qualityScores.length
        : undefined;
      
      const highQualitySources = qualityScores.filter(s => s.overall >= 80).length;

      return {
        query,
        sources: sourcesWithAnalysis,
        synthesis,
        savedReferences,
        metadata: {
          totalSources: searchResults.length,
          successfulCrawls: sourcesWithAnalysis.filter(s => s.content).length,
          failedCrawls: searchResults.length - sourcesWithAnalysis.filter(s => s.content).length,
          duration,
          averageQualityScore,
          highQualitySources,
        },
      };
    } catch (error) {
      this.log(`Research failed: ${error}`);
      throw error;
    }
  }

  /**
   * Search the web for relevant content using Google Custom Search API
   * Results are cached for 1 hour to save API quota
   */
  private async searchWeb(
    query: string,
    maxResults: number
  ): Promise<Array<{ url: string; title: string; snippet: string }>> {
    this.log(`Searching web for: "${query}"`);

    // Check cache first
    const cacheKey = CacheKeys.search(query, maxResults);
    const cachedResults = cacheService.get<Array<{ url: string; title: string; snippet: string }>>(cacheKey);
    
    if (cachedResults) {
      this.log(`Using cached search results (${cachedResults.length} results)`);
      return cachedResults;
    }

    // Use Google Search if configured
    if (this.googleSearchService.isConfigured()) {
      try {
        this.log('Using Google Custom Search API');
        const results = await this.googleSearchService.search(query, maxResults);
        this.log(`Google Search returned ${results.length} results`);
        
        // Cache the results for 1 hour
        cacheService.set(cacheKey, results, 3600);
        
        return results;
      } catch (error) {
        this.log(`Google Search failed: ${error}`);
        this.log('Falling back to mock search results');
        const fallbackResults = this.getDefaultSearchResults(query, maxResults);
        
        // Cache fallback results for shorter time (5 minutes)
        cacheService.set(cacheKey, fallbackResults, 300);
        
        return fallbackResults;
      }
    } else {
      this.log('Google Search not configured, using fallback mock results');
      this.log('To enable real search, set GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID in .env');
      const fallbackResults = this.getDefaultSearchResults(query, maxResults);
      
      // Cache fallback results for shorter time (5 minutes)
      cacheService.set(cacheKey, fallbackResults, 300);
      
      return fallbackResults;
    }
  }

  /**
   * Fallback search results
   */
  private getDefaultSearchResults(
    query: string,
    maxResults: number
  ): Array<{ url: string; title: string; snippet: string }> {
    // Return some generic but relevant URLs based on common patterns
    const keywords = query.toLowerCase();
    const results = [];

    if (keywords.includes('react') || keywords.includes('javascript') || keywords.includes('frontend')) {
      results.push(
        { url: 'https://react.dev/', title: 'React Documentation', snippet: 'Official React documentation' },
        { url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript', title: 'MDN JavaScript', snippet: 'Mozilla JavaScript documentation' }
      );
    }

    if (keywords.includes('api') || keywords.includes('backend')) {
      results.push(
        { url: 'https://restfulapi.net/', title: 'REST API Tutorial', snippet: 'Learn about RESTful APIs' }
      );
    }

    // Add generic results
    results.push(
      { url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`, title: `Wikipedia: ${query}`, snippet: `Encyclopedia entry for ${query}` }
    );

    return results.slice(0, maxResults);
  }

  /**
   * Crawl URLs and extract content
   */
  private async crawlUrls(
    urls: Array<{ url: string; title: string; snippet: string }>
  ): Promise<Array<{ url: string; title: string; snippet: string; content?: string }>> {
    this.log(`Crawling ${urls.length} URLs...`);

    const results = await Promise.allSettled(
      urls.map(async (urlInfo) => {
        try {
          const content = await this.extractUrlContent(urlInfo.url);
          return {
            ...urlInfo,
            content,
          };
        } catch (error) {
          this.log(`Failed to crawl ${urlInfo.url}: ${error}`);
          return {
            ...urlInfo,
            content: undefined,
          };
        }
      })
    );

    return results.map((result, idx) =>
      result.status === 'fulfilled' ? result.value : { ...urls[idx], content: undefined }
    );
  }

  /**
   * Extract content from a URL using enhanced extraction service
   * Supports: Readability, Playwright (for JS sites), and basic extraction
   */
  private async extractUrlContent(url: string): Promise<string> {
    try {
      this.log(`Fetching content from: ${url}`);

      // Use enhanced content extraction service
      const result = await contentExtractionService.extractFromUrl(url);
      
      this.log(`Extracted ${result.length} characters from ${url} using ${result.method}`);
      
      // Log additional metadata if available
      if (result.title) {
        this.log(`  Title: ${result.title}`);
      }
      if (result.byline) {
        this.log(`  Author: ${result.byline}`);
      }
      if (result.siteName) {
        this.log(`  Site: ${result.siteName}`);
      }

      return result.textContent;
    } catch (error: any) {
      // Provide detailed error logging
      this.log(`Failed to extract content from ${url}: ${error.message || error}`);
      
      // Re-throw with context
      if (error.message?.includes('timeout')) {
        throw new Error(`Timeout: ${url} took too long to respond`);
      } else if (error.message?.includes('ENOTFOUND') || error.message?.includes('ECONNREFUSED')) {
        throw new Error(`Network error: Cannot reach ${url}`);
      } else if (error.message?.includes('403')) {
        throw new Error(`Access denied: ${url} blocks automated access`);
      } else if (error.message?.includes('Insufficient content')) {
        throw new Error(`Low quality: ${url} has insufficient content`);
      }
      
      throw new Error(`Failed to crawl ${url}: ${error.message}`);
    }
  }

  /**
   * Save researched content to database
   */
  private async saveResearches(
    sources: Array<{ url: string; title: string; snippet: string; content?: string; analysis?: string }>,
    analyses: Array<{ filename: string; analysis: string }>,
    projectId: string,
    userId: string,
    query: string
  ): Promise<string[]> {
    const savedIds: string[] = [];

    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      if (!source.content) continue; // Skip sources we couldn't crawl

      try {
        const { data: reference, error } = await supabase
          .from('references')
          .insert([
            {
              project_id: projectId,
              user_id: userId,
              url: source.url,
              filename: source.title || `Research Result ${i + 1}`,
              analysis_status: source.analysis ? 'completed' : 'pending',
              metadata: {
                type: 'url',
                description: source.snippet,
                analysis: source.analysis,
                extractedContent: source.content,
                contentType: 'text',
                sourceQuery: query,
                researchedAt: new Date().toISOString(),
              },
              tags: ['researched', 'auto-generated'],
            },
          ])
          .select()
          .single();

        if (error) {
          this.log(`Error saving reference for ${source.url}: ${error.message}`);
        } else if (reference) {
          savedIds.push(reference.id);
        }
      } catch (error) {
        this.log(`Failed to save reference for ${source.url}: ${error}`);
      }
    }

    return savedIds;
  }

  /**
   * Create a fallback synthesis when AI synthesis fails
   */
  private createFallbackSynthesis(
    query: string,
    sources: Array<{ url: string; title: string; snippet: string; content?: string }>
  ): string {
    return `# Research Summary: ${query}

## Overview
Found ${sources.length} sources related to "${query}".

## Sources

${sources
  .map(
    (source, idx) => `### ${idx + 1}. [${source.title}](${source.url})

${source.snippet}

${source.content ? `**Content Preview:**\n${source.content.substring(0, 300)}...` : '_Content not available_'}
`
  )
  .join('\n---\n\n')}

## Next Steps
- Review the sources above
- Analyze the content for relevance to your project
- Extract key insights and requirements
`;
  }
}
