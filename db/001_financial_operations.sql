-- Additive migration. Not applied automatically or at application startup.
-- Existing clients, sales, payments, users and settings are preserved.
BEGIN;
CREATE TABLE IF NOT EXISTS public.operacoes_financeiras (
  operation_id uuid PRIMARY KEY,
  user_id text NOT NULL,
  fingerprint text NOT NULL CHECK (length(fingerprint) = 64),
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
