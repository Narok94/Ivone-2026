# Ativação Neon e publicação do Caderninho

Destino conferido: projeto Neon `Ivone` (`withered-mountain-96799646`), branch `main` (`br-crimson-star-am2ksmyk`), banco `neondb`, endpoint `ep-bitter-morning-amgwz7yw`. Vercel: projeto existente `ivone-2026`, repositório `Narok94/Ivone-2026`, produção `main`, Vite, raiz `.`.

Backup anterior à migração salvo fora do repositório em `../Ivone-2026-backups/2026-10-12-activation`: snapshot JSON, SQL de recuperação para banco vazio, hashes SHA-256 e relatório de verificação. Recuperação executada somente em PGlite isolado, com comparação integral de todas as linhas: 9 clientes, 91 vendas, 31 pagamentos e 2 usuários. Contém dados privados; não publicar esses arquivos. Backup Git existente preservado; bundle adicional completo criado e verificado.

Preflight `000` executado em transação somente leitura: destino, CREATE e ausência de conflitos aprovados. Migrações aditivas `001` e `002` aplicadas. Colunas, chaves, índices, expiração e permissões do backend verificadas após a aplicação. Verificação de integridade financeira aprovada somente por leitura. Nenhuma restauração ou operação financeira de teste executada no Neon.

Redis substituído por Neon para sessões e limite de tentativas. Login, sessão persistente, cookies Secure/HttpOnly/SameSite, CSRF, logout e rejeição de cookie revogado verificados com os handlers reais e Neon antes da publicação. Nenhum PIN/token foi registrado. Testes reais escrevem somente nas tabelas de autenticação. Um usuário legado sem username permanece intacto; o usuário com username foi validado.

TypeScript, build, 71 testes funcionais/autenticação, 2 testes de isolamento e jornadas completas de navegador aprovados. Mobile validado em sete tamanhos/orientações; desktop preserva gestão. Cadastro/edição, vários produtos, pagamentos parciais/totais, saldos/extratos/relatórios, correções/cancelamentos, idempotência, resposta perdida e recarga foram testados exclusivamente com dados fictícios.

As notas anteriores em `publicacao-pendencias.md`, `ativacao-tabelas-neon.md` e `neon-auth.md` são registros históricos de preparação. Esta ativação foi autorizada pelo usuário, que também autorizou commit, push e deploy automático após as verificações.
