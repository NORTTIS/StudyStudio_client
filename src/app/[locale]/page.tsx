"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { isAuthenticated, getUserData } from "@/api/auth";
import { LoadingPage } from "@/components/common";
import Landing from "@/components/features/landing/Landing";

export default function Page() {
    const router = useRouter();
    const locale = useLocale();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const checkAuthForRootPage = async () => {
            if (isAuthenticated()) {
                const userData = getUserData();
                const isAdmin = userData?.isAdmin === true;
                // Redirect admins to admin dashboard, regular users to home
                router.replace(`/${locale}${isAdmin ? "/admin/dashboard" : "/home"}`);
                return;
            }

            const { getRefreshToken, refreshAccessToken } = await import("@/api/auth");

            if (getRefreshToken()) {
                const newTokens = await refreshAccessToken(locale);

                if (newTokens) {
                    const userData = getUserData();
                    const isAdmin = userData?.isAdmin === true;
                    router.replace(`/${locale}${isAdmin ? "/admin/dashboard" : "/home"}`);
                    return;
                }
            }

            setIsChecking(false);
        };

        checkAuthForRootPage();
    }, [router, locale]);

    if (isChecking) {
        return <LoadingPage />;
    }

    return <Landing />;
}
