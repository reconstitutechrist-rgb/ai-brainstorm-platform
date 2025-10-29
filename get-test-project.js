/**
 * Get or create a test project for API testing
 */

const TEST_USER_ID = '3ab4df68-94af-4e34-9269-fb7aada73589';
const API_BASE = 'http://localhost:3001/api';

async function getOrCreateTestProject() {
  try {
    // Try to get existing projects
    const response = await fetch(`${API_BASE}/projects/user/${TEST_USER_ID}`);
    const data = await response.json();

    if (data.success && data.projects && data.projects.length > 0) {
      const project = data.projects[0];
      console.log('Using existing project:');
      console.log(`  ID: ${project.id}`);
      console.log(`  Name: ${project.name}`);
      console.log(`  Description: ${project.description || 'N/A'}`);
      return project.id;
    }

    // Create a new test project
    console.log('No existing projects found. Creating test project...');
    const createResponse = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Project for Research API',
        description: 'Automated test project for research page testing',
        userId: TEST_USER_ID,
      }),
    });

    const createData = await createResponse.json();

    if (createData.success && createData.project) {
      console.log('Created new test project:');
      console.log(`  ID: ${createData.project.id}`);
      console.log(`  Name: ${createData.project.name}`);
      return createData.project.id;
    }

    console.error('Failed to create project:', createData);
    return null;
  } catch (error) {
    console.error('Error:', error.message);
    return null;
  }
}

getOrCreateTestProject().then(projectId => {
  if (projectId) {
    console.log(`\nTest Project ID: ${projectId}`);
    console.log(`\nUse this in test scripts: TEST_PROJECT_ID = '${projectId}';`);
  } else {
    console.error('\nFailed to get or create test project');
    process.exit(1);
  }
});
