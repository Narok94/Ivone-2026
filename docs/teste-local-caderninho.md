# Caderninho local com dados fictícios

Na branch `dev`, com Node 24 e dependências instaladas, execute:

```sh
npm run dev:caderninho
```

Abra http://localhost:3000. Em janela até 767px ou navegador identificado como telefone, abre diretamente a conversa, sem login. Em janela desktop, abre a gestão tradicional com os mesmos dados fictícios. Para simular o celular no computador, use a emulação de dispositivo do navegador (393×852, por exemplo). Nenhum parâmetro da URL oferece a gestão antiga no celular.

O servidor de teste aceita somente conexões locais. O roteiro completo usa `localhost`, que permite as APIs de criptografia usadas por confirmações e anexos. Acesso por telefone físico exige uma origem segura/HTTPS ou encaminhamento para localhost; HTTP por IP na rede não foi habilitado nesta etapa.

## Roteiro curto

- Já existem as clientes fictícias Maria e Jessica, sem vendas ou pagamentos.
- Diga `Cadastrar cliente Ana`; responda telefone ou `Não informar`, depois `Concluir cadastro`. Revise e confirme.
- Diga `Editar cliente Ana`, escolha `telefone`, informe o valor e conclua o cadastro para revisar.
- Diga `Nova venda`: responda cliente, produto, quantidade, preço e pagamento. Pode adicionar produtos, corrigir o resumo ou cancelar antes de confirmar.
- Exemplo direto: `Vendi dois perfumes pra Maria por 300 reais, ela pagou 100 e ficou devendo 200.` Confira o resumo e confirme.
- Diga `Maria pagou 50 reais`, `Quanto a Maria deve?`, `Mostra o extrato da Maria`, `Relatórios` ou `Histórico`.
- Diga `Alterar venda Maria` ou `Alterar pagamento Maria`, escolha o lançamento e o campo a corrigir. Confirme o novo resumo.
- Diga `Configurações`, `Tema escuro` ou `Baixar backup`. Restauração também permanece disponível por anexo e confirmação, sempre no banco fictício neste modo.

## Isolamento e comportamento

É o mesmo frontend, DataContext, interpretador e handlers protegidos da aplicação. O launcher substitui `api/db` por PostgreSQL em memória antes de carregar os handlers e bloqueia imports do banco real/Neon. Não carrega `.env` e remove variáveis de banco/Redis do processo. Produção e Vercel recusam esse launcher. A entrada normal `npm run dev` continua com autenticação e configuração reais; **use `dev:caderninho` para testes fictícios**.

Somente o endpoint de sessão do servidor fictício cria automaticamente uma sessão de teste. APIs de clientes/vendas/pagamentos/backup mantêm validações, confirmação, sessão, CSRF, transações e idempotência. O bootstrap rejeita requisições identificadas como cross-site. Não existe bypass no frontend nem mudança nas APIs publicadas na Vercel.

O chat identifica os dados como fictícios. Reiniciar o servidor recria o banco vazio de lançamentos e as duas clientes de exemplo; atualizar o navegador mantém os registros enquanto o processo estiver ativo. A identidade fictícia muda a cada execução para não reaproveitar confirmações pendentes de um banco já descartado. Tema permanece como preferência do navegador. `Sair` revoga a sessão; recarregar a página entra novamente no ambiente fictício.

## Validação desta etapa

Verificada uma jornada integrada do launcher real com Vite e Edge em 393×852: entrada sem login, dados fictícios, perguntas de venda, cadastro/edição, pagamentos parcial e total, correção/cancelamento sem gravação antecipada, saldo/extrato/relatório, tema, exportação e recarga; depois gestão desktop 1440×1000. Também verificado bloqueio de acesso sem sessão, mutação sem CSRF e tentativa de carregar o banco real, com credenciais falsas propositalmente presentes no ambiente. Nenhuma conexão real foi feita.

Corrigida a coleta de produtos cujo texto é reconhecido pelo parser como consulta: ela agora preserva um item válido e continua perguntando quantidade/preço, em vez de inserir `undefined` no rascunho. A suíte inteira já aprovada não foi repetida; somente regressão nova e validação essencial do modo local.

## Limites

O modo local está funcional sem Redis e sem migração no Neon. O interpretador continua determinístico; frases fora dos padrões pedem esclarecimento. Não há parcelamento formal ou períodos personalizados de relatório. Teclado/Safari de aparelho físico ainda precisam de teste. Publicação e login de produção permanecem fora desta etapa.
