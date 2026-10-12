# Preparação de ativação — main local, 12/10/2026

Atualização posterior: a substituição por Neon foi implementada localmente. Redis não é mais requisito do código atual; a ativação autorizada dos SQL 001/002 ainda está pendente. Veja [neon-auth.md](neon-auth.md). O conteúdo abaixo registra a etapa anterior.

## Situação real

A última tarefa avaliou a viabilidade de Neon para autenticação; não implementou a substituição. A revisão atual confirma que `server/lib/session.ts`, `server/lib/login-limit.ts` e `scripts/verify-release.mjs` ainda dependem de Redis em produção. Criar as tabelas abaixo não remove essa dependência nem libera a publicação.

Nesta tarefa foram preparados somente SQL e instruções. Não houve execução de SQL, conexão com o banco, mudança nos handlers, commit, push ou deploy. Não foi executado SQL nem em banco de teste, respeitando a instrução de não executar ainda. As verificações são estáticas; a compatibilidade efetiva com os objetos atuais deve ser confirmada pela conferência prévia autorizada.

Verificação essencial aprovada: scripts com BEGIN/COMMIT, delimitadores balanceados e comandos limitados a SELECT de metadados no preflight ou CREATE dos objetos previstos/SET LOCAL nas migrações. Busca estática confirmou ausência de comandos destrutivos e de gravações de registros. `git diff --check` aprovado. Não é validação de execução do PostgreSQL; nenhum SQL foi enviado a uma engine.

## Scripts e ordem futura

1. **`db/000_activation_preflight.sql`**: transação somente leitura; informa banco/versão/permissão CREATE, presença das tabelas e definições das colunas, constraints e índices novos. Não consulta registros de clientes/vendas/pagamentos ou valores de PIN. Conferir no banco/branch apontado por `ivone_DATABASE_URL` da Vercel; somente se essa variável não existir, seguir `IVONE_DATABASE_URL`/`DATABASE_URL`.
2. **`db/001_financial_operations.sql`**: já existente e compatível com o contrato financeiro atual; cria `public.operacoes_financeiras` com UUID primário, `user_id` textual, fingerprint de 64 caracteres, resultado JSONB e data de criação. Nenhuma alteração no conteúdo ou tipos foi necessária; foram adicionadas instruções de conferência.
3. **`db/002_auth_sessions.sql`**: novo esquema proposto para o futuro adapter Neon, contendo `public.auth_sessions` e `public.auth_login_attempts`, com índices de expiração. Executar somente depois de confirmar o contrato com a implementação do adapter e autorizar a criação.
4. Repetir a conferência de metadados (`000`) após a execução autorizada para confirmar as estruturas. Em caso de erro, interromper e dar ROLLBACK na transação aberta; não corrigir por DROP/TRUNCATE ou alterações improvisadas.

Se os nomes novos já existirem, comparar todas as definições antes de executar CREATE. `IF NOT EXISTS` não verifica equivalência de esquema; um objeto diferente deve bloquear a ativação e ser revisado separadamente, sem reparo automático. O mesmo vale para os índices existentes. Esta ressalva segue a [documentação PostgreSQL](https://www.postgresql.org/docs/current/sql-createtable.html).

## Segurança e compatibilidade

- DDL aditivo, dentro de transações, com nomes qualificados `public`. Nenhum INSERT, UPDATE, DELETE, DROP, TRUNCATE, ALTER, GRANT ou mudança de tabelas de negócio.
- Nenhum trigger, extensão, criação/alteração de usuários do banco, foreign key para dados legados ou ON DELETE CASCADE. `user_id` é texto para preservar a aceitação de IDs numéricos/textuais sem impor novo tipo a `usuarios.id`.
- Sessões guardam somente o SHA-256 do token aleatório, identidade e CSRF; não armazenam token de cookie original nem PIN. Expiração absoluta padrão de oito horas; leitura futura deve exigir `expires_at > now()` e logout deve revogar no servidor.
- Contadores guardam hash e escopo de conta/dispositivo, não IP ou PIN em texto. Janela padrão de cinco minutos, como no limiter atual. A implementação futura deve incrementar/resetar atomicamente por `(scope, key_hash)`, mantendo os limites atuais de 30 tentativas por conta e 10 por dispositivo, sem overflow e sem janela móvel acidental.
- Os índices permitem localizar expirados. PostgreSQL não aplica TTL automaticamente: o adapter deve rejeitar expirados mesmo antes da limpeza e prever limpeza limitada das tabelas de autenticação. Não incluir limpeza de registros financeiros.
- O SQL novo usa tipos/constraints/índices PostgreSQL comuns, sem depender do tipo de IDs das tabelas existentes. Os timeouts da migração de autenticação limitam espera por locks; a criação de índices pode bloquear operações na própria tabela de autenticação se ela já existir/populada, motivo para revisar antes. Não toma o lock financeiro da aplicação.
- Constraints/índices declarados serão criados somente em objetos novos; não modificam dados existentes. Não se afirma que permissões, versão ou nomes do banco real tenham sido reconferidos nesta etapa.
- A conferência também lista permissões explícitas/default. Antes de guardar autenticação, confirmar acesso às tabelas somente pelas funções de backend/papéis autorizados; credenciais Neon não devem ir ao navegador. Nenhum GRANT/REVOKE é executado pelos scripts preparados.

## Próximo passo exato

1. Implementar e testar em banco fictício o adapter Neon de **sessões e limite de tentativas**, usando o esquema `002`, preservando cookies Secure/HttpOnly/SameSite, CSRF, revogação e recusa de autenticação em falha. Ajustar `verify-release` para verificar Neon em vez de exigir Redis. Manter modo fictício isolado.
2. Revisar essa implementação e o contrato final dos SQL; autorizar a execução da conferência `000` no banco correto. Com metadados compatíveis e permissão adequada, autorizar `001` e `002`, sem tocar nos registros de negócio.
3. Confirmar Vercel: conexão Neon, Vite, raiz `.`, build `npm run build`, saída `dist`, Production Branch `main` e origem HTTPS correta quando `AUTH_APP_ORIGIN` for usada. Validar autenticação, logout, bloqueio de tentativas e idempotência em ambiente de teste apropriado.
4. Somente depois liberar commit/push da main e publicação. O push na main pode disparar a Vercel; permanece bloqueado enquanto o código ainda exigir o Redis ausente ou as tabelas necessárias não estiverem verificadas.
