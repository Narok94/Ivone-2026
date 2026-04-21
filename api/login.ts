import { pool } from '../src/lib/db';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { username, pin } = req.body;
  console.log(`[SERVERLESS LOGIN] Attempt for user: ${username}`);

  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE username = $1', [username]);
    
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
