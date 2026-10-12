# Autenticação Neon — implementação local, 12/10/2026

Redis foi substituído em `server/lib/session.ts` e `server/lib/login-limit.ts`. O script Lua obsoleto foi removido depois da validação do adapter PostgreSQL. Não há chamadas Redis, variáveis Redis obrigatórias ou fallback em memória na produção/Vercel. Variáveis antigas eventualmente presentes são ignoradas.

## Contrato e proteção

As APIs e interfaces existentes foram preservadas. O adapter usa `api/db.ts`, com a mesma conexão Neon configurada, sem executar migrações no startup. `db/002_auth_sessions.sql` é o contrato de tabelas/índices/defaults e foi aplicado somente no PostgreSQL em memória dos testes. Nenhuma conexão, leitura ou escrita no Neon real foi realizada nesta tarefa.

Tokens aleatórios de 256 bits, apenas SHA-256 no banco; CSRF e origem continuam obrigatórios para mutações. Cookies de produção mantêm `__Host-`, Secure, HttpOnly, SameSite=Strict e oito horas de validade. Login renova a sessão e revoga a anterior; logout revoga no banco antes de limpar o cookie. Falha de conexão, schema ausente ou erro de armazenamento resulta em indisponibilidade, sem autorizar via memória.

Sessões são consultadas com `expires_at > now()` e nunca renovadas por leituras. Timestamps são convertidos para milissegundos inteiros para compatibilidade com a precisão de microssegundos do PostgreSQL. ID do usuário é persistido como texto; a interface já aceita número/texto e as chaves de confirmação usam String(id), preservando identidade após recarga.

Limite de login: 30 tentativas por conta e 10 por conta/dispositivo em cinco minutos. Hashes, sem IP/PIN em texto. Os dois contadores são incrementados numa transação, com UPSERT atômico, ordem fixa de locks e rollback em falha. Janela é fixa, resetada somente após expirar; contadores saturam antes de overflow. Não usa o lock financeiro.

Limpeza oportunista a cada dez minutos por processo em login/criação de sessão: até 100 expirados por tabela, com SKIP LOCKED e coordenação de chamadas concorrentes. Remove apenas sessões/contadores expirados. Não depende da limpeza para negar sessões expiradas. Não apaga lançamentos financeiros.

Desenvolvimento/testes locais continuam em memória; o launcher fictício conserva o bloqueio de Neon, credenciais e imports do banco real. Mobile conversacional e gestão desktop não foram alterados. A demonstração HTTPS mantém o gateway e as rotas administrativas bloqueadas.

## Publicação

`verify-release` agora usa exclusivamente uma transação Neon READ ONLY: verifica colunas, nulabilidade, chaves primárias, permissões do papel backend, índices/defaults de expiração das tabelas de autenticação e schema/integridade financeira. A permissão UPDATE também é necessária para os locks da limpeza com FOR UPDATE. Não escreve provas de sessão ou contadores. O build local não se conecta a serviços externos.

Próximo passo: autorizar a conferência `db/000_activation_preflight.sql` no banco correto; depois criar/verificar `001_financial_operations.sql` e `002_auth_sessions.sql`. Confirmar a conexão Neon e as opções Vercel já documentadas. Só após schema e autenticação reais validados autorizar commit/push/publicação. Redis não precisa ser configurado. Nenhum push/deploy foi realizado.

Sessões antigas de Redis não são migradas; usuários precisarão entrar novamente ao publicar. PINs e registros existentes permanecem intactos. Sem as tabelas novas, login de produção falha com 503 e a verificação de publicação bloqueia o build externo.

Validação: SQL 001/002 aplicados exclusivamente em PostgreSQL em memória; testes direcionados de autenticação/CSRF/logout, réplica, expiração, Vercel, concorrência, rollback, saturação, limpeza limitada e schema ausente aprovados. TypeScript, build e inicialização/encerramento fictício aprovados. Jornadas completas de mobile/desktop já aprovadas não foram repetidas, pois seus componentes não mudaram.
