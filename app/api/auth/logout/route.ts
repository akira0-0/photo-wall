import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { success: true, message: '登出成功' },
    { 
      status: 200,
      headers: {
        'Set-Cookie': `auth=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0` // 清除认证Cookie
      }
    }
  );
}
