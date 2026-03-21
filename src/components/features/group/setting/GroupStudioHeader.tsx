"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowLeft,
    BarChart3,
    Calendar,
    FileText,
    LayoutGrid,
    List,
    MessageSquare,
    Settings,
    Sparkles,
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
        const canSeeSetting = userRole === "owner";
        const canSeeTrashed = userRole === "owner" || userRole === "moderator";

        return tabs.filter((tab) => {
            if (tab.key === "setting" && !canSeeSetting) return false;
            if (tab.key === "trashed" && !canSeeTrashed) return false;
            return true;
        });
    }, [userRole, tabs.filter]);

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
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="w-full rounded-3xl border border-[#F3E4D7] bg-gradient-to-br from-[#FFFDFB] via-[#FFF8F2] to-[#FFF3E8] px-4 py-5 shadow-[0_10px_40px_rgba(234,88,12,0.06)] lg:px-6 lg:py-6">
                <div className="mb-6 flex flex-col justify-between gap-4">
                    <div>
                        <Link
                            href={`/${locale}/group`}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#F0E2D6] bg-[#FFFDFB] text-[#EA580C] shadow-sm transition-all duration-200 hover:-translate-y-1 hover:bg-gradient-to-r hover:from-orange-500 hover:to-red-600 hover:text-white hover:shadow-md hover:shadow-orange-200">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </div>

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <AnimatePresence mode="wait">
                                {studioName ? (
                                    <motion.p
                                        key={studioName}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        transition={{ duration: 0.22 }}
                                        className="flex items-center gap-2 font-medium text-[#8B6B4A] text-sm">
                                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
                                        {studioName}
                                    </motion.p>
                                ) : null}
                            </AnimatePresence>

                            <div className="mt-2 flex items-start gap-3">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 via-orange-500 to-red-600 shadow-md shadow-orange-200">
                                    <Users className="h-6 w-6 text-white" />
                                </div>

                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        <motion.h1
                                            layout
                                            transition={{ type: "spring", stiffness: 280, damping: 26 }}
                                            className="truncate font-bold text-2xl text-[#261E33] tracking-tight lg:text-3xl">
                                            {groupName}
                                        </motion.h1>

                                        <motion.div layout transition={{ type: "spring", stiffness: 280, damping: 26 }}>
                                            <RolePill role={userRole} />
                                        </motion.div>
                                    </div>

                                    <AnimatePresence mode="wait">
                                        {groupDesc ? (
                                            <motion.p
                                                key={groupDesc}
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -6 }}
                                                transition={{ duration: 0.22 }}
                                                className="mt-1.5 max-w-3xl text-[#7C6A5A] text-sm leading-6 lg:text-[15px]">
                                                {groupDesc}
                                            </motion.p>
                                        ) : null}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <AnimatePresence>
                                {error ? (
                                    <motion.p
                                        initial={{ opacity: 0, height: 0, y: -6 }}
                                        animate={{ opacity: 1, height: "auto", y: 0 }}
                                        exit={{ opacity: 0, height: 0, y: -6 }}
                                        transition={{ duration: 0.22 }}
                                        className="mt-4 overflow-hidden rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
                                        {error}
                                    </motion.p>
                                ) : null}
                            </AnimatePresence>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-3 self-start">
                            <motion.div
                                layout
                                whileHover={{ y: -1 }}
                                transition={{ duration: 0.18 }}
                                className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#F0E2D6] bg-[#FFFDFB] px-4 text-[#7C6A5A] text-sm shadow-sm">
                                <Users className="h-4 w-4 text-[#EA580C]" />
                                <span>
                                    <motion.span
                                        key={memberCount}
                                        initial={{ opacity: 0.6, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.2 }}
                                        className="font-semibold text-[#261E33]">
                                        {memberCount}
                                    </motion.span>{" "}
                                    thành viên
                                </span>
                            </motion.div>

                            {canInvite ? (
                                <motion.button
                                    type="button"
                                    onClick={() => setInviteOpen(true)}
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    transition={{ duration: 0.18 }}
                                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-5 font-semibold text-sm text-white shadow-md shadow-orange-200 transition-all duration-200 hover:from-orange-500 hover:to-red-700 hover:shadow-lg hover:shadow-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-300">
                                    <UserPlus className="h-4 w-4" />
                                    Thêm thành viên
                                </motion.button>
                            ) : null}
                        </div>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05, duration: 0.3 }}
                    className="mt-2">
                    <div className="flex w-fit max-w-full items-center gap-2 overflow-x-auto rounded-2xl border border-[#F3E4D7] bg-[#FFFCF8] p-1.5 shadow-sm">
                        {visibleTabs.map((tab) => {
                            const Icon = tab.icon;
                            const href = groupId ? tab.href(locale, groupId) : "#";
                            const target = stripLocale(href.split("?")[0] || href);

                            const active =
                                tab.key === "board"
                                    ? curPath === target
                                    : curPath === target || curPath.startsWith(`${target}/`);

                            return (
                                <Link key={tab.key} href={href} className="relative shrink-0">
                                    <motion.div
                                        whileHover={{ y: -1 }}
                                        whileTap={{ scale: 0.98 }}
                                        transition={{ duration: 0.15 }}
                                        className={twMerge(
                                            "group relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-medium text-sm transition-all duration-200",
                                            active
                                                ? "text-white shadow-md shadow-orange-200"
                                                : "text-[#6B7280] hover:bg-[#FFF1E6] hover:text-[#EA580C]"
                                        )}>
                                        {active ? (
                                            <motion.div
                                                layoutId="activeGroupTab"
                                                className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500 to-red-600"
                                                transition={{
                                                    type: "spring",
                                                    stiffness: 380,
                                                    damping: 30
                                                }}
                                            />
                                        ) : null}

                                        <Icon
                                            className={twMerge(
                                                "relative z-10 h-4 w-4 transition-colors duration-200",
                                                active ? "text-white" : "text-[#8C8C8C] group-hover:text-[#EA580C]"
                                            )}
                                        />
                                        <span className="relative z-10 whitespace-nowrap">{tab.label}</span>
                                    </motion.div>
                                </Link>
                            );
                        })}
                    </div>
                </motion.div>

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
            </motion.div>
        </Container>
    );
}