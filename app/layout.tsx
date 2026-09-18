import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EchoBridge｜无障碍课堂学习助手",
  description: "为听障学生、非母语学习者和注意力分散学生设计的 AI 课堂学习助手。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
