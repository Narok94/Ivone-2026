import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect, useCallback } from 'react';
import { Client, StockItem, Sale, Payment } from '../types';
import { useAuth } from './AuthContext';
import useLocalStorage from '../hooks/useLocalStorage';

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

  getRawData: (userId: string) => Promise<RawData>;
  loadRawData: (data: RawData, userId: string) => Promise<void>;

  isLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const dataKey = currentUser ? `appData-${currentUser.id}` : 'appData-loggedOut';
  const [data, setData] = useLocalStorage<RawData>(dataKey, initialData);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // When there is no user, we ensure the data is cleared.
    if (!currentUser) {
        setData(initialData);
    }
    setIsLoading(false);
  }, [currentUser, setData]);

  const addClient = useCallback(async (clientData: Omit<Client, 'id'>) => {
    const newClient: Client = { ...clientData, id: crypto.randomUUID() };
    setData(prev => ({ ...prev, clients: [...(prev.clients || []), newClient] }));
  }, [setData]);

  const updateClient = useCallback(async (updatedClient: Client) => {
    setData(prev => ({ ...prev, clients: (prev.clients || []).map(c => c.id === updatedClient.id ? updatedClient : c) }));
  }, [setData]);

  const deleteClient = useCallback(async (clientId: string) => {
    setData(prev => ({ ...prev, clients: (prev.clients || []).filter(c => c.id !== clientId) }));
  }, [setData]);
  
  const getClientById = useCallback((clientId: string) => (data.clients || []).find(c => c.id === clientId), [data.clients]);

  const addStockItem = useCallback(async (itemData: Omit<StockItem, 'id'>) => {
    const newItem: StockItem = { ...itemData, id: crypto.randomUUID() };
    setData(prev => ({ ...prev, stockItems: [...(prev.stockItems || []), newItem] }));
  }, [setData]);

  const updateStockItemQuantity = useCallback(async (itemId: string, newQuantity: number) => {
    setData(prev => ({ ...prev, stockItems: (prev.stockItems || []).map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item) }));
  }, [setData]);
  
  const deleteStockItem = useCallback(async (itemId: string) => {
    setData(prev => ({ ...prev, stockItems: (prev.stockItems || []).filter(item => item.id !== itemId) }));
  }, [setData]);

  const addSale = useCallback(async (saleData: Omit<Sale, 'id'|'total'>) => {
    const newSale: Sale = { 
        ...saleData, 
        id: crypto.randomUUID(),
        total: parseFloat((saleData.quantity * saleData.unitPrice).toFixed(2)),
    };
    
    setData(prev => {
        let newStock = [...(prev.stockItems || [])];
        if (newSale.stockItemId) {
            const stockIndex = newStock.findIndex(i => i.id === newSale.stockItemId);
            if (stockIndex > -1) {
                const updatedItem = { ...newStock[stockIndex], quantity: newStock[stockIndex].quantity - newSale.quantity };
                if (updatedItem.quantity < 0) {
                    // This error should be caught by the component calling addSale
                    throw new Error("Estoque insuficiente.");
                }
                newStock[stockIndex] = updatedItem;
            }
        }
        return { ...prev, sales: [...(prev.sales || []), newSale], stockItems: newStock };
    });
    return newSale;
  }, [setData]);
  
  const updateSale = useCallback(async (updatedSale: Sale) => {
    const finalSaleData = { 
        ...updatedSale, 
        total: parseFloat((updatedSale.quantity * updatedSale.unitPrice).toFixed(2))
    };

    setData(prev => {
        const originalSale = (prev.sales || []).find(s => s.id === updatedSale.id);
        if (!originalSale) throw new Error("Venda original não encontrada");
        
        let newStock = [...(prev.stockItems || [])];
        // 1. Revert original stock
        if (originalSale.stockItemId) {
            const stockIndex = newStock.findIndex(i => i.id === originalSale.stockItemId);
            if (stockIndex > -1) {
                newStock[stockIndex] = { ...newStock[stockIndex], quantity: newStock[stockIndex].quantity + originalSale.quantity };
            }
        }
        // 2. Apply new stock change
        if (updatedSale.stockItemId) {
            const stockIndex = newStock.findIndex(i => i.id === updatedSale.stockItemId);
            if (stockIndex > -1) {
                const newQuantity = newStock[stockIndex].quantity - updatedSale.quantity;
                if (newQuantity < 0) {
                    throw new Error("Estoque insuficiente para a atualização.");
                }
                newStock[stockIndex] = { ...newStock[stockIndex], quantity: newQuantity };
            }
        }

        const newSales = (prev.sales || []).map(s => s.id === updatedSale.id ? finalSaleData : s);
        return { ...prev, sales: newSales, stockItems: newStock };
    });

    return finalSaleData;
  }, [setData]);

  const deleteSale = useCallback(async (saleId: string) => {
     setData(prev => {
        const saleToDelete = (prev.sales || []).find(s => s.id === saleId);
        if (!saleToDelete) return prev;
        
        let newStock = [...(prev.stockItems || [])];
        if (saleToDelete.stockItemId) {
            const stockIndex = newStock.findIndex(i => i.id === saleToDelete.stockItemId);
            if (stockIndex > -1) {
                newStock[stockIndex] = { ...newStock[stockIndex], quantity: newStock[stockIndex].quantity + saleToDelete.quantity };
            }
        }
        
        const newSales = (prev.sales || []).filter(s => s.id !== saleId);
        return { ...prev, sales: newSales, stockItems: newStock };
    });
  }, [setData]);

  const addPayment = useCallback(async (paymentData: Omit<Payment, 'id'>) => {
    const newPayment: Payment = { ...paymentData, id: crypto.randomUUID() };
    setData(prev => ({ ...prev, payments: [...(prev.payments || []), newPayment] }));
  }, [setData]);
  
  const updatePayment = useCallback(async (updatedPayment: Payment) => {
    setData(prev => ({ ...prev, payments: (prev.payments || []).map(p => p.id === updatedPayment.id ? updatedPayment : p) }));
  }, [setData]);

  const deletePayment = useCallback(async (paymentId: string) => {
    setData(prev => ({ ...prev, payments: (prev.payments || []).filter(p => p.id !== paymentId) }));
  }, [setData]);

  const clientBalances = useMemo(() => {
    const balances = new Map<string, number>();
    (data.clients || []).forEach(client => {
        const totalSales = (data.sales || []).filter(s => s.clientId === client.id).reduce((sum, s) => sum + s.total, 0);
        const totalPayments = (data.payments || []).filter(p => p.clientId === client.id).reduce((sum, p) => sum + p.amount, 0);
        balances.set(client.id, totalSales - totalPayments);
    });
    return balances;
  }, [data.clients, data.sales, data.payments]);
  
  const getRawData = useCallback(async (userId: string): Promise<RawData> => {
     const storedData = window.localStorage.getItem(`appData-${userId}`);
     return storedData ? JSON.parse(storedData) : initialData;
  }, []);
  
  const loadRawData = useCallback(async (rawData: RawData, userId: string) => {
      if (rawData && Array.isArray(rawData.clients) && Array.isArray(rawData.stockItems) && Array.isArray(rawData.sales) && Array.isArray(rawData.payments)) {
        const dataKeyToLoad = `appData-${userId}`;
        window.localStorage.setItem(dataKeyToLoad, JSON.stringify(rawData));
        
        if (currentUser?.id === userId) {
            setData(rawData);
        }

      } else {
          throw new Error("Arquivo de backup inválido ou corrompido.");
      }
  }, [currentUser, setData]);

  const value = {
    clients: data.clients || [], addClient, updateClient, deleteClient, getClientById,
    stockItems: data.stockItems || [], addStockItem, updateStockItemQuantity, deleteStockItem,
    sales: data.sales || [], addSale, updateSale, deleteSale,
    payments: data.payments || [], addPayment, updatePayment, deletePayment,
    clientBalances,
    getRawData,
    loadRawData,
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