import React, { FC, useState } from 'react';
import { useData } from './contexto/DataContext';
import { IvoneLayout } from './components/layout/IvoneLayout';

// Dashboard Components
import { Dashboard } from './components/dashboard/Dashboard';
import { ManageClients } from './components/dashboard/ManageClients';
import { SalesView } from './components/dashboard/SalesView';
import { AllPayments } from './components/dashboard/AllPayments';
import { PendingPayments } from './components/dashboard/PendingPayments';
import { ClientDetail } from './components/dashboard/ClientDetail';
import { Reports } from './components/dashboard/Reports';
import { History } from './components/dashboard/History';

// Form Components
import { ClientForm } from './components/forms/ClientForm';
import { SaleForm } from './components/forms/SaleForm';
import { PaymentForm } from './components/forms/PaymentForm';

// Common Components
import { Modal } from './components/common/Modal';

// Types
import { Sale, Payment, View } from './types';

const App: FC = () => {
    const [activeView, setActiveView] = useState<View>('dashboard');
    const [toast, setToast] = useState<string | null>(null);
    
    // State for editing/pre-filling
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [editingSale, setEditingSale] = useState<Sale | null>(null);
    const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

    const showToast = (message: string) => {
        setToast(message);
        setTimeout(() => setToast(null), 3000);
    };

    const handleNavigate = (view: View, clientId?: string) => {
        if (clientId) setSelectedClientId(clientId);
        setActiveView(view);
    };

    const handleViewClient = (clientId: string) => {
        setSelectedClientId(clientId);
        setActiveView('client_detail');
    };

    const handleEditSale = (sale: Sale) => {
        setEditingSale(sale);
        setActiveView('add_sale');
    };

    const handleEditPayment = (payment: Payment) => {
        setEditingPayment(payment);
        setActiveView('add_payment');
    };

    // Standard User View Logic
    return (
        <IvoneLayout activeView={activeView} setActiveView={(v) => setActiveView(v as View)} toast={toast} setToast={setToast}>
            {activeView === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
            {activeView === 'clients' && <ManageClients setActiveView={(v) => setActiveView(v as View)} onViewClient={handleViewClient} showToast={showToast} />}
            {activeView === 'add_client' && (
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-2xl font-bold text-rose-800 mb-6">Cadastrar Novo Cliente 👤</h1>
                    <ClientForm onDone={() => setActiveView('clients')} />
                </div>
            )}
            {activeView === 'client_detail' && selectedClientId && (
                <ClientDetail clientId={selectedClientId} onNavigate={handleNavigate} />
            )}
            {activeView === 'add_sale' && (
                <SaleForm 
                    editingSale={editingSale} 
                    prefilledClientId={selectedClientId}
                    onSaleSuccess={() => {
                        setEditingSale(null);
                        setActiveView('sales_view');
                        showToast(editingSale ? 'Venda atualizada!' : 'Venda registrada!');
                    }} 
                />
            )}
            {activeView === 'add_payment' && (
                <PaymentForm 
                    editingPayment={editingPayment}
                    prefilledClientId={selectedClientId}
                    onPaymentSuccess={() => {
                        setEditingPayment(null);
                        setActiveView('all_payments');
                        showToast(editingPayment ? 'Pagamento atualizado!' : 'Pagamento recebido!');
                    }}
                />
            )}
            {activeView === 'sales_view' && <SalesView onEditSale={handleEditSale} showToast={showToast} />}
            {activeView === 'all_payments' && <AllPayments onEditPayment={handleEditPayment} showToast={showToast} />}
            {activeView === 'pending_payments' && <PendingPayments onViewClient={handleViewClient} />}
            {activeView === 'reports' && <Reports />}
            {activeView === 'history' && <History />}
        </IvoneLayout>
    );
};

export default App;
