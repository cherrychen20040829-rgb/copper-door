import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Copper Door Designer",
  description: "铜门行业施工图生成工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
