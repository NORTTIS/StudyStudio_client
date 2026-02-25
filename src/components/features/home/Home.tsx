import type { UserProfile } from "@/api/user-profile";
import { Container } from "@/components/common";
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
        <div className="flex h-screen overflow-hidden bg-[#F8F8F8] text-[#261E33]">
            <div className="h-screen">
                <DashboardSidebar />
            </div>

            <main className="flex-1 overflow-y-auto">
                <div className="sticky top-0 z-20 border-b bg-white">
                    <Header userProfile={userProfile} />
                </div>

                <Container>
                    <HomeSummary statusChips={data.statusChips} />
                    <HomeBoard sections={data.boardSections} />
                </Container>
            </main>
        </div>
    );
}
