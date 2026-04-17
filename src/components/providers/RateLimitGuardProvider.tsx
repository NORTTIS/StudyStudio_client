"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast as sonnerToast } from "sonner";

const BLOCK_DURATION_MS = 3000;

export default function RateLimitGuardProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const routerRef = useRef(router);
    const blockedRef = useRef(false);

    // Patch router.push and router.replace to block navigation when rate-limited
    useEffect(() => {
        const originalPush = routerRef.current.push.bind(routerRef.current);
        const originalReplace = routerRef.current.replace.bind(routerRef.current);

        routerRef.current.push = async (href: string) => {
            if (blockedRef.current) {
                sonnerToast.error("Thao tác quá nhanh, vui lòng thử lại sau.", {
                    id: "rate-limit-block",
                    duration: 3000
                });
                return;
            }
            return originalPush(href);
        };

        routerRef.current.replace = async (href: string) => {
            if (blockedRef.current) {
                sonnerToast.error("Thao tác quá nhanh, vui lòng thử lại sau.", {
                    id: "rate-limit-block",
                    duration: 3000
                });
                return;
            }
            return originalReplace(href);
        };

        return () => {
            routerRef.current.push = originalPush;
            routerRef.current.replace = originalReplace;
        };
    }, []);

    // Patch window.fetch to detect 429 responses from any API call
    useEffect(() => {
        const originalFetch = window.fetch.bind(window);

        window.fetch = async (...args: Parameters<typeof fetch>) => {
            const response: Response = await originalFetch(...args);
            if (response.status === 429) {
                blockedRef.current = true;
                sonnerToast.error("Thao tác quá nhanh, vui lòng thử lại sau.", {
                    duration: 4000
                });
                setTimeout(() => {
                    blockedRef.current = false;
                }, BLOCK_DURATION_MS);
            }
            return response;
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, []);

    return <>{children}</>;
}
