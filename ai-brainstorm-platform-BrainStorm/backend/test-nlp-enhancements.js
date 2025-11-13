/**
 * Test Enhanced Natural Language Understanding
 *
 * This script tests the improved AI contextual intelligence for categorizing
 * user messages into DECIDED, EXPLORING, and PARKED states.
 */

const testCases = [
  // PARKING SIGNALS - These should be classified as "parking" intent
  {
    message: "Let's park that for later",
    expectedIntent: "parking",
    category: "PARKING - Park keyword"
  },
  {
    message: "I'll think about it later",
    expectedIntent: "parking",
    category: "PARKING - Revisit"
  },
  {
    message: "Hold off on that for now",
    expectedIntent: "parking",
    category: "PARKING - Delay"
  },
  {
    message: "Table that idea",
    expectedIntent: "parking",
    category: "PARKING - Deprioritize"
  },
  {
    message: "Good idea, but let's focus on authentication first",
    expectedIntent: "parking", // implied parking + deciding on auth
    category: "PARKING - Implied"
  },
  {
    message: "That's interesting but not a priority right now",
    expectedIntent: "parking",
    category: "PARKING - Implied deprioritization"
  },

  // DECIDED SIGNALS - These should be classified as "deciding" intent
  {
    message: "Let's do it",
    expectedIntent: "deciding",
    category: "DECIDED - Commitment"
  },
  {
    message: "That works for me",
    expectedIntent: "deciding",
    category: "DECIDED - Affirmation"
  },
  {
    message: "I'm sold on that approach",
    expectedIntent: "deciding",
    category: "DECIDED - Approval"
  },
  {
    message: "Lock it in",
    expectedIntent: "deciding",
    category: "DECIDED - Finalization"
  },
  {
    message: "Greenlight that feature",
    expectedIntent: "deciding",
    category: "DECIDED - Finalization"
  },

  // EXPLORING SIGNALS - These should be classified as "exploring" intent
  {
    message: "I'm curious about using GraphQL",
    expectedIntent: "exploring",
    category: "EXPLORING - Curiosity"
  },
  {
    message: "What about adding a mobile app?",
    expectedIntent: "exploring",
    category: "EXPLORING - Question"
  },
  {
    message: "Worth considering a microservices architecture",
    expectedIntent: "exploring",
    category: "EXPLORING - Consideration"
  },
  {
    message: "I wonder if we could use serverless",
    expectedIntent: "exploring",
    category: "EXPLORING - Curiosity"
  },

  // HEDGING LANGUAGE - These should have adjusted confidence/state
  {
    message: "I think maybe we should use React",
    expectedIntent: "exploring", // Strong hedging should downgrade from deciding
    category: "HEDGING - Low certainty"
  },
  {
    message: "I probably want to add authentication",
    expectedIntent: "deciding", // Moderate hedging, still deciding but lower confidence
    category: "HEDGING - Moderate certainty"
  },
  {
    message: "Definitely want to use TypeScript",
    expectedIntent: "deciding",
    category: "HEDGING - High certainty"
  },

  // MULTI-INTENT - These contain multiple intents
  {
    message: "I want authentication but park payments for later",
    expectedIntent: "deciding", // Primary intent, but should detect both
    category: "MULTI-INTENT - Deciding + Parking"
  },
  {
    message: "Love the dashboard idea, but profiles can wait",
    expectedIntent: "deciding", // Primary, but should detect both
    category: "MULTI-INTENT - Deciding + Parking"
  }
];

console.log("=" .repeat(80));
console.log("ENHANCED NATURAL LANGUAGE UNDERSTANDING TEST CASES");
console.log("=" .repeat(80));
console.log("\nThese test cases verify the AI can correctly categorize user messages");
console.log("into DECIDED, EXPLORING, and PARKED states based on natural language cues.\n");

console.log("📋 TEST CASES TO VALIDATE:\n");

