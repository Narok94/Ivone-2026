import { FinancialOperation, lineTotal, MAX_CENTS, sumCents, validDate } from './finance';
export const pendingKey = (userId: string) => `ivone_pending_operation:${userId}`;
export function readPending(userId: string): FinancialOperation | null {
  const raw = sessionStorage.getItem(pendingKey(userId));
  if (!raw) return null;
  try {
    const operation = JSON.parse(raw);
    if (operation?.confirmed !== true || typeof operation.operationId !== 'string' || !/^[a-f\d-]{36}$/i.test(operation.operationId) || !['sale', 'payment', 'edit_sale', 'edit_payment', 'delete_sale', 'delete_payment'].includes(operation.kind)) throw new Error();
    if (typeof operation.clientId !== 'string' || !/^[a-f\d-]{36}$/i.test(operation.clientId) || !validDate(operation.date) || typeof operation.observation !== 'string') throw new Error();
    if (operation.kind === 'sale' || operation.kind === 'edit_sale') {
      if (!Array.isArray(operation.items) || !operation.items.length || operation.items.length > 50) throw new Error();
      const total = sumCents(operation.items.map((item: any) => { if (!item?.productName?.trim()) throw new Error(); return lineTotal(item.quantity, item.unitCents); }));
      if (!Number.isSafeInteger(operation.receivedCents) || operation.receivedCents < 0 || operation.receivedCents > total) throw new Error();
    }
    if ((operation.kind === 'payment' || operation.kind === 'edit_payment') && (!Number.isSafeInteger(operation.amountCents) || operation.amountCents <= 0 || operation.amountCents > MAX_CENTS)) throw new Error();
    if ((operation.kind.startsWith('edit_') || operation.kind.startsWith('delete_')) && !/^[a-f\d-]{36}$/i.test(operation.targetId ?? '')) throw new Error();
    return operation;
  } catch { throw new Error('Há uma confirmação pendente inválida neste navegador. Consulte o histórico antes de iniciar outra operação.'); }
}
