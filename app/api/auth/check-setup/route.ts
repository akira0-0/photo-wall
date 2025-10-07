import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServerClient';

// 禁用路由缓存，确保每次请求都是动态处理的
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServerClient();
    
    // 检查是否有任何用户
    const { data, count, error } = await supabase
      .from('auth.users')  // 或者您的用户表名
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('检查用户存在性出错:', error);
      return NextResponse.json(
        { error: error.message }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      isFirstSetup: count === 0,
      usersCount: count
    });

  } catch (e) {
    console.error('处理请求时出错:', e);
    return NextResponse.json(
      { error: '服务器内部错误。' }, 
      { status: 500 }
    );
  }
}
