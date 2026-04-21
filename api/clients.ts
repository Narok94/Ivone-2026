import { pool } from './db.js';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      const result = await pool.query('SELECT * FROM clientes ORDER BY full_name ASC');
      return res.json(result.rows.map(r => ({
        id: r.id,
        fullName: r.full_name,
        phone: r.phone || '',
        email: r.email || '',
        street: r.street || '',
        neighborhood: r.neighborhood || '',
        city: r.city || '',
        state: r.state || '',
        cep: r.cep || '',
        number: r.number || '',
        complement: r.complement || '',
        cpf: r.cpf || '',
        observation: r.observation || ''
      })));
    }

    if (req.method === 'POST') {
      const c = req.body;
      const result = await pool.query(
        'INSERT INTO clientes (full_name, phone, email, street, neighborhood, city, state, cep, number, complement, cpf, observation) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
        [c.fullName, c.phone, c.email, c.street, c.neighborhood, c.city, c.state, c.cep, c.number, c.complement, c.cpf, c.observation]
      );
      return res.json(result.rows[0]);
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'ID is required' });
      await pool.query('DELETE FROM clientes WHERE id = $1', [id]);
      return res.json({ success: true });
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
  } catch (err: any) {
    console.error('[SERVERLESS CLIENTS ERROR]:', err);
    return res.status(500).json({ error: err.message });
  }
}
