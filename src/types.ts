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

export interface Sale {
  id: string;
  clientId: string;
  saleDate: string; 
  productCode: string;
  productName: string;
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

export type View = 
  | 'dashboard' 
  | 'clients' 
  | 'add_client' 
  | 'add_sale' 
  | 'add_payment' 
  | 'reports' 
  | 'history' 
  | 'pending_payments' 
  | 'sales_view' 
  | 'all_payments' 
  | 'stock'
  | 'client_detail';
