"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowLeft,
    BarChart3,
    Calendar,
    FileText,
    LayoutGrid,
    List,
    LogOut,
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
import { components } from "@/api/types";
import { Container } from "@/components/common";
import { InviteMemberModal, type InviteRole } from "@/components/features/group/setting/InviteMemberModal";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { leaveGroup } from "../group.api";
import { RolePill } from "../RolePill";
import type { GroupRole } from "../types";

type Tab = {
    key: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    href: (locale: string, groupId: string) => string;
};

type GroupDetail = components["schemas"]["GroupDetailResponse"];

type GroupDetailResponse = {
    status?: string | null;
    code?: string | null;
    message?: string | null;
    data?: GroupDetail | null;
};

type StudioResponse = components["schemas"]["StudioResponse"];

type StudioResponseApiResponse = {
    status?: string | null;
    code?: string | null;
    message?: string | null;
    data?: StudioResponse | null;
};

type GroupUpdatedDetail = {
    id: string;
    name?: string | null;
    description?: string | null;
    studioName?: string | null;
    memberCount?: number | null;
    requiresMemberApproval?: boolean | null;
    isArchived?: boolean | null;
    studioIsArchived?: boolean | null;
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

const _ROLE_FORMATS = (role: string) => {
    const raw = String(role).trim();
    const upper = raw.toUpperCase();
    const roleUpper = `ROLE_${upper}`;
    return [raw, upper, roleUpper];
};

const normalizeInviteRoleForApi = (role: InviteRole) => {
    const normalized = String(role).trim().toLowerCase();

    if (normalized === "moderator") return "moderator";
    if (normalized === "commenter") return "commenter";
    if (normalized === "viewer") return "viewer";
    return "member";
};

const normalizeErrorMessage = (value: string, fallback: string) => {
    const raw = String(value || "").trim();
    if (!raw) return fallback;

    const lowered = raw.toLowerCase();
    const isInviteLimitError =
        (lowered.includes("invite") || lowered.includes("lời mời")) &&
        (lowered.includes("limit") ||
            lowered.includes("quota") ||
            lowered.includes("too many") ||
            lowered.includes("maximum"));

    if (isInviteLimitError) {
        return "Bạn đã vượt quá giới hạn tạo lời mời. Vui lòng thử lại sau.";
    }

    const cleaned = raw
        .replace(/\[[^\]]+\]/g, " ")
        .replace(/\b(http\s*)?\d{3}\b/gi, " ")
        .replace(/\b(code|error\s*code|status)\s*[:=]\s*[^\s,;]+/gi, " ")
        .replace(/\s{2,}/g, " ")
        .trim();

    return cleaned || fallback;
};

const getApiBase = () => {
    const raw = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    const base = String(raw).replace(/\/+$/, "");
    return base.endsWith("/api") ? base : `${base}/api`;
};

