'use client';

import { useState, FormEvent } from 'react';

interface RegisterProps {
  onRegisterSuccess: () => void;
}

export default function RegisterForm({ onRegisterSuccess }: RegisterProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, username }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setSuccess(true);
        // 注册成功后尝试自动登录
        try {
          // 在 Supabase 中，如果设置了需要邮箱验证，这里可能会失败
          const { error: loginError } = await fetch('/api/auth/login-after-register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          }).then(res => res.json());
          
          if (loginError) {
            console.log('自动登录失败，需要邮箱验证:', loginError);
          }
        } catch (loginErr) {
          console.error('自动登录错误:', loginErr);
        }
        
        setTimeout(() => {
          onRegisterSuccess();
        }, 2000);
      } else {
        setError(data.message || '注册失败');
      }
    } catch (err) {
      setError('注册请求失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
      <div className="text-center">
        <h1 className="text-3xl font-bold">创建管理员账户</h1>
        <p className="mt-2 text-gray-600">首次设置需要创建一个管理员账户</p>
      </div>
      
      {success ? (
        <div className="p-4 text-green-800 bg-green-100 rounded-md">
          <p>账户创建成功！</p>
          <p className="mt-2">根据 Supabase 配置，您可能需要:</p>
          <ol className="mt-2 ml-5 list-decimal">
            <li>检查您的邮箱（包括垃圾邮件文件夹）以验证您的账户</li>
            <li>点击邮件中的验证链接</li>
            <li>返回此页面并使用您的凭据登录</li>
          </ol>
          <p className="mt-2">正在跳转到登录页面...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-800 bg-red-100 rounded-md">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                用户名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="relative block w-full px-3 py-2 mt-1 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="请输入用户名"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                电子邮箱
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="relative block w-full px-3 py-2 mt-1 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="请输入电子邮箱"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="relative block w-full px-3 py-2 mt-1 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="请输入密码"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="relative flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md group hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {loading ? '注册中...' : '注册'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
