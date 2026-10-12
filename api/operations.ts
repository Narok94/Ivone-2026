import { requireSession } from '../server/lib/session.js';
import { executeFinancial, FinancialError, readFinancialSnapshot } from '../server/lib/financial.js';
import { pool } from './db.js';

export default async function handler(req: any, res: any) {
  const session = await requireSession(req, res);
  if (!session) return;
  if (req.method === 'GET') {
    try { return res.json(await readFinancialSnapshot(pool)); }
    catch { return res.status(503).json({ message: 'Não foi possível atualizar os registros.' }); }
  }
  if (req.method !== 'POST') return res.status(405).json({ message: 'Método não permitido.' });
  try { return res.json(await executeFinancial(pool, String(session.user.id), req.body)); }
  catch (error: any) {
    if (error instanceof FinancialError) return res.status(error.status).json({ message: error.message });
    return res.status(503).json({ message: 'Não foi possível confirmar o salvamento. Tente novamente com a mesma confirmação.' });
  }
}
