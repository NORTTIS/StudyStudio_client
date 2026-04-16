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
    // Loại bỏ dấu "/" thừa ở cuối để việc nối path API luôn ổn định.
    const raw = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    return String(raw).replace(/\/+$/, "");
}

function extractBannerSettings(raw: unknown) {
    const response = raw as GroupDetailBannerResponse | null;
    const data = response?.data ?? response;

    const normalizeRole = (role?: string | null) => {
        const normalized = String(role ?? "").trim().toLowerCase();
        // Chỉ giữ lại các role hợp lệ để tránh đẩy giá trị lạ vào UI.
        if (normalized === "owner" || normalized === "moderator" || normalized === "member" || normalized === "commenter" || normalized === "viewer") {
            return normalized;
        }
        return null;
    };

    // Gộp dữ liệu từ nhiều dạng response khác nhau về một cấu trúc dùng chung trong component.
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
    // Lấy token ở client để hỗ trợ cả cơ chế Bearer token lẫn cookie.
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
        // Loại bỏ BOM nếu có để tránh lỗi parse JSON từ một số backend.
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
                    // Reset trạng thái trước mỗi lần tải lại dữ liệu theo group hiện tại.
                    setIsReady(false);
                    setLoadError(null);
                    setRedirectTarget(null);
                }

                const result = await fetchGroupBanner(groupId);
                if (result.error) {
                    console.error("[GroupShell] Failed to load data:", { status: result.error.status });
                    if (!cancelled) {
                        // Nếu không có quyền truy cập thì chuyển sang trang báo lỗi quyền.
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

                // Chỉ lưu những giá trị cần thiết cho phần khung giao diện của group.
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
        // Tách effect redirect riêng để render không bị trộn với logic tải dữ liệu.
        router.replace(redirectTarget);
    }, [redirectTarget, router]);

    React.useEffect(() => {
        if (!isReady || !groupId || !isArchived) return;

        const settingPrefix = `/group/${groupId}/setting`;
        if (pathname === settingPrefix || pathname.startsWith(`${settingPrefix}/`)) return;

        // Group đã bị lưu trữ thì khóa người dùng vào khu vực cài đặt tương ứng.
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
                    {/* Nền banner chỉ để hiển thị nên không nhận tương tác chuột. */}
                    <GroupBannerBackground bannerUrl={bannerUrl} colorHex={colorHex} />
                </div>

                <div className="relative z-20 back-ground-transparent">
                    {/* Header có thể nhận action động từ các màn con thông qua context. */}
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
