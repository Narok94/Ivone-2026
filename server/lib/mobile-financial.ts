import { cents, today } from '../../src/lib/finance.js';
import { FinancialError } from './financial.js';
import { DEBTOR_PAGE_SIZE, type DebtorPage, type FinancialOverview } from '../../src/lib/mobile-financial.js';

const balances = `WITH ledger AS (
  SELECT client_id, total AS amount FROM vendas
  UNION ALL SELECT client_id, -amount FROM pagamentos
), balances AS (SELECT client_id, SUM(amount) AS balance FROM ledger GROUP BY client_id HAVING SUM(amount)>0)`;

// Aggregate each ledger separately: joining sales to payments would multiply values.
export async function readMobileFinancial(pool: any, mode: 'overview' | 'debtors', query: unknown = '', rawOffset: unknown = 0, date = today()): Promise<FinancialOverview | DebtorPage> {
  if (typeof query !== 'string' || query.length > 300) throw new FinancialError('Use até 300 letras na busca.');
  const offset = Number(rawOffset);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000) throw new FinancialError('Página inválida. Refine a busca.');
  const db = await pool.connect();
  try {
    await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await db.query("SET LOCAL statement_timeout = '10000ms'");
    const pending = (await db.query(`${balances} SELECT COALESCE(SUM(b.balance),0)::text AS total FROM balances b JOIN clientes c ON c.id=b.client_id`)).rows[0];
    const pendingCents = cents(pending.total);
    let result: FinancialOverview | DebtorPage;
    if (mode === 'overview') {
      const start = date.slice(0, 7) + '-01';
      const monthly = (await db.query(`SELECT
        (SELECT COALESCE(SUM(total),0)::text FROM vendas WHERE sale_date >= $1::date AND sale_date < $1::date + INTERVAL '1 month') AS sold,
        (SELECT COALESCE(SUM(amount),0)::text FROM pagamentos WHERE payment_date >= $1::date AND payment_date < $1::date + INTERVAL '1 month') AS received`, [start])).rows[0];
      result = { month: date.slice(0, 7), salesCents: cents(monthly.sold), receivedCents: cents(monthly.received), pendingCents };
    } else {
      const pattern = query.trim().replace(/[\\%_]/g, '\\$&');
      const rows = (await db.query(`${balances} SELECT c.id,c.full_name,b.balance::text FROM balances b JOIN clientes c ON c.id=b.client_id
        WHERE public.ivone_client_name(c.full_name) LIKE '%' || public.ivone_client_name($1) || '%'
        ORDER BY b.balance DESC,public.ivone_client_name(c.full_name),c.id LIMIT $2 OFFSET $3`, [pattern, DEBTOR_PAGE_SIZE + 1, offset])).rows;
      result = { clients: rows.slice(0, DEBTOR_PAGE_SIZE).map((r: any) => ({ id: r.id, fullName: r.full_name, balanceCents: cents(r.balance) })), pendingCents, offset, hasMore: rows.length > DEBTOR_PAGE_SIZE };
    }
    await db.query('COMMIT'); return result;
  } catch (error) { try { await db.query('ROLLBACK'); } catch {} throw error; }
  finally { db.release(); }
}
