/**
 * Automated Test Script for Enhanced Natural Language Understanding
 *
 * This script makes API calls to test the improved intent classification
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';
const TEST_USER_ID = '3ab4df68-94af-4e34-9269-fb7aada73589'; // Test user from the cURL example

// Test cases organized by category
const testCases = [
  // PARKING SIGNALS
  {
    category: 'PARKING - Park Keyword',
    message: "Let's park that for later",
    expectedIntent: 'parking',
    expectedConfidence: 80
  },
  {
    category: 'PARKING - Revisit',
    message: "I'll think about it later",
    expectedIntent: 'parking',
    expectedConfidence: 75
  },
  {
    category: 'PARKING - Delay',
    message: "Hold off on that for now",
    expectedIntent: 'parking',
    expectedConfidence: 80
  },
  {
    category: 'PARKING - Deprioritize',
    message: "Table that idea",
    expectedIntent: 'parking',
    expectedConfidence: 75
  },
  {
    category: 'PARKING - Implied',
    message: "Good idea, but let's focus on authentication first",
    expectedIntent: 'parking',
    expectedConfidence: 70
  },

  // DECIDED SIGNALS
  {
    category: 'DECIDED - Commitment',
    message: "Let's do it",
    expectedIntent: 'deciding',
    expectedConfidence: 85
  },
  {
    category: 'DECIDED - Affirmation',
    message: "That works for me",
    expectedIntent: 'deciding',
    expectedConfidence: 80
  },
  {
    category: 'DECIDED - Approval',
    message: "I'm sold on that approach",
    expectedIntent: 'deciding',
    expectedConfidence: 90
  },
  {
    category: 'DECIDED - Finalization',
    message: "Lock it in",
    expectedIntent: 'deciding',
    expectedConfidence: 95
  },

  // EXPLORING SIGNALS
  {
    category: 'EXPLORING - Curiosity',
    message: "I'm curious about using GraphQL",
    expectedIntent: 'exploring',
    expectedConfidence: 75
  },
  {
    category: 'EXPLORING - Question',
    message: "What about adding a mobile app?",
    expectedIntent: 'exploring',
    expectedConfidence: 80
  },
  {
    category: 'EXPLORING - Consideration',
    message: "Worth considering a microservices architecture",
    expectedIntent: 'exploring',
    expectedConfidence: 75
  },

  // HEDGING LANGUAGE
  {
    category: 'HEDGING - Low Certainty',
    message: "I think maybe we should use React",
    expectedIntent: 'exploring', // Should be downgraded from deciding
    expectedConfidence: 60
  },
  {
    category: 'HEDGING - Moderate Certainty',
    message: "I probably want to add authentication",
    expectedIntent: 'deciding',
    expectedConfidence: 75
  },
  {
    category: 'HEDGING - High Certainty',
    message: "Definitely want to use TypeScript",
    expectedIntent: 'deciding',
    expectedConfidence: 95
  }
];

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

async function createTestSession() {
  try {
    const response = await axios.post(`${API_BASE}/sessions`, {
      userId: TEST_USER_ID,
      projectName: 'NLP Enhancement Test'
    });
    return response.data.sessionId;
  } catch (error) {
    console.error(`${colors.red}Failed to create session:${colors.reset}`, error.message);
    throw error;
  }
}

async function testIntentClassification(sessionId, testCase) {
  try {
    const response = await axios.post(`${API_BASE}/chat`, {
      userId: TEST_USER_ID,
      sessionId: sessionId,
      message: testCase.message
    });

    // Extract intent classification from response
    // The actual structure depends on your API response format
    const intent = response.data.intent || response.data.classification?.type || 'unknown';
    const confidence = response.data.confidence || response.data.classification?.confidence || 0;

    return {
      success: true,
      intent,
      confidence,
      response: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function checkResult(testCase, result) {
  if (!result.success) {
    return {
      passed: false,
      reason: `API Error: ${result.error}`
    };
  }

  const intentMatch = result.intent === testCase.expectedIntent;
  const confidenceOk = result.confidence >= (testCase.expectedConfidence - 20); // Allow 20% variance

  if (intentMatch && confidenceOk) {
    return { passed: true };
  } else if (!intentMatch) {
    return {
      passed: false,
      reason: `Intent mismatch: expected '${testCase.expectedIntent}', got '${result.intent}'`
    };
  } else {
    return {
      passed: false,
      reason: `Low confidence: expected ~${testCase.expectedConfidence}%, got ${result.confidence}%`
    };
  }
}

async function runTests() {
  console.log(`${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}║         ENHANCED NATURAL LANGUAGE UNDERSTANDING - AUTOMATED TESTS          ║${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  console.log(`${colors.blue}Creating test session...${colors.reset}`);
  const sessionId = await createTestSession();
  console.log(`${colors.green}✓ Session created: ${sessionId}${colors.reset}\n`);

  const results = {
    total: testCases.length,
    passed: 0,
    failed: 0,
    details: []
  };

  console.log(`${colors.bold}Running ${testCases.length} test cases...${colors.reset}\n`);

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const testNum = i + 1;

    process.stdout.write(`${colors.yellow}[${testNum}/${testCases.length}]${colors.reset} ${testCase.category}: "${testCase.message.substring(0, 40)}..."`);

    const result = await testIntentClassification(sessionId, testCase);
    const check = checkResult(testCase, result);

    if (check.passed) {
      console.log(` ${colors.green}✓ PASS${colors.reset}`);
      results.passed++;
      results.details.push({
        testCase,
        result,
        passed: true
      });
    } else {
      console.log(` ${colors.red}✗ FAIL${colors.reset}`);
      console.log(`  ${colors.red}  → ${check.reason}${colors.reset}`);
      results.failed++;
      results.details.push({
        testCase,
        result,
        passed: false,
        reason: check.reason
      });
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
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
      categories[cat] = { passed: 0, failed: 0 };
    }
    if (detail.passed) {
      categories[cat].passed++;
    } else {
      categories[cat].failed++;
    }
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

  // Show failed tests details
  if (results.failed > 0) {
    console.log(`${colors.bold}${colors.red}Failed Tests Details:${colors.reset}\n`);
    results.details.filter(d => !d.passed).forEach((detail, idx) => {
      console.log(`${colors.red}${idx + 1}. ${detail.testCase.category}${colors.reset}`);
      console.log(`   Message: "${detail.testCase.message}"`);
      console.log(`   Expected: ${detail.testCase.expectedIntent} (~${detail.testCase.expectedConfidence}% confidence)`);
      console.log(`   Got: ${detail.result.intent} (${detail.result.confidence}% confidence)`);
      console.log(`   Reason: ${detail.reason}\n`);
    });
  }

  return results;
}

// Run the tests
runTests()
  .then(results => {
    const exitCode = results.failed > 0 ? 1 : 0;
    process.exit(exitCode);
  })
  .catch(error => {
    console.error(`${colors.red}${colors.bold}Test execution failed:${colors.reset}`, error);
    process.exit(1);
  });
