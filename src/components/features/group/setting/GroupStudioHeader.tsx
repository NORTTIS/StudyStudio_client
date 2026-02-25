"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import { twMerge } from "tailwind-merge";
import {
    BarChart3,
    Calendar,
    FileText,
    LayoutGrid,
    List,
    MessageSquare,
    Settings,
    Trash2,
    Users
} from "lucide-react";

type Tab = {
    key: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    href: (locale: string, groupId: string) => string;
};

type GroupDetail = {
    groupId?: string;
    groupName?: string | null;
    description?: string | null;
    studioName?: string | null;
    memberCount?: number | null;
};

type GroupDetailResponse = {
    status?: string | null;
    code?: string | null;
    message?: string | null;
    data?: GroupDetail | null;
};

type GroupUpdatedDetail = {
    id: string;
    name?: string | null;
    description?: string | null;
    studioName?: string | null;
    memberCount?: number | null;
};

const GROUP_UPDATED_EVENT = "group:updated";

const stripLocale = (p: string) => p.replace(/^\/[a-z]{2}(?=\/)/i, "");

const extractGroupIdFromPath = (pathname: string) => {
    const p = stripLocale(pathname || "");
    const m = p.match(/^\/group\/([^/]+)/i);
    return m?.[1] || "";
};

const readText = async (res: Response) => {
    try {
        return await res.text();
    } catch {
        return "";
    }
};

const getApiBase = () => {
    const raw = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    const base = String(raw).replace(/\/+$/, "");
    return base.endsWith("/api") ? base : `${base}/api`;
};

export function GroupStudioHeader({ groupId: groupIdProp }: { groupId?: string }) {
    const locale = useLocale();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const groupId =
        groupIdProp ||
        searchParams.get("id") ||
        extractGroupIdFromPath(pathname || "") ||
        "";

    const [groupName, setGroupName] = React.useState<string>("Group");
    const [groupDesc, setGroupDesc] = React.useState<string>("");
    const [studioName, setStudioName] = React.useState<string>("");
    const [memberCount, setMemberCount] = React.useState<number>(0);
    const [error, setError] = React.useState<string>("");

    const tabs: Tab[] = [
        { key: "board", label: "Board", icon: LayoutGrid, href: (l, id) => `/${l}/group/${id}` },
        { key: "list", label: "List", icon: List, href: (l, id) => `/${l}/group/${id}/list` },
        { key: "calendar", label: "Calendar", icon: Calendar, href: (l, id) => `/${l}/group/${id}/calendar` },
        { key: "documents", label: "Documents", icon: FileText, href: (l, id) => `/${l}/group/${id}/documents` },
        { key: "discuss", label: "Discuss", icon: MessageSquare, href: (l, id) => `/${l}/group/${id}/discuss` },
        { key: "analytic", label: "Analytic", icon: BarChart3, href: (l, id) => `/${l}/group/${id}/analytic` },
        { key: "setting", label: "Setting", icon: Settings, href: (l, id) => `/${l}/group/${id}/setting` },
        { key: "trashed", label: "Trashed", icon: Trash2, href: (l, id) => `/${l}/group/${id}/trashed` }
    ];

    React.useEffect(() => {
        if (!groupId) return;

        let alive = true;

        (async () => {
            try {
                setError("");

                const apiBase = getApiBase();
                const token = localStorage.getItem("accessToken") || "";

                const res = await fetch(`${apiBase}/group/${groupId}/detail`, {
                    headers: {
                        Accept: "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    },
                    cache: "no-store"
                });

                const text = await readText(res);
                let json: any = null;

                try {
                    json = text ? JSON.parse(text) : null;
                } catch { }

                if (!res.ok) {
                    const msg = json?.message || text || `Failed to fetch group detail (${res.status})`;
                    throw new Error(msg);
                }

                const parsed = (json as GroupDetailResponse) || {};
                const data = parsed?.data ?? null;

                if (!alive) return;

                setGroupName(data?.groupName || "Group");
                setGroupDesc(data?.description || "");
                setStudioName(data?.studioName || "");

                const c = Number(data?.memberCount ?? 0);
                setMemberCount(Number.isFinite(c) ? c : 0);
            } catch (e: any) {
                if (!alive) return;
                setError(e?.message || "Failed to fetch group detail");
            }
        })();

        return () => {
            alive = false;
        };
    }, [groupId]);

    React.useEffect(() => {
        if (!groupId) return;

        const onUpdated = (ev: Event) => {
            const e = ev as CustomEvent<GroupUpdatedDetail>;
            const d = e?.detail;
            if (!d?.id || d.id !== groupId) return;

            if (typeof d.name !== "undefined") setGroupName(d.name || "Group");
            if (typeof d.description !== "undefined") setGroupDesc(d.description || "");
            if (typeof d.studioName !== "undefined") setStudioName(d.studioName || "");

            if (typeof d.memberCount !== "undefined" && d.memberCount != null) {
                const c = Number(d.memberCount);
                setMemberCount(Number.isFinite(c) ? c : 0);
            }
        };

        window.addEventListener(GROUP_UPDATED_EVENT, onUpdated);
        return () => window.removeEventListener(GROUP_UPDATED_EVENT, onUpdated);
    }, [groupId]);

    const curPath = stripLocale(pathname || "");

    return (
        <div className="w-full bg-white">
            <div className="mx-auto w-full max-w-6xl px-6 pt-8">
                <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0">
                        {studioName ? <p className="text-sm text-[#6F6B99]">{studioName}</p> : null}

                        <h1 className="mt-1 truncate text-3xl font-semibold text-[#261E33]">
                            {groupName}
                        </h1>

                        {groupDesc ? <p className="mt-2 text-lg text-[#6F6B99]">{groupDesc}</p> : null}
                        {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
                    </div>

                    <div className="flex items-center gap-2 text-[#6F6B99]">
                        <Users className="h-4 w-4" />
                        <span className="text-sm">{memberCount} thành viên</span>
                    </div>
                </div>
            </div>

            <div className="mt-6 border-b border-[#EDEDED]">
                <div className="mx-auto w-full max-w-6xl px-6">
                    <div className="flex flex-wrap items-center justify-center gap-3 -mb-px">
                        {tabs.map((t) => {
                            const Icon = t.icon;
                            const href = groupId ? t.href(locale, groupId) : "#";
                            const target = stripLocale(href.split("?")[0] || href);

                            const active =
                                t.key === "board"
                                    ? curPath === target
                                    : curPath === target || curPath.startsWith(target + "/");

                            return (
                                <Link
                                    key={t.key}
                                    href={href}
                                    className={twMerge(
                                        "inline-flex items-center gap-2 rounded-t-xl border border-transparent px-4 py-2 text-sm font-medium text-[#6F6B99] transition hover:bg-[#FAFAFA] hover:text-[#261E33]",
                                        active && "border-[#E5E5E5] border-b-white bg-white text-[#261E33]"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {t.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}