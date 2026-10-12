import { useRef, useState } from 'react';
import { useData } from '../contexto/DataContext';
import { ApiError } from './api';
import { currency, dateLabel, FinancialOperation, lineTotal, sumCents } from './finance';
import { readPending } from './pending-operation';
export function useFinancialCommit() {
  const { commitOperation, clients, user } = useData();
  const [loaded] = useState(() => { try { return { operation: readPending(String(user!.id)), error: '' }; } catch (error: any) { return { operation: null, error: error.message }; } });
  const pending = useRef<FinancialOperation | null>(loaded.operation);
  const [locked, setLocked] = useState(!!pending.current || !!loaded.error);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  function summary(operation: FinancialOperation) {
    const client = clients.find(c => c.id === operation.clientId)?.fullName ?? 'Cliente do registro anterior';
    const names = { sale: 'Nova venda', payment: 'Recebimento', edit_sale: 'Editar venda', edit_payment: 'Editar pagamento', delete_sale: 'Excluir venda', delete_payment: 'Excluir pagamento' };
    return `${names[operation.kind]}\nCliente: ${client}\nData: ${dateLabel(operation.date)}\n${operation.items?.map(item => `${item.quantity} ${item.productName}: ${currency(lineTotal(item.quantity, item.unitCents))}`).join('\n') ?? ''}\n${operation.items ? `Total: ${currency(sumCents(operation.items.map(item => lineTotal(item.quantity, item.unitCents))))}\n` : ''}${operation.kind === 'sale' ? `Recebido agora: ${currency(operation.receivedCents ?? 0)}\n` : ''}${operation.amountCents ? `Recebido: ${currency(operation.amountCents)}${operation.allowCredit ? ' (excedente como crédito)' : ''}\n` : ''}${operation.observation ? `Observações: ${operation.observation}\n` : ''}`;
  }
  async function execute(candidate: Omit<FinancialOperation, 'operationId' | 'confirmed'>) {
    if (busy.current) return null;
    if (loaded.error) { window.alert(loaded.error); return null; }
    const operation: FinancialOperation = pending.current ?? { ...candidate, operationId: crypto.randomUUID(), confirmed: true };
    if (!window.confirm(`${pending.current ? 'Reenviar a confirmação anterior sem duplicar:\n' : 'Confira antes de confirmar:\n'}${summary(operation)}\nConfirmar?`)) return null;
    busy.current = true; setSaving(true); pending.current = operation; setLocked(true);
    try { const result = await commitOperation(operation); pending.current = null; setLocked(false); return { ...result, completedKind: operation.kind }; }
    catch (error) { if (error instanceof ApiError && [400, 404, 422].includes(error.status)) { pending.current = null; setLocked(false); } throw error; }
    finally { busy.current = false; setSaving(false); }
  }
  return { execute, locked, saving, pendingSummary: loaded.error || (pending.current ? summary(pending.current) : '') };
}
