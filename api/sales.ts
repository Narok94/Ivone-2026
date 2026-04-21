import { pool } from './db.js';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      const result = await pool.query('SELECT * FROM vendas ORDER BY sale_date DESC');
      return res.json(result.rows.map(r => ({
        id: r.id,
        clientId: r.client_id,
        saleDate: r.sale_date.toISOString().split('T')[0],
        productName: r.product_name,
        quantity: r.quantity,
        unitPrice: parseFloat(r.unit_price),
        total: parseFloat(r.total),
        observation: r.observation || '',
        productCode: r.product_code || ''
      })));
    }

    if (req.method === 'POST') {
      const s = req.body;
      const result = await pool.query(
        'INSERT INTO vendas (client_id, sale_date, product_name, quantity, unit_price, total, observation, product_code) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [s.clientId, s.saleDate, s.productName, s.quantity, s.unitPrice, s.total, s.observation, s.productCode]
      );
      const r = result.rows[0];
      return res.json({
        id: r.id,
        clientId: r.client_id,
        saleDate: r.sale_date.toISOString().split('T')[0],
        productName: r.product_name,
        quantity: r.quantity,
        unitPrice: parseFloat(r.unit_price),
        total: parseFloat(r.total),
        observation: r.observation || '',
        productCode: r.product_code || ''
      });
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'ID is required' });
      const s = req.body;
      const result = await pool.query(
        'UPDATE vendas SET client_id=$1, sale_date=$2, product_name=$3, quantity=$4, unit_price=$5, total=$6, observation=$7, product_code=$8 WHERE id=$9 RETURNING *',
        [s.clientId, s.saleDate, s.productName, s.quantity, s.unitPrice, s.total, s.observation, s.productCode, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Sale not found' });
      const r = result.rows[0];
      return res.json({
        id: r.id,
        clientId: r.client_id,
        saleDate: r.sale_date.toISOString().split('T')[0],
        productName: r.product_name,
        quantity: r.quantity,
        unitPrice: parseFloat(r.unit_price),
        total: parseFloat(r.total),
        observation: r.observation || '',
        productCode: r.product_code || ''
      });
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'ID is required' });
      await pool.query('DELETE FROM vendas WHERE id = $1', [id]);
      return res.json({ success: true });
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
  } catch (err: any) {
    console.error('[SERVERLESS SALES ERROR]:', err);
    return res.status(500).json({ error: err.message });
  }
}
