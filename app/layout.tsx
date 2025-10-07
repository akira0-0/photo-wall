import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "照片墙",
  description: "我的个人照片墙网站",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        {/* Uppy CSS - CDN链接 */}
        <link rel="stylesheet" href="https://releases.transloadit.com/uppy/v3.4.1/uppy.min.css" />
      </head>
      <body>
        <AuthProvider initialAuth={false}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
