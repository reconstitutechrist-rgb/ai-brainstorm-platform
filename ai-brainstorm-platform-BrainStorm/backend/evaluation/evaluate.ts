import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const INPUT_FILE = path.resolve(__dirname, "test_dataset.json");
const OUTPUT_FILE = path.resolve(__dirname, "evaluation_results.json");

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface EvaluationResult {
  query: string;
  response: string;
  metrics: {
    relevance: { score: number; reasoning: string };
    coherence: { score: number; reasoning: string };
  };
}

async function evaluateWithLLM(
  query: string,
  response: string,
  metric: "Relevance" | "Coherence"
): Promise<{ score: number; reasoning: string }> {
  let systemPrompt = "";

  if (metric === "Relevance") {
    systemPrompt = `You are an expert AI evaluator. Your task is to rate the RELEVANCE of an AI response to a user query.
    
    Criteria:
    - 5: Perfectly relevant, addresses all aspects of the query directly.
    - 1: Completely irrelevant, does not address the query at all.
    
    Output ONLY valid JSON in this format: { "score": number, "reasoning": "string" }`;
  } else if (metric === "Coherence") {
    systemPrompt = `You are an expert AI evaluator. Your task is to rate the COHERENCE of an AI response.
    
    Criteria:
    - 5: Perfectly coherent, logical flow, clear structure, easy to follow.
    - 1: Incoherent, disjointed, grammatical errors, hard to understand.
    
    Output ONLY valid JSON in this format: { "score": number, "reasoning": "string" }`;
  }

  const userMessage = `Query: "${query}"\n\nResponse: "${response}"`;

  try {
    const completion = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229", // Or use a lighter model like haiku for speed
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const content =
      completion.content[0].type === "text" ? completion.content[0].text : "";

    // Extract JSON from response (handling potential markdown blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("No JSON found in response");
    }
  } catch (error) {
    console.error(`Error evaluating ${metric}:`, error);
    return { score: 0, reasoning: "Evaluation failed" };
  }
}

async function main() {
  console.log("🚀 Starting TypeScript Evaluation (LLM-as-a-Judge)...");

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Input file not found: ${INPUT_FILE}`);
    console.error(
      'Please run "npx ts-node evaluation/collect_responses.ts" first.'
    );
    process.exit(1);
  }

  const dataset = JSON.parse(fs.readFileSync(INPUT_FILE, "utf-8"));
  const results: EvaluationResult[] = [];

  let totalRelevance = 0;
  let totalCoherence = 0;

  for (const [index, item] of dataset.entries()) {
    console.log(
      `\n[${index + 1}/${
        dataset.length
      }] Evaluating query: "${item.query.substring(0, 50)}..."`
    );

    const relevance = await evaluateWithLLM(
      item.query,
      item.response,
      "Relevance"
    );
    const coherence = await evaluateWithLLM(
      item.query,
      item.response,
      "Coherence"
    );

    console.log(`   - Relevance: ${relevance.score}/5`);
    console.log(`   - Coherence: ${coherence.score}/5`);

    totalRelevance += relevance.score;
    totalCoherence += coherence.score;

    results.push({
      query: item.query,
      response: item.response,
      metrics: {
        relevance,
        coherence,
      },
    });
  }

  const avgRelevance = totalRelevance / dataset.length;
  const avgCoherence = totalCoherence / dataset.length;

  const finalOutput = {
    summary: {
      total_samples: dataset.length,
      average_relevance: avgRelevance,
      average_coherence: avgCoherence,
      timestamp: new Date().toISOString(),
    },
    details: results,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalOutput, null, 2));

  console.log("\n✅ Evaluation Complete!");
  console.log("-----------------------------------");
  console.log(`📊 Average Relevance: ${avgRelevance.toFixed(2)}/5`);
  console.log(`📊 Average Coherence: ${avgCoherence.toFixed(2)}/5`);
  console.log("-----------------------------------");
  console.log(`Detailed results saved to: ${OUTPUT_FILE}`);
}

main().catch(console.error);
