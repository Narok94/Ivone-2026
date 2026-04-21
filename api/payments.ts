import { pool } from './db.js';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      const result = await pool.query('SELECT * FROM pagamentos ORDER BY payment_date DESC');
      return res.json(result.rows.map(r => ({
        id: r.id,
        clientId: r.client_id,
        paymentDate: r.payment_date.toISOString().split('T')[0],
        amount: parseFloat(r.amount),
        observation: r.observation || ''
      })));
    }

    if (req.method === 'POST') {
      const p = req.body;
      const result = await pool.query(
        'INSERT INTO pagamentos (client_id, payment_date, amount, observation) VALUES ($1, $2, $3, $4) RETURNING *',
        [p.clientId, p.paymentDate, p.amount, p.observation]
      );
      const r = result.rows[0];
      return res.json({
        id: r.id,
        clientId: r.client_id,
        paymentDate: r.payment_date.toISOString().split('T')[0],
        amount: parseFloat(r.amount),
        observation: r.observation || ''
      });
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'ID is required' });
      const p = req.body;
      const result = await pool.query(
        'UPDATE pagamentos SET client_id=$1, payment_date=$2, amount=$3, observation=$4 WHERE id=$5 RETURNING *',
        [p.clientId, p.paymentDate, p.amount, p.observation, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
      const r = result.rows[0];
      return res.json({
        id: r.id,
        clientId: r.client_id,
        paymentDate: r.payment_date.toISOString().split('T')[0],
        amount: parseFloat(r.amount),
        observation: r.observation || ''
      });
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'ID is required' });
      await pool.query('DELETE FROM pagamentos WHERE id = $1', [id]);
      return res.json({ success: true });
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
  } catch (err: any) {
    console.error('[SERVERLESS PAYMENTS ERROR]:', err);
    return res.status(500).json({ error: err.message });
  }
}
