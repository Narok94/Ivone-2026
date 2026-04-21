import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect, useCallback } from 'react';
import { Client, Sale, Payment } from '../types';

interface DataContextType {
  clients: Client[];
  addClient: (client: Omit<Client, 'id'>) => Promise<void>;
  updateClient: (client: Client) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
  getClientById: (clientId: string) => Client | undefined;

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
  
  user: { id: string, username: string } | null;
  login: (pin: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [user, setUser] = useState<{ id: string, username: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load from API on mount or user change
  const refreshData = useCallback(async () => {
    if (!user) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
      const [clientsRes, salesRes, paymentsRes] = await Promise.all([
        fetch('/api/clients').then(r => r.json()),
        fetch('/api/sales').then(r => r.json()),
        fetch('/api/payments').then(r => r.json())
      ]);
      setClients(clientsRes);
      setSales(salesRes);
      setPayments(paymentsRes);
    } catch (e) {
      console.error('Erro ao buscar dados do servidor:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const savedUser = localStorage.getItem('ivone_user');
    if (savedUser) {
        setUser(JSON.parse(savedUser));
    } else {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
        refreshData();
        localStorage.setItem('ivone_user', JSON.stringify(user));
    } else {
        localStorage.removeItem('ivone_user');
        setClients([]);
        setSales([]);
        setPayments([]);
    }
  }, [user, refreshData]);

  const login = async (pin: string) => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'Ivone', pin })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setUser(data.user);
        return { success: true };
      }
      
      // Detailed error handling based on status and response type
      return { 
        success: false, 
        message: data.message || 'Erro ao entrar. Tente novamente mais tarde. 🌸' 
      };
      
    } catch (e: any) {
      console.error('Login request error:', e);
      return { 
        success: false, 
        message: `Erro de conexão: ${e.message || 'Verifique se o banco de dados está online.'} 🌸` 
      };
    }
  };

  const logout = () => setUser(null);

  const addClient = useCallback(async (clientData: Omit<Client, 'id'>) => {
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clientData)
    });
    const newClient = await res.json();
    setClients(prev => [...prev, newClient]);
  }, []);

  const updateClient = useCallback(async (updatedClient: Client) => {
    const res = await fetch(`/api/clients?id=${updatedClient.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedClient)
    });
    const serverClient = await res.json();
    setClients(prev => prev.map(c => c.id === serverClient.id ? serverClient : c));
  }, []);

  const deleteClient = useCallback(async (clientId: string) => {
    await fetch(`/api/clients?id=${clientId}`, { method: 'DELETE' });
    setClients(prev => prev.filter(c => c.id !== clientId));
  }, []);
  
  const getClientById = useCallback((clientId: string) => clients.find(c => c.id === clientId), [clients]);

  const addSale = useCallback(async (saleData: Omit<Sale, 'id'|'total'>) => {
    const total = parseFloat((saleData.quantity * saleData.unitPrice).toFixed(2));
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...saleData, total })
    });
    const newSale = await res.json();
    setSales(prev => [...prev, newSale]);
    return newSale;
  }, []);
  
  const updateSale = useCallback(async (updatedSale: Sale) => {
    const total = parseFloat((updatedSale.quantity * updatedSale.unitPrice).toFixed(2));
    const res = await fetch(`/api/sales?id=${updatedSale.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updatedSale, total })
    });
    const serverSale = await res.json();
    setSales(prev => prev.map(s => s.id === serverSale.id ? serverSale : s));
    return serverSale;
  }, []);

  const deleteSale = useCallback(async (saleId: string) => {
    await fetch(`/api/sales?id=${saleId}`, { method: 'DELETE' });
    setSales(prev => prev.filter(s => s.id !== saleId));
  }, []);

  const addPayment = useCallback(async (paymentData: Omit<Payment, 'id'>) => {
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    const newPayment = await res.json();
    setPayments(prev => [...prev, newPayment]);
  }, []);
  
  const updatePayment = useCallback(async (updatedPayment: Payment) => {
    const res = await fetch(`/api/payments?id=${updatedPayment.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPayment)
    });
    const serverPayment = await res.json();
    setPayments(prev => prev.map(p => p.id === serverPayment.id ? serverPayment : p));
  }, []);

  const deletePayment = useCallback(async (paymentId: string) => {
    await fetch(`/api/payments?id=${paymentId}`, { method: 'DELETE' });
    setPayments(prev => prev.filter(p => p.id !== paymentId));
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
    sales, addSale, updateSale, deleteSale,
    payments, addPayment, updatePayment, deletePayment,
    clientBalances,
    isLoading,
    user, login, logout
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
