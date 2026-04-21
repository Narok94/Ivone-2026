import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Database Initialization
  const initDb = async () => {
    if (!process.env.DATABASE_URL) {
       console.warn("DATABASE_URL not found. Database features will be limited.");
       return;
    }
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username TEXT UNIQUE NOT NULL,
          pin TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS clientes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          full_name TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          street TEXT,
          neighborhood TEXT,
          city TEXT,
          state TEXT,
          cep TEXT,
          number TEXT,
          complement TEXT,
          cpf TEXT,
          observation TEXT
        );
        CREATE TABLE IF NOT EXISTS vendas (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          client_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
          sale_date DATE DEFAULT CURRENT_DATE,
          product_name TEXT NOT NULL,
          quantity INTEGER DEFAULT 1,
          unit_price DECIMAL(10,2) NOT NULL,
          total DECIMAL(10,2) NOT NULL,
          observation TEXT,
          product_code TEXT
        );
        CREATE TABLE IF NOT EXISTS pagamentos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          client_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
          payment_date DATE DEFAULT CURRENT_DATE,
          amount DECIMAL(10,2) NOT NULL,
          observation TEXT
        );
      `);
      
      // Check if Ivone exists, if not create her as default user
      const ivone = await pool.query("SELECT * FROM usuarios WHERE username = 'Ivone'");
      if (ivone.rows.length === 0) {
        await pool.query("INSERT INTO usuarios (username, pin) VALUES ('Ivone', '2026')");
      }
    } catch (err) {
      console.error("Error initializing database:", err);
    }
  };

  await initDb();

  // API Routes
  app.post('/api/login', async (req, res) => {
    const { username, pin } = req.body;
    try {
      const result = await pool.query('SELECT * FROM usuarios WHERE username = $1 AND pin = $2', [username, pin]);
      if (result.rows.length > 0) {
        res.json({ success: true, user: { id: result.rows[0].id, username: result.rows[0].username } });
      } else {
        res.status(401).json({ success: false, message: 'PIN incorreto. Tente novamente. 🌸' });
      }
    } catch (err) {
      res.status(500).json({ error: 'Erro no servidor' });
    }
  });

  app.get('/api/clients', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM clientes ORDER BY full_name ASC');
      res.json(result.rows.map(r => ({
        id: r.id,
        fullName: r.full_name,
        phone: r.phone || '',
        email: r.email || '',
        street: r.street || '',
        neighborhood: r.neighborhood || '',
        city: r.city || '',
        state: r.state || '',
        cep: r.cep || '',
        number: r.number || '',
        complement: r.complement || '',
        cpf: r.cpf || '',
        observation: r.observation || ''
      })));
    } catch (err) {
      res.status(500).json({ error: 'Erro ao buscar clientes' });
    }
  });

  app.post('/api/clients', async (req, res) => {
    const c = req.body;
    try {
      const result = await pool.query(
        'INSERT INTO clientes (full_name, phone, email, street, neighborhood, city, state, cep, number, complement, cpf, observation) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
        [c.fullName, c.phone, c.email, c.street, c.neighborhood, c.city, c.state, c.cep, c.number, c.complement, c.cpf, c.observation]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Erro ao salvar cliente' });
    }
  });

  app.delete('/api/clients/:id', async (req, res) => {
    try {
      await pool.query('DELETE FROM clientes WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao excluir cliente' });
    }
  });

  app.get('/api/sales', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM vendas ORDER BY sale_date DESC');
      res.json(result.rows.map(r => ({
        id: r.id,
        clientId: r.client_id,
        saleDate: r.sale_date.toISOString().split('T')[0],
        productName: r.product_name,
        quantity: r.quantity,
        unitPrice: parseFloat(r.unit_price),
        total: parseFloat(r.total),
        observation: r.observation || '',
        productCode: r.product_code || ''
      })));
    } catch (err) {
      res.status(500).json({ error: 'Erro ao buscar vendas' });
    }
  });

  app.post('/api/sales', async (req, res) => {
    const s = req.body;
    try {
      const result = await pool.query(
        'INSERT INTO vendas (client_id, sale_date, product_name, quantity, unit_price, total, observation, product_code) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [s.clientId, s.saleDate, s.productName, s.quantity, s.unitPrice, s.total, s.observation, s.productCode]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Erro ao salvar venda' });
    }
  });

  app.delete('/api/sales/:id', async (req, res) => {
    try {
      await pool.query('DELETE FROM vendas WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao excluir venda' });
    }
  });

  app.get('/api/payments', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM pagamentos ORDER BY payment_date DESC');
      res.json(result.rows.map(r => ({
        id: r.id,
        clientId: r.client_id,
        paymentDate: r.payment_date.toISOString().split('T')[0],
        amount: parseFloat(r.amount),
        observation: r.observation || ''
      })));
    } catch (err) {
      res.status(500).json({ error: 'Erro ao buscar pagamentos' });
    }
  });

  app.post('/api/payments', async (req, res) => {
    const p = req.body;
    try {
      const result = await pool.query(
        'INSERT INTO pagamentos (client_id, payment_date, amount, observation) VALUES ($1, $2, $3, $4) RETURNING *',
        [p.clientId, p.paymentDate, p.amount, p.observation]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Erro ao salvar pagamento' });
    }
  });

  app.delete('/api/payments/:id', async (req, res) => {
    try {
      await pool.query('DELETE FROM pagamentos WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao excluir pagamento' });
    }
  });

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
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
