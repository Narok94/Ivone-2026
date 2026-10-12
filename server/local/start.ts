import { registerHooks } from 'node:module';
import type { DemoAccess } from './demo-gateway.js';

// This opt-in launcher is never used by Vercel or the regular server.
export async function startSandbox({ port = 3000, host = '127.0.0.1', demo }: { port?: number; host?: string; demo?: DemoAccess } = {}) {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) throw new Error('Modo fictício permitido somente no desenvolvimento local.');
  process.env.NODE_ENV = 'development';
  for (const key of Object.keys(process.env)) if (/DATABASE|POSTGRES|^PG|REDIS|^AUTH_APP_ORIGIN$/.test(key)) delete process.env[key];
  if (demo) process.env.AUTH_APP_ORIGIN = demo.origin;
  registerHooks({ resolve(specifier, context, next) {
    if ((specifier === './db.js' && context.parentURL?.includes('/api/')) || (specifier === './api/db.js' && /\/server\.(?:ts|js)$/.test(context.parentURL ?? ''))) return { url: new URL('./database.ts', import.meta.url).href, shortCircuit: true };
    if (specifier === '@neondatabase/serverless' || specifier === 'pg') throw new Error('Conexões externas proibidas no modo fictício.');
    const resolved = next(specifier, context);
    if (/\/api\/db\.(?:ts|js)$/.test(resolved.url)) throw new Error('Banco real proibido no modo fictício.');
    return resolved;
  } });
  const { startServer } = await import('../../server.js');
  return startServer({ sandbox: true, port, host, demo });
}
