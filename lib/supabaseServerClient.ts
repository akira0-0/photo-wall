import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL or Anon Key is missing in environment variables.");
}

// 创建服务端 Supabase 客户端
export const createServerClient = () => {
    const cookieStore = cookies();
    
    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false
        }
    })
}
