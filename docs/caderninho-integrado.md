# Caderninho integrado ao Ivone-2026

## Resultado e situação da publicação

A `dev` integra o protótipo floral dos commits `369cc13` e `d7ac4e5` ao aplicativo real. Há um único `App` e um único `DataProvider`: no celular, o chat é apresentado após autenticação; no computador, a gestão existente é mantida. O chat consulta e grava pelas mesmas regras e pela mesma conexão Neon utilizada pelo desktop. Os entrypoints, scripts e dados fixos da demonstração independente foram removidos. O projeto `ivone-2026-demo` não é destino desta publicação.

**A versão integrada não foi publicada em produção nem incorporada à `main`.** O proprietário confirmou que não existe Redis configurado. Também falta aplicar a estrutura adicional de idempotência preparada nesta tarefa. Não seria seguro publicar a autenticação sem o armazenamento compartilhado validado ou liberar operações financeiras sem o registro durável de confirmações.

O projeto oficial Vercel continua sendo `ivone-2026`, conectado a `Narok94/Ivone-2026`, com produção na `main` e domínio `https://ivone-2026.vercel.app`. Sua proteção Vercel e seu domínio não foram alterados. A branch `backup-main-2026-10-11` foi preservada.

## Arquitetura e interfaces

- `src/main.tsx` sempre monta `DataProvider → App`, incluindo acesso a `/demo`: essa rota agora também exige a sessão do aplicativo.
- `src/App.tsx` apresenta o chat em telas pequenas ou dispositivos de toque, e a gestão tradicional em desktop. `/?modo=gestao` permite usar a gestão completa no celular, com retorno ao Caderninho.
- `ChatFrame` reaproveita o fundo `src/assets/fundo.png`, cabeçalho, avatar, balões, cartões, cores e composição do protótipo aprovado.
- `MobileCaderninho` coordena mensagens, consultas, seleção de clientes, revisão, situação do pagamento e confirmação. Não contém clientes, vendas ou pagamentos fictícios de produção.
- `OperationEditor` permite corrigir cliente, produto, quantidade, preço unitário, data e observações, adicionar/remover produtos e esclarecer preço unitário versus total.
- A gestão desktop mantém clientes, vendas, recebimentos, pendências, extratos, histórico, relatórios, tema e backup. Os formulários financeiros usam o mesmo serviço transacional do chat.

## Interpretação e perguntas orientadas

O interpretador é determinístico e local, sem IA externa. Reconhece os exemplos solicitados e variações com `venda`, `vendi`, `comprou`, `levou`, `pagou`, recebimento, extrato e dívida. Aceita acentuação, maiúsculas/minúsculas, algumas abreviações, números brasileiros, quantidades em números ou palavras simples, datas e `obs:`.

O reconhecimento de cliente utiliza os registros existentes. Nomes completos têm prioridade; primeiras palavras compartilhadas exigem escolha. Aproximações e abreviações sugerem cadastros, exigindo seleção explícita. O contexto do comprador evita remover do produto uma palavra que coincida com o nome de outra cliente. Clientes desconhecidas não são criadas automaticamente: a usuária deve selecionar/cadastrar a cliente pela gestão.

Os nomes de produtos são texto livre, sem catálogo obrigatório ou lista de marcas. Vários itens podem ser separados por `e`; quantidades e preços precisam ser inequívocos. Um valor para múltiplas unidades sem indicação de preço unitário/total exige esclarecimento. Totais não divisíveis em centavos pela quantidade exigem ajuste dos itens, sem arredondamento silencioso. Quantidades altas ou informações insuficientes levam à revisão orientada.

Limite do interpretador inicial: não cobre todas as construções de português, datas relativas ou números escritos por extenso. Se não reconhecer o pedido com segurança, solicita informações e oferece edição dos campos. Não interpreta sozinho planos de parcelas: explica o modelo agregado e solicita quanto foi recebido agora.

## Venda e recebimento

