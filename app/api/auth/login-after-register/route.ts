import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServerClient';

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { email, password } = await req.json();
    
    // 尝试登录用户
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      // 如果登录失败，可能需要邮箱验证
      console.error('自动登录失败:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { 
        success: true,
        message: '登录成功',
        user: data.user
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('登录处理错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
