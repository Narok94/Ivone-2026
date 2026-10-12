# Demonstração HTTPS temporária

O launcher `scripts/demo-https.ts` abre um Quick Tunnel Cloudflare para a porta **3001**, ligada exclusivamente ao banco fictício em memória do Caderninho. A entrada `dev:caderninho` normal da porta 3000 não é encaminhada. O frontend é o build atual do mesmo aplicativo; o túnel não expõe Vite, arquivos de código, `.env` ou diretórios do projeto.

## Proteção e isolamento

- Chave aleatória de 256 bits no link de entrada, convertida em cookie `__Host-ivone_demo` com `Secure`, `HttpOnly` e `SameSite=Strict`. A URL é redirecionada para a raiz sem chave; `Referrer-Policy: no-referrer` evita transmiti-la a recursos externos.
- Acesso sem a chave, origem/host incorretos e link expirado são recusados antes dos handlers. Duração de duas horas; túnel e servidor são encerrados automaticamente. Também encerram juntos quando o túnel termina.
- Servidor ligado somente a loopback. A chave não vai para Git; endereço e processos temporários ficam em `test-results/demo-access.json`, ignorado.
- Launcher local apaga variáveis de banco/Redis do processo, não carrega dotenv e intercepta o módulo de banco antes de importar handlers. Imports de Neon, pg e api/db são bloqueados. PostgreSQL é PGlite exclusivamente em memória; migração cria apenas sua tabela fictícia.
- Sessão fictícia automática, sem Redis ou login. Validações normais de sessão/CSRF, confirmações e transações continuam exigidas nos handlers de clientes/operações. Cookies da sessão também recebem Secure.
- Allowlist de rotas: arquivos compilados necessários, sessão, operações financeiras, criação/edição de clientes e logout. APIs de backup/restauração, login por PIN, vendas/pagamentos legados, exclusão de clientes e arquivos de desenvolvimento são recusados. Comandos de backup/restauração no chat não executam ações: recebem indisponibilidade da demonstração.
- CSP restringe conexões do navegador à própria origem. Google Fonts recebe somente pedidos de fontes/estilos, sem chave ou dados de negócio.
- Nenhum deploy Vercel, push, merge ou alteração em main, backup, dados Neon, Redis ou configuração de produção.

## Validação mínima

Teste do gateway confirmou acesso privado e bloqueio de backup, restauração, login, APIs antigas e arquivos fonte antes de abrir o túnel. No endereço HTTPS: emulação iPhone 393×852, abertura direta do chat, contexto seguro, ausência de gestão/formulários antigos, venda fictícia de R$ 300 com recebimento de R$ 100, confirmação e consulta do saldo de R$ 200. Cookies seguros e chamadas somente à origem da demonstração verificados. Screenshot em `test-results/demo/mobile.png`. Não foi repetida a suíte completa.

O cloudflared foi baixado do release oficial Cloudflare `2026.10.0`, com SHA-256 verificado, sem instalação como serviço. Build refeito somente para servir a versão conversacional atual compilada; TypeScript verificado. Nenhuma verificação de publicação que grava em Redis foi executada.

## Limitações

Link privado: quem o possuir poderá entrar e alterar somente os dados fictícios compartilhados da demonstração. Não compartilhe publicamente. O computador e os processos precisam continuar ligados; suspensão/desconexão pode interromper o endereço antes do prazo. O término descarta todos os registros fictícios. O teste automatizado é em Chromium com emulação; Safari/teclado de iPhone físico dependem do teste do usuário. Quick Tunnels são temporários e não oferecem garantia de disponibilidade.

Para repetir, prepare o build com `npm run build`, baixe/verifique o transporte com `node scripts/download-demo-tunnel.mjs` e execute `node --import tsx scripts/demo-https.ts`. O arquivo ignorado registra o novo endereço; nunca reutilize um link de processo encerrado. A geração do túnel requer autorização de rede.

Referência: [Quick Tunnels — Cloudflare](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).
