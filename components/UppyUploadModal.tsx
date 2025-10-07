'use client';

import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

// 由于类型问题，我们在运行时动态导入 Uppy
let Uppy: any;
let Dashboard: any;
let ImageEditor: any;

// 定义类型
type UppyInstance = any;
type UppyFile = any;
type UppyResult = {
  successful: UppyFile[];
  failed: UppyFile[];
};

// 在客户端动态加载 Uppy 库
if (typeof window !== 'undefined') {
  Uppy = require('@uppy/core').default;
  Dashboard = require('@uppy/dashboard').default;
  ImageEditor = require('@uppy/image-editor').default;
}

type Category = {
  id: number;
  name: string;
  parent_id: number | null;
};

type Props = {
  categories: Category[];
};

export default function UppyUploadModal({ categories }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [parentCategoryId, setParentCategoryId] = useState<string>('');
  const [childCategoryId, setChildCategoryId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [uppy, setUppy] = useState<UppyInstance | null>(null);
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

  // 初始化 Uppy 实例
  useEffect(() => {
    if (isOpen && !uppy && childCategoryId) {
      // 创建 Uppy 实例
      const uppyInstance = new Uppy({
        id: 'photowall-uploader',
        autoProceed: false,
        debug: true,
        restrictions: {
          maxFileSize: 10 * 1024 * 1024, // 10MB
          allowedFileTypes: ['image/*'],
        },
        locale: {
          strings: {
            // 汉化一些关键的 UI 文本
            addMoreFiles: '添加更多文件',
            addingMoreFiles: '正在添加文件',
            dropPasteFiles: '拖放文件到这里，%{browseFiles}',
            browseFiles: '浏览文件',
            uploadXFiles: '上传 %{smart_count} 个文件',
            uploadXNewFiles: '上传 %{smart_count} 个新文件',
            upload: '上传',
            retry: '重试',
            retryUpload: '重试上传',
            done: '完成',
            filesUploadedOfTotal: '已上传 %{complete} / %{smart_count} 个文件',
            dataUploadedOfTotal: '已上传 %{complete} / %{total}',
            xTimeLeft: '剩余 %{time}',
            cancel: '取消',
            pause: '暂停',
            resume: '继续',
          },
        },
      });

      // 添加图片编辑功能
      uppyInstance.use(ImageEditor, {
        quality: 0.8,
        cropperOptions: {
          viewMode: 1,
          background: false,
        },
        actions: {
          revert: true,
          rotate: true,
          granularRotate: true,
          flip: true,
          zoomIn: true,
          zoomOut: true,
          cropSquare: true,
          cropWidescreen: true,
          cropWidescreenVertical: true,
        },
      });

      // 添加 Dashboard 插件
      uppyInstance.use(Dashboard, {
        inline: true,
        target: '#uppy-dashboard',
        height: 450,
        proudlyDisplayPoweredByUppy: false,
      });

      // 配置 XHR 上传
      // 在 Uppy 中使用自定义上传处理器
      uppyInstance.on('upload', (data: any) => {
        // 取消默认上传处理
        uppyInstance.cancelAll();
        
        // 自定义上传处理
        const files = data.fileIDs.map((fileID: string) => uppyInstance.getFile(fileID));
        
        Promise.all(files.map(async (file: UppyFile) => {
          try {
            // 1. 获取预签名 URL
            const uploadUrlResponse = await fetch('/api/upload-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileType: file.type }),
            });
            
            if (!uploadUrlResponse.ok) {
              throw new Error("获取上传地址失败");
            }
            
            const { signedUrl, imageUrl } = await uploadUrlResponse.json();
            
            // 2. 上传到 R2 
            const uploadToR2Response = await fetch(signedUrl, {
              method: 'PUT',
              // @ts-ignore - file.data 存在但类型定义不完整
              body: file.data,
              headers: { 'Content-Type': file.type },
            });
            
            if (!uploadToR2Response.ok) {
              throw new Error("上传到 R2 失败");
            }
            
            // 3. 保存到 Supabase
            const { error: insertError } = await supabase
              .from('photos')
              .insert({ categories_id: parseInt(childCategoryId), image_url: imageUrl });
            
            if (insertError) {
              throw new Error(insertError.message);
            }
            
            // 标记上传成功
            uppyInstance.emit('upload-success', file, {
              status: 200,
              body: { url: imageUrl },
            });
            
            return { success: true, file, url: imageUrl };
          } catch (error: any) {
            console.error("上传处理失败:", error);
            
            // 标记上传失败
            uppyInstance.emit('upload-error', file, error);
            
            return { success: false, file, error };
          }
        })).then((results: any[]) => {
          const successful = results.filter((r: any) => r.success);
          const failed = results.filter((r: any) => !r.success);
          
          // 模拟完成事件
          uppyInstance.emit('complete', {
            successful: successful.map((s: any) => s.file),
            failed: failed.map((f: any) => f.file)
          });
        });
      });

      // 监听上传完成事件
      uppyInstance.on('complete', (result: UppyResult) => {
        if (result.successful.length > 0) {
          console.log('上传成功:', result.successful);
          // 刷新页面以显示新上传的图片
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
        
        if (result.failed.length > 0) {
          console.error('上传失败:', result.failed);
          setError(`${result.failed.length} 张图片上传失败`);
        }
      });

      // 保存 Uppy 实例到状态
      setUppy(uppyInstance);
    }

    // 清理函数
    return () => {
      if (uppy) {
        uppy.cancelAll && uppy.cancelAll(); // 取消所有上传
        uppy.reset && uppy.reset(); // 重置 Uppy 状态
        setUppy(null);
      }
    };
  }, [isOpen, childCategoryId]);

  const handleOpenModal = () => {
    setIsOpen(true);
    setError(null);
  };

  const handleCloseModal = () => {
    if (uppy) {
      uppy.cancelAll();
    }
    setIsOpen(false);
    setParentCategoryId('');
    setChildCategoryId('');
    setError(null);
  };

  return (
    <>
      <button onClick={handleOpenModal} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        手机照片上传
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white p-4 rounded-lg shadow-xl w-full max-w-2xl mx-4 my-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">从手机上传照片</h2>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">一级分类</label>
              <select 
                value={parentCategoryId} 
                onChange={e => { setParentCategoryId(e.target.value); setChildCategoryId(''); }} 
                required 
                className="w-full p-2 border rounded"
              >
                <option value="">请选择</option>
                {parentCategories.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {parentCategoryId && (
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">二级分类</label>
                <select 
                  value={childCategoryId} 
                  onChange={e => setChildCategoryId(e.target.value)} 
                  required 
                  className="w-full p-2 border rounded"
                >
                  <option value="">请选择</option>
                  {childCategoriesMap[parentCategoryId]?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            {childCategoryId ? (
              <div id="uppy-dashboard" className="mb-4"></div>
            ) : (
              <div className="bg-gray-100 p-6 rounded text-center mb-4">
                <p>请先选择分类</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
