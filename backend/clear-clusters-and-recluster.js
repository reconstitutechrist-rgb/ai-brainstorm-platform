const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config({ path: './backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const PROJECT_ID = '057d0223-93e6-422c-b499-64b711ff0d9d';

async function clearAndRecluster() {
  try {
    console.log('Step 1: Clearing existing clusters...');

    // Clear clusters and clusterId from all items
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', PROJECT_ID)
      .single();

    if (!project) {
      throw new Error('Project not found');
    }

    // Remove clusterId from all items
    const cleanedItems = project.items.map(item => {
      const { clusterId, ...rest } = item;
      return rest;
    });

    // Update project with cleaned items and empty clusters
    await supabase
      .from('projects')
      .update({
        items: cleanedItems,
        clusters: [],
      })
      .eq('id', PROJECT_ID);

    console.log('✅ Cleared clusters and clusterId from all items');

    console.log('\nStep 2: Triggering auto-clustering...');

    // Call auto-cluster endpoint
    const response = await axios.post(
      `http://localhost:3001/api/canvas/${PROJECT_ID}/auto-cluster`,
      {},
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (response.data.success && response.data.clustered) {
      console.log(`✅ Auto-clustering completed: ${response.data.clustersCreated} clusters created`);

      // Verify items have clusterId
      const { data: updatedProject } = await supabase
        .from('projects')
        .select('items')
        .eq('id', PROJECT_ID)
        .single();

      const itemsWithClusterId = updatedProject.items.filter(i => i.clusterId);
      console.log(`✅ ${itemsWithClusterId.length} of ${updatedProject.items.length} items have clusterId`);
    } else {
      console.log('❌ Auto-clustering failed or was skipped:', response.data.message);
    }

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

clearAndRecluster();