const extractTokenFromInviteUrl = (inviteUrl: string) => {
    const raw = String(inviteUrl || "").trim();
    if (!raw) return "";

    try {
        const parsed = new URL(raw, typeof window !== "undefined" ? window.location.origin : "http://localhost");
        const tokenFromQuery = String(parsed.searchParams.get("token") ?? "").trim();
        if (tokenFromQuery) return tokenFromQuery;

        const pathMatch = parsed.pathname.match(/\/(?:invite|studio-invite)\/([^/?#]+)/i);
        if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]);
    } catch {
        const queryMatch = raw.match(/[?&]token=([^&#]+)/i);
        if (queryMatch?.[1]) return decodeURIComponent(queryMatch[1]);

        const pathMatch = raw.match(/\/(?:invite|studio-invite)\/([^/?#]+)/i);
        if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]);
    }

    return "";
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

export function GroupStudioHeader({
    groupId: groupIdProp,
    headerAction
}: {
    groupId?: string;
    headerAction?: React.ReactNode;
}) {
    const locale = useLocale();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    const tCommon = useTranslations("Common");
    const t = useTranslations("GroupStudioHeader");
    const tGroupCard = useTranslations("GroupCard");

    const groupId = groupIdProp || searchParams.get("id") || extractGroupIdFromPath(pathname || "") || "";
    const fromStudioId = String(searchParams.get("fromStudioId") || "").trim();

    const [groupName, setGroupName] = React.useState<string>("Group");
    const [groupAvatarUrl, setGroupAvatarUrl] = React.useState<string | null>(null);
    const [groupDesc, setGroupDesc] = React.useState<string>("");
    const [studioName, setStudioName] = React.useState<string>("");
    const [memberCount, setMemberCount] = React.useState<number>(0);
    const [userRole, setUserRole] = React.useState<GroupRole>(null);
    const [error, setError] = React.useState<string>("");
    const [groupTagline, setGroupTagline] = React.useState<string>("");
    const [groupAlias, setGroupAlias] = React.useState<string>("");
    const [groupColorHex, setGroupColorHex] = React.useState<string>("#FF5F3D");
    const [requiresMemberApproval, setRequiresMemberApproval] = React.useState<boolean>(false);
    const [isArchived, setIsArchived] = React.useState<boolean>(false);
    const [isStudioArchived, setIsStudioArchived] = React.useState<boolean>(false);
    const [statusPulseKey, setStatusPulseKey] = React.useState(0);

    const [inviteOpen, setInviteOpen] = React.useState(false);
    const [hasModerator, setHasModerator] = React.useState(false);
    const [showLeaveDialog, setShowLeaveDialog] = React.useState(false);
    const [isLeaving, setIsLeaving] = React.useState(false);

    const loadHeaderData = React.useCallback(
        async ({ suppressForbiddenRedirect = false }: { suppressForbiddenRedirect?: boolean } = {}) => {
            if (!groupId) return;

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
                const msg = normalizeErrorMessage(
                    String(json?.message || text || ""),
                    t("errors.fetchDetailFailed")
                );
                toast({
                    description: msg,
                    variant: "destructive"
                });
                if (res.status === 403 && !suppressForbiddenRedirect) {
                    router.replace(`/${locale}/home`);
                }
                throw new Error(msg);
            }

            const parsed = (json as GroupDetailResponse) || {};
            const data = parsed?.data ?? null;

            setGroupName(data?.groupName || "Group");
            setGroupAvatarUrl(data?.avatarUrl || null);
            setGroupDesc(data?.description || "");
            setStudioName(data?.studioName || "");
            setGroupTagline(data?.tagline || "");
            setGroupAlias(data?.alias || "");
            setGroupColorHex(data?.colorHex || "#FF5F3D");
            setIsArchived(Boolean(data?.isArchived ?? false));

            const resolvedStudioId = String(data?.studioId ?? "").trim();
            if (resolvedStudioId) {
                const studioRes = await fetch(`${apiBase}/studio/${resolvedStudioId}`, {
                    headers: {
                        Accept: "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    },
                    cache: "no-store"
                });

                const studioText = await readText(studioRes);
                let studioJson: unknown = null;
                try {
                    studioJson = studioText ? JSON.parse(studioText) : null;
                } catch { }

                const studioData = (studioJson as StudioResponseApiResponse | null)?.data;
                if (studioRes.ok && studioData) {
                    setIsStudioArchived(Boolean(studioData.isArchived ?? false));
                } else {
                    setIsStudioArchived(Boolean(data?.isArchived ?? false));
                }
            } else {
                setIsStudioArchived(Boolean(data?.isArchived ?? false));
            }

            const memberApprovalValue =
                (
                    data as GroupDetail & {
                        requiresMemberApproval?: boolean | null;
                        memberApprovalRequired?: boolean | null;
                    }
                )?.requiresMemberApproval ??
                (
                    data as GroupDetail & {
                        requiresMemberApproval?: boolean | null;
                        memberApprovalRequired?: boolean | null;
                    }
                )?.memberApprovalRequired ??
                false;
            setRequiresMemberApproval(Boolean(memberApprovalValue));

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

                if (mRes.ok) {
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
        },
        [groupId, locale, router, toast, t]
    );

    const tabs: Tab[] = React.useMemo(
        () => [
            { key: "board", label: t("tabs.board"), icon: LayoutGrid, href: (l, id) => `/${l}/group/${id}` },
            { key: "list", label: t("tabs.list"), icon: List, href: (l, id) => `/${l}/group/${id}/list` },
            {
                key: "calendar",
                label: t("tabs.calendar"),
                icon: Calendar,
                href: (l, id) => `/${l}/group/${id}/calendar`
            },
            {
                key: "documents",
                label: t("tabs.documents"),
                icon: FileText,
                href: (l, id) => `/${l}/group/${id}/documents`
            },
            { key: "ai-qa", label: tCommon("aiQATab"), icon: Sparkles, href: (l, id) => `/${l}/group/${id}/ai-qa` },
            {
                key: "discuss",
                label: t("tabs.discuss"),
                icon: MessageSquare,
                href: (l, id) => `/${l}/group/${id}/discuss`
            },
            {
                key: "analytic",
                label: t("tabs.analytic"),
                icon: BarChart3,
                href: (l, id) => `/${l}/group/${id}/analytic`
            },
            { key: "setting", label: t("tabs.setting"), icon: Settings, href: (l, id) => `/${l}/group/${id}/setting` },
            { key: "trashed", label: t("tabs.trashed"), icon: Trash2, href: (l, id) => `/${l}/group/${id}/trashed` }
        ],
        [t, tCommon]
    );

    const withNavigationContext = React.useCallback(
        (href: string) => {
            if (!fromStudioId) return href;

            const separator = href.includes("?") ? "&" : "?";
            return `${href}${separator}fromStudioId=${encodeURIComponent(fromStudioId)}`;
        },
        [fromStudioId]
    );

    React.useEffect(() => {
        if (!groupId) return;

        let alive = true;

        (async () => {
            try {
                await loadHeaderData();
            } catch (e: any) {
                if (!alive) return;
                setError(e?.message || t("errors.fetchDetailFailed"));
            }
        })();

        return () => {
            alive = false;
        };
    }, [groupId, loadHeaderData, t]);

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
            if (typeof d.requiresMemberApproval !== "undefined" && d.requiresMemberApproval != null) {
                setRequiresMemberApproval(Boolean(d.requiresMemberApproval));
            }
            if (typeof d.isArchived !== "undefined" && d.isArchived != null) {
                setIsArchived(Boolean(d.isArchived));
            }
            if (typeof d.studioIsArchived !== "undefined" && d.studioIsArchived != null) {
                setIsStudioArchived(Boolean(d.studioIsArchived));
            }

            void loadHeaderData({ suppressForbiddenRedirect: true }).catch(() => {
                // loadHeaderData already reports refresh failures to the user
            });
        };

        window.addEventListener(GROUP_UPDATED_EVENT, onUpdated);
        return () => window.removeEventListener(GROUP_UPDATED_EVENT, onUpdated);
    }, [groupId, loadHeaderData]);

    const curPath = stripLocale(pathname || "");
    const canInvite = userRole === "owner" || userRole === "moderator";
    const isInviteDisabled = isArchived || isStudioArchived;
    const canLeaveGroup = userRole !== "owner";
    const apiBase = getApiBase();
    const backHref = fromStudioId ? `/${locale}/master/${encodeURIComponent(fromStudioId)}` : `/${locale}/group`;
    const oneModeratorError =
        locale.startsWith("vi") ? "Mỗi nhóm chỉ được có 1 điều phối viên." : "Each group can only have 1 moderator.";

    const visibleTabs = React.useMemo(() => {
        const allowedRoles = userRole ? new Set([userRole]) : new Set<string>();
        const canSeeSetting = allowedRoles.has("owner") || allowedRoles.has("moderator");
        const canSeeTrashed = allowedRoles.has("owner") || allowedRoles.has("moderator");
        const canSeeAnalytic = allowedRoles.has("owner") || allowedRoles.has("moderator") || allowedRoles.has("member") || allowedRoles.has("commenter");
        const canSeeAI = allowedRoles.has("owner") || allowedRoles.has("moderator") || allowedRoles.has("member");

        return tabs.filter((tab) => {
            if (tab.key === "setting" && !canSeeSetting) return false;
            if (tab.key === "trashed" && !canSeeTrashed) return false;
            if (tab.key === "analytic" && !canSeeAnalytic) return false;
            if (tab.key === "ai-qa" && !canSeeAI) return false;
            return true;
        });
    }, [userRole, tabs]);

    const getTokenOrFail = () => {
        const token = localStorage.getItem("accessToken") || "";
        if (!token) {
            toast({ description: tCommon("missingAccessToken"), variant: "destructive" });
            return null;
        }
        return token;
    };

    const createInviteLinkApi = async (role: InviteRole): Promise<string | null> => {
        if (!groupId) return null;

        const token = getTokenOrFail();
        if (!token) return null;

        if (role === "Moderator" && hasModerator) {
            toast({ description: oneModeratorError, variant: "destructive" });
            return null;
        }

        const apiRole = normalizeInviteRoleForApi(role);
        const requestBody: Record<string, unknown> = {
            groupId,
            role: apiRole
        };

        if (requiresMemberApproval) {
            requestBody.requiresMemberApproval = true;
            requestBody.memberApprovalRequired = true;
            requestBody.isApproved = false;
            requestBody.pendingApproval = true;
        }

        const res = await fetch(`${apiBase}/invite/create`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(requestBody)
        });

        const text = await readText(res);
        let json: any = null;
        try {
            json = text ? JSON.parse(text) : null;
        } catch { }

        if (res.ok) {
            const inviteData = json?.data ?? json ?? {};
            const tokenFromApi = String(inviteData?.token ?? "").trim();
            const inviteUrlFromApi = String(inviteData?.inviteUrl ?? text.trim()).trim();

            const token = tokenFromApi || extractTokenFromInviteUrl(inviteUrlFromApi);

            if (token) {
                const origin = typeof window !== "undefined" ? window.location.origin : "";
                const pendingQuery = requiresMemberApproval ? "?pa=1" : "";
                return `${origin}/${locale}/invite/${encodeURIComponent(token)}${pendingQuery}`;
            }

            if (inviteUrlFromApi) return inviteUrlFromApi;
            toast({
                description: normalizeErrorMessage(tCommon("missingInviteUrl"), tCommon("inviteCreateFailed")),
                variant: "destructive"
            });
            return null;
        }

        const msg = normalizeErrorMessage(
            String(json?.message || text || tCommon("inviteCreateFailed")),
            tCommon("inviteCreateFailed")
        );
        toast({
            description: msg,
            variant: "destructive"
        });

        return null;
    };

    const inviteMemberApi = async (email: string, role: InviteRole) => {
        if (!groupId) return false;

        const token = getTokenOrFail();
        if (!token) return false;

        if (role === "Moderator" && hasModerator) {
            toast({ description: oneModeratorError, variant: "destructive" });
            return false;
        }

        const apiRole = normalizeInviteRoleForApi(role);
        const requestBody: Record<string, unknown> = {
            groupId,
            email,
            role: apiRole
        };

        if (requiresMemberApproval) {
            requestBody.requiresMemberApproval = true;
            requestBody.memberApprovalRequired = true;
            requestBody.isApproved = false;
            requestBody.pendingApproval = true;
        }

        const res = await fetch(`${apiBase}/invite/email`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(requestBody)
        });

        const text = await readText(res);
        let json: any = null;
        try {
            json = text ? JSON.parse(text) : null;
        } catch { }

        if (res.ok && (!json || okByJsonStatus(json))) return true;

        const msg = normalizeErrorMessage(
            String(json?.message || text || tCommon("inviteByEmailFailed")),
            tCommon("inviteByEmailFailed")
        );
        toast({
            description: msg,
            variant: "destructive"
        });

        return false;
    };

    const handleConfirmLeave = async () => {
        if (!groupId) return;

        try {
            setIsLeaving(true);
            await leaveGroup(groupId);
            setShowLeaveDialog(false);
            router.push(`/${locale}/group`);
        } catch (e: unknown) {
            toast({
                description: e instanceof Error ? e.message : tGroupCard("leaveGroup"),
                variant: "destructive"
            });
        } finally {
            setIsLeaving(false);
        }
    };

    return (
        <Container className="bg-transparent">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className={
                    "relative w-full overflow-visible rounded-3xl border border-[#F3E4D7] bg-[#FFF8F3] px-4 py-5 shadow-[0_10px_40px_rgba(234,88,12,0.06)] lg:px-6 lg:py-6"
                }>
                <div className="mb-6 flex flex-col justify-between gap-4">
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
                                        <span
                                            aria-label={isStudioArchived ? "inactive" : "active"}
                                            title={isStudioArchived ? "Đang dừng" : "Đang hoạt động"}
                                            className="relative inline-flex h-2.5 w-2.5 items-center justify-center">
                                            <span
                                                aria-hidden="true"
                                                className={twMerge(
                                                    "absolute inset-0 animate-ping rounded-full motion-reduce:animate-none",
                                                    isStudioArchived ? "bg-red-500/75" : "bg-emerald-400/60"
                                                )}
                                            />
                                            <motion.span
                                                key={`${isStudioArchived ? "inactive" : "active"}-${statusPulseKey}`}
                                                initial={{ scale: 0.85, opacity: 0.75 }}
                                                animate={{ scale: [1, 1.18, 1], opacity: [0.85, 1, 1] }}
                                                transition={{ duration: 0.34, ease: "easeOut" }}
                                                className={twMerge(
                                                    "relative h-2.5 w-2.5 rounded-full",
                                                    isStudioArchived ? "bg-red-600" : "bg-emerald-500"
                                                )}
                                                style={{
                                                    boxShadow: isStudioArchived
                                                        ? "0 0 0 4px rgba(220, 38, 38, 0.26), 0 0 12px rgba(220, 38, 38, 0.42)"
                                                        : "0 0 0 4px rgba(16, 185, 129, 0.14), 0 0 10px rgba(16, 185, 129, 0.28)"
                                                }}
                                            />
                                        </span>
                                        {studioName}
                                    </motion.p>
                                ) : null}
                            </AnimatePresence>

                            <div className="mt-2 flex items-start gap-3">
                                <div>
                                    <Link
                                        href={backHref}
                                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#F0E2D6] bg-[#FFFDFB] text-[#EA580C] shadow-sm transition-all duration-200 hover:-translate-y-1 hover:bg-linear-to-r hover:from-orange-500 hover:to-red-600 hover:text-white hover:shadow-md hover:shadow-orange-200">
                                        <ArrowLeft className="h-4 w-4" />
                                    </Link>
                                </div>
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-orange-500 via-orange-500 to-red-600 shadow-md shadow-orange-200">
                                    {groupAvatarUrl ? (
                                        <img
                                            src={groupAvatarUrl}
                                            alt="Group Avatar"
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <Users className="h-6 w-6 text-white" />
                                    )}
                                </div>

                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        <motion.h1
                                            layout
                                            transition={{ type: "spring", stiffness: 280, damping: 26 }}
                                            className="truncate font-bold text-2xl text-[#261E33] tracking-tight lg:text-3xl">
                                            {groupName}
                                        </motion.h1>

                                        {groupAlias ? (
                                            <motion.span
                                                layout
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ type: "spring", stiffness: 280, damping: 26 }}
                                                className="inline-flex items-center rounded-full border px-2.5 py-0.5 font-medium text-xs"
                                                style={{
                                                    backgroundColor: `${groupColorHex}18`,
                                                    borderColor: `${groupColorHex}40`,
                                                    color: groupColorHex
                                                }}>
                                                {groupAlias}
                                            </motion.span>
                                        ) : null}

                                        <motion.div layout transition={{ type: "spring", stiffness: 280, damping: 26 }}>
                                            <RolePill role={userRole} />
                                        </motion.div>
                                    </div>

                                    <AnimatePresence mode="wait">
                                        {groupTagline ? (
                                            <motion.p
                                                key={groupTagline}
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -6 }}
                                                transition={{ duration: 0.22 }}
                                                className="mt-1 text-[#9B8CA8] text-sm italic">
                                                {groupTagline}
                                            </motion.p>
                                        ) : null}
                                    </AnimatePresence>

                                    <AnimatePresence mode="wait">
                                        {groupDesc ? (
                                            <motion.p
                                                key={groupDesc}
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -6 }}
                                                transition={{ duration: 0.22 }}
                                                className="mt-1 max-w-3xl text-[#7C6A5A] text-sm leading-6 lg:text-[15px]">
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
                            {headerAction}

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
                                    {tCommon("members")}
                                </span>
                            </motion.div>

                            {canLeaveGroup ? (
                                <motion.button
                                    type="button"
                                    onClick={() => setShowLeaveDialog(true)}
                                    whileHover={{ y: -1 }}
                                    whileTap={{ scale: 0.98 }}
                                    transition={{ duration: 0.18 }}
                                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 shadow-sm transition-colors duration-200 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200"
                                    aria-label={tGroupCard("leaveGroup")}
                                    title={tGroupCard("leaveGroup")}
                                    disabled={isLeaving}>
                                    <LogOut className="h-4 w-4" />
                                </motion.button>
                            ) : null}

                            {canInvite ? (
                                <motion.button
                                    type="button"
                                    onClick={() => {
                                        if (isInviteDisabled) return;
                                        setInviteOpen(true);
                                    }}
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    transition={{ duration: 0.18 }}
                                    disabled={isInviteDisabled}
                                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-linear-to-r from-orange-500 to-red-600 px-5 font-semibold text-sm text-white shadow-md shadow-orange-200 transition-all duration-200 hover:from-orange-500 hover:to-red-700 hover:shadow-lg hover:shadow-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-orange-500 disabled:hover:to-red-600 disabled:hover:shadow-md">
                                    <UserPlus className="h-4 w-4" />
                                    {tCommon("addMember")}
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
                            const target = stripLocale(
                                (tab.href(locale, groupId) || "").split("?")[0] || tab.href(locale, groupId)
                            );
                            const tabDisabled = isArchived && tab.key !== "setting";

                            const active =
                                tab.key === "board"
                                    ? curPath === target || /^\/group\/task\/[^/]+$/i.test(curPath)
                                    : curPath === target || curPath.startsWith(`${target}/`);

                            const href = groupId ? withNavigationContext(tab.href(locale, groupId)) : "#";
                            return (
                                <Link
                                    key={tab.key}
                                    href={href}
                                    onClick={(e) => {
                                        if (tabDisabled) {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            return;
                                        }

                                        setStatusPulseKey((prev) => prev + 1);
                                    }}
                                    aria-disabled={tabDisabled}
                                    className={twMerge("relative shrink-0", tabDisabled ? "cursor-not-allowed" : "")}>
                                    <motion.div
                                        whileHover={tabDisabled ? undefined : { y: -1 }}
                                        whileTap={tabDisabled ? undefined : { scale: 0.98 }}
                                        transition={{ duration: 0.15 }}
                                        className={twMerge(
                                            "group relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-medium text-sm transition-all duration-200",
                                            tabDisabled
                                                ? "text-[#94A3B8] opacity-55"
                                                : active
                                                    ? "text-white shadow-md shadow-orange-200"
                                                    : "text-[#6B7280] hover:bg-[#FFF1E6] hover:text-[#EA580C]"
                                        )}>
                                        {active && !tabDisabled ? (
                                            <motion.div
                                                layoutId="activeGroupTab"
                                                className="absolute inset-0 rounded-xl bg-linear-to-r from-orange-500 to-red-600"
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
                                                tabDisabled
                                                    ? "text-[#94A3B8]"
                                                    : active
                                                        ? "text-white"
                                                        : "text-[#8C8C8C] group-hover:text-[#EA580C]"
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
                    canManage={canInvite && !isInviteDisabled}
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

                <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{tGroupCard("leaveConfirmTitle")}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {tGroupCard("leaveConfirmDescription", { groupName: groupName || "" })}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="flex justify-end gap-3">
                            <AlertDialogCancel>{tGroupCard("cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleConfirmLeave}
                                disabled={isLeaving}
                                className="bg-red-600 hover:bg-red-700">
                                {isLeaving ? tGroupCard("leaving") : tGroupCard("confirmLeave")}
                            </AlertDialogAction>
                        </div>
                    </AlertDialogContent>
                </AlertDialog>
            </motion.div>
        </Container>
    );
}
