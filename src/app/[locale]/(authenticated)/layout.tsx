"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { isAuthenticated } from "@/api/auth";
import { LoadingPage } from "@/components/common";
import { getUserProfile } from "@/api/user-profile";

const { getRefreshToken, refreshAccessToken } = await import("@/api/auth");

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const locale = useLocale();
    const [phase, setPhase] = useState<"loading" | "profile-check" | "ready">("loading");

    useEffect(() => {
        const init = async () => {
            // Phase 1: JWT auth check
            if (!isAuthenticated()) {
                const refreshed = getRefreshToken() ? await refreshAccessToken(locale) : false;
                if (!refreshed) {
                    router.replace(`/${locale}/login?redirect=${encodeURIComponent(pathname)}`);
                    return;
                }
            }
            setPhase("profile-check");

            // Phase 2: Admin redirect
            const result = await getUserProfile(locale);
            if (result.status === "success" && result.data?.isAdmin) {
                router.replace(`/${locale}/admin/dashboard`);
                return;
            }

            setPhase("ready");
        };
        init();
    }, [router, locale, pathname]);

    if (phase !== "ready") return <LoadingPage />;

    return <>{children}</>;
}
