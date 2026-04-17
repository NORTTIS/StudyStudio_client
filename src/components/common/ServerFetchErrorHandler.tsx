"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast as sonnerToast } from "sonner";

interface ErrorInfo {
    code?: string | null;
    message?: string | null;
}

interface RateLimitGuardProps {
    children: React.ReactNode;
    error?: ErrorInfo;
    /** Path URL that triggered the server fetch - used as fallback for navigation */
    fallbackPath?: string;
}

/**
 * Client-side wrapper that handles server fetch errors gracefully.
 *
 * For RATE_LIMIT_EXCEEDED:
 *   - Shows toast: "Thao tác quá nhanh, vui lòng thử lại sau."
 *   - Blocks navigation for 3 seconds
 *   - Keeps previous page data visible (no full-page error)
 *
 * For other errors:
 *   - Shows toast with error message
 *   - Keeps previous page data visible
 */
export default function ServerFetchErrorHandler({
    children,
    error,
    fallbackPath = "/"
}: RateLimitGuardProps) {
    const router = useRouter();
    const blockedRef = useRef(false);
    const blockKeyRef = useRef(0);

    // Handle 429 / RATE_LIMIT_EXCEEDED from server fetch
    useEffect(() => {
        if (!error || error.code !== "RATE_LIMIT_EXCEEDED") return;

        blockedRef.current = true;
        const blockKey = ++blockKeyRef.current;

        sonnerToast.error("Thao tác quá nhanh, vui lòng thử lại sau.", {
            id: `server-rate-limit-${blockKey}`,
            duration: 4000
        });

        // Block navigation for 3 seconds
        const originalPush = router.push.bind(router);
        const originalReplace = router.replace.bind(router);
        type PushArgs = Parameters<typeof originalPush>;
        type ReplaceArgs = Parameters<typeof originalReplace>;

        const blockNav = async (href: PushArgs[0] | ReplaceArgs[0]) => {
            if (blockedRef.current) {
                sonnerToast.error("Thao tác quá nhanh, vui lòng thử lại sau.", {
                    id: `server-nav-block-${blockKey}`,
                    duration: 3000
                });

                if (typeof href === "string" && href !== fallbackPath) {
                    originalReplace(fallbackPath);
                }

                return false;
            }

            return true;
        };

        router.push = async (...args: PushArgs) => {
            const canNavigate = await blockNav(args[0]);
            if (!canNavigate) return;

            return originalPush(...args);
        };
        router.replace = async (...args: ReplaceArgs) => {
            const canNavigate = await blockNav(args[0]);
            if (!canNavigate) return;

            return originalReplace(...args);
        };

        const unblockTimer = setTimeout(() => {
            blockedRef.current = false;
            router.push = originalPush;
            router.replace = originalReplace;
        }, 3000);

        return () => {
            clearTimeout(unblockTimer);
            router.push = originalPush;
            router.replace = originalReplace;
        };
    }, [error, fallbackPath, router]);

    // Handle other server fetch errors (non-429)
    useEffect(() => {
        if (!error || error.code === "RATE_LIMIT_EXCEEDED") return;
        if (error.code === "AUTH_REQUIRED" || error.code === "HTTP_401") return; // Skip auth errors
        if (error.code === "HTTP_403" || error.code === "HTTP_404") return; // Skip redirect errors

        sonnerToast.error(error.message || "Đã xảy ra lỗi khi tải dữ liệu.", {
            id: `server-error-${error.code}`,
            duration: 5000
        });
    }, [error]);

    return <>{children}</>;
}
