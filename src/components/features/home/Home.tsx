"use client";

import HomePersonalTask from "@/components/features/home/HomePersonalTask";
import HomeTaskList from "@/components/features/home/HomeTaskList";
import HomeSummary from "./HomeSummary";

export default function HomePage() {
    return (
        <>
            <HomeSummary />
            <HomeTaskList />
            <HomePersonalTask />
        </>
    );
}
