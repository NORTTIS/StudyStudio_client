"use client";

import type { ReactNode } from "react";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/Header";

export default function UserLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-[#F5F5F5]">
            <div className="flex min-h-screen">
                {/* Sidebar */}
                <div className="sticky top-0 hidden h-screen bg-white lg:block">
                    <DashboardSidebar />
                </div>

                {/* Main */}
                <div className="flex min-w-0 flex-1 flex-col">
                    {/* Header row (đường ngang nằm ở đây để khớp tuyệt đối) */}
                    <div className="sticky top-0 z-50 bg-white">
                        <div className="h-16 border-b border-[#E5E5E5]">
                            <Header />
                        </div>
                    </div>

                    <main className="min-w-0 flex-1">{children}</main>
                </div>
            </div>
        </div>
    );
}