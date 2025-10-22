import { BaseAgent } from './base';
import { ReferenceAnalysisAgent } from './referenceAnalysis';
import { SynthesisAgent } from './synthesisAgent';
import { supabase } from '../services/supabase';
import { searchSemanticSimilarity } from '../services/embeddingService';

/**
 * Unified Research Agent
 *
 * Combines capabilities of LiveResearchAgent and DocumentResearchAgent
 * into a single, intelligent research system that searches across
 * multiple sources:
 * - Web (external knowledge)
 * - Project documents/references (internal knowledge)
 * - Generated documents
 * - Session messages and decided items
 */

export type ResearchSource = 'web' | 'documents' | 'all' | 'auto';
export type ResearchIntent = 'research' | 'document_discovery' | 'gap_analysis';

export interface UnifiedResearchResult {
  query: string;
  intent: ResearchIntent;
  sourcesUsed: ResearchSource[];

  // Web sources (from live research)
  webSources: Array<{
    url: string;
    title: string;
    snippet: string;
    content?: string;
    analysis?: string;
    source: 'web';
  }>;

  // Document sources (from project)
  documentSources: Array<{
    id: string;
    filename: string;
    type: 'reference' | 'generated_document' | 'uploaded_file';
    content: string;
    analysis?: string;
    relevanceScore: number;
    source: 'documents';
  }>;

  // Unified synthesis combining all sources
  synthesis: string;

  // Document suggestions (if intent is document_discovery)
  suggestedDocuments?: Array<{
    templateId: string;
    templateName: string;
    category: string;
    reasoning: string;
    priority: 'high' | 'medium' | 'low';
  }>;

  // Gap analysis (if intent is gap_analysis)
  identifiedGaps?: Array<{
    area: string;
    description: string;
    suggestedAction: string;
  }>;

  // Saved references
  savedReferences: string[];

  metadata: {
    totalSources: number;
    webSourcesCount: number;
    documentSourcesCount: number;
    duration: number;
    searchStrategy: string;
  };
}

export interface ResearchOptions {
  sources?: ResearchSource;
  intent?: ResearchIntent;
  maxWebSources?: number;
  maxDocumentSources?: number;
  includeAnalysis?: boolean;
  saveToDB?: boolean;
}

export class UnifiedResearchAgent extends BaseAgent {
  private referenceAnalysisAgent: ReferenceAnalysisAgent;
  private synthesisAgent: SynthesisAgent;

  constructor() {
    const systemPrompt = `You are the Unified Research Agent - an intelligent research assistant that searches across multiple knowledge sources.

YOUR PURPOSE:
Conduct comprehensive research by intelligently combining:
1. Web sources (external knowledge)
2. Project documents and references (internal knowledge)
3. Generated documents and session context

CAPABILITIES:
1. Multi-source search: Web + Documents + References
2. Intelligent source selection based on query intent
3. Semantic similarity matching for document search
4. Cross-source synthesis and analysis
5. Document gap identification
6. Smart document suggestions

RESEARCH STRATEGIES:
- For technical questions: Prioritize web + technical docs
- For project-specific: Prioritize internal docs + references
- For compliance/legal: Prioritize internal policies + web sources
- For gaps: Analyze what's missing from existing docs

SYNTHESIS QUALITY:
- Cite sources clearly (web URLs and document names)
- Identify conflicting information
- Highlight gaps in knowledge
- Provide actionable recommendations
- Cross-reference between internal and external sources`;

    super('UnifiedResearchAgent', systemPrompt);
    this.referenceAnalysisAgent = new ReferenceAnalysisAgent();
    this.synthesisAgent = new SynthesisAgent();
  }

