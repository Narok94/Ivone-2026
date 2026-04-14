-- Criar tabelas do sistema Ivone de vendas

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS ivone_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS ivone_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES ivone_users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  cep TEXT,
  street TEXT,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  phone TEXT,
  email TEXT,
  cpf TEXT,
  observation TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de itens de estoque
CREATE TABLE IF NOT EXISTS ivone_stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES ivone_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size TEXT,
  code TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de vendas
CREATE TABLE IF NOT EXISTS ivone_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES ivone_users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES ivone_clients(id) ON DELETE CASCADE,
  sale_date TEXT NOT NULL,
  product_code TEXT,
  product_name TEXT,
  stock_item_id UUID REFERENCES ivone_stock_items(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  unit_price DOUBLE PRECISION NOT NULL,
  total DOUBLE PRECISION NOT NULL,
  observation TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de pagamentos
CREATE TABLE IF NOT EXISTS ivone_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES ivone_users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES ivone_clients(id) ON DELETE CASCADE,
  payment_date TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  observation TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Inserir usuários padrão (se não existirem)
INSERT INTO ivone_users (username, password, role, first_name, last_name)
VALUES 
  ('admin', 'admin', 'admin', 'Admin', 'Master'),
  ('ivone', '9860', 'user', 'Ivone', 'Silva')
ON CONFLICT (username) DO NOTHING;
