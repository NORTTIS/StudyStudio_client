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
        <div className="min-h-screen bg-[#F5F5F5]">
            <div className="flex min-h-screen">
                <div className="sticky top-0 hidden h-screen bg-white lg:block">
                    <DashboardSidebar />
                </div>

                <div className="relative z-30 flex min-w-0 flex-1 flex-col">
                    <div className="sticky top-0 z-50 bg-white">
                        <div className="h-16 border-[#E5E5E5] border-b">
                            <Header />
                        </div>
                    </div>

                    <main className="min-w-0 flex-1">{children}</main>
                </div>
            </div>
        </div>
    );
}
