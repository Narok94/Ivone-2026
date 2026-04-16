import express from 'express';
import { createServer as createViteServer } from 'vite';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  let dbUrl = process.env.DATABASE_URL;
  let sql = dbUrl ? neon(dbUrl) : null;

  // 1. Health check - ABSOLUTE FIRST PRIORITY
  app.get(['/api/health', '/health'], async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Backend-Server', 'Express-Ivone');
    
    const currentDbUrl = process.env.DATABASE_URL;
    if (!currentDbUrl) {
      return res.status(500).json({ status: 'error', message: 'DATABASE_URL não configurada nos Secrets.' });
    }

    // Re-initialize if URL changed
    if (!sql || currentDbUrl !== dbUrl) {
      dbUrl = currentDbUrl;
      sql = neon(dbUrl);
    }

    try {
      await sql!`SELECT 1`;
      return res.json({ status: 'connected' });
    } catch (err) {
      console.error('[API] Health check failed:', err);
      return res.status(500).json({ status: 'error', message: (err as Error).message });
    }
  });

  // Request logging
  app.use((req, res, next) => {
    console.log(`[DEBUG] ${req.method} ${req.url}`);
    next();
  });

  // 2. API Router
  const apiRouter = express.Router();

  // Middleware for API router
  apiRouter.use((req, res, next) => {
    const currentDbUrl = process.env.DATABASE_URL;
    if (!sql && currentDbUrl) {
      dbUrl = currentDbUrl;
      sql = neon(dbUrl);
    }

    if (!sql) {
      return res.status(500).json({ error: 'Banco de dados não configurado.' });
    }
    next();
  });

  // Clients
  apiRouter.get('/clients', async (req, res) => {
    try {
      const result = await sql`SELECT * FROM clients`;
      const clients = result.map(c => ({
        id: c.id,
        fullName: c.full_name,
        cep: c.cep,
        street: c.street,
        number: c.number,
        complement: c.complement,
        neighborhood: c.neighborhood,
        city: c.city,
        state: c.state,
        phone: c.phone,
        email: c.email,
        cpf: c.cpf,
        observation: c.observation
      }));
      res.json(clients);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.post('/clients', async (req, res) => {
    const c = req.body;
    try {
      await sql`
        INSERT INTO clients (id, full_name, cep, street, number, complement, neighborhood, city, state, phone, email, cpf, observation)
        VALUES (${c.id}, ${c.fullName}, ${c.cep}, ${c.street}, ${c.number}, ${c.complement}, ${c.neighborhood}, ${c.city}, ${c.state}, ${c.phone}, ${c.email}, ${c.cpf}, ${c.observation})
      `;
      res.status(201).json(c);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.put('/clients/:id', async (req, res) => {
    const { id } = req.params;
    const c = req.body;
    try {
      await sql`
        UPDATE clients SET 
          full_name = ${c.fullName}, cep = ${c.cep}, street = ${c.street}, number = ${c.number}, 
          complement = ${c.complement}, neighborhood = ${c.neighborhood}, city = ${c.city}, 
          state = ${c.state}, phone = ${c.phone}, email = ${c.email}, cpf = ${c.cpf}, 
          observation = ${c.observation}
        WHERE id = ${id}
      `;
      res.json(c);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.delete('/clients/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await sql`DELETE FROM clients WHERE id = ${id}`;
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Stock Items
  apiRouter.get('/stock', async (req, res) => {
    try {
      const result = await sql`SELECT * FROM stock_items`;
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.post('/stock', async (req, res) => {
    const item = req.body;
    try {
      await sql`
        INSERT INTO stock_items (id, name, size, code, quantity)
        VALUES (${item.id}, ${item.name}, ${item.size}, ${item.code}, ${item.quantity})
      `;
      res.status(201).json(item);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.patch('/stock/:id', async (req, res) => {
    const { id } = req.params;
    const { quantity } = req.body;
    try {
      await sql`UPDATE stock_items SET quantity = ${quantity} WHERE id = ${id}`;
      res.json({ id, quantity });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.delete('/stock/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await sql`DELETE FROM stock_items WHERE id = ${id}`;
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Sales
  apiRouter.get('/sales', async (req, res) => {
    try {
      const result = await sql`SELECT * FROM sales`;
      const sales = result.map(s => ({
        id: s.id,
        clientId: s.client_id,
        saleDate: s.sale_date,
        productCode: s.product_code,
        productName: s.product_name,
        stockItemId: s.stock_item_id,
        quantity: parseFloat(s.quantity),
        unitPrice: parseFloat(s.unit_price),
        total: parseFloat(s.total),
        observation: s.observation
      }));
      res.json(sales);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.post('/sales', async (req, res) => {
    const s = req.body;
    try {
      await sql`
        INSERT INTO sales (id, client_id, sale_date, product_code, product_name, stock_item_id, quantity, unit_price, total, observation)
        VALUES (${s.id}, ${s.clientId}, ${s.saleDate}, ${s.productCode}, ${s.productName}, ${s.stockItemId}, ${s.quantity}, ${s.unitPrice}, ${s.total}, ${s.observation})
      `;
      res.status(201).json(s);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.put('/sales/:id', async (req, res) => {
    const { id } = req.params;
    const s = req.body;
    try {
      await sql`
        UPDATE sales SET 
          client_id = ${s.clientId}, sale_date = ${s.saleDate}, product_code = ${s.productCode}, 
          product_name = ${s.productName}, stock_item_id = ${s.stockItemId}, quantity = ${s.quantity}, 
          unit_price = ${s.unitPrice}, total = ${s.total}, observation = ${s.observation}
        WHERE id = ${id}
      `;
      res.json(s);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.delete('/sales/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await sql`DELETE FROM sales WHERE id = ${id}`;
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Payments
  apiRouter.get('/payments', async (req, res) => {
    try {
      const result = await sql`SELECT * FROM payments`;
      const payments = result.map(p => ({
        id: p.id,
        clientId: p.client_id,
        paymentDate: p.payment_date,
        amount: parseFloat(p.amount),
        observation: p.observation
      }));
      res.json(payments);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.post('/payments', async (req, res) => {
    const p = req.body;
    try {
      await sql`
        INSERT INTO payments (id, client_id, payment_date, amount, observation)
        VALUES (${p.id}, ${p.clientId}, ${p.paymentDate}, ${p.amount}, ${p.observation})
      `;
      res.status(201).json(p);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.put('/payments/:id', async (req, res) => {
    const { id } = req.params;
    const p = req.body;
    try {
      await sql`
        UPDATE payments SET 
          client_id = ${p.clientId}, payment_date = ${p.paymentDate}, 
          amount = ${p.amount}, observation = ${p.observation}
        WHERE id = ${id}
      `;
      res.json(p);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.delete('/payments/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await sql`DELETE FROM payments WHERE id = ${id}`;
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Mount API Router
  app.use('/api', apiRouter);

  // 3. API 404 - Ensure any /api request not handled above returns JSON
  app.all('/api/*all', (req, res) => {
    res.status(404).json({ error: `Rota de API não encontrada: ${req.method} ${req.url}` });
  });

  // --- DATABASE INITIALIZATION ---
  async function initDb() {
    const currentDbUrl = process.env.DATABASE_URL;
    if (!sql && currentDbUrl) {
      dbUrl = currentDbUrl;
      sql = neon(dbUrl);
    }
    if (!sql) return;

    try {
      await sql`
        CREATE TABLE IF NOT EXISTS clients (
          id TEXT PRIMARY KEY,
          full_name TEXT NOT NULL,
          cep TEXT,
          street TEXT,
          number TEXT,
          complement TEXT,
          neighborhood TEXT,
          city TEXT,
          state TEXT,
          phone TEXT,
          email TEXT,
          cpf TEXT,
          observation TEXT
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS stock_items (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          size TEXT,
          code TEXT,
          quantity INTEGER DEFAULT 0
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS sales (
          id TEXT PRIMARY KEY,
          client_id TEXT REFERENCES clients(id),
          sale_date DATE NOT NULL,
          product_code TEXT,
          product_name TEXT NOT NULL,
          stock_item_id TEXT,
          quantity NUMERIC NOT NULL,
          unit_price NUMERIC NOT NULL,
          total NUMERIC NOT NULL,
          observation TEXT
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS payments (
          id TEXT PRIMARY KEY,
          client_id TEXT REFERENCES clients(id),
          payment_date DATE NOT NULL,
          amount NUMERIC NOT NULL,
          observation TEXT
        )
      `;
      console.log('Database tables initialized');
    } catch (err) {
      console.error('Error initializing database:', err);
    }
  }

  initDb();

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false })); // Disable automatic index.html serving
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
