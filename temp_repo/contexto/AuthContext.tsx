import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { User } from '../types';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  login: (username: string, pass: string) => void;
  logout: () => void;
  addUser: (username: string, pass: string, firstName: string, lastName: string) => void;
  updateUser: (user: Partial<Omit<User, 'password' | 'role' | 'id'>> & { id: string }) => void;
  updatePassword: (userId: string, newPass: string, oldPass?: string) => void;
  deleteUser: (userId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const initialUsers: User[] = [
    { id: '1', username: 'admin', password: 'admin', role: 'admin', firstName: 'Admin', lastName: 'Master', theme: 'default' },
    { id: '2', username: 'ivone', password: 'ivone1234', role: 'user', firstName: 'Ivone', lastName: 'Silva', theme: 'default' },
];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useLocalStorage<User[]>('users', initialUsers);
  const [currentUser, setCurrentUser] = useLocalStorage<User | null>('currentUser', null);
  
  const login = useCallback((username: string, pass: string) => {
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === pass);
    if (user) {
        setCurrentUser(user);
    } else {
        throw new Error('Usuário ou senha inválidos.');
    }
  }, [users, setCurrentUser]);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, [setCurrentUser]);
  
  const addUser = useCallback((username: string, pass: string, firstName: string, lastName: string) => {
      if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
          throw new Error('Este nome de usuário já existe.');
      }
      const newUser: User = {
          id: crypto.randomUUID(),
          username,
          password: pass,
          role: 'user',
          firstName,
          lastName,
          theme: 'default',
      };
      setUsers(prev => [...prev, newUser]);
  }, [users, setUsers]);

  const updateUser = useCallback((updatedUserData: Partial<Omit<User, 'password' | 'role' | 'id'>> & { id: string }) => {
      setUsers(prev => prev.map(u => u.id === updatedUserData.id ? { ...u, ...updatedUserData } : u));
      if (currentUser?.id === updatedUserData.id) {
          setCurrentUser(prev => prev ? { ...prev, ...updatedUserData } : null);
      }
  }, [setUsers, currentUser, setCurrentUser]);
  
  const updatePassword = useCallback((userId: string, newPass: string, oldPass?: string) => {
      setUsers(prev => {
          const userIndex = prev.findIndex(u => u.id === userId);
          if (userIndex === -1) {
              throw new Error("Usuário não encontrado.");
          }
          const user = prev[userIndex];
          
          // If oldPass is provided, it's a user changing their own password, so we must verify it.
          if (oldPass && user.password !== oldPass) {
              throw new Error("A senha atual está incorreta.");
          }
          
          // Admins can change passwords without the old one.
          if (currentUser?.role !== 'admin' && !oldPass) {
              throw new Error("Verificação de senha antiga necessária.");
          }

          const updatedUsers = [...prev];
          updatedUsers[userIndex] = { ...user, password: newPass };
          return updatedUsers;
      });
  }, [setUsers, currentUser]);

  const deleteUser = useCallback((userId: string) => {
      const userToDelete = users.find(u => u.id === userId);
      if (userToDelete?.role === 'admin') {
          throw new Error('Não é possível excluir o usuário administrador.');
      }
      setUsers(prev => prev.filter(u => u.id !== userId));
  }, [users, setUsers]);


  const value = {
    currentUser,
    users,
    login,
    logout,
    addUser,
    updateUser,
    updatePassword,
    deleteUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};