// Group by category
const categories = {};
testCases.forEach(test => {
  const mainCategory = test.category.split(" - ")[0];
  if (!categories[mainCategory]) {
    categories[mainCategory] = [];
  }
  categories[mainCategory].push(test);
});

Object.keys(categories).forEach(category => {
  console.log(`\n${category}:`);
  console.log("-".repeat(80));
  categories[category].forEach((test, index) => {
    console.log(`  ${index + 1}. Message: "${test.message}"`);
    console.log(`     Expected Intent: ${test.expectedIntent}`);
    console.log(`     Subcategory: ${test.category.split(" - ")[1]}`);
    console.log();
  });
});

console.log("\n" + "=".repeat(80));
console.log("HOW TO TEST:");
console.log("=".repeat(80));
console.log("\n1. Start the backend server: npm run dev");
console.log("2. Open the Main Chat Page in the frontend");
console.log("3. Type each test message above");
console.log("4. Verify the AI correctly categorizes the message");
console.log("5. Check the Canvas/Suggestions panel to see if items appear in the right state\n");

console.log("WHAT TO LOOK FOR:");
console.log("-".repeat(80));
console.log("✅ PARKING messages should create items in the PARKED state");
console.log("✅ DECIDED messages should create items in the DECIDED state");
console.log("✅ EXPLORING messages should create items in the EXPLORING state");
console.log("✅ HEDGING language should adjust confidence scores appropriately");
console.log("✅ MULTI-INTENT messages should create multiple items with different states\n");

console.log("=" .repeat(80));
console.log("ENHANCED SIGNAL PATTERNS ADDED:");
console.log("=" .repeat(80));
console.log("\nPARKING (30+ new phrases):");
console.log("  • Park keywords: 'park that', 'let's park', 'parking this'");
console.log("  • Delay: 'hold off', 'hold that thought', 'not right now'");
console.log("  • Revisit: 'I'll think about it later', 'circle back to'");
console.log("  • Future: 'down the road', 'future consideration'");
console.log("  • Deprioritize: 'table that', 'back burner', 'not a priority'");
console.log("  • Implied: 'good idea, but...', 'interesting but...'");

console.log("\nDECIDED (15+ new phrases):");
console.log("  • Commitment: 'let's do it', 'let's make it happen'");
console.log("  • Approval: 'sounds perfect', 'I'm sold', 'convinced'");
console.log("  • Selection: 'I'm in', 'count me in'");
console.log("  • Affirmation: 'that works', 'that'll work'");
console.log("  • Finalization: 'approved', 'lock it in', 'greenlight that'");

console.log("\nEXPLORING (12+ new phrases):");
console.log("  • Curiosity: 'I'm curious about', 'I wonder if'");
console.log("  • Questions: 'what about', 'how about'");
console.log("  • Consideration: 'worth considering', 'open to'");

console.log("\nHEDGING LANGUAGE DETECTION:");
console.log("  • High certainty (90-100%): 'definitely', 'absolutely', 'for sure'");
console.log("  • Moderate certainty (70-85%): 'probably', 'I think we should'");
console.log("  • Low certainty (50-70%): 'I think maybe', 'might want', 'perhaps'");
console.log("  • Conditional (60-80%): 'if X works', 'assuming Y is possible'");

console.log("\nMULTI-INTENT RECOGNITION:");
console.log("  • Compound intents: 'I want X and park Y' → 2 items");
console.log("  • Preferences: 'I prefer X over Y' → X=DECIDED, Y=REJECTED");
console.log("  • Replacements: 'Let's do X instead of Y' → X=DECIDED, Y=REJECTED");

console.log("\nIMPLIED PARKING DETECTION:");
console.log("  • 'Good idea, but focus on X first' → Idea=PARKED, X=DECIDED");
console.log("  • 'That's interesting but...' → PARKED (implied)");
console.log("  • 'I like it, but not priority' → PARKED");

console.log("\n" + "=".repeat(80));
console.log("Test cases ready! Start your servers and begin testing.");
console.log("=" .repeat(80) + "\n");
