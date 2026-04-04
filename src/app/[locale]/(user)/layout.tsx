"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { LoadingPage } from "@/components/common";
import { getUserProfile } from "@/api/user-profile";

export default function UserLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const locale = useLocale();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const checkAccess = async () => {
            try {
                const result = await getUserProfile(locale);
                if (result.status === "success" && result.data) {
                    // Redirect admins to admin dashboard
                    if (result.data.isAdmin) {
                        router.replace(`/${locale}/admin/dashboard`);
                        return;
                    }
                }
            } catch {
                // On error, allow access (backend will handle auth)
            } finally {
                setIsChecking(false);
            }
        };
        checkAccess();
    }, [router, locale]);

    if (isChecking) {
        return <LoadingPage />;
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
