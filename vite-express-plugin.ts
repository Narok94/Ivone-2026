import type { Plugin, ViteDevServer } from 'vite';
import { db } from './src/db/index';
import { users, clients, stockItems, sales, payments } from './src/db/schema';
import { eq } from 'drizzle-orm';

const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

async function seed() {
  try {
    console.log('[v0] Checking for existing users...');
    const existingUsers = await db.select().from(users);
    
    const ivoneUser = existingUsers.find(u => u.username.toLowerCase() === 'ivone');
    if (ivoneUser) {
      if (ivoneUser.password !== '9860') {
        await db.update(users).set({ password: '9860', username: 'ivone' }).where(eq(users.id, ivoneUser.id));
      }
    } else {
      await db.insert(users).values({ 
        username: 'ivone', 
        password: '9860', 
        role: 'admin', 
        firstName: 'Ivone', 
        lastName: '' 
      });
    }

    console.log('[v0] Seed completed - Usuário ivone configurado.');
  } catch (error) {
    console.error('[v0] Seed error:', error);
  }
}

export function expressApiPlugin(): Plugin {
  return {
    name: 'express-api',
    configureServer(server: ViteDevServer) {
      // Run seed on startup
      seed();

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api')) {
          return next();
        }

        // Parse body for POST/PUT requests
        let body: any = {};
        if (req.method === 'POST' || req.method === 'PUT') {
          try {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(chunk);
            }
            const data = Buffer.concat(chunks).toString();
            body = data ? JSON.parse(data) : {};
          } catch (e) {
            body = {};
          }
        }

        // Parse URL and query params
        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathname = url.pathname;
        const query = Object.fromEntries(url.searchParams);

        res.setHeader('Content-Type', 'application/json');

        try {
          // Health check
          if (pathname === '/api/health' && req.method === 'GET') {
            try {
              await db.select().from(users).limit(1);
              res.end(JSON.stringify({ status: 'connected', database: 'Neon' }));
            } catch (error) {
              res.statusCode = 500;
              res.end(JSON.stringify({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error' }));
            }
            return;
          }

          // Auth login
          if (pathname === '/api/auth/login' && req.method === 'POST') {
            const { username, password } = body;
            const cleanUsername = username?.toLowerCase().trim();
            
            const user = await db.query.users.findFirst({
              where: eq(users.username, cleanUsername)
            });

            if (!user) {
              res.statusCode = 401;
              res.end(JSON.stringify({ error: 'Usuário não encontrado' }));
              return;
            }

            if (user.password !== password) {
              res.statusCode = 401;
              res.end(JSON.stringify({ error: 'Senha inválida' }));
              return;
            }

            res.end(JSON.stringify(user));
            return;
          }

          // Users routes
          if (pathname === '/api/users') {
            if (req.method === 'GET') {
              const result = await db.select().from(users);
              res.end(JSON.stringify(result));
              return;
            }
            if (req.method === 'POST') {
              const [newUser] = await db.insert(users).values(body).returning();
              res.end(JSON.stringify(newUser));
              return;
            }
          }

          const userMatch = pathname.match(/^\/api\/users\/([^\/]+)$/);
          if (userMatch) {
            const id = userMatch[1];
            if (req.method === 'PUT') {
              const [updated] = await db.update(users).set(body).where(eq(users.id, id)).returning();
              res.end(JSON.stringify(updated));
              return;
            }
            if (req.method === 'DELETE') {
              await db.delete(users).where(eq(users.id, id));
              res.end(JSON.stringify({ success: true }));
              return;
            }
          }

          const passwordMatch = pathname.match(/^\/api\/users\/([^\/]+)\/password$/);
          if (passwordMatch && req.method === 'PUT') {
            const id = passwordMatch[1];
            const { newPassword, oldPassword } = body;
            
            const user = await db.query.users.findFirst({ where: eq(users.id, id) });
            if (!user) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Usuário não encontrado' }));
              return;
            }
            
            if (oldPassword && user.password !== oldPassword) {
              res.statusCode = 401;
              res.end(JSON.stringify({ error: 'Senha antiga incorreta' }));
              return;
            }
            
            await db.update(users).set({ password: newPassword }).where(eq(users.id, id));
            res.end(JSON.stringify({ success: true }));
            return;
          }

          // Clients routes
          if (pathname === '/api/clients') {
            if (req.method === 'GET') {
              const userId = query.userId as string;
              if (!userId || !isUUID(userId)) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Valid userId required' }));
                return;
              }
              const result = await db.select().from(clients).where(eq(clients.userId, userId));
              res.end(JSON.stringify(result));
              return;
            }
            if (req.method === 'POST') {
              const { userId, ...data } = body;
              const [newClient] = await db.insert(clients).values({ userId, ...data }).returning();
              res.end(JSON.stringify(newClient));
              return;
            }
          }

          const clientMatch = pathname.match(/^\/api\/clients\/([^\/]+)$/);
          if (clientMatch) {
            const id = clientMatch[1];
            if (req.method === 'PUT') {
              const [updated] = await db.update(clients).set(body).where(eq(clients.id, id)).returning();
              res.end(JSON.stringify(updated));
              return;
            }
            if (req.method === 'DELETE') {
              await db.delete(clients).where(eq(clients.id, id));
              res.end(JSON.stringify({ success: true }));
              return;
            }
          }

          // Stock routes
          if (pathname === '/api/stock') {
            if (req.method === 'GET') {
              const userId = query.userId as string;
              if (!userId || !isUUID(userId)) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Valid userId required' }));
                return;
              }
              const result = await db.select().from(stockItems).where(eq(stockItems.userId, userId));
              res.end(JSON.stringify(result));
              return;
            }
            if (req.method === 'POST') {
              const { userId, ...data } = body;
              const [newItem] = await db.insert(stockItems).values({ userId, ...data }).returning();
              res.end(JSON.stringify(newItem));
              return;
            }
          }

          const stockMatch = pathname.match(/^\/api\/stock\/([^\/]+)$/);
          if (stockMatch) {
            const id = stockMatch[1];
            if (req.method === 'PUT') {
              const [updated] = await db.update(stockItems).set(body).where(eq(stockItems.id, id)).returning();
              res.end(JSON.stringify(updated));
              return;
            }
            if (req.method === 'DELETE') {
              await db.delete(stockItems).where(eq(stockItems.id, id));
              res.end(JSON.stringify({ success: true }));
              return;
            }
          }

          // Sales routes
          if (pathname === '/api/sales') {
            if (req.method === 'GET') {
              const userId = query.userId as string;
              if (!userId || !isUUID(userId)) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Valid userId required' }));
                return;
              }
              const result = await db.select().from(sales).where(eq(sales.userId, userId));
              res.end(JSON.stringify(result));
              return;
            }
            if (req.method === 'POST') {
              const { userId, ...data } = body;
              const [newSale] = await db.insert(sales).values({ userId, ...data }).returning();
              res.end(JSON.stringify(newSale));
              return;
            }
          }

          const saleMatch = pathname.match(/^\/api\/sales\/([^\/]+)$/);
          if (saleMatch) {
            const id = saleMatch[1];
            if (req.method === 'PUT') {
              const [updated] = await db.update(sales).set(body).where(eq(sales.id, id)).returning();
              res.end(JSON.stringify(updated));
              return;
            }
            if (req.method === 'DELETE') {
              await db.delete(sales).where(eq(sales.id, id));
              res.end(JSON.stringify({ success: true }));
              return;
            }
          }

          // Payments routes
          if (pathname === '/api/payments') {
            if (req.method === 'GET') {
              const userId = query.userId as string;
              if (!userId || !isUUID(userId)) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Valid userId required' }));
                return;
              }
              const result = await db.select().from(payments).where(eq(payments.userId, userId));
              res.end(JSON.stringify(result));
              return;
            }
            if (req.method === 'POST') {
              const { userId, ...data } = body;
              const [newPayment] = await db.insert(payments).values({ userId, ...data }).returning();
              res.end(JSON.stringify(newPayment));
              return;
            }
          }

          const paymentMatch = pathname.match(/^\/api\/payments\/([^\/]+)$/);
          if (paymentMatch) {
            const id = paymentMatch[1];
            if (req.method === 'PUT') {
              const [updated] = await db.update(payments).set(body).where(eq(payments.id, id)).returning();
              res.end(JSON.stringify(updated));
              return;
            }
            if (req.method === 'DELETE') {
              await db.delete(payments).where(eq(payments.id, id));
              res.end(JSON.stringify({ success: true }));
              return;
            }
          }

          // Debug route
          if (pathname === '/api/debug/users' && req.method === 'GET') {
            const allUsers = await db.select().from(users);
            res.end(JSON.stringify(allUsers.map(u => ({ id: u.id, username: u.username, role: u.role }))));
            return;
          }

          // Not found
          res.statusCode = 404;
          res.end(JSON.stringify({ error: `Rota não encontrada: ${req.method} ${pathname}` }));
        } catch (error) {
          console.error('[v0] API Error:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }));
        }
      });
    }
  };
}
