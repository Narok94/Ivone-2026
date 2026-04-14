export interface Client {
  id: string;
  fullName: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  cpf: string;
  observation: string;
}

export interface StockItem {
  id: string;
  name: string;
  size: string;
  code: string;
  quantity: number;
}

export interface Sale {
  id: string;
  clientId: string;
  saleDate: string; 
  productCode: string;
  productName: string;
  stockItemId: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  observation: string;
}

export interface Payment {
  id: string;
  clientId: string;
  paymentDate: string;
  amount: number;
  observation: string;
}

export interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'user';
  firstName: string;
  lastName: string;
  theme?: 'default' | 'neon-chic';
}