import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();

const rawConnectionString = (process.env as any).ivone_DATABASE_URL || process.env.IVONE_DATABASE_URL || process.env.DATABASE_URL || '';

// Bypass pooler for direct connection and ensure schema=public
const cleanUrl = rawConnectionString.replace('-pooler', '');
let connectionString = cleanUrl;

if (connectionString && !connectionString.includes('schema=')) {
  const separator = connectionString.includes('?') ? '&' : '?';
  connectionString += `${separator}schema=public`;
}

// Required for @neondatabase/serverless in Node environments
if (typeof window === 'undefined') {
  try {
    // Enable fetch for potentially better compatibility in some environments
    (neonConfig as any).useFetch = true;
    const wsConstructor = (ws as any).default || ws;
    neonConfig.webSocketConstructor = wsConstructor;

  } catch (e) {
    console.error('Database client configuration unavailable');
  }
}

// Create pool lazily
export const pool = new Pool({
  connectionString: connectionString || '',
});
