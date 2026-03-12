"use client";

import {
    BarChart3,
    Bell,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    FileText,
    LayoutDashboard,
    Newspaper,
    Users
} from "lucide-react";
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
    { name: "Announcements", href: "/announcements", icon: Bell }
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
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("dashboard-sidebar-collapsed");
        if (saved !== null) {
            setCollapsed(saved === "true");
        }
    }, []);

    useEffect(() => {
        localStorage.setItem("dashboard-sidebar-collapsed", String(collapsed));
    }, [collapsed]);

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

    const navigation = isAdmin ? adminNavigation : userNavigation;
    const homeHref = `/${locale}${isAdmin ? "/admin/dashboard" : "/home"}`;

    const renderHeader = () => {
        if (collapsed) {
            return (
                <div className="flex h-20 items-center justify-center border-[#E5E5E5] border-b px-4">
                    <button
                        type="button"
                        onClick={() => setCollapsed(false)}
                        aria-label="Expand sidebar"
                        className="group flex h-11 w-11 items-center justify-center rounded-xl text-[#6F6B99] transition-all duration-200 hover:bg-[#FFF3E8] hover:text-[#F97316]">
                        <span className="flex items-center justify-center group-hover:hidden">
                            <Logo showText={false} size="md" className="m-0 shrink-0" />
                        </span>

                        <span className="hidden items-center justify-center group-hover:flex">
                            <ChevronRight className="h-5 w-5" />
                        </span>
                    </button>
                </div>
            );
        }

        return (
            <div className="flex h-20 items-center justify-between border-[#E5E5E5] border-b px-5">
                <Link href={homeHref} className="flex min-w-0 items-center overflow-hidden">
                    <Logo size="md" className="m-0 shrink-0" />
                </Link>

                <button
                    type="button"
                    onClick={() => setCollapsed(true)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-[#6F6B99] transition-all duration-200 hover:bg-[#FFF3E8] hover:text-[#F97316]"
                    aria-label="Collapse sidebar">
                    <ChevronLeft className="h-5 w-5" />
                </button>
            </div>
        );
    };

    if (isLoading) {
        return (
            <aside
                className={twMerge(
                    "hidden h-screen shrink-0 border-[#E5E5E5] border-r bg-white transition-all duration-300 lg:block",
                    collapsed ? "w-24" : "w-72"
                )}>
                {renderHeader()}

                <div className="flex items-center justify-center p-8">
                    <div className="text-[#6F6B99] text-base">{collapsed ? "..." : "Loading..."}</div>
                </div>
            </aside>
        );
    }

    return (
        <aside
            className={twMerge(
                "hidden h-screen shrink-0 border-[#E5E5E5] border-r bg-white transition-all duration-300 lg:block",
                collapsed ? "w-24" : "w-72"
            )}>
            {renderHeader()}

            <nav className="p-4">
                <div className="space-y-2">
                    {navigation.map((item) => {
                        const active = isActivePath(item.href);
                        const fullHref = `/${locale}${item.href}`;

                        return (
                            <Link
                                key={item.name}
                                href={fullHref}
                                title={collapsed ? item.name : undefined}
                                onClick={() => {
                                    if (collapsed) setCollapsed(false);
                                }}
                                className={twMerge(
                                    "group flex items-center rounded-xl transition-all duration-200",
                                    collapsed ? "justify-center px-3 py-3.5" : "gap-4 px-4 py-3",
                                    active
                                        ? "bg-orange-100 text-orange-600"
                                        : "text-[#6F6B99] hover:bg-[#FFF3E8] hover:text-[#F97316]"
                                )}>
                                <item.icon
                                    className={twMerge(
                                        "shrink-0 transition-colors",
                                        collapsed ? "h-6 w-6" : "h-5 w-5",
                                        active ? "text-orange-600" : "text-[#6F6B99] group-hover:text-[#F97316]"
                                    )}
                                />

                                {!collapsed && <span className="font-medium text-[16px]">{item.name}</span>}

                                {!collapsed && (
                                    <span
                                        className={twMerge(
                                            "ml-auto h-2 w-2 rounded-full",
                                            active ? "bg-orange-500" : "bg-transparent"
                                        )}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </aside>
    );
}
