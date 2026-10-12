import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { verifyAuthAndFinancialSchema } from './auth-schema.mjs';
import { verifyClientSearchSchema } from './client-search-schema.mjs';
const required = Boolean(process.env.VERCEL) || process.argv.includes('--required');
if (!required) { console.log('Build local: schema Neon será verificado antes da publicação.'); process.exit(0); }
const database = process.env.ivone_DATABASE_URL || process.env.IVONE_DATABASE_URL || process.env.DATABASE_URL;
if (!database) { console.error('Publicação bloqueada: conexão Neon ausente.'); process.exit(1); }
neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: database, connectionTimeoutMillis: 5000, query_timeout: 10000 });
pool.on('error', () => {});
let client;
try {
  client = await pool.connect(); await client.query('BEGIN READ ONLY');
  await verifyAuthAndFinancialSchema(client);
  await verifyClientSearchSchema(client);
  const check = (await client.query(`SELECT
    (SELECT count(*) FROM vendas v LEFT JOIN clientes c ON c.id=v.client_id WHERE c.id IS NULL OR v.sale_date IS NULL OR v.quantity IS NULL OR v.quantity<=0 OR v.unit_price<0 OR v.total<>v.unit_price*v.quantity OR v.unit_price<>round(v.unit_price,2) OR v.total<>round(v.total,2)) AS bad_sales,
    (SELECT count(*) FROM pagamentos p LEFT JOIN clientes c ON c.id=p.client_id WHERE c.id IS NULL OR p.payment_date IS NULL OR p.amount<=0 OR p.amount<>round(p.amount,2)) AS bad_payments`)).rows[0];
  if (Number(check.bad_sales) || Number(check.bad_payments)) throw new Error();
  await client.query('ROLLBACK');
  console.log('Neon: sessões, limite de tentativas, idempotência e integridade financeira verificados somente por leitura.');
} catch {
  if (client) try { await client.query('ROLLBACK'); } catch {}
  console.error('Publicação bloqueada: confira os SQL 001/002, índices, expiração e integridade financeira no Neon. Nenhuma alteração foi executada.'); process.exitCode = 1;
} finally { if (client) client.release(); await pool.end(); }
