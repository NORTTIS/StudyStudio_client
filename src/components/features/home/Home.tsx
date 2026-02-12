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
        <div className="min-h-screen bg-[#F8F8F8] text-[#261E33]">
            <div className="flex min-h-screen">
                <DashboardSidebar />

                <main className="flex-1 px-6 py-6 lg:px-8">
                    <Header userProfile={userProfile} />
                    <HomeSummary statusChips={data.statusChips} />
                    <HomeBoard sections={data.boardSections} />
                </main>
            </div>
        </div>
    );
}
