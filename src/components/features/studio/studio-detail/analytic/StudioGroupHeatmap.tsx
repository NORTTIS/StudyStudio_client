"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

type HeatmapRangeFilter = "week" | "month";

interface StudioActivityRow {
    date?: string | null;
    groups?: Array<{
        groupId: string;
        groupName: string | null;
        groupColor: string | null;
        activityScore?: number;
        activityLevel?: number;
        tasksCompleted?: number;
        messagesSent?: number;
    }> | null;
}

interface StudioGroupHeatmapProps {
    data: StudioActivityRow[];
    range: HeatmapRangeFilter;
    anchorDate: Date;
    onPrev: () => void;
    onNext: () => void;
    onChangeRange: (value: HeatmapRangeFilter) => void;
}

// Activity colors based on level (0-4) — fixed green scale matching ActivityHeatmap
const HEATMAP_COLOR_MAP: Record<number, string> = {
    0: "#ecfdf3", // empty
    1: "#d1fadf", // very low
    2: "#73e2a3", // low
    3: "#16a34a", // medium
    4: "#166534" // high
};

const LEVEL_KEY_MAP: Record<number, "inactive" | "veryLow" | "low" | "medium" | "high"> = {
    0: "inactive",
    1: "veryLow",
    2: "low",
    3: "medium",
    4: "high"
};

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function pad2(value: number) {
    return String(value).padStart(2, "0");
}

