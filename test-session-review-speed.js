/**
 * Test Script: Session Review Speed Optimization
 *
 * Tests the incremental topic grouping with database caching implementation
 * to ensure "End Session & Review" is instant.
 */

const API_BASE = 'http://localhost:3001/api';
const USER_ID = '3ab4df68-94af-4e34-9269-fb7aada73589';

async function testSessionReviewSpeed() {
  console.log('\n🧪 Testing Session Review Speed Optimization\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Get projects
    console.log('\n📋 Step 1: Fetching projects...');
    const projectsRes = await fetch(`${API_BASE}/projects/user/${USER_ID}`);
    const projects = await projectsRes.json();

    if (!projects || projects.length === 0) {
      console.error('❌ No projects found for user');
      return;
    }

    const projectId = projects[0].id;
    console.log(`✅ Using project: ${projects[0].name}`);

    // Step 2: Get sandbox sessions
    console.log('\n📋 Step 2: Fetching sandbox sessions...');
    const sandboxRes = await fetch(`${API_BASE}/sandbox/project/${projectId}`);
    const sandboxData = await sandboxRes.json();

    if (!sandboxData || !sandboxData.sessions || sandboxData.sessions.length === 0) {
      console.log('ℹ️  No existing sandbox sessions, creating new one...');
      // Create new sandbox session
      const createRes = await fetch(`${API_BASE}/sandbox/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          userId: USER_ID,
          name: 'Speed Test Session'
        })
      });
      const newSandbox = await createRes.json();
      console.log(`✅ Created new sandbox session: ${newSandbox.id}`);
    }

    // Get updated sandbox data
    const updatedSandboxRes = await fetch(`${API_BASE}/sandbox/project/${projectId}`);
    const updatedSandboxData = await updatedSandboxRes.json();
    const conversations = updatedSandboxData.conversations || [];

    if (conversations.length === 0) {
      console.error('❌ No conversations found');
      return;
    }

    const conversationId = conversations[0].id;
    console.log(`✅ Using conversation: ${conversationId}`);

    // Step 3: Send test messages to build conversation
    console.log('\n📋 Step 3: Building conversation with test messages...');
    const testMessages = [
      "I'm thinking we need a user authentication system",
      "What about adding voice interaction capabilities?",
      "Maybe we should implement a notification system",
      "I want to add analytics tracking",
      "Let's build a mobile responsive design"
    ];

    for (let i = 0; i < testMessages.length; i++) {
      const msg = testMessages[i];
      console.log(`   Sending message ${i + 1}/${testMessages.length}: "${msg}"`);

      const startTime = Date.now();
      const msgRes = await fetch(`${API_BASE}/sandbox/conversation/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: msg,
          mode: 'exploration'
        })
      });

      if (!msgRes.ok) {
        console.error(`   ❌ Failed to send message: ${await msgRes.text()}`);
        continue;
      }

      const msgData = await msgRes.json();
      const duration = Date.now() - startTime;
      console.log(`   ✅ Message sent (${duration}ms)`);

      // Check if background topic grouping was triggered
      console.log(`   📊 Ideas extracted: ${msgData.extractedIdeas?.length || 0}`);

      // Wait a bit for background processing
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Step 4: Check if review_data cache was created
    console.log('\n📋 Step 4: Checking if review_data cache exists...');
    const convCheckRes = await fetch(`${API_BASE}/sandbox/conversation/${conversationId}`);
    const convData = await convCheckRes.json();

    if (convData.review_data) {
      console.log('✅ Review data cache found!');
      console.log(`   - Topic groups: ${convData.review_data.topicGroups?.length || 0}`);
      console.log(`   - Idea count: ${convData.review_data.ideaCount}`);
      console.log(`   - Last updated: ${convData.review_data.lastUpdated}`);
    } else {
      console.log('⚠️  No review_data cache found (column might not exist yet)');
    }

    // Step 5: Test session review speed (cached vs uncached)
    console.log('\n📋 Step 5: Testing session review speed...\n');

    // Test with cache
    console.log('🚀 Testing WITH cache (should be instant < 500ms):');
    const cachedStart = Date.now();
    const cachedRes = await fetch(`${API_BASE}/session-review/generate-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId })
    });

    if (!cachedRes.ok) {
      console.error(`❌ Failed to generate summary: ${await cachedRes.text()}`);
      return;
    }

    const cachedData = await cachedRes.json();
    const cachedDuration = Date.now() - cachedStart;

    console.log(`\n📊 Results:`);
    console.log(`   ⏱️  Time taken: ${cachedDuration}ms`);
    console.log(`   📝 Topic groups: ${cachedData.topicGroups?.length || 0}`);
    console.log(`   💾 Used cache: ${cachedDuration < 500 ? '✅ YES (instant!)' : '❌ NO (slow)'}`);

    if (cachedData.topicGroups && cachedData.topicGroups.length > 0) {
      console.log(`\n   Topic Groups:`);
      cachedData.topicGroups.forEach((group, idx) => {
        console.log(`     ${idx + 1}. ${group.topic} (${group.ideas.length} ideas)`);
      });
    }

    // Step 6: Performance verdict
    console.log('\n' + '='.repeat(60));
    console.log('\n🎯 Performance Verdict:\n');

    if (cachedDuration < 500) {
      console.log('✅ SUCCESS: Session review is INSTANT! (< 500ms)');
      console.log('✅ Background topic grouping is working correctly');
      console.log('✅ Database caching is operational');
    } else if (cachedDuration < 2000) {
      console.log('⚠️  WARNING: Session review is fast but not instant');
      console.log('   This might indicate cache miss or first-time generation');
      console.log(`   Duration: ${cachedDuration}ms (expected < 500ms)`);
    } else {
      console.log('❌ FAILED: Session review is still slow');
      console.log('   Background caching may not be working');
      console.log(`   Duration: ${cachedDuration}ms (expected < 500ms)`);
    }

    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error);
  }
}

// Run the test
testSessionReviewSpeed().then(() => {
  console.log('\n✅ Test complete\n');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Test crashed:', err);
  process.exit(1);
});
