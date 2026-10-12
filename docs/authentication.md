# Authentication and API protection

Changes are confined to `dev`. There is no deployment, database migration or database provisioning at startup.

The integrated Caderninho adds `/api/operations`, PIN attempt limiting and release verification. See `caderninho-integrado.md` for the current delivery and activation requirements. The financial migration is prepared and tested in isolation; it has not been applied to Neon.

## Changed files

- Backend: `api/login.ts`, `api/session.ts` (new), `api/logout.ts` (new), `api/clients.ts`, `api/sales.ts`, `api/payments.ts`, `api/backup.ts`, `api/db.ts`, `server.ts`, `server/lib/session.ts` (new).
- Frontend: `src/contexto/DataContext.tsx`, `src/lib/api.ts` (new), `src/components/layout/IvoneLayout.tsx`, `src/components/dashboard/AllPayments.tsx`, `src/components/dashboard/ManageClients.tsx`, `src/components/dashboard/SalesView.tsx`. Dashboard changes only catch failed deletions and reuse existing toast messages/styles.
- Build/tests: `vite.config.ts`, `package.json`, `package-lock.json`, `tests/auth.test.ts` (new), `tests/frontend.test.tsx` (new), `tests/fixtures/database.mjs` (new).
- Documentation: `docs/authentication.md` (new).

The lockfile was repaired after `npm ci` rejected pre-existing inconsistencies. `jsdom` is a development-only dependency for frontend session tests. Vite no longer has unused definitions capable of copying API keys into browser code.

## Session lifecycle

- PIN login keeps the existing screen and user flow. The server checks the existing `usuarios` record; it does not change its contents.
- The browser receives an opaque, random 256-bit session cookie. Only its SHA-256 digest is used as the storage key. PINs and database credentials are never stored in sessions or returned to the browser.
- Cookies use `HttpOnly`, `SameSite=Strict`, `Path=/` and an eight-hour absolute lifetime. Production/Vercel additionally uses `Secure` and the `__Host-` prefix.
- `/api/session` reconstructs frontend identity and CSRF state on reload. `ivone_user` is removed and never used for authentication. The theme preference remains unchanged.
- Logout deletes the server-side session before clearing the cookie. Storage failures return `503`; the frontend does not claim logout succeeded. A `401` clears frontend identity and business data.
- All business API handlers enforce session validation directly, including Vercel entry points. Unsafe methods also require the session's CSRF token and a matching `Origin`. Login requires same-origin JSON. No cross-origin CORS permission is granted locally.
- Session and business API responses use `Cache-Control: no-store`. Responses arriving after a session change are discarded by the shared frontend request helper.

## Shared authentication storage — Neon

The current implementation uses the existing Neon PostgreSQL connection for production sessions and atomic PIN-attempt counters. Apply db/002_auth_sessions.sql manually only after authorization. No Redis service or Redis environment variables are required. See [neon-auth.md](neon-auth.md) for the current implementation, schema and validation.

Cookies, CSRF, absolute expiration and server-side logout are unchanged. Production/Vercel never falls back to memory. Local development/test use memory; the fictional launcher remains isolated from Neon. Schema or storage failure denies authentication. AUTH_APP_ORIGIN remains optional for the correct HTTPS origin of each environment.

## Verification

- `npm run lint`: TypeScript checks.
- `npm run build`: production frontend build.
- `npm test`: backend handlers, local Express HTTP integration, production session store adapter and frontend React effects in a simulated DOM. PostgreSQL authentication is covered by isolated in-memory tests. Financial writes/restores run only on isolated in-memory PostgreSQL fixtures, never Neon.
- Coverage includes missing/tampered cookies, all business APIs, login, page reload, absolute expiration, CSRF failures, shared sessions, server-side logout, storage outage, forged localStorage and `401` cleanup.

Before deployment, verify the actual Redis service, HTTPS origin/cookie behavior and complete browser workflows in a staging environment with a separate test database. Production Neon was not inspected or tested. No restoration was executed even against a test database.

## Remaining work outside this implementation

Existing PIN storage/comparison was preserved to respect the prohibition on Neon changes. Hash migration and distributed login attempt limits remain separate security work. Business payload validation, including comprehensive restore-file validation, remains a separate task; restoration is now gated by session and CSRF protection.
