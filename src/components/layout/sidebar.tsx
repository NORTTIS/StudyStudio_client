// src/components/features/dashboard/DashboardSidebar.tsx
"use client";

import { BarChart3, Bell, CreditCard, FileText, GraduationCap, LayoutDashboard, Newspaper, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import { getUserProfile } from "@/api/user-profile";
import { Logo } from "@/components/common";

const userNavigation = [
    { name: "Home", href: "/home", icon: LayoutDashboard },
    { name: "Groups", href: "/group", icon: Users },
    { name: "Master", href: "/master", icon: BarChart3 },
    { name: "Announcements", href: "/announcements", icon: Bell },
];

const adminNavigation = [
    { name: "Bảng điều khiển", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Người dùng", href: "/admin/users", icon: Users },
    { name: "Nhóm", href: "/admin/groups", icon: Users },
    { name: "Gói đăng ký", href: "/admin/subscriptions", icon: CreditCard },
    { name: "Báo cáo", href: "/admin/reports", icon: FileText },
    { name: "Tin tức", href: "/admin/news", icon: Newspaper }
];

export function DashboardSidebar() {
    const pathname = usePathname();
    const locale = useLocale();
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAdminStatus = async () => {
            try {
                const result = await getUserProfile(locale);
                if (result.status === "success" && result.data) {
                    setIsAdmin(result.data.isAdmin);
                }
            } catch (error) {
                console.error("Failed to fetch user profile:", error);
            } finally {
                setIsLoading(false);
            }
        };

        checkAdminStatus();
    }, [locale]);

    const stripLocale = (path: string) => path.replace(/^\/[a-z]{2}(?=\/)/i, "");
    const currentPath = stripLocale(pathname || "");

    const isActivePath = (href: string) => {
        if (href === "/") return currentPath === "/";
        return currentPath === href || currentPath.startsWith(`${href}/`);
    };

    // Choose navigation based on admin status
    const navigation = isAdmin ? adminNavigation : userNavigation;

    if (isLoading) {
        return (
            <aside className="hidden h-screen w-64 shrink-0 border-[#E5E5E5] border-r bg-white lg:block">
                <div className="flex h-16 items-center border-[#E5E5E5] border-b px-4">
                    <Logo className="m-0" />
                </div>
                <div className="flex items-center justify-center p-8">
                    <div className="text-[#6F6B99] text-sm">Loading...</div>
                </div>
            </aside>
        );
    }

    return (
        <aside className="hidden h-screen w-64 shrink-0 border-[#E5E5E5] border-r bg-white lg:block">
            {/* Brand */}
            <div className="flex h-16 items-center border-[#E5E5E5] border-b px-4">
                <Link href={`/${locale}${isAdmin ? "/admin/dashboard" : "/home"}`} className="flex items-center">
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
                                    active
                                        ? "bg-[#F1F1F1] text-[#261E33]"
                                        : "text-[#6F6B99] hover:bg-[#F4F5FA] hover:text-[#261E33]"
                                )}>
                                <item.icon
                                    className={twMerge(
                                        "h-4 w-4 transition-colors",
                                        active ? "text-[#261E33]" : "text-[#6F6B99] group-hover:text-[#261E33]"
                                    )}
                                />
                                <span className="font-medium">{item.name}</span>

                                <span
                                    className={twMerge(
                                        "ml-auto h-1.5 w-1.5 rounded-full",
                                        active ? "bg-[#261E33]" : "bg-transparent"
                                    )}
                                />
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </aside>
    );
}
