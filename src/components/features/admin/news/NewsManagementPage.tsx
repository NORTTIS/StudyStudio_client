"use client";

import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { AdminAnnouncementsTab } from "../announcements/AdminAnnouncementsTab";

export function NewsManagementPage() {
    return (
        <div className="min-h-screen bg-[#F8F8F8] font-[family-name:var(--font-app-inter)]">
            <div className="flex min-h-screen">
                <DashboardSidebar />
                <main className="flex-1">
                    <Header userProfile={null} />

                    <div className="px-6 py-6">
                        {/* Use AdminAnnouncementsTab component */}
                        <AdminAnnouncementsTab />
                    </div>
                </main>
            </div>
        </div>
    );
}
