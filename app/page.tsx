import CategoryNav from "@/components/CategoryNav";
import PhotoGrid from "@/components/PhotoGrid";
import UploadModal from "@/components/UploadModal";
import { supabase } from "@/lib/supabaseClient";
import CreateCategoryForm from "@/components/CreateCategoryForm"; // 导入新组件
import dynamic from "next/dynamic";
import { unstable_noStore as noStore } from 'next/cache';

// 动态导入UppyStyles组件
const UppyStyles = dynamic(() => import("@/components/UppyStyles"), {
  ssr: false,
});

// 动态导入移动设备上传组件
const MobilePhotoUploader = dynamic(() => import("@/components/MobilePhotoUploader"), {
  ssr: false,
});

// 动态导入LogoutButton组件，禁用SSR以避免hydration不匹配
const LogoutButton = dynamic(() => import("@/components/LogoutButton"), {
  ssr: false,
});

// 每次请求时获取最新数据（禁用缓存）
async function getInitialData() {
  // 禁用缓存，确保每次都获取最新数据
  noStore();
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('*');
  
  const { data: photos, error: photoError } = await supabase
    .from('photos')
    .select('*')
    .order('created_at', { ascending: false });

  if (catError || photoError) {
    console.error("Error fetching initial data:", catError || photoError);
  }

  return { categories: categories ?? [], photos: photos ?? [] };
}


export default async function HomePage() {
  const { categories, photos } = await getInitialData();

  return (
    <main className="container mx-auto p-4">
      {/* 加载Uppy样式 */}
      <UppyStyles />
      
      <header className="text-center my-8 relative">
        <h1 className="text-4xl font-bold">我的照片墙</h1>
        <p className="text-gray-500 mt-2">记录生活中的美好瞬间</p>
        <LogoutButton />
      </header>
      
      <div className="flex justify-end gap-2 mb-4">
        <UploadModal categories={categories} />
        <MobilePhotoUploader categories={categories} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <aside className="md:col-span-1">
          <CategoryNav categories={categories} />
          {/* 在主页添加创建顶级分类的表单 */}
          <CreateCategoryForm />
        </aside>
        <section className="md:col-span-3">
          <PhotoGrid photos={photos} />
        </section>
      </div>
    </main>
  );
}
