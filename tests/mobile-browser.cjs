// Run with Playwright available in NODE_PATH and a local Vite preview server.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.DEMO_TEST_URL || 'http://127.0.0.1:4173';
const output = process.env.VISUAL_OUTPUT || 'test-results';
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' });
  try {
    for (const [width, height] of [[414,896],[393,852],[320,568],[375,667],[430,932],[360,800],[896,414]]) {
      const page = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true });
      const api = []; const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => {
        if (route.request().url().includes('/api/')) { api.push(route.request().url()); return route.abort(); }
        if (!route.request().url().startsWith(base)) return route.abort();
        return route.continue();
      });
      await page.goto(base + '/demo');
      await page.getByRole('heading', { name: 'Caderninho', exact: true }).waitFor();
      const layout = async () => {
        const metrics = await page.evaluate(() => {
          const composer = document.querySelector('.chat-composer').getBoundingClientRect();
          const feed = document.querySelector('.chat-feed').getBoundingClientRect();
          const shell = document.querySelector('.chat-demo').getBoundingClientRect();
          return { overflow: document.documentElement.scrollWidth > innerWidth, composerBottom: composer.bottom, shellBottom: shell.bottom, feedBottom: feed.bottom, composerTop: composer.top };
        });
        assert.equal(metrics.overflow, false);
        assert.ok(metrics.composerBottom <= metrics.shellBottom);
        assert.ok(metrics.feedBottom <= metrics.composerTop);
      };
      await layout();
      await page.screenshot({ path: `${output}/mobile-${width}x${height}.png` });
      await page.getByRole('button', { name: 'Nova Venda', exact: true }).click();
      await page.getByRole('button', { name: 'Enviar mensagem' }).click();
      await page.getByRole('button', { name: 'Corrigir', exact: true }).click();
      await page.getByRole('textbox', { name: 'Mensagem' }).fill('Venda Ana perfume 85,90');
      await page.getByRole('button', { name: 'Enviar mensagem' }).click();
      await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
      assert.ok(await page.getByText(/Venda confirmada na demonstração/).count());
      await page.getByRole('button', { name: 'Recebimento', exact: true }).click();
      await page.getByRole('button', { name: 'Enviar mensagem' }).click();
      await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await page.getByRole('button', { name: 'Extrato', exact: true }).click();
      assert.ok(await page.getByText(/Saldo pendente: R\$/).count());
      await page.getByRole('button', { name: 'Pendências', exact: true }).click();
      assert.ok(await page.getByText(/Pendências fictícias/).count());
      await page.getByRole('textbox', { name: 'Mensagem' }).fill('Recebimento Ana pagamento 40');
      await page.getByRole('button', { name: 'Enviar mensagem' }).click();
      await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
      assert.ok(await page.getByText(/Saldo de Ana: R\$.*125,90/).count());
      await page.getByRole('textbox', { name: 'Mensagem' }).fill('Recebimento Ana pagamento 125,90');
      await page.getByRole('button', { name: 'Enviar mensagem' }).click();
      await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
      assert.ok(await page.getByText(/Saldo de Ana: R\$.*0,00/).count());
      await page.getByRole('textbox', { name: 'Mensagem' }).fill('Recebimento Ana pagamento 10');
      await page.getByRole('button', { name: 'Enviar mensagem' }).click();
      assert.equal(await page.getByRole('button', { name: 'Confirmar', exact: true }).count(), 0);
      // Reduced visual viewport models space available while a keyboard is open.
      await page.setViewportSize({ width, height: Math.min(height, 420) });
      await page.getByRole('textbox', { name: 'Mensagem' }).focus();
      await layout();
      await page.reload();
      assert.equal(await page.getByText(/Venda confirmada na demonstração/).count(), 0);
      assert.deepEqual(api, []); assert.deepEqual(errors, []);
      console.log(`PASS mobile ${width}x${height}: interaction, reset, layout, reduced viewport, zero API calls`);
      await page.close();
    }
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.route('**/api/**', route => {
      const url = route.request().url();
      return route.fulfill({ json: url.endsWith('/session') ? { user: { id: 'demo-user', username: 'Teste' }, csrfToken: 'a'.repeat(64) } : [] });
    });
    await page.goto(base);
    await page.getByText('Nova Venda', { exact: true }).waitFor();
    assert.equal(await page.locator('.chat-demo').count(), 0);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${output}/desktop.png` });
    await page.goto(base + '/?modo=gestao');
    await page.getByText('Nova Venda', { exact: true }).waitFor();
    assert.equal(await page.locator('.chat-demo').count(), 0);
    await page.getByText('Nova Venda', { exact: true }).click();
    await page.getByText('Qual o produto? * 💄', { exact: true }).first().waitFor();
    for (const [action, heading] of [['Receber Pagamento', /Pagamento/], ['Novo Cliente', /Cliente/], ['Gerenciar Clientes', /Gerenciar Clientes/], ['Relatórios', /Relatórios/], ['Histórico Geral', /Seu Caderninho/]]) {
      await page.goto(base + '/?modo=gestao');
      await page.getByText(action, { exact: true }).click();
      await page.getByRole('heading', { name: heading }).first().waitFor();
      assert.equal(await page.locator('.chat-demo').count(), 0);
    }
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto(base + '/?modo=gestao');
    await page.getByText('Nova Venda', { exact: true }).waitFor();
    assert.equal(await page.locator('.chat-demo').count(), 0);
    console.log('PASS original desktop dashboard, sale/payment/client forms, clients, reports, history and explicit mobile management with mocked APIs');
    await page.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
