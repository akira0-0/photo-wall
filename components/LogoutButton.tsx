'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';

export default function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { logout } = useAuth();
  
  const handleLogout = async () => {
    if (!confirm('确定要退出登录吗？')) return;
    
    setIsLoading(true);
    try {
      await logout();
    } catch (error) {
      console.error('登出失败', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="absolute top-0 right-0 px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-md transition"
    >
      {isLoading ? '处理中...' : '退出'}
    </button>
  );
}
