"use client";

import { getUserData } from "@/api/auth";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import HomePersonalTask from "@/components/features/home/HomePersonalTask";
import HomeTaskList from "@/components/features/home/HomeTaskList";
import HomeSummary from "./HomeSummary";
import { LoadingPage } from "@/components/common";

export default function HomePage() {
    const router = useRouter();
    const locale = useLocale();
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        const userData = getUserData();
        if (userData?.isAdmin === true) {
            router.replace(`/${locale}/admin/dashboard`);
        } else {
            setChecked(true);
        }
    }, [router, locale]);

    if (!checked) {
        return <LoadingPage />;
    }

    return (
        <>
            <HomeSummary />
            <HomeTaskList />
            <HomePersonalTask />
        </>
    );
}
