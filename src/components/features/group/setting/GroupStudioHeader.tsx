"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { twMerge } from "tailwind-merge";
import {
    Calendar,
    FileText,
    LayoutGrid,
    List,
    MessageSquare,
    Settings,
    Trash2,
    BarChart3
} from "lucide-react";

type Tab = {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
};

type ApiMemberPreview = {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
};

type GroupLite = {
    id?: string;
    name?: string | null;
    description?: string | null;
    studio?: { id?: string; name?: string | null } | null;
    membersPreview?: ApiMemberPreview[] | null;
};

type GroupUpdatedDetail = {
    id: string;
    name?: string | null;
    description?: string | null;
    studioName?: string | null;
};

const GROUP_UPDATED_EVENT = "group:updated";

const safeInitials = (first?: string | null, last?: string | null) => {
    const f = (first ?? "").trim();
    const l = (last ?? "").trim();
    const i1 = f ? f[0] : "";
    const i2 = l ? l[0] : "";
    const out = `${i1}${i2}`.toUpperCase();
    return out || "U";
};

export function GroupStudioHeader() {
    const pathname = usePathname();
    const locale = useLocale();
    const searchParams = useSearchParams();
    const groupId = searchParams.get("id") || "";

    const [groupName, setGroupName] = React.useState<string>("Group");
    const [groupDesc, setGroupDesc] = React.useState<string>("");
    const [masterStudioName, setMasterStudioName] = React.useState<string>("");
    const [membersPreview, setMembersPreview] = React.useState<ApiMemberPreview[]>([]);

    const base = `/${locale}/group`;

    const tabs: Tab[] = [
        { label: "Board", href: `${base}/board?id=${groupId}`, icon: LayoutGrid },
        { label: "List", href: `${base}/list?id=${groupId}`, icon: List },
        { label: "Calendar", href: `${base}/calendar?id=${groupId}`, icon: Calendar },
        { label: "Documents", href: `${base}/documents?id=${groupId}`, icon: FileText },
        { label: "Discuss", href: `${base}/discuss?id=${groupId}`, icon: MessageSquare },
        { label: "Analytic", href: `${base}/analytic?id=${groupId}`, icon: BarChart3 },
        { label: "Setting", href: `${base}/setting?id=${groupId}`, icon: Settings },
        { label: "Trashed", href: `${base}/trashed?id=${groupId}`, icon: Trash2 }
    ];

    const applyGroup = React.useCallback((g?: GroupLite | null) => {
        if (!g) return;
        setGroupName(g.name || "Group");
        setGroupDesc(g.description || "");
        setMasterStudioName(g.studio?.name || "");
        setMembersPreview((g.membersPreview ?? []).filter(Boolean));
    }, []);

    React.useEffect(() => {
        if (!groupId) return;

        let alive = true;

        (async () => {
            try {
                const res = await fetch("http://localhost:8080/api/group", {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`
                    },
                    cache: "no-store"
                });

                const json = await res.json();

                const allGroups: GroupLite[] = [
                    ...(json?.data?.sections?.favorites || []),
                    ...(json?.data?.sections?.studioGroups || []),
                    ...(json?.data?.sections?.independentGroups || [])
                ];

                const g = allGroups.find((x) => x.id === groupId);

                if (!alive || !g) return;

                applyGroup(g);
            } catch (e) {
                console.error(e);
            }
        })();

        return () => {
            alive = false;
        };
    }, [groupId, applyGroup]);

    React.useEffect(() => {
        if (!groupId) return;

        const onUpdated = (ev: Event) => {
            const e = ev as CustomEvent<GroupUpdatedDetail>;
            const d = e?.detail;

            if (!d?.id || d.id !== groupId) return;

            if (typeof d.name !== "undefined") setGroupName(d.name || "Group");
            if (typeof d.description !== "undefined") setGroupDesc(d.description || "");
            if (typeof d.studioName !== "undefined") setMasterStudioName(d.studioName || "");
        };

        window.addEventListener(GROUP_UPDATED_EVENT, onUpdated);
        return () => window.removeEventListener(GROUP_UPDATED_EVENT, onUpdated);
    }, [groupId]);

    const isActive = (href: string) => {
        const stripLocale = (p: string) => p.replace(/^\/[a-z]{2}(?=\/)/i, "");
        const cur = stripLocale(pathname || "");
        const h = stripLocale(href.split("?")[0] || href);
        return cur === h || cur.startsWith(h + "/");
    };

    const maxBubbles = 5;
    const total = membersPreview.length;
    const shownMembers = membersPreview.slice(0, maxBubbles);
    const extra = Math.max(0, total - maxBubbles);

    return (
        <div className="w-full border-b bg-white">
            <div className="mx-auto w-full max-w-5xl px-6 pt-6">
                <div className="flex items-start justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-lg font-semibold text-gray-900">{groupName}</h1>

                            {masterStudioName ? (
                                <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                                    {masterStudioName}
                                </span>
                            ) : null}
                        </div>

                        {groupDesc ? <p className="mt-1 text-xs text-gray-500">{groupDesc}</p> : null}
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-1">
                            {shownMembers.map((m, idx) => (
                                <div
                                    key={m.id ?? idx}
                                    className="flex h-7 w-7 items-center justify-center rounded-full border bg-white text-[11px] font-semibold text-gray-600"
                                    title={`${(m.firstName ?? "").trim()} ${(m.lastName ?? "").trim()}`.trim()}
                                >
                                    {safeInitials(m.firstName, m.lastName)}
                                </div>
                            ))}

                            {extra > 0 ? (
                                <div className="flex h-7 w-7 items-center justify-center rounded-full border bg-white text-[11px] font-semibold text-gray-700">
                                    +{extra}
                                </div>
                            ) : null}
                        </div>

                        <button className="inline-flex h-8 items-center gap-2 rounded-sm border bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                            <span className="text-sm leading-none">＋</span>
                            Invite
                        </button>
                    </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-6 border-t pt-3">
                    {tabs.map((t) => {
                        const Icon = t.icon;
                        const active = isActive(t.href);
                        return (
                            <Link
                                key={t.href}
                                href={t.href}
                                className={twMerge(
                                    "relative inline-flex items-center gap-2 pb-3 text-xs font-semibold text-gray-500 hover:text-gray-900",
                                    active && "text-gray-900"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {t.label}
                                {active && <span className="absolute -bottom-[1px] left-0 h-[2px] w-full bg-gray-900" />}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}