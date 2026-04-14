import React, { createContext, useContext, ReactNode, useCallback, useState, useEffect } from 'react';
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
    { id: '1', username: 'admin', password: 'admin', role: 'admin', firstName: 'Admin', lastName: 'Master' },
    { id: '2', username: 'ivone', password: 'ivone1234', role: 'user', firstName: 'Ivone', lastName: 'Silva' },
];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useLocalStorage<User | null>('currentUser', null);
  const [users, setUsers] = useState<User[]>([]);

  const fetchUsers = useCallback(async () => {
    // In a real app, this would be protected or only for admins
    // For now, we'll just fetch them to keep the UI working
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser'); // Force clear
  }, [setCurrentUser]);

  useEffect(() => {
    // Validate currentUser ID is a UUID (to clear legacy '1', '2' IDs)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (currentUser && !uuidRegex.test(currentUser.id)) {
      console.warn('Legacy user ID detected, logging out...');
      logout();
      return; // Stop here
    }
    fetchUsers();
  }, [fetchUsers, currentUser, logout]);
  
  const login = useCallback(async (username: string, pass: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: pass }),
    });
    
    if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
    } else {
        let errorMessage = 'Usuário ou senha inválidos.';
        try {
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const err = await res.json();
                errorMessage = err.error || errorMessage;
            }
        } catch (e) {
            console.error('Error parsing login error:', e);
        }
        throw new Error(errorMessage);
    }
  }, [setCurrentUser]);

  const addUser = useCallback(async (username: string, pass: string, firstName: string, lastName: string) => {
      const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password: pass, firstName, lastName, role: 'user' }),
      });
      if (!res.ok) {
          let errorMessage = `Erro ${res.status}: ao criar usuário.`;
          try {
              const contentType = res.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                  const err = await res.json();
                  errorMessage = err.error || errorMessage;
              } else {
                  const text = await res.text();
                  errorMessage = text || errorMessage;
              }
          } catch (e) {
              console.error('Error parsing error response:', e);
          }
          throw new Error(errorMessage);
      }
      fetchUsers();
  }, [fetchUsers]);

  const updateUser = useCallback(async (updatedUserData: Partial<Omit<User, 'password' | 'role' | 'id'>> & { id: string }) => {
      const res = await fetch(`/api/users/${updatedUserData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedUserData),
      });
      if (!res.ok) {
          let errorMessage = 'Erro ao atualizar usuário.';
          try {
              const contentType = res.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                  const err = await res.json();
                  errorMessage = err.error || errorMessage;
              }
          } catch (e) {
              console.error('Error parsing update user error:', e);
          }
          throw new Error(errorMessage);
      }
      fetchUsers();
      if (currentUser?.id === updatedUserData.id) {
          setCurrentUser(prev => prev ? { ...prev, ...updatedUserData } : null);
      }
  }, [fetchUsers, currentUser, setCurrentUser]);
  
  const updatePassword = useCallback(async (userId: string, newPass: string, oldPass?: string) => {
      const res = await fetch(`/api/users/${userId}/password`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPassword: newPass, oldPassword: oldPass }),
      });
      if (!res.ok) {
          let errorMessage = 'Erro ao atualizar senha.';
          try {
              const contentType = res.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                  const err = await res.json();
                  errorMessage = err.error || errorMessage;
              }
          } catch (e) {
              console.error('Error parsing update password error:', e);
          }
          throw new Error(errorMessage);
      }
  }, []);

  const deleteUser = useCallback(async (userId: string) => {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) {
          let errorMessage = 'Erro ao excluir usuário.';
          try {
              const contentType = res.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                  const err = await res.json();
                  errorMessage = err.error || errorMessage;
              }
          } catch (e) {
              console.error('Error parsing delete user error:', e);
          }
          throw new Error(errorMessage);
      }
      fetchUsers();
  }, [fetchUsers]);


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