'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function UserManagement() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  
  // 创建新用户
  const createUser = async () => {
    try {
      setMessage('');
      setError('');
      
      // 使用管理员API创建用户
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // 自动验证邮箱
      });
      
      if (error) throw error;
      
      setMessage(`用户创建成功: ${email}`);
      setEmail('');
      setPassword('');
    } catch (err: any) {
      console.error('创建用户错误:', err);
      setError(err.message || '创建用户失败');
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
      <h1 className="text-2xl font-bold mb-4">用户管理工具</h1>
      
      {message && (
        <div className="mb-4 p-2 bg-green-100 text-green-800 rounded">
          {message}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-800 rounded">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">创建新用户</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">电子邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            onClick={createUser}
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            创建用户
          </button>
        </div>
      </div>
    </div>
  );
}
