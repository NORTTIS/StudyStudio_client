"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/Header";

export default function UserGroupLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const locale = useLocale();

    const stripLocale = (path: string) => path.replace(/^\/[a-z]{2}(?=\/)/i, "");
    const currentPath = stripLocale(pathname || "");

    const useShell =
        !currentPath.startsWith("/master") &&
        !currentPath.startsWith("/settings") &&
        !currentPath.startsWith("/group-setting-no-access") &&
        !currentPath.startsWith("/group-trashed-no-access") &&
        !currentPath.startsWith("/group-analytic-no-access") &&
        !currentPath.startsWith("/group-ai-no-access") &&
        !currentPath.startsWith("/master-setting-no-access") &&
        !currentPath.startsWith("/master-ai-no-access") &&
        !currentPath.startsWith("/master-analytics-no-access");

    if (!useShell) {
        return <>{children}</>;
    }

    return (
        <div className="h-screen overflow-hidden bg-white">
            <div className="flex h-full">
                <div className="hidden h-screen bg-white lg:block">
                    <DashboardSidebar />
                </div>

                <div className="relative z-30 flex min-w-0 flex-1 flex-col overflow-hidden">
                    <div className="z-50 bg-white">
                        <div className="h-16 border-[#E5E5E5] border-b">
                            <Header />
                        </div>
                    </div>

                    <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-white">{children}</main>
                </div>
            </div>
        </div>
    );
}
