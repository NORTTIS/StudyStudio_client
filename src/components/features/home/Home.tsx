import type { UserProfile } from "@/api/user-profile";
import { HomeBoard } from "@/components/features/home/HomeBoard";
import { HomeSummary } from "@/components/features/home/HomeSummary";
import type { HomeData } from "@/components/features/home/types";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";

interface HomePageProps {
    data: HomeData;
    userProfile?: UserProfile | null;
}

export default function HomePage({ data, userProfile }: HomePageProps) {
    return (
        <div className="flex h-screen bg-[#F8F8F8] text-[#261E33] overflow-hidden">

            <div className="h-screen">
                <DashboardSidebar />
            </div>

            <main className="flex-1 overflow-y-auto">

                <div className="sticky top-0 z-20 bg-white border-b">
                    <Header userProfile={userProfile} />
                </div>

                <div className="px-6 py-6 lg:px-8">
                    <HomeSummary statusChips={data.statusChips} />
                    <HomeBoard sections={data.boardSections} />
                </div>

            </main>
        </div>
    );
}