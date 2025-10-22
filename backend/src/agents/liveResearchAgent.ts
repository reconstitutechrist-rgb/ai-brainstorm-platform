import { BaseAgent } from './base';
import { ReferenceAnalysisAgent } from './referenceAnalysis';
import { SynthesisAgent } from './synthesisAgent';
import { supabase } from '../services/supabase';

export interface ResearchResult {
  query: string;
  sources: Array<{
    url: string;
    title: string;
    snippet: string;
    content?: string;
    analysis?: string;
  }>;
  synthesis: string;
  savedReferences: string[]; // Reference IDs
  metadata: {
    totalSources: number;
    successfulCrawls: number;
    failedCrawls: number;
    duration: number;
  };
}

export class LiveResearchAgent extends BaseAgent {
  private referenceAnalysisAgent: ReferenceAnalysisAgent;
  private synthesisAgent: SynthesisAgent;

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
    } = {},
    callbacks?: {
      onSearchComplete?: (count: number) => Promise<void>;
      onCrawlComplete?: (count: number) => Promise<void>;
      onAnalysisComplete?: (count: number) => Promise<void>;
    }
  ): Promise<ResearchResult> {
    const startTime = Date.now();
    const { maxSources = 5, includeAnalysis = true, saveToDB = true } = options;

    this.log(`Starting research for query: "${query}"`);
    this.log(`Options: maxSources=${maxSources}, includeAnalysis=${includeAnalysis}, saveToDB=${saveToDB}`);

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

      // Step 3: Analyze each source (if requested)
      const sourcesWithAnalysis: Array<{
        url: string;
        title: string;
        snippet: string;
        content?: string;
        analysis?: string;
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

        // Merge sources with analyses using URL matching (not index matching)
        crawledSources.forEach((source) => {
          sourcesWithAnalysis.push({
            ...source,
            analysis: analysisMap.get(source.url),
          });
        });
      } else {
        crawledSources.forEach(source => sourcesWithAnalysis.push(source));
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
        },
      };
    } catch (error) {
      this.log(`Research failed: ${error}`);
      throw error;
    }
  }

  /**
   * Search the web for relevant content
   * Note: This is a simplified implementation. In production, use a proper search API
   */
  private async searchWeb(
    query: string,
    maxResults: number
  ): Promise<Array<{ url: string; title: string; snippet: string }>> {
    this.log(`Searching web for: "${query}"`);

    // Use Claude to generate relevant URLs based on the query
    // In production, you'd use a real search API (Google Custom Search, Bing, etc.)
    const searchPrompt = `Given this research query: "${query}"

Generate ${maxResults} highly relevant, real URLs that would contain valuable information about this topic.
For each URL, provide:
1. A realistic, working URL (preferably documentation, official sites, or reputable sources)
2. A title for the page
3. A brief snippet describing what would be found there

Return ONLY a JSON array in this exact format:
[
  {
    "url": "https://example.com/page",
    "title": "Page Title",
    "snippet": "Brief description of content"
  }
]`;

    try {
      const response = await this.callClaude(
        [{ role: 'user', content: searchPrompt }],
        2000
      );

      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const results = JSON.parse(jsonMatch[0]);
        return results.slice(0, maxResults);
      }

      // Fallback: Return some default results
      return this.getDefaultSearchResults(query, maxResults);
    } catch (error) {
      this.log(`Search web error: ${error}`);
      return this.getDefaultSearchResults(query, maxResults);
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
   * Extract content from a URL
   */
  private async extractUrlContent(url: string): Promise<string> {
    try {
      this.log(`Fetching content from: ${url}`);

      // Use fetch with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ResearchBot/1.0)',
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();

      // Simple HTML text extraction (remove tags)
      let text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Limit to first 5000 characters
      text = text.substring(0, 5000);

      this.log(`Extracted ${text.length} characters from ${url}`);
      return text;
    } catch (error: any) {
      this.log(`Error extracting content from ${url}: ${error.message || error}`);
      throw error;
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