  /**
   * Main unified research entry point
   */
  async research(
    query: string,
    projectId: string,
    userId: string,
    options: ResearchOptions = {},
    callbacks?: {
      onSourceSelectionComplete?: (strategy: string) => Promise<void>;
      onWebSearchComplete?: (count: number) => Promise<void>;
      onDocumentSearchComplete?: (count: number) => Promise<void>;
      onAnalysisComplete?: (count: number) => Promise<void>;
      onSynthesisComplete?: () => Promise<void>;
    }
  ): Promise<UnifiedResearchResult> {
    const startTime = Date.now();
    const {
      sources = 'auto',
      intent = 'research',
      maxWebSources = 5,
      maxDocumentSources = 10,
      includeAnalysis = true,
      saveToDB = true,
    } = options;

    this.log(`Starting unified research for query: "${query}"`);
    this.log(`Options: sources=${sources}, intent=${intent}, maxWeb=${maxWebSources}, maxDocs=${maxDocumentSources}`);

    try {
      // Step 1: Determine search strategy
      const searchStrategy = await this.determineSearchStrategy(query, sources, intent);
      this.log(`Search strategy determined: ${searchStrategy.description}`);

      if (callbacks?.onSourceSelectionComplete) {
        await callbacks.onSourceSelectionComplete(searchStrategy.description);
      }

      // Step 2: Execute multi-source search
      const webSources: UnifiedResearchResult['webSources'] = [];
      const documentSources: UnifiedResearchResult['documentSources'] = [];

      // Search web if strategy includes it
      if (searchStrategy.searchWeb) {
        this.log('Searching web sources...');
        const webResults = await this.searchWeb(query, maxWebSources);
        const crawledWeb = await this.crawlUrls(webResults);

        for (const source of crawledWeb) {
          webSources.push({
            ...source,
            source: 'web' as const,
          });
        }

        this.log(`Found ${webSources.length} web sources`);
        if (callbacks?.onWebSearchComplete) {
          await callbacks.onWebSearchComplete(webSources.length);
        }
      }

      // Search documents if strategy includes it
      if (searchStrategy.searchDocuments) {
        this.log('Searching project documents...');
        const docResults = await this.searchDocuments(query, projectId, maxDocumentSources);
        documentSources.push(...docResults);

        this.log(`Found ${documentSources.length} document sources`);
        if (callbacks?.onDocumentSearchComplete) {
          await callbacks.onDocumentSearchComplete(documentSources.length);
        }
      }

      // Step 3: Analyze sources (if requested)
      let allAnalyses: Array<{ filename: string; analysis: string; type: string }> = [];

      if (includeAnalysis) {
        this.log(`Analyzing ${webSources.length + documentSources.length} sources...`);

        // Analyze web sources
        for (const source of webSources) {
          if (source.content && source.content.length > 100) {
            try {
              const analysisResult = await this.referenceAnalysisAgent.analyze('url', {
                url: source.url,
                type: 'url',
                extractedContent: source.content,
                contentType: 'text' as const,
              });

              source.analysis = analysisResult.message || 'No analysis generated';
              allAnalyses.push({
                filename: source.title,
                analysis: source.analysis,
                type: 'web',
              });
            } catch (error) {
              this.log(`Failed to analyze web source ${source.url}: ${error}`);
            }
          }
        }

        // Document sources already have analysis from semantic search
        for (const source of documentSources) {
          if (source.analysis) {
            allAnalyses.push({
              filename: source.filename,
              analysis: source.analysis,
              type: source.type,
            });
          }
        }

        this.log(`Completed analysis of ${allAnalyses.length} sources`);
        if (callbacks?.onAnalysisComplete) {
          await callbacks.onAnalysisComplete(allAnalyses.length);
        }
      }

      // Step 4: Generate unified synthesis
      let synthesis = '';
      if (allAnalyses.length >= 2) {
        this.log('Generating unified synthesis...');
        try {
          const synthesisResult = await this.synthesisAgent.synthesize(allAnalyses);
          synthesis = synthesisResult.synthesis;
        } catch (error) {
          this.log(`Synthesis failed, creating fallback: ${error}`);
          synthesis = this.createFallbackSynthesis(query, webSources, documentSources);
        }
      } else {
        synthesis = this.createFallbackSynthesis(query, webSources, documentSources);
      }

      if (callbacks?.onSynthesisComplete) {
        await callbacks.onSynthesisComplete();
      }

      // Step 5: Handle intent-specific features
      let suggestedDocuments: UnifiedResearchResult['suggestedDocuments'];
      let identifiedGaps: UnifiedResearchResult['identifiedGaps'];

      if (intent === 'document_discovery') {
        suggestedDocuments = await this.suggestDocuments(query, synthesis, projectId);
      } else if (intent === 'gap_analysis') {
        identifiedGaps = await this.identifyGaps(query, synthesis, documentSources);
      }

      // Step 6: Save to database (if requested)
      let savedReferences: string[] = [];
      if (saveToDB) {
        this.log('Saving research results to database...');
        savedReferences = await this.saveResearchResults(
          webSources,
          documentSources,
          allAnalyses,
          projectId,
          userId,
          query
        );
        this.log(`Saved ${savedReferences.length} references`);
      }

      const duration = Date.now() - startTime;
      this.log(`Unified research completed in ${duration}ms`);

      return {
        query,
        intent,
        sourcesUsed: searchStrategy.sourcesUsed,
        webSources,
        documentSources,
        synthesis,
        suggestedDocuments,
        identifiedGaps,
        savedReferences,
        metadata: {
          totalSources: webSources.length + documentSources.length,
          webSourcesCount: webSources.length,
          documentSourcesCount: documentSources.length,
          duration,
          searchStrategy: searchStrategy.description,
        },
      };
    } catch (error) {
      this.log(`Unified research failed: ${error}`);
      throw error;
    }
  }

