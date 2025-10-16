import { supabase } from './supabase';

export interface SearchResult {
  id: string;
  type: 'project' | 'message' | 'document' | 'reference';
  title: string;
  content: string;
  date: string;
  relevance: number;
  projectId?: string;
}

export interface SearchOptions {
  limit?: number;
  types?: Array<'project' | 'message' | 'document' | 'reference'>;
  projectId?: string;
}

/**
 * Performs a comprehensive search across all project data
 */
export async function universalSearch(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const { limit = 20, types, projectId } = options;

  if (!query || query.length < 2) {
    return [];
  }

  const searchPattern = `%${query.toLowerCase()}%`;
  const allResults: SearchResult[] = [];
  const shouldSearch = (type: string) => !types || types.includes(type as any);

  try {
    // Search projects
    if (shouldSearch('project')) {
      const projectQuery = supabase
        .from('projects')
        .select('id, title, description, status, updated_at')
        .or(`title.ilike.${searchPattern},description.ilike.${searchPattern}`)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (projectId) {
        projectQuery.eq('id', projectId);
      }

      const { data: projects, error: projectsError } = await projectQuery;

      if (projectsError) {
        console.error('Error searching projects:', projectsError);
      } else if (projects) {
        allResults.push(
          ...projects.map((p) => ({
            id: p.id,
            type: 'project' as const,
            title: p.title,
            content: p.description || `Status: ${p.status}`,
            date: p.updated_at,
            relevance: calculateRelevance(query, p.title, p.description),
            projectId: p.id,
          }))
        );
      }
    }

    // Search messages
    if (shouldSearch('message')) {
      const messageQuery = supabase
        .from('messages')
        .select('id, project_id, content, role, agent_type, created_at')
        .ilike('content', searchPattern)
        .order('created_at', { ascending: false })
        .limit(15);

      if (projectId) {
        messageQuery.eq('project_id', projectId);
      }

      const { data: messages, error: messagesError } = await messageQuery;

      if (messagesError) {
        console.error('Error searching messages:', messagesError);
      } else if (messages) {
        allResults.push(
          ...messages.map((m) => ({
            id: m.id,
            type: 'message' as const,
            title: `${m.role === 'user' ? 'You' : 'Assistant'}${
              m.agent_type ? ` (${m.agent_type})` : ''
            }`,
            content: m.content.substring(0, 150),
            date: m.created_at,
            relevance: calculateRelevance(query, m.content),
            projectId: m.project_id,
          }))
        );
      }
    }

    // Search documents
    if (shouldSearch('document')) {
      const documentQuery = supabase
        .from('documents')
        .select('id, project_id, filename, description, created_at')
        .or(`filename.ilike.${searchPattern},description.ilike.${searchPattern}`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (projectId) {
        documentQuery.eq('project_id', projectId);
      }

      const { data: documents, error: documentsError } = await documentQuery;

      if (documentsError) {
        console.error('Error searching documents:', documentsError);
      } else if (documents) {
        allResults.push(
          ...documents.map((d) => ({
            id: d.id,
            type: 'document' as const,
            title: d.filename,
            content: d.description || 'Document file',
            date: d.created_at,
            relevance: calculateRelevance(query, d.filename, d.description),
            projectId: d.project_id,
          }))
        );
      }
    }

    // Search references
    if (shouldSearch('reference')) {
      const referenceQuery = supabase
        .from('references')
        .select('id, project_id, filename, type, analysis, created_at')
        .or(`filename.ilike.${searchPattern},analysis.ilike.${searchPattern}`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (projectId) {
        referenceQuery.eq('project_id', projectId);
      }

      const { data: references, error: referencesError } = await referenceQuery;

      if (referencesError) {
        console.error('Error searching references:', referencesError);
      } else if (references) {
        allResults.push(
          ...references.map((r) => ({
            id: r.id,
            type: 'reference' as const,
            title: r.filename || `${r.type} reference`,
            content: r.analysis || `${r.type} file`,
            date: r.created_at,
            relevance: calculateRelevance(query, r.filename, r.analysis),
            projectId: r.project_id,
          }))
        );
      }
    }

    // Sort by relevance
    allResults.sort((a, b) => b.relevance - a.relevance);

    // Limit total results
    return allResults.slice(0, limit);
  } catch (error) {
    console.error('Universal search error:', error);
    return [];
  }
}

/**
 * Calculate relevance score for search results (0-100)
 */
function calculateRelevance(query: string, ...texts: (string | null | undefined)[]): number {
  const queryLower = query.toLowerCase();
  let maxRelevance = 0;

  for (const text of texts) {
    if (!text) continue;
    const textLower = text.toLowerCase();

    // Exact match
    if (textLower === queryLower) {
      maxRelevance = Math.max(maxRelevance, 100);
      continue;
    }

    // Starts with query
    if (textLower.startsWith(queryLower)) {
      maxRelevance = Math.max(maxRelevance, 95);
      continue;
    }

    // Contains query as whole word
    const words = textLower.split(/\s+/);
    if (words.some((word) => word === queryLower)) {
      maxRelevance = Math.max(maxRelevance, 90);
      continue;
    }

    // Contains query
    if (textLower.includes(queryLower)) {
      const position = textLower.indexOf(queryLower);
      const relativePosition = position / textLower.length;
      maxRelevance = Math.max(maxRelevance, Math.floor(85 - relativePosition * 10));
      continue;
    }

    // Fuzzy match (check if all query characters appear in order)
    let queryIndex = 0;
    for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
      if (textLower[i] === queryLower[queryIndex]) {
        queryIndex++;
      }
    }
    if (queryIndex === queryLower.length) {
      maxRelevance = Math.max(maxRelevance, 70);
    }
  }

  return maxRelevance;
}

/**
 * Format date for display in search results
 */
export function formatSearchDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;

  return date.toLocaleDateString();
}
