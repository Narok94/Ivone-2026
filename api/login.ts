import { pool } from './db.js';
import type { VercelRequest, VercelResponse } from '../server/lib/http.js';
import { createSession, noCache, sameOrigin } from '../server/lib/session.js';
import { allowLogin } from '../server/lib/login-limit.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  noCache(res);
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });
  const contentType = req.headers['content-type'];
  if (!sameOrigin(req) || typeof contentType !== 'string' || !contentType.toLowerCase().startsWith('application/json')) {
    return res.status(403).json({ success: false, message: 'Requisição não autorizada.' });
  }
  const { username, pin } = req.body || {};
  if (typeof username !== 'string' || !username || username.length > 100 || typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
    return res.status(400).json({ success: false, message: 'Usuário e PIN de 4 números são obrigatórios. 🌸' });
  }
  let user: { id: string | number; username: string; pin: string };
  try {
    if (!await allowLogin(req, username)) {
      res.setHeader('Retry-After', '300');
      return res.status(429).json({ success: false, message: 'Muitas tentativas. Aguarde alguns minutos para tentar novamente. 🌸' });
    }
    const result = await pool.query('SELECT id, username, pin FROM usuarios WHERE username = $1', [username]);
    user = result.rows[0];
    if (!user || user.pin !== pin) return res.status(401).json({ success: false, message: 'Usuário ou PIN incorreto. 🌸' });
  } catch {
    return res.status(503).json({ success: false, message: 'Login temporariamente indisponível. 🌸' });
  }
  try {
    const session = await createSession(req, res, { id: user.id, username: user.username });
    return res.json({ success: true, user: session.user, csrfToken: session.csrfToken });
  } catch {
    return res.status(503).json({ success: false, message: 'Autenticação temporariamente indisponível. 🌸' });
  }
}
