// Isolated PostgreSQL engine in memory. Never imports Neon, dotenv or api/db.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
export const db = new PGlite();
export const pin = String(randomBytes(4).readUInt32BE() % 10000).padStart(4, '0');
export const clientIds = ['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003'];
const ready = (async () => {
  await db.exec(`CREATE TABLE clientes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL, phone text, email text, street text, neighborhood text, city text, state text, cep text, number text, complement text, cpf text, observation text);
    CREATE TABLE vendas (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),client_id uuid REFERENCES clientes(id) ON DELETE CASCADE,sale_date date,product_name text NOT NULL,quantity integer,unit_price numeric NOT NULL,total numeric NOT NULL,observation text,product_code text);
    CREATE TABLE pagamentos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),client_id uuid REFERENCES clientes(id) ON DELETE CASCADE,payment_date date,amount numeric NOT NULL,observation text);
    CREATE TABLE usuarios (id integer PRIMARY KEY,username text,pin text NOT NULL);`);
  await db.exec(readFileSync(new URL('../../db/001_financial_operations.sql', import.meta.url), 'utf8'));
  await db.query('INSERT INTO usuarios VALUES ($1,$2,$3)', [99, 'Ivone', pin]);
  for (const [i, name] of ['Jessica', 'Maria', 'Jessica Silva'].entries()) await db.query('INSERT INTO clientes (id,full_name) VALUES ($1,$2)', [clientIds[i], name]);
})();
let queue = Promise.resolve();
export const pool = {
  fail: null as string | null,
  connectCount: 0,
  discardedConnections: 0,
  async connect() {
    await ready;
    this.connectCount++;
    const previous = queue;
    let release!: () => void;
    queue = new Promise<void>(resolve => { release = resolve; });
    await previous;
    let released = false;
    const fixture = this;
    return {
      query: async (sql: string, args?: any[]) => {
        if (this.fail && (sql.includes(this.fail) || args?.includes(this.fail))) throw new Error('Injected failure in isolated PostgreSQL');
        return db.query(sql, args);
      },
      release(error?: Error) { if (!released) { if (error) fixture.discardedConnections++; released = true; release(); } },
    };
  },
  async query(sql: string, args?: any[]) { const connection = await this.connect(); try { return await connection.query(sql, args); } finally { connection.release(); } },
  async reset() { this.fail = null; await this.query('TRUNCATE vendas,pagamentos,operacoes_financeiras'); },
  async end() { await ready; await queue; await db.close(); },
};
