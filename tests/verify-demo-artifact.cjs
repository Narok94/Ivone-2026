const { readdirSync, readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const files = readdirSync('dist-demo', { recursive: true, withFileTypes: true }).filter(f => f.isFile()).map(f => `${f.parentPath}/${f.name}`.replaceAll('\\', '/'));
assert.ok(files.some(f => f.endsWith('/index.html')));
for (const file of files) {
  if (file.includes('/.vercel/')) continue; // local project identity, excluded by Vercel upload
  assert.match(file, /(?:\/index\.html|\/vercel\.json|\/assets\/[^/]+\.(?:js|css|png))$/);
  if (file.endsWith('.js')) assert.doesNotMatch(readFileSync(file, 'utf8'), /\/api\/|DATABASE_URL|AUTH_REDIS|ivone_user/);
}
const config = JSON.parse(readFileSync('dist-demo/vercel.json', 'utf8'));
assert.ok(config.routes.some(route => route.src === '/api(?:/.*)?' && route.status === 404));
assert.ok(config.routes.some(route => route.src === '/demo/?' && route.dest === '/index.html'));
console.log('PASS demo artifact: static files only, no API/database/session references, explicit API 404');
