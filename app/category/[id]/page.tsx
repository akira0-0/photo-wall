import CategoryNav from "@/components/CategoryNav";
import PhotoGrid from "@/components/PhotoGrid";
import UploadModal from "@/components/UploadModal";
import { supabase } from "@/lib/supabaseClient";
import { notFound } from "next/navigation";
import CreateCategoryForm from "@/components/CreateCategoryForm"; // 导入新组件
import { unstable_noStore as noStore } from 'next/cache';
import dynamic from "next/dynamic";

// 动态导入UppyStyles组件
const UppyStyles = dynamic(() => import("@/components/UppyStyles"), {
  ssr: false,
});

// 动态导入组件，禁用SSR以避免hydration不匹配
const LogoutButton = dynamic(() => import("@/components/LogoutButton"), {
  ssr: false,
});

// 动态导入移动设备上传组件
const MobilePhotoUploader = dynamic(() => import("@/components/MobilePhotoUploader"), {
  ssr: false,
});

async function getDataForCategory(categoryId: number) {
  // 禁用缓存，确保每次都获取最新数据
  noStore();
  // 首先，获取所有分类以构建导航和查找子分类
  const { data: allCategories, error: catError } = await supabase
    .from('categories')
    .select('*');

  if (catError) {
    console.error("Error fetching categories:", catError);
    return { categories: [], photos: [], currentTargetCategory: null };
  }

  const targetCategory = allCategories.find(c => c.id === categoryId);
  if (!targetCategory) {
    notFound();
  }

  let categoryIdsToFetch: number[] = [];

  // 如果是一级分类，找出其所有子分类
  if (targetCategory.parent_id === null) {
    categoryIdsToFetch = allCategories
      .filter(c => c.parent_id === targetCategory.id)
      .map(c => c.id);
  } else {
    // 如果是二级分类，直接使用它
    categoryIdsToFetch = [targetCategory.id];
  }

  if (categoryIdsToFetch.length === 0 && targetCategory.parent_id !== null) {
    return { categories: allCategories, photos: [], currentTargetCategory: targetCategory };
  }

  // 根据分类ID列表获取照片
  const { data: photos, error: photoError } = await supabase
    .from('photos')
    .select('*')
    .in('categories_id', categoryIdsToFetch) // 使用正确的列名 categories_id
    .order('created_at', { ascending: false });
  
  if (photoError) {
    console.error("Error fetching photos for category:", photoError);
    return { categories: allCategories, photos: [], currentTargetCategory: targetCategory };
  }

  return { categories: allCategories, photos: photos ?? [], currentTargetCategory: targetCategory };
}

export default async function CategoryPage({ params }: { params: { id: string } }) {
  const categoryId = parseInt(params.id, 10);
  if (isNaN(categoryId)) {
    notFound();
  }

  const { categories, photos, currentTargetCategory } = await getDataForCategory(categoryId);

  // 判断当前是否为顶级分类
  const isParentCategory = currentTargetCategory?.parent_id === null;

  return (
    <main className="container mx-auto p-4">
      {/* 加载Uppy样式 */}
      <UppyStyles />
      
      <header className="text-center my-8 relative">
        <h1 className="text-4xl font-bold">{currentTargetCategory?.name}</h1>
        
        <LogoutButton />
      </header>
      
      <div className="flex justify-end gap-2 mb-4">
        <UploadModal categories={categories} />
        <MobilePhotoUploader categories={categories} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <aside className="md:col-span-1">
          <CategoryNav categories={categories} />
          {/* 如果是顶级分类页面，则显示创建子分类的表单 */}
          {isParentCategory && (
            <CreateCategoryForm 
              parentId={currentTargetCategory.id} 
              parentCategoryName={currentTargetCategory.name}
            />
          )}
        </aside>
        <section className="md:col-span-3">
          <PhotoGrid photos={photos} />
        </section>
      </div>
    </main>
  );
}
