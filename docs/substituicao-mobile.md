# Substituição da navegação mobile — 11/10/2026

Esta é a documentação da etapa intermediária. A evolução posterior substituiu os cartões com campos pela coleta por perguntas no chat; veja [mobile-conversacional.md](mobile-conversacional.md) para o funcionamento atual e os testes mais recentes.

Alterações locais na branch `dev`, sem commit, push, merge ou deploy. Nenhuma consulta ou alteração no Neon principal nesta tarefa. APIs, autenticação, cálculos e executor financeiro permanecem inalterados.

## Entrada única

Após validar a sessão e concluir o carregamento, `App.tsx` monta somente `MobileCaderninho` no celular. O parâmetro `?modo=gestao` não participa mais da escolha. Foram removidos o atalho Gestão completa e o retorno correspondente no layout tradicional. O layout antigo não fica oculto por trás do chat: não é montado no mobile.

Telefones identificados como iPhone/iPod/Android Mobile permanecem no chat na horizontal. Outros dispositivos usam a largura: até 767px recebem a experiência compacta; a partir de 768px recebem gestão desktop. Toque e ausência de hover deixaram de determinar a interface, portanto um computador touchscreen com janela desktop permanece na gestão. Uma janela de computador reduzida abaixo de 768px usa intencionalmente a experiência compacta. Identificação por user agent é heurística; modos de navegador que disfarçam o aparelho podem depender da largura.

## Funções dentro da conversa

Os botões Clientes, Relatórios e Configurações abrem cartões na área de mensagens, sem páginas independentes ou menu inferior antigo. Há retorno à conversa. Atalhos financeiros e envio de mensagens ficam bloqueados enquanto um cartão está aberto; ferramentas ficam indisponíveis enquanto uma confirmação financeira está em andamento.

- Clientes: cadastro e edição de nome, telefone, e-mail, CPF, endereço completo e observações. Revisão apresenta todos os campos preenchidos antes do botão Confirmar. Corrigir e Cancelar não salvam. Exclusão exige uma segunda etapa de confirmação e é bloqueada para clientes com vendas ou pagamentos. Bloqueio de clique concorrente impede múltiplos envios enquanto a solicitação está em andamento. Erros são exibidos no cartão.
- Relatórios: reutiliza `Reports` e seus rankings existentes, com os mesmos registros e cálculos em centavos da gestão desktop. Abrir a ferramenta atualiza os registros antes de apresentar o cartão.
- Configurações: preferência de tema com confirmação, download de backup consistente e restauração com confirmação explícita. O Caderninho mantém as cores florais; a preferência de tema é aplicada às telas compatíveis.
- Restauração: exige arquivo completo, baixa/verifica backup atual antes de oferecer confirmação, apresenta contagens, envia fingerprint para impedir substituição sobre dados que mudaram e preserva usuários. Reutiliza ID/hash persistidos por sessão do navegador após resultado incerto; não oferece cancelar uma confirmação já enviada. Após recarga, deve-se selecionar o mesmo arquivo pendente. O servidor continua validando o conteúdo, a sessão e o CSRF.
- Vendas, recebimentos, pendências e extratos mantêm os fluxos conversacionais, confirmação, centavos, atomicidade e idempotência já existentes.

Os formulários de clientes são cartões estruturados de apoio à conversa. Não foi acrescentada interpretação livre de mensagens para todos os campos cadastrais. Os nomes existentes são escolhidos explicitamente; não são criados clientes por inferência.

## Arquivos

- `src/App.tsx`: entrada mobile obrigatória e detecção sem usar capacidade de toque como critério desktop.
- `src/components/layout/IvoneLayout.tsx`: remoção do link obsoleto de retorno; gestão desktop preservada.
- `src/components/mobile/MobileCaderninho.tsx`: ferramentas integradas e remoção do atalho/desvio antigo.
- `src/components/mobile/CaderninhoTools.tsx`: cartões de clientes, relatórios e configurações.
- `src/components/mobile/mobile-chat.css`: estilos limitados aos cartões/chat.
- `tests/official-browser.ts`: novos fluxos e regressão de dispositivo/URL.

## Validação

TypeScript e build de produção local aprovados. Os 46 testes automatizados de autenticação, parser, operações financeiras, frontend e backup passaram.

Navegador Edge/Chromium automatizado, aplicativo compilado e handlers reais com PostgreSQL isolado em memória: 414×896, 393×852, 320×568, 375×667, 430×932, 360×800, 896×414 e desktop touchscreen 1440×1000. Verificações incluem login direto no chat mesmo com `?modo=gestao`, ausência de navegação antiga, ausência de overflow horizontal e sobreposição do compositor, confirmação/cancelamento financeiro, múltiplos itens, pagamentos parciais, recarga/reenvio sem duplicação e logout.

Nos dois tamanhos prioritários foram acrescentados testes de cadastro sem escrita antes de confirmar, cancelamento, clique repetido, edição, exclusão cancelada/confirmada, bloqueio de exclusão com histórico, abertura de relatórios, confirmação/cancelamento do tema, download e cancelamento/confirmação da restauração. Toda escrita e restauração desses testes é fictícia e ocorre exclusivamente no banco em memória.

Regressão desktop verifica formulários, cálculo exato, navegação, clientes, relatórios, histórico, configurações e backup. A capacidade de toque está habilitada nesse cenário e a gestão continua sendo apresentada.

## Pendências

Safari/iPhones físicos, notch, Dynamic Island e teclado real não foram verificados: emulação não substitui aparelhos. Redis real continua ausente, e a tabela de idempotência ainda exige ativação no ambiente externo; são pendências anteriores, sem intervenções nesta tarefa. Não foi publicada uma nova versão. Resultados de navegador e backups fictícios ficam em `test-results/`, ignorado pelo Git.
