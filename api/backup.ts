import { createHash } from 'node:crypto';
import { requireSession } from '../server/lib/session.js';
import { FINANCIAL_LOCK, FinancialError } from '../server/lib/financial.js';
import { insertBackup, readBackupRows, validateBackup } from '../server/lib/backup.js';
import { pool } from './db.js';
export default async function handler(req: any, res: any) {
  const session = await requireSession(req, res);
  if (!session) return;
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ message: 'Método não permitido.' });
  let data: any, fingerprint: string;
  if (req.method === 'POST') {
    try {
      if (req.body?.confirmed !== true || !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(req.body?.restoreId ?? '')) throw new FinancialError('Confirme a restauração e seu identificador.');
      if (!/^[a-f\d]{64}$/.test(req.body.backupFingerprint ?? '')) throw new FinancialError('Gere e confira um backup dos registros atuais antes de restaurar.');
      data = validateBackup(req.body);
      fingerprint = createHash('sha256').update(JSON.stringify(data)).digest('hex');
    } catch (error: any) { return res.status(400).json({ message: error instanceof FinancialError ? error.message : 'Arquivo de backup inválido.' }); }
  }
  let db: any;
  let discard = false;
  try {
    db = await pool.connect();
    if (req.method === 'GET') {
      await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const data = await readBackupRows(db);
      const { clients, sales, payments, operations } = data;
      await db.query('COMMIT');
      return res.json({ version: '2.0', timestamp: new Date().toISOString(), fingerprint: createHash('sha256').update(JSON.stringify(data)).digest('hex'), counts: { clients: clients.length, sales: sales.length, payments: payments.length, operations: operations.length }, data });
    }
    await db.query('BEGIN'); await db.query('SELECT pg_advisory_xact_lock($1)', [FINANCIAL_LOCK]);
    const existing = (await db.query('SELECT user_id,fingerprint FROM operacoes_financeiras WHERE operation_id=$1', [req.body.restoreId])).rows[0];
    if (existing) {
      if (existing.user_id !== String(session.user.id) || existing.fingerprint !== fingerprint) throw new FinancialError('Esta confirmação de restauração já foi utilizada.', 409);
      await db.query('COMMIT'); return res.json({ success: true, replayed: true, message: 'Restauração já concluída. Nenhum dado foi substituído novamente.' });
    }
    const current = await readBackupRows(db);
    if (createHash('sha256').update(JSON.stringify(current)).digest('hex') !== req.body.backupFingerprint) throw new FinancialError('Os registros mudaram desde o backup. Gere um backup atualizado e confirme novamente.', 409);
    await insertBackup(db, data);
    await db.query('INSERT INTO operacoes_financeiras (operation_id,user_id,fingerprint,result) VALUES ($1,$2,$3,$4::jsonb)', [req.body.restoreId, String(session.user.id), fingerprint, JSON.stringify({ kind: 'restore' })]);
    await db.query('COMMIT'); return res.json({ success: true, message: 'Backup restaurado. Usuários e configurações foram preservados.' });
  } catch (error: any) {
    discard = true;
    if (db) try { await db.query('ROLLBACK'); } catch {}
    return res.status(error instanceof FinancialError ? error.status : 503).json({ message: error instanceof FinancialError ? error.message : 'Não foi possível concluir. Reenvie a mesma confirmação de restauração.' });
  } finally { db?.release(discard ? new Error('Transaction failed') : undefined); }
}
