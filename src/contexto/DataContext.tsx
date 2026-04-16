import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect, useCallback } from 'react';
import { Client, StockItem, Sale, Payment } from '../types';

interface DataContextType {
  clients: Client[];
  addClient: (client: Omit<Client, 'id'>) => Promise<void>;
  updateClient: (client: Client) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
  getClientById: (clientId: string) => Client | undefined;
  
  stockItems: StockItem[];
  addStockItem: (item: Omit<StockItem, 'id'>) => Promise<void>;
  updateStockItemQuantity: (itemId: string, newQuantity: number) => Promise<void>;
  deleteStockItem: (itemId: string) => Promise<void>;

  sales: Sale[];
  addSale: (sale: Omit<Sale, 'id' | 'total'>) => Promise<Sale>;
  updateSale: (sale: Sale) => Promise<Sale>;
  deleteSale: (saleId: string) => Promise<void>;

  payments: Payment[];
  addPayment: (payment: Omit<Payment, 'id'>) => Promise<void>;
  updatePayment: (payment: Payment) => Promise<void>;
  deletePayment: (paymentId: string) => Promise<void>;

  clientBalances: Map<string, number>;
  isLoading: boolean;
  dbStatus: 'connected' | 'error' | 'checking';
  dbErrorMessage: string | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<'connected' | 'error' | 'checking'>('checking');
  const [dbErrorMessage, setDbErrorMessage] = useState<string | null>(null);