1. A mensagem é exibida e os dados atuais são consultados no servidor.
2. Cliente, produtos, quantidades, valores e data são interpretados.
3. Dúvidas são resolvidas por seleção ou edição; nenhuma escrita financeira acontece nessa etapa.
4. A venda pergunta **Pagou tudo**, **Pagou uma parte** ou **Ainda não pagou**. Não assume recebimento, mesmo quando a mensagem menciona que já foi paga.
5. O cartão mostra cliente, data, itens, valores unitários/totais, observações, total, recebido, restante após esse recebimento e saldo previsto do cliente.
6. **Confirmar** envia a operação; **Corrigir** reabre os campos e solicita novamente a situação do pagamento; **Cancelar** descarta sem escrita.
7. O servidor revalida todos os dados e calcula os totais. O resultado atualiza os registros compartilhados e informa o saldo efetivo.

Uma venda de R$ 1.000,00 com entrada de R$ 200,00 grava venda e pagamento juntos e mantém R$ 800,00 desse lançamento sem recebimento. O saldo total do cliente inclui seus registros anteriores; pode ser diferente desse restante. Um pagamento posterior é outra operação confirmada. Valores superiores à dívida só são aceitos mediante confirmação explícita de crédito.

Consultas utilizam snapshots reais: saldo de uma cliente, extrato completo, clientes com saldo positivo e recebimentos. O total recebido informa o período: histórico, hoje ou mês atual. Quando um período não é reconhecido, pede escolha. Uma cliente mencionada na consulta de recebimentos é filtrada explicitamente.

Não há vencimentos, parcelas formais ou associação obrigatória de pagamentos antigos a cada venda. As cores da gestão continuam usando estimativa FIFO, centralizada em centavos, enquanto o saldo financeiro é sempre agregado por cliente.

## Dinheiro e datas

`src/lib/finance.ts` centraliza conversões, somas, totais, saldos, formatação e distribuição estimada. A aplicação calcula em centavos inteiros; o Neon mantém os campos `numeric` existentes, recebendo valores decimais exatos em parâmetros SQL. Os contratos de leitura legados continuam apresentando valores em reais.

O servidor ignora totais enviados pelo cliente e recalcula quantidade × preço unitário. Exige descrição, cliente válida, quantidades inteiras de 1 a 10.000, preços positivos e no máximo 50 itens por operação. O total de uma operação é limitado a R$ 10.000.000,00. Datas devem ser dias reais entre 1900 e 2100; recebimentos futuros são recusados. A data padrão usa `America/Sao_Paulo`, evitando a troca de dia às 21h causada por UTC.

O resumo não perde centavos na animação. Pendência global soma apenas dívidas positivas, sem descontar o crédito de uma cliente da dívida de outra. Relatórios e recebimentos também somam em centavos. O extrato não desloca datas para o mês anterior e o calendário troca de mês a partir do dia 1.

## Atomicidade e idempotência

`POST /api/operations` é o ponto comum de criação, edição e exclusão financeira. O servidor:

1. Valida sessão e CSRF.
2. Exige `confirmed: true` e um UUID de confirmação.
3. Normaliza e valida os dados, antes de abrir a transação.
4. Abre transação, adquire lock transacional compartilhado e consulta a confirmação persistida.
5. Recusa reutilização com dados ou usuário diferentes.
6. Valida cliente/registro e calcula disponibilidade financeira no banco.
7. Grava todos os produtos, o recebimento e o comprovante da operação na mesma transação.
8. Retorna os registros atuais e saldo, concluindo com `COMMIT`; falhas fazem `ROLLBACK` e descartam a conexão em erro.

O lock também participa das alterações de clientes e restaurações. `GET /api/operations` retorna clientes, vendas e pagamentos em uma transação somente de leitura com snapshot consistente. O frontend descarta snapshots anteriores a uma gravação e respostas de sessões encerradas.

`operacoes_financeiras` contém UUID, identificador do usuário, hash dos dados normalizados, resultado mínimo e data. A chave primária impede duplicações. O controle é permanente, incluindo após exclusão/restauração de registros: uma tentativa repetida retorna o estado atual, sem recriar itens apagados. Redis é utilizado para sessões e proteção de PIN, não como substituto desse controle transacional.

