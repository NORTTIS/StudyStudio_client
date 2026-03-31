"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { components } from "@/api/types";
import type { GroupHeatmapComparisonData } from "./types";

type GroupActivityItem = components["schemas"]["StudioGroupActivityItem"];

interface ActivityHeatmapProps {
    data: GroupHeatmapComparisonData[];
    loading?: boolean;
    onDateRangeChange?: (start: Date, end: Date) => void;
}

// 5-level green color scale: empty → low → mid-low → mid → high
function getActivityColor(activityCount: number | undefined): string {
    const val = activityCount ?? 0;
    if (val === 0) return "bg-[#f0fdf4]";
    if (val <= 20) return "bg-[#bbf7d0]";
    if (val <= 40) return "bg-[#86efac]";
    if (val <= 60) return "bg-[#22c55e]";
    if (val <= 80) return "bg-[#15803d]";
    return "bg-[#14532d]";
}

function formatDateShort(date: Date, locale: string): string {
    const formatterLocale = locale === "vi" ? "vi-VN" : "en-US";
    return date.toLocaleDateString(formatterLocale, { day: "2-digit", month: "2-digit" });
}

export function ActivityHeatmap({ data, loading = false, onDateRangeChange }: ActivityHeatmapProps) {
    const t = useTranslations("ActivityHeatmap");
    const locale = useLocale();
    const today = useMemo(() => new Date(), []);
    const [offset, setOffset] = useState(0);
    const [tooltip, setTooltip] = useState<{
        x: number;
        y: number;
        groupName: string;
        activityCount: number;
        tasksCompleted: number;
        date: string;
    } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const DAY_COUNT = 30;

    const windowData = useMemo(() => {
        return data.slice(offset, offset + DAY_COUNT);
    }, [data, offset]);

    const windowDates = useMemo((): Date[] => {
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        const start = new Date(todayDate);
        start.setDate(start.getDate() - (DAY_COUNT - 1) - offset * DAY_COUNT);
        const dates: Date[] = [];
        for (let i = 0; i < DAY_COUNT; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            dates.push(d);
        }
        return dates;
    }, [offset]);

    // Collect all unique groups across every day in the data (dedup by groupId)
    const groups = useMemo((): GroupActivityItem[] => {
        if (!data.length) return [];
        const seen = new Set<string>();
        const result: GroupActivityItem[] = [];
        for (const day of data) {
            for (const g of day.groups ?? []) {
                if (g.groupId && !seen.has(g.groupId)) {
                    seen.add(g.groupId);
                    result.push(g);
                }
            }
        }
        return result;
    }, [data]);

    function shiftWindow(direction: 1 | -1) {
        const newOffset = offset + direction;
        if (newOffset < 0) return;
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() - newOffset * DAY_COUNT);
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - (DAY_COUNT - 1));
        setOffset(newOffset);
        onDateRangeChange?.(startDate, endDate);
    }

    function formatDateRange(dates: Date[]): string {
        if (!dates.length) return "";
        const first = dates[0];
        const last = dates[dates.length - 1];
        return `${formatDateShort(first, locale)} - ${formatDateShort(last, locale)}/${last.getFullYear()}`;
    }

    const showTooltip = useCallback(
        (
            e: React.MouseEvent<HTMLDivElement>,
            groupName: string,
            activityCount: number,
            tasksCompleted: number,
            date: Date
        ) => {
            setTooltip({
                x: e.clientX,
                y: e.clientY,
                groupName,
                activityCount,
                tasksCompleted,
                date: date.toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")
            });
        },
        [locale]
    );

    const hideTooltip = useCallback(() => setTooltip(null), []);

    return (
        <div ref={containerRef} className="relative rounded-xl border border-gray-200 bg-white p-5">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-[#261E33]">{t("title")}</h3>

                {/* Date range picker — hidden while loading */}
                {!loading && (
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5">
                        <button
                            onClick={() => shiftWindow(-1)}
                            disabled={offset === 0}
                            className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-200 hover:text-[#261E33] disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label={t("actions.previousPeriod")}>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                                <path
                                    d="M7.5 9.5L4 6L7.5 2.5"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </button>
                        <span className="min-w-[110px] text-center font-medium text-[#261E33] text-sm">
                            {formatDateRange(windowDates)}
                        </span>
                        <button
                            onClick={() => shiftWindow(1)}
                            className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-200 hover:text-[#261E33]"
                            aria-label={t("actions.nextPeriod")}>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                                <path
                                    d="M4.5 9.5L8 6L4.5 2.5"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {/* Loading spinner */}
            {loading && (
                <div className="flex h-48 items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-4 border-gray-200 border-t-[#FF5F3D]" />
                </div>
            )}

            {/* Empty state */}
            {!loading && data.length === 0 && (
                <div className="flex h-48 flex-col items-center justify-center gap-2 text-gray-400 text-sm">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                        <rect x="4" y="8" width="6" height="6" rx="1" fill="currentColor" opacity="0.2" />
                        <rect x="12" y="8" width="6" height="6" rx="1" fill="currentColor" opacity="0.3" />
                        <rect x="20" y="8" width="6" height="6" rx="1" fill="currentColor" opacity="0.5" />
                        <rect x="28" y="8" width="6" height="6" rx="1" fill="currentColor" opacity="0.2" />
                        <rect x="4" y="16" width="6" height="6" rx="1" fill="currentColor" opacity="0.3" />
                        <rect x="12" y="16" width="6" height="6" rx="1" fill="currentColor" opacity="0.1" />
                        <rect x="20" y="16" width="6" height="6" rx="1" fill="currentColor" opacity="0.4" />
                        <rect x="28" y="16" width="6" height="6" rx="1" fill="currentColor" opacity="0.2" />
                        <rect x="4" y="24" width="6" height="6" rx="1" fill="currentColor" opacity="0.1" />
                        <rect x="12" y="24" width="6" height="6" rx="1" fill="currentColor" opacity="0.3" />
                        <rect x="20" y="24" width="6" height="6" rx="1" fill="currentColor" opacity="0.2" />
                        <rect x="28" y="24" width="6" height="6" rx="1" fill="currentColor" opacity="0.4" />
                    </svg>
                    <span>{t("empty")}</span>
                </div>
            )}

            {/* Heatmap grid */}
            {!loading && data.length > 0 && (
                <>
                    <div className="flex gap-2 overflow-hidden">
                        {/* Fixed group label column */}
                        <div className="flex w-16 shrink-0 flex-col">
                            <div className="h-4" />
                            <div className="h-px" />
                            {groups.map((group) => (
                                <div
                                    key={group.groupId ?? ""}
                                    className="flex h-4 items-center truncate pr-1 text-right font-medium text-[#261E33] text-xs">
                                    {group.groupName}
                                </div>
                            ))}
                        </div>

                        {/* Grid cells */}
                        <div className="grid flex-1 grid-cols-[repeat(30,1fr)] gap-px">
                            {/* Date header */}
                            {windowDates.map((date, i) => (
                                <div
                                    key={i}
                                    className="flex h-4 items-center justify-center text-[9px] text-gray-400 leading-none">
                                    {date.getDate()}
                                </div>
                            ))}

                            {/* Divider spans full width */}
                            <div className="col-span-30 h-px bg-gray-100" />

                            {/* Group rows */}
                            {groups.map((group) => (
                                <div key={group.groupId ?? ""} className="contents">
                                    {windowDates.map((date, i) => {
                                        const dayEntry = windowData[i];
                                        const groupItem = dayEntry?.groups?.find((g) => g.groupId === group.groupId);
                                        const activityCount = groupItem?.activityCount ?? 0;
                                        const tasksCompleted = groupItem?.tasksCompleted ?? 0;

                                        return (
                                            <div
                                                key={i}
                                                onMouseEnter={(e) =>
                                                    showTooltip(
                                                        e,
                                                        group.groupName ?? "",
                                                        activityCount,
                                                        tasksCompleted,
                                                        date
                                                    )
                                                }
                                                onMouseMove={(e) => {
                                                    setTooltip((prev) =>
                                                        prev
                                                            ? {
                                                                  ...prev,
                                                                  x: e.clientX,
                                                                  y: e.clientY
                                                              }
                                                            : prev
                                                    );
                                                }}
                                                onMouseLeave={hideTooltip}
                                                className={`h-4 cursor-pointer rounded-sm transition-opacity hover:opacity-80 ${getActivityColor(activityCount)}`}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tooltip */}
                    {tooltip && (
                        <div
                            className="pointer-events-none fixed z-[9999] min-w-[160px] rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-lg"
                            style={{
                                left: tooltip.x,
                                top: tooltip.y,
                                transform: "translate(-100%, -100%)"
                            }}>
                            <div className="mb-1.5 font-semibold text-[#261E33] text-sm">{tooltip.groupName}</div>
                            <div className="flex items-center justify-between text-gray-500 text-xs">
                                <span>{t("tooltip.activity")}</span>
                                <span className="font-medium text-[#261E33]">{tooltip.activityCount}</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-gray-500 text-xs">
                                <span>{t("tooltip.completed")}</span>
                                <span className="font-medium text-[#261E33]">
                                    {tooltip.tasksCompleted} {t("tooltip.tasks")}
                                </span>
                            </div>
                            <div className="mt-1.5 border-gray-100 border-t pt-1.5 text-gray-400 text-xs">
                                {tooltip.date}
                            </div>
                        </div>
                    )}

                    {/* Legend + footer */}
                    <div className="mt-4 flex items-center justify-between border-gray-100 border-t pt-4">
                        <div className="flex items-center gap-2 text-gray-500 text-xs">
                            <span>{t("legend.low")}</span>
                            <div className="flex gap-0.5">
                                <div className="h-3 w-3 rounded-sm bg-[#f0fdf4]" />
                                <div className="h-3 w-3 rounded-sm bg-[#bbf7d0]" />
                                <div className="h-3 w-3 rounded-sm bg-[#86efac]" />
                                <div className="h-3 w-3 rounded-sm bg-[#22c55e]" />
                                <div className="h-3 w-3 rounded-sm bg-[#15803d]" />
                                <div className="h-3 w-3 rounded-sm bg-[#14532d]" />
                            </div>
                            <span>{t("legend.high")}</span>
                        </div>
                        <div className="text-gray-400 text-xs">
                            {t("updatedAt", {
                                date: today.toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
