import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import OfflineSupport from "@/components/OfflineSupport";

export const metadata: Metadata = {
  title: "ShorePass - 自考英语真题库",
  description: "自考英语（二）/ 13000 英语专升本本地学习系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className="antialiased bg-gray-50 min-h-screen flex flex-col font-sans"
        suppressHydrationWarning
      >
        <Navbar />
        <OfflineSupport />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
