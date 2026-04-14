import React, { FC, useState, useMemo } from 'react';
import { useData } from '../../contexto/DataContext';
import { Card, Button, Modal } from '../common';
import { HistoryIcon, CalendarIcon, ShoppingCartIcon, CreditCardIcon, ChevronLeftIcon, ChevronRightIcon } from '../ui/Icons';
import { EmptyState } from '../ui/EmptyState';
import { Sale, Payment } from '../../types';

type Transaction = (Sale & { type: 'sale' }) | (Payment & { type: 'payment' });

const groupByDate = (transactions: Transaction[]) => {
    const groups = transactions.reduce((groups, tx) => {
        const date = (tx.type === 'sale' ? tx.saleDate : tx.paymentDate).split('T')[0];
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(tx);
        return groups;
    }, {} as Record<string, Transaction[]>);

    return Object.entries(groups).sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime());
};

const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Hoje';
    if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
    
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const Calendar: FC<{ onDateSelect: (date: string) => void; highlightedDates: Set<string>; }> = ({ onDateSelect, highlightedDates }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const changeMonth = (amount: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + amount);
            return newDate;
        });
    };

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();

        const blanks = Array(firstDayOfMonth).fill(null);
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        const today = new Date();
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

        return [...blanks, ...days].map((day, index) => {
            if (!day) return <div key={`blank-${index}`} className="w-10 h-10"></div>;

            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isHighlighted = highlightedDates.has(dateString);
            const isToday = isCurrentMonth && day === today.getDate();

            return (
                <div key={day} className="flex justify-center items-center">
                    <button
                        onClick={() => onDateSelect(dateString)}
                        className={`w-10 h-10 rounded-full flex flex-col justify-center items-center transition-colors relative ${isToday ? 'bg-pink-500 text-white font-bold' : 'hover:bg-pink-100'}`}
                    >
                        {day}
                        {isHighlighted && <div className={`absolute bottom-1.5 w-1.5 h-1.5 rounded-full ${isToday ? 'bg-white' : 'bg-pink-500'}`}></div>}
                    </button>
                </div>
            );
        });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronLeftIcon className="w-5 h-5"/></button>
                <h3 className="font-bold text-lg text-gray-800">{currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronRightIcon className="w-5 h-5"/></button>
            </div>
            <div className="grid grid-cols-7 gap-y-2 text-center">
                {weekdays.map(day => <div key={day} className="font-medium text-xs text-gray-500">{day}</div>)}
                {renderCalendar()}
            </div>
        </div>
    );
};

export const History: FC = () => {
    const { sales, payments, getClientById } = useData();
    const [filteredDate, setFilteredDate] = useState<string | null>(null);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const highlightedDates = useMemo(() => {
      const dates = new Set<string>();
      sales.forEach(s => dates.add(new Date(s.saleDate + 'T00:00:00').toISOString().split('T')[0]));
      payments.forEach(p => dates.add(new Date(p.paymentDate + 'T00:00:00').toISOString().split('T')[0]));
      return dates;
    }, [sales, payments]);
    
    const transactions = useMemo(() => {
        const allTransactions: Transaction[] = [
            ...sales.map(s => ({ ...s, type: 'sale' as const })),
            ...payments.map(p => ({ ...p, type: 'payment' as const }))
        ];
        
        const sorted = allTransactions.sort((a, b) => {
            const dateA = new Date(a.type === 'sale' ? a.saleDate : a.paymentDate);
            const dateB = new Date(b.type === 'sale' ? b.saleDate : b.paymentDate);
            return dateB.getTime() - dateA.getTime();
        });

        if (filteredDate) {
            return sorted.filter(tx => {
                const txDate = (tx.type === 'sale' ? tx.saleDate : tx.paymentDate).split('T')[0];
                return txDate === filteredDate;
            });
        }
        return sorted;

    }, [sales, payments, filteredDate]);

    const groupedTransactions = useMemo(() => groupByDate(transactions), [transactions]);

    return (
        <Card>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
                <h1 className="text-2xl font-bold text-rose-800">Histórico de Transações 📜</h1>
                <div className="flex items-center gap-2">
                   {filteredDate && <Button variant="secondary" onClick={() => setFilteredDate(null)}>Limpar Filtro</Button>}
                   <Button onClick={() => setIsCalendarOpen(true)}>Filtrar por data</Button>
                </div>
            </div>

            <Modal isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} title="Selecione uma data">
                <Calendar
                    highlightedDates={highlightedDates}
                    onDateSelect={(date) => {
                        setFilteredDate(date);
                        setIsCalendarOpen(false);
                    }}
                />
            </Modal>

            {transactions.length > 0 ? (
                <div className="flow-root max-h-[60vh] overflow-y-auto pr-4 -mr-4">
                  <ul className="-mb-8">
                    {groupedTransactions.map(([date, txs], groupIndex) => (
                      <li key={date}>
                        <div className="relative pb-8">
                          {groupIndex !== groupedTransactions.length - 1 ? <span className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-pink-200" aria-hidden="true" /> : null}
                          <div className="relative flex items-start space-x-4">
                            <div>
                              <div className="h-10 w-10 rounded-full bg-pink-500 flex items-center justify-center ring-8 ring-pink-50">
                                <CalendarIcon className="h-5 w-5 text-white" />
                              </div>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5">
                              <p className="text-sm font-semibold text-gray-500">{formatDateHeader(date)}</p>
                              <div className="mt-2 space-y-3">
                                {txs.map(tx => {
                                    const client = getClientById(tx.clientId);
                                    if (tx.type === 'sale') {
                                        return (
                                            <div key={`sale-${tx.id}`} className="p-3 bg-white border border-gray-100 rounded-2xl flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                                                    <ShoppingCartIcon className="w-5 h-5 text-rose-500" />
                                                </div>
                                                <div className="flex-grow">
                                                    <p className="font-semibold text-gray-800">{tx.productName}</p>
                                                    <p className="text-sm text-gray-500">Venda para {client?.fullName || 'Cliente Removido'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-rose-600">-{tx.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                                    <p className="text-xs text-gray-400">{tx.quantity} un.</p>
                                                </div>
                                            </div>
                                        )
                                    } else {
                                        return (
                                             <div key={`payment-${tx.id}`} className="p-3 bg-white border border-gray-100 rounded-2xl flex items-center gap-4">
                                                 <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                                    <CreditCardIcon className="w-5 h-5 text-emerald-500" />
                                                </div>
                                                <div className="flex-grow">
                                                    <p className="font-semibold text-gray-800">Pagamento Recebido</p>
                                                    <p className="text-sm text-gray-500">De {client?.fullName || 'Cliente Removido'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-emerald-600">+{tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                                </div>
                                            </div>
                                        )
                                    }
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
            ) : (
                <EmptyState icon={HistoryIcon} title={filteredDate ? "Nenhuma transação nesta data" : "Nenhuma transação"} message={filteredDate ? "Tente limpar o filtro ou escolher outra data." : "Todas as suas vendas e pagamentos aparecerão aqui."} />
            )}
        </Card>
    );
};
