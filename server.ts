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

const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log('DATABASE_URL is', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

  app.use(express.json());

  // Global logger to see every request
  app.use((req, res, next) => {
    console.log(`[Global Request] ${req.method} ${req.url}`);
    next();
  });

  // Priority User Creation Route (Directly on app to avoid router issues)
  app.post('/api/users', async (req, res) => {
    try {
      const data = req.body;
      console.log('DIRECT POST /api/users reached. Body:', { ...data, password: '***' });
      const [newUser] = await db.insert(users).values(data).returning();
      res.json(newUser);
    } catch (error) {
      console.error('Error creating user (direct):', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      res.status(400).json({ 
        error: `Erro ao criar usuário: ${message}`,
        details: error
      });
    }
  });

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
  
  const apiRouter = express.Router();

  // Middleware to check DB connection for all /api routes
  apiRouter.use((req, res, next) => {
    console.log(`[API Request] ${req.method} ${req.originalUrl} - Path: ${req.path}`);
    if (!process.env.DATABASE_URL) {
      return res.status(503).json({ error: 'Banco de dados não configurado. Por favor, adicione DATABASE_URL nos Secrets.' });
    }
    next();
  });

  // Users - POST moved to direct app route for priority
  apiRouter.get('/users', async (req, res) => {
    try {
      const result = await db.select().from(users);
      res.json(result);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
  });

  apiRouter.put('/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
      res.json(updated);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
  });

  apiRouter.put('/users/:id/password', async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword, oldPassword } = req.body;
      
      const user = await db.query.users.findFirst({ where: eq(users.id, id) });
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
      
      if (oldPassword && user.password !== oldPassword) {
        return res.status(401).json({ error: 'Senha antiga incorreta' });
      }
      
      await db.update(users).set({ password: newPassword }).where(eq(users.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating password:', error);
      res.status(500).json({ error: 'Erro ao atualizar senha' });
    }
  });

  apiRouter.delete('/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(users).where(eq(users.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Erro ao excluir usuário' });
    }
  });

  // Auth
  apiRouter.post('/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await db.query.users.findFirst({
        where: and(eq(users.username, username), eq(users.password, password))
      });
      if (user) {
        res.json(user);
      } else {
        res.status(401).json({ error: 'Usuário ou senha inválidos' });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Erro no servidor durante o login' });
    }
  });

  // Clients
  apiRouter.get('/clients', async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId || !isUUID(userId)) return res.status(400).json({ error: 'Valid userId required' });
      const result = await db.select().from(clients).where(eq(clients.userId, userId));
      res.json(result);
    } catch (error) {
      console.error('Error fetching clients:', error);
      res.status(500).json({ error: 'Erro ao buscar clientes' });
    }
  });

  apiRouter.post('/clients', async (req, res) => {
    try {
      const { userId, ...data } = req.body;
      const [newClient] = await db.insert(clients).values({ userId, ...data }).returning();
      res.json(newClient);
    } catch (error) {
      console.error('Error creating client:', error);
      res.status(500).json({ error: 'Erro ao criar cliente' });
    }
  });

  apiRouter.put('/clients/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const [updated] = await db.update(clients).set(data).where(eq(clients.id, id)).returning();
      res.json(updated);
    } catch (error) {
      console.error('Error updating client:', error);
      res.status(500).json({ error: 'Erro ao atualizar cliente' });
    }
  });

  apiRouter.delete('/clients/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(clients).where(eq(clients.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting client:', error);
      res.status(500).json({ error: 'Erro ao excluir cliente' });
    }
  });

  // Stock
  apiRouter.get('/stock', async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId || !isUUID(userId)) return res.status(400).json({ error: 'Valid userId required' });
      const result = await db.select().from(stockItems).where(eq(stockItems.userId, userId));
      res.json(result);
    } catch (error) {
      console.error('Error fetching stock:', error);
      res.status(500).json({ error: 'Erro ao buscar estoque' });
    }
  });

  apiRouter.post('/stock', async (req, res) => {
    try {
      const { userId, ...data } = req.body;
      const [newItem] = await db.insert(stockItems).values({ userId, ...data }).returning();
      res.json(newItem);
    } catch (error) {
      console.error('Error creating stock item:', error);
      res.status(500).json({ error: 'Erro ao criar item no estoque' });
    }
  });

  apiRouter.put('/stock/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const [updated] = await db.update(stockItems).set(data).where(eq(stockItems.id, id)).returning();
      res.json(updated);
    } catch (error) {
      console.error('Error updating stock item:', error);
      res.status(500).json({ error: 'Erro ao atualizar item no estoque' });
    }
  });

  apiRouter.delete('/stock/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(stockItems).where(eq(stockItems.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting stock item:', error);
      res.status(500).json({ error: 'Erro ao excluir item do estoque' });
    }
  });

  // Sales
  apiRouter.get('/sales', async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId || !isUUID(userId)) return res.status(400).json({ error: 'Valid userId required' });
      const result = await db.select().from(sales).where(eq(sales.userId, userId));
      res.json(result);
    } catch (error) {
      console.error('Error fetching sales:', error);
      res.status(500).json({ error: 'Erro ao buscar vendas' });
    }
  });

  apiRouter.post('/sales', async (req, res) => {
    try {
      const { userId, ...data } = req.body;
      const [newSale] = await db.insert(sales).values({ userId, ...data }).returning();
      res.json(newSale);
    } catch (error) {
      console.error('Error creating sale:', error);
      res.status(500).json({ error: 'Erro ao registrar venda' });
    }
  });

  apiRouter.put('/sales/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const [updated] = await db.update(sales).set(data).where(eq(sales.id, id)).returning();
      res.json(updated);
    } catch (error) {
      console.error('Error updating sale:', error);
      res.status(500).json({ error: 'Erro ao atualizar venda' });
    }
  });

  apiRouter.delete('/sales/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(sales).where(eq(sales.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting sale:', error);
      res.status(500).json({ error: 'Erro ao excluir venda' });
    }
  });

  // Payments
  apiRouter.get('/payments', async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId || !isUUID(userId)) return res.status(400).json({ error: 'Valid userId required' });
      const result = await db.select().from(payments).where(eq(payments.userId, userId));
      res.json(result);
    } catch (error) {
      console.error('Error fetching payments:', error);
      res.status(500).json({ error: 'Erro ao buscar pagamentos' });
    }
  });

  apiRouter.post('/payments', async (req, res) => {
    try {
      const { userId, ...data } = req.body;
      const [newPayment] = await db.insert(payments).values({ userId, ...data }).returning();
      res.json(newPayment);
    } catch (error) {
      console.error('Error creating payment:', error);
      res.status(500).json({ error: 'Erro ao registrar pagamento' });
    }
  });

  apiRouter.put('/payments/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const [updated] = await db.update(payments).set(data).where(eq(payments.id, id)).returning();
      res.json(updated);
    } catch (error) {
      console.error('Error updating payment:', error);
      res.status(500).json({ error: 'Erro ao atualizar pagamento' });
    }
  });

  apiRouter.delete('/payments/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(payments).where(eq(payments.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting payment:', error);
      res.status(500).json({ error: 'Erro ao excluir pagamento' });
    }
  });

  // OPTIONS handler for preflights
  apiRouter.options('*', (req, res) => {
    res.sendStatus(200);
  });

  // Catch-all for unmatched API routes
  apiRouter.use((req, res) => {
    console.warn(`[API 404] Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
  });

  // Mount the router
  app.use('/api', apiRouter);

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
    try {
      console.log('Checking for existing users...');
      const existingUsers = await db.select().from(users);
      if (existingUsers.length === 0) {
        console.log('Seeding default users...');
        await db.insert(users).values([
          { username: 'admin', password: 'admin', role: 'admin', firstName: 'Admin', lastName: 'Master' },
          { username: 'ivone', password: 'ivone1234', role: 'user', firstName: 'Ivone', lastName: 'Silva' },
        ]);
        console.log('✅ Seed concluído com sucesso.');
      } else {
        console.log(`Database already has ${existingUsers.length} users.`);
      }
    } catch (error) {
      console.error('❌ Erro crítico no seed:', error);
      throw error;
    }
  }
  try {
    await seed();
  } catch (error) {
    console.warn('⚠️ Falha ao inicializar banco de dados:', error instanceof Error ? error.message : error);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
