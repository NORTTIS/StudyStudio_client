"use client";

import HomeSummary from "./HomeSummary";
import HomeTaskList from "@/components/features/home/HomeTaskList";
import HomePersonalTask from "@/components/features/home/HomePersonalTask";

export default function HomePage() {
    return (
        <>
            <HomeSummary />
            <HomeTaskList />
            <HomePersonalTask />
        </>
    );
}