import { requireSession } from '../server/lib/session.js';
import { paymentRow } from '../server/lib/financial.js';
import { legacyFinancial } from '../server/lib/legacy-financial.js';
import { pool } from './db.js';
export default async function handler(req: any, res: any) {
  const session = await requireSession(req, res);
  if (!session) return;
  if (req.method === 'GET') {
    try { return res.json((await pool.query('SELECT *,payment_date::text AS payment_date FROM pagamentos ORDER BY pagamentos.payment_date DESC,pagamentos.id')).rows.map(paymentRow)); }
    catch { return res.status(503).json({ message: 'Não foi possível consultar os pagamentos.' }); }
  }
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) return legacyFinancial(pool, String(session.user.id), req, res, 'payment');
  return res.status(405).json({ message: 'Método não permitido.' });
}
