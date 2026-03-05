"use client";

import {
    BarChart3,
    Calendar,
    FileText,
    LayoutGrid,
    List,
    MessageSquare,
    Sparkles,
    Settings,
    Trash2,
    UserPlus,
    Users
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import * as React from "react";
import { twMerge } from "tailwind-merge";
import { Container } from "@/components/common";
import { InviteMemberModal, type InviteRole } from "@/components/features/group/setting/InviteMemberModal";
import { useToast } from "@/components/ui/use-toast";
import { RolePill } from "../RolePill";
import type { GroupRole } from "../types";

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
    userRole?: string | null;
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

type ApiGroupMembersResponse = {
    status?: string | null;
    code?: string | null;
    message?: string | null;
    data?: {
        members?:
        | {
            role?: string | null;
        }[]
        | null;
    } | null;
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

const okByJsonStatus = (obj: any) => {
    const s = String(obj?.status ?? "").toLowerCase();
    return s === "" || s === "success" || s === "ok" || s === "true";
};

const ROLE_FORMATS = (role: string) => {
    const raw = String(role).trim();
    const upper = raw.toUpperCase();
    const roleUpper = `ROLE_${upper}`;
    return [raw, upper, roleUpper];
};

const getApiBase = () => {
    const raw = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    const base = String(raw).replace(/\/+$/, "");
    return base.endsWith("/api") ? base : `${base}/api`;
};

const toMemberRole = (r?: string | null) => {
    const s = String(r ?? "")
        .trim()
        .replace(/^ROLE_/i, "")
        .replace(/^GROUP_/i, "")
        .replace(/^STUDIO_/i, "")
        .replace(/^TEAM_/i, "")
        .replace(/\s+/g, "")
        .toLowerCase();

    if (s === "owner") return "owner";
    if (s === "moderator") return "moderator";
    if (s === "member") return "member";
    if (s === "commenter") return "commenter";
    if (s === "viewer") return "viewer";
    return "member";
};

export function GroupStudioHeader({ groupId: groupIdProp }: { groupId?: string }) {
    const locale = useLocale();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    const t = useTranslations("Common");

    const groupId = groupIdProp || searchParams.get("id") || extractGroupIdFromPath(pathname || "") || "";

    const [groupName, setGroupName] = React.useState<string>("Group");
    const [groupDesc, setGroupDesc] = React.useState<string>("");
    const [studioName, setStudioName] = React.useState<string>("");
    const [memberCount, setMemberCount] = React.useState<number>(0);
    const [userRole, setUserRole] = React.useState<GroupRole>("member");
    const [error, setError] = React.useState<string>("");

    const [inviteOpen, setInviteOpen] = React.useState(false);
    const [hasModerator, setHasModerator] = React.useState(false);

    const tabs: Tab[] = [
        { key: "board", label: "Board", icon: LayoutGrid, href: (l, id) => `/${l}/group/${id}` },
        { key: "list", label: "List", icon: List, href: (l, id) => `/${l}/group/${id}/list` },
        { key: "calendar", label: "Calendar", icon: Calendar, href: (l, id) => `/${l}/group/${id}/calendar` },
        { key: "documents", label: "Documents", icon: FileText, href: (l, id) => `/${l}/group/${id}/documents` },
        { key: "ai-qa", label: t("aiQATab"), icon: Sparkles, href: (l, id) => `/${l}/group/${id}/ai-qa` },
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
                    toast({
                        description: msg,
                        variant: "destructive"
                    });
                    if (res.status === 403) {
                        router.replace(`/${locale}/home`);
                    }
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

                const role = toMemberRole(data?.userRole);
                setUserRole(role as GroupRole);

                if (token) {
                    const mRes = await fetch(`${apiBase}/group/${groupId}/members`, {
                        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
                        cache: "no-store"
                    });

                    const mText = await readText(mRes);
                    let mJson: any = null;
                    try {
                        mJson = mText ? JSON.parse(mText) : null;
                    } catch { }

                    if (alive && mRes.ok) {
                        const members = (mJson as ApiGroupMembersResponse)?.data?.members ?? [];
                        const anyMod = members.some((x) => {
                            const r = String(x?.role ?? "");
                            const rr = String(r)
                                .trim()
                                .replace(/^ROLE_/i, "")
                                .replace(/^GROUP_/i, "")
                                .replace(/^STUDIO_/i, "")
                                .replace(/^TEAM_/i, "")
                                .replace(/\s+/g, "")
                                .toLowerCase();
                            return rr === "moderator";
                        });
                        setHasModerator(anyMod);
                    }
                }
            } catch (e: any) {
                if (!alive) return;
                setError(e?.message || "Failed to fetch group detail");
            }
        })();

        return () => {
            alive = false;
        };
    }, [groupId, locale, router, toast]);

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
    const canInvite = userRole === "owner" || userRole === "moderator";
    const apiBase = getApiBase();

    const visibleTabs = React.useMemo(() => {
        if (userRole === "owner") return tabs;
        return tabs.filter((x) => x.key !== "setting");
    }, [tabs, userRole]);

    const getTokenOrFail = () => {
        const token = localStorage.getItem("accessToken") || "";
        if (!token) {
            toast({ description: "Thiếu access token", variant: "destructive" });
            return null;
        }
        return token;
    };

    const createInviteLinkApi = async (role: InviteRole): Promise<string | null> => {
        if (!groupId) return null;

        const token = getTokenOrFail();
        if (!token) return null;

        for (const apiRole of ROLE_FORMATS(role)) {
            const res = await fetch(`${apiBase}/invite/create`, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ groupId, role: apiRole })
            });

            const text = await readText(res);
            let json: any = null;
            try {
                json = text ? JSON.parse(text) : null;
            } catch { }

            if (res.ok && json && okByJsonStatus(json)) {
                const url = String(json?.data?.inviteUrl ?? "").trim();
                if (url) return url;
                toast({
                    description: `[invite/create] thiếu inviteUrl (sent role="${apiRole}")`,
                    variant: "destructive"
                });
                return null;
            }

            const msg = json?.message || text || `Tạo link thất bại (${res.status})`;
            toast({
                description: `[invite/create ${res.status}] ${msg} (sent role="${apiRole}")`,
                variant: "destructive"
            });
        }

        return null;
    };

    const inviteMemberApi = async (email: string, role: InviteRole) => {
        if (!groupId) return false;

        const token = getTokenOrFail();
        if (!token) return false;

        for (const apiRole of ROLE_FORMATS(role)) {
            const res = await fetch(`${apiBase}/invite/email`, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ groupId, email, role: apiRole })
            });

            const text = await readText(res);
            let json: any = null;
            try {
                json = text ? JSON.parse(text) : null;
            } catch { }

            if (res.ok && (!json || okByJsonStatus(json))) return true;

            const msg = json?.message || text || `Mời thành viên thất bại (${res.status})`;
            toast({
                description: `[invite/email ${res.status}] ${msg} (sent role="${apiRole}")`,
                variant: "destructive"
            });
        }

        return false;
    };

    return (
        <Container>
            <div className="w-full bg-white">
                <div>
                    {/* ====== HEADER GIỮ NGUYÊN STYLE NHƯ ẢNH (bạn muốn giữ) ====== */}
                    <div className="flex items-start justify-between gap-6">
                        <div className="min-w-0">
                            {studioName ? (
                                <p className="flex items-center gap-2 text-[#6F6B99] text-sm">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                    {studioName}
                                </p>
                            ) : null}

                            <div className="flex items-center gap-2">
                                <h1 className="mt-1 truncate font-semibold text-3xl text-[#261E33]">{groupName}</h1>
                                <RolePill role={userRole} />
                            </div>

                            {groupDesc ? <p className="mt-2 text-[#6F6B99] text-lg">{groupDesc}</p> : null}

                            {error ? (
                                <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm">
                                    {error}
                                </p>
                            ) : null}
                        </div>

                        <div className="flex items-center gap-3 text-[#6F6B99]">
                            {/* badge thành viên giống ảnh (bọc pill) */}
                            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 shadow-sm">
                                <Users className="h-4 w-4" />
                                <span className="text-sm">
                                    <span className="font-semibold text-[#261E33]">{memberCount}</span> thành viên
                                </span>
                            </div>

                            {canInvite ? (
                                <button
                                    type="button"
                                    onClick={() => setInviteOpen(true)}
                                    className="inline-flex h-11 items-center gap-2 rounded-full bg-orange-600 px-5 font-semibold text-sm text-white shadow-sm transition hover:bg-orange-700 active:scale-[0.98]">
                                    <UserPlus className="h-4 w-4" />
                                    Thêm thành viên
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>

                {/* ====== TABS: bọc thẻ + pill đẹp hơn (phần bạn chê xấu) ====== */}
                <div className="mt-6">
                    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
                        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto p-2">
                            {visibleTabs.map((tab) => {
                                const Icon = tab.icon;
                                const href = groupId ? tab.href(locale, groupId) : "#";
                                const target = stripLocale(href.split("?")[0] || href);

                                const active =
                                    tab.key === "board"
                                        ? curPath === target
                                        : curPath === target || curPath.startsWith(target + "/");

                                return (
                                    <Link
                                        key={tab.key}
                                        href={href}
                                        className={twMerge(
                                            "group inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 font-medium text-sm transition",
                                            "text-[#6F6B99] hover:bg-zinc-50 hover:text-[#261E33]",
                                            "focus:outline-none focus:ring-2 focus:ring-orange-500/25",
                                            active &&
                                            "bg-orange-600 text-white shadow-sm hover:bg-orange-600 hover:text-white"
                                        )}>
                                        <Icon
                                            className={twMerge(
                                                "h-4 w-4",
                                                active ? "text-white" : "text-[#6F6B99] group-hover:text-[#261E33]"
                                            )}
                                        />
                                        {tab.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <InviteMemberModal
                    open={inviteOpen}
                    onClose={() => setInviteOpen(false)}
                    groupName={groupName || "Group"}
                    canManage={canInvite}
                    hasModerator={hasModerator}
                    onCreateLink={async ({ role }) => {
                        const url = await createInviteLinkApi(role);
                        if (!url) throw new Error("Create link failed");
                        return url;
                    }}
                    onSendInvite={async ({ email, role }) => {
                        const ok = await inviteMemberApi(email, role);
                        if (!ok) return;
                    }}
                />
            </div>
        </Container>
    );
}
