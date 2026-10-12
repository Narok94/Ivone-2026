import type { VercelRequest, VercelResponse } from '../server/lib/http.js';
import { clearCookie, requireSession, revokeSession } from '../server/lib/session.js';
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });
  if (!await requireSession(req, res)) return;
  try {
    await revokeSession(req);
    clearCookie(res);
    return res.json({ success: true });
  } catch {
    return res.status(503).json({ success: false, message: 'Não foi possível encerrar a sessão. Tente novamente.' });
  }
}
