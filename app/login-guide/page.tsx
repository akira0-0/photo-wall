'use client';

import Link from 'next/link';

export default function LoginGuide() {
  return (
    <div className="min-h-screen bg-gray-100 py-10">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-center mb-8">照片墙登录指南</h1>
        
        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">登录问题解决方案</h2>
            <p className="mb-4">如果您在登录时遇到"Invalid login credentials"（无效的登录凭据）错误，可能是由以下原因导致的：</p>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>注意：</strong> 照片墙使用 Supabase 身份验证系统，需要有效的邮箱和密码才能登录。
                  </p>
                </div>
              </div>
            </div>
            
            <ul className="list-disc pl-5 space-y-2">
              <li>您输入的<strong>邮箱或密码不正确</strong>，请仔细检查是否有拼写错误。</li>
              <li>您的<strong>账户尚未创建</strong>，需要先注册一个账户。</li>
              <li>如果您刚刚注册，可能需要<strong>验证您的电子邮箱</strong>（请检查收件箱）。</li>
              <li>如果您忘记了密码，可以使用<strong>重置密码</strong>功能。</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-3">首次登录</h2>
            <p>如果这是您第一次访问照片墙，并且您是网站管理员：</p>
            <ol className="list-decimal pl-5 space-y-2 mt-2">
              <li>请使用注册功能创建一个新账户</li>
              <li>验证您的电子邮箱（检查邮箱中的验证链接）</li>
              <li>返回登录页面，使用新创建的凭据登录</li>
            </ol>
          </section>
          
          <div className="border-t border-gray-200 pt-4 mt-6">
            <Link href="/" className="text-indigo-600 hover:text-indigo-800">
              返回登录页面
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