  const checkDbStatus = useCallback(async () => {
    try {
      let url = `${window.location.origin}/api/health`;
      console.log('Checking DB status at:', url);
      let res = await fetch(url, { cache: 'no-store' });
      
      // Fallback to /health if /api/health returns HTML or 404
      if (!res.ok || res.headers.get('content-type')?.includes('text/html')) {
        console.warn('/api/health failed or returned HTML, trying /health...');
        url = `${window.location.origin}/health`;
        res = await fetch(url, { cache: 'no-store' });
      }

      const backendHeader = res.headers.get('X-Backend-Server');
      console.log('Backend Server Header:', backendHeader);
      
      const text = await res.text();
      
      try {
        const data = JSON.parse(text);
        if (res.ok && data.status === 'connected') {
          setDbStatus('connected');
          setDbErrorMessage(null);
        } else {
          setDbStatus('error');
          setDbErrorMessage(data.message || 'Erro desconhecido ao conectar ao banco.');
        }
      } catch (parseError) {
        console.error('Failed to parse JSON response from /api/health. Response was:', text.substring(0, 200));
        setDbStatus('error');
        setDbErrorMessage('Resposta inválida do servidor. Verifique o console.');
      }
    } catch (error) {
      console.error('Fetch error in checkDbStatus:', error);
      setDbStatus('error');
      setDbErrorMessage('Não foi possível alcançar o servidor.');
    }
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    await checkDbStatus();
    try {
      const [clientsRes, stockRes, salesRes, paymentsRes] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/stock'),
        fetch('/api/sales'),
        fetch('/api/payments')
      ]);

      const [clientsData, stockData, salesData, paymentsData] = await Promise.all([
        clientsRes.json(),
        stockRes.json(),
        salesRes.json(),
        paymentsRes.json()
      ]);

      setClients(clientsData);
      setStockItems(stockData);
      setSales(salesData);
      setPayments(paymentsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addClient = useCallback(async (clientData: Omit<Client, 'id'>) => {
    const newClient: Client = { ...clientData, id: crypto.randomUUID() };
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newClient)
    });
    if (res.ok) {
      setClients(prev => [...prev, newClient]);
    }
  }, []);

  const updateClient = useCallback(async (updatedClient: Client) => {
    const res = await fetch(`/api/clients/${updatedClient.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedClient)
    });
    if (res.ok) {
      setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    }
  }, []);

  const deleteClient = useCallback(async (clientId: string) => {
    const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' });
    if (res.ok) {
      setClients(prev => prev.filter(c => c.id !== clientId));
    }
  }, []);
  
  const getClientById = useCallback((clientId: string) => clients.find(c => c.id === clientId), [clients]);

  const addStockItem = useCallback(async (itemData: Omit<StockItem, 'id'>) => {
    const newItem: StockItem = { ...itemData, id: crypto.randomUUID() };
    const res = await fetch('/api/stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem)
    });
    if (res.ok) {
      setStockItems(prev => [...prev, newItem]);
    }
  }, []);

  const updateStockItemQuantity = useCallback(async (itemId: string, newQuantity: number) => {
    const res = await fetch(`/api/stock/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: newQuantity })
    });
    if (res.ok) {
      setStockItems(prev => prev.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item));
    }
  }, []);
  
  const deleteStockItem = useCallback(async (itemId: string) => {
    const res = await fetch(`/api/stock/${itemId}`, { method: 'DELETE' });
    if (res.ok) {
      setStockItems(prev => prev.filter(item => item.id !== itemId));
    }
  }, []);

  const addSale = useCallback(async (saleData: Omit<Sale, 'id'|'total'>) => {
    const total = parseFloat((saleData.quantity * saleData.unitPrice).toFixed(2));
    const newSale: Sale = { ...saleData, id: crypto.randomUUID(), total };
    
    // Check stock locally first (optional but good for UX)
    if (saleData.stockItemId) {
      const item = stockItems.find(i => i.id === saleData.stockItemId);
      if (item && item.quantity < saleData.quantity) {
        throw new Error("Estoque insuficiente.");
      }
    }

    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSale)
    });

    if (res.ok) {
      setSales(prev => [...prev, newSale]);
      // Update stock locally
      if (saleData.stockItemId) {
        const item = stockItems.find(i => i.id === saleData.stockItemId);
        if (item) {
          await updateStockItemQuantity(item.id, item.quantity - saleData.quantity);
        }
      }
      return newSale;
    } else {
      throw new Error("Erro ao registrar venda no servidor.");
    }
  }, [stockItems, updateStockItemQuantity]);
  
  const updateSale = useCallback(async (updatedSale: Sale) => {
    const total = parseFloat((updatedSale.quantity * updatedSale.unitPrice).toFixed(2));
    const finalSaleData = { ...updatedSale, total };

    const res = await fetch(`/api/sales/${updatedSale.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalSaleData)
    });

    if (res.ok) {
      // For simplicity, we refetch all data to ensure stock is correct after complex update
      await fetchData();
      return finalSaleData;
    } else {
      throw new Error("Erro ao atualizar venda no servidor.");
    }
  }, [fetchData]);

  const deleteSale = useCallback(async (saleId: string) => {
    const res = await fetch(`/api/sales/${saleId}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchData();
    }
  }, [fetchData]);

  const addPayment = useCallback(async (paymentData: Omit<Payment, 'id'>) => {
    const newPayment: Payment = { ...paymentData, id: crypto.randomUUID() };
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPayment)
    });
    if (res.ok) {
      setPayments(prev => [...prev, newPayment]);
    }
  }, []);
  
  const updatePayment = useCallback(async (updatedPayment: Payment) => {
    const res = await fetch(`/api/payments/${updatedPayment.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPayment)
    });
    if (res.ok) {
      setPayments(prev => prev.map(p => p.id === updatedPayment.id ? updatedPayment : p));
    }
  }, []);

  const deletePayment = useCallback(async (paymentId: string) => {
    const res = await fetch(`/api/payments/${paymentId}`, { method: 'DELETE' });
    if (res.ok) {
      setPayments(prev => prev.filter(p => p.id !== paymentId));
    }
  }, []);

  const clientBalances = useMemo(() => {
    const balances = new Map<string, number>();
    clients.forEach(client => {
        const totalSales = sales.filter(s => s.clientId === client.id).reduce((sum, s) => sum + s.total, 0);
        const totalPayments = payments.filter(p => p.clientId === client.id).reduce((sum, p) => sum + p.amount, 0);
        balances.set(client.id, totalSales - totalPayments);
    });
    return balances;
  }, [clients, sales, payments]);

  const value = {
    clients, addClient, updateClient, deleteClient, getClientById,
    stockItems, addStockItem, updateStockItemQuantity, deleteStockItem,
    sales, addSale, updateSale, deleteSale,
    payments, addPayment, updatePayment, deletePayment,
    clientBalances,
    isLoading,
    dbStatus,
    dbErrorMessage,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
