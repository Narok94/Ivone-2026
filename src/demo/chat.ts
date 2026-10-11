export type Entry = { client: string; description: string; cents: number; kind: 'sale' | 'payment' };
export const initialEntries: Entry[] = [
  { client: 'Ana', description: 'Kit de cuidados', cents: 12000, kind: 'sale' },
  { client: 'Ana', description: 'Recebimento', cents: 4000, kind: 'payment' },
  { client: 'Bia', description: 'Conjunto de lingerie', cents: 9500, kind: 'sale' },
];
export const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const balance = (entries: Entry[], client: string) => entries.filter(e => e.client === client).reduce((sum, e) => sum + (e.kind === 'sale' ? e.cents : -e.cents), 0);
export function parseEntry(text: string): Entry | null {
  const match = text.trim().match(/^(venda|recebimento)\s+(Ana|Bia)\s+(.+?)\s+(\d+(?:[.,]\d{1,2})?)\s*$/i);
  if (!match) return null;
  const cents = Math.round(Number(match[4].replace(',', '.')) * 100);
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 100000000) return null;
  return { kind: match[1].toLowerCase() === 'venda' ? 'sale' : 'payment', client: match[2].toLowerCase() === 'ana' ? 'Ana' : 'Bia', description: match[3], cents };
}
export function demoRequested(path: string, search: string, mobile: boolean) {
  return path === '/demo' || (new URLSearchParams(search).get('modo') !== 'gestao' && mobile);
}
