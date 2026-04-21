import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();

console.log('[DB LOG] Checking environment variables...');
console.log('[DB LOG] IVONE_DATABASE_URL present:', !!process.env.IVONE_DATABASE_URL);
console.log('[DB LOG] DATABASE_URL present:', !!process.env.DATABASE_URL);

const connectionString = process.env.IVONE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('[DB LOG] ❌ No connection string found! Database will not work.');
} else {
  console.log('[DB LOG] Connection string start:', connectionString.substring(0, 15) + '...');
}

// Required for @neondatabase/serverless in Node environments
if (typeof window === 'undefined') {
  console.log('[DB LOG] Setting up neonConfig.webSocketConstructor');
  // Handle ESM/CJS interop for ws
  const wsConstructor = (ws as any).default || ws;
  neonConfig.webSocketConstructor = wsConstructor;
}

export const pool = new Pool({
  connectionString: connectionString,
});

export const initDb = async () => {
    if (!connectionString) return;
    
    try {
      await pool.query('SELECT 1');
      console.log('[DB LOG] ✅ SELECT 1 Success');

      // Check existing schema for troubleshooting
      try {
        const columns = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'usuarios'
        `);
        console.log('[DB LOG] Table "usuarios" columns:', columns.rows.map(r => r.column_name).join(', '));
      } catch (e) {
        console.warn('[DB LOG] Could not fetch columns for "usuarios":', e);
      }

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

      // Ensure 'username' column exists (in case table was created manually differently)
      try {
        await pool.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS username TEXT');
        // If it was added, we might need a unique constraint
        await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username)');
      } catch (e) {
        console.warn('[DB LOG] Could not alter table usuarios (it might be fine):', e);
      }
      
      const ivone = await pool.query("SELECT * FROM usuarios WHERE username = 'Ivone'");
      if (ivone.rows.length === 0) {
        await pool.query("INSERT INTO usuarios (username, pin) VALUES ('Ivone', '2026')");
      }
    } catch (err) {
      console.error("❌ Erro ao inicializar o banco de dados:", err);
    }
};
