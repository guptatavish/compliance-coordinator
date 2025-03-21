
import React, { createContext, useContext, useState, useEffect } from 'react';

type UserRole = 'compliance_officer' | 'finance_manager' | 'executive' | null;

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  signup: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem('complianceSync_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  // In a real app, this would communicate with a backend
  const login = async (email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create mock user for demo
      const newUser = {
        id: `user-${Date.now()}`,
        name: email.split('@')[0],
        email,
        role,
        company: 'Demo Company'
      };
      
      // Save to localStorage for persistence
      localStorage.setItem('complianceSync_user', JSON.stringify(newUser));
      setUser(newUser);
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error('Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create new user
      const newUser = {
        id: `user-${Date.now()}`,
        name,
        email,
        role,
      };
      
      // Save to localStorage for persistence
      localStorage.setItem('complianceSync_user', JSON.stringify(newUser));
      setUser(newUser);
    } catch (error) {
      console.error('Signup failed:', error);
      throw new Error('Unable to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('complianceSync_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
