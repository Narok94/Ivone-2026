import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cors from 'cors';
import { initDb } from './src/lib/db';

// Import serverless handlers
import loginHandler from './api/login';
import clientsHandler from './api/clients';
import salesHandler from './api/sales';
import paymentsHandler from './api/payments';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Database Initialization
  initDb().then(() => {
    console.log('🚀 Database sync complete.');
  }).catch(err => {
    console.error('❌ Database sync FAILED:', err);
  });

  // API Routes - Local Wrapper for Serverless functions
  app.all('/api/login', (req, res) => loginHandler(req as any, res as any));
  app.all('/api/clients', (req, res) => clientsHandler(req as any, res as any));
  app.all('/api/clients/:id', (req, res) => clientsHandler(req as any, res as any));
  app.all('/api/sales', (req, res) => salesHandler(req as any, res as any));
  app.all('/api/sales/:id', (req, res) => salesHandler(req as any, res as any));
  app.all('/api/payments', (req, res) => paymentsHandler(req as any, res as any));
  app.all('/api/payments/:id', (req, res) => paymentsHandler(req as any, res as any));

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
