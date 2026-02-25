// src/components/features/dashboard/DashboardSidebar.tsx
"use client";

import { BarChart3, GraduationCap, LayoutDashboard, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { twMerge } from "tailwind-merge";
import { Logo } from "@/components/common";

const navigation = [
  { name: "Home", href: "/home", icon: LayoutDashboard },
  { name: "Groups", href: "/group", icon: Users },
  { name: "Master", href: "/master", icon: BarChart3 },
  { name: "AI Q&A", href: "/ai-qna", icon: GraduationCap }
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const locale = useLocale();

  const stripLocale = (path: string) => path.replace(/^\/[a-z]{2}(?=\/)/i, "");
  const currentPath = stripLocale(pathname || "");

  const isActivePath = (href: string) => {
    if (href === "/") return currentPath === "/";
    return currentPath === href || currentPath.startsWith(href + "/");
  };

  return (
    <aside className="hidden h-screen w-64 shrink-0 border-r border-[#E5E5E5] bg-white lg:block">
      {/* Brand */}
      <div className="flex h-16 items-center border-b border-[#E5E5E5] px-4">
        <Link href={`/${locale}/home`} className="flex items-center">
          <Logo className="m-0" />
        </Link>
      </div>

      {/* Nav */}
      <nav className="p-3">
        <div className="space-y-1">
          {navigation.map((item) => {
            const active = isActivePath(item.href);
            const fullHref = `/${locale}${item.href}`;

            return (
              <Link
                key={item.name}
                href={fullHref}
                className={twMerge(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active ? "bg-[#F1F1F1] text-[#261E33]" : "text-[#6F6B99] hover:bg-[#F4F5FA] hover:text-[#261E33]"
                )}>
                <item.icon
                  className={twMerge(
                    "h-4 w-4 transition-colors",
                    active ? "text-[#261E33]" : "text-[#6F6B99] group-hover:text-[#261E33]"
                  )}
                />
                <span className="font-medium">{item.name}</span>

                <span
                  className={twMerge("ml-auto h-1.5 w-1.5 rounded-full", active ? "bg-[#261E33]" : "bg-transparent")}
                />
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
