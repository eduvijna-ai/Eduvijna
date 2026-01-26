import React, { createContext, useContext, useEffect, useState } from 'react';
import * as TokenStorage from '../services/tokenStorage';
import { login as apiLogin } from '../api/auth.api';

type User = { 
  id: string; 
  name?: string;
  username?: string;
  email?: string;
  role: 'student' | 'instructor' | 'admin';
  full_name?: string;
} | null;

type AuthContextValue = {
  user: User;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isTeacher: boolean;
  isStudent: boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(null);
  const [token, setToken] = useState<string | null>(null);

  // Helper functions to check user role
  const isTeacher = user?.role === 'instructor';
  const isStudent = user?.role === 'student';
  const isAdmin = user?.role === 'admin';

  // Load user data from token storage
  useEffect(() => {
    const loadUser = async () => {
      try {
        const accessToken = await TokenStorage.getAccessToken();
        const userData = await TokenStorage.getUserData();
        
        if (accessToken && userData) {
          setToken(accessToken);
          // Parse userData if it's a string
          const parsedUser = typeof userData === 'string' ? JSON.parse(userData) : userData;
          setUser(parsedUser as unknown as User);
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      }
    };

    loadUser();
  }, []);

  /**
   * Login function
   */
  const login = async (email: string, password: string) => {
    try {
      const result = await apiLogin({ email, password });
      
      // Set user and token in state
      setUser(result.user);
      setToken(result.tokens.accessToken);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  /**
   * Logout function
   */
  const logout = async () => {
    try {
      // Clear stored data
      await TokenStorage.clearAuthData();
      
      // Clear state
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  const value: AuthContextValue = {
    user,
    token,
    login,
    logout,
    isTeacher,
    isStudent,
    isAdmin,
  };

  // Always render children - don't block the app
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
