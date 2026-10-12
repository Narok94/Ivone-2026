# Caderninho — demonstração mobile floral

> Histórico do protótipo aprovado. A versão integrada utiliza autenticação e dados oficiais; a demonstração independente foi retirada do código. Consulte `caderninho-integrado.md`.

## Escopo e acesso

- Na `dev`, a primeira abertura em telas abaixo de 768 CSS px apresenta a demonstração.
- `/demo` abre a demonstração em qualquer dispositivo; no computador, exibe um quadro de celular.
- `/?modo=gestao` abre o aplicativo original com autenticação, inclusive no celular. O link **Gestão atual** está sempre disponível no cabeçalho da demonstração.
- A seleção do modo ocorre na abertura da página. Redimensionar a janela não troca de aplicativo durante uma operação.
- O fundo é `src/assets/fundo.png`, fornecido para este trabalho. A composição usa rosa, nude e creme, balões, atalhos e cartões de revisão.

## Isolamento

A demonstração não monta o `DataProvider`, não importa manipuladores do servidor e não chama APIs. Ana e Bia são personagens fictícias. Os lançamentos vivem somente no estado React, sem cookies, armazenamento local ou persistência. Recarregar reinicia os exemplos. O acesso público à demonstração não autoriza acesso à gestão ou às APIs.

As alterações anteriores de autenticação e a análise completa, já presentes localmente na `dev`, acompanham esta publicação. O redesign não modifica seus manipuladores, o banco Neon ou os componentes da gestão desktop.

## Interações

- **Nova Venda** e **Recebimento** preenchem exemplos editáveis; o usuário envia a mensagem antes de revisar.
- Exemplos: `Venda Ana perfume 85,90`, `Recebimento Ana pagamento 40`, `Extrato Ana`, `Pendências`.
- O parser é deliberadamente limitado a essas estruturas e às duas clientes fictícias. Não há IA ou interpretação livre de linguagem natural nesta etapa.
- Vendas e recebimentos exigem confirmação. **Corrigir** devolve o texto ao campo; **Cancelar** descarta o resumo. Um resumo pendente bloqueia outros lançamentos.
- Os cálculos usam centavos inteiros. Recebimentos parciais e totais são aceitos; valores acima do saldo são recusados nesta demonstração.
- Extratos e pendências refletem apenas os lançamentos confirmados em memória.

## Responsividade

O quadro usa uma coluna flexível com rolagem apenas na conversa, cabeçalho e rodapé fora dela, `min-height: 0`, proteção de quebra de texto e espaçamento por `env(safe-area-inset-*)`. O campo tem fonte de 16 px para evitar zoom automático no iOS. `visualViewport.height` e `offsetTop` acompanham o espaço disponível ao abrir o teclado; os eventos são removidos ao desmontar. Há adaptação para alturas pequenas e celulares estreitos.

## Validação

- `npm run lint`: TypeScript.
- `npm run build`: build Vite.
- `npm test`: testes de autenticação, CSRF, sessão, logout, frontend, parser, centavos e seleção de modo; banco e serviços externos substituídos por fixtures.
- `tests/mobile-browser.cjs`: Playwright com navegador Edge, contra o build servido localmente; Playwright pode ser fornecido por `NODE_PATH`. Exemplo: iniciar `npm run preview -- --host 127.0.0.1 --port 4173` e executar `node tests/mobile-browser.cjs` em outro terminal com Playwright disponível.
- Tamanhos: 414×896, 393×852, 320×568, 375×667, 430×932, 360×800 e 896×414 CSS px.
- Verificações: venda, correção, cancelamento, recebimento parcial/total, recusa acima do saldo, extrato, pendências, reinicialização por recarga, ausência de erros JavaScript, ausência de chamadas às APIs, largura sem transbordamento e campo sem sobreposição da conversa.
- Redução do viewport para simular o espaço disponível com teclado. Navegação da gestão desktop com APIs fictícias e acesso explícito à gestão mobile.
- As imagens locais de verificação ficam em `test-results/`, ignorado pelo Git; `.vercel/` também é ignorado.

## Limites e pendências

Resultado local: TypeScript e build aprovados; 23 testes automatizados aprovados; os sete cenários de tela e a navegação desktop passaram no navegador automatizado. O projeto Vercel existente usa `main` como branch de produção e protege os previews com login Vercel (`all_except_custom_domains`). A publicação desta tarefa usa explicitamente o ambiente `preview`. O acesso anônimo depende de uma decisão posterior sobre essa proteção, que não foi alterada.

Emulação Chromium/Edge não substitui testes em Safari em iPhones físicos. Safe areas reais, teclado iOS, rotação com teclado e barras do navegador precisam de avaliação nesses dispositivos. Não foram testadas operações contra Neon nem autenticação real do preview. A gestão em produção/preview depende da configuração já documentada em `docs/authentication.md`; a demonstração não depende de Neon, Redis ou segredos novos. Nenhuma dessas configurações deve ser criada ou alterada para avaliar o protótipo.
