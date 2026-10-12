import { clientRow, FinancialError } from './financial.js';
export const SEARCH_PAGE_SIZE = 8;
export async function searchClients(pool: any, raw: unknown, rawOffset: unknown = 0) {
  if (typeof raw !== 'string' || raw.trim().length < 2 || raw.length > 300) throw new FinancialError('Digite de duas a 300 letras do nome.', 400);
  const offset = Number(rawOffset);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 10000) throw new FinancialError('Essa página não está disponível. Refine o nome.', 400);
  const db = await pool.connect();
  try {
    await db.query('BEGIN READ ONLY');
    await db.query("SET LOCAL statement_timeout = '3000ms'");
    await db.query("SET LOCAL pg_trgm.word_similarity_threshold = '0.55'");
    const name = (await db.query('SELECT public.ivone_client_name($1) AS name', [raw])).rows[0].name;
    const pattern = name.replace(/[\\%_]/g, '\\$&');
    const expression = 'public.ivone_client_name(full_name)';
    // Two-letter input uses the B-tree prefix index. Longer input uses trigram GIN.
    const matching = name.length < 3 ? `${expression} LIKE $2 || '%'` : `(${expression} LIKE '%' || $2 || '%' OR $1 <% ${expression})`;
    const rows = (await db.query(`SELECT *, ${expression} = $1 AS exact_match, ${expression} LIKE '%' || $2 || '%' AS text_match FROM public.clientes WHERE ${matching} ORDER BY (${expression}=$1) DESC,(${expression} LIKE '%' || $2 || '%') DESC,${expression},id LIMIT $3 OFFSET $4`, [name, pattern, SEARCH_PAGE_SIZE + 1, offset])).rows;
    await db.query('COMMIT');
    return { clients: rows.slice(0, SEARCH_PAGE_SIZE).map(clientRow), hasMore: rows.length > SEARCH_PAGE_SIZE, offset, query: raw.trim(), uncertain: rows.some((r: any) => !r.text_match) };
  } catch (e) { await db.query('ROLLBACK'); throw e; }
  finally { db.release(); }
}
