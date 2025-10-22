import { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Initialize OpenAI only if API key is provided
const openai = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here'
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Model configuration
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

// In-memory cache for embeddings (LRU cache with max 1000 entries)
class EmbeddingCache {
  private cache = new Map<string, number[]>();
  private maxSize = 1000;

  get(text: string): number[] | undefined {
    return this.cache.get(text);
  }

  set(text: string, embedding: number[]): void {
    // Simple LRU: if cache is full, delete oldest entry
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(text, embedding);
  }

  clear(): void {
    this.cache.clear();
  }
}

const embeddingCache = new EmbeddingCache();

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
}

export interface SimilarMessage {
  id: string;
  content: string;
  role: string;
  created_at: string;
  similarity: number;
}

export interface RelevantMessage {
  id: string;
  content: string;
  role: string;
  created_at: string;
  has_citation: boolean;
  relevance_score: number;
}

export class EmbeddingService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Generate embedding for a text string
   * Uses caching to avoid redundant API calls
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!openai) {
      throw new Error('OpenAI API key not configured. Embeddings feature is disabled.');
    }

    // Check cache first
    const cached = embeddingCache.get(text);
    if (cached) {
      return {
        embedding: cached,
        model: EMBEDDING_MODEL,
        dimensions: EMBEDDING_DIMENSIONS,
      };
    }

    // Clean and truncate text if needed (OpenAI has 8191 token limit)
    const cleanText = text.trim().substring(0, 8000); // Conservative limit

    // Generate embedding using OpenAI
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: cleanText,
      encoding_format: 'float',
    });

    const embedding = response.data[0].embedding;

    // Cache the result
    embeddingCache.set(text, embedding);

    return {
      embedding,
      model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
    };
  }

  /**
   * Generate and store embedding for a message
   */
  async generateAndStoreMessageEmbedding(messageId: string, content: string): Promise<void> {
    const result = await this.generateEmbedding(content);

    await this.supabase
      .from('messages')
      .update({
        embedding: JSON.stringify(result.embedding),
        embedding_model: result.model,
        embedding_generated_at: new Date().toISOString(),
      })
      .eq('id', messageId);
  }

  /**
   * Generate embeddings for all messages without embeddings in a project
   */
  async generateMissingEmbeddings(projectId: string): Promise<number> {
    // Fetch messages without embeddings
    const { data: messages, error } = await this.supabase
      .from('messages')
      .select('id, content')
      .eq('project_id', projectId)
      .is('embedding', null);

    if (error || !messages) {
      throw new Error(`Failed to fetch messages: ${error?.message}`);
    }

    // Generate embeddings in batches of 100 (OpenAI allows batch requests)
    const batchSize = 100;
    let processedCount = 0;

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);

      // Process batch in parallel
      await Promise.all(
        batch.map((message) =>
          this.generateAndStoreMessageEmbedding(message.id, message.content).catch((err) => {
            console.error(`Failed to generate embedding for message ${message.id}:`, err);
          })
        )
      );

      processedCount += batch.length;
      console.log(`Processed ${processedCount}/${messages.length} embeddings`);
    }

    return processedCount;
  }

  /**
   * Find semantically similar messages using vector search
   */
  async findSimilarMessages(
    queryText: string,
    projectId: string,
    options: {
      similarityThreshold?: number;
      maxResults?: number;
    } = {}
  ): Promise<SimilarMessage[]> {
    const { similarityThreshold = 0.7, maxResults = 20 } = options;

    // Generate embedding for query
    const queryEmbedding = await this.generateEmbedding(queryText);

    // Call PostgreSQL function for similarity search
    const { data, error } = await this.supabase.rpc('find_similar_messages', {
      query_embedding: JSON.stringify(queryEmbedding.embedding),
      project_id_filter: projectId,
      similarity_threshold: similarityThreshold,
      max_results: maxResults,
    });

    if (error) {
      throw new Error(`Failed to find similar messages: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Find relevant messages for document generation
   * Prioritizes messages with citations and uses semantic similarity
   */
  async findRelevantMessagesForDocument(
    documentType: string,
    projectId: string,
    maxResults: number = 50
  ): Promise<RelevantMessage[]> {
    // Create a query based on document type
    const documentQueries: Record<string, string> = {
      project_brief: 'project overview, goals, scope, objectives, requirements',
      decision_log: 'decisions made, choices, selected options, commitments',
      rejection_log: 'rejected ideas, dismissed options, what we decided not to do',
      technical_specs: 'technical requirements, architecture, technology stack, implementation details',
      project_establishment: 'project charter, governance, stakeholders, team structure',
      rfp: 'vendor requirements, procurement, request for proposal',
      implementation_plan: 'execution plan, timeline, milestones, tasks',
      vendor_comparison: 'vendor options, comparisons, evaluations',
      next_steps: 'action items, next steps, to-do, follow-up tasks',
      open_questions: 'questions, uncertainties, unresolved issues',
      risk_assessment: 'risks, challenges, concerns, potential problems',
    };

    const queryText = documentQueries[documentType] || documentType;

    // Generate embedding for the query
    const queryEmbedding = await this.generateEmbedding(queryText);

    // Call PostgreSQL function for relevance search
    const { data, error } = await this.supabase.rpc('find_relevant_messages_for_document', {
      query_embedding: JSON.stringify(queryEmbedding.embedding),
      project_id_filter: projectId,
      max_results: maxResults,
    });

    if (error) {
      throw new Error(`Failed to find relevant messages: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get contextual window of messages around a specific message
   * Useful for getting conversation flow context
   */
  async getContextualWindow(
    messageId: string,
    windowSize: number = 5
  ): Promise<any[]> {
    // Get the target message first
    const { data: targetMessage, error: targetError } = await this.supabase
      .from('messages')
      .select('created_at, project_id')
      .eq('id', messageId)
      .single();

    if (targetError || !targetMessage) {
      throw new Error(`Failed to fetch target message: ${targetError?.message}`);
    }

    // Get messages before and after
    const { data: messages, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('project_id', targetMessage.project_id)
      .gte('created_at', new Date(new Date(targetMessage.created_at).getTime() - 1000 * 60 * 30).toISOString()) // 30 min before
      .lte('created_at', new Date(new Date(targetMessage.created_at).getTime() + 1000 * 60 * 30).toISOString()) // 30 min after
      .order('created_at', { ascending: true })
      .limit(windowSize * 2 + 1);

    if (error) {
      throw new Error(`Failed to fetch contextual window: ${error.message}`);
    }

    return messages || [];
  }

  /**
   * Clear the in-memory cache
   */
  clearCache(): void {
    embeddingCache.clear();
  }

  /**
   * Generate and store embedding for a reference
   */
  async generateAndStoreReferenceEmbedding(referenceId: string, content: string): Promise<void> {
    if (!content || content.trim().length === 0) {
      console.log(`[Embedding] Skipping reference ${referenceId} - no content`);
      return;
    }

    const result = await this.generateEmbedding(content);

    await this.supabase
      .from('references')
      .update({
        embedding: JSON.stringify(result.embedding),
        embedding_model: result.model,
        embedding_generated_at: new Date().toISOString(),
      })
      .eq('id', referenceId);

    console.log(`[Embedding] Generated embedding for reference ${referenceId}`);
  }

  /**
   * Generate and store embedding for a generated document
   */
  async generateAndStoreDocumentEmbedding(documentId: string, content: string): Promise<void> {
    if (!content || content.trim().length === 0) {
      console.log(`[Embedding] Skipping document ${documentId} - no content`);
      return;
    }

    const result = await this.generateEmbedding(content);

    await this.supabase
      .from('generated_documents')
      .update({
        embedding: JSON.stringify(result.embedding),
        embedding_model: result.model,
        embedding_generated_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    console.log(`[Embedding] Generated embedding for document ${documentId}`);
  }

  /**
   * Generate embeddings for all references without embeddings in a project
   */
  async generateMissingReferenceEmbeddings(projectId: string): Promise<number> {
    console.log(`[Embedding] Generating missing reference embeddings for project ${projectId}...`);

    // Fetch references without embeddings
    const { data: references, error } = await this.supabase
      .from('references')
      .select('id, metadata')
      .eq('project_id', projectId)
      .is('embedding', null);

    if (error || !references) {
      throw new Error(`Failed to fetch references: ${error?.message}`);
    }

    console.log(`[Embedding] Found ${references.length} references without embeddings`);

    let processedCount = 0;
    let skippedCount = 0;

    // Process in batches of 50 to avoid rate limits
    const batchSize = 50;
    for (let i = 0; i < references.length; i += batchSize) {
      const batch = references.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (reference) => {
          try {
            // Extract content from metadata
            const content =
              reference.metadata?.extractedContent ||
              reference.metadata?.analysis ||
              '';

            if (content && content.trim().length > 0) {
              await this.generateAndStoreReferenceEmbedding(reference.id, content);
              processedCount++;
            } else {
              console.log(`[Embedding] Skipping reference ${reference.id} - no content`);
              skippedCount++;
            }
          } catch (err) {
            console.error(`[Embedding] Failed for reference ${reference.id}:`, err);
          }
        })
      );

      console.log(`[Embedding] Processed ${Math.min(i + batchSize, references.length)}/${references.length} references`);
    }

    console.log(`[Embedding] Completed: ${processedCount} processed, ${skippedCount} skipped`);
    return processedCount;
  }

  /**
   * Generate embeddings for all generated_documents without embeddings in a project
   */
  async generateMissingDocumentEmbeddings(projectId: string): Promise<number> {
    console.log(`[Embedding] Generating missing document embeddings for project ${projectId}...`);

    // Fetch documents without embeddings
    const { data: documents, error } = await this.supabase
      .from('generated_documents')
      .select('id, content')
      .eq('project_id', projectId)
      .is('embedding', null);

    if (error || !documents) {
      throw new Error(`Failed to fetch documents: ${error?.message}`);
    }

    console.log(`[Embedding] Found ${documents.length} documents without embeddings`);

    let processedCount = 0;
    let skippedCount = 0;

    // Process in batches of 50
    const batchSize = 50;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (document) => {
          try {
            if (document.content && document.content.trim().length > 0) {
              await this.generateAndStoreDocumentEmbedding(document.id, document.content);
              processedCount++;
            } else {
              console.log(`[Embedding] Skipping document ${document.id} - no content`);
              skippedCount++;
            }
          } catch (err) {
            console.error(`[Embedding] Failed for document ${document.id}:`, err);
          }
        })
      );

      console.log(`[Embedding] Processed ${Math.min(i + batchSize, documents.length)}/${documents.length} documents`);
    }

    console.log(`[Embedding] Completed: ${processedCount} processed, ${skippedCount} skipped`);
    return processedCount;
  }
}

