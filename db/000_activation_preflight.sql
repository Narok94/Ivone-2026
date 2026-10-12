-- READ ONLY. Run manually in the correct Neon database/branch before any DDL.
-- Reports metadata only; never reads client, sale, payment or PIN values.
BEGIN READ ONLY;

SELECT current_database() AS database_name,
       current_user AS database_role,
       current_setting('server_version') AS postgres_version,
       has_schema_privilege(current_user, 'public', 'CREATE') AS can_create_tables;

SELECT name AS relation_name, to_regclass(name) AS existing_relation
FROM (VALUES
  ('public.usuarios'),
  ('public.clientes'),
  ('public.vendas'),
  ('public.pagamentos'),
  ('public.operacoes_financeiras'),
  ('public.auth_sessions'),
  ('public.auth_login_attempts')
) AS expected(name);

SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('operacoes_financeiras', 'auth_sessions', 'auth_login_attempts')
ORDER BY table_name, ordinal_position;

SELECT c.relname AS table_name, con.conname AS constraint_name,
       pg_get_constraintdef(con.oid) AS definition
FROM pg_catalog.pg_constraint con
JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('operacoes_financeiras', 'auth_sessions', 'auth_login_attempts')
ORDER BY table_name, constraint_name;

SELECT tablename, indexname, indexdef
FROM pg_catalog.pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('operacoes_financeiras', 'auth_sessions', 'auth_login_attempts')
ORDER BY tablename, indexname;

-- Review inherited permissions before storing authentication data.
SELECT defaclrole::regrole AS owner_role,
       defaclnamespace::regnamespace AS schema_name,
       defaclobjtype AS object_type,
       defaclacl AS default_permissions
FROM pg_catalog.pg_default_acl
WHERE defaclnamespace = 0 OR defaclnamespace = 'public'::regnamespace;

SELECT c.relname AS table_name, c.relowner::regrole AS owner_role,
       c.relacl AS explicit_permissions
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('operacoes_financeiras', 'auth_sessions', 'auth_login_attempts');

COMMIT;
