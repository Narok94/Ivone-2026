import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect, useCallback } from 'react';
import { Client, StockItem, Sale, Payment } from '../types';
import { useAuth } from './AuthContext';

interface RawData {
  clients: Client[];
  stockItems: StockItem[];
  sales: Sale[];
  payments: Payment[];
}

const initialData: RawData = {
    clients: [],
    stockItems: [],
    sales: [],
    payments: [],
};

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
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [data, setData] = useState<RawData>(initialData);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!currentUser) {
      setData(initialData);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [clientsRes, stockRes, salesRes, paymentsRes] = await Promise.all([
        fetch(`/api/clients?userId=${currentUser.id}`).then(res => res.json()),
        fetch(`/api/stock?userId=${currentUser.id}`).then(res => res.json()),
        fetch(`/api/sales?userId=${currentUser.id}`).then(res => res.json()),
        fetch(`/api/payments?userId=${currentUser.id}`).then(res => res.json()),
      ]);
      setData({
        clients: clientsRes,
        stockItems: stockRes,
        sales: salesRes,
        payments: paymentsRes,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addClient = useCallback(async (clientData: Omit<Client, 'id'>) => {
    if (!currentUser) return;
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...clientData, userId: currentUser.id }),
    });
    const newClient = await res.json();
    setData(prev => ({ ...prev, clients: [...prev.clients, newClient] }));
  }, [currentUser]);

  const updateClient = useCallback(async (updatedClient: Client) => {
    await fetch(`/api/clients/${updatedClient.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedClient),
    });
    setData(prev => ({ ...prev, clients: prev.clients.map(c => c.id === updatedClient.id ? updatedClient : c) }));
  }, []);

  const deleteClient = useCallback(async (clientId: string) => {
    await fetch(`/api/clients/${clientId}`, { method: 'DELETE' });
    setData(prev => ({ ...prev, clients: prev.clients.filter(c => c.id !== clientId) }));
  }, []);
  
  const getClientById = useCallback((clientId: string) => data.clients.find(c => c.id === clientId), [data.clients]);

  const addStockItem = useCallback(async (itemData: Omit<StockItem, 'id'>) => {
    if (!currentUser) return;
    const res = await fetch('/api/stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...itemData, userId: currentUser.id }),
    });
    const newItem = await res.json();
    setData(prev => ({ ...prev, stockItems: [...prev.stockItems, newItem] }));
  }, [currentUser]);

  const updateStockItemQuantity = useCallback(async (itemId: string, newQuantity: number) => {
    await fetch(`/api/stock/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: newQuantity }),
    });
    setData(prev => ({ ...prev, stockItems: prev.stockItems.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item) }));
  }, []);
  
  const deleteStockItem = useCallback(async (itemId: string) => {
    await fetch(`/api/stock/${itemId}`, { method: 'DELETE' });
    setData(prev => ({ ...prev, stockItems: prev.stockItems.filter(item => item.id !== itemId) }));
  }, []);

  const addSale = useCallback(async (saleData: Omit<Sale, 'id'|'total'>) => {
    if (!currentUser) throw new Error("User not logged in");
    const total = parseFloat((saleData.quantity * saleData.unitPrice).toFixed(2));
    
    // Check stock locally first for immediate feedback
    if (saleData.stockItemId) {
        const item = data.stockItems.find(i => i.id === saleData.stockItemId);
        if (item && item.quantity < saleData.quantity) {
            throw new Error("Estoque insuficiente.");
        }
    }

    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...saleData, total, userId: currentUser.id }),
    });
    const newSale = await res.json();
    
    // Update stock in DB
    if (saleData.stockItemId) {
        const item = data.stockItems.find(i => i.id === saleData.stockItemId);
        if (item) {
            await updateStockItemQuantity(item.id, item.quantity - saleData.quantity);
        }
    }

    setData(prev => ({ ...prev, sales: [...prev.sales, newSale] }));
    return newSale;
  }, [currentUser, data.stockItems, updateStockItemQuantity]);
  
  const updateSale = useCallback(async (updatedSale: Sale) => {
    const total = parseFloat((updatedSale.quantity * updatedSale.unitPrice).toFixed(2));
    const finalSaleData = { ...updatedSale, total };

    const originalSale = data.sales.find(s => s.id === updatedSale.id);
    if (!originalSale) throw new Error("Venda original não encontrada");

    // Revert and apply stock changes
    if (originalSale.stockItemId === updatedSale.stockItemId && originalSale.stockItemId) {
        const item = data.stockItems.find(i => i.id === originalSale.stockItemId);
        if (item) {
            const diff = updatedSale.quantity - originalSale.quantity;
            if (item.quantity < diff) throw new Error("Estoque insuficiente");
            await updateStockItemQuantity(item.id, item.quantity - diff);
        }
    }

    await fetch(`/api/sales/${updatedSale.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalSaleData),
    });

    setData(prev => ({ ...prev, sales: prev.sales.map(s => s.id === updatedSale.id ? finalSaleData : s) }));
    return finalSaleData;
  }, [data.sales, data.stockItems, updateStockItemQuantity]);

  const deleteSale = useCallback(async (saleId: string) => {
    const saleToDelete = data.sales.find(s => s.id === saleId);
    if (!saleToDelete) return;

    if (saleToDelete.stockItemId) {
        const item = data.stockItems.find(i => i.id === saleToDelete.stockItemId);
        if (item) {
            await updateStockItemQuantity(item.id, item.quantity + saleToDelete.quantity);
        }
    }

    await fetch(`/api/sales/${saleId}`, { method: 'DELETE' });
    setData(prev => ({ ...prev, sales: prev.sales.filter(s => s.id !== saleId) }));
  }, [data.sales, data.stockItems, updateStockItemQuantity]);

  const addPayment = useCallback(async (paymentData: Omit<Payment, 'id'>) => {
    if (!currentUser) return;
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...paymentData, userId: currentUser.id }),
    });
    const newPayment = await res.json();
    setData(prev => ({ ...prev, payments: [...prev.payments, newPayment] }));
  }, [currentUser]);
  
  const updatePayment = useCallback(async (updatedPayment: Payment) => {
    await fetch(`/api/payments/${updatedPayment.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPayment),
    });
    setData(prev => ({ ...prev, payments: prev.payments.map(p => p.id === updatedPayment.id ? updatedPayment : p) }));
  }, []);

  const deletePayment = useCallback(async (paymentId: string) => {
    await fetch(`/api/payments/${paymentId}`, { method: 'DELETE' });
    setData(prev => ({ ...prev, payments: prev.payments.filter(p => p.id !== paymentId) }));
  }, []);

  const clientBalances = useMemo(() => {
    const balances = new Map<string, number>();
    (data.clients || []).forEach(client => {
        const totalSales = (data.sales || []).filter(s => s.clientId === client.id).reduce((sum, s) => sum + s.total, 0);
        const totalPayments = (data.payments || []).filter(p => p.clientId === client.id).reduce((sum, p) => sum + p.amount, 0);
        balances.set(client.id, totalSales - totalPayments);
    });
    return balances;
  }, [data.clients, data.sales, data.payments]);
  
  const value = {
    clients: data.clients || [], addClient, updateClient, deleteClient, getClientById,
    stockItems: data.stockItems || [], addStockItem, updateStockItemQuantity, deleteStockItem,
    sales: data.sales || [], addSale, updateSale, deleteSale,
    payments: data.payments || [], addPayment, updatePayment, deletePayment,
    clientBalances,
    isLoading,
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