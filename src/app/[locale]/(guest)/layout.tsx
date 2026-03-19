"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { isAuthenticated } from "@/api/auth";
import { LoadingPage } from "@/components/common";

export default function GuestLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const locale = useLocale();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const checkGuestAccess = async () => {
            // Check if the user is on a sensitive guest page (forgot password, reset, verify)
            // These pages should still be accessible even if the user is technically logged in
            // (e.g. they forgot password but still have a stale session, or they are resetting for another account)
            const isSensitiveGuestPage =
                pathname.includes("/forgot-password") ||
                pathname.includes("/reset-password") ||
                pathname.includes("/verify-email") ||
                pathname.includes("/verify-reset-token") ||
                pathname.includes("/resend-email-verify");

            if (isAuthenticated() && !isSensitiveGuestPage) {
                router.replace(`/${locale}/home`);
                return;
            }

            const { getRefreshToken, refreshAccessToken } = await import("@/api/auth");

            if (getRefreshToken() && !isSensitiveGuestPage) {
                const newTokens = await refreshAccessToken(locale);

                if (newTokens) {
                    router.replace(`/${locale}/home`);
                    return;
                }
            }

            setIsChecking(false);
        };

        checkGuestAccess();
    }, [router, locale, pathname]);

    if (isChecking) {
        return <LoadingPage />;
    }

    return <>{children}</>;
}
