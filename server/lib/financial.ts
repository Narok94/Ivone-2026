import { createHash } from 'node:crypto';
import { cents, clientBalance, decimal, FinancialOperation, FinancialResult, lineTotal, MAX_CENTS, sumCents, today, validDate } from '../../src/lib/finance.js';
export class FinancialError extends Error { constructor(message: string, public status = 400) { super(message); } }
const uuid = (value: unknown) => typeof value === 'string' && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value);
function text(value: unknown, limit: number) { if (typeof value !== 'string' || value.length > limit) throw new FinancialError('Confira os textos informados.'); return value.trim(); }
export function validateOperation(raw: any): FinancialOperation {
  if (!raw || raw.confirmed !== true || !uuid(raw.operationId) || !uuid(raw.clientId) || !validDate(raw.date)) throw new FinancialError('Confirme a operação, a cliente e a data.');
  if (!['sale', 'payment', 'edit_sale', 'edit_payment', 'delete_sale', 'delete_payment'].includes(raw.kind)) throw new FinancialError('Operação inválida.');
  const op: FinancialOperation = { operationId: raw.operationId.toLowerCase(), confirmed: true, kind: raw.kind, clientId: raw.clientId.toLowerCase(), date: raw.date, observation: text(raw.observation ?? '', 2000) };
  if (raw.kind.startsWith('edit_') || raw.kind.startsWith('delete_')) { if (!uuid(raw.targetId)) throw new FinancialError('Registro inválido.'); op.targetId = raw.targetId.toLowerCase(); }
  if (raw.kind === 'sale' || raw.kind === 'edit_sale') {
    if (!Array.isArray(raw.items) || raw.items.length < 1 || raw.items.length > 50 || (raw.kind === 'edit_sale' && raw.items.length !== 1)) throw new FinancialError('Confira os produtos da venda.');
    op.items = raw.items.map((item: any) => {
      if (!item) throw new FinancialError('Produto inválido.');
      const productName = text(item.productName, 300);
      if (!productName) throw new FinancialError('Informe o produto.');
      try { lineTotal(item.quantity, item.unitCents); } catch { throw new FinancialError('Confira a quantidade e o valor por unidade.'); }
      return { productName, productCode: text(item.productCode ?? '', 100), quantity: item.quantity, unitCents: item.unitCents };
    });
    const total = sumCents(op.items.map(item => lineTotal(item.quantity, item.unitCents)));
    if (total > MAX_CENTS) throw new FinancialError('Total fora do limite permitido.');
    op.receivedCents = raw.receivedCents ?? 0;
    if (!Number.isSafeInteger(op.receivedCents) || op.receivedCents < 0 || op.receivedCents > total || (raw.kind === 'edit_sale' && op.receivedCents !== 0)) throw new FinancialError('Confira o valor recebido.');
    if (op.receivedCents > 0 && op.date > today()) throw new FinancialError('Confira a data: um recebimento não pode ser registrado no futuro.');
  }
  if (raw.kind === 'payment' || raw.kind === 'edit_payment') {
    if (!Number.isSafeInteger(raw.amountCents) || raw.amountCents <= 0 || raw.amountCents > MAX_CENTS) throw new FinancialError('Informe um pagamento maior que zero.');
    op.amountCents = raw.amountCents; op.allowCredit = raw.allowCredit === true;
    if (op.date > today()) throw new FinancialError('Confira a data: um recebimento não pode ser registrado no futuro.');
  }
  return op;
}
export const saleRow = (r: any) => ({ id: r.id, clientId: r.client_id, saleDate: typeof r.sale_date === 'string' ? r.sale_date.slice(0, 10) : r.sale_date.toISOString().slice(0, 10), productName: r.product_name, productCode: r.product_code ?? '', quantity: r.quantity, unitPrice: Number(decimal(cents(r.unit_price))), total: Number(decimal(cents(r.total))), observation: r.observation ?? '' });
export const paymentRow = (r: any) => ({ id: r.id, clientId: r.client_id, paymentDate: typeof r.payment_date === 'string' ? r.payment_date.slice(0, 10) : r.payment_date.toISOString().slice(0, 10), amount: Number(decimal(cents(r.amount))), observation: r.observation ?? '' });
export const FINANCIAL_LOCK = 754631;
export async function withFinancialLock<T>(pool: any, work: (db: any) => Promise<T>): Promise<T> {
  const db = await pool.connect();
  let discard = false;
  try { await db.query('BEGIN'); await db.query('SELECT pg_advisory_xact_lock($1)', [FINANCIAL_LOCK]); const result = await work(db); await db.query('COMMIT'); return result; }
  catch (error) { discard = true; try { await db.query('ROLLBACK'); } catch {} throw error; }
  finally { db.release(discard ? new Error('Transaction failed') : undefined); }
}
export const clientRow = (r: any) => ({ id: r.id, fullName: r.full_name, phone: r.phone ?? '', email: r.email ?? '', street: r.street ?? '', neighborhood: r.neighborhood ?? '', city: r.city ?? '', state: r.state ?? '', cep: r.cep ?? '', number: r.number ?? '', complement: r.complement ?? '', cpf: r.cpf ?? '', observation: r.observation ?? '' });
export async function readFinancialSnapshot(pool: any, clientIds?: string[]) {
  const db = await pool.connect();
  let discard = false;
  try {
    await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const clients = (await db.query(clientIds ? 'SELECT * FROM clientes WHERE id=ANY($1::uuid[]) ORDER BY full_name,id' : 'SELECT * FROM clientes ORDER BY full_name, id', clientIds ? [clientIds] : undefined)).rows.map(clientRow);
    const sales = (await db.query(clientIds ? 'SELECT v.*,v.sale_date::text AS sale_date,c.full_name AS client_name FROM vendas v JOIN clientes c ON c.id=v.client_id ORDER BY v.sale_date DESC,v.id' : 'SELECT *,sale_date::text AS sale_date FROM vendas ORDER BY vendas.sale_date DESC,vendas.id')).rows.map((r: any) => ({ ...saleRow(r), ...(clientIds ? { clientName: r.client_name } : {}) }));
    const payments = (await db.query(clientIds ? 'SELECT p.*,p.payment_date::text AS payment_date,c.full_name AS client_name FROM pagamentos p JOIN clientes c ON c.id=p.client_id ORDER BY p.payment_date DESC,p.id' : 'SELECT *,payment_date::text AS payment_date FROM pagamentos ORDER BY pagamentos.payment_date DESC,pagamentos.id')).rows.map((r: any) => ({ ...paymentRow(r), ...(clientIds ? { clientName: r.client_name } : {}) }));
    await db.query('COMMIT'); return { clients, sales, payments };
  } catch (error) { discard = true; try { await db.query('ROLLBACK'); } catch {} throw error; }
  finally { db.release(discard ? new Error('Transaction failed') : undefined); }
}
async function snapshot(db: any, op: { clientId: string; operationId: string }, replayed: boolean, ids: { saleIds?: string[]; paymentIds?: string[] } = {}): Promise<FinancialResult> {
  const sales = (await db.query('SELECT *, sale_date::text AS sale_date FROM vendas ORDER BY vendas.sale_date DESC, vendas.id')).rows.map(saleRow);
  const payments = (await db.query('SELECT *, payment_date::text AS payment_date FROM pagamentos ORDER BY pagamentos.payment_date DESC, pagamentos.id')).rows.map(paymentRow);
  return { ...ids, sales, payments, clientId: op.clientId, balanceCents: clientBalance(sales, payments, op.clientId), operationId: op.operationId, replayed };
}
export async function executeFinancial(pool: any, userId: string, raw: unknown): Promise<FinancialResult> {
  const op = validateOperation(raw);
  const hash = createHash('sha256').update(JSON.stringify(op)).digest('hex');
  const db = await pool.connect();
  let discard = false;
  try {
    await db.query('BEGIN');
    // Small single-owner application: serializes financial changes and restores.
    await db.query('SELECT pg_advisory_xact_lock($1)', [FINANCIAL_LOCK]);
    const receipt = (await db.query('SELECT user_id, fingerprint, result FROM operacoes_financeiras WHERE operation_id=$1', [op.operationId])).rows[0];
    if (receipt) {
      if (receipt.user_id !== String(userId) || receipt.fingerprint !== hash) throw new FinancialError('Esta confirmação já foi usada com outros dados.', 409);
      const result = await snapshot(db, op, true, receipt.result); await db.query('COMMIT'); return result;
    }
    if (!(await db.query('SELECT id FROM clientes WHERE id=$1 FOR UPDATE', [op.clientId])).rows.length) throw new FinancialError('Cliente não encontrada. Atualize e selecione novamente.', 404);
    let existing: any;
    if (op.targetId) {
      const table = op.kind.endsWith('sale') ? 'vendas' : 'pagamentos';
      existing = (await db.query(`SELECT * FROM ${table} WHERE id=$1 FOR UPDATE`, [op.targetId])).rows[0];
      if (!existing) throw new FinancialError('Registro não encontrado.', 404);
      if (op.kind.startsWith('delete_') && existing.client_id !== op.clientId) throw new FinancialError('Confira a cliente do registro.', 409);
    }
    if (op.kind === 'payment' || op.kind === 'edit_payment') {
      const amounts = (await db.query('SELECT COALESCE((SELECT SUM(total) FROM vendas WHERE client_id=$1),0)::text AS sold, COALESCE((SELECT SUM(amount) FROM pagamentos WHERE client_id=$1),0)::text AS paid', [op.clientId])).rows[0];
      const available = cents(amounts.sold) - cents(amounts.paid) + (existing?.client_id === op.clientId ? cents(existing.amount) : 0);
      if (op.amountCents! > available && !op.allowCredit) throw new FinancialError('O pagamento gera crédito. Confira e confirme esse crédito explicitamente.');
    }
    const ids = { saleIds: [] as string[], paymentIds: [] as string[] };
    if (op.kind === 'sale') for (const item of op.items!) { const row = (await db.query('INSERT INTO vendas (client_id,sale_date,product_name,quantity,unit_price,total,observation,product_code) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id', [op.clientId, op.date, item.productName, item.quantity, decimal(item.unitCents), decimal(lineTotal(item.quantity, item.unitCents)), op.observation, item.productCode])).rows[0]; ids.saleIds.push(row.id); }
    if ((op.kind === 'sale' && op.receivedCents! > 0) || op.kind === 'payment') { const row = (await db.query('INSERT INTO pagamentos (client_id,payment_date,amount,observation) VALUES ($1,$2,$3,$4) RETURNING id', [op.clientId, op.date, decimal(op.kind === 'sale' ? op.receivedCents! : op.amountCents!), op.observation])).rows[0]; ids.paymentIds.push(row.id); }
    if (op.kind === 'edit_sale') {
      const item = op.items![0];
      await db.query('UPDATE vendas SET client_id=$1,sale_date=$2,product_name=$3,quantity=$4,unit_price=$5,total=$6,observation=$7,product_code=$8 WHERE id=$9', [op.clientId, op.date, item.productName, item.quantity, decimal(item.unitCents), decimal(lineTotal(item.quantity, item.unitCents)), op.observation, item.productCode, op.targetId]);
    }
    if (op.kind === 'edit_payment') await db.query('UPDATE pagamentos SET client_id=$1,payment_date=$2,amount=$3,observation=$4 WHERE id=$5', [op.clientId, op.date, decimal(op.amountCents!), op.observation, op.targetId]);
    if (op.kind === 'delete_sale') await db.query('DELETE FROM vendas WHERE id=$1', [op.targetId]);
    if (op.kind === 'delete_payment') await db.query('DELETE FROM pagamentos WHERE id=$1', [op.targetId]);
    await db.query('INSERT INTO operacoes_financeiras (operation_id,user_id,fingerprint,result) VALUES ($1,$2,$3,$4::jsonb)', [op.operationId, String(userId), hash, JSON.stringify({ ...ids, clientId: op.clientId, kind: op.kind })]);
    const result = await snapshot(db, op, false, ids);
    await db.query('COMMIT'); return result;
  } catch (error) { discard = true; try { await db.query('ROLLBACK'); } catch {} throw error; }
  finally { db.release(discard ? new Error('Transaction failed') : undefined); }
}
