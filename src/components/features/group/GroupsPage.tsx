"use client";

import { ChevronDown, FolderKanban, LayoutGrid, Layers, List, Plus, Star, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/common";
import { CreateGroupModal } from "@/components/features/group/create/CreateGroupModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { GroupCard } from "./GroupCard";
import { addFavourite, fetchGroupsPageData, removeFavourite } from "./group.api";
import type { Group, GroupsPageData } from "./types";
import { UsageBar } from "./UsageBar";

const emptyData: GroupsPageData = {
    usage: { current: 0, max: 0 },
    favorites: [],
    managed: [],
    independent: []
};

const PREVIEW_COUNT = 3;

const normId = (v: unknown) => String(v ?? "").trim();
const getGroupId = (g: any) => normId(g?.id ?? g?.groupId ?? g?.group_id);

function sanitizeGroupsPageData(raw: GroupsPageData): GroupsPageData {
    const uniqKeepOrder = (list: Group[]) => {
        const seen = new Set<string>();
        const out: Group[] = [];
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
        independent: uniqKeepOrder(raw.independent ?? [])
    };
}

function uniqueByIdKeepFirst(list: Group[]) {
    const seen = new Set<string>();
    const out: Group[] = [];
    for (const g of list) {
        const id = getGroupId(g);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(g);
    }
    return out;
}

// ─── Icon Badge ────────────────────────────────────────────────────────────────
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
        orange: "from-orange-400 via-orange-500 to-rose-500",
        yellow: "from-amber-300 via-yellow-400 to-orange-400",
        blue: "from-sky-400 via-blue-500 to-indigo-500",
        purple: "from-violet-400 via-purple-500 to-fuchsia-500",
        slate: "from-slate-300 via-slate-400 to-slate-500"
    };

    const shadows: Record<typeof variant, string> = {
        orange: "shadow-orange-500/30",
        yellow: "shadow-amber-400/30",
        blue: "shadow-blue-500/30",
        purple: "shadow-purple-500/30",
        slate: "shadow-slate-400/20"
    };

    const sizes = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-12 w-12" };

    return (
        <div
            className={cn(
                "relative flex shrink-0 items-center justify-center rounded-xl",
                `bg-gradient-to-br ${gradients[variant]}`,
                `shadow-lg ${shadows[variant]}`,
                sizes[size],
                className
            )}>
            {/* Glass shine overlay */}
            <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-white/40 via-white/10 to-transparent" />
            {/* Inner border shimmer */}
            <div className="pointer-events-none absolute inset-px rounded-[10px] border border-white/30" />
            <div className="relative z-10">{children}</div>
        </div>
    );
}

// ─── Count Pill ────────────────────────────────────────────────────────────────
function CountPill({ count }: { count: number }) {
    return (
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100 px-2 text-[11px] font-bold tracking-wide text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            {count}
        </span>
    );
}

