import { pool } from './db.js';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      const result = await pool.query('SELECT * FROM public.pagamentos ORDER BY payment_date DESC');
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
        'INSERT INTO public.pagamentos (client_id, payment_date, amount, observation) VALUES ($1, $2, $3, $4) RETURNING *',
        [p.clientId, p.paymentDate, p.amount, p.observation]
      );
      return res.json(result.rows[0]);
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'ID is required' });
      await pool.query('DELETE FROM public.pagamentos WHERE id = $1', [id]);
      return res.json({ success: true });
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
  } catch (err: any) {
    console.error('[SERVERLESS PAYMENTS ERROR]:', err);
    return res.status(500).json({ error: err.message });
  }
}
