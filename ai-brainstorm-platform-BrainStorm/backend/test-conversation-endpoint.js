const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qzeozxwgbuazbinbqcxn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6ZW96eHdnYnVhemJpbmJxY3huIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc3ODczMCwiZXhwIjoyMDc1MzU0NzMwfQ.rFEaV3Ih6aD2Yf34Gf9XpNiEPp0FCQSOFPMrrfX90D8'
);

async function testQuery() {
  const projectId = '057d0223-93e6-422c-b499-64b711ff0d9d';
  
  console.log('\n=== Testing getUserDocuments query ===');
  console.log('Project ID:', projectId);
  
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', projectId);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success! Found', data?.length || 0, 'documents');
    console.log('Documents:', JSON.stringify(data, null, 2));
  }
}

testQuery().catch(console.error);
