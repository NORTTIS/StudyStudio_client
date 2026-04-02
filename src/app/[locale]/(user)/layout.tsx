"use client";

import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";

export default function UserLayout({ children }: { children: ReactNode }) {
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
