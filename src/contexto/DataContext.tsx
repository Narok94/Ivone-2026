import { ApiError, apiFetch, setCsrfToken } from '../lib/api';
import { pendingKey, readPending } from '../lib/pending-operation';
import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Client, Sale, Payment } from '../types';
import { cents, clientBalance, FinancialOperation, FinancialResult } from '../lib/finance';
export type DataSnapshot = { clients: Client[]; sales: Sale[]; payments: Payment[] };
interface DataContextType extends DataSnapshot {
  addClient: (client: Omit<Client, 'id'>) => Promise<void>;
  updateClient: (client: Client) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  getClientById: (id: string) => Client | undefined;
  addSale: (sale: Omit<Sale, 'id' | 'total'>, operationId?: string) => Promise<Sale>;
  updateSale: (sale: Sale, operationId?: string) => Promise<Sale>;
  deleteSale: (id: string) => Promise<void>;
  addPayment: (payment: Omit<Payment, 'id'>, operationId?: string, allowCredit?: boolean) => Promise<void>;
  updatePayment: (payment: Payment, operationId?: string, allowCredit?: boolean) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
  commitOperation: (operation: FinancialOperation) => Promise<FinancialResult>;
  clientBalances: Map<string, number>;
  isLoading: boolean; isRefreshing: boolean; dataError: string | null;
  refreshData: () => Promise<DataSnapshot>;
  rememberClients: (clients: Client[]) => void;
  user: { id: string | number; username: string } | null;
  login: (pin: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}
const DataContext = createContext<DataContextType | undefined>(undefined);
export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [user, setUser] = useState<DataContextType['user']>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const ready = useRef(false);
  const revision = useRef(0);
  const cachedClients = useRef<Client[]>([]);
  const rememberClients = useCallback((people: Client[]) => { cachedClients.current = [...people, ...cachedClients.current.filter(c => !people.some(p => p.id === c.id))].slice(0, 100); setClients(cachedClients.current); }, []);
  const refreshData = useCallback(async () => {
    if (!user) return { clients: [], sales: [], payments: [] };
    if (!ready.current) setIsLoading(true);
    const requestedRevision = revision.current;
    setIsRefreshing(true);
    try {
      const mobile = /iPhone|iPod|Android.*Mobile/i.test(navigator.userAgent) || (window.matchMedia?.('(max-width: 767px)').matches ?? false);
      const endpoint = mobile ? `/api/operations?mode=chat&ids=${cachedClients.current.map(c => c.id).join(',')}` : '/api/operations';
      const { clients, sales, payments } = await (await apiFetch(endpoint)).json();
      if (requestedRevision !== revision.current) throw new ApiError('Registros alterados. Consulte novamente.', 409);
      const snapshot = { clients, sales, payments };
      cachedClients.current = clients.slice(0, 100); setClients(clients); setSales(sales); setPayments(payments); setDataError(null);
      return snapshot;
    } catch (error) { if (requestedRevision === revision.current) setDataError('Não consegui atualizar os registros. Tente novamente antes de consultar ou anotar.'); throw error; }
    finally { ready.current = true; setIsLoading(false); setIsRefreshing(false); }
  }, [user]);
  useEffect(() => {
    let active = true;
    const clear = () => { ready.current = false; cachedClients.current = []; setUser(null); setClients([]); setSales([]); setPayments([]); setDataError(null); setIsLoading(false); };
    window.addEventListener('ivone:unauthorized', clear);
    localStorage.removeItem('ivone_user');
    apiFetch('/api/session').then(r => r.json()).then(session => { if (active) { setCsrfToken(session.csrfToken); setUser(session.user); } }).catch(() => { if (active) clear(); }).finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; window.removeEventListener('ivone:unauthorized', clear); };
  }, []);
  useEffect(() => { if (user) void refreshData().catch(() => {}); else { setClients([]); setSales([]); setPayments([]); } }, [user, refreshData]);
  const login = async (pin: string) => {
    try {
      const data = await (await apiFetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'Ivone', pin }) })).json();
      if (!data.success) return { success: false, message: data.message || 'Não foi possível entrar.' };
      ready.current = false; setCsrfToken(data.csrfToken); setUser(data.user); return { success: true };
    } catch (error: any) { return { success: false, message: error.message || 'Erro de conexão.' }; }
  };
  const logout = async () => { await apiFetch('/api/logout', { method: 'POST' }); setCsrfToken(null); ready.current = false; cachedClients.current = []; setUser(null); setClients([]); setSales([]); setPayments([]); setDataError(null); };
  const addClient = useCallback(async (client: Omit<Client, 'id'>) => { revision.current++; const saved = await (await apiFetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(client) })).json(); revision.current++; setClients(old => [...old, saved]); }, []);
  const updateClient = useCallback(async (client: Client) => { revision.current++; const saved = await (await apiFetch(`/api/clients?id=${client.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(client) })).json(); revision.current++; setClients(old => old.map(c => c.id === saved.id ? saved : c)); }, []);
  const deleteClient = useCallback(async (id: string) => { revision.current++; await apiFetch(`/api/clients?id=${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmed: true }) }); revision.current++; setClients(old => old.filter(c => c.id !== id)); setSales(old => old.filter(s => s.clientId !== id)); setPayments(old => old.filter(p => p.clientId !== id)); }, []);
  const getClientById = useCallback((id: string) => clients.find(c => c.id === id), [clients]);
  const commitOperation = useCallback(async (operation: FinancialOperation): Promise<FinancialResult> => {
    if (!user) throw new Error('Entre novamente antes de confirmar.');
    const key = pendingKey(String(user.id));
    const existing = readPending(String(user.id));
    if (existing && existing.operationId !== operation.operationId) throw new Error('Conclua a confirmação anterior antes de iniciar outra operação.');
    sessionStorage.setItem(key, JSON.stringify(operation));
    revision.current++;
    try {
      const result = await (await apiFetch('/api/operations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(operation) })).json();
      revision.current++;
      setSales(result.sales); setPayments(result.payments); setDataError(null); sessionStorage.removeItem(key); return result;
    } catch (error) { if (error instanceof ApiError && [400, 404, 422].includes(error.status)) sessionStorage.removeItem(key); throw error; }
  }, [user]);
  const addSale = useCallback(async (sale: Omit<Sale, 'id' | 'total'>, operationId = crypto.randomUUID()) => {
    const result = await commitOperation({ operationId, confirmed: true, kind: 'sale', clientId: sale.clientId, date: sale.saleDate, observation: sale.observation, receivedCents: 0, items: [{ productName: sale.productName, productCode: sale.productCode, quantity: sale.quantity, unitCents: cents(sale.unitPrice) }] });
    return result.sales.find(s => s.id === result.saleIds?.[0])!;
  }, [commitOperation]);
  const updateSale = useCallback(async (sale: Sale, operationId = crypto.randomUUID()) => {
    const result = await commitOperation({ operationId, confirmed: true, kind: 'edit_sale', targetId: sale.id, clientId: sale.clientId, date: sale.saleDate, observation: sale.observation, receivedCents: 0, items: [{ productName: sale.productName, productCode: sale.productCode, quantity: sale.quantity, unitCents: cents(sale.unitPrice) }] });
    return result.sales.find(s => s.id === sale.id)!;
  }, [commitOperation]);
  const addPayment = useCallback(async (payment: Omit<Payment, 'id'>, operationId = crypto.randomUUID(), allowCredit = false) => { await commitOperation({ operationId, confirmed: true, kind: 'payment', clientId: payment.clientId, date: payment.paymentDate, observation: payment.observation, amountCents: cents(payment.amount), allowCredit }); }, [commitOperation]);
  const updatePayment = useCallback(async (payment: Payment, operationId = crypto.randomUUID(), allowCredit = false) => { await commitOperation({ operationId, confirmed: true, kind: 'edit_payment', targetId: payment.id, clientId: payment.clientId, date: payment.paymentDate, observation: payment.observation, amountCents: cents(payment.amount), allowCredit }); }, [commitOperation]);
  const deleteSale = useCallback(async (id: string) => { const sale = sales.find(s => s.id === id); if (!sale) { await apiFetch(`/api/sales?id=${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmed: true, operationId: crypto.randomUUID() }) }); return; } await commitOperation({ operationId: crypto.randomUUID(), confirmed: true, kind: 'delete_sale', targetId: id, clientId: sale.clientId, date: sale.saleDate, observation: '' }); }, [sales, commitOperation]);
  const deletePayment = useCallback(async (id: string) => { const payment = payments.find(p => p.id === id); if (!payment) throw new Error('Pagamento não encontrado. Atualize os registros.'); await commitOperation({ operationId: crypto.randomUUID(), confirmed: true, kind: 'delete_payment', targetId: id, clientId: payment.clientId, date: payment.paymentDate, observation: '' }); }, [payments, commitOperation]);
  const clientBalances = useMemo(() => new Map(clients.map(c => [c.id, clientBalance(sales, payments, c.id) / 100])), [clients, sales, payments]);
  return <DataContext.Provider value={{ clients, sales, payments, addClient, updateClient, deleteClient, getClientById, addSale, updateSale, deleteSale, addPayment, updatePayment, deletePayment, commitOperation, clientBalances, isLoading, isRefreshing, dataError, refreshData, rememberClients, user, login, logout }}>{children}</DataContext.Provider>;
};
export const useData = () => { const value = useContext(DataContext); if (!value) throw new Error('useData must be used within a DataProvider'); return value; };
