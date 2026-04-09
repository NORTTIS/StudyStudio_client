"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { toPublicUrl } from "@/api/banner-logo";
import ErrorDisplay from "@/components/common/ErrorDisplay";
import { GroupBannerBackground } from "@/components/features/group/GroupBannerBackground";
import { GroupStudioHeader } from "@/components/features/group/setting/GroupStudioHeader";

type GroupHeaderActionContextValue = {
    setHeaderAction: React.Dispatch<React.SetStateAction<React.ReactNode>>;
};

const GroupHeaderActionContext = React.createContext<GroupHeaderActionContextValue | null>(null);

type GroupDetailBannerResponse = {
    status?: string | null;
    code?: string | null;
    message?: string | null;
    data?: {
        bannerUrl?: string | null;
        colorHex?: string | null;
        isArchived?: boolean | null;
        userRole?: string | null;
        studioId?: string | null;
    } | null;
    bannerUrl?: string | null;
    colorHex?: string | null;
    isArchived?: boolean | null;
    userRole?: string | null;
    studioId?: string | null;
};

type GroupBannerResult =
    | {
          data: unknown;
          error: null;
      }
    | {
          data: null;
          error: {
              status?: number;
          };
      };

function getApiBase() {
    const raw = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    return String(raw).replace(/\/+$/, "");
}

function extractBannerSettings(raw: unknown) {
    const response = raw as GroupDetailBannerResponse | null;
    const data = response?.data ?? response;

    const normalizeRole = (role?: string | null) => {
        const normalized = String(role ?? "").trim().toLowerCase();
        if (normalized === "owner" || normalized === "moderator" || normalized === "member" || normalized === "commenter" || normalized === "viewer") {
            return normalized;
        }
        return null;
    };

    return {
        bannerUrl: data?.bannerUrl ? toPublicUrl(data.bannerUrl) : null,
        colorHex: data?.colorHex ?? null,
        isArchived: Boolean(data?.isArchived ?? false),
        userRole: normalizeRole(data?.userRole),
        studioId: data?.studioId ?? null
    };
}

async function fetchGroupBanner(groupId: string): Promise<GroupBannerResult> {
    const base = getApiBase();
    const apiBase = base.endsWith("/api") ? base : `${base}/api`;
    const url = `${apiBase}/group/${encodeURIComponent(groupId)}/detail`;
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        cache: "no-store"
    });

    if (!res.ok) {
        await res.text().catch(() => "");
        return {
            data: null,
            error: {
                status: res.status
            }
        };
    }

    const raw = await res.text();
    try {
        return {
            data: JSON.parse(raw.replace(/^\uFEFF/, "")),
            error: null
        };
    } catch {
        return {
            data: null,
            error: {
                status: res.status
            }
        };
    }
}

export function GroupShell({
    groupId,
    children
}: {
    groupId: string;
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const locale = useLocale();
    const tCommon = useTranslations("Common");
    const tGroupHeader = useTranslations("GroupStudioHeader");
    const [bannerUrl, setBannerUrl] = React.useState<string | null>(null);
    const [colorHex, setColorHex] = React.useState<string | null>(null);
    const [isArchived, setIsArchived] = React.useState(false);
    const [isReady, setIsReady] = React.useState(false);
    const [loadError, setLoadError] = React.useState<string | null>(null);
    const [headerAction, setHeaderAction] = React.useState<React.ReactNode>(null);
    const [redirectTarget, setRedirectTarget] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!groupId) return;

        let cancelled = false;

        void (async () => {
            try {
                if (!cancelled) {
                    setIsReady(false);
                    setLoadError(null);
                    setRedirectTarget(null);
                }

                const result = await fetchGroupBanner(groupId);
                if (result.error) {
                    console.error("[GroupShell] Failed to load data:", { status: result.error.status });
                    if (!cancelled) {
                        if (result.error.status === 401 || result.error.status === 403) {
                            setRedirectTarget(`/${locale}/task-access-denied?reason=forbidden`);
                            return;
                        }

                        setLoadError(tGroupHeader("errors.fetchDetailFailed"));
                    }
                    return;
                }

                const bannerSettings = extractBannerSettings(result.data);
                if (cancelled) return;

                setBannerUrl(bannerSettings.bannerUrl);
                setColorHex(bannerSettings.colorHex);
                setIsArchived(Boolean(bannerSettings.isArchived));
            } catch (error) {
                console.error("[GroupShell] Failed to load data:", {
                    status: error instanceof Response ? error.status : undefined
                });
                if (!cancelled) {
                    setLoadError(tGroupHeader("errors.fetchDetailFailed"));
                }
            } finally {
                if (!cancelled) {
                    setIsReady(true);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [groupId, locale, tGroupHeader]);

    React.useEffect(() => {
        if (!redirectTarget) return;
        router.replace(redirectTarget);
    }, [redirectTarget, router]);

    React.useEffect(() => {
        if (!isReady || !groupId || !isArchived) return;

        const settingPrefix = `/group/${groupId}/setting`;
        if (pathname === settingPrefix || pathname.startsWith(`${settingPrefix}/`)) return;

        const localePrefix = pathname.split("/").filter(Boolean)[0] || "vi";
        router.replace(`/${localePrefix}/group/${groupId}/setting`);
    }, [groupId, isArchived, isReady, pathname, router]);

    if (!isReady) {
        return <div className="flex min-h-screen items-center justify-center px-6 text-sm text-[#6F6B99]">{tCommon("loading")}</div>;
    }

    if (redirectTarget) {
        return null;
    }

    if (loadError) {
        return <ErrorDisplay message={loadError} />;
    }

    return (
        <GroupHeaderActionContext.Provider value={{ setHeaderAction }}>
            <div className="relative min-h-screen overflow-x-hidden">
                <div className="pointer-events-none absolute inset-0 z-0">
                    <GroupBannerBackground bannerUrl={bannerUrl} colorHex={colorHex} />
                </div>

                <div className="relative z-20 back-ground-transparent">
                    <GroupStudioHeader groupId={groupId} headerAction={headerAction} />
                    <div className="relative z-20 overflow-visible">{children}</div>
                </div>
            </div>
        </GroupHeaderActionContext.Provider>
    );
}

export function useGroupHeaderActionSlot() {
    return React.useContext(GroupHeaderActionContext);
}
