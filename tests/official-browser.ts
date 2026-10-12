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
async function say(page: Page, text: string) { await page.getByRole('textbox', { name: 'Mensagem', exact: true }).fill(text); await page.getByRole('button', { name: 'Enviar mensagem', exact: true }).click(); }
async function chooseJessica(page: Page) { await page.getByRole('heading', { name: 'Qual cliente?', exact: true }).waitFor(); await page.getByRole('button', { name: 'Jessica', exact: true }).click(); }
async function waitReady(page: Page) { await page.waitForFunction(() => document.querySelector('.chat-shortcuts button:not(:disabled)')); }
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
  await pool.reset(); const page = await context.newPage(); const errors: string[] = []; let writes = 0;
  page.on('pageerror', error => errors.push(error.message)); page.on('request', request => { if (request.url().endsWith('/api/operations') && request.method() === 'POST') writes++; });
  await page.route('https://fonts.googleapis.com/**', route => route.abort()); await page.route('https://fonts.gstatic.com/**', route => route.abort());
  await page.goto(base + '/demo'); assert.equal(await page.locator('.chat-demo').count(), 0);
  await login(page); await page.getByRole('heading', { name: 'Caderninho', exact: true }).waitFor(); await waitReady(page); await background(page); await layout(page);
  await page.screenshot({ path: `${output}/mobile-${width}x${height}.png` });
  await say(page, 'Jessica comprou um perfume de 150 e dois hidratantes de 40 cada'); await chooseJessica(page);
  await page.getByRole('button', { name: 'Pagou uma parte', exact: true }).waitFor(); assert.deepEqual(await counts(), { sales: 0, payments: 0, operations: 0 });
  if (full) {
    await page.getByRole('button', { name: 'Pagou uma parte', exact: true }).click(); await say(page, '50');
    await page.getByRole('button', { name: 'Confirmar', exact: true }).waitFor(); assert.deepEqual(await counts(), { sales: 0, payments: 0, operations: 0 });
    await layout(page); await page.screenshot({ path: `${output}/confirm-${width}x${height}.png` });
    await page.getByRole('button', { name: 'Confirmar', exact: true }).dblclick({ delay: 1 }); await waitReady(page);
    assert.deepEqual(await counts(), { sales: 2, payments: 1, operations: 1 });
    await say(page, 'Quanto a Jessica deve?'); await chooseJessica(page); await waitReady(page); assert.match(await page.locator('.chat-bubble p').last().innerText(), /180,00/);
    const before = writes;
    await say(page, 'Venda Maria lingerie 80'); await page.getByRole('button', { name: 'Ainda não pagou', exact: true }).click(); await page.getByRole('button', { name: 'Cancelar', exact: true }).click(); assert.equal(writes, before); assert.deepEqual(await counts(), { sales: 2, payments: 1, operations: 1 });
    await say(page, 'Venda Maria lingerie 80'); await page.getByRole('button', { name: 'Corrigir', exact: true }).click(); await page.getByLabel('Valor por unidade 1', { exact: true }).fill('85,56'); await page.getByRole('button', { name: 'Continuar', exact: true }).click(); await page.getByRole('button', { name: 'Pagou tudo', exact: true }).click(); await page.getByRole('button', { name: 'Confirmar', exact: true }).click(); await waitReady(page); assert.deepEqual(await counts(), { sales: 3, payments: 2, operations: 2 });
    await page.getByRole('button', { name: 'Extrato', exact: true }).click(); await chooseJessica(page); await waitReady(page); assert.match(await page.locator('.chat-bubble p').last().innerText(), /Extrato de Jessica/);
    await say(page, 'Quanto recebi?'); await waitReady(page); assert.match(await page.locator('.chat-bubble p').last().innerText(), /135,56/);
    await say(page, 'Quem está devendo?'); await waitReady(page); assert.match(await page.locator('.chat-bubble p').last().innerText(), /Jessica: R\$.*180,00/);
    await say(page, 'Jessica pagou 50 reais'); await chooseJessica(page); await page.getByRole('button', { name: 'Confirmar', exact: true }).click(); await waitReady(page); assert.deepEqual(await counts(), { sales: 3, payments: 3, operations: 3 });
    let drop = true;
    await page.route('**/api/operations', async route => { if (route.request().method() === 'POST' && drop) { drop = false; const response = await route.fetch(); assert.equal(response.status(), 200); await route.abort('failed'); } else await route.continue(); });
    await say(page, 'Venda Maria creme 12,34'); await page.getByRole('button', { name: 'Ainda não pagou', exact: true }).click(); await page.getByRole('button', { name: 'Confirmar', exact: true }).click(); await page.getByRole('button', { name: 'Tentar mesma confirmação', exact: true }).waitFor();
    assert.deepEqual(await counts(), { sales: 4, payments: 3, operations: 4 });
    await page.reload(); await page.getByRole('button', { name: 'Tentar mesma confirmação', exact: true }).waitFor(); await page.getByRole('button', { name: 'Tentar mesma confirmação', exact: true }).click(); await waitReady(page); assert.deepEqual(await counts(), { sales: 4, payments: 3, operations: 4 });
    assert.match(await page.locator('.chat-bubble p').last().innerText(), /não dupliquei/);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('ivone_pending_operation:99')), null);
  } else { await page.getByRole('button', { name: 'Ainda não pagou', exact: true }).click(); await layout(page); await page.getByRole('button', { name: 'Cancelar', exact: true }).click(); assert.equal(writes, 0); }
  await page.setViewportSize({ width, height: Math.min(height, 420) }); await page.getByRole('textbox', { name: 'Mensagem', exact: true }).focus(); await layout(page); await page.setViewportSize({ width, height });
  const cookie = (await context.cookies()).find(cookie => cookie.name === 'ivone_session')!; assert.equal(cookie.httpOnly, true); assert.equal(cookie.sameSite, 'Strict');
  await page.getByRole('button', { name: 'Sair', exact: true }).click(); await page.getByPlaceholder('PIN de 4 números').waitFor();
  assert.equal((await context.request.get(base + '/api/operations')).status(), 401);
  assert.equal((await context.request.get(base + '/api/operations', { headers: { Cookie: `${cookie.name}=${cookie.value}` } })).status(), 401);
  assert.deepEqual(errors, []); console.log(`PASS mobile ${width}x${height}: login, financial confirmation/cancel, layout, keyboard viewport, logout${full ? ', partial/full payment, multi-item order, queries, lost-response retry and reload' : ''}`); await context.close();
}
try {
  let index = 1;
  for (const [width, height] of process.env.DESKTOP_ONLY ? [] : [[414,896],[393,852],[320,568],[375,667],[430,932],[360,800],[896,414]]) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, timezoneId: 'America/Sao_Paulo', extraHTTPHeaders: { 'X-Forwarded-For': `192.0.2.${index++}` } });
    await mobile(context, width, height, width === 414 || width === 393);
  }
  await pool.reset(); const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/Sao_Paulo', extraHTTPHeaders: { 'X-Forwarded-For': '192.0.2.99' }, acceptDownloads: true }); const page = await context.newPage();
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
  await page.screenshot({ path: `${output}/desktop.png` }); await page.goto(base + '/?modo=gestao'); await page.setViewportSize({ width: 393, height: 852 }); await page.reload(); await page.getByText('Nova Venda', { exact: true }).waitFor(); assert.equal(await page.locator('.chat-demo').count(), 0); await page.getByRole('link', { name: /Voltar ao Caderninho/ }).click(); await page.getByRole('heading', { name: 'Caderninho', exact: true }).waitFor();
  assert.deepEqual(errors, []); console.log('PASS desktop: multi-item atomic sale, explicit cancel, partial receipt, exact cents, stale edit/client regression, clients/reports/history/settings/backup and shared mobile data'); await context.close();
} finally { await browser.close(); await new Promise<void>(resolve => server.close(() => resolve())); await pool.end(); }
