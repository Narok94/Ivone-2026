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
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEY = 'ivone_app_data_v1';

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setClients(parsed.clients || []);
        setSales(parsed.sales || []);
        setPayments(parsed.payments || []);
      } catch (e) {
        console.error('Erro ao ler dados do caderninho local:', e);
      }
    }
    setIsLoading(false);
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        clients,
        sales,
        payments
      }));
    }
  }, [clients, sales, payments, isLoading]);

  const addClient = useCallback(async (clientData: Omit<Client, 'id'>) => {
    const newClient: Client = { ...clientData, id: crypto.randomUUID() };
    setClients(prev => [...prev, newClient]);
  }, []);

  const updateClient = useCallback(async (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
  }, []);

  const deleteClient = useCallback(async (clientId: string) => {
    setClients(prev => prev.filter(c => c.id !== clientId));
  }, []);
  
  const getClientById = useCallback((clientId: string) => clients.find(c => c.id === clientId), [clients]);

  const addSale = useCallback(async (saleData: Omit<Sale, 'id'|'total'>) => {
    const total = parseFloat((saleData.quantity * saleData.unitPrice).toFixed(2));
    const newSale: Sale = { ...saleData, id: crypto.randomUUID(), total };
    setSales(prev => [...prev, newSale]);
    return newSale;
  }, []);
  
  const updateSale = useCallback(async (updatedSale: Sale) => {
    const total = parseFloat((updatedSale.quantity * updatedSale.unitPrice).toFixed(2));
    const finalSaleData = { ...updatedSale, total };
    setSales(prev => prev.map(s => s.id === updatedSale.id ? finalSaleData : s));
    return finalSaleData;
  }, []);

  const deleteSale = useCallback(async (saleId: string) => {
    setSales(prev => prev.filter(s => s.id !== saleId));
  }, []);

  const addPayment = useCallback(async (paymentData: Omit<Payment, 'id'>) => {
    const newPayment: Payment = { ...paymentData, id: crypto.randomUUID() };
    setPayments(prev => [...prev, newPayment]);
  }, []);
  
  const updatePayment = useCallback(async (updatedPayment: Payment) => {
    setPayments(prev => prev.map(p => p.id === updatedPayment.id ? updatedPayment : p));
  }, []);

  const deletePayment = useCallback(async (paymentId: string) => {
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
