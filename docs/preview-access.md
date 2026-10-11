# Investigação do acesso ao Caderninho

## Causa confirmada

Em 11/10/2026, o projeto Vercel `ivone-2026` estava corretamente conectado a `Narok94/Ivone-2026`, com produção vinculada à `main`. Tanto o deployment automático do Git quanto o deployment pela CLI da `dev` apontavam para `369cc13a7722696d55afbf296663248eefaa80b0` e estavam `READY`.

Os logs mostraram instalação, build Vite e compilação das funções concluídos. Os avisos sobre scripts de instalação não interromperam o build. A configuração de rotas encaminha `/demo` para a página do aplicativo. Não havia evidência de erro de build, branch incorreta ou ausência da rota.

A requisição anônima a `/demo` retornou HTTP 302 com destino ao domínio `vercel.com`. A proteção do projeto era `ssoProtection.deploymentType = all_except_custom_domains`. A autenticação Vercel acontece antes de servir a demonstração; portanto, a ausência de autenticação dentro do componente fictício não libera o preview. A documentação oficial explica o funcionamento em https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication.

## Correção segura

Foi criado o projeto separado **ivone-2026-demo**, com acesso público, nenhuma variável de ambiente e nenhum vínculo Git automático. Somente esse novo projeto teve sua proteção Vercel desativada. O projeto original mantém a mesma proteção, a mesma conexão Git e a produção na `main`.

O projeto público recebe exclusivamente o resultado de `npm run build:demo`, produzido a partir da `dev`. Não recebe o repositório completo, funções serverless ou o diretório `api/`. O entrypoint `src/demo/main.tsx` monta apenas `MobileChatDemo` com a opção `standalone`. Não importa `App`, `DataProvider` ou o cliente de APIs. O modo público não apresenta o link para a gestão real; `/?modo=gestao` continua exibindo apenas a demonstração.

O build `vite.demo.config.ts` recusa módulos de servidor, APIs, contexto de dados ou o aplicativo real. A cópia automática de arquivos da pasta `public/` foi desabilitada. O artefato contém HTML, JavaScript, CSS, o fundo floral fornecido e a configuração estática de rotas. `/demo` serve o HTML, e `/api` e seus subcaminhos retornam 404. Os personagens e saldos são fictícios e ficam apenas na memória da página.

## Publicação e manutenção

1. Permanecer na `dev`.
2. Executar `npm run lint`, `npm run build`, `npm test`, `npm run build:demo` e `npm run test:demo-artifact`.
3. Testar o build original e o isolado com `tests/mobile-browser.cjs` e Playwright disponível em `NODE_PATH`. Para o isolado, usar `DEMO_ONLY=1` e `DEMO_TEST_URL` apontando para o preview local ou público. No endereço Vercel, `CHECK_NO_API=1` também verifica HTTP 200 anônimo em `/demo` e HTTP 404 para GET/POST dos sete endpoints de API.
4. Fazer commit e push somente na `dev`.
5. Publicar **somente `dist-demo/`**, no projeto `ivone-2026-demo`, com `--target preview`. A vinculação local do artefato deve identificar esse projeto; a vinculação do repositório original não deve ser substituída. Exemplo: `vercel deploy --cwd dist-demo --project ivone-2026-demo --target preview --scope henriques-projects-46c626a8 --yes`.
6. Validar a URL gerada em navegador sem cookies ou login Vercel.

Não vincular o projeto público diretamente ao repositório completo: seu build normal contém a gestão e funções reais. A separação do artefato é parte da proteção. A publicação pública da demonstração não exige Neon, Redis, segredo de bypass ou migrações. A autenticação das APIs originais não foi alterada.

## Verificações e limites

TypeScript, build da gestão, build estático, 24 testes automatizados e a inspeção do artefato passaram. Os testes de navegador locais passaram em 414×896 e 393×852, além de 320×568, 375×667, 430×932, 360×800 e 896×414 CSS px. Foram exercitados confirmação, correção, cancelamento, recebimento parcial e total, extrato, pendências, recarga, campo de mensagem com viewport reduzido, ausência de chamadas às APIs e navegação da gestão desktop com respostas fictícias.

Os testes de navegador emulam as dimensões com Chromium/Edge. Não houve teste em iPhones físicos; notch, teclado e barras reais do Safari continuam exigindo validação nesses dispositivos. Nenhuma consulta ou alteração foi feita no Neon, nem teste com dados reais.

## Caso a proteção seja reativada

No painel Vercel, selecionar **ivone-2026-demo → Settings → Deployment Protection → Vercel Authentication** e desativar a opção somente nesse projeto estático. Conferir novamente HTTP 200 sem login em `/demo`. A proteção do projeto `ivone-2026`, suas APIs, a produção e a `main` devem ser preservadas.