// ─── Section Skeleton ──────────────────────────────────────────────────────────
function SectionSkeleton() {
    return (
        <div className="space-y-3 p-1">
            {[...Array(2)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-gradient-to-r from-slate-100 to-slate-50" />
            ))}
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function GroupsPage() {
    const [view, setView] = useState<"grid" | "list">("grid");
    const [data, setData] = useState<GroupsPageData>(emptyData);
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(true);
    const [openCreate, setOpenCreate] = useState(false);

    const [expandFav, setExpandFav] = useState(false);
    const [expandAll, setExpandAll] = useState(false);
    const [expandManaged, setExpandManaged] = useState(false);
    const [expandIndependent, setExpandIndependent] = useState(false);

    const reload = async () => {
        try {
            setLoading(true);
            setError("");
            const res = await fetchGroupsPageData();
            setData(sanitizeGroupsPageData(res));
        } catch (e: unknown) {
            setData(emptyData);
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
                setData(sanitizeGroupsPageData(res));
            } catch (e: unknown) {
                if (!alive) return;
                setData(emptyData);
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

    const { usage, favorites, managed, independent } = useMemo(() => data, [data]);
    const allGroups = useMemo(
        () => uniqueByIdKeepFirst([...favorites, ...managed, ...independent]),
        [favorites, managed, independent]
    );

    const maxGroups = usage.max > 0 ? usage.max : 5;
    const currentGroupsCount =
        usage.current > 0 ? usage.current : favorites.length + managed.length + independent.length;
    const limitReached = currentGroupsCount >= maxGroups;

    const onToggleStar = async (groupIdRaw: string) => {
        const groupId = normId(groupIdRaw);
        const snapshot = data;
        const all = [...snapshot.favorites, ...snapshot.managed, ...snapshot.independent];
        const current = all.find((g) => getGroupId(g) === groupId);
        if (!current) return;
        const wasStarred = !!(current as any).isStarred;
        const updated: Group = { ...(current as any), isStarred: !wasStarred };

        setData((prev) => {
            if (!wasStarred) {
                const inFav = prev.favorites.some((g) => getGroupId(g) === groupId);
                return {
                    ...prev,
                    favorites: inFav ? prev.favorites : [updated, ...prev.favorites],
                    managed: prev.managed.map((g) => (getGroupId(g) === groupId ? updated : g)),
                    independent: prev.independent.map((g) => (getGroupId(g) === groupId ? updated : g))
                };
            }
            return {
                ...prev,
                favorites: prev.favorites.filter((g) => getGroupId(g) !== groupId),
                managed: prev.managed.map((g) => (getGroupId(g) === groupId ? updated : g)),
                independent: prev.independent.map((g) => (getGroupId(g) === groupId ? updated : g))
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

    return (
        <Container>
            {/* Page background */}
            <div className="relative min-h-screen space-y-5 py-2">
                {/* ── Hero Header Card ─────────────────────────────────── */}
                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-white via-orange-50/30 to-violet-50/20 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_8px_32px_-8px_rgba(0,0,0,0.08)] ring-1 ring-slate-900/[0.06]">
                    {/* Ambient orbs */}
                    <div className="pointer-events-none absolute -left-32 -top-32 h-72 w-72 rounded-full bg-orange-400/[0.08] blur-[60px]" />
                    <div className="pointer-events-none absolute -bottom-20 right-0 h-64 w-64 rounded-full bg-violet-500/[0.08] blur-[60px]" />
                    <div className="pointer-events-none absolute left-1/2 top-0 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-orange-300/40 to-transparent" />

                    <CardHeader className="relative pb-3 pt-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            {/* Title block */}
                            <div className="flex items-center gap-4">
                                <IconBadge variant="orange" size="lg" className="h-13 w-13 rounded-2xl">
                                    <Users className="h-6 w-6 text-white drop-shadow-sm" />
                                </IconBadge>
                                <div>
                                    <div className="flex items-center gap-2.5">
                                        <h1 className="text-[1.625rem] font-bold tracking-tight text-slate-900">
                                            Nhóm
                                        </h1>
                                        <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-orange-600">
                                            {currentGroupsCount}/{maxGroups}
                                        </span>
                                    </div>
                                    <p className="mt-0.5 text-sm text-slate-500">Quản lý các nhóm học tập của bạn</p>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex flex-wrap items-center gap-2.5">
                                {/* View toggle */}
                                <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                                    <button
                                        onClick={() => setView("grid")}
                                        className={cn(
                                            "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150",
                                            view === "grid"
                                                ? "bg-slate-900 text-white shadow-sm"
                                                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                        )}>
                                        <LayoutGrid className="h-[15px] w-[15px]" />
                                    </button>
                                    <button
                                        onClick={() => setView("list")}
                                        className={cn(
                                            "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150",
                                            view === "list"
                                                ? "bg-slate-900 text-white shadow-sm"
                                                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                        )}>
                                        <List className="h-[15px] w-[15px]" />
                                    </button>
                                </div>

                                {/* Create button */}
                                <Button
                                    disabled={limitReached}
                                    onClick={() => setOpenCreate(true)}
                                    className={cn(
                                        "relative h-9 gap-1.5 overflow-hidden rounded-xl px-4 text-sm font-semibold shadow-lg transition-all duration-200",
                                        !limitReached
                                            ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-500/25 hover:shadow-orange-500/40 hover:brightness-105 active:scale-[0.98]"
                                            : "cursor-not-allowed bg-slate-100 text-slate-400 shadow-none"
                                    )}>
                                    {!limitReached && (
                                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/15 to-transparent" />
                                    )}
                                    <Plus className="h-4 w-4" />
                                    <span>Nhóm mới</span>
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="relative pb-5 pt-1">
                        <div className="space-y-2.5">
                            <UsageBar current={usage.current} max={usage.max} />
                            {loading && (
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-orange-400" />
                                    Đang tải...
                                </div>
                            )}
                            {!loading && error && (
                                <p className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 ring-1 ring-red-100">
                                    {error}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-3.5">
                    <GroupsSection
                        icon={Star}
                        iconVariant="yellow"
                        title="Nhóm yêu thích"
                        count={favorites.length}
                        view={view}
                        items={favorites}
                        expanded={expandFav}
                        onToggle={() => setExpandFav((v) => !v)}
                        onToggleStar={onToggleStar}
                        emptyText="Chưa có nhóm nào trong mục yêu thích."
                        loading={loading}
                    />

                    <GroupsSection
                        icon={FolderKanban}
                        iconVariant="blue"
                        title="Các nhóm bạn đã tạo"
                        count={allGroups.length}
                        view={view}
                        items={allGroups}
                        expanded={expandAll}
                        onToggle={() => setExpandAll((v) => !v)}
                        onToggleStar={onToggleStar}
                        emptyText="Bạn chưa có nhóm nào."
                        loading={loading}
                    />

                    <GroupsSection
                        icon={Layers}
                        iconVariant="purple"
                        title="Nhóm thuộc studio tôi quản lý"
                        count={managed.length}
                        view={view}
                        items={managed}
                        expanded={expandManaged}
                        onToggle={() => setExpandManaged((v) => !v)}
                        onToggleStar={onToggleStar}
                        emptyText="Chưa có nhóm nào thuộc studio bạn quản lý."
                        loading={loading}
                    />

                    <GroupsSection
                        icon={Users}
                        iconVariant="slate"
                        title="Nhóm độc lập"
                        count={independent.length}
                        view={view}
                        items={independent}
                        expanded={expandIndependent}
                        onToggle={() => setExpandIndependent((v) => !v)}
                        onToggleStar={onToggleStar}
                        emptyText="Chưa có nhóm độc lập nào."
                        loading={loading}
                    />
                </div>
            </div>

            <CreateGroupModal
                open={openCreate}
                onClose={() => setOpenCreate(false)}
                currentGroupCount={currentGroupsCount}
                maxGroups={maxGroups}
                onCreate={async () => {
                    await reload();
                }}
            />
        </Container>
    );
}

// ─── Groups Section ────────────────────────────────────────────────────────────
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
    emptyText,
    loading = false
}: {
    title: string;
    count: number;
    icon: React.ElementType;
    iconVariant: "orange" | "yellow" | "blue" | "purple" | "slate";
    items: Group[];
    view: "grid" | "list";
    className?: string;
    expanded: boolean;
    onToggle: () => void;
    onToggleStar: (groupId: string) => Promise<void>;
    emptyText: string;
    loading?: boolean;
}) {
    const canToggle = items.length > PREVIEW_COUNT;
    const visibleItems = expanded || !canToggle ? items : items.slice(0, PREVIEW_COUNT);

    const accentColors: Record<typeof iconVariant, string> = {
        orange: "from-orange-500/[0.04]",
        yellow: "from-amber-400/[0.05]",
        blue: "from-blue-500/[0.04]",
        purple: "from-purple-500/[0.04]",
        slate: "from-slate-400/[0.03]"
    };

    const headerAccents: Record<typeof iconVariant, string> = {
        orange: "border-orange-100 bg-orange-50/60",
        yellow: "border-amber-100 bg-amber-50/60",
        blue: "border-blue-100 bg-blue-50/60",
        purple: "border-purple-100 bg-purple-50/60",
        slate: "border-slate-100 bg-slate-50/60"
    };

    return (
        <section
            className={cn(
                "group/section overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_-4px_rgba(0,0,0,0.06)] transition-all duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.10)]",
                className
            )}>
            {/* Section header */}
            <div className={cn("border-b px-5 py-3.5 transition-colors", headerAccents[iconVariant])}>
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <IconBadge variant={iconVariant} size="sm" className="rounded-xl">
                            <Icon className="h-4 w-4 text-white drop-shadow-sm" />
                        </IconBadge>

                        <div className="min-w-0 flex items-center gap-2.5">
                            <h2 className="truncate text-sm font-semibold text-slate-800">{title}</h2>
                            <CountPill count={count} />
                        </div>
                    </div>

                    {canToggle && (
                        <button
                            type="button"
                            onClick={onToggle}
                            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-slate-500 transition-all duration-150 hover:bg-white/80 hover:text-slate-700">
                            <span>{expanded ? "Thu gọn" : "Xem tất cả"}</span>
                            <ChevronDown
                                className={cn(
                                    "h-3.5 w-3.5 transition-transform duration-200",
                                    expanded && "rotate-180"
                                )}
                            />
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className={cn("bg-gradient-to-b p-5 to-transparent", accentColors[iconVariant])}>
                {loading ? (
                    <SectionSkeleton />
                ) : visibleItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-8 text-center">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                            <Icon className="h-4 w-4 text-slate-400" />
                        </div>
                        <p className="text-sm text-slate-400">{emptyText}</p>
                    </div>
                ) : (
                    <>
                        <div
                            className={cn(
                                view === "grid"
                                    ? "grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3"
                                    : "flex flex-col gap-2.5"
                            )}>
                            {visibleItems.map((g) => (
                                <div
                                    key={getGroupId(g)}
                                    className={cn(
                                        "rounded-xl transition-all duration-200",
                                        view === "grid" && "hover:-translate-y-0.5 hover:shadow-md"
                                    )}>
                                    <GroupCard group={g} onToggleStar={() => onToggleStar(getGroupId(g))} />
                                </div>
                            ))}
                        </div>

                        {canToggle && !expanded && items.length > PREVIEW_COUNT && (
                            <button
                                onClick={onToggle}
                                className="mt-3.5 w-full rounded-xl border border-dashed border-slate-200 py-2.5 text-[13px] font-medium text-slate-400 transition-all hover:border-slate-300 hover:bg-slate-50/60 hover:text-slate-600">
                                + {items.length - PREVIEW_COUNT} nhóm khác
                            </button>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}
