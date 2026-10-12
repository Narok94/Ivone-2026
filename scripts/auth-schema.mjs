export async function verifyAuthAndFinancialSchema(db) {
  const expected = {
    operacoes_financeiras: { operation_id: 'uuid', user_id: 'text', fingerprint: 'text', result: 'jsonb', created_at: 'timestamp with time zone' },
    auth_sessions: { token_hash: 'text', user_id: 'text', username: 'text', csrf_token: 'text', created_at: 'timestamp with time zone', expires_at: 'timestamp with time zone' },
    auth_login_attempts: { scope: 'text', key_hash: 'text', attempts: 'integer', window_started_at: 'timestamp with time zone', expires_at: 'timestamp with time zone' },
  };
  const keys = { operacoes_financeiras: ['operation_id'], auth_sessions: ['token_hash'], auth_login_attempts: ['scope', 'key_hash'] };
  for (const [table, fields] of Object.entries(expected)) {
    const columns = (await db.query("SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name=$1", [table])).rows;
    for (const [name, type] of Object.entries(fields)) if (!columns.some(c => c.column_name === name && c.data_type === type && c.is_nullable === 'NO')) throw new Error(`Schema incompatível: ${table}.${name}`);
    const primary = (await db.query("SELECT kcu.column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu USING (constraint_catalog,constraint_schema,constraint_name,table_name) WHERE tc.table_schema='public' AND tc.table_name=$1 AND tc.constraint_type='PRIMARY KEY' ORDER BY kcu.ordinal_position", [table])).rows.map(r => r.column_name);
    if (JSON.stringify(primary) !== JSON.stringify(keys[table])) throw new Error(`Chave primária incompatível: ${table}`);
  }
  for (const table of ['auth_sessions', 'auth_login_attempts']) {
    for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
      const permission = (await db.query('SELECT has_table_privilege(current_user,$1,$2) AS allowed', [`public.${table}`, privilege])).rows[0];
      if (permission?.allowed !== true) throw new Error(`Permissão ${privilege} ausente: ${table}`);
    }
    const indexes = (await db.query("SELECT indexdef FROM pg_catalog.pg_indexes WHERE schemaname='public' AND tablename=$1", [table])).rows;
    if (!indexes.some(i => /\(expires_at\)/.test(i.indexdef))) throw new Error(`Índice de expiração ausente: ${table}`);
    const defaults = (await db.query("SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name='expires_at'", [table])).rows[0];
    if (!defaults?.column_default?.includes('now()') || !defaults.column_default.includes(table === 'auth_sessions' ? '08:00:00' : '00:05:00')) throw new Error(`Expiração padrão incompatível: ${table}`);
  }
}
