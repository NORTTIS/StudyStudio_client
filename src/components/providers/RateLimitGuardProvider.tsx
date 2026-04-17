"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast as sonnerToast } from "sonner";

const BLOCK_DURATION_MS = 3000;
const RATE_LIMIT_TOAST_ID = "rate-limit-block";

type GuardedRouterContextValue = {
    guardedPush: (...args: Parameters<ReturnType<typeof useRouter>["push"]>) => ReturnType<ReturnType<typeof useRouter>["push"]> | undefined;
    guardedReplace: (
        ...args: Parameters<ReturnType<typeof useRouter>["replace"]>
    ) => ReturnType<ReturnType<typeof useRouter>["replace"]> | undefined;
};

const GuardedRouterContext = React.createContext<GuardedRouterContextValue | null>(null);

export function useGuardedRouter() {
    const context = React.useContext(GuardedRouterContext);

    if (!context) {
        throw new Error("useGuardedRouter must be used inside RateLimitGuardProvider");
    }

    return context;
}

export default function RateLimitGuardProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const tCommon = useTranslations("Common");
    const blockedRef = React.useRef(false);
    const timeoutIdRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const guardedPush = React.useCallback(
        (...args: Parameters<typeof router.push>) => {
            if (blockedRef.current) {
                sonnerToast.error(tCommon("rateLimit"), {
                    id: RATE_LIMIT_TOAST_ID,
                    duration: BLOCK_DURATION_MS
                });
                return;
            }

            return router.push(...args);
        },
        [router, tCommon]
    );

    const guardedReplace = React.useCallback(
        (...args: Parameters<typeof router.replace>) => {
            if (blockedRef.current) {
                sonnerToast.error(tCommon("rateLimit"), {
                    id: RATE_LIMIT_TOAST_ID,
                    duration: BLOCK_DURATION_MS
                });
                return;
            }

            return router.replace(...args);
        },
        [router, tCommon]
    );

    // Patch window.fetch to detect 429 responses from any API call.
    React.useEffect(() => {
        const originalFetch = window.fetch.bind(window);

        window.fetch = async (...args: Parameters<typeof fetch>) => {
            const response: Response = await originalFetch(...args);

            if (response.status === 429) {
                if (timeoutIdRef.current) {
                    clearTimeout(timeoutIdRef.current);
                }

                blockedRef.current = true;
                sonnerToast.error(tCommon("rateLimit"), {
                    id: RATE_LIMIT_TOAST_ID,
                    duration: BLOCK_DURATION_MS
                });

                timeoutIdRef.current = setTimeout(() => {
                    blockedRef.current = false;
                    sonnerToast.dismiss(RATE_LIMIT_TOAST_ID);
                    timeoutIdRef.current = null;
                }, BLOCK_DURATION_MS);
            }

            return response;
        };

        return () => {
            if (timeoutIdRef.current) {
                clearTimeout(timeoutIdRef.current);
                timeoutIdRef.current = null;
            }

            blockedRef.current = false;
            sonnerToast.dismiss(RATE_LIMIT_TOAST_ID);
            window.fetch = originalFetch;
        };
    }, [tCommon]);

    const contextValue = React.useMemo(
        () => ({
            guardedPush,
            guardedReplace
        }),
        [guardedPush, guardedReplace]
    );

    return <GuardedRouterContext.Provider value={contextValue}>{children}</GuardedRouterContext.Provider>;
}
