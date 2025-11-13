/**
 * Direct test of the ContextManager and PersistenceManager agents
 * Tests the enhanced NLP without needing the full API
 */

const path = require('path');

// Load the agents directly
const { ContextManagerAgent } = require('./src/agents/contextManager');
const { PersistenceManagerAgent } = require('./src/agents/persistenceManager');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Test cases
const testCases = [
  // PARKING SIGNALS
  { category: 'PARKING - Park Keyword', message: "Let's park that for later", expectedIntent: 'parking' },
  { category: 'PARKING - Revisit', message: "I'll think about it later", expectedIntent: 'parking' },
  { category: 'PARKING - Delay', message: "Hold off on that for now", expectedIntent: 'parking' },
  { category: 'PARKING - Deprioritize', message: "Table that idea", expectedIntent: 'parking' },
  { category: 'PARKING - Implied', message: "Good idea, but let's focus on authentication first", expectedIntent: 'parking' },

  // DECIDED SIGNALS
  { category: 'DECIDED - Commitment', message: "Let's do it", expectedIntent: 'deciding' },
  { category: 'DECIDED - Affirmation', message: "That works for me", expectedIntent: 'deciding' },
  { category: 'DECIDED - Approval', message: "I'm sold on that approach", expectedIntent: 'deciding' },
  { category: 'DECIDED - Finalization', message: "Lock it in", expectedIntent: 'deciding' },
  { category: 'DECIDED - Greenlight', message: "Greenlight that feature", expectedIntent: 'deciding' },

  // EXPLORING SIGNALS
  { category: 'EXPLORING - Curiosity', message: "I'm curious about using GraphQL", expectedIntent: 'exploring' },
  { category: 'EXPLORING - Question', message: "What about adding a mobile app?", expectedIntent: 'exploring' },
  { category: 'EXPLORING - Consideration', message: "Worth considering a microservices architecture", expectedIntent: 'exploring' },

  // HEDGING LANGUAGE
  { category: 'HEDGING - Low Certainty', message: "I think maybe we should use React", expectedIntent: 'exploring' },
  { category: 'HEDGING - Moderate', message: "I probably want to add authentication", expectedIntent: 'deciding' },
  { category: 'HEDGING - High Certainty', message: "Definitely want to use TypeScript", expectedIntent: 'deciding' },
];

async function runTests() {
  console.log(`${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}║         ENHANCED NATURAL LANGUAGE UNDERSTANDING - DIRECT TESTS            ║${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  const contextManager = new ContextManagerAgent();

  const results = {
    total: testCases.length,
    passed: 0,
    failed: 0,
    details: []
  };

  console.log(`${colors.blue}Testing ${testCases.length} cases with ContextManagerAgent...${colors.reset}\n`);

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const testNum = i + 1;

    process.stdout.write(`${colors.yellow}[${testNum}/${testCases.length}]${colors.reset} ${testCase.category}: `);

    try {
      // Call the classifyIntent method
      const result = await contextManager.classifyIntent(testCase.message, []);

      const intentMatch = result.type === testCase.expectedIntent;

      if (intentMatch) {
        console.log(`${colors.green}✓ PASS${colors.reset} (${result.type}, ${result.confidence}% confidence)`);
        results.passed++;
        results.details.push({
          testCase,
          result,
          passed: true
        });
      } else {
        console.log(`${colors.red}✗ FAIL${colors.reset}`);
        console.log(`  ${colors.red}  → Expected: ${testCase.expectedIntent}, Got: ${result.type} (${result.confidence}% confidence)${colors.reset}`);
        results.failed++;
        results.details.push({
          testCase,
          result,
          passed: false,
          reason: `Intent mismatch: expected '${testCase.expectedIntent}', got '${result.type}'`
        });
      }
    } catch (error) {
      console.log(`${colors.red}✗ ERROR${colors.reset}`);
      console.log(`  ${colors.red}  → ${error.message}${colors.reset}`);
      results.failed++;
      results.details.push({
        testCase,
        result: null,
        passed: false,
        reason: `Error: ${error.message}`
      });
    }

    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Print summary
  console.log(`\n${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}TEST SUMMARY${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════════════════${colors.reset}\n`);

  console.log(`Total Tests:  ${results.total}`);
  console.log(`${colors.green}Passed:       ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed:       ${results.failed}${colors.reset}`);
  console.log(`Success Rate: ${Math.round((results.passed / results.total) * 100)}%\n`);

  // Group results by category
  const categories = {};
  results.details.forEach(detail => {
    const cat = detail.testCase.category.split(' - ')[0];
    if (!categories[cat]) {
      categories[cat] = { passed: 0, failed: 0, tests: [] };
    }
    if (detail.passed) {
      categories[cat].passed++;
    } else {
      categories[cat].failed++;
    }
    categories[cat].tests.push(detail);
  });

  console.log(`${colors.bold}Results by Category:${colors.reset}`);
  Object.keys(categories).forEach(cat => {
    const stats = categories[cat];
    const total = stats.passed + stats.failed;
    const rate = Math.round((stats.passed / total) * 100);
    const color = rate >= 80 ? colors.green : rate >= 60 ? colors.yellow : colors.red;
    console.log(`  ${cat}: ${color}${stats.passed}/${total} (${rate}%)${colors.reset}`);
  });

  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════════════════════════${colors.reset}\n`);

  // Show sample successful detections
  console.log(`${colors.bold}${colors.green}✓ Sample Successful Detections:${colors.reset}\n`);
  const successSamples = results.details.filter(d => d.passed).slice(0, 5);
  successSamples.forEach((detail, idx) => {
    console.log(`${colors.green}${idx + 1}. ${detail.testCase.category}${colors.reset}`);
    console.log(`   "${detail.testCase.message}"`);
    console.log(`   → Correctly classified as: ${detail.result.type} (${detail.result.confidence}% confidence)\n`);
  });

  // Show failed tests details
  if (results.failed > 0) {
    console.log(`${colors.bold}${colors.red}✗ Failed Tests:${colors.reset}\n`);
    results.details.filter(d => !d.passed).forEach((detail, idx) => {
      console.log(`${colors.red}${idx + 1}. ${detail.testCase.category}${colors.reset}`);
      console.log(`   "${detail.testCase.message}"`);
      console.log(`   Expected: ${detail.testCase.expectedIntent}`);
      if (detail.result) {
        console.log(`   Got: ${detail.result.type} (${detail.result.confidence}% confidence)`);
      }
      console.log(`   Reason: ${detail.reason}\n`);
    });
  }

  return results;
}

// Run the tests
console.log(`${colors.blue}Note: This test calls the Claude API directly, so it may take 1-2 minutes to complete.${colors.reset}\n`);

runTests()
  .then(results => {
    const exitCode = results.failed > 0 ? 1 : 0;
    console.log(`\n${colors.bold}Tests completed with exit code: ${exitCode}${colors.reset}\n`);
    process.exit(exitCode);
  })
  .catch(error => {
    console.error(`${colors.red}${colors.bold}Test execution failed:${colors.reset}`, error);
    process.exit(1);
  });
