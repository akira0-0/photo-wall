'use client';

import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

type Category = {
  id: number;
  name: string;
  parent_id: number | null;
};

type Props = {
  categories: Category[];
};

export default function UploadModal({ categories }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const [parentCategoryId, setParentCategoryId] = useState<string>('');
  const [childCategoryId, setChildCategoryId] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{current: number, total: number}>({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const { parentCategories, childCategoriesMap } = useMemo(() => {
    const parents = categories.filter(c => c.parent_id === null);
    const childrenMap: Record<string, Category[]> = {};
    categories.forEach(c => {
      if (c.parent_id !== null) {
        if (!childrenMap[c.parent_id]) {
          childrenMap[c.parent_id] = [];
        }
        childrenMap[c.parent_id].push(c);
      }
    });
    return { parentCategories: parents, childCategoriesMap: childrenMap };
  }, [categories]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(e.target.files);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || files.length === 0 || !childCategoryId) {
      setError("请选择文件和二级分类。");
      return;
    }
    
    setIsUploading(true);
    setError(null);
    setUploadProgress({ current: 0, total: files.length });

    try {
      // 记录所有上传结果
      const uploadResults = [];
      
      // 循环处理每个文件
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({ current: i, total: files.length });
        
        // 1. 获取预签名 URL
        const uploadUrlResponse = await fetch('/api/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileType: file.type }),
        });
        
        if (!uploadUrlResponse.ok) {
          console.error(`文件 ${file.name} 获取上传地址失败:`, await uploadUrlResponse.text());
          continue; // 跳过此文件，继续上传下一个
        }
        
        const { signedUrl, imageUrl } = await uploadUrlResponse.json();

        // 2. 上传文件到 R2
        const uploadToR2Response = await fetch(signedUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });
        
        if (!uploadToR2Response.ok) {
          console.error(`文件 ${file.name} 上传到 R2 失败:`, await uploadToR2Response.text());
          continue; // 跳过此文件，继续上传下一个
        }

        // 3. 将照片信息存入 Supabase
        const { error: insertError } = await supabase
          .from('photos')
          .insert({ categories_id: parseInt(childCategoryId), image_url: imageUrl });
          
        if (insertError) {
          console.error(`文件 ${file.name} 保存到数据库失败:`, insertError);
          continue; // 跳过此文件，继续上传下一个
        }
        
        uploadResults.push({ filename: file.name, success: true });
        console.log(`文件 ${i+1}/${files.length} 上传成功: ${file.name}`);
      }
      
      // 4. 成功后关闭弹窗并刷新页面
      const totalSuccess = uploadResults.filter(r => r.success).length;
      console.log(`批量上传完成: ${totalSuccess}/${files.length} 个文件上传成功`);
      
      setIsOpen(false);
      setFiles(null);
      setParentCategoryId('');
      setChildCategoryId('');
      setUploadProgress({ current: 0, total: 0 });
      
      // 强制刷新页面以确保获取最新数据
      console.log("上传成功，刷新页面...");
      window.location.reload(); // 使用完全刷新来确保获取最新数据

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        上传照片
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">上传新照片</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">选择文件（可多选）</label>
                <input 
                  type="file" 
                  onChange={handleFileChange} 
                  required 
                  className="w-full" 
                  multiple 
                  accept="image/*"
                />
                {files && files.length > 1 && (
                  <p className="text-sm text-blue-600 mt-1">已选择 {files.length} 个文件</p>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">一级分类</label>
                <select value={parentCategoryId} onChange={e => { setParentCategoryId(e.target.value); setChildCategoryId(''); }} required className="w-full p-2 border rounded">
                  <option value="">请选择</option>
                  {parentCategories.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {parentCategoryId && (
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">二级分类</label>
                  <select value={childCategoryId} onChange={e => setChildCategoryId(e.target.value)} required className="w-full p-2 border rounded">
                    <option value="">请选择</option>
                    {childCategoriesMap[parentCategoryId]?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
              
              {isUploading && uploadProgress.total > 0 && (
                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    上传进度: {uploadProgress.current}/{uploadProgress.total} 
                    ({Math.round((uploadProgress.current / uploadProgress.total) * 100)}%)
                  </p>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <button 
                  type="submit" 
                  disabled={isUploading} 
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
                >
                  {isUploading ? '上传中...' : files && files.length > 1 ? `批量上传 (${files.length} 个文件)` : '确认上传'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)} 
                  disabled={isUploading}
                  className="text-gray-600 disabled:text-gray-400"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
