"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import * as React from "react";
import { toast as sonnerToast } from "sonner";
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
        const normalized = String(role ?? "")
            .trim()
            .toLowerCase();
        // Chỉ giữ lại các role hợp lệ để tránh đẩy giá trị lạ vào UI.
        if (
            normalized === "owner" ||
            normalized === "moderator" ||
            normalized === "member" ||
            normalized === "commenter" ||
            normalized === "viewer"
        ) {
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

function isAbortLikeError(error: unknown) {
    if (!error) return false;
    if (error instanceof DOMException && error.name === "AbortError") return true;

    const name =
        typeof error === "object" && error !== null && "name" in error
            ? String((error as { name?: unknown }).name ?? "")
            : "";
    return name === "AbortError";
}

function isUuidLike(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        String(value ?? "").trim()
    );
}

export function GroupShell({ groupId, children }: { groupId: string; children: React.ReactNode }) {
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
        if (!isUuidLike(groupId)) {
            setRedirectTarget(`/${locale}/group-access-denied?reason=forbidden`);
            setIsReady(true);
            setLoadError(null);
            return;
        }

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
                    if (typeof result.error.status === "number") {
                        console.error(`[GroupShell] Failed to load data. Status: ${result.error.status}`);
                    } else {
                        console.error("[GroupShell] Failed to load data.");
                    }
                    if (!cancelled) {
                        // Phiên đăng nhập hết hạn thì quay về login; chỉ 403 mới là bị cấm truy cập thật sự.
                        if (result.error.status === 401) {
                            const redirectPath = encodeURIComponent(pathname || `/${locale}/group/${groupId}`);
                            setRedirectTarget(`/${locale}/login?redirect=${redirectPath}&fromLogin=1`);
                            return;
                        }

                        if (result.error.status === 400 || result.error.status === 403) {
                            setRedirectTarget(`/${locale}/group-access-denied?reason=forbidden`);
                            return;
                        }

                        if (result.error.status === 404) {
                            setRedirectTarget(`/${locale}/group-access-denied?reason=not_found`);
                            return;
                        }

                        // 429 Rate Limit: show toast + keep existing data
                        if (result.error.status === 429) {
                            sonnerToast.error("Thao tác quá nhanh, vui lòng thử lại sau.", {
                                id: "group-shell-rate-limit",
                                duration: 4000
                            });
                            setIsReady(true);
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
                if (cancelled || isAbortLikeError(error)) {
                    return;
                }

                const status = error instanceof Response ? error.status : undefined;
                if (typeof status === "number") {
                    // 429 Rate Limit: show toast + keep existing data
                    if (status === 429) {
                        sonnerToast.error("Thao tác quá nhanh, vui lòng thử lại sau.", {
                            id: "group-shell-rate-limit",
                            duration: 4000
                        });
                        if (!cancelled) setIsReady(true);
                        return;
                    }
                    console.error("[GroupShell] Failed to load data:", { status });
                } else {
                    console.error("[GroupShell] Failed to load data.");
                }
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
    }, [groupId, locale, pathname, tGroupHeader]);

    React.useEffect(() => {
        if (!redirectTarget) return;
        // Tách effect redirect riêng để render không bị trộn với logic tải dữ liệu.
        router.replace(redirectTarget);
    }, [redirectTarget, router]);

    React.useEffect(() => {
        if (!(isReady && groupId && isArchived)) return;

        const settingPrefix = `/group/${groupId}/setting`;
        if (pathname === settingPrefix || pathname.startsWith(`${settingPrefix}/`)) return;

        // Group đã bị lưu trữ thì khóa người dùng vào khu vực cài đặt tương ứng.
        const localePrefix = pathname.split("/").filter(Boolean)[0] || "vi";
        router.replace(`/${localePrefix}/group/${groupId}/setting`);
    }, [groupId, isArchived, isReady, pathname, router]);

    if (!isReady) {
        return (
            <div className="flex min-h-screen items-center justify-center px-6 text-[#6F6B99] text-sm">
                {tCommon("loading")}
            </div>
        );
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

                <div className="back-ground-transparent relative z-20">
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
