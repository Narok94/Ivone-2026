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
    const body = req.body;
    const restoreData = body.data || body; // Suporta tanto o formato envelopado quanto o bruto
    const { clients = [], sales = [], payments = [] } = restoreData;
    
    const dbClient = await pool.connect();
    
    try {
      await dbClient.query('BEGIN');
      
      // Limpa dados atuais (Ordem relacional: dependentes primeiro)
      await dbClient.query('DELETE FROM pagamentos');
      await dbClient.query('DELETE FROM vendas');
      await dbClient.query('DELETE FROM clientes');

      // Inserir clientes com mapeamento flexível (camelCase ou snake_case)
      for (const c of clients) {
        const id = c.id;
        const fullName = c.full_name || c.fullName || 'Cliente sem nome';
        const phone = c.phone || '';
        const email = c.email || '';
        const street = c.street || c.address || ''; // Mapeia 'address' para 'street' se necessário
        const neighborhood = c.neighborhood || '';
        const city = c.city || '';
        const state = c.state || '';
        const cep = c.cep || '';
        const number = c.number || '';
        const complement = c.complement || '';
        const cpf = c.cpf || '';
        const observation = c.observation || '';

        await dbClient.query(
          `INSERT INTO clientes (id, full_name, phone, email, street, neighborhood, city, state, cep, number, complement, cpf, observation)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [id, fullName, phone, email, street, neighborhood, city, state, cep, number, complement, cpf, observation]
        );
      }

      // Inserir vendas
      for (const s of sales) {
        const id = s.id;
        const clientId = s.client_id || s.clientId;
        const saleDate = s.sale_date || s.saleDate;
        const productName = s.product_name || s.productName;
        const quantity = s.quantity || 1;
        const unitPrice = s.unit_price || s.unitPrice || 0;
        const total = s.total || (quantity * unitPrice);
        const observation = s.observation || '';
        const productCode = s.product_code || s.productCode || '';

        await dbClient.query(
          `INSERT INTO vendas (id, client_id, sale_date, product_name, quantity, unit_price, total, observation, product_code)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [id, clientId, saleDate, productName, quantity, unitPrice, total, observation, productCode]
        );
      }

      // Inserir pagamentos
      for (const p of payments) {
        const id = p.id;
        const clientId = p.client_id || p.clientId;
        const paymentDate = p.payment_date || p.paymentDate;
        const amount = p.amount || 0;
        const observation = p.observation || '';

        await dbClient.query(
          `INSERT INTO pagamentos (id, client_id, payment_date, amount, observation)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, clientId, paymentDate, amount, observation]
        );
      }

      await dbClient.query('COMMIT');
      res.json({ success: true, message: 'Backup restaurado com sucesso!' });
    } catch (error: any) {
      await dbClient.query('ROLLBACK');
      console.error('Erro na restauração:', error);
      res.status(500).json({ success: false, message: 'Erro ao restaurar backup', error: error.message });
    } finally {
      dbClient.release();
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
