import { pool } from './db.js';

export default async function backupHandler(req: any, res: any) {
  if (req.method === 'GET') {
    try {
      const [clients, sales, payments] = await Promise.all([
        pool.query('SELECT * FROM clientes'),
        pool.query('SELECT * FROM vendas'),
        pool.query('SELECT * FROM pagamentos')
      ]);

      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        data: {
          clients: clients.rows,
          sales: sales.rows,
          payments: payments.rows
        }
      };

      res.json(backupData);
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Erro ao gerar backup', error: error.message });
    }
  } else if (req.method === 'POST') {
    const { clients, sales, payments } = req.body.data;
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Clear current data (Relational order: payments/sales first, then clients)
      await client.query('DELETE FROM pagamentos');
      await client.query('DELETE FROM vendas');
      await client.query('DELETE FROM clientes');

      // Insert clients
      for (const c of clients) {
        await client.query(
          `INSERT INTO clientes (id, full_name, phone, email, street, neighborhood, city, state, cep, number, complement, cpf, observation)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [c.id, c.full_name, c.phone, c.email, c.street, c.neighborhood, c.city, c.state, c.cep, c.number, c.complement, c.cpf, c.observation]
        );
      }

      // Insert sales
      for (const s of sales) {
        await client.query(
          `INSERT INTO vendas (id, client_id, sale_date, product_name, quantity, unit_price, total, observation, product_code)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [s.id, s.client_id, s.sale_date, s.product_name, s.quantity, s.unit_price, s.total, s.observation, s.product_code]
        );
      }

      // Insert payments
      for (const p of payments) {
        await client.query(
          `INSERT INTO pagamentos (id, client_id, payment_date, amount, observation)
           VALUES ($1, $2, $3, $4, $5)`,
          [p.id, p.client_id, p.payment_date, p.amount, p.observation]
        );
      }

      await client.query('COMMIT');
      res.json({ success: true, message: 'Backup restaurado com sucesso!' });
    } catch (error: any) {
      await client.query('ROLLBACK');
      res.status(500).json({ success: false, message: 'Erro ao restaurar backup', error: error.message });
    } finally {
      client.release();
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
