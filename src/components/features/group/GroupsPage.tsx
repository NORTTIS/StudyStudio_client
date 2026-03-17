"use client";

import { ChevronDown, FolderKanban, LayoutGrid, Layers, List, Plus, Star, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/common";
import { CreateGroupModal } from "@/components/features/group/create/CreateGroupModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
        slate: "from-slate-400 via-slate-500 to-slate-600"
    };

    const shadows: Record<typeof variant, string> = {
        orange: "shadow-orange-500/25",
        yellow: "shadow-amber-400/25",
        blue: "shadow-blue-500/25",
        purple: "shadow-purple-500/25",
        slate: "shadow-slate-500/20"
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
            <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-white/35 via-white/10 to-transparent" />
            <div className="pointer-events-none absolute inset-px rounded-[10px] border border-white/25" />
            <div className="relative z-10">{children}</div>
        </div>
    );
}

function CountPill({ count }: { count: number }) {
    return (
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-[#E8DDD0] bg-gradient-to-b from-[#FFF9F2] to-[#F6EFE7] px-2 text-[11px] font-bold tracking-wide text-[#7C6652] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
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
                    className="h-20 animate-pulse rounded-xl bg-gradient-to-r from-[#F4EEE7] via-[#FBF7F2] to-[#F4EEE7]"
                />
            ))}
        </div>
    );
}

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
            <div className="relative min-h-screen space-y-5 py-2">
                <Card className="relative overflow-hidden border border-[#E7DDD2] bg-gradient-to-br from-[#FBF8F4] via-[#F8F3EC] to-[#F6EFEA] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_10px_30px_-12px_rgba(15,23,42,0.10)] ring-1 ring-[#EDE3D8]">
                    <div className="pointer-events-none absolute -left-32 -top-32 h-72 w-72 rounded-full bg-orange-300/[0.10] blur-[60px]" />
                    <div className="pointer-events-none absolute -bottom-20 right-0 h-64 w-64 rounded-full bg-amber-300/[0.08] blur-[60px]" />
                    <div className="pointer-events-none absolute left-1/2 top-0 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-orange-300/50 to-transparent" />

                    <CardHeader className="relative pb-3 pt-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-4">
                                <IconBadge variant="orange" size="lg" className="h-13 w-13 rounded-2xl">
                                    <Users className="h-6 w-6 text-white drop-shadow-sm" />
                                </IconBadge>
                                <div>
                                    <div className="flex items-center gap-2.5">
                                        <h1 className="text-[1.625rem] font-bold tracking-tight text-[#2B241F]">
                                            Nhóm
                                        </h1>
                                        <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-orange-700">
                                            {currentGroupsCount}/{maxGroups}
                                        </span>
                                    </div>
                                    <p className="mt-0.5 text-sm text-[#7C6A58]">Quản lý các nhóm học tập của bạn</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex w-fit items-center gap-2 rounded-xl border border-[#EADFD3] bg-white/75 p-1.5 shadow-md shadow-orange-900/5 backdrop-blur-xl">
                                    <button
                                        type="button"
                                        onClick={() => setView("grid")}
                                        className={cn(
                                            "relative inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-300",
                                            view === "grid"
                                                ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25"
                                                : "text-[#6B5D50] hover:bg-[#FFF3E7] hover:text-orange-700"
                                        )}>
                                        <LayoutGrid className="h-4 w-4" />
                                        <span>Board</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setView("list")}
                                        className={cn(
                                            "relative inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-300",
                                            view === "list"
                                                ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25"
                                                : "text-[#6B5D50] hover:bg-[#FFF3E7] hover:text-orange-700"
                                        )}>
                                        <List className="h-4 w-4" />
                                        <span>List</span>
                                    </button>
                                </div>

                                <Button
                                    type="button"
                                    disabled={limitReached}
                                    onClick={() => setOpenCreate(true)}
                                    className={cn(
                                        "inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold transition-all duration-300",
                                        !limitReached
                                            ? "bg-[#FF5F3D] text-white shadow-lg shadow-orange-500/20 hover:bg-[#ff4620] hover:shadow-orange-500/30 active:scale-[0.98]"
                                            : "cursor-not-allowed bg-[#EAE3DB] text-[#A39487] shadow-none"
                                    )}>
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
                                <div className="flex items-center gap-2 text-sm text-[#8A7868]">
                                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#E4D9CD] border-t-orange-400" />
                                    Đang tải...
                                </div>
                            )}
                            {!loading && error && (
                                <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 ring-1 ring-red-100">
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
        orange: "from-[#FFF4EA] via-[#FFF8F2] to-transparent",
        yellow: "from-[#FFF8E7] via-[#FFFBF2] to-transparent",
        blue: "from-[#EEF5FF] via-[#F7FAFF] to-transparent",
        purple: "from-[#F6F0FF] via-[#FBF8FF] to-transparent",
        slate: "from-[#F3F1EE] via-[#FBFAF8] to-transparent"
    };

    const headerAccents: Record<typeof iconVariant, string> = {
        orange: "border-orange-100 bg-[#FFF3E8]",
        yellow: "border-amber-100 bg-[#FFF7E8]",
        blue: "border-blue-100 bg-[#EEF5FF]",
        purple: "border-purple-100 bg-[#F4EDFF]",
        slate: "border-[#E7DED4] bg-[#F6F2ED]"
    };

    return (
        <section
            className={cn(
                "group/section overflow-hidden rounded-2xl border border-[#E7DED4] bg-gradient-to-br from-[#FFFDFC] via-[#FAF7F3] to-[#F7F2EC] shadow-[0_1px_4px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(15,23,42,0.10)] transition-all duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.05),0_12px_28px_-14px_rgba(15,23,42,0.12)]",
                className
            )}>
            <div className={cn("border-b px-5 py-3.5 transition-colors", headerAccents[iconVariant])}>
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <IconBadge variant={iconVariant} size="sm" className="rounded-xl">
                            <Icon className="h-4 w-4 text-white drop-shadow-sm" />
                        </IconBadge>

                        <div className="min-w-0 flex items-center gap-2.5">
                            <h2 className="truncate text-sm font-semibold text-[#2B241F]">{title}</h2>
                            <CountPill count={count} />
                        </div>
                    </div>

                    {canToggle && (
                        <button
                            type="button"
                            onClick={onToggle}
                            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-[#7A6B5D] transition-all duration-150 hover:bg-white/80 hover:text-[#4E4238]">
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

            <div className={cn("bg-gradient-to-b p-5", accentColors[iconVariant])}>
                {loading ? (
                    <SectionSkeleton />
                ) : visibleItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#E7DDD1] bg-white/55 px-6 py-8 text-center">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3ECE4]">
                            <Icon className="h-4 w-4 text-[#9A8C7D]" />
                        </div>
                        <p className="text-sm text-[#8D7B6A]">{emptyText}</p>
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
                                className="mt-3.5 w-full rounded-xl border border-dashed border-[#E2D8CC] bg-white/45 py-2.5 text-[13px] font-medium text-[#8B7B6D] transition-all hover:border-[#D4C7B7] hover:bg-[#FFF7EF] hover:text-[#5F5145]">
                                + {items.length - PREVIEW_COUNT} nhóm khác
                            </button>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}