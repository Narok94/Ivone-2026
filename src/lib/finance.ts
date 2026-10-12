import type { Payment, Sale } from '../types';

export const MAX_CENTS = 1_000_000_000;
export function cents(value: number | string): number {
  const text = String(value).trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) throw new Error('Informe um valor com até dois centavos decimais.');
  const negative = text.startsWith('-');
  const [integer, rawFraction = ''] = text.replace('-', '').split('.');
  const fraction = rawFraction.replace(/0+$/, '');
  if (fraction.length > 2) throw new Error('Informe um valor com até dois centavos decimais.');
  const result = Number(integer) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result)) throw new Error('Valor fora do limite permitido.');
  return negative ? -result : result;
}
export function brCents(value: string): number {
  const text = value.trim().replace(/^r\$\s*/i, '').replace(/\s*(?:reais?|real)\s*$/i, '').trim();
  if (text.includes(',')) {
    if (!/^\d{1,3}(?:\.\d{3})*,\d{1,2}$|^\d+,\d{1,2}$/.test(text)) throw new Error('Qual é o valor? Exemplo: 145,56.');
    return cents(text.replaceAll('.', '').replace(',', '.'));
  }
  if (/^\d{1,3}(?:\.\d{3})+$/.test(text)) return cents(text.replaceAll('.', ''));
  return cents(text);
}
export const decimal = (value: number) => {
  if (!Number.isSafeInteger(value)) throw new Error('Valor inválido.');
  return `${value < 0 ? '-' : ''}${Math.floor(Math.abs(value) / 100)}.${String(Math.abs(value) % 100).padStart(2, '0')}`;
};
export const currency = (value: number) => (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export function lineTotal(quantity: number, unitCents: number) {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000 || !Number.isSafeInteger(unitCents) || unitCents <= 0) throw new Error('Confira a quantidade e o valor por unidade.');
  const total = quantity * unitCents;
  if (!Number.isSafeInteger(total) || total > MAX_CENTS) throw new Error('Total fora do limite permitido.');
  return total;
}
export function sumCents(values: number[]) {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!Number.isSafeInteger(total)) throw new Error('Total inválido.');
  return total;
}
export const clientBalance = (sales: Sale[], payments: Payment[], clientId: string) => sumCents(sales.filter(s => s.clientId === clientId).map(s => cents(s.total))) - sumCents(payments.filter(p => p.clientId === clientId).map(p => cents(p.amount)));
export const sumMoney = (values: number[]) => sumCents(values.map(value => cents(value))) / 100;
export function paymentAllocation(sales: Sale[], payments: Payment[], clientId: string) {
  const statuses = new Map<string, 'paid' | 'partial' | 'unpaid'>();
  let paid = sumCents(payments.filter(p => p.clientId === clientId).map(p => cents(p.amount)));
  for (const sale of sales.filter(s => s.clientId === clientId).sort((a, b) => a.saleDate.localeCompare(b.saleDate) || a.id.localeCompare(b.id))) {
    const total = cents(sale.total);
    statuses.set(sale.id, paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid');
    paid = Math.max(0, paid - total);
  }
  return statuses;
}
export function today(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (type: string) => parts.find(part => part.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > '2100-12-31') return false;
  const date = new Date(value + 'T12:00:00Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function dateLabel(value: string) { return value.split('-').reverse().join('/'); }
export type FinancialItem = { productName: string; productCode: string; quantity: number; unitCents: number };
export type FinancialOperation = {
  operationId: string; confirmed: true;
  kind: 'sale' | 'payment' | 'edit_sale' | 'edit_payment' | 'delete_sale' | 'delete_payment';
  clientId: string; date: string; observation: string; items?: FinancialItem[];
  receivedCents?: number; amountCents?: number; targetId?: string; allowCredit?: boolean;
};
export type FinancialResult = { sales: Sale[]; payments: Payment[]; clientId: string; balanceCents: number; replayed: boolean; operationId: string; saleIds?: string[]; paymentIds?: string[] };
