import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL or Anon Key is missing in environment variables.");
}

// 创建 Supabase 客户端（可用于客户端和服务器端）
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