  /**
   * Determine which sources to search based on query and options
   */
  private async determineSearchStrategy(
    query: string,
    sources: ResearchSource,
    intent: ResearchIntent
  ): Promise<{
    searchWeb: boolean;
    searchDocuments: boolean;
    sourcesUsed: ResearchSource[];
    description: string;
  }> {
    // Explicit source selection
    if (sources === 'web') {
      return {
        searchWeb: true,
        searchDocuments: false,
        sourcesUsed: ['web'],
        description: 'Web only (user specified)',
      };
    }

    if (sources === 'documents') {
      return {
        searchWeb: false,
        searchDocuments: true,
        sourcesUsed: ['documents'],
        description: 'Documents only (user specified)',
      };
    }

    if (sources === 'all') {
      return {
        searchWeb: true,
        searchDocuments: true,
        sourcesUsed: ['web', 'documents'],
        description: 'Web + Documents (user specified)',
      };
    }

    // Auto mode: Use AI to decide
    this.log('Using AI to determine optimal search strategy...');

    const prompt = `Analyze this research query and determine the best search strategy:

Query: "${query}"
Intent: ${intent}

Available sources:
- Web: External knowledge, latest information, best practices
- Documents: Internal project docs, references, uploaded files

Based on the query, should I search:
1. Web only
2. Documents only
3. Both web and documents

Consider:
- Is this asking about general knowledge or project-specific?
- Does it need latest external info or internal context?
- Would both sources provide complementary value?

Respond with ONLY one word: "web", "documents", or "both"`;

    try {
      const response = await this.callClaude([{ role: 'user', content: prompt }], 100);
      const decision = response.toLowerCase().trim();

      if (decision.includes('both')) {
        return {
          searchWeb: true,
          searchDocuments: true,
          sourcesUsed: ['web', 'documents'],
          description: 'Web + Documents (AI recommended)',
        };
      } else if (decision.includes('web')) {
        return {
          searchWeb: true,
          searchDocuments: false,
          sourcesUsed: ['web'],
          description: 'Web only (AI recommended)',
        };
      } else {
        return {
          searchWeb: false,
          searchDocuments: true,
          sourcesUsed: ['documents'],
          description: 'Documents only (AI recommended)',
        };
      }
    } catch (error) {
      this.log(`Strategy determination failed, defaulting to both: ${error}`);
      return {
        searchWeb: true,
        searchDocuments: true,
        sourcesUsed: ['web', 'documents'],
        description: 'Web + Documents (fallback)',
      };
    }
  }

