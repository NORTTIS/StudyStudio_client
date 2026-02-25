"use client";

import { ChevronDown, LayoutGrid, List, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/common";
import { CreateGroupModal } from "@/components/features/group/create/CreateGroupModal";
import { Button } from "@/components/ui/button";
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

function removeById(list: Group[], id: string) {
    const target = normId(id);
    return list.filter((g) => getGroupId(g) !== target);
}
function sanitizeGroupsPageData(raw: GroupsPageData): GroupsPageData {
    const seen = new Set<string>();

    const uniqKeepOrder = (list: Group[]) => {
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

    const favorites = uniqKeepOrder(raw.favorites ?? []);
    const managed = uniqKeepOrder(raw.managed ?? []);
    const independent = uniqKeepOrder(raw.independent ?? []);

    return {
        ...raw,
        favorites,
        managed,
        independent
    };
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

    const maxGroups = usage.max > 0 ? usage.max : 5;
    const currentGroupsCount = usage.current > 0 ? usage.current : favorites.length + managed.length + independent.length;

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
            const base: GroupsPageData = {
                ...prev,
                favorites: removeById(prev.favorites, groupId),
                managed: removeById(prev.managed, groupId),
                independent: removeById(prev.independent, groupId)
            };

            if (!wasStarred) {
                return { ...base, favorites: [updated, ...base.favorites] };
            }

            const backToManaged = !!(updated as any).tag;
            if (backToManaged) return { ...base, managed: [updated, ...base.managed] };
            return { ...base, independent: [updated, ...base.independent] };
        });

        // ✅ Persist
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-start">
                <div className="min-w-0">
                    <h1 className="font-bold text-2xl text-[#261E33]">Nhóm</h1>
                    <p className="mt-1 text-[#6F6B99] text-sm">Quản lý các nhóm học tập của bạn</p>
                </div>

                <div className="mt-2 flex items-center justify-start gap-2 md:justify-end">
                    <div className="inline-flex overflow-hidden rounded-lg border border-[#E5E5E5] bg-white">
                        <button
                            type="button"
                            onClick={() => setView("grid")}
                            className={`px-3 py-2 text-sm ${view === "grid" ? "bg-[#F4F5FA] text-[#261E33]" : "text-[#6F6B99] hover:bg-[#F4F5FA]"
                                }`}
                            aria-label="Grid">
                            <LayoutGrid className="h-4 w-4" />
                        </button>

                        <button
                            type="button"
                            onClick={() => setView("list")}
                            className={`px-3 py-2 text-sm ${view === "list" ? "bg-[#F4F5FA] text-[#261E33]" : "text-[#6F6B99] hover:bg-[#F4F5FA]"
                                }`}
                            aria-label="List">
                            <List className="h-4 w-4" />
                        </button>
                    </div>

                    <Button
                        className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300"
                        disabled={limitReached}
                        onClick={() => setOpenCreate(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nhóm mới
                    </Button>
                </div>

                <div className="col-span-full">
                    <UsageBar current={usage.current} max={usage.max} />
                    {loading ? <p className="mt-2 text-[#6F6B99] text-sm">Đang tải...</p> : null}
                    {!loading && error ? <p className="mt-2 text-red-600 text-sm">{error}</p> : null}
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
        </Container>
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
    onToggleStar: (groupId: string) => Promise<void>;
}) {
    const canToggle = items.length > PREVIEW_COUNT;
    const visibleItems = expanded || !canToggle ? items : items.slice(0, PREVIEW_COUNT);

    return (
        <section className={`mt-10 ${className}`}>
            <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-[#261E33] text-sm">{title}</h2>

                {canToggle ? (
                    <button
                        type="button"
                        onClick={onToggle}
                        className="inline-flex items-center gap-2 rounded-lg px-2 py-1 font-medium text-[#6F6B99] text-sm hover:bg-[#F4F5FA] hover:text-[#261E33]"
                        aria-label={expanded ? "Thu gọn" : "Mở rộng"}>
                        <span>{expanded ? "Thu gọn" : "Xem tất cả"}</span>
                        <ChevronDown className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`} />
                    </button>
                ) : null}
            </div>

            <div className={view === "grid" ? "mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3" : "mt-4 space-y-4"}>
                {visibleItems.map((g) => (
                    <GroupCard key={getGroupId(g)} group={g} onToggleStar={() => onToggleStar(getGroupId(g))} />
                ))}
            </div>
        </section>
    );
}
