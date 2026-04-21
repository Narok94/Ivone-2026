import { pool } from '../src/lib/db';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log(`[HANDLER LOG] Request: ${req.method} ${req.url}`);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { username, pin } = req.body || {};
  console.log(`[HANDLER LOG] Body:`, { username, pinProvided: !!pin });

  if (!username || !pin) {
    return res.status(400).json({ success: false, message: 'Usuário e PIN são obrigatórios. 🌸' });
  }

  try {
    console.log(`[HANDLER LOG] Querying user: ${username}...`);
    const result = await pool.query('SELECT * FROM usuarios WHERE username = $1', [username]);
    console.log(`[HANDLER LOG] Query completed. Rows found: ${result.rows.length}`);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Usuário não encontrado. 🌸' });
    }

    const user = result.rows[0];
    if (user.pin === pin) {
      console.log(`[SERVERLESS LOGIN] Success: ${username}`);
      return res.json({ success: true, user: { id: user.id, username: user.username } });
    } else {
      return res.status(401).json({ success: false, message: 'PIN incorreto. 🌸' });
    }
  } catch (err: any) {
    console.error('[SERVERLESS LOGIN ERROR]:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro no servidor ou banco offline. 🌸',
      error: err.message 
    });
  }
}
