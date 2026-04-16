import http from 'http';

async function test() {
  console.log('Waiting 3 seconds for server to start...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const endpoints = ['/api/health', '/api/clients'];
  
  for (const endpoint of endpoints) {
    console.log(`Testing ${endpoint}...`);
    http.get(`http://localhost:3000${endpoint}`, (res) => {
      console.log(`${endpoint} Status Code:`, res.statusCode);
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`${endpoint} Body:`, data);
      });
    }).on('error', (err) => {
      console.error(`${endpoint} Error:`, err.message);
    });
  }
}

test();
