import React, { FC, useState, useEffect } from 'react';
import { useAuth } from '../../contexto/AuthContext';
import { Card, Button, Input } from '../common';
import { DogIcon, CatIcon } from '../ui/Icons';

export const LoginScreen: FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
    const { login } = useAuth();

    useEffect(() => {
        const rememberedUser = localStorage.getItem('rememberedUsername');
        if (rememberedUser) {
            setUsername(rememberedUser);
            setRememberMe(true);
        }

        // Check database connection
        const checkDbConnection = async () => {
            try {
                const response = await fetch('/api/health');
                const data = await response.json();
                setDbStatus(data.status === 'connected' ? 'connected' : 'error');
            } catch {
                setDbStatus('error');
            }
        };
        checkDbConnection();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        
        const cleanUsername = username.trim();
        const cleanPassword = password;

        if (!cleanUsername || !cleanPassword) {
            setError('Por favor, preencha todos os campos.');
            return;
        }

        try {
            await login(cleanUsername, cleanPassword);
            if (rememberMe) {
                localStorage.setItem('rememberedUsername', cleanUsername);
            } else {
                localStorage.removeItem('rememberedUsername');
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-rose-100 relative overflow-hidden">
            {/* Database Status Heart Indicator */}
            <div className="fixed bottom-3 right-3 z-50">
                <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="currentColor" 
                    className={`w-5 h-5 transition-colors drop-shadow-sm ${
                        dbStatus === 'checking' ? 'text-gray-300 animate-pulse' :
                        dbStatus === 'connected' ? 'text-green-500' : 'text-red-500'
                    }`}
                    title={dbStatus === 'connected' ? 'Banco de dados conectado' : 'Banco de dados desconectado'}
                >
                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
            </div>

             {/* Decorative Blobs */}
            <div className="absolute w-96 h-96 bg-purple-300 rounded-full -top-20 -left-20 opacity-30 mix-blend-multiply filter blur-xl animate-blob"></div>
            <div className="absolute w-96 h-96 bg-rose-300 rounded-full -bottom-24 right-10 opacity-30 mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
            <div className="absolute w-72 h-72 bg-pink-300 rounded-full -bottom-10 -left-10 opacity-30 mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>

            <DogIcon className="absolute -left-5 bottom-0 text-gray-300/50 opacity-50"/>
            <CatIcon className="absolute -right-5 top-0 text-gray-300/50 opacity-50"/>

            <main className="z-10 w-full max-w-md mx-auto p-6">
                <Card className="!p-8">
                     <h1 className="text-3xl font-extrabold text-center tracking-tight bg-gradient-to-r from-pink-500 to-rose-500 text-transparent bg-clip-text mb-2">
                        Sistema de Vendas
                    </h1>
                    <p className="text-center text-gray-500 mb-8">
                        Acesse sua conta para continuar.
                    </p>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input 
                            label="Usuário" 
                            id="username" 
                            value={username} 
                            onChange={e => setUsername(e.target.value)}
                            autoComplete="username"
                            required 
                        />
                        <Input 
                            label="Senha" 
                            id="password" 
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required 
                        />

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                                    Lembrar usuário
                                </label>
                            </div>
                        </div>

                        {error && <p className="text-red-500 text-sm text-center pt-2">{error}</p>}
                        {success && <p className="text-emerald-500 text-sm text-center pt-2 font-medium">{success}</p>}
                        
                        <Button type="submit" className="w-full !py-3 !text-base !mt-6">
                            Entrar
                        </Button>
                    </form>
                </Card>
            </main>
        </div>
    );
};
