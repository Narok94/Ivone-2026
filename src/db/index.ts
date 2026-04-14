import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn('⚠️ DATABASE_URL não configurada. A aplicação funcionará em modo limitado.');
}

const sql = neon(databaseUrl || '');
export const db = drizzle(sql, { schema });
