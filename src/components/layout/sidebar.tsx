"use client";

import { BarChart3, GraduationCap, LayoutDashboard, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { twMerge } from "tailwind-merge";

const navigation = [
  { name: "Home", href: "/Home", icon: LayoutDashboard },
  { name: "Groups", href: "/groups", icon: Users },
  { name: "Master", href: "/master", icon: BarChart3 },
  { name: "AI Q&A", href: "/ai-qna", icon: GraduationCap },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="
        fixed top-0 left-0
        h-screen w-64
        border-r border-[#E5E5E5]
        bg-white
        z-50
      "
    >
      {/* LOGO */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Link href="/Home" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#FF5F3D] font-bold text-white">
            SS
          </div>
          <span className="font-semibold text-[#261E33]">Study Studio</span>
        </Link>
      </div>

      {/* NAV */}
      <nav className="space-y-2 p-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.name}
              href={item.href}
              className={twMerge(
                "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition",
                isActive
                  ? "bg-[#2D2D2D] text-white"
                  : "text-[#6F6B99] hover:bg-[#F5F5F5] hover:text-[#261E33]"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
