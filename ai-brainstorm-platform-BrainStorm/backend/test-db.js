const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  console.log('Testing database connection...\n');

  // Test 1: List tables
  console.log('1. Checking if projects table exists...');
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('count')
      .limit(0);

    if (error) {
      console.log('❌ Error:', error.message);
      console.log('   Details:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Projects table exists!');
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }

  // Test 2: Try to insert a test project
  console.log('\n2. Trying to create a test project...');
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert([{
        user_id: 'test-user-123',
        title: 'Test Project',
        description: 'Testing',
        status: 'exploring',
        items: []
      }])
      .select()
      .single();

    if (error) {
      console.log('❌ Error:', error.message);
      console.log('   Code:', error.code);
      console.log('   Details:', JSON.stringify(error.details, null, 2));
      console.log('   Hint:', error.hint);
    } else {
      console.log('✅ Project created successfully!');
      console.log('   ID:', data.id);

      // Clean up
      await supabase.from('projects').delete().eq('id', data.id);
      console.log('   Cleaned up test project');
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }
}

testDatabase().then(() => {
  console.log('\nTest complete!');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
