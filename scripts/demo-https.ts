import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { startSandbox } from '../server/local/start.js';

if (process.env.NODE_ENV === 'production' || process.env.VERCEL) throw new Error('Demonstração somente no ambiente fictício local.');
const expiresAt = Date.now() + 2 * 60 * 60 * 1000;
const token = randomBytes(32).toString('base64url');
const tunnel = spawn('test-results/cloudflared.exe', ['tunnel', '--no-autoupdate', '--protocol', 'http2', '--url', 'http://127.0.0.1:3001'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
let server: Awaited<ReturnType<typeof startSandbox>> | undefined;
const timeout = setTimeout(() => { tunnel.kill(); console.error('Túnel HTTPS não iniciou. Nenhum servidor foi exposto.'); }, 60000);
const url = await new Promise<string>((resolve, reject) => {
  const read = (chunk: Buffer) => {
    log = (log + chunk.toString()).slice(-20000);
    const match = log.match(/https:\/\/[\w-]+\.trycloudflare\.com/);
    if (match) { clearTimeout(timeout); resolve(match[0]); }
  };
  tunnel.stdout.on('data', read); tunnel.stderr.on('data', read);
  tunnel.once('error', reject);
  tunnel.once('exit', code => reject(new Error(`Túnel encerrado (${code}).`)));
});
try {
  server = await startSandbox({ port: 3001, demo: { origin: url, token, expiresAt } });
  mkdirSync('test-results', { recursive: true });
  writeFileSync('test-results/demo-access.json', JSON.stringify({ url: `${url}/enter/${token}`, origin: url, expiresAt, tunnelPid: tunnel.pid, serverPid: process.pid }, null, 2));
  console.log(`Link privado salvo em test-results/demo-access.json. Expira em ${new Date(expiresAt).toISOString()}.`);
} catch (error) { tunnel.kill(); throw error; }
const close = () => { tunnel.kill(); server?.close(); };
const expiry = setTimeout(close, Math.max(1, expiresAt - Date.now()));
tunnel.once('exit', () => { clearTimeout(expiry); server?.close(); });
process.once('SIGINT', close); process.once('SIGTERM', close);
