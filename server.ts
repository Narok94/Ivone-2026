import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import sessionHandler from './api/session.js';
import logoutHandler from './api/logout.js';

// Import serverless handlers
import loginHandler from './api/login.js';
import clientsHandler from './api/clients.js';
import salesHandler from './api/sales.js';
import paymentsHandler from './api/payments.js';
import backupHandler from './api/backup.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Same-origin API: no permissive cross-origin access.
  process.env.NODE_ENV ||= 'development';
  app.use(express.json());

  // Request logging
  app.use((req, res, next) => {
    console.log(`[DEV SERVER] ${req.method} ${req.path}`);
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
  app.all('/api/session', wrap(sessionHandler));
  app.all('/api/logout', wrap(logoutHandler));
  app.all('/api/clients', wrap(clientsHandler));
  app.all('/api/clients/:id', wrap(clientsHandler));
  app.all('/api/sales', wrap(salesHandler));
  app.all('/api/sales/:id', wrap(salesHandler));
  app.all('/api/payments', wrap(paymentsHandler));
  app.all('/api/payments/:id', wrap(paymentsHandler));
  app.all('/api/backup', wrap(backupHandler));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 DEV SERVER: Running at http://localhost:${PORT}`);
  });
}

startServer();
