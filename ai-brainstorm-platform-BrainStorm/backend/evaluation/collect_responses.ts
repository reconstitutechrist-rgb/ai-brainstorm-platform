
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { AgentCoordinationService } from '../src/services/agentCoordination';
import { supabase } from '../src/services/supabase';

// Load environment variables from backend root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const TEST_QUERIES_PATH = path.resolve(__dirname, 'test_queries.json');
const OUTPUT_PATH = path.resolve(__dirname, 'test_dataset.json');

async function main() {
  console.log('🚀 Starting evaluation response collection...');

  // 1. Setup Test User and Project
  const userId = 'eval-user-' + Date.now();
  const projectName = 'Evaluation Project ' + new Date().toISOString();
  
  console.log(`Creating test project: ${projectName} for user: ${userId}`);

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      title: projectName,
      description: 'Project for automated evaluation',
      status: 'exploring'
    })
    .select()
    .single();

  if (projectError || !project) {
    console.error('❌ Failed to create test project:', projectError);
    process.exit(1);
  }

  console.log(`✅ Project created with ID: ${project.id}`);

  // 2. Load Queries
  if (!fs.existsSync(TEST_QUERIES_PATH)) {
    console.error(`❌ Queries file not found at: ${TEST_QUERIES_PATH}`);
    process.exit(1);
  }

  const queries = JSON.parse(fs.readFileSync(TEST_QUERIES_PATH, 'utf-8'));
  console.log(`Loaded ${queries.length} queries.`);

  const coordinationService = new AgentCoordinationService();
  const results = [];

  // 3. Process Queries
  for (const [index, item] of queries.entries()) {
    const query = item.query;
    console.log(`\n[${index + 1}/${queries.length}] Processing query: "${query}"`);

    try {
      // Simulate user message
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          project_id: project.id,
          user_id: userId,
          role: 'user',
          content: query
        });
      
      if (msgError) console.warn('Warning: Failed to save user message to DB', msgError);

      const startTime = Date.now();
      const result = await coordinationService.processUserMessage(project.id, userId, query);
      const duration = Date.now() - startTime;

      console.log(`   ✅ Processed in ${duration}ms`);
      console.log(`   Intent: ${result.workflow.intent} (Confidence: ${result.workflow.confidence})`);
      console.log(`   Responses: ${result.responses.length}`);

      // Collect the main assistant response (usually the last one shown to user)
      const mainResponse = result.responses
        .filter((r: any) => r.showToUser)
        .map((r: any) => r.message)
        .join('\n\n');

      results.push({
        query: query,
        response: mainResponse,
        intent: result.workflow.intent,
        confidence: result.workflow.confidence,
        duration_ms: duration,
        full_result: result // Optional: keep full result for debugging
      });

    } catch (error) {
      console.error(`   ❌ Error processing query:`, error);
      results.push({
        query: query,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // 4. Save Results
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
  console.log(`\n✅ Evaluation dataset saved to: ${OUTPUT_PATH}`);
  console.log(`Collected ${results.length} responses.`);
}

main().catch(console.error);
