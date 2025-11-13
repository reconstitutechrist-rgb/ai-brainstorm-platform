/**
 * Simple Test: Session Review Speed Optimization
 * Tests if the cached topic grouping makes session review instant
 */

const API_BASE = 'http://localhost:3001/api';
const CONVERSATION_ID = '965bcaca-4afc-4881-93e2-9d71b4735bae'; // Existing conversation

async function testSpeed() {
  console.log('\n🧪 Session Review Speed Test\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Send a test message to trigger background caching
    console.log('\n📋 Step 1: Sending test message to trigger background caching...');
    const msgStart = Date.now();
    const msgRes = await fetch(`${API_BASE}/sandbox/conversation/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: CONVERSATION_ID,
        message: "I'm thinking we need a better testing framework",
        mode: 'exploration'
      })
    });

    if (!msgRes.ok) {
      console.error(`❌ Failed to send message: ${await msgRes.text()}`);
      return;
    }

    const msgData = await msgRes.json();
    const msgDuration = Date.now() - msgStart;
    console.log(`✅ Message sent (${msgDuration}ms)`);
    console.log(`   Ideas extracted: ${msgData.extractedIdeas?.length || 0}`);

    // Wait for background processing
    console.log('\n⏳ Waiting 3 seconds for background topic grouping...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 2: Check conversation data
    console.log('\n📋 Step 2: Checking conversation data...');
    const convRes = await fetch(`${API_BASE}/sandbox/conversation/${CONVERSATION_ID}`);
    const convData = await convRes.json();

    console.log(`   Total ideas: ${convData.extracted_ideas?.length || 0}`);
    console.log(`   Total messages: ${convData.messages?.length || 0}`);

    if (convData.review_data) {
      console.log(`✅ Review cache exists!`);
      console.log(`   - Topic groups: ${convData.review_data.topicGroups?.length || 0}`);
      console.log(`   - Cached idea count: ${convData.review_data.ideaCount}`);
      console.log(`   - Last updated: ${new Date(convData.review_data.lastUpdated).toLocaleTimeString()}`);
    } else {
      console.log(`⚠️  No review cache found`);
      console.log(`   NOTE: You need to add 'review_data' JSONB column to sandbox_conversations table`);
    }

    // Step 3: Test generate-summary speed (THE MAIN TEST!)
    console.log('\n📋 Step 3: Testing session review speed...\n');
    console.log('🚀 Calling generate-summary endpoint...');

    const summaryStart = Date.now();
    const summaryRes = await fetch(`${API_BASE}/session-review/generate-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: CONVERSATION_ID })
    });

    if (!summaryRes.ok) {
      const errorText = await summaryRes.text();
      console.error(`❌ Failed to generate summary: ${errorText}`);
      return;
    }

    const summaryData = await summaryRes.json();
    const summaryDuration = Date.now() - summaryStart;

    // Display results
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 RESULTS:\n');
    console.log(`   ⏱️  Response time: ${summaryDuration}ms`);
    console.log(`   📝 Topic groups found: ${summaryData.topicGroups?.length || 0}`);

    if (summaryData.topicGroups && summaryData.topicGroups.length > 0) {
      console.log(`\n   Topic Groups:`);
      summaryData.topicGroups.forEach((group, idx) => {
        console.log(`     ${idx + 1}. ${group.topic} (${group.ideas.length} ideas)`);
      });
    }

    // Verdict
    console.log('\n' + '='.repeat(60));
    console.log('\n🎯 PERFORMANCE VERDICT:\n');

    if (summaryDuration < 500 && convData.review_data) {
      console.log('✅ EXCELLENT: Session review is INSTANT! (< 500ms)');
      console.log('✅ Background caching is working perfectly!');
      console.log('✅ Cache hit - data loaded from database');
    } else if (summaryDuration < 500 && !convData.review_data) {
      console.log('⚠️  FAST but no cache found');
      console.log('   Response was fast, but review_data column may not exist');
      console.log('   Add the column to enable persistent caching');
    } else if (summaryDuration < 3000) {
      console.log('⚠️  ACCEPTABLE: Response is fast but not instant');
      console.log(`   Duration: ${summaryDuration}ms`);
      console.log('   Likely a cache miss - AI generated fresh topic groups');
    } else {
      console.log('❌ SLOW: Session review took too long');
      console.log(`   Duration: ${summaryDuration}ms (expected < 500ms)`);
      console.log('   Background caching may not be working');
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n💡 TIP: Check backend logs for:');
    console.log('   - "[Background] Updating topic groups..." (cache write)');
    console.log('   - "[SessionReview] Using cached topic groups (instant!)" (cache read)');
    console.log('   - "[SessionReview] Generating fresh topic groups (cache miss or stale)" (no cache)');
    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run test
testSpeed().then(() => {
  console.log('✅ Test complete\n');
  process.exit(0);
}).catch(err => {
  console.error('❌ Test crashed:', err);
  process.exit(1);
});
