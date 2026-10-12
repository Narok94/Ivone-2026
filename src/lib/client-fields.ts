import type { Client } from '../types';
export type ClientData = Omit<Client, 'id'>;
export const clientFields: [keyof ClientData, string][] = [['fullName', 'nome'], ['phone', 'telefone'], ['email', 'e-mail'], ['cpf', 'CPF'], ['cep', 'CEP'], ['street', 'rua'], ['number', 'número'], ['complement', 'complemento'], ['neighborhood', 'bairro'], ['city', 'cidade'], ['state', 'estado'], ['observation', 'observações']];
export function fieldValue(key: keyof ClientData, text: string) {
  const command = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const value = /^(?:nao informar|sem|limpar|pular)$/.test(command) ? '' : text.trim();
  if (key === 'fullName' && (!value || value.length > 300)) throw new Error('Qual é o nome completo? Use até 300 caracteres.');
  if (value.length > (key === 'observation' ? 2000 : 1000)) throw new Error('Esse texto ficou muito longo. Pode resumir?');
  if (key === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Qual é o e-mail correto?');
  if (key === 'state' && value && !/^[a-z]{2}$/i.test(value)) throw new Error('Qual é a sigla do estado? Por exemplo, SP.');
  if (key === 'phone' && value && !/^\+?[\d\s().-]{8,25}$/.test(value)) throw new Error('Qual é o telefone? Pode incluir DDD.');
  return value;
}
export function validateClientData(data: ClientData) {
  for (const [field] of clientFields) {
    if (typeof data[field] !== 'string') throw new Error('Confira os campos do cadastro.');
    fieldValue(field, data[field]);
  }
  if (data.cep && data.cep.replace(/\D/g, '').length !== 8) throw new Error('Confira o CEP: informe oito números ou deixe em branco.');
  return { ...data };
}
