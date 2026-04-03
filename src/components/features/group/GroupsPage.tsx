"use client";

import { ChevronDown, Filter, FolderKanban, Layers, LayoutGrid, List, Plus, Search, Sparkles, Star, Users, Users2, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getStudioById } from "@/api/studios";
import { cancelPendingJoinRequest } from "@/api/invites";
import { CreateGroupModal } from "@/components/features/group/create/CreateGroupModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { GroupCard } from "./GroupCard";
import {
    addFavourite,
    fetchGroupsPageData,
    leaveGroup,
    mapRole,
    markPendingJoinRequestCanceled,
    removeFavourite,
    removePendingJoinGroup
} from "./group.api";
import type { GroupsPageData, GroupCardDto } from "./types";
import { UsageBar } from "./UsageBar";

const emptyData: GroupsPageData = {
    usage: { current: 0, max: 0 },
    favorites: [],
    managed: [],
    independent: [],
    pending: [],
    joined: []
};

const PREVIEW_COUNT = 3;

const normId = (v: unknown) => String(v ?? "").trim();
const getGroupId = (g: any) => normId(g?.id ?? g?.groupId ?? g?.group_id);

function sanitizeGroupsPageData(raw: GroupsPageData): GroupsPageData {
    const uniqKeepOrder = (list: GroupCardDto[]) => {
        const seen = new Set<string>();
        const out: GroupCardDto[] = [];
        for (const g of list ?? []) {
            const id = getGroupId(g);
            if (!id || seen.has(id)) continue;
            seen.add(id);
            out.push(g);
        }
        return out;
    };

    return {
        ...raw,
        favorites: uniqKeepOrder(raw.favorites ?? []),
        managed: uniqKeepOrder(raw.managed ?? []),
        independent: uniqKeepOrder(raw.independent ?? []),
        joined: uniqKeepOrder(raw.joined ?? [])
    };
}

function uniqueByIdKeepFirst(list: GroupCardDto[]) {
    const seen = new Set<string>();
    const out: GroupCardDto[] = [];
    for (const g of list) {
        const id = getGroupId(g);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(g);
    }
    return out;
}

function getGroupSearchText(group: GroupCardDto) {
    const candidate = group as Record<string, unknown>;
    return [candidate.name, candidate.groupName, candidate.title, candidate.description]
        .map((value) => String(value ?? "").trim().toLowerCase())
        .join(" ");
}

function filterGroupsBySearch(groups: GroupCardDto[], query: string) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return groups;
    return groups.filter((group) => getGroupSearchText(group).includes(normalized));
}

function getStudioId(group: GroupCardDto) {
    const studio = (group as { studio?: { id?: string | null } }).studio;
    return normId(studio?.id);
}

async function loadStudioOpenById(groups: GroupCardDto[]) {
    const studioIds = Array.from(new Set(groups.map(getStudioId).filter((id) => !!id)));
    if (studioIds.length === 0) return {} as Record<string, boolean>;

    const results = await Promise.allSettled(
        studioIds.map(async (studioId) => {
            const result = await getStudioById(studioId);
            return {
                studioId,
                isOpen: result.status === "success" ? result.data?.isOpen !== false : true
            };
        })
    );

    const studioOpenById: Record<string, boolean> = {};
    for (const result of results) {
        if (result.status === "fulfilled") {
            studioOpenById[result.value.studioId] = result.value.isOpen;
        }
    }

    return studioOpenById;
}

function SectionReveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}>
            {children}
        </motion.div>
    );
}

function AmbientOrb({ className }: { className: string }) {
    return <div className={cn("pointer-events-none absolute rounded-full blur-3xl", className)} />;
}

function IconBadge({
    variant,
    children,
    className = "",
    size = "md"
}: {
    variant: "orange" | "yellow" | "blue" | "purple" | "slate";
    children: React.ReactNode;
    className?: string;
    size?: "sm" | "md" | "lg";
}) {
    const gradients: Record<typeof variant, string> = {
        orange: "from-[#FB923C] via-[#F97316] to-[#EA580C]",
        yellow: "from-[#FBBF24] via-[#F59E0B] to-[#EA580C]",
        blue: "from-[#7DD3FC] via-[#60A5FA] to-[#3B82F6]",
        purple: "from-[#C4B5FD] via-[#A78BFA] to-[#8B5CF6]",
        slate: "from-[#CBD5E1] via-[#94A3B8] to-[#64748B]"
    };

    const sizes = { sm: "h-9 w-9", md: "h-11 w-11", lg: "h-14 w-14" };

    return (
        <motion.div
            whileHover={{ scale: 1.05, rotate: 3 }}
            transition={{ duration: 0.2 }}
            className={cn(
                "relative flex shrink-0 items-center justify-center rounded-2xl shadow-[0_12px_28px_rgba(15,23,42,0.12)]",
                `bg-gradient-to-br ${gradients[variant]}`,
                sizes[size],
                className
            )}>
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.32),rgba(255,255,255,0.06))]" />
            <div className="pointer-events-none absolute inset-px rounded-[15px] border border-white/25" />
            <div className="relative z-10">{children}</div>
        </motion.div>
    );
}