/**
 * Standalone function for unified semantic search across references and generated_documents
 * Used by UnifiedResearchAgent
 */
export async function searchSemanticSimilarity(
  query: string,
  projectId: string,
  maxResults: number = 10,
  supabaseClient?: SupabaseClient
): Promise<Array<{
  id: string;
  type: 'reference' | 'generated_document';
  filename: string;
  content: string;
  score: number;
}>> {
  // Use provided client or import from supabase service
  const client = supabaseClient || (await import('./supabase')).supabase;

  // Create temporary embedding service instance
  const embeddingService = new EmbeddingService(client);

  try {
    // Generate embedding for query
    const queryEmbedding = await embeddingService.generateEmbedding(query);

    // Call PostgreSQL function for unified search
    const { data, error } = await client.rpc('search_semantic_similarity', {
      query_embedding: JSON.stringify(queryEmbedding.embedding),
      project_id_filter: projectId,
      similarity_threshold: 0.6, // Lower threshold for broader results
      max_results: maxResults,
    });

    if (error) {
      throw new Error(`Failed to search semantic similarity: ${error.message}`);
    }

    // Transform results to expected format
    return (data || []).map((item: any) => ({
      id: item.id,
      type: item.type as 'reference' | 'generated_document',
      filename: item.filename,
      content: item.content,
      score: item.similarity,
    }));
  } catch (error: any) {
    console.error('[searchSemanticSimilarity] Error:', error);
    throw error;
  }
}