Após confirmação explícita, o navegador mantém somente o pedido pendente em `sessionStorage`, por usuário, para reutilizar o mesmo UUID após falha ou recarga. Esse pedido contém dados financeiros da operação, não PIN, cookie ou segredo de integração. Não autoriza acesso e só é apresentado após sessão validada; o servidor valida novamente. É removido após resposta conclusiva. Antes de conhecer o resultado, a interface permite repetir a mesma confirmação e bloqueia alteração/cancelamento que poderia substituir uma operação já salva. Fechar a aba/limpar armazenamento exige conferir o histórico antes de recomeçar.

Os endpoints legados de vendas e pagamentos mantêm suas leituras. Escritas exigem confirmação, UUID e CSRF e passam pelo mesmo executor; não aceitam mais total arbitrário. A seleção e edição antigas são limpas ao iniciar uma nova operação.

## Autenticação e publicação segura

Mantém login por PIN existente, cookies `HttpOnly`, `SameSite=Strict`, `Secure` e prefixo `__Host-` em produção, duração de oito horas, revogação e tratamento de `401`. PIN e credenciais não são enviados nos dados de sessão. Identidade não é obtida do `localStorage`.

O login limita tentativas por dispositivo/conta em janelas de cinco minutos, com incremento/expiração atômicos no Redis. Erros do serviço bloqueiam autenticação; não há fallback em memória na Vercel. A memória é restrita a desenvolvimento/testes locais.

`scripts/verify-release.mjs` roda automaticamente antes do build na Vercel. Verifica configuração, escrita/leitura/revogação e Lua no Redis real usando uma chave temporária própria com TTL de 60 segundos. Também verifica, somente para leitura, schema de idempotência e integridade financeira no Neon. Falhas interrompem o build antes de publicar. Builds locais compilam sem afirmar validação de serviços reais.

As atualizações compatíveis de dependências corrigiram os alertas encontrados. `@vercel/node`, usado somente para tipos, foi removido; os handlers usam tipos estruturais compatíveis com Express/Vercel. PGlite e Playwright são dependências de desenvolvimento para os testes, sem integração de IA.

## Backup e dados existentes

O backup versão 2 usa snapshot consistente, contagens, fingerprint e controle de operações. Exclui usuários, PINs e sessões. Valida IDs, relacionamentos, datas e valores antes de exportar ou restaurar. Restaurações exigem confirmação, UUID próprio e backup prévio dos dados atuais; se os registros mudarem depois desse backup, são recusadas. São atômicas, idempotentes e preservam usuários/configurações e confirmações já consumidas. Backups anteriores completos em formato compatível continuam aceitos.

No Neon principal foram realizadas apenas consultas em `BEGIN READ ONLY`, encerradas com `ROLLBACK`. Foram encontrados **9 clientes, 91 vendas, 31 pagamentos e 2 usuários**. As verificações não encontraram clientes sem nome, vendas/pagamentos órfãos, datas ausentes, valores inválidos ou divergências de total/centavos. Nenhum dado foi limpo, alterado ou restaurado; não há necessidade demonstrada de limpeza. A tabela adicional ainda não existe nesse banco.

## Testes e reprodução

- `npm run lint`: TypeScript.
- `npm test`: 46 testes, com autenticação, CSRF, sessão/expiração/logout, PIN, parser, centavos/datas, atomicidade, idempotência, concorrência de confirmações, resposta perdida, rollback, replay após exclusão e backup/restauração.
- `npm run build`: build de produção local.
- `npm run test:browser`: aplicativo compilado, handlers reais e PostgreSQL em memória, sem credenciais Neon. Usa Edge por padrão; `BROWSER_CHANNEL` permite outro navegador instalado compatível com Playwright.
- Browser: 414×896, 393×852, 320×568, 375×667, 430×932, 360×800 e 896×414; desktop 1440×1000 e acesso à gestão completa em celular.
- Nos dois tamanhos prioritários: login, seleção ambígua, venda com vários produtos, pagamento parcial/total/posterior, correção/cancelamento, consultas, perda da resposta depois do commit, recarga e tentativa sem duplicação, logout e cookie revogado.
- Desktop: múltiplos itens em uma transação, cancelamento antes de salvar, pagamento parcial, centavos no resumo, nova operação sem edição/cliente antigos, clientes, relatórios, histórico, configurações e download de backup recuperável.
- As escritas, exclusões e restaurações de teste ocorreram apenas no PostgreSQL isolado em memória. Não há teste destrutivo no Neon principal. Redis foi simulado nos testes; não foi validado um Redis real inexistente.
- Imagens e arquivos fictícios de verificação ficam em `test-results/`, ignorado pelo Git.

