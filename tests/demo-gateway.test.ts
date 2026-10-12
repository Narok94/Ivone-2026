import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { demoGateway } from '../server/local/demo-gateway.js';
test('private HTTPS demo gate blocks admin/backup/source and requires the capability before routing', async () => {
  const token = 'a'.repeat(43); const app = express();
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('No address');
  const base = `http://127.0.0.1:${address.port}`;
  app.use(demoGateway({ origin: `https://127.0.0.1:${address.port}`, token, expiresAt: Date.now() + 60000 }));
  app.use((_req, res) => res.json({ allowed: true }));
  const headers = { 'X-Forwarded-Proto': 'https', Cookie: `__Host-ivone_demo=${token}` };
  try {
    assert.equal((await fetch(base + '/api/operations', { headers: { 'X-Forwarded-Proto': 'https' } })).status, 403);
    for (const endpoint of ['/api/backup', '/api/login', '/api/sales', '/api/payments', '/src/main.tsx', '/.env', '/@vite/client']) assert.equal((await fetch(base + endpoint, { headers })).status, 404, endpoint);
    assert.equal((await fetch(base + '/api/backup', { method: 'POST', headers })).status, 404);
    assert.equal((await fetch(base + '/api/clients', { method: 'DELETE', headers })).status, 404);
    assert.equal((await fetch(base + '/api/operations', { headers })).status, 200);
    assert.equal((await fetch(base + '/', { headers: { ...headers, 'X-Forwarded-Proto': 'http' } })).status, 403);
    const entry = await fetch(base + `/enter/${token}`, { headers: { 'X-Forwarded-Proto': 'https' }, redirect: 'manual' });
    assert.equal(entry.status, 303); assert.match(entry.headers.get('set-cookie')!, /HttpOnly; Secure; SameSite=Strict/);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
