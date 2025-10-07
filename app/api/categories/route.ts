import { supabase } from '@/lib/supabaseClient';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {    
    const { name, parent_id } = await request.json();

    // 验证分类名称是否存在
    if (!name) {
      return NextResponse.json({ error: '分类名称是必填项。' }, { status: 400 });
    }

    // 向 Supabase 插入新数据
    const { data, error } = await supabase
      .from('categories')
      .insert({ name, parent_id: parent_id || null }) // 如果 parent_id 不存在，则设为 null
      .select()
      .single();

    if (error) {
      console.error('创建分类时出错:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // 清除缓存，让前端能立即看到新分类
    // 如果是在某个分类页面下创建子分类，则刷新该分类页面
    if (parent_id) {
        revalidatePath(`/category/${parent_id}`);
    }
    // 总是刷新主页
    revalidatePath('/');

    return NextResponse.json(data);

  } catch (e) {
    console.error('处理请求时出错:', e);
    return NextResponse.json({ error: '服务器内部错误。' }, { status: 500 });
  }
}
