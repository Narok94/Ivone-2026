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
import { Login } from './components/auth/Login';

// Types
import { Sale, Payment, View } from './types';

const App: FC = () => {
    const { user, isLoading } = useData();
    const [activeView, setActiveView] = useState<View>('dashboard');
    const [viewStack, setViewStack] = useState<View[]>([]);
    const [toast, setToast] = useState<string | null>(null);
    
    // State for editing/pre-filling
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [editingSale, setEditingSale] = useState<Sale | null>(null);
    const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

    const showToast = (message: string) => {
        setToast(message);
        setTimeout(() => setToast(null), 3000);
    };

    const navigate = (view: View, pushToStack = true) => {
        if (pushToStack && activeView !== view) {
            setViewStack(prev => [...prev, activeView]);
        }
        setActiveView(view);
    };

    const handleBack = () => {
        if (viewStack.length > 0) {
            const previousView = viewStack[viewStack.length - 1];
            setViewStack(prev => prev.slice(0, -1));
            setActiveView(previousView);
        } else {
            setActiveView('dashboard');
        }
    };

    const handleNavigate = (view: View, clientId?: string) => {
        if (clientId) setSelectedClientId(clientId);
        navigate(view);
    };

    const handleViewClient = (clientId: string) => {
        setSelectedClientId(clientId);
        navigate('client_detail');
    };

    const handleEditSale = (sale: Sale) => {
        setEditingSale(sale);
        navigate('add_sale');
    };

    const handleEditPayment = (payment: Payment) => {
        setEditingPayment(payment);
        navigate('add_payment');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#fdf2f5] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) {
        return <Login />;
    }

    // Standard User View Logic
    return (
        <div className="relative min-h-screen">
            <IvoneLayout 
                activeView={activeView} 
                setActiveView={(v) => navigate(v as View)} 
                onBack={handleBack}
                toast={toast} 
                setToast={setToast}
            >
                <div className={!user ? 'blur-md pointer-events-none transition-all duration-700 opacity-50' : 'transition-all duration-700'}>
                    {activeView === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
                    {activeView === 'clients' && <ManageClients setActiveView={(v) => navigate(v as View)} onViewClient={handleViewClient} showToast={showToast} />}
                    {activeView === 'add_client' && (
                        <div className="max-w-2xl mx-auto">
                            <h1 className="text-2xl font-bold text-rose-800 mb-6">Cadastrar Novo Cliente 👤</h1>
                            <ClientForm onDone={() => navigate('clients')} />
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
                                navigate('dashboard');
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
                                navigate('dashboard');
                                showToast(editingPayment ? 'Pagamento atualizado!' : 'Pagamento recebido!');
                            }}
                        />
                    )}
                    {activeView === 'sales_view' && <SalesView onEditSale={handleEditSale} showToast={showToast} />}
                    {activeView === 'all_payments' && <AllPayments onEditPayment={handleEditPayment} showToast={showToast} />}
                    {activeView === 'pending_payments' && <PendingPayments onViewClient={handleViewClient} />}
                    {activeView === 'reports' && <Reports />}
                    {activeView === 'history' && <History />}
                </div>
            </IvoneLayout>

            {!user && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/10 backdrop-blur-[2px]">
                    <Login />
                </div>
            )}
        </div>
    );
};

export default App;
