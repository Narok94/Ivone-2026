export async function verifyClientSearchSchema(db) {
  const functionInfo = (await db.query("SELECT provolatile FROM pg_proc WHERE oid=to_regprocedure('public.ivone_client_name(text)')")).rows[0];
  if (functionInfo?.provolatile !== 'i') throw new Error('Busca de clientes indisponível: execute SQL 003.');
  const indexes = (await db.query("SELECT c.relname,i.indisvalid,pg_get_indexdef(i.indexrelid) AS definition FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE c.oid IN (to_regclass('public.clientes_name_search_gin'),to_regclass('public.clientes_name_search_order'))")).rows;
  if (indexes.length !== 2 || indexes.some(i => !i.indisvalid || !i.definition.includes('ivone_client_name(full_name)'))) throw new Error('Índices de busca ausentes ou incompatíveis.');
  if (!indexes.some(i => i.definition.includes('gin_trgm_ops')) || !indexes.some(i => i.definition.includes('text_pattern_ops'))) throw new Error('Índices de busca incompatíveis.');
}
