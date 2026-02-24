"use client";

import { ChevronDown, LayoutGrid, List, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { GroupCard } from "./GroupCard";
import { UsageBar } from "./UsageBar";
import type { Group, GroupsPageData } from "./types";
import { addFavourite, fetchGroupsPageData, removeFavourite } from "./group.api";
import { CreateGroupModal } from "@/components/features/group/create/CreateGroupModal";

const emptyData: GroupsPageData = {
    usage: { current: 0, max: 0 },
    favorites: [],
    managed: [],
    independent: []
};

const PREVIEW_COUNT = 3;

function removeById(list: Group[], id: string) {
    return list.filter((g) => g.id !== id);
}

function findGroup(data: GroupsPageData, id: string) {
    const inFavorites = data.favorites.find((g) => g.id === id);
    if (inFavorites) return { group: inFavorites, from: "favorites" as const };

    const inManaged = data.managed.find((g) => g.id === id);
    if (inManaged) return { group: inManaged, from: "managed" as const };

    const inIndependent = data.independent.find((g) => g.id === id);
    if (inIndependent) return { group: inIndependent, from: "independent" as const };

    return null;
}

function defaultSectionFor(group: Group) {
    return group.tag ? ("managed" as const) : ("independent" as const);
}

export function GroupsPage() {
    const [view, setView] = useState<"grid" | "list">("grid");
    const [data, setData] = useState<GroupsPageData>(emptyData);
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(true);
    const [openCreate, setOpenCreate] = useState(false);

    const [expandFav, setExpandFav] = useState(false);
    const [expandManaged, setExpandManaged] = useState(false);
    const [expandIndependent, setExpandIndependent] = useState(false);

    const reload = async () => {
        try {
            setLoading(true);
            setError("");
            const res = await fetchGroupsPageData();
            setData(res);
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
                setData(res);
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

    const maxGroups = usage.max > 0 ? usage.max : 5;
    const currentGroupsCount =
        usage.current > 0 ? usage.current : favorites.length + managed.length + independent.length;

    const limitReached = currentGroupsCount >= maxGroups;

    const onToggleStar = async (groupId: string) => {
        const snapshot = data;
        const found = findGroup(snapshot, groupId);
        if (!found) return;

        const isStarred = !!found.group.isStarred;

        setData((prev) => {
            const current = findGroup(prev, groupId);
            if (!current) return prev;

            const g: Group = { ...current.group, isStarred: !isStarred };

            if (!isStarred) {
                return {
                    ...prev,
                    favorites: [g, ...removeById(prev.favorites, groupId)],
                    managed: removeById(prev.managed, groupId),
                    independent: removeById(prev.independent, groupId)
                };
            }

            const target = defaultSectionFor(current.group);

            return {
                ...prev,
                favorites: removeById(prev.favorites, groupId),
                managed:
                    target === "managed"
                        ? [g, ...removeById(prev.managed, groupId)]
                        : removeById(prev.managed, groupId),
                independent:
                    target === "independent"
                        ? [g, ...removeById(prev.independent, groupId)]
                        : removeById(prev.independent, groupId)
            };
        });

        try {
            if (!isStarred) await addFavourite(groupId);
            else await removeFavourite(groupId);
        } catch (e: unknown) {
            setData(snapshot);
            setError(e instanceof Error ? e.message : "Toggle favourite failed");
        }
    };

    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-8">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <h1 className="text-2xl font-bold text-[#261E33]">Nhóm</h1>
                    <p className="mt-1 text-sm text-[#6F6B99]">Quản lý các nhóm học tập của bạn</p>

                    <div className="mt-4 w-full">
                        <UsageBar current={usage.current} max={usage.max} />
                    </div>

                    {loading ? <p className="mt-2 text-sm text-[#6F6B99]">Đang tải...</p> : null}
                    {!loading && error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
                </div>

                <div className="mt-2 flex items-center gap-2 shrink-0">
                    <div className="inline-flex overflow-hidden rounded-lg border border-[#E5E5E5] bg-white">
                        <button
                            type="button"
                            onClick={() => setView("grid")}
                            className={`px-3 py-2 text-sm ${view === "grid" ? "bg-[#F4F5FA] text-[#261E33]" : "text-[#6F6B99] hover:bg-[#F4F5FA]"
                                }`}
                            aria-label="Grid"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>

                        <button
                            type="button"
                            onClick={() => setView("list")}
                            className={`px-3 py-2 text-sm ${view === "list" ? "bg-[#F4F5FA] text-[#261E33]" : "text-[#6F6B99] hover:bg-[#F4F5FA]"
                                }`}
                            aria-label="List"
                        >
                            <List className="h-4 w-4" />
                        </button>
                    </div>

                    <Button
                        className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300"
                        disabled={limitReached}
                        onClick={() => setOpenCreate(true)}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Nhóm mới
                    </Button>
                </div>
            </div>

            <GroupsSection
                title={`Nhóm yêu thích (${favorites.length})`}
                view={view}
                items={favorites}
                expanded={expandFav}
                onToggle={() => setExpandFav((v) => !v)}
                onToggleStar={onToggleStar}
            />

            <GroupsSection
                className="mt-10"
                title={`Nhóm thuộc không gian quản lý (${managed.length})`}
                view={view}
                items={managed}
                expanded={expandManaged}
                onToggle={() => setExpandManaged((v) => !v)}
                onToggleStar={onToggleStar}
            />

            <GroupsSection
                className="mt-10"
                title={`Nhóm độc lập (${independent.length})`}
                view={view}
                items={independent}
                expanded={expandIndependent}
                onToggle={() => setExpandIndependent((v) => !v)}
                onToggleStar={onToggleStar}
            />

            <CreateGroupModal
                open={openCreate}
                onClose={() => setOpenCreate(false)}
                currentGroupCount={currentGroupsCount}
                maxGroups={maxGroups}
                onCreate={async () => {
                    await reload();
                }}
            />
        </div>
    );
}

function GroupsSection({
    title,
    items,
    view,
    className = "",
    expanded,
    onToggle,
    onToggleStar
}: {
    title: string;
    items: Group[];
    view: "grid" | "list";
    className?: string;
    expanded: boolean;
    onToggle: () => void;
    onToggleStar: (groupId: string) => void;
}) {
    const canToggle = items.length > PREVIEW_COUNT;
    const visibleItems = expanded || !canToggle ? items : items.slice(0, PREVIEW_COUNT);

    return (
        <section className={`mt-10 ${className}`}>
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-[#261E33]">{title}</h2>

                {canToggle ? (
                    <button
                        type="button"
                        onClick={onToggle}
                        className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-[#6F6B99] hover:bg-[#F4F5FA] hover:text-[#261E33]"
                        aria-label={expanded ? "Thu gọn" : "Mở rộng"}
                    >
                        <span>{expanded ? "Thu gọn" : "Xem tất cả"}</span>
                        <ChevronDown className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`} />
                    </button>
                ) : null}
            </div>

            <div
                className={
                    view === "grid"
                        ? "mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
                        : "mt-4 space-y-4"
                }
            >
                {visibleItems.map((g) => (
                    <GroupCard key={g.id} group={g} onToggleStar={() => onToggleStar(g.id)} />
                ))}
            </div>
        </section>
    );
}