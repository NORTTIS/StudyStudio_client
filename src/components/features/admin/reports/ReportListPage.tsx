"use client";

import { useTranslations } from "next-intl";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { AdminReportsTab } from "./AdminReportsTab";

export function ReportListPage() {
    const _t = useTranslations("AdminReports");

    return (
        <div className="min-h-screen bg-[#F8F8F8]">
            <div className="flex min-h-screen">
                <DashboardSidebar />
                <main className="flex-1">
                    <Header userProfile={null} />

                    <div className="px-6 py-6">
                        {/* Page Header */}
                        <div className="mb-6">
                            <h1 className="mb-2 font-bold text-2xl text-[#261E33]">Quản lý báo cáo</h1>
                            <p className="text-[#6F6B99] text-sm">Xem và quản lý báo cáo từ người dùng</p>
                        </div>

                        {/* Use AdminReportsTab component */}
                        <AdminReportsTab />
                    </div>
                </main>
            </div>
        </div>
    );
}
