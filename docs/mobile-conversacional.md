# Caderninho exclusivamente conversacional

## Revisão local — 12/10/2026

Conferidas `main` (`76a5de9`), `dev` (`25e983a`), referências locais `origin/main`/`origin/dev` e todas as alterações não commitadas. `dev` contém três commits posteriores à `main`; o coordenador conversacional mais recente estava nas alterações locais e foi aproveitado. Não houve consulta remota para atualizar essas referências.

Após ler os componentes e buscar referências em `src` e `tests`, removidos somente `CaderninhoTools.tsx`, `OperationEditor.tsx` e seus estilos exclusivos sem uso. A documentação da etapa intermediária permanece como histórico. A gestão desktop, o parser compartilhado, autenticação e APIs existentes foram preservados, incluindo a proteção de histórico de clientes já presente nas alterações locais.

Validação executada nesta revisão: `npm run build`, `npm run lint`, `npm run test:browser` e `git diff --check`, todos aprovados. A suíte de navegador verificou sete tamanhos mobile (incluindo horizontal), entrada autenticada mesmo com `?modo=gestao`, ausência de navegação/formulários antigos e gestão desktop touchscreen 1440×1000. Banco exclusivamente em memória; nenhuma conexão com o Neon. Build e navegador precisaram executar fora do sandbox por restrições de leitura/inicialização do Edge. A suíte unitária completa não foi repetida nesta revisão.

Entrega permanece local na `dev`, sem commit, push, merge ou deploy. As pendências externas descritas abaixo são registros anteriores, sem nova verificação de produção. Antes da publicação, é necessário confirmar os requisitos de Redis/idempotência no ambiente de destino; nenhuma migração ou provisionamento foi executado nesta tarefa.

Implementação local na branch `dev`, em 11/10/2026. Sem commit, push, merge ou deploy. As alterações locais anteriores foram preservadas e evoluídas; não foi feita limpeza do banco, alteração de infraestrutura ou acesso ao Neon principal nesta tarefa.

## O que mudou

A experiência mobile possui uma conversa, um campo de mensagem fixo e botões de resposta/contexto quando necessários. Não monta dashboard, menus, abas, listas de gestão, relatórios gráficos ou formulários tradicionais. Não há atalho para gestão, nem exceção para `?modo=gestao`. O cabeçalho, as mensagens, os resumos e o fundo floral aprovado continuam no mesmo aplicativo.

`CaderninhoTools` e `OperationEditor` foram removidos após leitura do conteúdo e busca de referências: não eram importados por nenhum componente ou teste. Suas funções já são atendidas pelo coordenador conversacional. Os estilos exclusivos desses formulários, cartões e atalhos também foram removidos. Os componentes da gestão desktop permanecem preservados.

O login e a sessão continuam obrigatórios. `App.tsx` escolhe a experiência após autenticação e carregamento. Telefone identificado pelo navegador permanece no chat na horizontal. Outros dispositivos seguem a largura: até 767px, experiência compacta; a partir de 768px, gestão desktop. Capacidade de toque não determina essa escolha. Um computador touchscreen com janela desktop continua na gestão. Uma janela de computador reduzida usa a experiência compacta. User agents disfarçados dependem da largura; detecção de aparelho é uma heurística.

## Conversas disponíveis

### Clientes

- “Cadastrar cliente” ou “Cadastrar cliente Ana”: pergunta nome, telefone opcional e se há mais informações.
- Informações opcionais são coletadas por perguntas: telefone, e-mail, CPF, CEP, rua, número, complemento, bairro, cidade, estado e observações. A usuária diz o campo e depois o valor; pode dizer limpar, não informar ou concluir cadastro.
- “Clientes”: lista os nomes por mensagem. “Consultar cliente Maria”: apresenta cadastro e saldo real.
- “Editar cliente Maria”: identifica explicitamente a cliente, pergunta campo/valor e apresenta o cadastro completo para revisão.
- “Excluir cliente Maria”: pede confirmação e bloqueia clientes com lançamentos. A proteção é verificada novamente sob o bloqueio financeiro no servidor com a opção `preserveHistory`, evitando exclusão em cascata se surgir uma venda durante a conversa. O contrato existente da gestão desktop permanece compatível.
- Nomes semelhantes exigem escolha. Clientes inexistentes não são inventadas. Um nome já cadastrado exige consultar ou distinguir a pessoa, evitando criação acidental.

Nenhuma escrita ocorre ao responder perguntas. Os dados ficam no rascunho até Confirmar. Corrigir retorna às perguntas, e Cancelar descarta o rascunho.

### Vendas e recebimentos

O interpretador anterior continua reconhecendo produtos livres, quantidades e valores brasileiros. O coordenador conversacional separa informações explícitas de pagamento da descrição dos produtos e orienta as dúvidas sem formulários.

