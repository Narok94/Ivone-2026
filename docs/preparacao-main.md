# Preparação da dev para main — 12/10/2026

## Código consolidado

- Mobile autenticado mantém somente a conversa. Desktop mantém gestão tradicional; não houve reconstrução do aplicativo.
- Integração normal preserva DataContext, chamadas relativas `/api`, sessão/CSRF e handlers compartilhados. A conexão real segue a prioridade `ivone_DATABASE_URL` → `IVONE_DATABASE_URL` → `DATABASE_URL`, sem alteração de dados, credenciais ou banco.
- Coleta guiada de produtos corrigida para não inserir item indefinido quando o parser identifica palavras de consulta. Cadastro, vendas, recebimentos, consultas, relatórios, correção e cancelamento já estavam aprovados nas jornadas anteriores.
- Modo local `npm run dev:caderninho` e demonstração HTTPS preservados como entradas opt-in. Banco fictício PGlite em memória, sem dotenv/Redis/Neon; nenhuma alteração no login normal ou nos handlers de produção.
- Reforçada a checagem antes de abrir um servidor fictício: exige `NODE_ENV=development`, ausência de Vercel e confirmação de que o **pool usado pelos próprios handlers** é o pool em memória. Invocar a opção sandbox no servidor normal agora falha antes de expor a sessão automática.
- Gateway de demonstração carregado apenas quando solicitado, com link privado temporário, cookies seguros e bloqueio de backup/restauração/APIs antigas/código-fonte. A chave de entrada não é registrada no log de requisições.
- Removida somente a variável `__dirname` do servidor, comprovadamente sem referências. Componentes obsoletos mobile já haviam sido removidos no commit anterior; nenhum componente de gestão desktop foi excluído.
- Fontes, testes e documentação entram no commit. Credenciais, executável do túnel, link privado, snapshots e resultados permanecem ignorados pelo Git.

## Verificação desta etapa

Build de produção e TypeScript aprovados. Testes essenciais novos verificaram:

1. Servidor normal em produção: sessão, operações, clientes e backup recusam acesso sem autenticação; cookie forjado sem Redis retorna indisponibilidade, sem sessão fictícia nem consulta ao banco.
2. A opção sandbox no servidor normal é recusada quando os handlers não usam o pool fictício.
3. Launcher fictício: inicialização/sessão/encerramento aprovados; produção e Vercel recusam o modo; import do banco real bloqueado.

Não foram repetidas jornadas mobile/desktop ou a suíte financeira completa já aprovadas. O teste do gateway e a conversa HTTPS haviam passado na etapa anterior e seu comportamento de acesso não foi alterado. Comandos disponíveis: `npm run test:isolation`, `npm run test:local` (jornada completa, opcional) e `npm run test:local -- --startup-only`.

Referências remotas atualizadas por fetch, sem checkout, merge ou alterações em main/backup. `origin/main` é ancestral da dev: não existe divergência Git com a main na revisão feita. A preparação está pronta como código para revisão/integração; a publicação funcional continua condicionada aos requisitos abaixo. Push somente para origin/dev, com deploy automático dessa branch bloqueado pelo `vercel.json` existente.

## Pendências externas

Mantidas as evidências da consulta anterior de 12/10 em [publicacao-pendencias.md](publicacao-pendencias.md): Vercel sem `AUTH_REDIS_REST_URL`/`AUTH_REDIS_REST_TOKEN` em Production/Preview; tabela `public.operacoes_financeiras` ausente no Neon configurado. Não houve nova consulta ao ambiente nem provisionamento nesta etapa.

Antes de autorizar integração que possa disparar publicação:

1. Configurar Redis REST compatível com SET/GET/DEL/EVAL e as duas variáveis de autenticação no ambiente correto.
2. Autorizar e executar a migração aditiva `db/001_financial_operations.sql` no Neon correto. Nenhuma migração foi executada pelo agente.
3. Confirmar Vercel: Vite, raiz `.`, build `npm run build`, saída `dist`, branch Production `main` e conexão Neon existente. `AUTH_APP_ORIGIN` é opcional, com a origem HTTPS adequada para cada ambiente.
4. Após permitir testes que escrevem chaves temporárias no Redis, validar `npm run verify:release`; ele também confere schema e integridade financeira por leitura. Depois, validar sessão/cookie/CSRF no ambiente real antes de publicar.

O merge para main pode disparar o fluxo automático da Vercel. Não foi realizado merge, deploy, configuração de Redis ou qualquer escrita externa nesta tarefa, além do push Git autorizado para dev.
