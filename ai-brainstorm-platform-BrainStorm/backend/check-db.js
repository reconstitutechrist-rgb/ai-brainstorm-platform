const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qzeozxwgbuazbinbqcxn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6ZW96eHdnYnVhemJpbmJxY3huIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc3ODczMCwiZXhwIjoyMDc1MzU0NzMwfQ.rFEaV3Ih6aD2Yf34Gf9XpNiEPp0FCQSOFPMrrfX90D8'
);

async function checkData() {
  const userId = '3ab4df68-94af-4e34-9269-fb7aada73589';
  
  console.log('=== PROJECTS ===');
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, user_id, title')
    .eq('user_id', userId);
  
  if (projectsError) {
    console.error('Error:', projectsError);
  } else {
    console.log('Count:', projects?.length || 0);
    console.log('Data:', JSON.stringify(projects, null, 2));
  }
  
  if (projects && projects.length > 0) {
    for (const project of projects) {
      console.log(`\n=== DOCUMENTS FOR PROJECT ${project.id} ===`);
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('id, project_id, user_id, filename, file_type, created_at')
        .eq('project_id', project.id);
      
      if (docsError) {
        console.error('Error:', docsError);
      } else {
        console.log('Count:', docs?.length || 0);
        console.log('Data:', JSON.stringify(docs, null, 2));
      }
    }
  }
  
  console.log('\n=== ALL DOCUMENTS FOR USER ===');
  const { data: allDocs, error: allDocsError } = await supabase
    .from('documents')
    .select('id, project_id, user_id, filename, file_type, created_at')
    .eq('user_id', userId);
  
  if (allDocsError) {
    console.error('Error:', allDocsError);
  } else {
    console.log('Count:', allDocs?.length || 0);
    console.log('Data:', JSON.stringify(allDocs, null, 2));
  }
}

checkData().catch(console.error);
