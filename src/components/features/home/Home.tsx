"use client";

import HomeSummary from "./HomeSummary";
import HomeTaskList from "@/components/features/home/HomeTaskList";
import HomePersonalTask from "@/components/features/home/HomePersonalTask";
import { AnnouncementsList } from "@/components/features/announcements/AnnouncementsList";

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