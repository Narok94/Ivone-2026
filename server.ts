import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './src/db/index';
import { users, clients, stockItems, sales, payments } from './src/db/schema';
import { eq, and } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check / DB Status
  app.get('/api/health', async (req, res) => {
    try {
      await db.select().from(users).limit(1);
      res.json({ status: 'connected', database: 'Neon' });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // API Routes
  
  // Auth (Simplified for now, in a real app use proper auth)
  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
      const user = await db.query.users.findFirst({
        where: and(eq(users.username, username), eq(users.password, password))
      });
      if (user) {
        res.json(user);
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  // Clients
  app.get('/api/clients', async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const result = await db.select().from(clients).where(eq(clients.userId, userId));
    res.json(result);
  });

  app.post('/api/clients', async (req, res) => {
    const { userId, ...data } = req.body;
    const [newClient] = await db.insert(clients).values({ userId, ...data }).returning();
    res.json(newClient);
  });

  app.put('/api/clients/:id', async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    const [updated] = await db.update(clients).set(data).where(eq(clients.id, id)).returning();
    res.json(updated);
  });

  app.delete('/api/clients/:id', async (req, res) => {
    const { id } = req.params;
    await db.delete(clients).where(eq(clients.id, id));
    res.json({ success: true });
  });

  // Stock
  app.get('/api/stock', async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const result = await db.select().from(stockItems).where(eq(stockItems.userId, userId));
    res.json(result);
  });

  app.post('/api/stock', async (req, res) => {
    const { userId, ...data } = req.body;
    const [newItem] = await db.insert(stockItems).values({ userId, ...data }).returning();
    res.json(newItem);
  });

  app.put('/api/stock/:id', async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    const [updated] = await db.update(stockItems).set(data).where(eq(stockItems.id, id)).returning();
    res.json(updated);
  });

  app.delete('/api/stock/:id', async (req, res) => {
    const { id } = req.params;
    await db.delete(stockItems).where(eq(stockItems.id, id));
    res.json({ success: true });
  });

  // Sales
  app.get('/api/sales', async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const result = await db.select().from(sales).where(eq(sales.userId, userId));
    res.json(result);
  });

  app.post('/api/sales', async (req, res) => {
    const { userId, ...data } = req.body;
    const [newSale] = await db.insert(sales).values({ userId, ...data }).returning();
    res.json(newSale);
  });

  app.put('/api/sales/:id', async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    const [updated] = await db.update(sales).set(data).where(eq(sales.id, id)).returning();
    res.json(updated);
  });

  app.delete('/api/sales/:id', async (req, res) => {
    const { id } = req.params;
    await db.delete(sales).where(eq(sales.id, id));
    res.json({ success: true });
  });

  // Payments
  app.get('/api/payments', async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const result = await db.select().from(payments).where(eq(payments.userId, userId));
    res.json(result);
  });

  app.post('/api/payments', async (req, res) => {
    const { userId, ...data } = req.body;
    const [newPayment] = await db.insert(payments).values({ userId, ...data }).returning();
    res.json(newPayment);
  });

  app.put('/api/payments/:id', async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    const [updated] = await db.update(payments).set(data).where(eq(payments.id, id)).returning();
    res.json(updated);
  });

  app.delete('/api/payments/:id', async (req, res) => {
    const { id } = req.params;
    await db.delete(payments).where(eq(payments.id, id));
    res.json({ success: true });
  });

  // Users
  app.get('/api/users', async (req, res) => {
    const result = await db.select().from(users);
    res.json(result);
  });

  app.post('/api/users', async (req, res) => {
    const data = req.body;
    try {
      const [newUser] = await db.insert(users).values(data).returning();
      res.json(newUser);
    } catch (error) {
      res.status(400).json({ error: 'Username already exists' });
    }
  });

  app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    res.json(updated);
  });

  app.put('/api/users/:id/password', async (req, res) => {
    const { id } = req.params;
    const { newPassword, oldPassword } = req.body;
    
    const user = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (oldPassword && user.password !== oldPassword) {
      return res.status(401).json({ error: 'Incorrect old password' });
    }
    
    await db.update(users).set({ password: newPassword }).where(eq(users.id, id));
    res.json({ success: true });
  });

  app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    await db.delete(users).where(eq(users.id, id));
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Seed default users if they don't exist
  async function seed() {
    const existingUsers = await db.select().from(users);
    if (existingUsers.length === 0) {
      console.log('Seeding default users...');
      await db.insert(users).values([
        { username: 'admin', password: 'admin', role: 'admin', firstName: 'Admin', lastName: 'Master' },
        { username: 'ivone', password: 'ivone1234', role: 'user', firstName: 'Ivone', lastName: 'Silva' },
      ]);
    }
  }
  await seed();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
