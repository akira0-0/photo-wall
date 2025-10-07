import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const sitePassword = process.env.SITE_PASSWORD;

    if (!sitePassword) {
      return NextResponse.json(
        { message: '站点密码未配置' },
        { status: 500 }
      );
    }

    if (password === sitePassword) {
      return NextResponse.json(
        { 
          success: true,
          message: '登录成功'
        },
        { 
          status: 200,
          headers: {
            'Set-Cookie': `auth=${process.env.SITE_PASSWORD}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 7}` // 7天有效期
          }
        }
      );
    } else {
      return NextResponse.json(
        { message: '密码错误' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('登录处理错误:', error);
    return NextResponse.json(
      { message: '服务器错误' },
      { status: 500 }
    );
  }
}
