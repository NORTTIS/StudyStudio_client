"use client";

import { HomeBoard } from "@/components/features/home/HomeBoard";
import { HomeSummary } from "@/components/features/home/HomeSummary";
import type { HomeData } from "@/components/features/home/types";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";

interface HomePageProps {
  data: HomeData;
}

export default function HomePage({ data }: HomePageProps) {
  return (
    <div className="min-h-screen bg-[#F8F8F8] text-[#261E33]">
      <div className="flex min-h-screen">
        {/* ✅ SIDEBAR FIXED */}
        <DashboardSidebar />

        {/* ✅ MAIN CONTENT */}
        <main
          className="
            flex-1
            bg-[#F8F8F8]
            ml-64
            pt-16
            px-6
            lg:px-8
          "
        >
          {/* ✅ HEADER FIXED TOP */}
          <Header />

          {/* CONTENT */}
          <HomeSummary statusChips={data.statusChips} />
          <HomeBoard sections={data.boardSections} />
        </main>
      </div>
    </div>
  );
}
