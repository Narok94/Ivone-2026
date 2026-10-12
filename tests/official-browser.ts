// End-to-end tests of the real handlers and UI against isolated in-memory PostgreSQL.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import express from 'express';
import { chromium, BrowserContext, Page } from 'playwright';
process.env.NODE_ENV = 'test';
for (const key of ['VERCEL', 'AUTH_REDIS_REST_URL', 'AUTH_REDIS_REST_TOKEN', 'AUTH_APP_ORIGIN', 'DATABASE_URL', 'IVONE_DATABASE_URL', 'ivone_DATABASE_URL']) delete process.env[key];
registerHooks({ resolve(specifier, context, next) {
  if (specifier === './db.js' && context.parentURL?.includes('/api/')) return { url: new URL('./fixtures/financial-database.ts', import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
} });
const { pool, pin, clientIds } = await import('./fixtures/financial-database');
const handlers: Record<string, any> = {};
for (const name of ['login', 'logout', 'session', 'clients', 'sales', 'payments', 'operations', 'backup']) handlers[name] = (await import(`../api/${name}.ts`)).default;
const app = express(); app.use(express.json());
app.all('/api/:name', async (req, res) => { try { if (!handlers[req.params.name]) { res.status(404).json({ message: 'Not found' }); return; } await handlers[req.params.name](req, res); } catch { if (!res.headersSent) res.status(500).json({ message: 'Isolated test server error' }); } });
app.use(express.static(path.resolve('dist'))); app.get('/{*route}', (_req, res) => res.sendFile(path.resolve('dist/index.html')));
const server = createServer(app); await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address(); if (!address || typeof address === 'string') throw new Error('Test server address unavailable');
const base = `http://127.0.0.1:${address.port}`;
const output = 'test-results/official'; mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' });
const counts = async () => (await pool.query('SELECT (SELECT count(*)::int FROM vendas) AS sales,(SELECT count(*)::int FROM pagamentos) AS payments,(SELECT count(*)::int FROM operacoes_financeiras) AS operations')).rows[0] as any;
async function login(page: Page) {
  await page.getByPlaceholder('PIN de 4 números').fill(pin);
  await page.getByRole('button', { name: /Acessar Caderninho/ }).click();
}
async function say(page: Page, text: string) {
  await page.getByRole('textbox', { name: 'Mensagem', exact: true }).fill(text); await page.getByRole('button', { name: 'Enviar mensagem', exact: true }).click(); await waitReady(page);
  // Explicitly choose the sole suggestion in the test; production never chooses it.
  const candidates = page.locator('.chat-client-options button').filter({ hasText: /^\d+\. / });
  if (await candidates.count() === 1) { await candidates.click(); await waitReady(page); }
}
async function chooseJessica(page: Page) { await page.getByRole('button', { name: /^\d+\. Jessica$/, exact: true }).click(); await waitReady(page); }
async function waitReady(page: Page) { await page.waitForFunction(() => !document.querySelector('.chat-composer input')?.hasAttribute('disabled') && !document.querySelector('.chat-conversation-options button:disabled')); }
async function layout(page: Page) {
  const result = await page.evaluate(() => {
    const composer = document.querySelector('.chat-composer')!.getBoundingClientRect();
    const feed = document.querySelector('.chat-feed')!.getBoundingClientRect();
    const frame = document.querySelector('.chat-demo')!.getBoundingClientRect();
    return { overflow: document.documentElement.scrollWidth > innerWidth, bottom: composer.bottom, frameBottom: frame.bottom, feedBottom: feed.bottom, top: composer.top };
  });
  assert.equal(result.overflow, false); assert.ok(result.bottom <= result.frameBottom); assert.ok(result.feedBottom <= result.top);
}
async function background(page: Page) { await page.evaluate(async () => { const src = getComputedStyle(document.querySelector('.chat-phone')!).backgroundImage.match(/url\("?([^"\)]+)"?\)/)?.[1]; if (!src) throw new Error('Floral background missing'); const image = new Image(); image.src = src; await image.decode(); }); }
async function mobile(context: BrowserContext, width: number, height: number, full: boolean) {
  await pool.reset(); const page = await context.newPage(); const errors: string[] = []; let writes = 0; let clientWrites = 0;
  page.on('pageerror', e => errors.push(e.message)); page.on('request', r => { if (r.url().endsWith('/api/operations') && r.method() === 'POST') writes++; if (r.url().includes('/api/clients') && r.method() !== 'GET') clientWrites++; });
  await page.route('https://fonts.googleapis.com/**', r => r.abort()); await page.route('https://fonts.gstatic.com/**', r => r.abort());
  await page.goto(base + '/?modo=gestao'); assert.equal(await page.locator('.chat-demo').count(), 0); await login(page); await page.getByRole('heading', { name: 'Caderninho', exact: true }).waitFor(); await waitReady(page); await background(page); await layout(page);
  assert.equal(await page.locator('nav, .chat-tools, .chat-editor, .chat-shortcuts, .chat-feed input, .chat-feed select, .chat-feed textarea, .chat-feed fieldset').count(), 0); assert.equal(await page.locator('form').count(), 1); assert.equal(await page.getByRole('link', { name: 'Gestão completa' }).count(), 0);
  await page.screenshot({ path: `${output}/mobile-${width}x${height}.png` });
  if (full) {
    await say(page, 'Cadastrar cliente'); await say(page, 'Cliente Ficticia'); await say(page, 'Corrigir'); await say(page, 'e-mail'); await say(page, 'ficticia@example.test'); await say(page, 'Concluir cadastro'); await waitReady(page); assert.equal(clientWrites, 0);
    await say(page, 'Cancelar'); assert.equal(clientWrites, 0);
    await say(page, 'Cadastrar cliente Cliente Ficticia'); await say(page, 'Não informar'); await say(page, 'Concluir cadastro'); await page.getByRole('button', { name: 'Confirmar', exact: true }).dblclick(); await waitReady(page); assert.equal(clientWrites, 1); assert.match(await page.locator('.chat-bubble p').last().innerText(), /Cadastro de Cliente Ficticia salvo/);
    await say(page, 'Editar cliente Cliente Ficticia'); await say(page, 'telefone'); await say(page, '11999990000'); await say(page, 'Concluir cadastro'); await waitReady(page); assert.equal(clientWrites, 1); await say(page, 'Confirmar'); await waitReady(page); assert.equal(clientWrites, 2);
    await say(page, 'Consultar cliente Cliente Ficticia'); await waitReady(page); assert.match(await page.locator('.chat-bubble p').last().innerText(), /11999990000/);
    await say(page, 'Excluir cliente Cliente Ficticia'); await say(page, 'Cancelar'); assert.equal(clientWrites, 2); await say(page, 'Excluir cliente Cliente Ficticia'); await say(page, 'Confirmar'); await waitReady(page); assert.equal(clientWrites, 3);
    let dropClient = true; await page.route('**/api/clients', async route => { if (dropClient && route.request().method() === 'POST') { dropClient = false; const result = await route.fetch(); assert.equal(result.status(), 200); await route.abort('failed'); } else await route.continue(); });
    await say(page, 'Cadastrar cliente Resposta Ficticia'); await say(page, 'Não informar'); await say(page, 'Concluir cadastro'); await say(page, 'Confirmar'); await waitReady(page); assert.match(await page.locator('.chat-bubble p').last().innerText(), /sem repetir/); assert.equal(clientWrites, 4); assert.equal((await pool.query("SELECT count(*)::int AS n FROM clientes WHERE full_name='Resposta Ficticia'")).rows[0].n, 1); await page.unroute('**/api/clients'); await say(page, 'Excluir cliente Resposta Ficticia'); await say(page, 'Confirmar'); await waitReady(page);
    await say(page, 'Vendi dois perfumes pra Maria por 300 reais, ela pagou 100 e ficou devendo 200.'); await page.getByRole('button', { name: 'Confirmar', exact: true }).waitFor(); assert.deepEqual(await counts(), { sales: 0, payments: 0, operations: 0 }); assert.match(await page.locator('.chat-summary-text').last().innerText(), /200,00/); await layout(page); await page.screenshot({ path: `${output}/confirm-${width}x${height}.png` }); await page.getByRole('button', { name: 'Confirmar', exact: true }).dblclick(); await waitReady(page); assert.deepEqual(await counts(), { sales: 1, payments: 1, operations: 1 });
    const before = writes; await say(page, 'Venda Maria lingerie 80'); await say(page, 'Ainda não pagou'); await say(page, 'Cancelar'); assert.equal(writes, before);
    await say(page, 'Nova venda'); await say(page, 'Maria'); await say(page, 'creme'); await say(page, 'dois'); await say(page, '35'); await say(page, 'Adicionar produto'); await say(page, 'um perfume de 80'); await say(page, 'Não, continuar'); await say(page, 'Pagou tudo'); await waitReady(page); assert.match(await page.locator('.chat-summary-text').last().innerText(), /150,00/); await say(page, 'Cancelar'); assert.equal(writes, before);
    await say(page, 'Jessica comprou um perfume de 150 e dois hidratantes de 40 cada'); await chooseJessica(page); await say(page, 'Pagou uma parte'); await say(page, '50'); await say(page, 'Confirmar'); await waitReady(page); assert.deepEqual(await counts(), { sales: 3, payments: 2, operations: 2 });
    await say(page, 'Venda Maria lingerie 80'); await say(page, 'Ainda não pagou'); await say(page, 'Corrigir'); await say(page, 'valor'); await say(page, '85,56'); await say(page, 'Confirmar'); await waitReady(page); assert.deepEqual(await counts(), { sales: 4, payments: 2, operations: 3 });
    await say(page, 'Mostra o extrato da Maria'); await waitReady(page); assert.match(await page.locator('.chat-bubble p').last().innerText(), /Extrato de Maria/);
    await say(page, 'Relatórios'); await say(page, 'Todo o histórico'); await waitReady(page); assert.match(await page.locator('.chat-bubble p').last().innerText(), /615,56/);
    await say(page, 'Histórico'); await say(page, 'Todo o histórico'); await waitReady(page); assert.match(await page.locator('.chat-bubble p').last().innerText(), /Recebimento/);
    await say(page, 'Quanto recebi?'); await waitReady(page); assert.match(await page.locator('.chat-bubble p').last().innerText(), /150,00/); await say(page, 'Quem está devendo?'); await waitReady(page); assert.match(await page.locator('.chat-bubble p').last().innerText(), /Jessica:.*180,00/);
    await say(page, 'Jessica pagou 50 reais'); await chooseJessica(page); await say(page, 'Confirmar'); await waitReady(page); assert.deepEqual(await counts(), { sales: 4, payments: 3, operations: 4 });
    let drop = true; await page.route('**/api/operations', async route => { if (route.request().method() === 'POST' && drop) { drop = false; const r = await route.fetch(); assert.equal(r.status(), 200); await route.abort('failed'); } else await route.continue(); });
    await say(page, 'Venda Maria creme 12,34'); await say(page, 'Ainda não pagou'); await say(page, 'Confirmar'); await page.getByRole('button', { name: 'Verificar resultado', exact: true }).waitFor(); assert.deepEqual(await counts(), { sales: 5, payments: 3, operations: 5 });
    await say(page, 'Cancelar'); await page.getByRole('button', { name: 'Verificar resultado', exact: true }).waitFor(); await page.reload(); await page.getByRole('button', { name: 'Verificar resultado', exact: true }).click(); await waitReady(page); assert.deepEqual(await counts(), { sales: 5, payments: 3, operations: 5 }); assert.match(await page.locator('.chat-bubble p').last().innerText(), /não dupliquei/);
    await say(page, 'Alterar venda Maria'); await page.getByRole('button', { name: /creme ·/ }).click(); await say(page, 'valor'); await say(page, '13,34'); await say(page, 'Confirmar'); await waitReady(page); assert.equal((await counts()).operations, 6);
    await say(page, 'Excluir venda Maria'); await page.getByRole('button', { name: /creme ·/ }).click(); await say(page, 'Cancelar'); assert.equal((await counts()).operations, 6); await say(page, 'Excluir venda Maria'); await page.getByRole('button', { name: /creme ·/ }).click(); await say(page, 'Confirmar'); await waitReady(page); assert.deepEqual(await counts(), { sales: 4, payments: 3, operations: 7 });
    await say(page, 'Excluir cliente Maria'); await waitReady(page); assert.match(await page.locator('.chat-bubble p').last().innerText(), /preservar o histórico/);
    const beforeFull = await counts(); const mariaBeforeFull = (await pool.query('SELECT COALESCE((SELECT SUM(total) FROM vendas WHERE client_id=$1),0)-COALESCE((SELECT SUM(amount) FROM pagamentos WHERE client_id=$1),0) AS balance', [clientIds[1]])).rows[0].balance;
    await say(page, 'Venda Maria sabonete 25,55'); await say(page, 'Pagou tudo'); await say(page, 'Confirmar'); await waitReady(page); assert.deepEqual(await counts(), { sales: beforeFull.sales + 1, payments: beforeFull.payments + 1, operations: beforeFull.operations + 1 }); assert.equal((await pool.query('SELECT COALESCE((SELECT SUM(total) FROM vendas WHERE client_id=$1),0)-COALESCE((SELECT SUM(amount) FROM pagamentos WHERE client_id=$1),0) AS balance', [clientIds[1]])).rows[0].balance, mariaBeforeFull);
    const beforeEditPayment = await counts(); await say(page, 'Alterar pagamento Maria'); await page.getByRole('button', { name: /100,00/ }).click(); await say(page, 'valor'); await say(page, '90'); await say(page, 'Confirmar'); await waitReady(page); assert.deepEqual(await counts(), { ...beforeEditPayment, operations: beforeEditPayment.operations + 1 });
    const beforeDeletePayment = await counts(); await say(page, 'Excluir pagamento Maria'); await page.getByRole('button', { name: /90,00/ }).click(); await say(page, 'Cancelar'); assert.deepEqual(await counts(), beforeDeletePayment); await say(page, 'Excluir pagamento Maria'); await page.getByRole('button', { name: /90,00/ }).click(); await say(page, 'Confirmar'); await waitReady(page); assert.deepEqual(await counts(), { ...beforeDeletePayment, payments: beforeDeletePayment.payments - 1, operations: beforeDeletePayment.operations + 1 });
    await say(page, 'Configurações'); await waitReady(page); assert.match(await page.locator('.chat-bubble p').last().innerText(), /backup/); await say(page, 'Tema escuro'); await say(page, 'Cancelar'); assert.equal(await page.evaluate(() => localStorage.getItem('ivone_theme')), null); await say(page, 'Tema escuro'); await say(page, 'Confirmar'); await waitReady(page); assert.equal(await page.evaluate(() => localStorage.getItem('ivone_theme')), 'dark');
    const downloadEvent = page.waitForEvent('download'); await say(page, 'Baixar backup'); const download = await downloadEvent; const file = `${output}/mobile-backup-${width}.json`; await download.saveAs(file); await waitReady(page);
    const beforeRestore = await counts(); await say(page, 'Restaurar backup'); await page.getByLabel('Arquivo de backup').setInputFiles(file); await page.getByRole('button', { name: 'Confirmar', exact: true }).waitFor(); assert.deepEqual(await counts(), beforeRestore); await say(page, 'Cancelar'); assert.deepEqual(await counts(), beforeRestore);
    await say(page, 'Restaurar backup'); await page.getByLabel('Arquivo de backup').setInputFiles(file); await page.getByRole('button', { name: 'Confirmar', exact: true }).click(); await waitReady(page); assert.deepEqual(await counts(), { ...beforeRestore, operations: beforeRestore.operations + 1 });
    assert.equal(await page.locator('nav, .chat-tools, .chat-editor, .chat-shortcuts, .chat-feed input, .chat-feed select, .chat-feed textarea').count(), 0);
  } else { await say(page, 'Venda Maria perfume 80'); await say(page, 'Ainda não pagou'); await layout(page); await say(page, 'Cancelar'); assert.equal(writes, 0); }
  await page.setViewportSize({ width, height: Math.min(height, 420) }); await page.getByRole('textbox', { name: 'Mensagem', exact: true }).focus(); await layout(page); await page.setViewportSize({ width, height });
  const cookie = (await context.cookies()).find(c => c.name === 'ivone_session')!; assert.equal(cookie.httpOnly, true); assert.equal(cookie.sameSite, 'Strict'); await page.getByRole('button', { name: 'Sair', exact: true }).click(); await page.getByPlaceholder('PIN de 4 números').waitFor(); assert.equal((await context.request.get(base + '/api/operations')).status(), 401); assert.equal((await context.request.get(base + '/api/operations', { headers: { Cookie: `${cookie.name}=${cookie.value}` } })).status(), 401);
  assert.deepEqual(errors, []); console.log(`PASS conversational mobile ${width}x${height}${full ? ': client lifecycle, guided multi-item/partial sale, corrections/deletions, reports/history/settings/restore, lost responses and reload' : ': direct authenticated chat, confirmation/cancel, layout and logout'}`); await context.close();
}

try {
  let index = 1;
  for (const [width, height] of process.env.DESKTOP_ONLY ? [] : [[414,896],[393,852],[320,568],[375,667],[430,932],[360,800],[896,414]]) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1', timezoneId: 'America/Sao_Paulo', extraHTTPHeaders: { 'X-Forwarded-For': `192.0.2.${index++}` } });
    await mobile(context, width, height, width === 414 || width === 393);
  }
  await pool.reset(); const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, hasTouch: true, timezoneId: 'America/Sao_Paulo', extraHTTPHeaders: { 'X-Forwarded-For': '192.0.2.99' }, acceptDownloads: true }); const page = await context.newPage();
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await page.goto(base); await login(page); await page.getByText('Nova Venda', { exact: true }).waitFor(); assert.equal(await page.locator('.chat-demo').count(), 0);
  await page.getByText('Nova Venda', { exact: true }).click(); await page.locator('#client-select-button').click(); await page.getByRole('option', { name: 'Jessica', exact: true }).click();
  await page.getByLabel(/Qual o produto/).fill('Perfume'); await page.getByLabel('Preço por unidade 1', { exact: true }).fill('150.15'); await page.getByRole('button', { name: /Adicionar mais um produto/ }).click(); await page.getByLabel(/Qual o produto/).nth(1).fill('Hidratante'); await page.getByLabel(/Quantos/).nth(1).fill('2'); await page.getByLabel('Preço por unidade 2', { exact: true }).fill('40.20');
  page.once('dialog', dialog => dialog.dismiss()); await page.getByRole('button', { name: /Colocar no Caderninho/ }).click(); assert.deepEqual(await counts(), { sales: 0, payments: 0, operations: 0 });
  page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: /Colocar no Caderninho/ }).click(); await page.getByText('Nova Venda', { exact: true }).waitFor(); assert.deepEqual(await counts(), { sales: 2, payments: 0, operations: 1 });
  await page.waitForTimeout(1600); assert.match(await page.locator('body').innerText(), /230,55/);
  await page.getByText('Receber Pagamento', { exact: true }).click(); await page.getByLabel(/Para qual cliente/).selectOption(clientIds[0]); await page.getByLabel('Valor recebido', { exact: true }).fill('50.05'); page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: /Confirmar Recebimento/ }).click(); await page.getByText('Nova Venda', { exact: true }).waitFor(); await page.waitForTimeout(1600); assert.match(await page.locator('body').innerText(), /180,50/);
  await page.getByText('Encomendas', { exact: true }).first().click(); await page.getByRole('cell', { name: 'Jessica', exact: true }).click(); await page.getByRole('button', { name: 'Editar venda', exact: true }).first().click(); await page.getByRole('heading', { name: /Editar Venda/ }).waitFor(); await page.getByTitle('Voltar', { exact: true }).click(); await page.getByTitle('Voltar', { exact: true }).click(); await page.getByText('Nova Venda', { exact: true }).click(); await page.getByRole('heading', { name: /Nova Venda/ }).waitFor(); assert.equal(await page.getByLabel(/Qual o produto/).inputValue(), ''); assert.match(await page.locator('#client-select-button').innerText(), /Escolha a cliente/);
  for (const [action, heading] of [['Novo Cliente', /Cadastrar Novo Cliente/], ['Gerenciar Clientes', /Gerenciar Clientes/], ['Relatórios', /Relatórios/], ['Histórico Geral', /Seu Caderninho/]]) { await page.goto(base); await page.getByText(action, { exact: true }).click(); await page.getByRole('heading', { name: heading }).first().waitFor(); }
  await page.goto(base); await page.getByTitle('Configurações', { exact: true }).click(); const downloadEvent = page.waitForEvent('download'); await page.getByText('Realizar Backup', { exact: true }).click(); const download = await downloadEvent; await download.saveAs(`${output}/backup-fixture.json`);
  await page.screenshot({ path: `${output}/desktop.png` }); await page.goto(base + '/?modo=gestao'); await page.setViewportSize({ width: 393, height: 852 }); await page.reload(); await page.getByRole('heading', { name: 'Caderninho', exact: true }).waitFor(); assert.equal(await page.locator('nav').count(), 0); assert.equal(await page.getByRole('link', { name: 'Gestão completa' }).count(), 0);
  assert.deepEqual(errors, []); console.log('PASS desktop: multi-item atomic sale, explicit cancel, partial receipt, exact cents, stale edit/client regression, clients/reports/history/settings/backup and shared mobile data'); await context.close();
  await pool.reset();
  await pool.query("INSERT INTO clientes(full_name) SELECT 'Pessoa Teste '||lpad(i::text,5,'0') FROM generate_series(1,5000) i");
  await pool.query('VACUUM ANALYZE clientes');
  const largeContext = await browser.newContext({ viewport: { width: 393, height: 852 } }); const largePage = await largeContext.newPage();
  const loadedClients: number[] = [];
  largePage.on('response', async r => { if (r.url().includes('/api/operations') && r.request().method() === 'GET') { const body = await r.json(); loadedClients.push(body.clients.length); } });
  await largePage.goto(base); await login(largePage); await largePage.getByRole('heading', { name: 'Caderninho', exact: true }).waitFor(); await waitReady(largePage);
  await say(largePage, 'Consultar cliente Pessoa Teste'); assert.equal(await largePage.locator('.chat-client-options button').filter({ hasText: /^\d+\. / }).count(), 8); const firstChoice = await largePage.locator('.chat-client-options button').first().innerText(); await say(largePage, 'Mais resultados'); assert.notEqual(await largePage.locator('.chat-client-options button').first().innerText(), firstChoice); await say(largePage, 'Cancelar');
  await say(largePage, 'Vendi um Egeo Black para Bruna Costa'); await largePage.getByRole('button', { name: 'Sim, cadastrar', exact: true }).waitFor(); assert.equal(await largePage.locator('.chat-client-options button').filter({ hasText: /^\d+\. / }).count(), 0); await say(largePage, 'Cancelar operação'); assert.equal((await pool.query("SELECT count(*)::int AS n FROM clientes WHERE full_name='Bruna Costa'")).rows[0].n, 0);
  await say(largePage, 'Vendi um Egeo Black para Bruna Costa'); await say(largePage, 'Sim'); await say(largePage, 'Confirmar'); await waitReady(largePage); assert.match(await largePage.locator('.chat-bubble p').last().innerText(), /valor por unidade de Egeo Black/); assert.deepEqual(await counts(), { sales: 0, payments: 0, operations: 0 });
  await say(largePage, '150'); await say(largePage, 'Ainda não pagou'); assert.match(await largePage.locator('.chat-summary-text').last().innerText(), /Bruna Costa/); assert.match(await largePage.locator('.chat-summary-text').last().innerText(), /1 Egeo Black/); assert.deepEqual(await counts(), { sales: 0, payments: 0, operations: 0 }); await say(largePage, 'Confirmar'); assert.deepEqual(await counts(), { sales: 1, payments: 0, operations: 1 });
  const savedClient = (await pool.query("SELECT id FROM clientes WHERE full_name='Bruna Costa'")).rows[0].id; assert.equal((await pool.query('SELECT client_id FROM vendas')).rows[0].client_id, savedClient);
  assert(loadedClients.length > 0); assert(loadedClients.every(n => n <= 100)); assert.equal(loadedClients[0], 0);
  await say(largePage, 'Cadastrar cliente Bruna Costa'); assert.match(await largePage.locator('.chat-bubble p').last().innerText(), /Já existe/); await say(largePage, 'Cancelar');
  await largeContext.close(); console.log('PASS 5,000-client mobile browser: bounded initial catalogue, eight-option pagination, missing-client cancellation, confirmed signup, preserved sale continuation, separate sale confirmation and correct client ID');
} finally { await browser.close(); await new Promise<void>(resolve => server.close(() => resolve())); await pool.end(); }
