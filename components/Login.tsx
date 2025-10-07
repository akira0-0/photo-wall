import { useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 使用 Supabase 认证
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('登录API错误:', error);
        
        // 提供更具体的错误信息
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('登录失败: 邮箱或密码不正确。如果您确定凭据无误，请联系管理员。');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('登录失败: 您的邮箱尚未验证，请检查邮箱并点击验证链接。');
        } else {
          throw error;
        }
      }
      
      // 登录成功，但如果没有设置session，可能还是有问题
      if (!data.session) {
        console.warn('登录成功但没有session返回');
        throw new Error('登录过程中出现异常，请重试或联系管理员');
      }
      
      // 登录成功由 AuthProvider 中的 onAuthStateChange 处理
    } catch (err: any) {
      console.error('登录错误:', err);
      setError(err.message || '登录失败，请检查您的邮箱和密码');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        throw error;
      }
      
      // 注册成功
      setError('');
      alert('注册成功！请检查您的邮箱并验证账户，然后再次登录。');
      setShowRegister(false);
    } catch (err: any) {
      console.error('注册错误:', err);
      setError(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold">照片墙</h1>
          <p className="mt-2 text-gray-600">{showRegister ? '创建新账户' : '请登录以访问'}</p>
        </div>
        
        {showRegister ? (
          <form onSubmit={handleRegister} className="mt-8 space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-800 bg-red-100 rounded-md">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
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
                className="relative flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md group hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                {loading ? '注册中...' : '注册'}
              </button>
            </div>
            
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setShowRegister(false)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                已有账户？返回登录
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-800 bg-red-100 rounded-md">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
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
                  autoComplete="current-password"
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
                {loading ? '登录中...' : '登录'}
              </button>
            </div>
            
            <div className="flex justify-between mt-4">
              <button
                type="button"
                onClick={() => setShowRegister(true)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                没有账户？注册新账户
              </button>
              
              <a href="/login-guide" className="text-sm text-indigo-600 hover:text-indigo-800">
                登录遇到问题？
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
