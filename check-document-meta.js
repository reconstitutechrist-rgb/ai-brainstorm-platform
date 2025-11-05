const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const { data, error } = await supabase
    .from('documents')
    .select('id, filename, file_url, metadata')
    .eq('id', 'ce179887-788a-4531-881d-6b68d93803fc')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Document:', data.filename);
  console.log('File URL:', data.file_url);
  console.log('Metadata:', JSON.stringify(data.metadata, null, 2));
})();
