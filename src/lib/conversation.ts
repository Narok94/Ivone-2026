import type { Client } from '../types';
import { brCents, FinancialItem, lineTotal, today, validDate } from './finance';

export const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
type Intent = 'sale' | 'payment' | 'balance' | 'statement' | 'pending' | 'received' | 'unknown';
export type ParsedItem = Omit<FinancialItem, 'unitCents'> & { unitCents: number | null; priceQuestion?: number };
export type Interpretation = { kind: Intent; candidates: Client[]; clientId?: string; items: ParsedItem[]; amountCents?: number; date: string; observation: string; question?: string; period?: 'all' | 'today' | 'month'; installments: boolean; needsReview?: boolean; filterClient?: boolean };
const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function mentions(text: string, name: string) { return new RegExp(`(?:^|[^a-z0-9])${escaped(name)}(?=$|[^a-z0-9])`, 'i').test(text); }
function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) { let previous = row[0]; row[0] = i; for (let j = 1; j <= b.length; j++) { const old = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1)); previous = old; } }
  return row[b.length];
}
export function findClients(text: string, clients: Client[], prefix = false) {
  const clean = normalize(text);
  const found = (name: string) => prefix ? new RegExp(`^${escaped(name)}(?=$|[^a-z0-9])`).test(clean) : mentions(clean, name);
  let full = clients.filter(c => normalize(c.fullName).includes(' ') && found(normalize(c.fullName)));
  if (prefix && full.length) { const longest = Math.max(...full.map(c => normalize(c.fullName).length)); full = full.filter(c => normalize(c.fullName).length === longest); }
  if (full.length) return { candidates: full, exact: true };
  const first = clients.filter(c => found(normalize(c.fullName).split(' ')[0]));
  if (first.length) return { candidates: first, exact: true };
  const words = (prefix ? [clean.split(/[^a-z]+/)[0]] : clean.split(/[^a-z]+/)).filter(word => word.length >= 3);
  return { candidates: clients.filter(c => words.some(word => distance(word, normalize(c.fullName).split(' ')[0]) <= 1 || (word.length >= 3 && normalize(c.fullName).split(' ')[0].startsWith(word)))), exact: false };
}
const quantities: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10 };
const numberPattern = '(?:\\d{1,3}(?:\\.\\d{3})+(?:,\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?)';
const saleCommand = /^\s*(?:venda|vendi|vender|vda|vnd)\s+/i;
const recipientPattern = /\b(?:para|pra|p\/)\s+(.+?)(?=\s+(?:por|a|de|dia|em|obs|R\$|\d)\b|$)/i;
function buyerContext(text: string, clients: Client[]) {
  const sentence = text.match(/^(.+?)\s+(?:comprou|levou)\s+/i);
  if (sentence) return { source: sentence[1], prefix: false, mode: 'sentence' };
  const command = text.match(saleCommand);
  const recipient = text.match(recipientPattern);
  if (command) {
    const tail = text.slice(command[0].length);
    if (/^vendi/i.test(command[0]) && recipient && !findClients(tail, clients, true).candidates.length) return { source: recipient[1], prefix: true, mode: 'recipient' };
    return { source: tail, prefix: true, mode: 'prefix' };
  }
  return { source: text, prefix: false, mode: 'unknown' };
}
function buyerLength(source: string, candidates: Client[]) {
  const clean = normalize(source);
  const names = [...new Set(candidates.flatMap(c => [normalize(c.fullName), normalize(c.fullName).split(' ')[0]]))].filter(name => new RegExp(`^${escaped(name)}(?=$|[^a-z0-9])`).test(clean));
  return names.length ? Math.max(...names.map(name => name.length)) : source.split(/\s/)[0].length;
}
function itemFrom(part: string): ParsedItem {
  let value = part.trim().replace(/[.!]$/, '');
  let quantity = 1;
  const quantityMatch = normalize(value).match(/^(\d+(?:[.,]\d+)?|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez)\s+/);
  if (quantityMatch) { quantity = quantities[quantityMatch[1]] ?? Number(quantityMatch[1].replace(',', '.')); value = value.slice(quantityMatch[0].length); }
  const priceMatch = value.match(new RegExp(`(?:\\s+(de|por|a|no total(?: de)?|total(?: de)?))?\\s+(?:R\\$\\s*)?(${numberPattern})(?:\\s*(?:reais|real))?(?:\\s*(cada|cada um|cada uma|a unidade|por unidade|no total|total))?\\s*$`, 'i'));
  if (!priceMatch) return { productName: value, productCode: '', quantity, unitCents: null };
  const productName = value.slice(0, priceMatch.index).trim();
  if (/\b(?:entrada|pagou|recebi|recebimento)\b|(?:\bde\s+|\bpor\s+|R\$\s*)\d/i.test(productName)) return { productName, productCode: '', quantity, unitCents: null };
  let amount: number;
  try { amount = brCents(priceMatch[2]); } catch { return { productName, productCode: '', quantity, unitCents: null }; }
  const suffix = normalize(priceMatch[3] ?? ''); const prefix = normalize(priceMatch[1] ?? '');
  const unit = prefix === 'de' || prefix === 'a' || /cada|unidade/.test(suffix);
  const total = /total/.test(prefix + ' ' + suffix);
  if (quantity > 1 && !unit && !total) return { productName, productCode: '', quantity, unitCents: null, priceQuestion: amount };
  if (total && amount % quantity !== 0) return { productName, productCode: '', quantity, unitCents: null };
  const unitCents = total ? amount / quantity : amount;
  try { lineTotal(quantity, unitCents); } catch { return { productName, productCode: '', quantity, unitCents: null }; }
  return { productName, productCode: '', quantity, unitCents };
}
export function interpret(text: string, clients: Client[], now = new Date()): Interpretation {
  let original = text.normalize('NFC').trim().replace(/\s+/g, ' ');
  const clean = normalize(original);
  let kind: Intent = 'unknown';
  if (/quem.*(?:devendo|deve)|pendencias|devedoras/.test(clean)) kind = 'pending';
  else if (/quanto (?:eu )?recebi|total (?:de )?receb(?:i|imentos)/.test(clean)) kind = 'received';
  else if (/extrato|historico (?:da|de|do)/.test(clean)) kind = 'statement';
  else if (/quanto.*dev[eio]|saldo|divida/.test(clean)) kind = 'balance';
  else if (/^(?:venda|vendi|vender|vda|vnd)\b|^.+?\b(?:comprou|levou)\b/.test(clean)) kind = 'sale';
  else if (/\b(?:pagou|pago|pagamento|pgto|recebi|recebimento|receber)\b/.test(clean)) kind = 'payment';
  else if (/\b(?:venda|vendi|vender|vda|vnd|comprou|levou)\b/.test(clean)) kind = 'sale';
  const buyer = kind === 'sale' ? buyerContext(original, clients) : { source: kind === 'payment' ? original.split(/\bpagou\b/i)[0] : original, prefix: false, mode: 'other' };
  const match = findClients(buyer.source, clients, buyer.prefix);
  const result: Interpretation = { kind, candidates: match.candidates, clientId: match.exact && match.candidates.length === 1 ? match.candidates[0].id : undefined, items: [], date: today(now), observation: '', installments: /parcel|vezes|\b\d+\s*x\s*\d/.test(clean) };
  if (kind === 'unknown') { result.question = 'Conte o que aconteceu: quem comprou, qual produto e por quanto? Também posso consultar extratos e pendências.'; return result; }
  if (kind === 'received') {
    result.period = /hoje/.test(clean) ? 'today' : /(?:este|esse|neste|nesse) mes/.test(clean) ? 'month' : 'all';
    result.filterClient = match.candidates.length > 0 || /\brecebi\s+(?:da|do|de)\s+/.test(clean);
    if (/ontem|semana|\d{1,2}\//.test(clean)) { result.period = undefined; result.question = 'Você quer o total de hoje, deste mês ou de todo o histórico?'; }
    if (result.filterClient && !result.clientId) result.question = 'De qual cliente? Escolha o nome certo.';
    return result;
  }
  if (kind === 'pending') return result;
  const observation = original.match(/\b(?:obs\.?|observa[çc][aã]o)\s*:\s*(.+)$/i);
  if (observation) { result.observation = observation[1].trim(); original = original.slice(0, observation.index).trim(); }
  const dateMatch = original.match(/\b(?:dia|em)\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/i);
  if (dateMatch) {
    result.date = `${dateMatch[3] ?? result.date.slice(0, 4)}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
    original = original.replace(dateMatch[0], '').trim();
    if (!validDate(result.date)) result.question = 'Qual é a data correta? Confira no resumo.';
  } else if (/\bontem\b/.test(normalize(original))) {
    const day = new Date(result.date + 'T12:00:00Z'); day.setUTCDate(day.getUTCDate() - 1); result.date = day.toISOString().slice(0, 10);
    original = original.replace(/\bontem\b/i, '');
  } else original = original.replace(/\bhoje\b/i, '');
  if (kind === 'balance' || kind === 'statement') return result;
  if (kind === 'payment') {
    if (/\b(?:vendi|comprou|levou)\b/.test(clean)) { result.question = 'Você quer anotar uma venda ou apenas um recebimento? Conte uma operação de cada vez.'; result.kind = 'unknown'; return result; }
    const values = original.match(new RegExp(`(?:R\\$\\s*)?${numberPattern}(?:\\s*(?:reais|real))?`, 'gi'));
    if (values?.length === 1) { try { const amount = brCents(values[0]); if (amount > 0) result.amountCents = amount; } catch { /* guided question */ } }
    if (!result.amountCents) result.question = 'Quanto ela pagou? Informe apenas o valor recebido agora.';
    return result;
  }
  if (buyer.mode === 'sentence') original = original.replace(/^.+?\s+(?:comprou|levou)\s+/i, '');
  else if (buyer.mode === 'prefix') { original = original.replace(saleCommand, ''); original = original.slice(buyerLength(original, match.candidates)).trim().replace(/^[:,]\s*/, ''); if (!match.candidates.length) result.needsReview = true; }
  else if (buyer.mode === 'recipient') {
    original = original.replace(saleCommand, ''); const recipient = original.match(recipientPattern);
    if (recipient) { const end = recipient.index! + recipient[0].indexOf(recipient[1]) + buyerLength(recipient[1], match.candidates); original = original.slice(0, recipient.index) + original.slice(end); }
  } else { original = ''; result.needsReview = true; }
  original = original.replace(/\s+(?:e\s+)?(?:ja\s+|já\s+)?pagou(?:\s+tudo)?\s*$/i, '').trim();
  const possible = original.split(/\s+e\s+/i).map(itemFrom);
  result.items = possible.length > 1 && possible.every(item => item.unitCents !== null || item.priceQuestion !== undefined) ? possible : original.split(/\s+e\s+(?=(?:\d+|um|uma|dois|duas|tr[eê]s|quatro|cinco)\s)/i).map(itemFrom);
  if (result.items.some(item => item.quantity > 20)) { result.needsReview = true; result.question = 'Confira a quantidade: esse número indica unidades ou faz parte do nome do produto?'; }
  if (result.items.some(item => !item.productName || item.unitCents === null)) result.question ??= 'Vamos conferir o produto, a quantidade e o valor por unidade? Você pode completar o resumo.';
  if (!result.clientId) result.question = match.candidates.length ? 'Qual dessas clientes? Confirme o nome para eu não anotar na pessoa errada.' : 'Para qual cliente? Escolha uma cliente cadastrada.';
  return result;
}