Exemplo validado:

> Vendi dois perfumes pra Maria por 300 reais, ela pagou 100 e ficou devendo 200.

Proposta: duas unidades de R$ 150,00; total R$ 300,00; recebido R$ 100,00; restante da venda R$ 200,00. Nada é gravado antes de Confirmar. A soma de entrada e restante só resolve a ambiguidade do preço se corresponder exatamente ao total. Contradições provocam uma pergunta, sem ajustar ou arredondar valores silenciosamente.

- Sem informação de pagamento, pergunta se pagou tudo, uma parte ou ainda não pagou.
- Quantidade, produto, preço, data e valor recebido ausentes/inválidos geram perguntas no chat.
- Se o preço puder representar unidade ou total, pergunta qual interpretação é correta. Um total que não pode ser dividido em centavos exatos exige esclarecimento.
- “Nova venda”: identifica cliente, pergunta produtos, quantidades e preços, permite adicionar outro produto por conversa e pergunta pagamento.
- Múltiplos produtos escritos na mesma mensagem são mantidos no mesmo pedido atômico.
- “Maria pagou 50 reais” ou “Recebimento”: identifica cliente e propõe o recebimento. Excedente exige autorização explícita para crédito, além da confirmação final.
- “Alterar venda Maria”, “Alterar pagamento Maria”, “Excluir venda Maria” e “Excluir pagamento Maria”: apresentam lançamentos reais numerados, pedem escolha e depois correção ou confirmação. Nenhuma exclusão é inferida a partir de uma consulta.
- Alterações de produto/preço, cliente, data e observações são respondidas por mensagens. A edição de venda altera um lançamento por vez, conforme a estrutura atual; não inventa um agrupamento de pedidos editável que o banco não possui.
- Excluir/editar venda não apaga nem altera automaticamente os recebimentos agregados. O resumo explica isso.
- Menção a parcelas explica que somente venda, recebimento e saldo estão disponíveis; não cria parcelas nem vencimentos.

Os cálculos continuam em centavos. O servidor continua validando os valores, calculando totais e executando a transação. Venda e recebimento associado são salvos juntos. O resultado apresenta saldo/crédito atualizado informado pelo servidor.

### Consultas

- “Quanto a Maria deve?”
- “Quem está devendo?”
- “Mostra o extrato da Maria” ou “Histórico da Maria”.
- “Histórico”: pergunta período e apresenta vendas/recebimentos com datas e clientes.
- “Quanto recebi?”: totaliza recebimentos reais, podendo filtrar por cliente e período suportado.
- “Relatórios”: pergunta hoje, este mês ou todo o histórico; apresenta vendas, recebimentos, pendências atuais, cinco clientes que mais compraram e cinco produtos mais vendidos. As pendências são explicitamente identificadas como saldo atual de todo o histórico, não como dívida apenas do período selecionado.

Consultas usam um snapshot atualizado de `/api/operations`. Não há dados fictícios embutidos, resultados inventados ou chamadas de IA externa.

### Configurações

- “Configurações”: explica as opções por mensagem.
- “Tema escuro”/“Tema claro”: resumo e confirmação antes de mudar a preferência local. A identidade floral permanece; a preferência é aplicada às telas compatíveis.
- “Baixar backup”: usa a exportação autenticada existente, confere contagens e baixa JSON. É leitura, sem alteração financeira.
- “Restaurar backup”: pede o anexo JSON por um botão simples. O seletor de arquivo é necessário para anexar o arquivo, sem abrir formulário de gestão. Baixa/verifica backup atual e apresenta contagens e consequência da substituição antes de Confirmar. Continua usando validação, transação, fingerprint e idempotência da API existente. Usuários são preservados.
- “Sair” ou botão Sair: revoga a sessão no servidor.

## Confirmação e falhas

Antes de criar, alterar ou excluir registros, ou alterar preferências/restaurar, apresenta resumo com Confirmar, Corrigir e Cancelar. Perguntas, correções e cancelamentos não enviam mutações. O envio possui bloqueio síncrono contra cliques repetidos.

Confirmações financeiras mantêm UUID e payload por meio do `DataContext`, inclusive após recarga. Se a resposta se perder, Verificar resultado repete a mesma operação idempotente. Não permite cancelar uma confirmação já enviada como se ela não tivesse ocorrido.

Clientes usam a API existente, que não possui idempotência de criação. Para não introduzir duplicações, o mobile persiste somente a confirmação pendente, consulta o resultado por ID/campos e diferenças em relação aos IDs anteriores, e **não reenvia automaticamente** uma criação com resposta incerta. Se não puder comprovar o resultado, bloqueia novas operações e solicita nova consulta/verificação pelo responsável. Não promete idempotência de cadastro no servidor. Antes de editar, verifica se o cadastro mudou durante a conversa.

