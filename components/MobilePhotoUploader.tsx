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
  const [errorDetails, setErrorDetails] = useState<{
    fileId?: string;
    fileName?: string; 
    message: string;
    timestamp?: string;
    retryable?: boolean;
  }[]>([]);
  const [uppy, setUppy] = useState<any>(null);
  const [selectedFilesCount, setSelectedFilesCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [retryingFiles, setRetryingFiles] = useState<string[]>([]);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'unknown'>('unknown');
  const router = useRouter();

  // 监控网络状态
  useEffect(() => {
    const updateNetworkStatus = () => {
      setNetworkStatus(navigator.onLine ? 'online' : 'offline');
      // 当网络恢复时，清除网络相关错误
      if (navigator.onLine && error === '网络连接失败') {
        setError(null);
        // 保留非网络错误
        setErrorDetails(prev => prev.filter(
          detail => !detail.message.includes('网络') && !detail.message.includes('离线')
        ));
      }
    };
    
    // 初始检查
    updateNetworkStatus();
    
    // 添加事件监听
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    
    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, [error]);

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
      
      // 监听上传进度事件
      uppyInstance.on('upload-progress', (file: UppyFile, progress: { bytesUploaded: number; bytesTotal: number }) => {
        const percentage = progress.bytesUploaded / progress.bytesTotal * 100;
        setUploadProgress(Math.round(percentage));
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
            // 记录具体错误
            const errorMessage = `文件 "${file.name}" 上传失败: ${err.message || '未知错误'}`;
            console.error(errorMessage, err);
            
            // 将错误详情添加到错误列表
            setErrorDetails(prev => [...prev, {
              fileId: file.id,
              fileName: file.name,
              message: err.message || '未知错误',
              timestamp: new Date().toISOString(),
              retryable: true
            }]);
            
            // 通知Uppy显示错误
            uppyInstance.emit('upload-error', file, err);
            
            // 如果所有文件处理完毕，但有失败的，显示错误
            if (successCount + failCount === totalFiles && failCount > 0) {
              // 设置主错误信息
              setError(`上传失败: ${failCount} 个文件上传失败，${successCount} 个成功`);
              setIsUploading(false); // 重置上传状态
              
              // 尝试给出具体建议
              if (err.message && err.message.includes('获取上传地址失败')) {
                setErrorDetails(prev => [...prev, {
                  message: '提示: 服务器无法生成上传地址，请稍后重试或联系管理员。',
                  timestamp: new Date().toISOString(),
                  retryable: true
                }]);
              } else if (err.message && err.message.includes('上传到存储失败')) {
                setErrorDetails(prev => [...prev, {
                  message: '提示: 文件无法上传到存储服务，可能是网络问题或文件过大。',
                  timestamp: new Date().toISOString(),
                  retryable: true
                }]);
              } else if (err.message && err.message.includes('保存到数据库失败')) {
                setErrorDetails(prev => [...prev, {
                  message: '提示: 文件已上传但无法保存到数据库，请联系管理员。',
                  timestamp: new Date().toISOString(),
                  retryable: false
                }]);
              }
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
    setErrorDetails([]);
    setSelectedFilesCount(0);
    setIsUploading(false);
    setUploadProgress(0);
    setRetryingFiles([]);
  };
  
  // 重试上传特定文件
  const handleRetryUpload = async (fileId: string | undefined) => {
    if (!fileId || !uppy) return;
    
    // 检查网络连接
    if (networkStatus === 'offline') {
      setError('网络连接失败');
      setErrorDetails([{
        message: '您的设备当前处于离线状态，请检查网络连接并重试。',
        timestamp: new Date().toISOString(),
        retryable: true
      }]);
      return;
    }
    
    // 添加到重试列表
    setRetryingFiles(prev => [...prev, fileId]);
    
    try {
      setIsUploading(true);
      const file = uppy.getFile(fileId);
      
      if (!file) {
        setError('文件不存在');
        return;
      }
      
      // 从错误列表中移除这个文件
      setErrorDetails(prev => prev.filter(item => item.fileId !== fileId));
      
      // 获取预签名 URL
      const response = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileType: file.type }),
      });
      
      if (!response.ok) {
        throw new Error(`获取上传地址失败: ${response.status}`);
      }
      
      const { signedUrl, imageUrl } = await response.json();
      
      // 上传文件到 R2
      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        body: file.data,
        headers: { 'Content-Type': file.type },
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`上传到存储失败: ${uploadResponse.status}`);
      }
      
      // 保存到数据库
      const { error: insertError } = await supabase
        .from('photos')
        .insert({ categories_id: parseInt(childCategoryId), image_url: imageUrl });
      
      if (insertError) {
        throw new Error(`保存到数据库失败: ${insertError.message}`);
      }
      
      // 通知上传成功
      uppy.emit('upload-success', file, { status: 200, body: { url: imageUrl } });
      
      setError(null);
      setIsUploading(false);
      
      // 如果错误列表已清空，且所有文件已处理完毕，刷新页面
      if (errorDetails.length === 0) {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
      
    } catch (err: any) {
      console.error('重试上传失败:', err);
      // 记录具体错误
      setErrorDetails(prev => [...prev, {
        fileId,
        fileName: uppy.getFile(fileId)?.name,
        message: `重试失败: ${err.message || '未知错误'}`,
        timestamp: new Date().toISOString(),
        retryable: true
      }]);
      setError(`重试上传失败: ${err.message || '未知错误'}`);
    } finally {
      setIsUploading(false);
      // 从重试列表中移除
      setRetryingFiles(prev => prev.filter(id => id !== fileId));
    }
  };

  // 自定义上传函数
  const handleStartUpload = () => {
    // 重置错误状态
    setError(null);
    setErrorDetails([]);
    
    // 检查网络连接
    if (networkStatus === 'offline') {
      setError('网络连接失败');
      setErrorDetails([{
        message: '您的设备当前处于离线状态，请检查网络连接并重试。',
        timestamp: new Date().toISOString(),
        retryable: true
      }]);
      return;
    }
    
    if (uppy && selectedFilesCount > 0) {
      uppy.upload();
    } else if (selectedFilesCount === 0) {
      setError('没有选择文件');
      setErrorDetails([{
        message: '请先选择至少一张照片再点击上传。',
        timestamp: new Date().toISOString(),
        retryable: false
      }]);
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
            
            {/* 网络状态指示器 */}
            <div className={`flex items-center mb-3 px-3 py-1 rounded text-sm ${
              networkStatus === 'online' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                networkStatus === 'online' ? 'bg-green-600' : 'bg-red-600'
              }`}></div>
              {networkStatus === 'online' ? '网络已连接' : '网络已断开，上传将不可用'}
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

            {error && <p className="text-red-500 text-sm font-bold mb-2">{error}</p>}
            
                {/* 上传进度条 */}
            {isUploading && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">正在上传... {uploadProgress}%</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
                
                {/* 详细错误信息 */}
            {errorDetails.length > 0 && (
              <div className="mb-4 max-h-40 overflow-y-auto border border-red-200 rounded p-2 bg-red-50">
                {errorDetails.map((detail, index) => (
                  <div key={index} className="text-sm mb-2 border-b border-red-100 pb-2 last:border-b-0">
                    {detail.fileName && <p className="font-medium">{detail.fileName}</p>}
                    <p className="text-red-600">{detail.message}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-500">
                        {detail.timestamp && new Date(detail.timestamp).toLocaleTimeString()}
                      </span>
                      {detail.retryable && detail.fileId && (
                        <button 
                          onClick={() => handleRetryUpload(detail.fileId)} 
                          className="text-xs bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded flex items-center"
                          disabled={isUploading || retryingFiles.includes(detail.fileId)}
                        >
                          {retryingFiles.includes(detail.fileId) ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              重试中
                            </>
                          ) : '重试上传'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}            {childCategoryId ? (
              <>
                <div id="uppy-dashboard" className="mb-4"></div>
                
                {/* 自定义上传按钮 */}
                {selectedFilesCount > 0 && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={handleStartUpload}
                      disabled={isUploading || networkStatus === 'offline'}
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
