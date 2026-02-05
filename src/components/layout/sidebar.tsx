"use client";

import { BarChart3, GraduationCap, LayoutDashboard, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { twMerge } from "tailwind-merge";

const navigation = [
  { name: "Home", href: "/Home", icon: LayoutDashboard },
  { name: "Groups", href: "/groups", icon: Users },
  { name: "Master", href: "/master", icon: BarChart3 },
  { name: "AI Q&A", href: "/ai-qna", icon: GraduationCap }
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-64 border-border border-r bg-sidebar lg:block">
      <div className="border-sidebar-border border-b p-4">
        <Link href="/Home" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center bg-primary font-bold text-sm text-white">SS</div>
          <span className="font-bold text-foreground">Study Studio</span>
        </Link>
      </div>
      <nav className="space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={twMerge(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-muted"
              )}>
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
