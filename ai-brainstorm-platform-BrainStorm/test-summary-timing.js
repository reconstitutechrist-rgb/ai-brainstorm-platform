/**
 * Simple timing test for session review generate-summary endpoint
 */

const CONVERSATION_ID = '965bcaca-4afc-4881-93e2-9d71b4735bae';

async function testSummarySpeed() {
  console.log('\n🧪 Session Review Summary Speed Test\n');
  console.log('='.repeat(60));

  try {
    // Make multiple calls to test consistency
    const numTests = 3;
    const timings = [];

    for (let i = 1; i <= numTests; i++) {
      console.log(`\n📋 Test ${i}/${numTests}...`);

      const startTime = Date.now();

      const response = await fetch('http://localhost:3001/api/session-review/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: CONVERSATION_ID })
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      timings.push(duration);

      if (!response.ok) {
        console.error(`❌ Request failed: ${response.status} ${response.statusText}`);
        const text = await response.text();
        console.error('Response:', text);
        continue;
      }

      const data = await response.json();
      console.log(`✅ Success in ${duration}ms`);
      console.log(`   Topic groups: ${data.topicGroups?.length || 0}`);
      console.log(`   Total ideas: ${data.summary?.totalIdeas || 0}`);

      // Wait a bit between tests
      if (i < numTests) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Calculate statistics
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 TIMING RESULTS:\n');

    const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
    const minTime = Math.min(...timings);
    const maxTime = Math.max(...timings);

    console.log(`   Fastest:  ${minTime}ms`);
    console.log(`   Slowest:  ${maxTime}ms`);
    console.log(`   Average:  ${avgTime.toFixed(0)}ms`);
    console.log(`   All runs: ${timings.join('ms, ')}ms`);

    // Performance verdict
    console.log('\n' + '='.repeat(60));
    console.log('\n🎯 PERFORMANCE VERDICT:\n');

    if (avgTime < 500) {
      console.log('✅ EXCELLENT: Average response time is INSTANT! (< 500ms)');
      console.log('✅ Cache is likely working perfectly!');
    } else if (avgTime < 1000) {
      console.log('⚠️  GOOD: Response is fast but not instant');
      console.log(`   Average: ${avgTime.toFixed(0)}ms (target: < 500ms)`);
      console.log('   Cache may be working with some overhead');
    } else if (avgTime < 3000) {
      console.log('⚠️  ACCEPTABLE: Response is reasonable but not optimized');
      console.log(`   Average: ${avgTime.toFixed(0)}ms (target: < 500ms)`);
      console.log('   Likely generating fresh topic groups (cache miss)');
    } else {
      console.log('❌ SLOW: Response time is too long');
      console.log(`   Average: ${avgTime.toFixed(0)}ms (expected: < 500ms)`);
      console.log('   Background caching may not be working');
    }

    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run test
testSummarySpeed().then(() => {
  console.log('✅ Test complete\n');
  process.exit(0);
}).catch(err => {
  console.error('❌ Test crashed:', err);
  process.exit(1);
});
