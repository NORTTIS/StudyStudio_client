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
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import { getUserProfile } from "@/api/user-profile";
import { Logo } from "@/components/common";

export function DashboardSidebar() {
    const pathname = usePathname();
    const locale = useLocale();
    const t = useTranslations("Sidebar");

    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [collapsed, setCollapsed] = useState(false);
    const [mounted, setMounted] = useState(false);

    const userNavigation = [
        { name: t("home"), href: "/home", icon: LayoutDashboard },
        { name: t("groups"), href: "/group", icon: Users },
        { name: t("master"), href: "/master", icon: BarChart3 },
        { name: t("announcements"), href: "/announcements", icon: Bell }
    ];

    const adminNavigation = [
        { name: t("dashboard"), href: "/admin/dashboard", icon: LayoutDashboard },
        { name: t("users"), href: "/admin/users", icon: Users },
        { name: t("adminGroups"), href: "/admin/groups", icon: Users },
        { name: t("subscriptions"), href: "/admin/subscriptions", icon: CreditCard },
        { name: t("reports"), href: "/admin/reports", icon: FileText },
        { name: t("news"), href: "/admin/news", icon: Newspaper }
    ];

    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem("dashboard-sidebar-collapsed");
        if (saved !== null) {
            setCollapsed(saved === "true");
        }
    }, []);

    useEffect(() => {
        if (!mounted) return;
        localStorage.setItem("dashboard-sidebar-collapsed", String(collapsed));
    }, [collapsed, mounted]);

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
                <div className="flex h-20 items-center justify-center border-b border-[#E5E5E5] px-4">
                    <button
                        type="button"
                        onClick={() => setCollapsed(false)}
                        aria-label="Expand sidebar"
                        className="group relative flex h-11 w-11 items-center justify-center rounded-xl text-[#6F6B99] transition-all duration-300 ease-out hover:scale-[1.03] hover:bg-[#FFF3E8] hover:text-[#F97316] active:scale-[0.98]">
                        <span className="absolute inset-0 flex items-center justify-center transition-all duration-200 ease-out group-hover:scale-75 group-hover:opacity-0">
                            <Logo showText={false} size="md" className="m-0 shrink-0" />
                        </span>

                        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-200 ease-out group-hover:scale-100 group-hover:opacity-100">
                            <ChevronRight className="h-5 w-5" />
                        </span>
                    </button>
                </div>
            );
        }

        return (
            <div className="flex h-20 items-center justify-between border-b border-[#E5E5E5] px-5">
                <Link
                    href={homeHref}
                    className="flex min-w-0 items-center overflow-hidden transition-transform duration-300 ease-out hover:scale-[1.01]">
                    <Logo size="md" className="m-0 shrink-0" />
                </Link>

                <button
                    type="button"
                    onClick={() => setCollapsed(true)}
                    className="group flex h-10 w-10 items-center justify-center rounded-lg text-[#6F6B99] transition-all duration-300 ease-out hover:scale-105 hover:bg-[#FFF3E8] hover:text-[#F97316] active:scale-95"
                    aria-label="Collapse sidebar">
                    <ChevronLeft className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-0.5" />
                </button>
            </div>
        );
    };

    if (isLoading) {
        return (
            <aside
                className={twMerge(
                    "hidden h-screen shrink-0 overflow-hidden border-r border-[#E5E5E5] bg-[#F8F8F8] transition-[width] duration-300 ease-in-out lg:block",
                    collapsed ? "w-24" : "w-72"
                )}>
                <div className="flex h-full flex-col rounded-r-[28px] border-r border-orange-100/60 bg-white shadow-[0_10px_40px_rgba(15,23,42,0.04)]">
                    {renderHeader()}

                    <div className="flex flex-1 items-center justify-center p-8">
                        <div className="flex items-center gap-2 text-base text-[#6F6B99]">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-orange-400" />
                            <span className="transition-all duration-200">{collapsed ? "..." : "Loading..."}</span>
                        </div>
                    </div>
                </div>
            </aside>
        );
    }

    return (
        <aside
            className={twMerge(
                "hidden h-screen shrink-0 overflow-hidden border-r border-[#E5E5E5] bg-[#F8F8F8] transition-[width] duration-300 ease-in-out lg:block",
                collapsed ? "w-24" : "w-72"
            )}>
            <div className="flex h-full flex-col rounded-r-[28px] border-r border-orange-100/60 bg-white shadow-[0_10px_40px_rgba(15,23,42,0.04)]">
                {renderHeader()}

                <nav className="flex-1 px-4 py-5">
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
                                        "group relative flex overflow-hidden rounded-2xl transition-all duration-300 ease-out",
                                        collapsed ? "justify-center px-3 py-3.5" : "items-center gap-4 px-4 py-3.5",
                                        active
                                            ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/20"
                                            : "text-[#6F6B99] hover:bg-orange-50 hover:text-orange-600 hover:shadow-sm"
                                    )}>
                                    {!collapsed && (
                                        <span
                                            className={twMerge(
                                                "absolute inset-y-2 left-1 w-1 rounded-full transition-all duration-300",
                                                active ? "bg-white/80 opacity-100" : "bg-orange-300 opacity-0 group-hover:opacity-100"
                                            )}
                                        />
                                    )}

                                    <div
                                        className={twMerge(
                                            "relative z-10 flex shrink-0 items-center justify-center rounded-xl transition-all duration-300 ease-out",
                                            collapsed ? "h-11 w-11" : "h-10 w-10",
                                            active
                                                ? "bg-white/15 text-white"
                                                : "bg-[#FFF7ED] text-[#F97316] group-hover:bg-white"
                                        )}>
                                        <item.icon
                                            className={twMerge(
                                                "transition-all duration-300 ease-out",
                                                collapsed ? "h-6 w-6" : "h-5 w-5",
                                                active ? "text-white" : "group-hover:scale-110"
                                            )}
                                        />
                                    </div>

                                    <span
                                        className={twMerge(
                                            "relative z-10 overflow-hidden whitespace-nowrap font-medium text-[15px] transition-all duration-300 ease-out",
                                            active ? "text-white" : "",
                                            collapsed ? "w-0 translate-x-2 opacity-0" : "w-auto translate-x-0 opacity-100"
                                        )}>
                                        {item.name}
                                    </span>

                                    <span
                                        className={twMerge(
                                            "relative z-10 mt-auto mb-auto ml-auto shrink-0 rounded-full transition-all duration-300 ease-out",
                                            collapsed
                                                ? "h-0 w-0 opacity-0"
                                                : active
                                                    ? "h-2.5 w-2.5 bg-white opacity-100"
                                                    : "h-2 w-2 scale-75 bg-orange-300 opacity-0 group-hover:scale-100 group-hover:opacity-100"
                                        )}
                                    />
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            </div>
        </aside>
    );
}