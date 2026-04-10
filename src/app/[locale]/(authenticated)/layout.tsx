"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { getRefreshToken, isAuthenticated, refreshAccessToken } from "@/api/auth";
import { getUserProfile } from "@/api/user-profile";
import { LoadingPage } from "@/components/common";

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const locale = useLocale();
    const [phase, setPhase] = useState<"loading" | "profile-check" | "ready">("loading");
    const isAdminRoute = pathname.startsWith(`/${locale}/admin`);

    useEffect(() => {
        const init = async () => {
            try {
                // Phase 1: JWT auth check
                if (!isAuthenticated()) {
                    const refreshed = getRefreshToken() ? await refreshAccessToken(locale) : false;
                    if (!refreshed) {
                        router.replace(`/${locale}/login?redirect=${encodeURIComponent(pathname)}`);
                        return;
                    }
                }
                setPhase("profile-check");

                // Phase 2: Admin redirect — non-admins and failed profiles proceed to render
                const result = await getUserProfile(locale);
                if (result.status === "success" && result.data?.isAdmin && !isAdminRoute) {
                    router.replace(`/${locale}/admin/dashboard`);
                    return;
                }

                // Proceed regardless of isAdmin or result status so the page always renders
                setPhase("ready");
            } catch (err) {
                console.error("[AuthenticatedLayout] init error:", err);
                // Fall through — always render the page even if something throws
                setPhase("ready");
            }
        };
        init();
    }, [router, locale, pathname]);

    if (phase !== "ready") return <LoadingPage />;

    return <>{children}</>;
}
