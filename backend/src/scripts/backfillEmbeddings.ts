/**
 * Backfill Embeddings Script
 *
 * Generates embeddings for existing references and generated_documents
 * that don't have embeddings yet.
 *
 * Usage:
 *   # Backfill all projects
 *   npx ts-node backend/src/scripts/backfillEmbeddings.ts
 *
 *   # Backfill specific project
 *   npx ts-node backend/src/scripts/backfillEmbeddings.ts <projectId>
 */

import { supabase } from '../services/supabase';
import { EmbeddingService } from '../services/embeddingService';
import dotenv from 'dotenv';

dotenv.config();

const embeddingService = new EmbeddingService(supabase);

async function backfillProject(projectId: string) {
  console.log(`\n==========================================`);
  console.log(`🔄 Backfilling embeddings for project: ${projectId}`);
  console.log(`==========================================\n`);

  try {
    // Get project info
    const { data: project } = await supabase
      .from('projects')
      .select('title')
      .eq('id', projectId)
      .single();

    if (!project) {
      console.error(`❌ Project ${projectId} not found`);
      return { success: false, projectId };
    }

    console.log(`Project: ${project.title}\n`);

    // Count missing embeddings
    const { data: counts } = await supabase.rpc('count_missing_embeddings', {
      project_id_filter: projectId,
    });

    if (counts && counts.length > 0) {
      const { references_without_embeddings, documents_without_embeddings, total_missing } =
        counts[0];

      console.log(`📊 Missing Embeddings:`);
      console.log(`   - References: ${references_without_embeddings}`);
      console.log(`   - Documents: ${documents_without_embeddings}`);
      console.log(`   - Total: ${total_missing}\n`);

      if (total_missing === 0) {
        console.log(`✅ All embeddings already exist for this project\n`);
        return { success: true, projectId, processed: 0, skipped: 0 };
      }
    }

    // Backfill references
    console.log(`📁 Processing References...`);
    const referencesProcessed = await embeddingService.generateMissingReferenceEmbeddings(projectId);

    // Backfill documents
    console.log(`\n📄 Processing Generated Documents...`);
    const documentsProcessed = await embeddingService.generateMissingDocumentEmbeddings(projectId);

    const totalProcessed = referencesProcessed + documentsProcessed;

    console.log(`\n✅ Backfill complete for project ${projectId}`);
    console.log(`   Total processed: ${totalProcessed}`);

    return { success: true, projectId, processed: totalProcessed };
  } catch (error: any) {
    console.error(`\n❌ Backfill failed for project ${projectId}:`, error.message || error);
    return { success: false, projectId, error: error.message };
  }
}

async function backfillAllProjects() {
  console.log(`\n🌍 Backfilling embeddings for ALL projects...\n`);

  try {
    // Get all projects
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, title')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!projects || projects.length === 0) {
      console.log(`⚠️  No projects found`);
      return;
    }

    console.log(`Found ${projects.length} projects\n`);

    const results = [];

    for (const project of projects) {
      const result = await backfillProject(project.id);
      results.push(result);
    }

    // Summary
    console.log(`\n==========================================`);
    console.log(`📊 BACKFILL SUMMARY`);
    console.log(`==========================================\n`);

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const totalProcessed = results.reduce((sum, r) => sum + (r.processed || 0), 0);

    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📝 Total embeddings generated: ${totalProcessed}`);

    if (failed > 0) {
      console.log(`\n⚠️  Failed projects:`);
      results
        .filter((r) => !r.success)
        .forEach((r) => {
          console.log(`   - ${r.projectId}: ${r.error || 'Unknown error'}`);
        });
    }

    console.log(`\n==========================================\n`);
  } catch (error: any) {
    console.error(`\n❌ Backfill all projects failed:`, error.message || error);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const projectId = process.argv[2];

  console.log(`\n🚀 Embedding Backfill Script`);
  console.log(`============================\n`);

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
    console.error(`❌ Error: OPENAI_API_KEY not configured in .env file`);
    console.error(`   Please add a valid OpenAI API key to enable embeddings\n`);
    process.exit(1);
  }

  try {
    if (projectId) {
      // Backfill specific project
      const result = await backfillProject(projectId);
      if (!result.success) {
        process.exit(1);
      }
    } else {
      // Backfill all projects
      await backfillAllProjects();
    }

    console.log(`✅ Backfill script completed successfully\n`);
    process.exit(0);
  } catch (error: any) {
    console.error(`\n❌ Fatal error:`, error.message || error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
