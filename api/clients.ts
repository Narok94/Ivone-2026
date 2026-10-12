import { requireSession } from '../server/lib/session.js';
import { clientRow, FinancialError, withFinancialLock } from '../server/lib/financial.js';
import { pool } from './db.js';
export default async function handler(req: any, res: any) {
  if (!await requireSession(req, res)) return;
  const id = req.query.id ?? req.params?.id;
  try {
    if (req.method === 'GET') return res.json((await pool.query('SELECT * FROM clientes ORDER BY full_name,id')).rows.map(clientRow));
    if (!['POST', 'PUT', 'DELETE'].includes(req.method)) return res.status(405).json({ message: 'Método não permitido.' });
    if (req.method !== 'POST' && (typeof id !== 'string' || !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id))) throw new FinancialError('Cliente inválida.');
    const c = req.body;
    if (req.method === 'DELETE' && c?.confirmed !== true) throw new FinancialError('Confirme a exclusão da cliente e de seus registros relacionados.');
    if (req.method !== 'DELETE' && (typeof c?.fullName !== 'string' || !c.fullName.trim() || c.fullName.length > 300)) throw new FinancialError('Informe o nome da cliente.');
    const result = await withFinancialLock(pool, async db => {
      if (req.method === 'DELETE') {
        // Conversational deletions must never cascade into financial history.
        // Check under the same lock as financial operations, not only in the UI.
        if (c.preserveHistory === true) {
          const linked = (await db.query('SELECT EXISTS (SELECT 1 FROM vendas WHERE client_id=$1) OR EXISTS (SELECT 1 FROM pagamentos WHERE client_id=$1) AS linked', [id])).rows[0]?.linked;
          if (linked) throw new FinancialError('Esta cliente possui lançamentos. Exclusão bloqueada para preservar o histórico.', 409);
        }
        await db.query('DELETE FROM clientes WHERE id=$1', [id]); return { success: true };
      }
      const values = [c.fullName.trim(), c.phone ?? '', c.email ?? '', c.street ?? '', c.neighborhood ?? '', c.city ?? '', c.state ?? '', c.cep ?? '', c.number ?? '', c.complement ?? '', c.cpf ?? '', c.observation ?? ''];
      const query = req.method === 'POST' ? 'INSERT INTO clientes (full_name,phone,email,street,neighborhood,city,state,cep,number,complement,cpf,observation) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *' : 'UPDATE clientes SET full_name=$1,phone=$2,email=$3,street=$4,neighborhood=$5,city=$6,state=$7,cep=$8,number=$9,complement=$10,cpf=$11,observation=$12 WHERE id=$13 RETURNING *';
      const row = (await db.query(query, req.method === 'POST' ? values : [...values, id])).rows[0];
      if (!row) throw new FinancialError('Cliente não encontrada.', 404); return clientRow(row);
    });
    return res.json(result);
  } catch (error: any) { return res.status(error instanceof FinancialError ? error.status : 503).json({ message: error instanceof FinancialError ? error.message : 'Não foi possível concluir a alteração da cliente.' }); }
}
