// PostgreSQL exclusively in memory: no disk persistence, dotenv, Neon or network.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
export const db = new PGlite();
const ready = (async () => {
  await db.exec(`CREATE TABLE clientes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL, phone text, email text, street text, neighborhood text, city text, state text, cep text, number text, complement text, cpf text, observation text);
    CREATE TABLE vendas (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),client_id uuid REFERENCES clientes(id) ON DELETE CASCADE,sale_date date,product_name text NOT NULL,quantity integer,unit_price numeric NOT NULL,total numeric NOT NULL,observation text,product_code text);
    CREATE TABLE pagamentos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),client_id uuid REFERENCES clientes(id) ON DELETE CASCADE,payment_date date,amount numeric NOT NULL,observation text);
    CREATE TABLE usuarios (id integer PRIMARY KEY,username text,pin text NOT NULL);`);
  await db.exec(readFileSync(new URL('../../db/001_financial_operations.sql', import.meta.url), 'utf8'));
  await db.query('INSERT INTO usuarios VALUES ($1,$2,$3)', [990094, 'Teste local fictício', '0000']);
  for (const name of ['Maria', 'Jessica']) await db.query('INSERT INTO clientes (full_name,observation) VALUES ($1,$2)', [name, 'Cliente fictícia para testes locais']);
})();
let queue = Promise.resolve();
export const pool = {
  sandboxOnly: true as const,
  async connect() {
    await ready;
    const previous = queue;
    let unlock!: () => void;
    queue = new Promise<void>(resolve => { unlock = resolve; });
    await previous;
    let released = false;
    return { query: (sql: string, args?: any[]) => db.query(sql, args), release() { if (!released) { released = true; unlock(); } } };
  },
  async query(sql: string, args?: any[]) { const connection = await this.connect(); try { return await connection.query(sql, args); } finally { connection.release(); } },
  async end() { await ready; await queue; await db.close(); },
};
