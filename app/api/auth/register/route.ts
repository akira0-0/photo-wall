import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServerClient';

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // 确保只有管理员或首次设置时可以访问此端点
    const setupKey = req.headers.get('X-Setup-Key');
    const isFirstSetup = await isFirstTimeSetup(supabase);
    
    if (!isFirstSetup && setupKey !== process.env.SETUP_KEY) {
      return NextResponse.json(
        { message: '未授权访问' },
        { status: 401 }
      );
    }

    const { email, password, username } = await req.json();
    
    // 验证输入
    if (!email || !password) {
      return NextResponse.json(
        { message: '邮箱和密码是必需的' },
        { status: 400 }
      );
    }

    // 创建用户
    console.log('尝试创建用户:', { email, username });
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          is_admin: true, // 第一个用户是管理员
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
      }
    });

    console.log('注册结果:', { data, error });

    if (error) {
      console.error('注册错误:', error);
      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: '注册成功，请检查您的邮箱以确认账户',
        user: data.user 
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('注册处理错误:', error);
    return NextResponse.json(
      { message: '服务器错误' },
      { status: 500 }
    );
  }
}

// 检查是否是首次设置（没有用户）
async function isFirstTimeSetup(supabase: any) {
  try {
    // 检查是否有任何用户
    const { data, error, count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });
    
    if (error) throw error;
    
    return count === 0;
  } catch (error) {
    console.error('检查首次设置错误:', error);
    return false;
  }
}
