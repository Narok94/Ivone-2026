import React, { FC, useState } from 'react';
import { useAuth } from './contexto/AuthContext';
import { useData } from './contexto/DataContext';
import { IvoneLayout } from './components/layout/IvoneLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { LoginScreen } from './components/auth/LoginScreen';

// Dashboard Components
import { Dashboard } from './components/dashboard/Dashboard';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { ManageUsers } from './components/dashboard/ManageUsers';
import { UserSummaryView } from './components/dashboard/UserSummaryView';
import { ManageClients } from './components/dashboard/ManageClients';
import { SalesView } from './components/dashboard/SalesView';
import { AllPayments } from './components/dashboard/AllPayments';
import { StockManager } from './components/dashboard/StockManager';
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
    const { currentUser, logout } = useAuth();
    const isAuthenticated = currentUser !== null;
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

    if (!isAuthenticated) {
        return <LoginScreen />;
    }

    // Admin View Logic
    if (currentUser?.role === 'admin') {
        const adminActiveView = activeView === 'dashboard' ? 'admin_dashboard' : activeView;
        
        return (
            <AdminLayout activeView={adminActiveView as any} setActiveView={setActiveView as any}>
                {adminActiveView === 'admin_dashboard' && <AdminDashboard />}
                {adminActiveView === 'manage_users' && <ManageUsers showToast={showToast} />}
                {adminActiveView === 'user_summary' && <UserSummaryView />}
            </AdminLayout>
        );
    }

    // Standard User View Logic
    return (
        <IvoneLayout activeView={activeView as any} setActiveView={setActiveView as any} toast={toast} setToast={setToast}>
            {activeView === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
            {activeView === 'clients' && <ManageClients setActiveView={setActiveView} onViewClient={handleViewClient} showToast={showToast} />}
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
            {activeView === 'stock' && <StockManager />}
            {activeView === 'reports' && <Reports />}
            {activeView === 'history' && <History />}
        </IvoneLayout>
    );
};

export default App;
