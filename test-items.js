const http = require('http');

http.get('http://localhost:3001/api/projects/77b010bd-2fd1-4d9c-ad85-485d83f8cd6e', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const items = json.project.items;

    console.log('Total items:', items.length);
    console.log('Decided:', items.filter(i => i.state === 'decided').length);
    console.log('Exploring:', items.filter(i => i.state === 'exploring').length);
    console.log('Parked:', items.filter(i => i.state === 'parked').length);
    console.log('Has isArchived property:', items.some(i => i.hasOwnProperty('isArchived')));
    console.log('Items that should show in canvas:', items.filter(i => (i.state === 'decided' || i.state === 'exploring') && !i.isArchived).length);
    console.log('\nFirst item sample:', JSON.stringify(items[0], null, 2).substring(0, 400));
  });
});
