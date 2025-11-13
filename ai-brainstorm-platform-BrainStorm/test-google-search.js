/**
 * Test script for Google Search API integration
 * Tests the LiveResearchAgent with real Google Search
 */

require('dotenv').config({ path: './backend/.env' });

// We need to set NODE_PATH to include backend/node_modules
process.env.NODE_PATH = require('path').resolve(__dirname, 'backend/node_modules');
require('module').Module._initPaths();

async function testGoogleSearch() {
  console.log('='.repeat(60));
  console.log('Testing Google Search API Integration');
  console.log('='.repeat(60));
  console.log();

  // Check environment variables
  console.log('1. Checking environment configuration...');
  const hasApiKey = Boolean(process.env.GOOGLE_SEARCH_API_KEY);
  const hasEngineId = Boolean(process.env.GOOGLE_SEARCH_ENGINE_ID);
  const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);

  console.log(`   ✓ GOOGLE_SEARCH_API_KEY: ${hasApiKey ? 'Set' : 'Missing'}`);
  console.log(`   ✓ GOOGLE_SEARCH_ENGINE_ID: ${hasEngineId ? 'Set' : 'Missing'}`);
  console.log(`   ✓ ANTHROPIC_API_KEY: ${hasAnthropicKey ? 'Set' : 'Missing'}`);
  console.log();

  if (!hasApiKey || !hasEngineId) {
    console.error('❌ Google Search API credentials are missing!');
    console.error('   Please set GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID in backend/.env');
    process.exit(1);
  }

  if (!hasAnthropicKey) {
    console.error('❌ Anthropic API key is missing!');
    console.error('   Please set ANTHROPIC_API_KEY in backend/.env');
    process.exit(1);
  }

  // Import LiveResearchAgent (needs to be dynamic to ensure env vars are loaded)
  console.log('2. Loading LiveResearchAgent...');
  
  // Need to temporarily change directory to backend for module resolution
  const originalDir = process.cwd();
  process.chdir('./backend');
  
  try {
    const { LiveResearchAgent } = require('./src/agents/liveResearchAgent');
    const agent = new LiveResearchAgent();
    console.log('   ✓ Agent initialized');
    console.log();

    // Test search query
    const testQuery = 'artificial intelligence trends 2025';
    console.log(`3. Testing search with query: "${testQuery}"`);
    console.log();

    const startTime = Date.now();

    // Perform research without analysis to speed up the test
    const result = await agent.research(
      testQuery,
      'test-project-id',
      'test-user-id',
      {
        maxSources: 5,
        includeAnalysis: false, // Skip analysis for faster test
        saveToDB: false, // Don't save to DB for test
      },
      {
        onSearchComplete: async (count) => {
          console.log(`   📊 Search complete: Found ${count} results`);
        },
        onCrawlComplete: async (count) => {
          console.log(`   🔍 Crawl complete: Successfully crawled ${count} pages`);
        },
      }
    );

    const duration = Date.now() - startTime;

    console.log();
    console.log('='.repeat(60));
    console.log('✅ TEST SUCCESSFUL!');
    console.log('='.repeat(60));
    console.log();
    console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`Total sources found: ${result.metadata.totalSources}`);
    console.log(`Successful crawls: ${result.metadata.successfulCrawls}`);
    console.log(`Failed crawls: ${result.metadata.failedCrawls}`);
    console.log();

    console.log('Search Results:');
    console.log('-'.repeat(60));
    result.sources.forEach((source, idx) => {
      console.log(`${idx + 1}. ${source.title}`);
      console.log(`   URL: ${source.url}`);
      console.log(`   Snippet: ${source.snippet.substring(0, 100)}...`);
      console.log(`   Content: ${source.content ? `${source.content.length} characters` : 'Failed to crawl'}`);
      console.log();
    });

    console.log('='.repeat(60));
    console.log('Google Search API is working correctly! 🎉');
    console.log('='.repeat(60));

  } catch (error) {
    console.error();
    console.error('='.repeat(60));
    console.error('❌ TEST FAILED!');
    console.error('='.repeat(60));
    console.error();
    console.error('Error:', error.message);
    console.error();
    
    if (error.message && error.message.includes('quota exceeded')) {
      console.error('💡 Tip: You may have exceeded your Google Search API quota (100 free searches/day)');
    } else if (error.message && error.message.includes('invalid API key')) {
      console.error('💡 Tip: Check that your Google Search API key is correct');
    } else if (error.message && error.message.includes('Search Engine ID')) {
      console.error('💡 Tip: Check that your Google Custom Search Engine ID is correct');
    }
    
    console.error();
    process.exit(1);
  } finally {
    // Restore original directory
    process.chdir(originalDir);
  }
}

// Run the test
testGoogleSearch().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
