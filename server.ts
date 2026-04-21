import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cors from 'cors';
import { initDb } from './api/db.js';

// Import serverless handlers
import loginHandler from './api/login.js';
import clientsHandler from './api/clients.js';
import salesHandler from './api/sales.js';
import paymentsHandler from './api/payments.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Request logging
  app.use((req, res, next) => {
    console.log(`[DEV SERVER] ${req.method} ${req.path}`);
    next();
  });

  // Database Initialization - Wait for it to ensure Ivone exists
  try {
    await initDb();
    console.log('✅ Database sync complete.');
  } catch (err) {
    console.error('❌ Database sync FAILED:', err);
  }

  // API Routes - Local Wrapper for Serverless functions
  const wrap = (handler: any) => async (req: any, res: any) => {
    try {
      await handler(req, res);
    } catch (err: any) {
      console.error(`[WRAPPER ERROR] ${req.path}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
      }
    }
  };

  app.all('/api/login', wrap(loginHandler));
  app.all('/api/clients', wrap(clientsHandler));
  app.all('/api/clients/:id', wrap(clientsHandler));
  app.all('/api/sales', wrap(salesHandler));
  app.all('/api/sales/:id', wrap(salesHandler));
  app.all('/api/payments', wrap(paymentsHandler));
  app.all('/api/payments/:id', wrap(paymentsHandler));

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
