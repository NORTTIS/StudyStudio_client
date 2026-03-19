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
        orange: "from-[#FB923C] via-[#F97316] to-[#EA580C]",
        yellow: "from-[#FBBF24] via-[#F59E0B] to-[#EA580C]",
        blue: "from-[#7DD3FC] via-[#60A5FA] to-[#3B82F6]",
        purple: "from-[#C4B5FD] via-[#A78BFA] to-[#8B5CF6]",
        slate: "from-[#CBD5E1] via-[#94A3B8] to-[#64748B]"
    };

    const shadows: Record<typeof variant, string> = {
        orange: "shadow-orange-200",
        yellow: "shadow-amber-200",
        blue: "shadow-blue-200",
        purple: "shadow-purple-200",
        slate: "shadow-slate-200"
    };

    const sizes = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-12 w-12" };

    return (
        <div
            className={cn(
                "relative flex shrink-0 items-center justify-center rounded-xl shadow-md",
                `bg-gradient-to-br ${gradients[variant]}`,
                shadows[variant],
                sizes[size],
                className
            )}>
            <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-white/30 via-white/10 to-transparent" />
            <div className="pointer-events-none absolute inset-px rounded-[10px] border border-white/20" />
            <div className="relative z-10">{children}</div>
        </div>
    );
}

function CountPill({ count }: { count: number }) {
    return (
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-[#F0E2D6] bg-[#FFFDFB] px-2 text-[11px] font-bold tracking-wide text-[#7C6A5A] shadow-sm">
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
                    className="h-20 animate-pulse rounded-xl bg-gradient-to-r from-[#F8EEE4] via-[#FFF8F2] to-[#F8EEE4]"
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
                <Card className="relative overflow-hidden rounded-3xl border border-[#F3E4D7] bg-gradient-to-br from-[#FFFDFB] via-[#FFF8F2] to-[#FFF3E8] shadow-[0_10px_40px_rgba(234,88,12,0.06)]">
                    <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-orange-200/20 blur-[60px]" />
                    <div className="pointer-events-none absolute -bottom-20 right-0 h-60 w-60 rounded-full bg-amber-200/20 blur-[60px]" />

                    <CardHeader className="relative pb-3 pt-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-4">
                                <IconBadge variant="orange" size="lg" className="h-13 w-13 rounded-2xl">
                                    <Users className="h-6 w-6 text-white" />
                                </IconBadge>

                                <div>
                                    <div className="flex items-center gap-2.5">
                                        <h1 className="text-[1.625rem] font-bold tracking-tight text-[#261E33]">
                                            Nhóm
                                        </h1>
                                        <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-orange-700">
                                            {currentGroupsCount}/{maxGroups}
                                        </span>
                                    </div>
                                    <p className="mt-0.5 text-sm text-[#7C6A58]">
                                        Quản lý các nhóm học tập của bạn
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex w-fit items-center gap-2 rounded-2xl border border-[#F3E4D7] bg-[#FFFCF8] p-1.5 shadow-sm">
                                    <button
                                        type="button"
                                        onClick={() => setView("grid")}
                                        className={cn(
                                            "relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                                            view === "grid"
                                                ? "bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white shadow-md shadow-orange-200"
                                                : "text-[#6B7280] hover:bg-[#FFF1E6] hover:text-[#EA580C]"
                                        )}>
                                        <LayoutGrid className="h-4 w-4" />
                                        <span>Board</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setView("list")}
                                        className={cn(
                                            "relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                                            view === "list"
                                                ? "bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white shadow-md shadow-orange-200"
                                                : "text-[#6B7280] hover:bg-[#FFF1E6] hover:text-[#EA580C]"
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
                                        "inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold transition-all duration-200",
                                        !limitReached
                                            ? "bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white shadow-md shadow-orange-200 hover:from-[#EA580C] hover:to-[#DC2626]"
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
                                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                                    {error}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
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
        orange: "from-[#FFF8F2] via-[#FFFDFB] to-[#FFF3E8]",
        yellow: "from-[#FFF9F0] via-[#FFFDFB] to-[#FFF6E8]",
        blue: "from-[#F7FAFF] via-[#FFFDFB] to-[#EEF5FF]",
        purple: "from-[#FAF7FF] via-[#FFFDFB] to-[#F4EEFF]",
        slate: "from-[#FAF8F6] via-[#FFFDFB] to-[#F3F1EE]"
    };

    const headerAccents: Record<typeof iconVariant, string> = {
        orange: "border-[#F3E4D7] bg-[#FFF5EC]",
        yellow: "border-[#F3E4D7] bg-[#FFF8EC]",
        blue: "border-[#E4ECF8] bg-[#F4F8FF]",
        purple: "border-[#ECE4FA] bg-[#F7F2FF]",
        slate: "border-[#E7DED4] bg-[#F8F5F1]"
    };

    return (
        <section
            className={cn(
                "group/section overflow-hidden rounded-3xl border border-[#F3E4D7] bg-gradient-to-br from-[#FFFDFB] via-[#FFF8F2] to-[#FFF3E8] shadow-[0_10px_30px_rgba(234,88,12,0.05)] transition-all duration-300 hover:-translate-y-[1px] hover:shadow-[0_14px_38px_rgba(234,88,12,0.10)]",
                className
            )}>
            <div
                className={cn(
                    "border-b px-5 py-4 transition-colors backdrop-blur-sm",
                    headerAccents[iconVariant]
                )}>
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <IconBadge variant={iconVariant} size="sm" className="rounded-xl">
                            <Icon className="h-4 w-4 text-white drop-shadow-sm" />
                        </IconBadge>

                        <div className="min-w-0 flex items-center gap-2.5">
                            <h2 className="truncate text-sm font-semibold text-[#261E33]">{title}</h2>
                            <CountPill count={count} />
                        </div>
                    </div>

                    {canToggle && (
                        <button
                            type="button"
                            onClick={onToggle}
                            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-[#7A6B5D] transition-all duration-200 hover:bg-[#FFF1E6] hover:text-[#EA580C]">
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
                    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#EEDCCB] bg-white/65 px-6 py-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F8EDE3] shadow-sm">
                            <Icon className="h-4 w-4 text-[#9A7B5B]" />
                        </div>
                        <p className="text-sm text-[#8D7B6A]">{emptyText}</p>
                    </div>
                ) : (
                    <>
                        <div
                            className={cn(
                                view === "grid"
                                    ? "grid items-start grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3"
                                    : "flex flex-col gap-2.5"
                            )}>
                            {visibleItems.map((g) => (
                                <div
                                    key={getGroupId(g)}
                                    className={cn(
                                        "rounded-xl self-start transition-all duration-200",
                                        view === "grid" && "hover:-translate-y-0.5 hover:shadow-md"
                                    )}>
                                    <GroupCard group={g} onToggleStar={() => onToggleStar(getGroupId(g))} />
                                </div>
                            ))}
                        </div>

                        {canToggle && !expanded && items.length > PREVIEW_COUNT && (
                            <button
                                onClick={onToggle}
                                className="mt-3.5 w-full rounded-xl border border-dashed border-[#EBD7C5] bg-white/60 py-2.5 text-[13px] font-medium text-[#8B7B6D] transition-all duration-200 hover:border-[#F0C7A8] hover:bg-[#FFF1E6] hover:text-[#EA580C]">
                                + {items.length - PREVIEW_COUNT} nhóm khác
                            </button>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}