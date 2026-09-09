"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, BookMarked, Layers, RefreshCw, LayoutDashboard } from "lucide-react";
import SyncModal from "./SyncModal";
import { connect } from "@/lib/client";
export default function Navbar() {
  const pathname = usePathname();
  const [sync, setSync] = useState(false);
  useEffect(() => {
    connect().catch(() => {});
  }, []);
  const links = [
    { name: "学习概览", path: "/", icon: LayoutDashboard },
    { name: "试卷库", path: "/papers", icon: BookOpen },
    { name: "错题本", path: "/mistakes", icon: BookMarked },
    { name: "高频词", path: "/flashcards", icon: Layers },
  ];
  return (
    <>
      <header className={`site-header ${pathname.endsWith("/exam") ? "exam-site-header" : ""}`}>
        <div className="nav-inner">
          <Link href="/" className="brand">
            <BookOpen size={25} />
            <span>ShorePass</span>
          </Link>
          <nav aria-label="主导航">
            {links.map(({ name, path, icon: Icon }) => (
              <Link key={path} href={path} aria-current={pathname === path ? "page" : undefined}>
                <Icon size={18} />
                <span>{name}</span>
              </Link>
            ))}
          </nav>
          <button className="button subtle sync-button" onClick={() => setSync(true)}>
            <RefreshCw size={17} />
            <span>设备同步</span>
          </button>
        </div>
      </header>
      {sync && <SyncModal onClose={() => setSync(false)} />}
    </>
  );
}
