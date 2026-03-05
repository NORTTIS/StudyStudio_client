"use client";

import {
    ChevronDown,
    FolderKanban,
    LayoutGrid,
    Layers,
    List,
    Plus,
    Star,
    Users,
} from "lucide-react";
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
    independent: [],
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
            if (!id) continue;
            if (seen.has(id)) continue;
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
    };
}

function uniqueByIdKeepFirst(list: Group[]) {
    const seen = new Set<string>();
    const out: Group[] = [];
    for (const g of list) {
        const id = getGroupId(g);
        if (!id) continue;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(g);
    }
    return out;
}

/** Premium icon badge (no text changes) */
function IconBadge({
    variant,
    children,
    className = "",
}: {
    variant: "orange" | "yellow" | "blue" | "purple" | "slate";
    children: React.ReactNode;
    className?: string;
}) {
    const styles: Record<typeof variant, string> = {
        orange:
            "bg-gradient-to-br from-orange-400 to-orange-600 shadow-[0_8px_20px_-10px_rgba(234,88,12,0.7)]",
        yellow:
            "bg-gradient-to-br from-amber-300 to-yellow-500 shadow-[0_8px_20px_-10px_rgba(245,158,11,0.7)]",
        blue: "bg-gradient-to-br from-sky-400 to-blue-600 shadow-[0_8px_20px_-10px_rgba(37,99,235,0.7)]",
        purple:
            "bg-gradient-to-br from-violet-400 to-purple-600 shadow-[0_8px_20px_-10px_rgba(147,51,234,0.7)]",
        slate:
            "bg-gradient-to-br from-slate-200 to-slate-300 shadow-[0_8px_20px_-12px_rgba(15,23,42,0.35)]",
    };

    return (
        <div
            className={cn(
                "relative flex items-center justify-center rounded-xl ring-1 ring-black/5",
                styles[variant],
                className
            )}
        >
            {/* subtle highlight */}
            <div className="pointer-events-none absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.55),transparent_55%)]" />
            <div className="relative">{children}</div>
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

    const allGroups = useMemo(() => {
        return uniqueByIdKeepFirst([...favorites, ...managed, ...independent]);
    }, [favorites, managed, independent]);

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
                    independent: prev.independent.map((g) => (getGroupId(g) === groupId ? updated : g)),
                };
            }

            return {
                ...prev,
                favorites: prev.favorites.filter((g) => getGroupId(g) !== groupId),
                managed: prev.managed.map((g) => (getGroupId(g) === groupId ? updated : g)),
                independent: prev.independent.map((g) => (getGroupId(g) === groupId ? updated : g)),
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
            {/* Premium header */}
            <Card className="relative overflow-hidden border-muted/60 shadow-sm">
                {/* subtle background glow */}
                <div className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-orange-500/10 blur-3xl" />
                <div className="pointer-events-none absolute -right-24 -bottom-24 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />

                <CardHeader className="pb-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                            <div className="flex items-center gap-3">
                                <IconBadge variant="orange" className="h-11 w-11">
                                    <Users className="h-5 w-5 text-white" />
                                </IconBadge>

                                <div>
                                    <h1 className="text-2xl font-bold tracking-tight text-[#261E33]">Nhóm</h1>
                                    <p className="mt-1 text-sm text-[#6F6B99]">Quản lý các nhóm học tập của bạn</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 md:justify-end">
                            <ToggleGroup
                                type="single"
                                value={view}
                                onValueChange={(v) => (v === "grid" || v === "list" ? setView(v) : null)}
                                className="rounded-xl border bg-background p-1 shadow-sm"
                                aria-label="View"
                            >
                                <ToggleGroupItem
                                    value="grid"
                                    aria-label="Grid"
                                    className="h-9 w-9 rounded-lg data-[state=on]:bg-muted data-[state=on]:text-foreground"
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </ToggleGroupItem>
                                <ToggleGroupItem
                                    value="list"
                                    aria-label="List"
                                    className="h-9 w-9 rounded-lg data-[state=on]:bg-muted data-[state=on]:text-foreground"
                                >
                                    <List className="h-4 w-4" />
                                </ToggleGroupItem>
                            </ToggleGroup>

                            <Button
                                className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 shadow-sm"
                                disabled={limitReached}
                                onClick={() => setOpenCreate(true)}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Nhóm mới
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-0">
                    <div className="space-y-2">
                        <UsageBar current={usage.current} max={usage.max} />
                        {loading ? <p className="text-sm text-[#6F6B99]">Đang tải...</p> : null}
                        {!loading && error ? <p className="text-sm text-red-600">{error}</p> : null}
                    </div>
                </CardContent>
            </Card>

            {/* Sections */}
            <div className="mt-8 space-y-10">
                <GroupsSection
                    icon={FolderKanban}
                    iconVariant="blue"
                    title={`Các nhóm bạn đã tạo (${allGroups.length})`}
                    view={view}
                    items={allGroups}
                    expanded={expandAll}
                    onToggle={() => setExpandAll((v) => !v)}
                    onToggleStar={onToggleStar}
                />

                <GroupsSection
                    icon={Star}
                    iconVariant="yellow"
                    title={`Nhóm yêu thích (${favorites.length})`}
                    view={view}
                    items={favorites}
                    expanded={expandFav}
                    onToggle={() => setExpandFav((v) => !v)}
                    onToggleStar={onToggleStar}
                />

                <GroupsSection
                    icon={Layers}
                    iconVariant="purple"
                    title={`Nhóm thuộc studio tôi quản lý (${managed.length})`}
                    view={view}
                    items={managed}
                    expanded={expandManaged}
                    onToggle={() => setExpandManaged((v) => !v)}
                    onToggleStar={onToggleStar}
                />

                <GroupsSection
                    icon={Users}
                    iconVariant="slate"
                    title={`Nhóm độc lập (${independent.length})`}
                    view={view}
                    items={independent}
                    expanded={expandIndependent}
                    onToggle={() => setExpandIndependent((v) => !v)}
                    onToggleStar={onToggleStar}
                />
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
    icon: Icon,
    iconVariant,
    items,
    view,
    className = "",
    expanded,
    onToggle,
    onToggleStar,
}: {
    title: string;
    icon: React.ElementType;
    iconVariant: "orange" | "yellow" | "blue" | "purple" | "slate";
    items: Group[];
    view: "grid" | "list";
    className?: string;
    expanded: boolean;
    onToggle: () => void;
    onToggleStar: (groupId: string) => Promise<void>;
}) {
    const canToggle = items.length > PREVIEW_COUNT;
    const visibleItems = expanded || !canToggle ? items : items.slice(0, PREVIEW_COUNT);

    return (
        <Card className={cn("border-muted/60 shadow-sm", className)}>
            <CardHeader className="pb-3">
                <div className="group flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <IconBadge
                            variant={iconVariant}
                            className="h-9 w-9 transition-transform duration-200 group-hover:scale-105"
                        >
                            <Icon className="h-[18px] w-[18px] text-white" />
                        </IconBadge>

                        <h2 className="text-sm font-semibold text-[#261E33]">{title}</h2>
                    </div>

                    {canToggle ? (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onToggle}
                            className="h-9 gap-2 rounded-lg px-2 text-sm font-medium text-[#6F6B99] hover:bg-muted hover:text-[#261E33]"
                            aria-label={expanded ? "Thu gọn" : "Mở rộng"}
                        >
                            <span>{expanded ? "Thu gọn" : "Xem tất cả"}</span>
                            <ChevronDown className={cn("h-4 w-4 transition", expanded && "rotate-180")} />
                        </Button>
                    ) : null}
                </div>

                <Separator className="mt-3" />
            </CardHeader>

            <CardContent className="pt-0">
                <div
                    className={
                        view === "grid"
                            ? "grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
                            : "space-y-4"
                    }
                >
                    {visibleItems.map((g) => (
                        <div
                            key={getGroupId(g)}
                            className="transition-transform duration-200 hover:-translate-y-0.5 hover:drop-shadow-sm"
                        >
                            <GroupCard group={g} onToggleStar={() => onToggleStar(getGroupId(g))} />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}