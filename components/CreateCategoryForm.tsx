'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  parentId?: number | null; // 可选的父分类ID
  // 用于创建子分类时的标题
  parentCategoryName?: string;
};

export default function CreateCategoryForm({ parentId = null, parentCategoryName }: Props) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('分类名称不能为空。');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      // 直接使用客户端 Supabase（已包含用户的认证令牌）
      const { data, error: supabaseError } = await supabase
        .from('categories')
        .insert({ name, parent_id: parentId || null })
        .select()
        .single();

      if (supabaseError) {
        throw new Error(supabaseError.message || '创建失败。');
      }

      // 成功后清空输入框并刷新页面数据
      setName('');
      // 使用Next.js路由刷新机制，会重新获取服务器数据因为我们禁用了缓存
      router.refresh();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mt-6">
      <h3 className="font-semibold text-lg mb-2">
        {parentId ? `在“${parentCategoryName}”下创建新事件` : '创建新年份分类'}
      </h3>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={parentId ? '例如：春季出游' : '例如：2024年'}
          className="flex-grow p-2 border rounded"
          required
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
        >
          {isSubmitting ? '创建中...' : '创建'}
        </button>
      </form>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}
