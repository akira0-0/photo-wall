'use client'

import { useEffect } from 'react'

// 客户端动态加载 Uppy 样式
export default function UppyStyles() {
  useEffect(() => {
    // 仅在客户端执行
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://releases.transloadit.com/uppy/v3.4.1/uppy.min.css'
    document.head.appendChild(link)

    return () => {
      document.head.removeChild(link)
    }
  }, [])

  return null
}
