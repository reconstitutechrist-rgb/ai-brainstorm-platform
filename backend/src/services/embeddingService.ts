import OpenAI from 'openai';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Embedding service for semantic search
 * Uses OpenAI's text-embedding-3-small model
 */
export class EmbeddingService {
  private openai: OpenAI;
  private model = 'text-embedding-3-small'; // Cost-effective, good performance
  private supabase: SupabaseClient | null = null;

  constructor(supabase?: SupabaseClient) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.warn('[EmbeddingService] OpenAI API key not configured');
      // Create a dummy client to prevent initialization errors
      this.openai = null as any;
    } else {
      this.openai = new OpenAI({
        apiKey: apiKey,
      });
    }

    this.supabase = supabase || null;
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY in .env');
    }

    try {
      // Truncate text if too long (max 8191 tokens, ~32k characters)
      const truncatedText = text.substring(0, 32000);

      console.log(`[EmbeddingService] Generating embedding for text (${truncatedText.length} chars)`);

      const response = await this.openai.embeddings.create({
        model: this.model,
        input: truncatedText,
        encoding_format: 'float',
      });

      const embedding = response.data[0].embedding;
      console.log(`[EmbeddingService] Generated embedding with ${embedding.length} dimensions`);

      return embedding;
    } catch (error: any) {
      console.error('[EmbeddingService] Error generating embedding:', error.message);
      
      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key');
      } else if (error.status === 429) {
        throw new Error('OpenAI API rate limit exceeded');
      } else if (error.status === 500) {
        throw new Error('OpenAI API service error');
      }
      
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY in .env');
    }

    try {
      // Truncate texts if too long
      const truncatedTexts = texts.map(text => text.substring(0, 32000));

      console.log(`[EmbeddingService] Generating embeddings for ${texts.length} texts`);

      const response = await this.openai.embeddings.create({
        model: this.model,
        input: truncatedTexts,
        encoding_format: 'float',
      });

      const embeddings = response.data.map(item => item.embedding);
      console.log(`[EmbeddingService] Generated ${embeddings.length} embeddings`);

      return embeddings;
    } catch (error: any) {
      console.error('[EmbeddingService] Error generating embeddings batch:', error.message);
      
      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key');
      } else if (error.status === 429) {
        throw new Error('OpenAI API rate limit exceeded');
      } else if (error.status === 500) {
        throw new Error('OpenAI API service error');
      }
      
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Find most similar vectors from a list
   */
  findMostSimilar(
    queryEmbedding: number[],
    embeddings: Array<{ id: string; embedding: number[]; metadata?: any }>,
    topK: number = 5
  ): Array<{ id: string; similarity: number; metadata?: any }> {
    const similarities = embeddings.map(item => ({
      id: item.id,
      similarity: this.cosineSimilarity(queryEmbedding, item.embedding),
      metadata: item.metadata,
    }));

    // Sort by similarity (descending)
    similarities.sort((a, b) => b.similarity - a.similarity);

    return similarities.slice(0, topK);
  }

  /**
   * Check if the service is configured
   */
  isConfigured(): boolean {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  /**
   * Get embedding model info
   */
  getModelInfo() {
    return {
      model: this.model,
      dimensions: 1536, // text-embedding-3-small dimensions
      maxTokens: 8191,
      costPer1MTokens: 0.02, // $0.02 per 1M tokens
    };
  }

  /**
   * Generate and store embedding for a reference
   * Used by references.ts for automatic embedding generation
   */
  async generateAndStoreReferenceEmbedding(referenceId: string, content: string): Promise<void> {
    if (!this.supabase) {
      console.warn('[EmbeddingService] Supabase client not provided, cannot store embedding');
      return;
    }

    try {
      console.log(`[EmbeddingService] Generating embedding for reference ${referenceId}`);

      // Generate embedding
      const embedding = await this.generateEmbedding(content);

      // Store in database
      const { error } = await this.supabase
        .from('reference_embeddings')
        .upsert({
          reference_id: referenceId,
          embedding: embedding,
          content_preview: content.substring(0, 500), // Store preview for debugging
          created_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      console.log(`[EmbeddingService] Successfully stored embedding for reference ${referenceId}`);
    } catch (error: any) {
      console.error(`[EmbeddingService] Failed to generate/store embedding for ${referenceId}:`, error.message);
      throw error;
    }
  }

  /**
   * Generate and store embedding for a conversation message
   * Used by conversations.ts for automatic embedding generation
   */
  async generateAndStoreMessageEmbedding(messageId: string, content: string): Promise<void> {
    if (!this.supabase) {
      console.warn('[EmbeddingService] Supabase client not provided, cannot store embedding');
      return;
    }

    try {
      console.log(`[EmbeddingService] Generating embedding for message ${messageId}`);

      // Generate embedding
      const embedding = await this.generateEmbedding(content);

      // Store in database
      const { error } = await this.supabase
        .from('message_embeddings')
        .upsert({
          message_id: messageId,
          embedding: embedding,
          content_preview: content.substring(0, 500), // Store preview for debugging
          created_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      console.log(`[EmbeddingService] Successfully stored embedding for message ${messageId}`);
    } catch (error: any) {
      console.error(`[EmbeddingService] Failed to generate/store embedding for ${messageId}:`, error.message);
      throw error;
    }
  }

  /**
   * Generate missing embeddings for all messages in a project
   * Used by conversations.ts backfill endpoint
   */
  async generateMissingEmbeddings(projectId: string): Promise<number> {
    if (!this.supabase) {
      console.warn('[EmbeddingService] Supabase client not provided, cannot generate embeddings');
      return 0;
    }

    try {
      console.log(`[EmbeddingService] Finding messages without embeddings for project ${projectId}`);

      // Find all messages in this project without embeddings
      const { data: messages, error: fetchError } = await this.supabase
        .from('conversation_messages')
        .select('id, content')
        .eq('project_id', projectId)
        .is('embedding', null);

      if (fetchError) {
        throw fetchError;
      }

      if (!messages || messages.length === 0) {
        console.log('[EmbeddingService] No messages found without embeddings');
        return 0;
      }

      console.log(`[EmbeddingService] Generating embeddings for ${messages.length} messages`);

      // Generate embeddings for each message
      let processedCount = 0;
      for (const message of messages) {
        try {
          await this.generateAndStoreMessageEmbedding(message.id, message.content);
          processedCount++;
        } catch (err: any) {
          console.error(`[EmbeddingService] Failed to generate embedding for message ${message.id}:`, err.message);
          // Continue with other messages
        }
      }

      console.log(`[EmbeddingService] Successfully generated ${processedCount} embeddings`);
      return processedCount;
    } catch (error: any) {
      console.error(`[EmbeddingService] Failed to generate missing embeddings:`, error.message);
      throw error;
    }
  }

  /**
   * Generate missing embeddings for all references in a project
   * Used by backfillEmbeddings.ts script
   */
  async generateMissingReferenceEmbeddings(projectId: string): Promise<number> {
    if (!this.supabase) {
      console.warn('[EmbeddingService] Supabase client not provided, cannot generate embeddings');
      return 0;
    }

    try {
      console.log(`[EmbeddingService] Finding references without embeddings for project ${projectId}`);

      // Find all references in this project without embeddings
      const { data: references, error: fetchError } = await this.supabase
        .from('references')
        .select('id, extracted_content')
        .eq('project_id', projectId)
        .not('extracted_content', 'is', null)
        .is('embedding', null);

      if (fetchError) {
        throw fetchError;
      }

      if (!references || references.length === 0) {
        console.log('[EmbeddingService] No references found without embeddings');
        return 0;
      }

      console.log(`[EmbeddingService] Generating embeddings for ${references.length} references`);

      // Generate embeddings for each reference
      let processedCount = 0;
      for (const reference of references) {
        try {
          await this.generateAndStoreReferenceEmbedding(reference.id, reference.extracted_content);
          processedCount++;
        } catch (err: any) {
          console.error(`[EmbeddingService] Failed to generate embedding for reference ${reference.id}:`, err.message);
          // Continue with other references
        }
      }

      console.log(`[EmbeddingService] Successfully generated ${processedCount} reference embeddings`);
      return processedCount;
    } catch (error: any) {
      console.error(`[EmbeddingService] Failed to generate missing reference embeddings:`, error.message);
      throw error;
    }
  }

  /**
   * Generate missing embeddings for all documents in a project
   * Used by backfillEmbeddings.ts script
   */
  async generateMissingDocumentEmbeddings(projectId: string): Promise<number> {
    if (!this.supabase) {
      console.warn('[EmbeddingService] Supabase client not provided, cannot generate embeddings');
      return 0;
    }

    try {
      console.log(`[EmbeddingService] Finding documents without embeddings for project ${projectId}`);

      // Find all documents in this project without embeddings by checking the embeddings table
      const { data: documents, error: fetchError } = await this.supabase
        .from('generated_documents')
        .select('id, content')
        .eq('project_id', projectId)
        .not('content', 'is', null);

      if (fetchError) {
        throw fetchError;
      }

      if (!documents || documents.length === 0) {
        console.log('[EmbeddingService] No documents found');
        return 0;
      }

      // Filter out documents that already have embeddings
      const documentsWithoutEmbeddings = [];
      for (const doc of documents) {
        const { data: existing } = await this.supabase
          .from('document_embeddings')
          .select('document_id')
          .eq('document_id', doc.id)
          .single();

        if (!existing) {
          documentsWithoutEmbeddings.push(doc);
        }
      }

      if (documentsWithoutEmbeddings.length === 0) {
        console.log('[EmbeddingService] No documents found without embeddings');
        return 0;
      }

      console.log(`[EmbeddingService] Generating embeddings for ${documentsWithoutEmbeddings.length} documents`);

      // Generate embeddings for each document
      let processedCount = 0;
      for (const document of documentsWithoutEmbeddings) {
        try {
          await this.generateAndStoreDocumentEmbedding(document.id, document.content);
          processedCount++;
        } catch (err: any) {
          console.error(`[EmbeddingService] Failed to generate embedding for document ${document.id}:`, err.message);
          // Continue with other documents
        }
      }

      console.log(`[EmbeddingService] Successfully generated ${processedCount} document embeddings`);
      return processedCount;
    } catch (error: any) {
      console.error(`[EmbeddingService] Failed to generate missing document embeddings:`, error.message);
      throw error;
    }
  }

  /**
   * Generate and store embedding for a generated document
   * Used by generatedDocumentsService.ts for automatic embedding generation
   */
  async generateAndStoreDocumentEmbedding(documentId: string, content: string): Promise<void> {
    if (!this.supabase) {
      console.warn('[EmbeddingService] Supabase client not provided, cannot store embedding');
      return;
    }

    try {
      console.log(`[EmbeddingService] Generating embedding for document ${documentId}`);

      // Generate embedding
      const embedding = await this.generateEmbedding(content);

      // Store in database
      const { error } = await this.supabase
        .from('document_embeddings')
        .upsert({
          document_id: documentId,
          embedding: embedding,
          content_preview: content.substring(0, 500), // Store preview for debugging
          created_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      console.log(`[EmbeddingService] Successfully stored embedding for document ${documentId}`);
    } catch (error: any) {
      console.error(`[EmbeddingService] Failed to generate/store embedding for ${documentId}:`, error.message);
      throw error;
    }
  }

  /**
   * Find relevant messages for document generation using semantic search
   * Used by generatedDocumentsService.ts to find contextually relevant messages
   */
  async findRelevantMessagesForDocument(
    documentType: string,
    projectId: string,
    limit: number = 50
  ): Promise<any[]> {
    if (!this.supabase) {
      console.warn('[EmbeddingService] Supabase client not provided, cannot search messages');
      return [];
    }

    try {
      console.log(`[EmbeddingService] Finding relevant messages for ${documentType} in project ${projectId}`);

      // Generate query embedding from document type
      const queryText = `Generate ${documentType} document for project`;
      const queryEmbedding = await this.generateEmbedding(queryText);

      // Use Supabase's vector similarity search
      const { data, error } = await this.supabase.rpc('match_messages', {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: limit,
        filter_project_id: projectId,
      });

      if (error) {
        console.error('[EmbeddingService] Error searching messages:', error);
        throw error;
      }

      console.log(`[EmbeddingService] Found ${data?.length || 0} relevant messages`);
      return data || [];
    } catch (error: any) {
      console.error(`[EmbeddingService] Failed to find relevant messages:`, error.message);
      // Return empty array on error to allow fallback to other methods
      return [];
    }
  }
}

// Singleton instance (without supabase - will be created per-use in routes)
// Only create if OpenAI API key is configured
export const embeddingService = process.env.OPENAI_API_KEY
  ? new EmbeddingService()
  : null;
