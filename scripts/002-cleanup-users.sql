-- Limpar todos os usuários e criar apenas o usuário ivone

-- Primeiro, deletar dependências (vendas e pagamentos)
DELETE FROM ivone_payments;
DELETE FROM ivone_sales;
DELETE FROM ivone_stock_items;
DELETE FROM ivone_clients;

-- Agora deletar todos os usuários
DELETE FROM ivone_users;

-- Criar apenas o usuário ivone
INSERT INTO ivone_users (username, password, role, first_name, last_name)
VALUES ('ivone', '9860', 'user', 'Ivone', 'Silva');
