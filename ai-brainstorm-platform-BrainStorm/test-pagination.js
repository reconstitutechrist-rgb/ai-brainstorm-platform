/**
 * Test script for backend pagination functionality
 * Tests the new offset, limit, hasMore, and total features
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Test project ID - replace with a valid project ID from your database
const TEST_PROJECT_ID = 'test-project-id-here';

async function testPagination() {
  console.log('🧪 Testing Backend Pagination Implementation\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Default behavior (no params)
    console.log('\n📝 Test 1: Default pagination (no params)');
    console.log('-'.repeat(60));
    const test1 = await axios.get(`${API_BASE_URL}/conversations/${TEST_PROJECT_ID}/messages`);
    console.log('✅ Status:', test1.status);
    console.log('📊 Response:', {
      success: test1.data.success,
      messagesCount: test1.data.messages?.length || 0,
      hasMore: test1.data.hasMore,
      total: test1.data.total
    });

    // Test 2: With limit only
    console.log('\n📝 Test 2: With limit=10');
    console.log('-'.repeat(60));
    const test2 = await axios.get(`${API_BASE_URL}/conversations/${TEST_PROJECT_ID}/messages`, {
      params: { limit: 10 }
    });
    console.log('✅ Status:', test2.status);
    console.log('📊 Response:', {
      success: test2.data.success,
      messagesCount: test2.data.messages?.length || 0,
      hasMore: test2.data.hasMore,
      total: test2.data.total
    });

    // Test 3: With offset and limit
    console.log('\n📝 Test 3: With limit=5, offset=5');
    console.log('-'.repeat(60));
    const test3 = await axios.get(`${API_BASE_URL}/conversations/${TEST_PROJECT_ID}/messages`, {
      params: { limit: 5, offset: 5 }
    });
    console.log('✅ Status:', test3.status);
    console.log('📊 Response:', {
      success: test3.data.success,
      messagesCount: test3.data.messages?.length || 0,
      hasMore: test3.data.hasMore,
      total: test3.data.total,
      firstMessagePreview: test3.data.messages?.[0]?.content?.substring(0, 50) + '...'
    });

    // Test 4: Request beyond available messages
    console.log('\n📝 Test 4: Offset beyond available messages');
    console.log('-'.repeat(60));
    const test4 = await axios.get(`${API_BASE_URL}/conversations/${TEST_PROJECT_ID}/messages`, {
      params: { limit: 50, offset: 10000 }
    });
    console.log('✅ Status:', test4.status);
    console.log('📊 Response:', {
      success: test4.data.success,
      messagesCount: test4.data.messages?.length || 0,
      hasMore: test4.data.hasMore,
      total: test4.data.total
    });

    // Test 5: Large limit
    console.log('\n📝 Test 5: Large limit (100 messages)');
    console.log('-'.repeat(60));
    const test5 = await axios.get(`${API_BASE_URL}/conversations/${TEST_PROJECT_ID}/messages`, {
      params: { limit: 100 }
    });
    console.log('✅ Status:', test5.status);
    console.log('📊 Response:', {
      success: test5.data.success,
      messagesCount: test5.data.messages?.length || 0,
      hasMore: test5.data.hasMore,
      total: test5.data.total
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ All pagination tests completed successfully!');
    console.log('='.repeat(60));

    // Summary
    console.log('\n📊 Test Summary:');
    console.log(`   Total messages in project: ${test1.data.total}`);
    console.log(`   Default load: ${test1.data.messages?.length || 0} messages`);
    console.log(`   Pagination working: ${test1.data.hasMore !== undefined ? '✅' : '❌'}`);
    console.log(`   Backward compatibility: ${test1.data.messages ? '✅' : '❌'}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('📊 Response status:', error.response.status);
      console.error('📊 Response data:', error.response.data);
    } else {
      console.error('📊 Error details:', error);
    }
    console.log('\n💡 Make sure:');
    console.log('   1. Backend server is running (npm run dev)');
    console.log('   2. TEST_PROJECT_ID is set to a valid project ID');
    console.log('   3. Database is accessible');
  }
}

// Helper to get a valid project ID from the API
async function getTestProjectId() {
  try {
    console.log('🔍 Fetching a test project ID...');
    // This would need authentication - for now, user must provide manually
    console.log('⚠️  Please update TEST_PROJECT_ID in this script with a valid project ID');
    console.log('   You can find project IDs in your database or from the projects API endpoint');
    return null;
  } catch (error) {
    console.error('Failed to get test project:', error.message);
    return null;
  }
}

// Run tests
console.log('🚀 Starting pagination tests...');
console.log('⚠️  IMPORTANT: Update TEST_PROJECT_ID with a valid project ID first!\n');

if (TEST_PROJECT_ID === 'test-project-id-here') {
  console.log('❌ Please set TEST_PROJECT_ID to a valid project ID in this script');
  console.log('   Find a project ID from your database or projects API');
  process.exit(1);
}

testPagination();
