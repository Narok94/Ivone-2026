import React, { useState } from 'react';
import type { Client } from '../../types';
import { Interpretation, ParsedItem } from '../../lib/conversation';
import { brCents, currency, decimal, lineTotal, validDate } from '../../lib/finance';
export function OperationEditor({ value, clients, onDone, onCancel }: { value: Interpretation; clients: Client[]; onDone: (value: Interpretation) => void; onCancel: () => void }) {
  const [clientId, setClientId] = useState(value.clientId ?? '');
  const [date, setDate] = useState(value.date);
  const [observation, setObservation] = useState(value.observation);
  const [amount, setAmount] = useState(value.amountCents ? String(value.amountCents / 100).replace('.', ',') : '');
  const [items, setItems] = useState(() => (value.items.length ? value.items : [{ productName: '', productCode: '', quantity: 1, unitCents: null }]).map(item => ({ ...item, quantityText: String(item.quantity), priceText: item.unitCents ? String(item.unitCents / 100).replace('.', ',') : '' })));
  const [error, setError] = useState('');
  const change = (index: number, key: string, text: string) => setItems(old => old.map((item, i) => i === index ? { ...item, [key]: text } : item));
  function clarifyPrice(index: number, total: boolean) {
    try {
      const item = items[index]; const quantity = Number(item.quantityText);
      const unitCents = total ? item.priceQuestion! / quantity : item.priceQuestion!;
      lineTotal(quantity, unitCents); change(index, 'priceText', decimal(unitCents).replace('.', ',')); setError('');
    } catch { setError('Esse total não corresponde a um preço exato em centavos para a quantidade informada. Confira a quantidade ou divida o pedido em itens com preços diferentes.'); }
  }
  return <form className="chat-confirm chat-editor" aria-label="Corrigir resumo" onSubmit={event => {
    event.preventDefault();
    try {
      if (!clients.some(c => c.id === clientId) || !validDate(date)) throw new Error('Confira a cliente e a data.');
      let parsedItems: ParsedItem[] = [];
      let amountCents: number | undefined;
      if (value.kind === 'sale') parsedItems = items.map(item => { const quantity = Number(item.quantityText); const unitCents = brCents(item.priceText); lineTotal(quantity, unitCents); if (!item.productName.trim()) throw new Error('Informe o nome do produto.'); return { productName: item.productName.trim(), productCode: item.productCode, quantity, unitCents }; });
      else { amountCents = brCents(amount); if (amountCents <= 0) throw new Error('Informe quanto foi recebido.'); }
      onDone({ ...value, clientId, date, observation, items: parsedItems, amountCents, question: undefined, needsReview: false });
    } catch (error: any) { setError(error.message); }
  }}>
    <h2>Vamos conferir</h2>
    <label>Cliente<select aria-label="Cliente" value={clientId} onChange={event => setClientId(event.target.value)} required><option value="">Escolha a cliente</option>{clients.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}</select></label>
    <label>Data<input type="date" aria-label="Data" value={date} onChange={event => setDate(event.target.value)} required /></label>
    {value.kind === 'sale' ? <>{items.map((item, index) => <fieldset key={index}>
      <legend>Produto {index + 1}</legend>
      <label>Produto<input aria-label={`Produto ${index + 1}`} value={item.productName} onChange={event => change(index, 'productName', event.target.value)} maxLength={300} required /></label>
      <div className="chat-editor-row"><label>Quantidade<input aria-label={`Quantidade ${index + 1}`} type="number" min={1} max={10000} step={1} value={item.quantityText} onChange={event => change(index, 'quantityText', event.target.value)} required /></label><label>Valor por unidade<input aria-label={`Valor por unidade ${index + 1}`} inputMode="decimal" value={item.priceText} onChange={event => change(index, 'priceText', event.target.value)} placeholder="35,00" required /></label></div>
      {item.priceQuestion && <><p>{currency(item.priceQuestion)} era por unidade ou o total desses itens?</p><div className="chat-confirm-secondary"><button type="button" onClick={() => clarifyPrice(index, false)}>Por unidade</button><button type="button" onClick={() => clarifyPrice(index, true)}>Total dos itens</button></div></>}
      {items.length > 1 && <button type="button" onClick={() => setItems(old => old.filter((_, i) => i !== index))}>Remover produto {index + 1}</button>}
    </fieldset>)}<button type="button" disabled={items.length >= 50} onClick={() => setItems(old => [...old, { productName: '', productCode: '', quantity: 1, unitCents: null, quantityText: '1', priceText: '' }])}>Adicionar produto</button></> : <label>Valor recebido<input aria-label="Valor recebido" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} required /></label>}
    <label>Observações<textarea aria-label="Observações" value={observation} onChange={event => setObservation(event.target.value)} maxLength={2000} /></label>
    {error && <p role="alert">{error}</p>}
    <button className="chat-confirm-primary" type="submit">Continuar</button><div className="chat-confirm-secondary"><button type="button" onClick={onCancel}>Cancelar</button></div>
  </form>;
}