A emulação Chromium/Edge não substitui iPhones físicos/Safari. Notch, Dynamic Island, barras e teclado reais nesses aparelhos continuam exigindo verificação. O layout usa safe areas, `visualViewport`, rolagem independente, fonte de 16px nos campos e adaptações para telas estreitas/alturas reduzidas.

## Arquivos envolvidos

| Grupo | Arquivos principais |
|---|---|
| Entrada e gestão | `src/main.tsx`, `src/App.tsx`, `src/components/common.tsx` |
| Chat aprovado integrado | `src/components/mobile/ChatFrame.tsx`, `MobileCaderninho.tsx`, `OperationEditor.tsx`, `mobile-chat.css`; fundo original preservado |
| Dados e regras | `src/contexto/DataContext.tsx`, `src/lib/api.ts`, `finance.ts`, `conversation.ts`, `pending-operation.ts`, `useFinancialCommit.ts` |
| Desktop | formulários `SaleForm.tsx`/`PaymentForm.tsx`, `HeaderSummary.tsx`, `IvoneLayout.tsx`, `SalesView.tsx`, `ClientDetail.tsx`, `AllPayments.tsx`, `History.tsx`, `Reports.tsx` |
| Backend | `api/operations.ts`, `clients.ts`, `sales.ts`, `payments.ts`, `backup.ts`, `login.ts`, `session.ts`, `logout.ts`, `db.ts`, `server.ts`; helpers em `server/lib/financial.ts`, `legacy-financial.ts`, `backup.ts`, `http.ts`, `session.ts`, `login-limit.ts`, `login-script.mjs` |
| Ativação | `db/001_financial_operations.sql`, `scripts/verify-release.mjs` |
| Testes/dependências | `tests/official-browser.ts`, `conversation.test.ts`, `financial.test.ts`, `backup.test.ts`, `login-limit.test.ts`, testes anteriores ajustados e fixtures; `package.json`, `package-lock.json` |
| Documentação/remoções | este relatório, autenticação e documentos históricos atualizados; removidos entrypoint/config/scripts/componentes e testes da aplicação independente de demo |

## Pendências para ativar no domínio oficial

1. Configurar um Redis REST real compatível e as variáveis **AUTH_REDIS_REST_URL** e **AUTH_REDIS_REST_TOKEN** no projeto oficial `ivone-2026`, em Production e Preview, mantendo valores fora do Git/chat. Não foram criados serviços nem credenciais nesta tarefa.
2. Revisar e aplicar a migração aditiva `db/001_financial_operations.sql`, que não modifica os quatro conjuntos de registros existentes. Ela não é executada automaticamente pelo aplicativo. Nenhuma limpeza é necessária.
3. Executar `npm run verify:release` com as configurações reais protegidas. É necessário comprovar Redis real e schema correto; não basta a simulação dos testes.
4. Validar login HTTPS e fluxos em staging com banco isolado, incluindo Safari/iPhones. Não usar o Neon principal para testes destrutivos.
5. Somente após essas verificações, integrar `dev` à `main` e publicar no projeto oficial, mantendo domínio e backup. Validar o site principal e seus fluxos antes de declarar conclusão.

O bloqueio atual é concreto: Redis ausente (confirmado pelo proprietário) e tabela de idempotência não aplicada. Não foi realizada promoção, merge na `main` ou mudança da produção para contornar essas condições.
