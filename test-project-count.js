const fs = require('fs');

const data = JSON.parse(fs.readFileSync('projects.json', 'utf8'));
const project = data.projects.find(p => p.id === '057d0223-93e6-422c-b499-64b711ff0d9d');

console.log('Project:', project.title);
console.log('Total items:', project.items.length);
console.log('Active items:', project.items.filter(i => !i.isArchived).length);
console.log('Decided items:', project.items.filter(i => i.state === 'decided' && !i.isArchived).length);
console.log('Exploring items:', project.items.filter(i => i.state === 'exploring' && !i.isArchived).length);
console.log('Has clusters:', !!(project.clusters && project.clusters.length > 0));
console.log('\nCluster count:', project.clusters ? project.clusters.length : 0);
