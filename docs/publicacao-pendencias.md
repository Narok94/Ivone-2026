# Publicação: verificação de 12/10/2026

## Revisão e entrega

Revisadas as alterações locais da `dev`, incluindo arquivos novos, diff de frontend/backend, documentação e testes. O coordenador conversacional substitui as funções do editor antigo; nenhum componente desktop foi excluído. As únicas remoções são o editor mobile sem referências e estilos obsoletos. Todas as alterações concluídas entram no commit; credenciais, resultados e arquivos temporários permanecem fora do Git. A referência `origin/dev` foi atualizada antes do commit, sem divergências.

Build, TypeScript e testes de navegador mobile/desktop aprovados na etapa anterior não foram repetidos. Não houve merge, migração, restauração, deploy ou escrita em serviços externos nesta etapa.

## Evidências atuais

- Vercel: projeto `ivone-2026`, ligado a `Narok94/Ivone-2026`, branch de produção `main`, framework `vite`, Node `24.x`. Root/build/output sem override (padrões do framework; raiz efetiva `.`).
- Variáveis de Production e Preview: `ivone_DATABASE_URL` e `DATABASE_URL` presentes; `AUTH_REDIS_REST_URL`, `AUTH_REDIS_REST_TOKEN` e `AUTH_APP_ORIGIN` ausentes. A conexão efetiva do aplicativo prioriza `ivone_DATABASE_URL`.
- Neon de Production: consulta de `information_schema` em transação `BEGIN READ ONLY` retornou zero colunas e zero chaves primárias para `public.operacoes_financeiras`: tabela ausente. Nenhum registro de negócio foi consultado ou alterado.
- Redis: falta configuração no projeto, portanto não houve conexão. Não se conclui que inexiste um serviço na conta; sua disponibilidade e compatibilidade ainda precisam ser verificadas.
- `vercel.json` desabilita deploy automático somente da branch `dev`, usando `git.deploymentEnabled.dev=false`. Isso permite push sem publicação automática dessa branch. Não bloqueia comandos de deploy manual, que não foram executados.
- `verify:release` não foi executado: seus testes SET/DEL/EVAL gravam temporariamente no Redis, contrariando o pedido de não alterar serviços externos.

## Passos manuais antes de uma futura publicação

1. Disponibilize Redis REST HTTPS compatível com Upstash, com suporte a SET/GET/DEL/EVAL. Na Vercel → projeto → Settings → Environment Variables, adicione `AUTH_REDIS_REST_URL` e `AUTH_REDIS_REST_TOKEN` em Production e no Preview que for utilizado. Use o token de escrita para permitir login/logout e limite de tentativas. Não use prefixo `VITE_`.
2. No Neon SQL Editor, selecione o banco/branch correspondente a `ivone_DATABASE_URL`. Quando autorizar a preparação do banco, execute [db/001_financial_operations.sql](../db/001_financial_operations.sql). É uma migração aditiva; não exclui registros existentes. Esta etapa não foi executada pelo agente.
3. Na Vercel, confirme Framework Vite, Root `.` e Production Branch `main`. Para garantir o prebuild de verificação, configure Build Command `npm run build` e Output Directory `dist`; atualmente estão nos padrões. Preserve a conexão Neon existente. `AUTH_APP_ORIGIN` é opcional: se usado, informe a origem HTTPS exata e use um valor adequado para cada ambiente; um domínio de produção fixo no Preview pode bloquear login/CSRF.
4. Mantenha `dev` sem deploy automático até nova autorização. Somente após liberar testes que gravam chaves temporárias no Redis, execute `npm run verify:release` com as variáveis do ambiente carregadas; ele também verifica schema e integridade financeira por leitura. Depois, avalie a publicação separadamente.

Referências: [configuração Git da Vercel](https://vercel.com/docs/project-configuration/git-configuration), [variáveis por ambiente](https://vercel.com/docs/environment-variables), [configuração do projeto](https://vercel.com/docs/project-configuration/project-settings).
