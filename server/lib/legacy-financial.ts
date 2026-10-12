import { cents } from '../../src/lib/finance.js';
import { executeFinancial, FinancialError } from './financial.js';
export async function legacyFinancial(pool: any, userId: string, req: any, res: any, resource: 'sale' | 'payment') {
  try {
    const raw = req.body;
    if (!raw || raw.confirmed !== true || typeof raw.operationId !== 'string') throw new FinancialError('Confirmação e identificador da operação são obrigatórios.');
    const targetId = req.query.id ?? req.params?.id;
    let source = raw;
    if (req.method === 'DELETE') {
      if (typeof targetId !== 'string' || !/^[a-f\d-]{36}$/i.test(targetId)) throw new FinancialError('Registro inválido.');
      const table = resource === 'sale' ? 'vendas' : 'pagamentos';
      const row = (await pool.query(`SELECT *,${resource === 'sale' ? 'sale_date' : 'payment_date'}::text AS date FROM ${table} WHERE id=$1`, [targetId])).rows[0];
      if (!row) return res.json({ success: true });
      source = { clientId: row.client_id, saleDate: row.date, paymentDate: row.date, observation: '' };
    }
    const kind = req.method === 'POST' ? resource : `${req.method === 'PUT' ? 'edit' : 'delete'}_${resource}`;
    const op: any = { operationId: raw.operationId, confirmed: true, kind, targetId, clientId: source.clientId, date: resource === 'sale' ? source.saleDate : source.paymentDate, observation: source.observation ?? '' };
    if (req.method !== 'DELETE') {
      if (resource === 'sale') { op.items = [{ productName: source.productName, productCode: source.productCode ?? '', quantity: source.quantity, unitCents: cents(source.unitPrice) }]; op.receivedCents = 0; }
      else { op.amountCents = cents(source.amount); op.allowCredit = raw.allowCredit === true; }
    }
    const result = await executeFinancial(pool, userId, op);
    if (req.method === 'DELETE') return res.json({ success: true });
    const id = req.method === 'PUT' ? targetId : (resource === 'sale' ? result.saleIds?.[0] : result.paymentIds?.[0]);
    const row = (resource === 'sale' ? result.sales : result.payments).find(row => row.id === id);
    if (!row) throw new FinancialError('Esta operação foi concluída anteriormente, mas o registro foi removido. Atualize os dados.', 409);
    return res.json(row);
  } catch (error: any) {
    if (error instanceof FinancialError) return res.status(error.status).json({ message: error.message });
    if (error instanceof Error && /valor|centavos|limite/i.test(error.message)) return res.status(400).json({ message: 'Confira o valor informado.' });
    return res.status(503).json({ message: 'Não foi possível confirmar o salvamento. Reenvie a mesma confirmação.' });
  }
}