function CountPill({ count }: { count: number }) {
    return (
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-white/80 bg-white/80 px-2 font-bold text-[#7C6A5A] text-[11px] tracking-wide shadow-sm backdrop-blur">
            {count}
        </span>
    );
}

function SectionSkeleton() {
    return (
        <div className="space-y-3 p-1">
            {[...Array(2)].map((_, i) => (
                <div
                    key={i}
                    className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/60 p-4 backdrop-blur">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.65),transparent)]" />
                    <div className="relative space-y-3">
                        <div className="h-4 w-1/3 rounded bg-[#F2E6DA]" />
                        <div className="h-3 w-2/3 rounded bg-[#F6EDE5]" />
                        <div className="h-3 w-1/2 rounded bg-[#F6EDE5]" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function SegmentedView({
    view,
    onChange,
    boardLabel,
    listLabel
}: {
    view: "grid" | "list";
    onChange: (value: "grid" | "list") => void;
    boardLabel: string;
    listLabel: string;
}) {
    return (
        <div className="flex w-fit items-center rounded-2xl border border-white/70 bg-white/65 p-1.5 shadow-[0_10px_25px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <button
                type="button"
                onClick={() => onChange("grid")}
                className={cn(
                    "relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-medium text-sm transition-all duration-300",
                    view === "grid"
                        ? "text-white shadow-[0_10px_24px_rgba(249,115,22,0.28)]"
                        : "text-[#6B7280] hover:text-[#EA580C]"
                )}>
                {view === "grid" && (
                    <motion.div
                        layoutId="active-view-pill"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#F97316] via-[#EA580C] to-[#DC2626]"
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    />
                )}
                <LayoutGrid className="relative z-10 h-4 w-4" />
                <span className="relative z-10">{boardLabel}</span>
            </button>

            <button
                type="button"
                onClick={() => onChange("list")}
                className={cn(
                    "relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-medium text-sm transition-all duration-300",
                    view === "list"
                        ? "text-white shadow-[0_10px_24px_rgba(249,115,22,0.28)]"
                        : "text-[#6B7280] hover:text-[#EA580C]"
                )}>
                {view === "list" && (
                    <motion.div
                        layoutId="active-view-pill"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#F97316] via-[#EA580C] to-[#DC2626]"
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    />
                )}
                <List className="relative z-10 h-4 w-4" />
                <span className="relative z-10">{listLabel}</span>
            </button>
        </div>
    );
}

export function GroupsPage() {
    const t = useTranslations("GroupsPage");
    const locale = useLocale();
    const [view, setView] = useState<"grid" | "list">("grid");
    const [data, setData] = useState<GroupsPageData>(emptyData);
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(true);
    const [studioOpenById, setStudioOpenById] = useState<Record<string, boolean>>({});
    const [openCreate, setOpenCreate] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [groupTypeFilter, setGroupTypeFilter] = useState<"all" | "independent" | "managed" | "joined">("all");

    const [expandFav, setExpandFav] = useState(false);
    const [expandAll, setExpandAll] = useState(false);
    const [expandManaged, setExpandManaged] = useState(false);
    const [expandIndependent, setExpandIndependent] = useState(false);
    const [expandJoined, setExpandJoined] = useState(false);

    const reload = async () => {
        try {
            setLoading(true);
            setError("");
            const res = await fetchGroupsPageData();
            const sanitized = sanitizeGroupsPageData(res);
            setData(sanitized);
            const allGroups = uniqueByIdKeepFirst([
                ...sanitized.favorites,
                ...sanitized.managed,
                ...sanitized.independent,
                ...sanitized.joined
            ]);
            setStudioOpenById(await loadStudioOpenById(allGroups));
        } catch (e: unknown) {
            setData(emptyData);
            setStudioOpenById({});
            setError(e instanceof Error ? e.message : "Failed to load groups");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                setLoading(true);
                setError("");
                const res = await fetchGroupsPageData();
                if (!alive) return;
                const sanitized = sanitizeGroupsPageData(res);
                setData(sanitized);
                const allGroups = uniqueByIdKeepFirst([
                    ...sanitized.favorites,
                    ...sanitized.managed,
                    ...sanitized.independent,
                    ...sanitized.joined
                ]);
                const studioOpenMap = await loadStudioOpenById(allGroups);
                if (!alive) return;
                setStudioOpenById(studioOpenMap);
            } catch (e: unknown) {
                if (!alive) return;
                setData(emptyData);
                setStudioOpenById({});
                setError(e instanceof Error ? e.message : "Failed to load groups");
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, []);

    const { usage, favorites, managed, independent, pending, joined } = useMemo(() => data, [data]);

    const allGroups = useMemo(
        () => uniqueByIdKeepFirst([...favorites, ...managed, ...independent]),
        [favorites, managed, independent]
    );

    const ownedGroups = useMemo(() => allGroups.filter((g) => mapRole(g.role) === "owner"), [allGroups]);

    const ownedManaged = useMemo(() => managed.filter((g) => mapRole(g.role) === "owner"), [managed]);

    const ownedIndependent = useMemo(() => independent.filter((g) => mapRole(g.role) === "owner"), [independent]);

    const filteredFavorites = useMemo(() => filterGroupsBySearch(favorites, searchQuery), [favorites, searchQuery]);
    const filteredOwnedGroups = useMemo(() => filterGroupsBySearch(ownedGroups, searchQuery), [ownedGroups, searchQuery]);
    const filteredOwnedManaged = useMemo(() => {
        if (groupTypeFilter !== "all" && groupTypeFilter !== "managed") return [];
        return filterGroupsBySearch(ownedManaged, searchQuery);
    }, [groupTypeFilter, ownedManaged, searchQuery]);
    const filteredOwnedIndependent = useMemo(() => {
        if (groupTypeFilter !== "all" && groupTypeFilter !== "independent") return [];
        return filterGroupsBySearch(ownedIndependent, searchQuery);
    }, [groupTypeFilter, ownedIndependent, searchQuery]);
    const filteredJoined = useMemo(() => {
        if (groupTypeFilter !== "all" && groupTypeFilter !== "joined") return [];
        return filterGroupsBySearch(joined, searchQuery);
    }, [groupTypeFilter, joined, searchQuery]);
    const filteredPending = useMemo(() => filterGroupsBySearch(pending, searchQuery), [pending, searchQuery]);

    const maxGroups = usage.max > 0 ? usage.max : 5;
    const currentGroupsCount = usage.current > 0 ? usage.current : ownedGroups.length;
    const limitReached = currentGroupsCount >= maxGroups;
    const isAllFilter = groupTypeFilter === "all";

    const onToggleStar = async (groupIdRaw: string) => {
        const groupId = normId(groupIdRaw);
        const snapshot = data;
        const all = [...snapshot.favorites, ...snapshot.managed, ...snapshot.independent, ...snapshot.joined];
        const current = all.find((g) => getGroupId(g) === groupId);
        if (!current) return;

        const wasStarred = !!(current as any).isFavorite;
        const updated: GroupCardDto = { ...(current as any), isFavorite: !wasStarred };

        setData((prev) => {
            if (!wasStarred) {
                const inFav = prev.favorites.some((g) => getGroupId(g) === groupId);
                return {
                    ...prev,
                    favorites: inFav ? prev.favorites : [updated, ...prev.favorites],
                    managed: prev.managed.map((g) => (getGroupId(g) === groupId ? updated : g)),
                    independent: prev.independent.map((g) => (getGroupId(g) === groupId ? updated : g)),
                    joined: prev.joined.map((g) => (getGroupId(g) === groupId ? updated : g))
                };
            }

            return {
                ...prev,
                favorites: prev.favorites.filter((g) => getGroupId(g) !== groupId),
                managed: prev.managed.map((g) => (getGroupId(g) === groupId ? updated : g)),
                independent: prev.independent.map((g) => (getGroupId(g) === groupId ? updated : g)),
                joined: prev.joined.map((g) => (getGroupId(g) === groupId ? updated : g))
            };
        });

        try {
            if (!wasStarred) await addFavourite(groupId);
            else await removeFavourite(groupId);
        } catch (e: unknown) {
            setData(snapshot);
            setError(e instanceof Error ? e.message : "Toggle favourite failed");
        }
    };

    const onLeaveGroup = async (groupIdRaw: string) => {
        const groupId = normId(groupIdRaw);
        if (!groupId) return;

        const snapshot = data;

        setData((prev) => ({
            ...prev,
            favorites: prev.favorites.filter((g) => getGroupId(g) !== groupId),
            managed: prev.managed.filter((g) => getGroupId(g) !== groupId),
            independent: prev.independent.filter((g) => getGroupId(g) !== groupId),
            joined: prev.joined.filter((g) => getGroupId(g) !== groupId)
        }));

        try {
            await leaveGroup(groupId);
        } catch (e: unknown) {
            setData(snapshot);
            setError(e instanceof Error ? e.message : "Leave group failed");
        }
    };

    const onCancelPending = async (groupIdRaw: string) => {
        const groupId = normId(groupIdRaw);
        if (!groupId) return;

        const snapshot = data;

        setData((prev) => ({
            ...prev,
            favorites: prev.favorites.filter((g) => getGroupId(g) !== groupId),
            managed: prev.managed.filter((g) => getGroupId(g) !== groupId),
            independent: prev.independent.filter((g) => getGroupId(g) !== groupId),
            joined: prev.joined.filter((g) => getGroupId(g) !== groupId),
            pending: prev.pending.filter((g) => getGroupId(g) !== groupId)
        }));

        try {
            await cancelPendingJoinRequest(groupId);
            markPendingJoinRequestCanceled(groupId);
            removePendingJoinGroup(groupId);
        } catch (e: unknown) {
            setData(snapshot);
            setError(e instanceof Error ? e.message : "Cancel pending request failed");
        }
    };

    return (
        <>
            <div className="relative -mt-px min-h-screen overflow-hidden bg-white px-3 pt-0 pb-4 md:px-4 xl:px-5">
                <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,#FFF8F2_0%,#FFF6F0_28%,#FAF5FF_64%,#F8FAFC_100%)]" />
                <AmbientOrb className="top-[-60px] left-[-90px] h-72 w-72 bg-orange-200/35" />
                <AmbientOrb className="top-[10%] right-[-80px] h-80 w-80 bg-amber-200/30" />
                <AmbientOrb className="bottom-[-100px] left-[28%] h-80 w-80 bg-purple-200/25" />

                <div className="space-y-5 py-4">
                    <SectionReveal>
                        <Card className="relative overflow-hidden rounded-[32px] bg-white/65 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,190,140,0.24),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(196,181,253,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.58),rgba(255,248,242,0.52))]" />

                            <CardHeader className="relative pt-7 pb-4">
                                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                                    <div className="flex items-center gap-4">
                                        <IconBadge variant="orange" size="lg" className="rounded-[22px]">
                                            <Users className="h-6 w-6 text-white" />
                                        </IconBadge>

                                        <div>
                                            <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-orange-100/80 bg-white/70 px-3 py-1 font-semibold text-[11px] text-orange-700 uppercase tracking-[0.18em] shadow-sm backdrop-blur">
                                                <Sparkles className="h-3.5 w-3.5" />
                                                {t("workspaceGroups")}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2.5">
                                                <h1 className="bg-[linear-gradient(135deg,#261E33_0%,#7C3AED_55%,#EA580C_100%)] bg-clip-text font-bold text-[1.8rem] text-transparent tracking-tight">
                                                    {t("title")}
                                                </h1>
                                                <span className="rounded-full border border-orange-200/60 bg-orange-50/90 px-3 py-1 font-semibold text-[11px] text-orange-700 shadow-sm">
                                                    {currentGroupsCount}/{maxGroups}
                                                </span>
                                            </div>

                                            <p className="mt-1 text-[#7C6A58] text-sm leading-6">{t("subtitle")}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <SegmentedView
                                            view={view}
                                            onChange={setView}
                                            boardLabel={t("board")}
                                            listLabel={t("list")}
                                        />

                                        <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
                                            <Button
                                                type="button"
                                                disabled={limitReached}
                                                onClick={() => setOpenCreate(true)}
                                                className={cn(
                                                    "inline-flex h-11 items-center gap-2 rounded-2xl px-5 font-semibold text-sm transition-all duration-300",
                                                    !limitReached
                                                        ? "border-0 bg-[linear-gradient(135deg,#F97316_0%,#EA580C_45%,#DC2626_100%)] text-white shadow-[0_14px_28px_rgba(249,115,22,0.28)] hover:brightness-105"
                                                        : "cursor-not-allowed bg-[#EAE3DB] text-[#A39487] shadow-none"
                                                )}>
                                                <Plus className="h-4 w-4" />
                                                <span>{t("newGroup")}</span>
                                            </Button>
                                        </motion.div>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="relative pt-1 pb-6">
                                <div className="space-y-3">
                                    <div className="rounded-[24px] border border-white/70 bg-white/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur">
                                        <UsageBar current={usage.current} max={usage.max} />
                                    </div>

                                    <div className="flex flex-col gap-3 rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur lg:flex-row lg:items-center">
                                        <div className="relative flex-1">
                                            <Search className="pointer-events-none absolute top-1/2 left-5 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                            <Input
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder={t("searchGroups")}
                                                className="h-11 border border-slate-200 bg-slate-100 pl-12 text-[#261E33] placeholder:text-slate-500"
                                            />
                                            {searchQuery ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setSearchQuery("")}
                                                    className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-500 hover:text-slate-700">
                                                    <X className="h-4 w-4" />
                                                </button>
                                            ) : null}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            <Filter className="hidden h-4 w-4 text-slate-400 lg:block" />
                                            {[
                                                { value: "all" as const, label: t("allGroups") },
                                                { value: "independent" as const, label: t("independent") },
                                                { value: "managed" as const, label: t("managed") },
                                                { value: "joined" as const, label: t("joined") }
                                            ].map((item) => (
                                                <button
                                                    key={item.value}
                                                    type="button"
                                                    onClick={() => setGroupTypeFilter(item.value)}
                                                    className={cn(
                                                        "rounded-xl border px-4 py-2 font-medium text-sm transition-all duration-300",
                                                        groupTypeFilter === item.value
                                                            ? "border-0 bg-[linear-gradient(135deg,#F97316_0%,#EA580C_45%,#DC2626_100%)] text-white shadow-[0_14px_28px_rgba(249,115,22,0.28)] hover:brightness-105"
                                                            : "border-white/70 bg-white text-[#374151] hover:border-[#FDBA74] hover:bg-orange-50 hover:text-[#EA580C]"
                                                    )}>
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <AnimatePresence mode="wait">
                                        {loading && (
                                            <motion.div
                                                key="loading"
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -6 }}
                                                className="flex items-center gap-2 rounded-2xl border border-[#F1E4D9] bg-white/60 px-3 py-2.5 text-[#8A7868] text-sm backdrop-blur">
                                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#E4D9CD] border-t-orange-400" />
                                                {t("loading")}
                                            </motion.div>
                                        )}

                                        {!loading && error && (
                                            <motion.p
                                                key="error"
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                className="rounded-2xl border border-red-200/80 bg-red-50/90 px-4 py-3 font-medium text-red-600 text-sm shadow-sm">
                                                {error}
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </CardContent>
                        </Card>
                    </SectionReveal>

                    <div className="space-y-4">
                        {isAllFilter && (loading || filteredFavorites.length > 0) && (
                            <SectionReveal delay={0.03}>
                                <GroupsSection
                                    icon={Star}
                                    iconVariant="yellow"
                                    title={t("favorites")}
                                    count={filteredFavorites.length}
                                    view={view}
                                    items={filteredFavorites}
                                    expanded={expandFav}
                                    onToggle={() => setExpandFav((v) => !v)}
                                    onToggleStar={onToggleStar}
                                    onLeaveGroup={onLeaveGroup}
                                    onCancelPending={onCancelPending}
                                    emptyText={t("favoritesEmpty")}
                                    loading={loading}
                                    studioOpenById={studioOpenById}
                                    t={t}
                                />
                            </SectionReveal>
                        )}

                        {isAllFilter && (loading || filteredOwnedGroups.length > 0) && (
                            <SectionReveal delay={0.06}>
                                <GroupsSection
                                    icon={FolderKanban}
                                    iconVariant="blue"
                                    title={t("created")}
                                    count={filteredOwnedGroups.length}
                                    view={view}
                                    items={filteredOwnedGroups}
                                    expanded={expandAll}
                                    onToggle={() => setExpandAll((v) => !v)}
                                    onToggleStar={onToggleStar}
                                    onLeaveGroup={onLeaveGroup}
                                    onCancelPending={onCancelPending}
                                    emptyText={t("createdEmpty")}
                                    loading={loading}
                                    studioOpenById={studioOpenById}
                                    t={t}
                                />
                            </SectionReveal>
                        )}

                        {(isAllFilter || groupTypeFilter === "managed") && (loading || filteredOwnedManaged.length > 0) && (
                            <SectionReveal delay={0.09}>
                                <GroupsSection
                                    icon={Layers}
                                    iconVariant="purple"
                                    title={t("managed")}
                                    count={filteredOwnedManaged.length}
                                    view={view}
                                    items={filteredOwnedManaged}
                                    expanded={expandManaged}
                                    onToggle={() => setExpandManaged((v) => !v)}
                                    onToggleStar={onToggleStar}
                                    onLeaveGroup={onLeaveGroup}
                                    onCancelPending={onCancelPending}
                                    emptyText={t("managedEmpty")}
                                    loading={loading}
                                    studioOpenById={studioOpenById}
                                    t={t}
                                />
                            </SectionReveal>
                        )}

                        {(isAllFilter || groupTypeFilter === "independent") && (loading || filteredOwnedIndependent.length > 0) && (
                            <SectionReveal delay={0.12}>
                                <GroupsSection
                                    icon={Users}
                                    iconVariant="slate"
                                    title={t("independent")}
                                    count={filteredOwnedIndependent.length}
                                    view={view}
                                    items={filteredOwnedIndependent}
                                    expanded={expandIndependent}
                                    onToggle={() => setExpandIndependent((v) => !v)}
                                    onToggleStar={onToggleStar}
                                    onLeaveGroup={onLeaveGroup}
                                    onCancelPending={onCancelPending}
                                    emptyText={t("independentEmpty")}
                                    loading={loading}
                                    studioOpenById={studioOpenById}
                                    t={t}
                                />
                            </SectionReveal>
                        )}

                        {(isAllFilter || groupTypeFilter === "joined") && (loading || filteredJoined.length > 0) && (
                            <SectionReveal delay={0.15}>
                                <GroupsSection
                                    icon={Users2}
                                    iconVariant="orange"
                                    title={t("joined")}
                                    count={filteredJoined.length}
                                    view={view}
                                    items={filteredJoined}
                                    expanded={expandJoined}
                                    onToggle={() => setExpandJoined((v) => !v)}
                                    onToggleStar={onToggleStar}
                                    onLeaveGroup={onLeaveGroup}
                                    onCancelPending={onCancelPending}
                                    emptyText={t("joinedEmpty")}
                                    loading={loading}
                                    studioOpenById={studioOpenById}
                                    t={t}
                                />
                            </SectionReveal>
                        )}

                        {isAllFilter && (loading || filteredPending.length > 0) && (
                            <SectionReveal delay={0.18}>
                                <GroupsSection
                                    icon={Users2}
                                    iconVariant="yellow"
                                    title={t("pendingApproval")}
                                    count={filteredPending.length}
                                    view={view}
                                    items={filteredPending}
                                    expanded={true}
                                    onToggle={() => undefined}
                                    onToggleStar={onToggleStar}
                                    onLeaveGroup={onLeaveGroup}
                                    onCancelPending={onCancelPending}
                                    emptyText={t("pendingApprovalEmpty")}
                                    loading={loading}
                                    studioOpenById={studioOpenById}
                                    t={t}
                                />
                            </SectionReveal>
                        )}
                    </div>
                </div>
            </div>

            <CreateGroupModal
                open={openCreate}
                onClose={() => setOpenCreate(false)}
                currentGroupCount={currentGroupsCount}
                onCreate={async () => {
                    await reload();
                }}
            />
        </>
    );
}

function GroupsSection({
    title,
    count,
    icon: Icon,
    iconVariant,
    items,
    view,
    className = "",
    expanded,
    onToggle,
    onToggleStar,
    onLeaveGroup,
    onCancelPending,
    emptyText,
    loading = false,
    studioOpenById,
    t
}: {
    title: string;
    count: number;
    icon: React.ElementType;
    iconVariant: "orange" | "yellow" | "blue" | "purple" | "slate";
    items: GroupCardDto[];
    view: "grid" | "list";
    className?: string;
    expanded: boolean;
    onToggle: () => void;
    onToggleStar: (groupId: string) => Promise<void>;
    onLeaveGroup: (groupId: string) => Promise<void>;
    onCancelPending: (groupId: string) => Promise<void>;
    emptyText: string;
    loading?: boolean;
    studioOpenById: Record<string, boolean>;
    t: (key: string) => string;
}) {
    const canToggle = items.length > PREVIEW_COUNT;
    const visibleItems = expanded || !canToggle ? items : items.slice(0, PREVIEW_COUNT);

    const sectionThemes: Record<
        typeof iconVariant,
        {
            shell: string;
            header: string;
            content: string;
            glowA: string;
            glowB: string;
            ring: string;
            softBg: string;
            softText: string;
            buttonHover: string;
        }
    > = {
        orange: {
            shell: "from-[#FFF7EE] via-[#FFFDFB] to-[#FFF2E4]",
            header: "from-[#FFF1E2]/95 via-[#FFF8F2]/92 to-[#FFF5EC]/88",
            content: "from-[#FFFDFC]/96 via-[#FFF8F3]/94 to-[#FFF2E8]/92",
            glowA: "bg-orange-200/35",
            glowB: "bg-rose-200/25",
            ring: "ring-orange-100/80",
            softBg: "bg-orange-50/90",
            softText: "text-orange-700",
            buttonHover: "hover:text-[#EA580C]"
        },
        yellow: {
            shell: "from-[#FFFBEF] via-[#FFFDFB] to-[#FFF6DF]",
            header: "from-[#FFF7DD]/95 via-[#FFFBEF]/92 to-[#FFF8E8]/88",
            content: "from-[#FFFDFC]/96 via-[#FFFBEF]/94 to-[#FFF7E5]/92",
            glowA: "bg-amber-200/35",
            glowB: "bg-yellow-200/25",
            ring: "ring-amber-100/80",
            softBg: "bg-amber-50/90",
            softText: "text-amber-700",
            buttonHover: "hover:text-[#D97706]"
        },
        blue: {
            shell: "from-[#F2F8FF] via-[#FCFDFF] to-[#EAF3FF]",
            header: "from-[#E8F1FF]/95 via-[#F5F9FF]/92 to-[#EDF5FF]/88",
            content: "from-[#FCFDFF]/96 via-[#F5F9FF]/94 to-[#ECF4FF]/92",
            glowA: "bg-sky-200/35",
            glowB: "bg-blue-200/25",
            ring: "ring-sky-100/80",
            softBg: "bg-sky-50/90",
            softText: "text-sky-700",
            buttonHover: "hover:text-[#2563EB]"
        },
        purple: {
            shell: "from-[#F8F2FF] via-[#FDFBFF] to-[#F1E9FF]",
            header: "from-[#F1E6FF]/95 via-[#F8F3FF]/92 to-[#F4EDFF]/88",
            content: "from-[#FDFBFF]/96 via-[#F8F3FF]/94 to-[#F2EAFF]/92",
            glowA: "bg-violet-200/35",
            glowB: "bg-fuchsia-200/25",
            ring: "ring-violet-100/80",
            softBg: "bg-violet-50/90",
            softText: "text-violet-700",
            buttonHover: "hover:text-[#7C3AED]"
        },
        slate: {
            shell: "from-[#F7F8FA] via-[#FDFDFD] to-[#EFF2F6]",
            header: "from-[#F1F4F7]/95 via-[#F8FAFB]/92 to-[#F3F5F8]/88",
            content: "from-[#FDFDFD]/96 via-[#F7F9FB]/94 to-[#F1F4F7]/92",
            glowA: "bg-slate-200/35",
            glowB: "bg-zinc-200/25",
            ring: "ring-slate-100/80",
            softBg: "bg-slate-50/90",
            softText: "text-slate-700",
            buttonHover: "hover:text-[#475569]"
        }
    };

    const theme = sectionThemes[iconVariant];

    return (
        <motion.section
            layout
            initial={{ opacity: 0, y: 22, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -3 }}
            className={cn(
                "group relative isolate overflow-hidden rounded-[34px] border border-white/80 bg-gradient-to-br shadow-[0_20px_60px_rgba(15,23,42,0.07)] backdrop-blur-2xl transition-all duration-500",
                theme.shell,
                className
            )}>
            <div className="pointer-events-none absolute inset-0 rounded-[34px] bg-[linear-gradient(180deg,rgba(255,255,255,0.52),rgba(255,255,255,0.18))]" />
            <div
                className={cn(
                    "pointer-events-none absolute top-10 -left-8 h-28 w-28 rounded-full blur-3xl",
                    theme.glowA
                )}
            />
            <div
                className={cn(
                    "pointer-events-none absolute top-[-10px] right-[-20px] h-40 w-40 rounded-full blur-3xl",
                    theme.glowB
                )}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/95" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-[35%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.30),transparent_70%)] opacity-70" />

            <div
                className={cn(
                    "relative border-b border-white/70 bg-gradient-to-r px-5 py-4 backdrop-blur-2xl md:px-6",
                    theme.header
                )}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3.5">
                        <motion.div
                            whileHover={{ rotate: 5, scale: 1.06 }}
                            transition={{ duration: 0.22 }}
                            className={cn(
                                "rounded-[22px] ring-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]",
                                theme.ring
                            )}>
                            <IconBadge variant={iconVariant} size="sm" className="h-11 w-11 rounded-[18px]">
                                <Icon className="h-4.5 w-4.5 text-white drop-shadow-sm" />
                            </IconBadge>
                        </motion.div>

                        <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2.5">
                                <h2 className="truncate font-semibold text-[#261F32] text-[15px] md:text-[16px]">
                                    {title}
                                </h2>
                                <span className="inline-flex items-center justify-center rounded-full border border-white/80 bg-white/80 px-2.5 py-1 font-semibold text-[#6F6257] text-[11px] shadow-sm backdrop-blur">
                                    {count}
                                </span>
                            </div>

                            <div className="mt-1 flex items-center gap-2">
                                <span
                                    className={cn(
                                        "inline-flex items-center rounded-full px-2.5 py-1 font-medium text-[11px] shadow-sm ring-1 ring-inset",
                                        theme.softBg,
                                        theme.softText
                                    )}>
                                    {count > 0 ? t("active") : t("noGroups")}
                                </span>
                                <p className="truncate text-[#94867B] text-xs">
                                    {count > 0 ? `${count} ${t("cardsShowing")}` : t("addGroupsHint")}
                                </p>
                            </div>
                        </div>
                    </div>

                    {canToggle && (
                        <motion.button
                            type="button"
                            onClick={onToggle}
                            whileHover={{ y: -1, scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className={cn(
                                "inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-4 py-2 font-medium text-[#796B60] text-[13px] shadow-[0_8px_18px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-all duration-300 hover:bg-white",
                                theme.buttonHover
                            )}>
                            <span>{expanded ? t("collapse") : t("viewAll")}</span>
                            <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
                        </motion.button>
                    )}
                </div>
            </div>

            <motion.div className={cn("relative px-5 py-5 md:px-6", theme.content)}>
                {loading ? (
                    <SectionSkeleton />
                ) : visibleItems.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.985, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="relative overflow-hidden rounded-[28px] border border-white/80 border-dashed bg-white/72 px-6 py-14 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_14px_34px_rgba(15,23,42,0.04)] backdrop-blur-xl">
                        <div
                            className={cn(
                                "pointer-events-none absolute -top-10 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full blur-3xl",
                                theme.glowA
                            )}
                        />
                        <div
                            className={cn(
                                "mx-auto flex h-16 w-16 items-center justify-center rounded-full shadow-sm ring-1 ring-white/80",
                                theme.softBg
                            )}>
                            <Icon className="h-6 w-6 text-[#8A796D]" />
                        </div>
                        <div className="mt-4 space-y-1.5">
                            <p className="font-semibold text-[#544A42] text-sm">{emptyText}</p>
                            <p className="text-[#9B8F84] text-xs">{t("emptyAreaHint")}</p>
                        </div>
                    </motion.div>
                ) : (
                    <>
                        <motion.div
                            layout
                            className={cn(
                                view === "grid"
                                    ? "grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3"
                                    : "flex flex-col gap-3.5"
                            )}>
                            <AnimatePresence initial={false} mode="popLayout">
                                {visibleItems.map((g, index) => (
                                    <motion.div
                                        layout
                                        key={getGroupId(g)}
                                        initial={{ opacity: 0, y: 20, scale: 0.97, filter: "blur(6px)" }}
                                        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                                        exit={{ opacity: 0, y: -10, scale: 0.98, filter: "blur(4px)" }}
                                        transition={{
                                            duration: 0.35,
                                            delay: index * 0.045,
                                            ease: [0.22, 1, 0.36, 1]
                                        }}
                                        whileHover={{ y: -6, scale: 1.01 }}
                                        className={cn(
                                            "group/card relative",
                                            view === "list" ? "w-full" : "self-start"
                                        )}>
                                        <div className="pointer-events-none absolute inset-0 rounded-[26px] bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.9),transparent_42%)] opacity-0 blur-xl transition duration-300 group-hover/card:opacity-100" />
                                        <div className="pointer-events-none absolute inset-0 rounded-[26px] shadow-[0_24px_44px_rgba(15,23,42,0.00)] transition duration-300 group-hover/card:shadow-[0_24px_44px_rgba(15,23,42,0.12)]" />
                                        <div className="relative rounded-[26px]">
                                            <GroupCard
                                                group={g}
                                                onToggleStar={() => onToggleStar(getGroupId(g))}
                                                onLeaveGroup={() => onLeaveGroup(getGroupId(g))}
                                                onCancelPending={() => onCancelPending(getGroupId(g))}
                                                isStudioOpen={(() => {
                                                    const studioId = getStudioId(g);
                                                    return studioId ? studioOpenById[studioId] !== false : true;
                                                })()}
                                                view={view}
                                            />
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </motion.div>

                        {canToggle && !expanded && items.length > PREVIEW_COUNT && (
                            <motion.button
                                whileHover={{ y: -2, scale: 1.005 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={onToggle}
                                className="mt-5 w-full rounded-[22px] border border-white/85 border-dashed bg-white/78 py-3.5 font-medium text-[#8B7B6D] text-[13px] shadow-[0_10px_24px_rgba(15,23,42,0.04)] backdrop-blur-xl transition-all duration-300 hover:bg-white hover:text-[#EA580C]">
                                + {items.length - PREVIEW_COUNT} {t("moreGroups")}
                            </motion.button>
                        )}
                    </>
                )}
            </motion.div>
        </motion.section>
    );
}
