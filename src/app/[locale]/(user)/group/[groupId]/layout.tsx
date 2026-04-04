"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { GroupStudioHeader } from "@/components/features/group/setting/GroupStudioHeader";
import { GroupBannerBackground } from "@/components/features/group/GroupBannerBackground";
import { toPublicUrl } from "@/api/banner-logo";

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

async function fetchGroupBanner(groupId: string) {
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

    const raw = await res.text();
    try {
        return JSON.parse(raw.replace(/^\uFEFF/, ""));
    } catch {
        return null;
    }
}

export default function Layout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ groupId: string }>;
}) {
    const resolvedParams = React.use(params);
    const router = useRouter();
    const pathname = usePathname();
    const [bannerUrl, setBannerUrl] = React.useState<string | null>(null);
    const [colorHex, setColorHex] = React.useState<string | null>(null);
    const [isArchived, setIsArchived] = React.useState(false);
    const [isReady, setIsReady] = React.useState(false);

    const groupId = resolvedParams.groupId;

    React.useEffect(() => {
        if (!groupId) return;

        void (async () => {
            try {
                setIsReady(false);
                const data = await fetchGroupBanner(groupId);
                const bannerSettings = extractBannerSettings(data);
                setBannerUrl(bannerSettings.bannerUrl);
                setColorHex(bannerSettings.colorHex);
                setIsArchived(Boolean(bannerSettings.isArchived));
            } finally {
                setIsReady(true);
            }
        })();
    }, [groupId]);

    React.useEffect(() => {
        if (!isReady || !groupId || !isArchived) return;

        const settingPathRegex = new RegExp(`/group/${groupId}/setting(?:/|$)`);
        if (settingPathRegex.test(pathname)) return;

        const localePrefix = pathname.split("/").filter(Boolean)[0] || "vi";
        router.replace(`/${localePrefix}/group/${groupId}/setting`);
    }, [groupId, isArchived, isReady, pathname, router]);

    if (!isReady) {
        return <div className="flex min-h-screen items-center justify-center px-6 text-sm text-[#6F6B99]">Đang tải...</div>;
    }
    return (
        <div className="relative min-h-screen overflow-hidden">
            <div className="pointer-events-none absolute inset-0 z-0">
                <GroupBannerBackground bannerUrl={bannerUrl} colorHex={colorHex} />
            </div>

            <div className="relative z-20 back-ground-transparent">
                <GroupStudioHeader />
                <div className="relative z-20">{children}</div>
            </div>
        </div>
    );
}
