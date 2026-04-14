import React, { FC, useState, useEffect } from 'react';
import { useAuth } from '../../contexto/AuthContext';
import { Card, Button, Input } from '../common';
import { DogIcon, CatIcon } from '../ui/Icons';

export const LoginScreen: FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();

    useEffect(() => {
        const rememberedUser = localStorage.getItem('rememberedUsername');
        if (rememberedUser) {
            setUsername(rememberedUser);
            setRememberMe(true);
        }
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        // Security: Trim inputs
        const cleanUsername = username.trim();
        const cleanPassword = password; // Don't trim password as spaces might be intentional

        if (!cleanUsername || !cleanPassword) {
            setError('Por favor, preencha todos os campos.');
            return;
        }

        try {
            login(cleanUsername, cleanPassword);
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
                    <p className="text-center text-gray-500 mb-8">Acesse sua conta para continuar.</p>
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
                        <Button type="submit" className="w-full !py-3 !text-base !mt-6">Entrar</Button>
                    </form>
                </Card>
            </main>
        </div>
    );
};
