import { requireSession } from '../server/lib/session.js';
import { saleRow } from '../server/lib/financial.js';
import { legacyFinancial } from '../server/lib/legacy-financial.js';
import { pool } from './db.js';
export default async function handler(req: any, res: any) {
  const session = await requireSession(req, res);
  if (!session) return;
  if (req.method === 'GET') {
    try { return res.json((await pool.query('SELECT *,sale_date::text AS sale_date FROM vendas ORDER BY vendas.sale_date DESC,vendas.id')).rows.map(saleRow)); }
    catch { return res.status(503).json({ message: 'Não foi possível consultar as vendas.' }); }
  }
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) return legacyFinancial(pool, String(session.user.id), req, res, 'sale');
  return res.status(405).json({ message: 'Método não permitido.' });
}
