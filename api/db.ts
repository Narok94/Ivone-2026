import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();

let connectionString = process.env.IVONE_DATABASE_URL || process.env.DATABASE_URL || '';

if (connectionString && !connectionString.includes('schema=')) {
  const separator = connectionString.includes('?') ? '&' : '?';
  connectionString += `${separator}schema=public`;
}

console.log('[DB LOG] Environment Status:');
console.log(' - IVONE_DATABASE_URL:', process.env.IVONE_DATABASE_URL ? 'DEFINED' : 'MISSING');
console.log(' - DATABASE_URL:', process.env.DATABASE_URL ? 'DEFINED' : 'MISSING');

// Required for @neondatabase/serverless in Node environments
if (typeof window === 'undefined') {
  try {
    // Enable fetch for potentially better compatibility in some environments
    (neonConfig as any).useFetch = true;
    const wsConstructor = (ws as any).default || ws;
    neonConfig.webSocketConstructor = wsConstructor;
    console.log('[DB LOG] Neon Config: useFetch=true, WebSocket constructor set.');
  } catch (e) {
    console.error('[DB LOG] Error configuring Neon:', e);
  }
}

// Wrapper for queries to log them
const originalPoolQuery = Pool.prototype.query;
(Pool.prototype as any).query = function(...args: any[]) {
  const sql = typeof args[0] === 'string' ? args[0].substring(0, 50).replace(/\n/g, ' ') : 'Complex Query';
  console.log(`[DB QUERY] ${sql}...`);
  return (originalPoolQuery as any).apply(this, args);
};

// Create pool lazily
export const pool = new Pool({
  connectionString: connectionString || '',
});

export const initDb = async () => {
    if (!connectionString) {
      console.error('[DB LOG] ❌ CRITICAL: No connection string found! Database operations will fail.');
      return;
    }
    
    try {
      console.log('[DB LOG] Attempting to connect to Neon...');
      await pool.query('SELECT 1');
      console.log('[DB LOG] ✅ Basic connection successful.');

      // 1. Create tables one by one for better error tracking
      console.log('[DB LOG] Syncing schema...');
      
      const tables = [
        {
          name: 'usuarios',
          sql: `CREATE TABLE IF NOT EXISTS public.usuarios (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            username TEXT UNIQUE,
            pin TEXT NOT NULL
          )`
        },
        {
          name: 'clientes',
          sql: `CREATE TABLE IF NOT EXISTS public.clientes (
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
          )`
        },
        {
          name: 'vendas',
          sql: `CREATE TABLE IF NOT EXISTS public.vendas (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
            sale_date DATE DEFAULT CURRENT_DATE,
            product_name TEXT NOT NULL,
            quantity INTEGER DEFAULT 1,
            unit_price DECIMAL(10,2) NOT NULL,
            total DECIMAL(10,2) NOT NULL,
            observation TEXT,
            product_code TEXT
          )`
        },
        {
          name: 'pagamentos',
          sql: `CREATE TABLE IF NOT EXISTS public.pagamentos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
            payment_date DATE DEFAULT CURRENT_DATE,
            amount DECIMAL(10,2) NOT NULL,
            observation TEXT
          )`
        }
      ];

      for (const table of tables) {
        await pool.query(table.sql);
        console.log(`[DB LOG] Table "public.${table.name}" checked/created.`);
      }

      // 2. Critical Fix: Ensure 'username' exists in 'usuarios' if it was created differently before
      try {
        await pool.query('ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS username TEXT');
        await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_username ON public.usuarios(username)');
        console.log('[DB LOG] Column "username" in "public.usuarios" verified.');
      } catch (e: any) {
        console.warn('[DB LOG] Column verification warning:', e.message);
      }

      // 3. Ensure default user exists
      console.log('[DB LOG] Verifying default user (Ivone)...');
      await pool.query(`
        INSERT INTO public.usuarios (username, pin) 
        VALUES ('Ivone', '2026') 
        ON CONFLICT (username) DO NOTHING
      `);
      console.log('[DB LOG] Default user sync finished.');
      
    } catch (err: any) {
      console.error("[DB LOG] ❌ Database sync error:", err.message);
      // Don't throw, let the app run but routes will fail with clear errors
    }
};
