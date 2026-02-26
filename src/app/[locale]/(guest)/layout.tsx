"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { isAuthenticated } from "@/api/auth";
import { LoadingPage } from "@/components/common";

export default function GuestLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const locale = useLocale();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const checkGuestAccess = async () => {
            if (isAuthenticated()) {
                router.replace(`/${locale}/home`);
                return;
            }

            const { getRefreshToken, refreshAccessToken } = await import("@/api/auth");

            if (getRefreshToken()) {
                const newTokens = await refreshAccessToken(locale);

                if (newTokens) {
                    router.replace(`/${locale}/home`);
                    return;
                }
            }

            setIsChecking(false);
        };

        checkGuestAccess();
    }, [router, locale]);

    if (isChecking) {
        return <LoadingPage />;
    }

    return <>{children}</>;
}
