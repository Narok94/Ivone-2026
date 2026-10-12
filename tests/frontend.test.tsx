import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { DataProvider, useData } from '../src/contexto/DataContext';
import { apiFetch, setCsrfToken } from '../src/lib/api';

test('frontend validates sessions on mount/reload, sends CSRF and clears data on logout/401', async t => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:3000' });
  const originalFetch = globalThis.fetch;
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage, sessionStorage: dom.window.sessionStorage, Event: dom.window.Event, IS_REACT_ACT_ENVIRONMENT: true });
  let state: ReturnType<typeof useData>;
  function Probe() { state = useData(); return <div>{state.user ? 'authenticated' : 'login'}</div>; }
  let authorized = false;
  let logoutFailure = false;
  const csrf = randomBytes(32).toString('hex');
  const user = { id: randomBytes(16).toString('hex'), username: 'Test User' };
  const pin = String(randomBytes(4).readUInt32BE() % 10000).padStart(4, '0');
  const calls: { url: string; init: RequestInit }[] = [];
  globalThis.fetch = async (url, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    if (url === '/api/login') {
      assert.equal(JSON.parse(init.body as string).pin, pin);
      authorized = true;
      return Response.json({ success: true, user, csrfToken: csrf });
    }
    if (!authorized) return Response.json({ message: 'Sessão expirada.' }, { status: 401 });
    if (url === '/api/session') return Response.json({ user, csrfToken: csrf });
    if (url === '/api/operations') return Response.json({ clients: [], sales: [], payments: [] });
    if (url === '/api/logout') {
      assert.equal(new Headers(init.headers).get('x-csrf-token'), csrf);
      if (logoutFailure) return Response.json({ message: 'Serviço indisponível.' }, { status: 503 });
      authorized = false;
      return Response.json({ success: true });
    }
    if (['/api/clients', '/api/sales', '/api/payments'].includes(String(url))) return Response.json([]);
    throw new Error('Unexpected request: tests cannot access external services');
  };
  let root = createRoot(document.getElementById('root')!);
  async function mount() { await act(async () => { root.render(<React.StrictMode><DataProvider><Probe /></DataProvider></React.StrictMode>); }); }
  try {
    await t.test('forged localStorage cannot log in and session is checked on startup', async () => {
      localStorage.setItem('ivone_user', JSON.stringify(user));
      await mount();
      assert.equal(state!.user, null);
      assert.equal(localStorage.getItem('ivone_user'), null);
      assert.ok(calls.some(call => call.url === '/api/session'));
      assert.ok(!calls.some(call => call.url === '/api/clients'));
    });
    await t.test('PIN login loads data without storing identity or tokens in localStorage', async () => {
      await act(async () => { assert.equal((await state!.login(pin)).success, true); });
      assert.deepEqual(state!.user, user);
      assert.equal(state!.isLoading, false);
      assert.equal(localStorage.getItem('ivone_user'), null);
      assert.ok(calls.some(call => call.url === '/api/operations'));
      assert.ok(calls.every(call => call.init.credentials === 'same-origin'));
    });
    await t.test('reload rebuilds frontend state from server session', async () => {
      await act(async () => root.unmount());
      setCsrfToken(null);
      root = createRoot(document.getElementById('root')!);
      await mount();
      assert.deepEqual(state!.user, user);
    });
    await t.test('failed revocation is reported and does not pretend logout succeeded', async () => {
      logoutFailure = true;
      await act(async () => { await assert.rejects(state!.logout(), /Serviço indisponível/); });
      assert.deepEqual(state!.user, user);
      logoutFailure = false;
    });
    await t.test('a late pre-save snapshot cannot overwrite a confirmed financial operation', async () => {
      const previousFetch = globalThis.fetch;
      const clientId = randomUUID(); const operationId = randomUUID(); const id = randomUUID();
      const sale = { id, clientId, saleDate: '2026-10-11', productName: 'Produto fictício', productCode: '', quantity: 1, unitPrice: 145.56, total: 145.56, observation: '' };
      let resolveOld!: (value: Response) => void;
      globalThis.fetch = async (_url, init) => init?.method === 'POST' ? Response.json({ sales: [sale], payments: [], clientId, balanceCents: 14556, operationId, replayed: false }) : new Promise<Response>(resolve => { resolveOld = resolve; });
      try {
        await act(async () => {
          const pending = state!.refreshData();
          await state!.commitOperation({ operationId, confirmed: true, kind: 'sale', clientId, date: sale.saleDate, observation: '', receivedCents: 0, items: [{ productName: sale.productName, productCode: '', quantity: 1, unitCents: 14556 }] });
          resolveOld(Response.json({ clients: [], sales: [], payments: [] }));
          await assert.rejects(pending, /Registros alterados/);
        });
        assert.deepEqual(state!.sales, [sale]); assert.equal(sessionStorage.getItem(`ivone_pending_operation:${user.id}`), null);
      } finally { globalThis.fetch = previousFetch; }
    });
    await t.test('logout sends CSRF and clears identity and records', async () => {
      await act(async () => state!.logout());
      assert.equal(state!.user, null);
      assert.deepEqual(state!.clients, []);
      assert.deepEqual(state!.sales, []);
      assert.deepEqual(state!.payments, []);
    });
    await t.test('expired session clears UI and a denied operation cannot update local records', async () => {
      await act(async () => { await state!.login(pin); });
      authorized = false;
      await act(async () => { await assert.rejects(state!.deleteClient(user.id), /Sessão expirada/); });
      assert.equal(state!.user, null);
      assert.deepEqual(state!.clients, []);
    });
    await t.test('late responses from a terminated session are discarded', async () => {
      setCsrfToken(csrf);
      let resolve: (response: Response) => void;
      globalThis.fetch = () => new Promise<Response>(r => { resolve = r; });
      const pending = apiFetch('/api/clients');
      setCsrfToken(null);
      resolve!(Response.json([{ id: 'stale' }]));
      await assert.rejects(pending, /Sessão alterada/);
    });
  } finally {
    await act(async () => root.unmount());
    setCsrfToken(null);
    globalThis.fetch = originalFetch;
    dom.window.close();
  }
});
