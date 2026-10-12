import { randomUUID } from 'node:crypto';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { LOGIN_ATTEMPT_SCRIPT } from '../server/lib/login-script.mjs';

const required = Boolean(process.env.VERCEL) || process.argv.includes('--required');
if (!required) { console.log('Build local: integrações externas serão verificadas antes da publicação.'); process.exit(0); }
const url = process.env.AUTH_REDIS_REST_URL;
const token = process.env.AUTH_REDIS_REST_TOKEN;
const database = process.env.ivone_DATABASE_URL || process.env.IVONE_DATABASE_URL || process.env.DATABASE_URL;
const missing = [!url && 'AUTH_REDIS_REST_URL', !token && 'AUTH_REDIS_REST_TOKEN', !database && 'conexão Neon'].filter(Boolean);
if (missing.length) { console.error(`Publicação bloqueada: configuração ausente (${missing.join(', ')}).`); process.exit(1); }
const probe = `ivone:release-check:${randomUUID()}`;
async function redis(command) {
  if (new URL(url).protocol !== 'https:') throw new Error();
  const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(command), signal: AbortSignal.timeout(5000), redirect: 'error' });
  if (!response.ok) throw new Error();
  const body = await response.json();
  if (body.error || !Object.hasOwn(body, 'result')) throw new Error();
  return body.result;
}
try {
  if (await redis(['SET', probe, 'ready', 'EX', 60, 'NX']) !== 'OK') throw new Error();
  if (await redis(['GET', probe]) !== 'ready') throw new Error();
  if (await redis(['DEL', probe]) !== 1) throw new Error();
  if (await redis(['GET', probe]) !== null) throw new Error();
  if (await redis(['EVAL', LOGIN_ATTEMPT_SCRIPT, 1, probe, 60]) !== 1) throw new Error();
  if (await redis(['DEL', probe]) !== 1) throw new Error();
  console.log('Redis real: gravação temporária, leitura e revogação verificadas.');
} catch {
  try { await redis(['DEL', probe]); } catch { /* the probe expires in 60 seconds */ }
  console.error('Publicação bloqueada: Redis real indisponível ou com resposta inválida.'); process.exit(1);
}
neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: database, connectionTimeoutMillis: 5000, query_timeout: 10000 });
let client;
try {
  client = await pool.connect(); await client.query('BEGIN READ ONLY');
  const columns = (await client.query("SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='operacoes_financeiras'")).rows;
  for (const [name, type] of [['operation_id', 'uuid'], ['user_id', 'text'], ['fingerprint', 'text'], ['result', 'jsonb']]) if (!columns.some(c => c.column_name === name && c.data_type === type && c.is_nullable === 'NO')) throw new Error();
  const primary = (await client.query("SELECT 1 FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu USING (constraint_catalog,constraint_schema,constraint_name,table_name) WHERE tc.table_schema='public' AND tc.table_name='operacoes_financeiras' AND tc.constraint_type='PRIMARY KEY' AND kcu.column_name='operation_id'")).rows;
  if (!primary.length) throw new Error();
  const check = (await client.query(`SELECT
    (SELECT count(*) FROM vendas v LEFT JOIN clientes c ON c.id=v.client_id WHERE c.id IS NULL OR v.sale_date IS NULL OR v.quantity IS NULL OR v.quantity<=0 OR v.unit_price<0 OR v.total<>v.unit_price*v.quantity OR v.unit_price<>round(v.unit_price,2) OR v.total<>round(v.total,2)) AS bad_sales,
    (SELECT count(*) FROM pagamentos p LEFT JOIN clientes c ON c.id=p.client_id WHERE c.id IS NULL OR p.payment_date IS NULL OR p.amount<=0 OR p.amount<>round(p.amount,2)) AS bad_payments`)).rows[0];
  if (Number(check.bad_sales) || Number(check.bad_payments)) throw new Error();
  await client.query('ROLLBACK'); console.log('Neon: schema de idempotência e integridade financeira verificados somente para leitura.');
} catch {
  if (client) try { await client.query('ROLLBACK'); } catch {}
  console.error('Publicação bloqueada: verifique o schema de idempotência e a integridade financeira no Neon. Nenhuma alteração foi executada.'); process.exitCode = 1;
} finally { if (client) client.release(); await pool.end(); }
