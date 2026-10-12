import { timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
export type DemoAccess = { origin: string; token: string; expiresAt: number };
export function demoGateway(access: DemoAccess) {
  const origin = new URL(access.origin);
  if (origin.protocol !== 'https:' || !/^[A-Za-z0-9_-]{43}$/.test(access.token)) throw new Error('HTTPS e chave privada de demonstração obrigatórios.');
  const matches = (value: unknown) => typeof value === 'string' && Buffer.byteLength(value) === Buffer.byteLength(access.token) && timingSafeEqual(Buffer.from(value), Buffer.from(access.token));
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    if (Date.now() >= access.expiresAt) return res.status(410).send('Demonstração encerrada.');
    if (req.headers.host !== origin.host || req.headers['x-forwarded-proto'] !== 'https') return res.status(403).end();
    if (req.method === 'GET' && req.path.startsWith('/enter/') && matches(req.path.slice('/enter/'.length))) {
      const seconds = Math.max(1, Math.floor((access.expiresAt - Date.now()) / 1000));
      res.setHeader('Set-Cookie', `__Host-ivone_demo=${access.token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${seconds}`);
      return res.redirect(303, '/');
    }
    const cookie = req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith('__Host-ivone_demo='))?.slice('__Host-ivone_demo='.length);
    if (!matches(cookie)) return res.status(403).send('Abra o link privado da demonstração.');
    // No admin, backups, restore, PIN login, legacy APIs, source files or dev server.
    const allowed = req.method === 'GET' ? req.path === '/' || /^\/assets\/[\w.-]+$/.test(req.path) || ['/logo-ivone.png', '/api/session', '/api/operations'].includes(req.path)
      : req.method === 'POST' ? ['/api/clients', '/api/operations', '/api/logout'].includes(req.path)
      : req.method === 'PUT' && req.path === '/api/clients';
    if (!allowed) return res.status(404).json({ message: 'Recurso indisponível nesta demonstração fictícia.' });
    // Session cookies created by the development store must also be secure here.
    const original = res.setHeader.bind(res);
    res.setHeader = ((name: string, value: any) => original(name, name.toLowerCase() === 'set-cookie' ? (Array.isArray(value) ? value.map(v => /;\s*Secure\b/i.test(v) ? v : `${v}; Secure`) : /;\s*Secure\b/i.test(String(value)) ? value : `${value}; Secure`) : value)) as typeof res.setHeader;
    next();
  };
}
