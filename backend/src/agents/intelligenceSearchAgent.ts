console.log('[DEBUG] Loading intelligenceSearchAgent.ts...');
import { BaseAgent } from './base';
import Anthropic from '@anthropic-ai/sdk';
import { SupabaseClient } from '@supabase/supabase-js';
console.log('[DEBUG] IntelligenceSearchAgent dependencies imported');

interface SearchFilters {
  docTypes?: string[];
  dateRange?: { start: string; end: string };
  state?: 'decided' | 'exploring' | 'parked';
}

interface SearchResult {
  summary: string;
  decisions: any[];
  documents: any[];
  userDocuments: any[];
  activityLog: any[];
  relatedReferences: any[];
  suggestedActions: string[];
}

export class IntelligenceSearchAgent extends BaseAgent {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    const systemPrompt = `You are an Intelligence Search Agent specializing in project knowledge aggregation and analysis.

Your role is to:
1. Search across project decisions, documents, activities, and references
2. Synthesize findings into coherent summaries
3. Identify patterns and connections across different data sources
4. Suggest actionable next steps based on search results

Be concise, accurate, and focus on the most relevant information.`;

    super('IntelligenceSearchAgent', systemPrompt);
    this.supabase = supabase;
  }

  /**
   * Search across all project intelligence data
   */
  async search(
    projectId: string,
    query: string,
    searchMode: 'feature' | 'decision' | 'document' | 'general' = 'general',
    filters?: SearchFilters
  ): Promise<SearchResult> {
    this.log(`Searching project ${projectId} for: "${query}" (mode: ${searchMode})`);

    try {
      // Fetch project data
      const { data: project, error: projectError } = await this.supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        throw new Error('Project not found');
      }

      // Gather data from all sources
      const [
        decisions,
        generatedDocs,
        userDocs,
        activity,
        references
      ] = await Promise.all([
        this.searchDecisions(project, query, filters),
        this.searchGeneratedDocuments(projectId, query, filters),
        this.searchUserDocuments(projectId, query),
        this.searchActivity(projectId, query, filters),
        this.searchReferences(projectId, query)
      ]);

      this.log(`Found: ${decisions.length} decisions, ${generatedDocs.length} generated docs, ${userDocs.length} user docs, ${activity.length} activities, ${references.length} references`);

      // Generate AI summary and suggestions
      const aiAnalysis = await this.generateAISummary(
        query,
        searchMode,
        { decisions, generatedDocs, userDocs, activity, references }
      );

      return {
        summary: aiAnalysis.summary,
        decisions,
        documents: generatedDocs,
        userDocuments: userDocs,
        activityLog: activity,
        relatedReferences: references,
        suggestedActions: aiAnalysis.suggestedActions
      };
    } catch (error) {
      this.log(`Search error: ${error}`);
      throw error;
    }
  }

  /**
   * Search project items (decisions, exploring, parked)
   */
  private async searchDecisions(
    project: any,
    query: string,
    filters?: SearchFilters
  ): Promise<any[]> {
    const items = project.items || [];
    const queryLower = query.toLowerCase();

    // Filter by state if specified
    let filtered = items.filter((item: any) => !item.isArchived);

    if (filters?.state) {
      filtered = filtered.filter((item: any) => item.state === filters.state);
    }

    // Search by text content
    const matched = filtered.filter((item: any) =>
      item.text?.toLowerCase().includes(queryLower)
    );

    // Apply date range filter
    if (filters?.dateRange) {
      const start = new Date(filters.dateRange.start);
      const end = new Date(filters.dateRange.end);

      return matched.filter((item: any) => {
        const itemDate = new Date(item.created_at);
        return itemDate >= start && itemDate <= end;
      });
    }

    return matched;
  }

  /**
   * Search generated documents
   */
  private async searchGeneratedDocuments(
    projectId: string,
    query: string,
    filters?: SearchFilters
  ): Promise<any[]> {
    let dbQuery = this.supabase
      .from('generated_documents')
      .select('*')
      .eq('project_id', projectId)
      .ilike('content', `%${query}%`);

    // Filter by document types if specified
    if (filters?.docTypes && filters.docTypes.length > 0) {
      dbQuery = dbQuery.in('document_type', filters.docTypes);
    }

    const { data, error } = await dbQuery;

    if (error) {
      this.log(`Error searching generated documents: ${error.message}`);
      return [];
    }

    return data || [];
  }

  /**
   * Search user-uploaded documents
   */
  private async searchUserDocuments(
    projectId: string,
    query: string
  ): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('documents')
      .select('*')
      .eq('project_id', projectId)
      .or(`filename.ilike.%${query}%,metadata->>description.ilike.%${query}%`);

    if (error) {
      this.log(`Error searching user documents: ${error.message}`);
      return [];
    }

    return data || [];
  }

  /**
   * Search agent activity logs
   */
  private async searchActivity(
    projectId: string,
    query: string,
    filters?: SearchFilters
  ): Promise<any[]> {
    let dbQuery = this.supabase
      .from('agent_activity')
      .select('*')
      .eq('project_id', projectId)
      .or(`action.ilike.%${query}%,details::text.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    // Apply date range filter
    if (filters?.dateRange) {
      dbQuery = dbQuery
        .gte('created_at', filters.dateRange.start)
        .lte('created_at', filters.dateRange.end);
    }

    const { data, error } = await dbQuery;

    if (error) {
      this.log(`Error searching activity: ${error.message}`);
      return [];
    }

    return data || [];
  }

  /**
   * Search project references
   */
  private async searchReferences(
    projectId: string,
    query: string
  ): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('references')
      .select('*')
      .eq('project_id', projectId)
      .or(`filename.ilike.%${query}%,metadata->>analysis.ilike.%${query}%`);

    if (error) {
      this.log(`Error searching references: ${error.message}`);
      return [];
    }

    return data || [];
  }

  /**
   * Generate AI summary and suggested actions
   */
  private async generateAISummary(
    query: string,
    searchMode: string,
    results: {
      decisions: any[];
      generatedDocs: any[];
      userDocs: any[];
      activity: any[];
      references: any[];
    }
  ): Promise<{ summary: string; suggestedActions: string[] }> {
    const prompt = `You are an intelligent project assistant helping to synthesize search results.

USER QUERY: "${query}"
SEARCH MODE: ${searchMode}

SEARCH RESULTS:

## Decisions (${results.decisions.length} found):
${results.decisions.slice(0, 5).map((d, i) => `${i + 1}. [${d.state}] ${d.text}`).join('\n') || 'None found'}

## Generated Documents (${results.generatedDocs.length} found):
${results.generatedDocs.slice(0, 5).map((d, i) => `${i + 1}. ${d.document_type} - ${d.completion_percent}% complete`).join('\n') || 'None found'}

## User Documents (${results.userDocs.length} found):
${results.userDocs.slice(0, 5).map((d, i) => `${i + 1}. ${d.filename}`).join('\n') || 'None found'}

## Recent Activity (${results.activity.length} found):
${results.activity.slice(0, 3).map((a, i) => `${i + 1}. ${a.agent_type}: ${a.action}`).join('\n') || 'None found'}

## References (${results.references.length} found):
${results.references.slice(0, 3).map((r, i) => `${i + 1}. ${r.filename}`).join('\n') || 'None found'}

TASK:
1. Provide a concise, helpful summary (2-3 sentences) answering the user's query based on these results
2. Suggest 2-4 actionable next steps the user could take

RESPONSE FORMAT (JSON only):
{
  "summary": "Clear summary of findings...",
  "suggestedActions": [
    "Create a technical specification document",
    "Review related decisions",
    "Add more details to X"
  ]
}`;

    try {
      const response = await this.callClaude([
        {
          role: 'user',
          content: prompt
        }
      ], 1000);

      const cleanResponse = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const parsed = JSON.parse(cleanResponse);

      return {
        summary: parsed.summary || 'Search completed. Review the results below.',
        suggestedActions: parsed.suggestedActions || ['Create a document from these results', 'Refine your search']
      };
    } catch (error) {
      this.log(`AI summary generation failed: ${error}`);

      // Fallback summary
      const totalResults = results.decisions.length + results.generatedDocs.length +
                          results.userDocs.length + results.activity.length + results.references.length;

      return {
        summary: `Found ${totalResults} results across decisions, documents, and activity logs related to "${query}".`,
        suggestedActions: [
          'Review the search results below',
          'Save results as a new document',
          'Refine your search query'
        ]
      };
    }
  }
}
