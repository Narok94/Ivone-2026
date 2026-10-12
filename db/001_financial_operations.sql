-- Additive migration. Not applied automatically or at application startup.
-- Existing clients, sales, payments, users and settings are preserved.
-- Before manual activation, inspect db/000_activation_preflight.sql.
-- If this relation already exists, compare its schema before continuing:
-- IF NOT EXISTS preserves an existing table but does not validate its definition.
BEGIN;
CREATE TABLE IF NOT EXISTS public.operacoes_financeiras (
  operation_id uuid PRIMARY KEY,
  user_id text NOT NULL,
  fingerprint text NOT NULL CHECK (length(fingerprint) = 64),
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
