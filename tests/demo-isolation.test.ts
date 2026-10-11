import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('public demo entry mounts only the fictitious chat and never the real application', () => {
  const entry = readFileSync(new URL('../src/demo/main.tsx', import.meta.url), 'utf8');
  const imports = [...entry.matchAll(/^import .*? from ['"](.+?)['"]/gm)].map(match => match[1]);
  assert.deepEqual(imports, ['react', 'react-dom/client', '../components/mobile/MobileChatDemo']);
  assert.match(entry, /<MobileChatDemo standalone\s*\/>/);
  const component = readFileSync(new URL('../src/components/mobile/MobileChatDemo.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(component, /\b(fetch|apiFetch|localStorage|sessionStorage)\s*[.(]/);
  assert.doesNotMatch(component, /\/api\//);
});