Restaurações reutilizam hash/ID confirmados. Após recarga, é necessário anexar o mesmo arquivo. Rejeições definitivas do servidor encerram a tentativa; falhas de resultado incerto preservam o identificador para verificação.

Cookies, sessões, CSRF, regras financeiras e APIs de venda/pagamento/backup permanecem os mesmos. A única extensão de backend desta tarefa é a opção de exclusão de cliente com preservação do histórico, sob o bloqueio financeiro já existente.

## Arquivos envolvidos

- `src/lib/mobile-conversation.ts`: estados, interpretação complementar, perguntas, validações e resumos; sem gravação direta.
- `src/components/mobile/MobileCaderninho.tsx`: renderização apenas da conversa, mensagens, anexos e execução das ações já confirmadas.
- `src/components/mobile/mobile-chat.css`: balões de resumo e respostas, identidade floral preservada.
- `api/clients.ts`: verificação opcional de histórico antes de excluir, dentro da transação/bloqueio existente.
- `tests/mobile-conversation.test.ts`: fluxos determinísticos e ausência de ações antes da confirmação.
- `tests/client-history.test.ts`: proteção de histórico e compatibilidade da API desktop em PostgreSQL isolado.
- `tests/official-browser.ts`: jornadas reais de mobile e regressão desktop.
- `package.json`: inclusão das novas suítes.
- Alterações locais anteriores de `App.tsx`, `IvoneLayout.tsx` e documentação permanecem no workspace.

## Testes e resultados

- `npm run lint`: TypeScript aprovado.
- `npm test`: **63 testes aprovados**, incluindo autenticação, CSRF, expiração/logout, interpretação, cálculo, atomicidade, idempotência, backup, perguntas, correção/cancelamento e proteção de histórico de clientes.
- `npm run build`: build de produção local aprovado.
- `npm run test:browser`: Edge/Chromium automatizado, aplicativo compilado e handlers reais contra PostgreSQL em memória, sem conexão Neon.
- Mobile: 414×896, 393×852, 320×568, 375×667, 430×932, 360×800 e 896×414. Login obrigatório, abertura direta mesmo com parâmetro antigo, ausência de menus/formulários de gestão, compositor/rolagem sem sobreposição ou overflow horizontal, confirmação/cancelamento e logout.
- Nos dois tamanhos prioritários: cadastro com opcionais, edição/exclusão/consulta de clientes, clique repetido, resposta de criação perdida sem duplicação, exemplo da venda de R$ 300 com entrada de R$ 100, múltiplos produtos por perguntas e em uma mensagem, recebimentos totais/parciais/posteriores, correções e exclusões financeiras, dívida/extrato/histórico/relatório, tema, backup/restauração cancelada e confirmada, resposta financeira perdida e recarga/reenvio idempotente.
- Desktop touchscreen 1440×1000: gestão continua aberta; vendas, pagamento parcial, cálculo exato, cancelamento, regressão de cliente/edição antigos, navegação de clientes/relatórios/histórico/configurações/backup e troca para janela compacta. Sem mudanças em seus formulários ou layout nesta etapa.
- Imagens e backups fictícios estão em `test-results/`, ignorado pelo Git. Foram inspecionadas imagens do resumo conversacional mobile.

As escritas, exclusões e restaurações ocorreram somente no PostgreSQL em memória de testes. Não foram lidas ou alteradas credenciais, dados reais ou infraestrutura.

## Limitações e pendências

- Linguagem natural determinística inicial, sem IA. Frases fora dos padrões seguros pedem esclarecimento; não se promete compreensão irrestrita de qualquer texto ou valores escritos por extenso.
- Períodos de relatórios: hoje, mês atual e histórico completo. Intervalos personalizados precisam de evolução; datas de lançamentos continuam sendo coletadas por conversa.
- Não há parcelamento formal, vencimentos ou edição atômica de um grupo antigo de itens; são limites da estrutura financeira existente.
- Cadastro com resultado incerto pode exigir verificação pelo responsável, pois a API existente não oferece chave idempotente de criação. O cliente mobile prefere bloquear a regravação a duplicar.
- Safari/iPhones físicos, teclado real, notch e Dynamic Island não foram testados; emulação Chromium não substitui aparelhos.
- Redis real continua ausente e a tabela financeira de idempotência ainda não está aplicada no ambiente externo. Não foram provisionados serviços nem executadas migrações. A publicação continua pendente, sem tentativas nesta tarefa.
- Nenhum commit/push/merge/deploy. `main`, produção e branch de backup não foram alteradas.