  /**
   * Search web sources (from LiveResearchAgent)
   */
  private async searchWeb(
    query: string,
    maxResults: number
  ): Promise<Array<{ url: string; title: string; snippet: string }>> {
    this.log(`Searching web for: "${query}"`);

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

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const results = JSON.parse(jsonMatch[0]);
        return results.slice(0, maxResults);
      }

      return [];
    } catch (error) {
      this.log(`Web search error: ${error}`);
      return [];
    }
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
   * Extract content from URL
   */
  private async extractUrlContent(url: string): Promise<string> {
    try {
      this.log(`Fetching content from: ${url}`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

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

      let text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      text = text.substring(0, 5000);

      this.log(`Extracted ${text.length} characters from ${url}`);
      return text;
    } catch (error: any) {
      this.log(`Error extracting content from ${url}: ${error.message || error}`);
      throw error;
    }
  }

  /**
   * Search project documents using semantic similarity
   */
  private async searchDocuments(
    query: string,
    projectId: string,
    maxResults: number
  ): Promise<Array<{
    id: string;
    filename: string;
    type: 'reference' | 'generated_document' | 'uploaded_file';
    content: string;
    analysis?: string;
    relevanceScore: number;
    source: 'documents';
  }>> {
    this.log(`Searching documents for project ${projectId}...`);

    try {
      // Search using semantic similarity
      const semanticResults = await searchSemanticSimilarity(query, projectId, maxResults);

      const documentSources: Array<{
        id: string;
        filename: string;
        type: 'reference' | 'generated_document' | 'uploaded_file';
        content: string;
        analysis?: string;
        relevanceScore: number;
        source: 'documents';
      }> = [];

      for (const result of semanticResults) {
        // Determine document type and fetch full content
        let type: 'reference' | 'generated_document' | 'uploaded_file' = 'reference';
        let content = '';
        let analysis = '';
        let filename = '';

        if (result.type === 'reference') {
          const { data: ref } = await supabase
            .from('references')
            .select('*')
            .eq('id', result.id)
            .single();

          if (ref) {
            filename = ref.filename;
            content = ref.metadata?.extractedContent || ref.content || '';
            analysis = ref.metadata?.analysis || '';
            type = 'reference';
          }
        } else if (result.type === 'generated_document') {
          const { data: doc } = await supabase
            .from('generated_documents')
            .select('*')
            .eq('id', result.id)
            .single();

          if (doc) {
            filename = `${doc.document_type}.md`;
            content = doc.content || '';
            analysis = `Generated document: ${doc.document_type}`;
            type = 'generated_document';
          }
        }

        if (content) {
          documentSources.push({
            id: result.id,
            filename,
            type,
            content: content.substring(0, 5000), // Limit to 5000 chars
            analysis,
            relevanceScore: result.score,
            source: 'documents' as const,
          });
        }
      }

      this.log(`Found ${documentSources.length} relevant documents`);
      return documentSources;
    } catch (error) {
      this.log(`Document search error: ${error}`);
      return [];
    }
  }

  /**
   * Suggest documents based on research findings
   */
  private async suggestDocuments(
    query: string,
    synthesis: string,
    projectId: string
  ): Promise<Array<{
    templateId: string;
    templateName: string;
    category: string;
    reasoning: string;
    priority: 'high' | 'medium' | 'low';
  }>> {
    this.log('Analyzing research to suggest documents...');

    const prompt = `Based on this research query and findings, suggest what documents would be valuable to create:

Query: "${query}"

Research Findings:
${synthesis.substring(0, 1500)}

Available document templates:
- api_documentation (Software & Technical)
- architecture_doc (Software & Technical)
- deployment_guide (Software & Technical)
- privacy_policy (Business)
- terms_of_service (Business)
- sla_agreement (Business)
- readme (Development)
- contributing_guide (Development)

Suggest 2-4 most relevant document templates. For each, provide:
- templateId
- templateName
- category
- reasoning (why this doc would be valuable given the research)
- priority (high/medium/low)

Return ONLY valid JSON array:
[{"templateId": "...", "templateName": "...", "category": "...", "reasoning": "...", "priority": "high"}]`;

    try {
      const response = await this.callClaude([{ role: 'user', content: prompt }], 1500);

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0]);
        return suggestions.slice(0, 5);
      }

      return [];
    } catch (error) {
      this.log(`Document suggestion error: ${error}`);
      return [];
    }
  }

  /**
   * Identify gaps in existing documentation
   */
  private async identifyGaps(
    query: string,
    synthesis: string,
    documentSources: Array<{ filename: string; content: string }>
  ): Promise<Array<{
    area: string;
    description: string;
    suggestedAction: string;
  }>> {
    this.log('Analyzing gaps in documentation...');

    const prompt = `Analyze these documents to identify gaps:

Research Query: "${query}"

Research Synthesis:
${synthesis.substring(0, 1000)}

Existing Documents:
${documentSources.map(d => `- ${d.filename}: ${d.content.substring(0, 200)}...`).join('\n')}

Identify 2-5 gaps where documentation is:
- Missing important topics
- Incomplete or lacking detail
- Outdated or contradictory
- Not addressing key user needs

Return ONLY valid JSON array:
[{"area": "...", "description": "...", "suggestedAction": "..."}]`;

    try {
      const response = await this.callClaude([{ role: 'user', content: prompt }], 1500);

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const gaps = JSON.parse(jsonMatch[0]);
        return gaps.slice(0, 5);
      }

      return [];
    } catch (error) {
      this.log(`Gap identification error: ${error}`);
      return [];
    }
  }

  /**
   * Save research results to database
   */
  private async saveResearchResults(
    webSources: UnifiedResearchResult['webSources'],
    documentSources: UnifiedResearchResult['documentSources'],
    analyses: Array<{ filename: string; analysis: string }>,
    projectId: string,
    userId: string,
    query: string
  ): Promise<string[]> {
    const savedIds: string[] = [];

    // Save web sources as references
    for (let i = 0; i < webSources.length; i++) {
      const source = webSources[i];
      if (!source.content) continue;

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
                researchType: 'unified',
              },
              tags: ['researched', 'unified-research', 'web-source'],
            },
          ])
          .select()
          .single();

        if (reference) {
          savedIds.push(reference.id);
        }
      } catch (error) {
        this.log(`Failed to save web source ${source.url}: ${error}`);
      }
    }

    // Document sources are already in DB, just return their IDs
    for (const doc of documentSources) {
      savedIds.push(doc.id);
    }

    return savedIds;
  }

  /**
   * Create fallback synthesis when AI synthesis fails
   */
  private createFallbackSynthesis(
    query: string,
    webSources: UnifiedResearchResult['webSources'],
    documentSources: UnifiedResearchResult['documentSources']
  ): string {
    return `# Unified Research Results: ${query}

## Overview
Found ${webSources.length + documentSources.length} total sources:
- ${webSources.length} web sources
- ${documentSources.length} project documents

## Web Sources

${webSources
  .map(
    (source, idx) => `### ${idx + 1}. [${source.title}](${source.url})

${source.snippet}

${source.content ? `**Content Preview:**\n${source.content.substring(0, 300)}...` : '_Content not available_'}
`
  )
  .join('\n---\n\n')}

## Project Documents

${documentSources
  .map(
    (source, idx) => `### ${idx + 1}. ${source.filename} (${source.type})

**Relevance Score:** ${(source.relevanceScore * 100).toFixed(1)}%

${source.analysis || 'No analysis available'}

**Content Preview:**
${source.content.substring(0, 300)}...
`
  )
  .join('\n---\n\n')}

## Next Steps
- Review sources above for comprehensive understanding
- Cross-reference between web and project documents
- Identify any gaps or contradictions
- Extract key insights for your project
`;
  }
}
