// Prepared migrations execute only in PostgreSQL memory, never Neon.
import { db, pool } from './financial-database.js';
import { readFileSync } from 'node:fs';
await pool.query('SELECT 1');
await db.exec(readFileSync(new URL('../../db/002_auth_sessions.sql', import.meta.url), 'utf8'));
export { db, pool };
