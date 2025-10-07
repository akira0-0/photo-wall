import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
 
// 定义哪些路径需要认证
const protectedPaths = [
  '/',
  '/category',
];

// 不需要认证的API路径
const publicApiPaths = [
  '/api/auth',
];
 
export async function middleware(request: NextRequest) {
  // 获取路径
  const path = request.nextUrl.pathname;
  
  // API路径中的公开路径直接放行
  if (publicApiPaths.some(p => path.startsWith(p))) {
    return NextResponse.next();
  }
  
  // 创建响应对象
  const res = NextResponse.next();
  
  // 检查是否为需要保护的路径
  const isProtectedPath = protectedPaths.some(p => path === p || path.startsWith(`${p}/`));
  
  if (isProtectedPath) {
    // 对于API请求，我们在API路由内部检查认证状态
    // 前端登录由 AuthProvider 组件处理
    // 这里不做额外的认证检查，让客户端处理认证
  }
 
  return res;
}
 
export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了以下情况:
     * - 静态文件和Next.js内部路径
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
