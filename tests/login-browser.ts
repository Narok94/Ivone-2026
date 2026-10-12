// Login visual/input regression with real handlers and isolated PostgreSQL only.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import express from 'express';
import { createServer } from 'node:http';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
process.env.NODE_ENV = 'test';
for (const key of ['VERCEL', 'DATABASE_URL', 'IVONE_DATABASE_URL', 'ivone_DATABASE_URL', 'AUTH_APP_ORIGIN']) delete process.env[key];
registerHooks({ resolve(specifier, context, next) {
    if (specifier === './db.js' && context.parentURL?.includes('/api/')) return { url: new URL('./fixtures/financial-database.ts', import.meta.url).href, shortCircuit: true };
    return next(specifier, context);
} });
const { pool, pin } = await import('./fixtures/financial-database.js');
const handlers: Record<string, any> = {};
for (const name of ['login', 'logout', 'session', 'operations']) handlers[name] = (await import(`../api/${name}.ts`)).default;
const app = express(); app.use(express.json());
app.all('/api/:name', async (req, res) => { try { await handlers[req.params.name](req, res); } catch { res.status(500).json({ message: 'Fixture unavailable' }); } });
app.use(express.static(path.resolve('dist')));
const server = createServer(app); await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address(); if (!address || typeof address === 'string') throw new Error('Fixture unavailable');
const base = `http://127.0.0.1:${address.port}`; const output = 'test-results/login'; mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
    for (const [name, width, height] of [['iphone11', 414, 896], ['iphone-small', 320, 568], ['iphone-se', 375, 667], ['dynamic-island', 393, 852], ['android', 360, 800], ['android-large', 412, 915], ['desktop', 1440, 1000]] as const) {
        const context = await browser.newContext({ viewport: { width, height } });
        await context.addInitScript({ content: `let inset=0;const view=new EventTarget();Object.defineProperties(view,{height:{get:()=>innerHeight-inset},offsetTop:{get:()=>0}});Object.defineProperty(window,'visualViewport',{value:view,configurable:true});window.keyboardFixture=n=>{inset=n;view.dispatchEvent(new Event('resize'));};` });
        const page = await context.newPage(); const errors: string[] = []; page.on('pageerror', () => errors.push('pageerror'));
        await page.goto(base); await page.waitForLoadState('networkidle'); await page.getByRole('heading', { name: /Olá, Ivone/ }).waitFor(); await page.evaluate(() => document.fonts.ready);
        const fields = page.locator('.login-pin-cell input'); assert.equal(await fields.count(), 4);
        assert.equal(await page.locator('.login-floral img').count(), 0);
        const look = await page.evaluate(async () => {
            const image = getComputedStyle(document.querySelector('.login-floral')!, '::before').backgroundImage;
            const src = image.match(/url\("?([^"\)]+)"?\)/)![1]; const asset = new Image(); asset.src = src; await asset.decode();
            return { image, overflow: document.documentElement.scrollWidth > innerWidth, containers: ['.login-floral-content', '.login-greeting', '.login-form'].map(s => { const c = getComputedStyle(document.querySelector(s)!); return { background: c.backgroundColor, shadow: c.boxShadow, border: c.borderTopWidth }; }), button: document.querySelector('.login-access')!.getBoundingClientRect().bottom };
        });
        assert(look.image.includes('fundologin-')); assert.equal(look.overflow, false); assert(look.containers.every(c => c.background === 'rgba(0, 0, 0, 0)' && c.shadow === 'none' && c.border === '0px')); assert(look.button <= height);
        await page.screenshot({ path: `${output}/${name}.png` });
        const submit = page.getByRole('button', { name: /Acessar Caderninho/ }); assert(await submit.isDisabled());
        await fields.nth(0).fill('x'); assert.equal(await fields.nth(0).inputValue(), '');
        await fields.nth(0).pressSequentially(pin[0]); assert(await fields.nth(1).evaluate(e => e === document.activeElement));
        await fields.nth(1).press('ArrowLeft'); assert(await fields.nth(0).evaluate(e => e === document.activeElement));
        await fields.nth(0).press('End'); assert(await fields.nth(3).evaluate(e => e === document.activeElement));
        await fields.nth(3).press('Backspace'); assert(await fields.nth(2).evaluate(e => e === document.activeElement));
        await fields.nth(0).fill(pin.slice(0, 3)); assert(await submit.isDisabled());
        await fields.nth(0).evaluate((e, value) => { const data = new DataTransfer(); data.setData('text/plain', value); e.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })); }, pin);
        assert.deepEqual(await fields.evaluateAll(elements => elements.map(e => (e as HTMLInputElement).value)), pin.split('')); assert(await submit.isEnabled());
        await page.evaluate(() => (window as any).keyboardFixture(300)); await page.waitForFunction(() => document.querySelector('.login-floral')!.hasAttribute('data-keyboard'));
        const accessible = await page.evaluate(() => { const root = document.querySelector('.login-floral')!; const button = document.querySelector('.login-access')!.getBoundingClientRect(); const field = document.querySelector('.login-pin-fields')!.getBoundingClientRect(); return { bottom: button.bottom, fieldTop: field.top, visibleBottom: root.getBoundingClientRect().bottom, scrollable: root.scrollHeight > root.clientHeight }; });
        assert(accessible.fieldTop >= 0); assert(accessible.bottom <= accessible.visibleBottom || accessible.scrollable);
        await page.screenshot({ path: `${output}/${name}-keyboard.png` }); await page.evaluate(() => (window as any).keyboardFixture(0));
        if (name === 'iphone11') {
            const wrong = String((Number(pin) + 1) % 10000).padStart(4, '0'); await fields.nth(0).fill(wrong); await submit.click(); await page.getByRole('alert').waitFor(); assert.match(await page.getByRole('alert').innerText(), /incorreto/);
            await fields.nth(0).fill(pin); assert.equal(await page.getByRole('alert').count(), 0);
        }
        await fields.nth(0).fill(pin); await submit.click();
        if (name === 'desktop') await page.getByText('Nova Venda', { exact: true }).waitFor(); else await page.getByRole('heading', { name: 'Caderninho', exact: true }).waitFor();
        assert.equal((await context.request.get(base + '/api/session')).status(), 200); assert.deepEqual(errors, []);
        await context.close(); console.log('PASS login', name, `${width}x${height}`, 'floral/no panel/no logo, PIN, keyboard simulation, real isolated authentication');
    }
} finally { await browser.close(); await new Promise<void>(resolve => server.close(() => resolve())); await pool.end(); }
