-- Schema consumed by server/lib/session.ts and server/lib/login-limit.ts.
-- Apply manually only after authorization; never provisioned at app startup.
-- First inspect db/000_activation_preflight.sql. If these names already exist,
-- compare all columns/constraints/indexes and STOP if their definitions differ.
-- IF NOT EXISTS does not validate or repair an existing relation.
-- Additive only: no business-table references, cascading actions or data changes.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS public.auth_sessions (
  token_hash text PRIMARY KEY CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  user_id text NOT NULL CHECK (length(user_id) BETWEEN 1 AND 100),
  username text NOT NULL CHECK (length(username) BETWEEN 1 AND 100),
  csrf_token text NOT NULL CHECK (csrf_token ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '8 hours'),
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx
  ON public.auth_sessions (expires_at);

CREATE TABLE IF NOT EXISTS public.auth_login_attempts (
  scope text NOT NULL CHECK (scope IN ('account', 'device')),
  key_hash text NOT NULL CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  attempts integer NOT NULL DEFAULT 1 CHECK (attempts > 0),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  PRIMARY KEY (scope, key_hash),
  CHECK (expires_at > window_started_at)
);

CREATE INDEX IF NOT EXISTS auth_login_attempts_expires_at_idx
  ON public.auth_login_attempts (expires_at);

COMMIT;