function formatDateLocal(date: Date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatRangeLabel(start: Date, end: Date) {
    return `${pad2(start.getDate())}/${pad2(start.getMonth() + 1)} – ${pad2(end.getDate())}/${pad2(end.getMonth() + 1)}/${end.getFullYear()}`;
}

function getWeekRange(anchor: Date) {
    const day = anchor.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const start = new Date(anchor);
    start.setDate(anchor.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

function getMonthRange(anchor: Date) {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    return { start, end };
}

function getDatesInRange(start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(start);
    while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

export default function StudioGroupHeatmap({
    data,
    range,
    anchorDate,
    onPrev,
    onNext,
    onChangeRange
}: StudioGroupHeatmapProps) {
    const t = useTranslations("StudioGroupHeatmap");

    const { start, end } = React.useMemo(() => {
        return range === "week" ? getWeekRange(anchorDate) : getMonthRange(anchorDate);
    }, [anchorDate, range]);

    const dates = React.useMemo(() => getDatesInRange(start, end), [start, end]);
    const motionKey = `${range}-${formatDateLocal(start)}-${formatDateLocal(end)}`;

    // Build a map: groupId → group metadata (name, color)
    // Use the first row that has the group to get its name/color
    const groupMetaMap = React.useMemo(() => {
        const map = new Map<string, { name: string; color: string }>();
        for (const row of data) {
            if (!row.groups) continue;
            for (const g of row.groups) {
                if (!g.groupId || map.has(g.groupId)) continue;
                map.set(g.groupId, {
                    name: g.groupName ?? t("common.notAvailable"),
                    color: g.groupColor ?? "#94a3b8"
                });
            }
        }
        return map;
    }, [data, t]);

    // Get unique group IDs sorted by first appearance
    const groupIds = React.useMemo(() => {
        const seen = new Set<string>();
        const result: string[] = [];
        for (const row of data) {
            if (!row.groups) continue;
            for (const g of row.groups) {
                if (!g.groupId || seen.has(g.groupId)) continue;
                seen.add(g.groupId);
                result.push(g.groupId);
            }
        }
        return result;
    }, [data]);

    // Build a lookup: dateKey → groupId → activity item
    const dataMap = React.useMemo(() => {
        const map = new Map<string, Map<string, NonNullable<StudioActivityRow["groups"]>[0]>>();
        for (const row of data) {
            if (!(row.date && row.groups)) continue;
            const inner = new Map<string, NonNullable<StudioActivityRow["groups"]>[0]>();
            for (const g of row.groups) {
                if (g.groupId) inner.set(g.groupId, g);
            }
            map.set(row.date, inner);
        }
        return map;
    }, [data]);

    return (
        <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:p-6">
            {/* Header */}
            <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                    <h2 className="font-semibold text-lg text-slate-900">{t("header.title")}</h2>
                    <p className="mt-1 text-slate-500 text-sm">
                        {t("header.description", {
                            count: groupIds.length,
                            range: range === "week" ? t("range.week") : t("range.month")
                        })}
                    </p>
                </div>

                {/* Week / Month toggle */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex rounded-2xl bg-slate-100 p-1">
                        {(
                            [
                                { key: "week", label: t("range.week") },
                                { key: "month", label: t("range.month") }
                            ] as const
                        ).map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => onChangeRange(item.key)}
                                className={cn(
                                    "rounded-xl px-4 py-2 font-medium text-sm transition-all duration-300",
                                    range === item.key
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-500 hover:bg-white/70 hover:text-slate-900"
                                )}>
                                {item.label}
                            </button>
                        ))}
                    </div>

                    {/* Date range navigator */}
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                        <button
                            type="button"
                            onClick={onPrev}
                            className="rounded-lg px-2 py-1 text-slate-500 transition-all duration-300 hover:bg-orange-50 hover:text-orange-600 active:scale-95">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <div className="min-w-[170px] text-center font-medium text-slate-700 text-sm">
                            {formatRangeLabel(start, end)}
                        </div>
                        <button
                            type="button"
                            onClick={onNext}
                            className="rounded-lg px-2 py-1 text-slate-500 transition-all duration-300 hover:bg-orange-50 hover:text-orange-600 active:scale-95">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Heatmap grid */}
            <div className="overflow-x-auto">
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={motionKey}
                        initial={{ opacity: 0, y: 10, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.985 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className={cn("w-full", range === "week" ? "min-w-[520px]" : "min-w-[760px]")}>
                        {/* CSS Grid layout */}
                        <div
                            className="grid items-center gap-x-2 gap-y-3"
                            style={{
                                gridTemplateColumns: `120px repeat(${dates.length}, minmax(18px, 1fr))`
                            }}>
                            {/* Column headers — date numbers */}
                            <div className="sticky left-0 z-20 bg-white/90 backdrop-blur-sm" />
                            {dates.map((date, index) => (
                                <motion.div
                                    key={formatDateLocal(date)}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                        duration: 0.2,
                                        delay: index * 0.012,
                                        ease: [0.22, 1, 0.36, 1]
                                    }}
                                    className="text-center text-[11px] text-slate-500">
                                    {pad2(date.getDate())}
                                </motion.div>
                            ))}

                            {/* Rows — one per group */}
                            {groupIds.map((groupId, groupIndex) => {
                                const meta = groupMetaMap.get(groupId);
                                if (!meta) return null;

                                return (
                                    <React.Fragment key={groupId}>
                                        {/* Sticky group name label */}
                                        <motion.div
                                            initial={{ opacity: 0, x: -8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{
                                                duration: 0.22,
                                                delay: groupIndex * 0.015,
                                                ease: [0.22, 1, 0.36, 1]
                                            }}
                                            className="sticky left-0 z-10 flex items-center gap-2 bg-white/90 pr-2 backdrop-blur-sm">
                                            <span
                                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                                style={{ backgroundColor: meta.color }}
                                            />
                                            <span className="truncate font-medium text-slate-700 text-xs">
                                                {meta.name}
                                            </span>
                                        </motion.div>

                                        {/* Heatmap cells */}
                                        {dates.map((date, dateIndex) => {
                                            const dateKey = formatDateLocal(date);
                                            const rowMap = dataMap.get(dateKey);
                                            const item = rowMap?.get(groupId);
                                            const level = item?.activityLevel ?? 0;
                                            const score = item?.activityScore ?? 0;
                                            const tasks = item?.tasksCompleted ?? 0;
                                            const levelKey = LEVEL_KEY_MAP[level] ?? "inactive";

                                            return (
                                                <motion.div
                                                    key={`${groupId}-${dateKey}`}
                                                    title={t("tooltip.cell", {
                                                        name: meta.name,
                                                        date: dateKey,
                                                        tasks,
                                                        score,
                                                        level: t(`levels.${levelKey}`)
                                                    })}
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{
                                                        duration: 0.18,
                                                        delay: groupIndex * 0.01 + dateIndex * 0.004,
                                                        ease: [0.22, 1, 0.36, 1]
                                                    }}
                                                    className="group relative h-[18px] w-full cursor-pointer rounded-[5px] transition-transform duration-150 hover:scale-110"
                                                    style={{
                                                        backgroundColor: HEATMAP_COLOR_MAP[level] ?? "#ecfdf3"
                                                    }}
                                                />
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Legend */}
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                {/* Group colors legend */}
                {groupIds.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <span className="text-slate-400 text-xs">{t("legend.groups")}</span>
                        {groupIds.slice(0, 6).map((groupId) => {
                            const meta = groupMetaMap.get(groupId);
                            if (!meta) return null;
                            return (
                                <div key={groupId} className="flex items-center gap-1.5">
                                    <span
                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                        style={{ backgroundColor: meta.color }}
                                    />
                                    <span className="truncate text-slate-500 text-xs">{meta.name}</span>
                                </div>
                            );
                        })}
                        {groupIds.length > 6 && <span className="text-slate-400 text-xs">+{groupIds.length - 6}</span>}
                    </div>
                )}

                {/* Activity level legend — fixed green scale */}
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <span>{t("legend.activityLevel")}</span>
                    <div className="flex items-center gap-0.5">
                        <span className="text-[10px]">{t("legend.low")}</span>
                        {([0, 1, 2, 3, 4] as const).map((level) => (
                            <div
                                key={level}
                                className="h-2.5 w-2.5 rounded-[3px]"
                                style={{ backgroundColor: HEATMAP_COLOR_MAP[level] }}
                                title={t(`levels.${LEVEL_KEY_MAP[level]}`)}
                            />
                        ))}
                        <span className="text-[10px]">{t("legend.high")}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
