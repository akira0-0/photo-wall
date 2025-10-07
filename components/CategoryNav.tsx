'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

// 1. 保持原始的 Category 类型，它描述了从数据库来的数据
type Category = {
  id: number;
  name: string;
  parent_id: number | null;
};

// 2. 【新增】创建一个新的类型 CategoryNode，用于描述树状结构中的节点
// 它继承了 Category 的所有属性，并增加了一个 children 数组
type CategoryNode = Category & {
  children: Category[]; // 子节点本身不需要再有孙节点，所以类型是 Category[] 即可
};

// 定义组件的Props类型
type Props = {
  categories: Category[];
};

export default function CategoryNav({ categories }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // 3. 【修正】明确地告诉 TypeScript，useMemo 返回的是一个 CategoryNode 数组
  const categoryTree: CategoryNode[] = useMemo(() => {
    const tree: Record<number, CategoryNode> = {}; // 使用新的 CategoryNode 类型
    const roots: CategoryNode[] = []; // 使用新的 CategoryNode 类型

    // 第一次遍历，初始化所有顶级分类节点
    categories.forEach(cat => {
      if (cat.parent_id === null) {
        // 创建节点时，确保它符合 CategoryNode 的结构
        const node: CategoryNode = { ...cat, children: [] };
        tree[cat.id] = node;
        roots.push(node);
      }
    });

    // 第二次遍历，将子分类挂载到父节点的 children 数组中
    categories.forEach(cat => {
      if (cat.parent_id !== null && tree[cat.parent_id]) {
        tree[cat.parent_id].children.push(cat);

      }
    });
    
    // 对每个父节点的子分类按名称排序 (可选的优化)
    Object.values(tree).forEach(node => {
        node.children.sort((a, b) => a.name.localeCompare(b.name));
    });

    // 对根节点按名称排序 (可选的优化)
    roots.sort((a, b) => a.name.localeCompare(b.name));
    
    return roots;
  }, [categories]);

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <nav className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">分类</h2>
      <ul>
        {/* 现在 TypeScript 知道 parent 的类型是 CategoryNode，可以安全地访问 parent.children */}
        {categoryTree.map(parent => (
          <li key={parent.id} className="mb-2">
            <div className="flex justify-between items-center">
              <Link href={`/category/${parent.id}`} className="font-bold hover:text-blue-600">
                {parent.name}
              </Link>
              {parent.children.length > 0 && (
                <button onClick={() => toggleExpand(parent.id)} className="text-gray-500">
                  {expanded.has(parent.id) ? '-' : '+'}
                </button>
              )}
            </div>
            {expanded.has(parent.id) && parent.children.length > 0 && (
              <ul className="ml-4 mt-2 border-l-2 pl-4">
                {parent.children.map(child => (
                  <li key={child.id} className="mt-1">
                    <Link href={`/category/${child.id}`} className="text-gray-700 hover:text-blue-600">
                      {child.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}