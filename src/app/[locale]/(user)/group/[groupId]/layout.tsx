"use client";

import * as React from "react";
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
    } | null;
    bannerUrl?: string | null;
    colorHex?: string | null;
};

function getApiBase() {
    const raw = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    return String(raw).replace(/\/+$/, "");
}

function extractBannerSettings(raw: unknown) {
    const response = raw as GroupDetailBannerResponse | null;
    const data = response?.data ?? response;

    return {
        bannerUrl: data?.bannerUrl ? toPublicUrl(data.bannerUrl) : null,
        colorHex: data?.colorHex ?? null
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
    const [bannerUrl, setBannerUrl] = React.useState<string | null>(null);
    const [colorHex, setColorHex] = React.useState<string | null>(null);

    React.useEffect(() => {
        const groupId = resolvedParams.groupId;
        if (!groupId) return;

        void (async () => {
            const data = await fetchGroupBanner(groupId);
            const bannerSettings = extractBannerSettings(data);
            setBannerUrl(bannerSettings.bannerUrl);
            setColorHex(bannerSettings.colorHex);
        })();
    }, [resolvedParams.groupId]);
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
