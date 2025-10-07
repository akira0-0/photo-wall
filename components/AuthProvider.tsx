'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Session } from '@supabase/supabase-js';
import Login from './Login';

interface AuthContextType {
  isAuthenticated: boolean;
  session: Session | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
  initialAuth: boolean;
}

export function AuthProvider({ children, initialAuth }: AuthProviderProps) {
  const [isAuthenticated, setAuthenticated] = useState(initialAuth);
  const [isLoaded, setIsLoaded] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // 检查 Supabase 会话
    const checkAuthSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSession(data.session);
          setAuthenticated(true);
        }
      } catch (error) {
        console.error('获取会话失败:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    checkAuthSession();

    // 设置认证状态监听
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (event === 'SIGNED_IN' && currentSession) {
          setSession(currentSession);
          setAuthenticated(true);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setAuthenticated(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 登出函数
  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setAuthenticated(false);
      setSession(null);
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  if (!isLoaded) {
    return <div className="flex items-center justify-center min-h-screen">加载中...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <Login />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, session, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
