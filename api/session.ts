import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSession } from '../server/lib/session.js';
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });
  const session = await requireSession(req, res);
  if (!session) return;
  return res.json({ user: session.user, csrfToken: session.csrfToken });
}
