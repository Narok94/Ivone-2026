import http from 'http';

http.get('http://localhost:3000/api/health', (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers['content-type']);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Body:', data.substring(0, 100));
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
