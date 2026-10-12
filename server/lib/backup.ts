import { cents, decimal, validDate } from '../../src/lib/finance.js';
import { FinancialError } from './financial.js';
const uuid = (value: unknown) => typeof value === 'string' && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value);
const date = (value: any) => typeof value === 'string' ? value.slice(0, 10) : '';
export function validateBackup(body: any) {
  const data = body?.data ?? body;
  if (!data || !Array.isArray(data.clients) || !Array.isArray(data.sales) || !Array.isArray(data.payments)) throw new FinancialError('O backup precisa conter clientes, vendas e pagamentos.');
  const unique = (rows: any[]) => { const ids = new Set<string>(); for (const row of rows) { if (!row || !uuid(row.id) || ids.has(row.id)) throw new FinancialError('O backup tem IDs ausentes ou duplicados.'); ids.add(row.id); } return ids; };
  const ids = unique(data.clients); unique(data.sales); unique(data.payments);
  for (const row of data.clients) if (typeof (row.full_name ?? row.fullName) !== 'string' || !(row.full_name ?? row.fullName).trim()) throw new FinancialError('O backup contém uma cliente sem nome.');
  for (const row of data.sales) {
    const clientId = row.client_id ?? row.clientId;
    const quantity = row.quantity;
    const price = cents(row.unit_price ?? row.unitPrice);
    const total = cents(row.total);
    if (!ids.has(clientId) || !validDate(date(row.sale_date ?? row.saleDate)) || !Number.isSafeInteger(quantity) || quantity <= 0 || price < 0 || total !== quantity * price || typeof (row.product_name ?? row.productName) !== 'string' || !(row.product_name ?? row.productName).trim()) throw new FinancialError('Confira os valores, as datas e os relacionamentos das vendas no backup.');
  }
  for (const row of data.payments) if (!ids.has(row.client_id ?? row.clientId) || !validDate(date(row.payment_date ?? row.paymentDate)) || cents(row.amount) <= 0) throw new FinancialError('Confira os pagamentos e seus relacionamentos no backup.');
  if (data.operations !== undefined && !Array.isArray(data.operations)) throw new FinancialError('Controle de operações inválido.');
  const operationIds = new Set<string>();
  for (const row of data.operations ?? []) {
    if (!uuid(row.operation_id) || operationIds.has(row.operation_id) || typeof row.user_id !== 'string' || !row.user_id || !/^[a-f\d]{64}$/.test(row.fingerprint) || !row.result || typeof row.result !== 'object') throw new FinancialError('Controle de operações inválido.');
    operationIds.add(row.operation_id);
  }
  return data;
}
export async function readBackupRows(db: any) {
  const clients = (await db.query('SELECT * FROM clientes ORDER BY id')).rows;
  const sales = (await db.query('SELECT *,sale_date::text AS sale_date FROM vendas ORDER BY id')).rows;
  const payments = (await db.query('SELECT *,payment_date::text AS payment_date FROM pagamentos ORDER BY id')).rows;
  const present = (await db.query("SELECT to_regclass('public.operacoes_financeiras') AS present")).rows[0]?.present;
  const operations = present ? (await db.query('SELECT * FROM operacoes_financeiras ORDER BY operation_id')).rows : [];
  const data = { clients, sales, payments, operations }; validateBackup(data); return data;
}
export async function insertBackup(db: any, data: any) {
  await db.query('DELETE FROM pagamentos'); await db.query('DELETE FROM vendas'); await db.query('DELETE FROM clientes');
  for (const c of data.clients) await db.query('INSERT INTO clientes (id,full_name,phone,email,street,neighborhood,city,state,cep,number,complement,cpf,observation) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)', [c.id, c.full_name ?? c.fullName, c.phone ?? null, c.email ?? null, c.street ?? c.address ?? null, c.neighborhood ?? null, c.city ?? null, c.state ?? null, c.cep ?? null, c.number ?? null, c.complement ?? null, c.cpf ?? null, c.observation ?? null]);
  for (const s of data.sales) await db.query('INSERT INTO vendas (id,client_id,sale_date,product_name,quantity,unit_price,total,observation,product_code) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [s.id, s.client_id ?? s.clientId, date(s.sale_date ?? s.saleDate), s.product_name ?? s.productName, s.quantity, decimal(cents(s.unit_price ?? s.unitPrice)), decimal(cents(s.total)), s.observation ?? null, s.product_code ?? s.productCode ?? null]);
  for (const p of data.payments) await db.query('INSERT INTO pagamentos (id,client_id,payment_date,amount,observation) VALUES ($1,$2,$3,$4,$5)', [p.id, p.client_id ?? p.clientId, date(p.payment_date ?? p.paymentDate), decimal(cents(p.amount)), p.observation ?? null]);
  // Receipts are tombstones: restores never erase confirmations already consumed.
  for (const operation of data.operations ?? []) await db.query('INSERT INTO operacoes_financeiras (operation_id,user_id,fingerprint,result) VALUES ($1,$2,$3,$4::jsonb) ON CONFLICT (operation_id) DO NOTHING', [operation.operation_id, operation.user_id, operation.fingerprint, JSON.stringify(operation.result)]);
}
