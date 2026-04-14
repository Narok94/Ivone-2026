import { pgTable, text, timestamp, doublePrecision, integer, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('ivone_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  role: text('role', { enum: ['admin', 'user'] }).notNull().default('user'),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const clients = pgTable('ivone_clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  fullName: text('full_name').notNull(),
  cep: text('cep'),
  street: text('street'),
  number: text('number'),
  complement: text('complement'),
  neighborhood: text('neighborhood'),
  city: text('city'),
  state: text('state'),
  phone: text('phone'),
  email: text('email'),
  cpf: text('cpf'),
  observation: text('observation'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const stockItems = pgTable('ivone_stock_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  size: text('size'),
  code: text('code'),
  quantity: integer('quantity').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const sales = pgTable('ivone_sales', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  clientId: uuid('client_id').references(() => clients.id).notNull(),
  saleDate: text('sale_date').notNull(),
  productCode: text('product_code'),
  productName: text('product_name'),
  stockItemId: uuid('stock_item_id').references(() => stockItems.id),
  quantity: integer('quantity').notNull(),
  unitPrice: doublePrecision('unit_price').notNull(),
  total: doublePrecision('total').notNull(),
  observation: text('observation'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const payments = pgTable('ivone_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  clientId: uuid('client_id').references(() => clients.id).notNull(),
  paymentDate: text('payment_date').notNull(),
  amount: doublePrecision('amount').notNull(),
  observation: text('observation'),
  createdAt: timestamp('created_at').defaultNow(),
});
