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

export default function MobilePhotoUploader({ categories }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [parentCategoryId, setParentCategoryId] = useState<string>('');
  const [childCategoryId, setChildCategoryId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [uppy, setUppy] = useState<any>(null);
  const [selectedFilesCount, setSelectedFilesCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
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

  useEffect(() => {
    // 清理上一个 Uppy 实例
    if (uppy) {
      uppy.cancelAll && uppy.cancelAll(); // 如果有未完成的上传，先取消
      uppy.reset && uppy.reset(); // 重置 Uppy 状态
      setUppy(null);
    }

    // 只在模态窗口打开且选择了分类时创建 Uppy
    if (isOpen && childCategoryId && typeof Uppy === 'function') {
      const uppyInstance = new Uppy({
        id: 'photowall-uploader',
        autoProceed: false,
        debug: true,
        restrictions: {
          maxFileSize: 10 * 1024 * 1024, // 10MB
          allowedFileTypes: ['image/*'],
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
          flip: true,
          zoomIn: true,
          zoomOut: true,
          cropSquare: true,
        },
      });

      // 添加 Dashboard 插件
      uppyInstance.use(Dashboard, {
        inline: true,
        target: '#uppy-dashboard',
        height: 450,
        note: '可以一次选择多张照片，支持JPG和PNG格式',
        proudlyDisplayPoweredByUppy: false,
        // 隐藏Uppy的内置上传按钮，我们将使用自定义按钮
        hideUploadButton: true
      });

      // 监听文件选择事件
      uppyInstance.on('file-added', () => {
        // 更新选中的文件数量
        setSelectedFilesCount(uppyInstance.getFiles().length);
      });
      
      // 监听文件删除事件
      uppyInstance.on('file-removed', () => {
        // 更新选中的文件数量
        setSelectedFilesCount(uppyInstance.getFiles().length);
      });
      
      // 监听文件上传事件
      uppyInstance.on('upload', (data: any) => {
        // 设置上传状态
        setIsUploading(true);
        
        // 阻止 Uppy 默认上传行为
        uppyInstance.cancelAll();
        
        const fileIds = data.fileIDs || [];
        const files = fileIds.map((fileId: string) => uppyInstance.getFile(fileId));
        const totalFiles = files.length;
        
        if (totalFiles === 0) {
          return;
        }
        
        let successCount = 0;
        let failCount = 0;
        
        // 处理每个文件的上传
        files.forEach(async (file: any, index: number) => {
          try {
            uppyInstance.emit('upload-started', file);
            
            // 1. 获取预签名 URL
            const response = await fetch('/api/upload-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileType: file.type }),
            });
            
            if (!response.ok) {
              throw new Error(`获取上传地址失败: ${response.status}`);
            }
            
            const { signedUrl, imageUrl } = await response.json();
            
            // 2. 上传文件到 R2
            const uploadResponse = await fetch(signedUrl, {
              method: 'PUT',
              body: file.data,
              headers: { 'Content-Type': file.type },
            });
            
            if (!uploadResponse.ok) {
              throw new Error(`上传到存储失败: ${uploadResponse.status}`);
            }
            
            // 3. 保存到数据库
            const { error: insertError } = await supabase
              .from('photos')
              .insert({ categories_id: parseInt(childCategoryId), image_url: imageUrl });
            
            if (insertError) {
              throw new Error(`保存到数据库失败: ${insertError.message}`);
            }
            
            // 标记成功
            successCount++;
            uppyInstance.emit('upload-success', file, { status: 200, body: { url: imageUrl } });
            
            // 如果所有文件处理完毕，刷新页面
            if (successCount + failCount === totalFiles) {
              setIsUploading(false); // 重置上传状态
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            }
          } catch (err: any) {
            failCount++;
            console.error(`文件 ${file.name} 上传失败:`, err);
            uppyInstance.emit('upload-error', file, err);
            
            // 如果所有文件处理完毕，但有失败的，显示错误
            if (successCount + failCount === totalFiles && failCount > 0) {
              setError(`${failCount} 个文件上传失败，${successCount} 个成功`);
              setIsUploading(false); // 重置上传状态
            }
          }
        });
      });
      
      setUppy(uppyInstance);
    }
    
    return () => {
      if (uppy) {
        uppy.cancelAll && uppy.cancelAll(); // 取消所有上传
        uppy.reset && uppy.reset(); // 重置 Uppy 状态
      }
    };
  }, [isOpen, childCategoryId]);

  const handleOpenModal = () => {
    setIsOpen(true);
    setError(null);
  };

  const handleCloseModal = () => {
    if (uppy) {
      uppy.cancelAll && uppy.cancelAll(); // 取消所有上传
      // 不要在这里调用 reset() 因为这会导致 Uppy 实例被重置，而我们稍后要销毁它
    }
    setIsOpen(false);
    setParentCategoryId('');
    setChildCategoryId('');
    setError(null);
    setSelectedFilesCount(0);
    setIsUploading(false);
  };
  
  // 自定义上传函数
  const handleStartUpload = () => {
    if (uppy && selectedFilesCount > 0) {
      uppy.upload();
    }
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
              <>
                <div id="uppy-dashboard" className="mb-4"></div>
                
                {/* 自定义上传按钮 */}
                {selectedFilesCount > 0 && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={handleStartUpload}
                      disabled={isUploading}
                      className={`py-3 px-6 rounded-md font-semibold text-white ${
                        isUploading 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {isUploading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          上传中...
                        </span>
                      ) : (
                        `上传 ${selectedFilesCount} 张照片`
                      )}
                    </button>
                  </div>
                )}
              </>
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
