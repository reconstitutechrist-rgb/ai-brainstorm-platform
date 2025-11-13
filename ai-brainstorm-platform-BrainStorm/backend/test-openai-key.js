/**
 * Quick test to verify OpenAI API key is configured and working
 */

require('dotenv').config();
const OpenAI = require('openai');

async function testOpenAIKey() {
  console.log('\n🔑 Testing OpenAI API Key Configuration\n');

  // Check if key exists
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === 'your-openai-api-key-here') {
    console.log('❌ OpenAI API key not configured in .env file');
    console.log(`   Current value: ${apiKey || 'undefined'}`);
    return false;
  }

  console.log('✅ OpenAI API key found in .env');
  console.log(`   Key prefix: ${apiKey.substring(0, 20)}...`);

  // Test the key with a simple embedding request
  try {
    console.log('\n📡 Testing API key with OpenAI...');
    const openai = new OpenAI({ apiKey });

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'Test embedding',
    });

    console.log('✅ OpenAI API key is VALID and working!');
    console.log(`   Model: ${response.model}`);
    console.log(`   Embedding dimensions: ${response.data[0].embedding.length}`);
    console.log(`   Usage: ${response.usage.total_tokens} tokens`);

    return true;
  } catch (error) {
    console.log('❌ OpenAI API key test FAILED');
    console.log(`   Error: ${error.message}`);

    if (error.status) {
      console.log(`   HTTP Status: ${error.status}`);
    }

    return false;
  }
}

testOpenAIKey()
  .then(success => {
    console.log('\n' + '='.repeat(50));
    if (success) {
      console.log('✅ OpenAI configuration is ready for document search!');
    } else {
      console.log('❌ OpenAI configuration needs attention');
    }
    console.log('='.repeat(50) + '\n');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  });
