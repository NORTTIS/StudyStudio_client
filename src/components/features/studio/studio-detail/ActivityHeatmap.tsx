"use client";

import { useMemo, useState } from "react";
import { type GroupActivity } from "./types";

interface ActivityHeatmapProps {
    data: GroupActivity[];
    groupName?: string;
}

const DAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTHS = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];

export function ActivityHeatmap({ data, groupName }: ActivityHeatmapProps) {
    const [selectedGroup, setSelectedGroup] = useState<string>(groupName || "all");

    const getActivityColor = (activity: number) => {
        if (activity === 0) return "bg-gray-100";
        if (activity <= 20) return "bg-green-100";
        if (activity <= 40) return "bg-green-300";
        if (activity <= 60) return "bg-green-500";
        if (activity <= 80) return "bg-green-600";
        return "bg-green-700";
    };

    // Group data by weeks for display
    const weeks = useMemo(() => {
        const result: GroupActivity[][] = [];
        let currentWeek: GroupActivity[] = [];

        data.forEach((day, index) => {
            currentWeek.push(day);
            if (day.dayOfWeek === 6 || index === data.length - 1) {
                // Pad the first week if it doesn't start on Sunday
                if (result.length === 0 && currentWeek.length < 7) {
                    const padding = 7 - currentWeek.length;
                    for (let i = 0; i < padding; i++) {
                        currentWeek.unshift({ date: "", dayOfWeek: -1, activity: 0 });
                    }
                }
                result.push(currentWeek);
                currentWeek = [];
            }
        });

        return result;
    }, [data]);

    const getMonthLabels = useMemo(() => {
        const labels: { month: string; week: number }[] = [];
        let currentMonth = -1;

        weeks.forEach((week, weekIndex) => {
            const firstValidDay = week.find((d) => d.dayOfWeek >= 0);
            if (firstValidDay) {
                const month = new Date(firstValidDay.date).getMonth();
                if (month !== currentMonth) {
                    labels.push({ month: MONTHS[month], week: weekIndex });
                    currentMonth = month;
                }
            }
        });

        return labels;
    }, [weeks]);

    // Calculate summary stats
    const stats = useMemo(() => {
        const totalActivity = data.reduce((sum, d) => sum + d.activity, 0);
        const avgActivity = Math.round(totalActivity / data.length);
        const activeDays = data.filter((d) => d.activity > 0).length;
        const maxActivity = Math.max(...data.map((d) => d.activity));

        return { avgActivity, activeDays, maxActivity };
    }, [data]);

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-[#261E33]">Hoạt động nhóm</h3>
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500">Ít</span>
                    <div className="flex gap-0.5">
                        <div className="h-3 w-3 rounded-sm bg-gray-100" />
                        <div className="h-3 w-3 rounded-sm bg-green-100" />
                        <div className="h-3 w-3 rounded-sm bg-green-300" />
                        <div className="h-3 w-3 rounded-sm bg-green-500" />
                        <div className="h-3 w-3 rounded-sm bg-green-700" />
                    </div>
                    <span className="text-gray-500">Nhiều</span>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="mb-4 grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <p className="text-lg font-semibold text-[#261E33]">{stats.avgActivity}%</p>
                    <p className="text-xs text-gray-500">Trung bình</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <p className="text-lg font-semibold text-[#261E33]">{stats.activeDays}/28</p>
                    <p className="text-xs text-gray-500">Ngày hoạt động</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <p className="text-lg font-semibold text-[#261E33]">{stats.maxActivity}%</p>
                    <p className="text-xs text-gray-500">Cao nhất</p>
                </div>
            </div>

            {/* Heatmap Grid */}
            <div className="overflow-x-auto">
                <div className="min-w-[400px]">
                    {/* Month labels */}
                    <div className="mb-1 flex pl-8">
                        {getMonthLabels.map((label, i) => (
                            <div
                                key={i}
                                className="text-xs text-gray-400"
                                style={{
                                    marginLeft: i === 0 ? 0 : `${(label.week - (getMonthLabels[i - 1]?.week || 0)) * 14 - 24}px`
                                }}>
                                {label.month}
                            </div>
                        ))}
                    </div>

                    {/* Day labels and grid */}
                    <div className="flex">
                        {/* Day labels */}
                        <div className="flex flex-col gap-0.5 pr-1">
                            {DAYS.map((day, i) => (
                                <div
                                    key={day}
                                    className="flex h-3 items-center justify-end pr-1 text-xs text-gray-400"
                                    style={{ visibility: i % 2 === 1 ? "visible" : "hidden" }}>
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Heatmap cells */}
                        <div className="flex gap-0.5">
                            {weeks.map((week, weekIndex) => (
                                <div key={weekIndex} className="flex flex-col gap-0.5">
                                    {week.map((day, dayIndex) => (
                                        <div
                                            key={`${weekIndex}-${dayIndex}`}
                                            className={`h-3 w-3 rounded-sm transition-colors ${
                                                day.activity > 0 ? getActivityColor(day.activity) : "bg-transparent"
                                            }`}
                                            title={
                                                day.date
                                                    ? `${day.date}: ${day.activity}% hoạt động`
                                                    : ""
                                            }
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                <div className="text-xs text-gray-500">
                    Dữ liệu 28 ngày gần nhất
                </div>
                <div className="text-xs text-gray-400">
                    Cập nhật: {new Date().toLocaleDateString("vi-VN")}
                </div>
            </div>
        </div>
    );
}
