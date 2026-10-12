import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import type { DemoAccess } from './server/local/demo-gateway.js';
import { pool } from './api/db.js';

import sessionHandler from './api/session.js';
import logoutHandler from './api/logout.js';

// Import serverless handlers
import loginHandler from './api/login.js';
import clientsHandler from './api/clients.js';
import salesHandler from './api/sales.js';
import paymentsHandler from './api/payments.js';
import backupHandler from './api/backup.js';
import operationsHandler from './api/operations.js';


const __filename = fileURLToPath(import.meta.url);

export async function startServer({ sandbox = false, port = 3000, host = '0.0.0.0', demo }: { sandbox?: boolean; port?: number; host?: string; demo?: DemoAccess } = {}) {
  if (demo && !sandbox) throw new Error('Demonstração exige banco fictício.');
  if (sandbox && (process.env.NODE_ENV !== 'development' || process.env.VERCEL || (pool as any).sandboxOnly !== true)) throw new Error('Modo fictício exige desenvolvimento local e handlers ligados exclusivamente ao banco em memória.');
  if (!sandbox) dotenv.config();
  const app = express();
  const PORT = port;
  let closeFrontend = async () => {};

  // Same-origin API: no permissive cross-origin access.
  process.env.NODE_ENV ||= 'development';
  if (demo) {
    const { demoGateway } = await import('./server/local/demo-gateway.js');
    app.use(demoGateway(demo));
  }
  app.use(express.json());

  // Request logging
  app.use((req, res, next) => {
    console.log(`[DEV SERVER] ${req.method} ${demo && req.path.startsWith('/enter/') ? '/enter/[private]' : req.path}`);
    next();
  });

  // Database provisioning is deliberately excluded from application startup.

  // API Routes - Local Wrapper for Serverless functions
  const wrap = (handler: any) => async (req: any, res: any) => {
    try {
      await handler(req, res);
    } catch (err: any) {
      console.error('API request failed');
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Internal Server Error' });
      }
    }
  };

  app.all('/api/login', wrap(loginHandler));
  if (sandbox) {
    const { bootstrapSession } = await import('./server/local/session.js');
    app.get('/api/session', wrap(bootstrapSession));
  }
  app.all('/api/session', wrap(sessionHandler));
  app.all('/api/logout', wrap(logoutHandler));
  app.all('/api/clients', wrap(clientsHandler));
  app.all('/api/clients/:id', wrap(clientsHandler));
  app.all('/api/sales', wrap(salesHandler));
  app.all('/api/sales/:id', wrap(salesHandler));
  app.all('/api/payments', wrap(paymentsHandler));
  app.all('/api/payments/:id', wrap(paymentsHandler));
  app.all('/api/backup', wrap(backupHandler));
  app.all('/api/operations', wrap(operationsHandler));

  if (process.env.NODE_ENV !== 'production' && !demo) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    closeFrontend = () => vite.close();
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/{*path}', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  const server = await new Promise<ReturnType<typeof app.listen>>((resolve, reject) => {
    const listening = app.listen(PORT, host, () => resolve(listening));
    listening.once('error', reject);
  });
  const address = server.address();
  server.once('close', () => { void closeFrontend(); });
  console.log(`DEV SERVER: http://localhost:${typeof address === 'object' && address ? address.port : PORT}${sandbox ? ' — DADOS FICTÍCIOS EM MEMÓRIA, SEM NEON' : ''}`);
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) void startServer();
