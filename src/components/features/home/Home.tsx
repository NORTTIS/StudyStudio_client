"use client";

import { AnnouncementsList } from "@/components/features/announcements/AnnouncementsList";
import HomePersonalTask from "@/components/features/home/HomePersonalTask";
import HomeTaskList from "@/components/features/home/HomeTaskList";
import HomeSummary from "./HomeSummary";

export default function HomePage() {
    return (
        <>
            <HomeSummary />

            {/* Announcements Section */}
            <div className="mb-6">
                <AnnouncementsList />
            </div>

            <HomeTaskList />
            <HomePersonalTask />
        </>
    );
}
