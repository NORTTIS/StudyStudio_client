"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { isAuthenticated } from "@/api/auth";
import { LoadingPage } from "@/components/common";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const locale = useLocale();
    const t = useTranslations("Common");
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        // Check authentication on mount
        const checkAuth = () => {
            if (!isAuthenticated()) {
                // Store intended destination for redirect after login
                const redirectUrl = encodeURIComponent(pathname);
                router.replace(`/${locale}/login?redirect=${redirectUrl}`);
            } else {
                setIsChecking(false);
            }
        };

        checkAuth();
    }, [router, locale, pathname]);

    // Show loading state while checking authentication
    if (isChecking) {
        return <LoadingPage />;
    }

    return <>{children}</>;
}
