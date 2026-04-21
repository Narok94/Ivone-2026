import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();

// Required for @neondatabase/serverless in Node environments
if (typeof window === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

const connectionString = process.env.IVONE_DATABASE_URL || process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString: connectionString,
});

export const initDb = async () => {
    if (!connectionString) {
       console.error("❌ ERRO CRÍTICO: Nenhuma URL de banco de dados encontrada (IVONE_DATABASE_URL).");
       return;
    }
    try {
      await pool.query('SELECT 1');
      console.log('✅ Conexão com o Neon estabelecida!');

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
      
      const ivone = await pool.query("SELECT * FROM usuarios WHERE username = 'Ivone'");
      if (ivone.rows.length === 0) {
        await pool.query("INSERT INTO usuarios (username, pin) VALUES ('Ivone', '2026')");
      }
    } catch (err) {
      console.error("❌ Erro ao inicializar o banco de dados:", err);
    }
};
