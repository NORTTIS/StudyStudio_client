"use client";

import * as React from "react";
import * as echarts from "echarts";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Layers3, Clock3, X } from "lucide-react";
import { usePathname } from "next/navigation";

import { getGroupAnalytics } from "@/api/analytics";
import type { GroupAnalyticsResponse } from "@/api/analytics";
import { Container } from "@/components/common";

const selectedYear = 2026;

type TrendFilter = "week" | "month" | "year";
type HeatmapRangeFilter = "week" | "month";

type DailyProgressPoint = {
    label: string;
    [key: string]: string | number;
};

type MemberCompareSeries = {
    userId: string;
    userName: string;
    totalTasks: number;
    doneTasks: number;
    inProgressTasks: number;
    todoTasks: number;
    overdueTasks: number;
    contributionPercentage: number;
    messagesSent: number;
    colorSeed: number;
};

type PersonalAnalyticsData = {
    totalTasks: number;
    todoTasks: number;
    inProgressTasks: number;
    doneTasks: number;
    overdueTasks: number;
    completionTrend: DailyProgressPoint[];
    compareMembers: MemberCompareSeries[];
    heatmapByDate: Record<string, number>;
};

type TeamHeatmapMember = {
    id: string;
    name: string;
    heatmapByDate: Record<string, number>;
};

type MemberProgressStatus = "on-track" | "warning" | "delayed";

type MemberProgressItem = {
    id: string;
    name: string;
    completedTasks: number;
    totalTasks: number;
    lastActivity: string;
};

const MEMBER_COLORS = [
    "#2563eb",
    "#f97316",
    "#10b981",
    "#7c3aed",
    "#ef4444",
    "#0ea5e9",
    "#f59e0b",
    "#14b8a6",
    "#8b5cf6",
    "#ec4899",
    "#22c55e",
];

const MOCK_MEMBER_NAMES = [
    "dat",
    "Nguyễn An",
    "Trần Bình",
    "Lê Chi",
    "Phạm Duy",
    "Hoàng Giang",
    "Vũ Hạnh",
    "Đỗ Khôi",
    "Bùi Lan",
    "Mai Nam",
];

const stripLocale = (p: string) => p.replace(/^\/[a-z]{2}(?=\/)/i, "");

const extractGroupIdFromPath = (pathname: string) => {
    const p = stripLocale(pathname || "");
    const m = p.match(/^\/group\/([^/]+)/i);
    return m?.[1] || "";
};

function formatDateLocal(date: Date) {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, "0");
    const d = `${date.getDate()}`.padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function formatDisplayDate(date: Date) {
    const d = `${date.getDate()}`.padStart(2, "0");
    const m = `${date.getMonth() + 1}`.padStart(2, "0");
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
}

function seededRandom(seed: string) {
    let hash = 2166136261;

    for (let i = 0; i < seed.length; i++) {
        hash ^= seed.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }

    return ((hash >>> 0) % 1000) / 1000;
}

function generateYearHeatmapByDate(year: number, seedPrefix: string) {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    const data: Record<string, number> = {};

    for (
        let current = new Date(start);
        current <= end;
        current.setDate(current.getDate() + 1)
    ) {
        const date = new Date(current);
        const day = date.getDay();
        const month = date.getMonth();
        const weekSeed = Math.floor(
            (date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7)
        );

        const activeMonths = [0, 1, 2, 6, 7, 8, 10, 11];
        const isActiveMonth = activeMonths.includes(month);
        const isWeekend = day === 0 || day === 6;
        const burst =
            weekSeed % 9 === 0 ||
            weekSeed % 13 === 0 ||
            (month === 10 && weekSeed % 3 === 0);

        let value = 0;
        const dateKey = formatDateLocal(date);
        const r = seededRandom(`${seedPrefix}-${year}-${dateKey}`);

        if (burst) {
            if (r > 0.78) value = 4;
            else if (r > 0.58) value = 3;
            else if (r > 0.34) value = 2;
            else if (r > 0.16) value = 1;
        } else if (isActiveMonth && !isWeekend) {
            if (r > 0.88) value = 4;
            else if (r > 0.74) value = 3;
            else if (r > 0.55) value = 2;
            else if (r > 0.34) value = 1;
        } else if (!isWeekend) {
            if (r > 0.94) value = 3;
            else if (r > 0.82) value = 2;
            else if (r > 0.62) value = 1;
        } else {
            if (r > 0.97) value = 2;
            else if (r > 0.88) value = 1;
        }

        data[dateKey] = value;
    }

    return data;
}

function generateDailyCompletionSource(year: number, memberSeed: string) {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    const result: Array<{ date: string; completed: number }> = [];

    for (
        let current = new Date(start);
        current <= end;
        current.setDate(current.getDate() + 1)
    ) {
        const date = new Date(current);
        const day = date.getDay();
        const month = date.getMonth();
        const isWeekend = day === 0 || day === 6;
        const dateKey = formatDateLocal(date);

        let completed = 0;
        const r = seededRandom(`${memberSeed}-${year}-${dateKey}`);

        if (!isWeekend) {
            if ([0, 1, 2, 6, 7, 8, 10, 11].includes(month)) {
                if (r > 0.86) completed = 5;
                else if (r > 0.7) completed = 4;
                else if (r > 0.52) completed = 3;
                else if (r > 0.3) completed = 2;
                else if (r > 0.15) completed = 1;
            } else {
                if (r > 0.9) completed = 4;
                else if (r > 0.75) completed = 3;
                else if (r > 0.56) completed = 2;
                else if (r > 0.35) completed = 1;
            }
        } else {
            if (r > 0.93) completed = 2;
            else if (r > 0.8) completed = 1;
        }

        result.push({
            date: dateKey,
            completed,
        });
    }

    return result;
}

function getWeekStart(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function getWeekRange(date: Date) {
    const start = getWeekStart(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(0, 0, 0, 0);
    return { start, end };
}

function getMonthRange(date: Date) {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return { start, end };
}

function getDatesInRange(start: Date, end: Date) {
    const dates: Date[] = [];
    const current = new Date(start);

    while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }

    return dates;
}

function formatRangeLabel(start: Date, end: Date) {
    const startDay = `${start.getDate()}`.padStart(2, "0");
    const startMonth = `${start.getMonth() + 1}`.padStart(2, "0");
    const endDay = `${end.getDate()}`.padStart(2, "0");
    const endMonth = `${end.getMonth() + 1}`.padStart(2, "0");
    const year = end.getFullYear();

    return `${startDay}/${startMonth} - ${endDay}/${endMonth}/${year}`;
}

function getTrendRangeLabel(date: Date, filter: TrendFilter) {
    if (filter === "week") {
        const { start, end } = getWeekRange(date);
        const startText = `${`${start.getDate()}`.padStart(2, "0")}/${`${start.getMonth() + 1}`.padStart(2, "0")}`;
        return `${startText} - ${formatDisplayDate(end)}`;
    }

    if (filter === "month") {
        const start = new Date(date.getFullYear(), date.getMonth(), 1);
        const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        const startText = `${`${start.getDate()}`.padStart(2, "0")}/${`${start.getMonth() + 1}`.padStart(2, "0")}`;
        return `${startText} - ${formatDisplayDate(end)}`;
    }

    const start = new Date(date.getFullYear(), 0, 1);
    const end = new Date(date.getFullYear(), 11, 31);
    const startText = `${`${start.getDate()}`.padStart(2, "0")}/${`${start.getMonth() + 1}`.padStart(2, "0")}`;
    return `${startText} - ${formatDisplayDate(end)}`;
}

function getTrendDataByFilter(
    source: Array<{ date: string; completed: number }>,
    filter: TrendFilter,
    year: number,
    key: string,
    anchorDate: Date
): DailyProgressPoint[] {
    const now = anchorDate;

    if (filter === "week") {
        const weekStart = getWeekStart(now);
        const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

        return Array.from({ length: 7 }).map((_, index) => {
            const current = new Date(weekStart);
            current.setDate(weekStart.getDate() + index);
            const found = source.find((item) => item.date === formatDateLocal(current));

            return {
                label: weekdays[index],
                [key]: found?.completed ?? 0,
            };
        });
    }

    if (filter === "month") {
        const month = now.getMonth();
        const monthItems = source.filter((item) => {
            const d = new Date(item.date);
            return d.getFullYear() === year && d.getMonth() === month;
        });

        const buckets: DailyProgressPoint[] = [
            { label: "Tuần 1", [key]: 0 },
            { label: "Tuần 2", [key]: 0 },
            { label: "Tuần 3", [key]: 0 },
            { label: "Tuần 4", [key]: 0 },
            { label: "Tuần 5", [key]: 0 },
        ];

        monthItems.forEach((item) => {
            const day = new Date(item.date).getDate();
            const bucketIndex = Math.min(Math.floor((day - 1) / 7), 4);
            buckets[bucketIndex][key] =
                Number(buckets[bucketIndex][key] || 0) + item.completed;
        });

        return buckets;
    }

    const monthNames = [
        "T1",
        "T2",
        "T3",
        "T4",
        "T5",
        "T6",
        "T7",
        "T8",
        "T9",
        "T10",
        "T11",
        "T12",
    ];

    return monthNames.map((label, monthIndex) => {
        const total = source
            .filter((item) => {
                const d = new Date(item.date);
                return d.getFullYear() === year && d.getMonth() === monthIndex;
            })
            .reduce((sum, item) => sum + item.completed, 0);

        return {
            label,
            [key]: total,
        };
    });
}

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function SectionReveal({
    children,
    delay = 0,
}: {
    children: React.ReactNode;
    delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
        >
            {children}
        </motion.div>
    );
}

function EChart({
    option,
    height = 320,
}: {
    option: echarts.EChartsOption;
    height?: number;
}) {
    const ref = React.useRef<HTMLDivElement | null>(null);
    const chartRef = React.useRef<echarts.ECharts | null>(null);
    const frameRef = React.useRef<number | null>(null);

    React.useEffect(() => {
        if (!ref.current) return;

        const chart = echarts.init(ref.current, undefined, { renderer: "canvas" });
        chartRef.current = chart;
        chart.setOption(option, true);

        const smoothResize = () => {
            if (!chartRef.current) return;
            if (frameRef.current) cancelAnimationFrame(frameRef.current);

            frameRef.current = requestAnimationFrame(() => {
                chartRef.current?.resize({
                    animation: { duration: 260, easing: "cubicOut" },
                });
            });
        };

        const resizeObserver = new ResizeObserver(() => smoothResize());
        resizeObserver.observe(ref.current);
        window.addEventListener("resize", smoothResize);

        return () => {
            window.removeEventListener("resize", smoothResize);
            resizeObserver.disconnect();
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
            chart.dispose();
            chartRef.current = null;
        };
    }, []);

    React.useEffect(() => {
        if (!chartRef.current) return;

        chartRef.current.setOption(option, { notMerge: true, lazyUpdate: true });

        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        frameRef.current = requestAnimationFrame(() => {
            chartRef.current?.resize({
                animation: { duration: 260, easing: "cubicOut" },
            });
        });
    }, [option]);

    return <div ref={ref} style={{ width: "100%", height }} />;
}

function GroupActivityHeatmap({
    members,
    range,
    anchorDate,
    onPrev,
    onNext,
    onChangeRange,
}: {
    members: TeamHeatmapMember[];
    range: HeatmapRangeFilter;
    anchorDate: Date;
    onPrev: () => void;
    onNext: () => void;
    onChangeRange: (value: HeatmapRangeFilter) => void;
}) {
    const { start, end } = React.useMemo(() => {
        return range === "week" ? getWeekRange(anchorDate) : getMonthRange(anchorDate);
    }, [anchorDate, range]);

    const dates = React.useMemo(() => getDatesInRange(start, end), [start, end]);

    const heatmapMotionKey = `${range}-${formatDateLocal(start)}-${formatDateLocal(end)}`;

    const colorMap: Record<number, string> = {
        0: "#ecfdf3",
        1: "#d1fadf",
        2: "#73e2a3",
        3: "#16a34a",
        4: "#166534",
    };

    return (
        <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 lg:p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                        5. Hoạt động nhóm
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Heatmap hoạt động mock 10 thành viên theo {range === "week" ? "tuần" : "tháng"}.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex rounded-2xl bg-slate-100 p-1">
                        {[
                            { key: "week", label: "Tuần" },
                            { key: "month", label: "Tháng" },
                        ].map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => onChangeRange(item.key as HeatmapRangeFilter)}
                                className={cn(
                                    "rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300",
                                    range === item.key
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-500 hover:text-slate-900 hover:bg-white/70"
                                )}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                        <button
                            type="button"
                            onClick={onPrev}
                            className="rounded-lg px-2 py-1 text-slate-500 transition-all duration-300 hover:bg-orange-50 hover:text-orange-600 active:scale-95"
                        >
                            ‹
                        </button>
                        <div className="min-w-[170px] text-center text-sm font-medium text-slate-700">
                            {formatRangeLabel(start, end)}
                        </div>
                        <button
                            type="button"
                            onClick={onNext}
                            className="rounded-lg px-2 py-1 text-slate-500 transition-all duration-300 hover:bg-orange-50 hover:text-orange-600 active:scale-95"
                        >
                            ›
                        </button>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={heatmapMotionKey}
                        initial={{ opacity: 0, y: 10, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.985 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className={cn(
                            "w-full",
                            range === "week" ? "min-w-[520px]" : "min-w-[760px]"
                        )}
                    >
                        <div
                            className="grid items-center gap-x-2 gap-y-3"
                            style={{
                                gridTemplateColumns: `88px repeat(${dates.length}, minmax(18px, 1fr))`,
                            }}
                        >
                            <div className="sticky left-0 z-20 bg-white/90 backdrop-blur-sm" />
                            {dates.map((date, index) => (
                                <motion.div
                                    key={formatDateLocal(date)}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                        duration: 0.2,
                                        delay: index * 0.012,
                                        ease: [0.22, 1, 0.36, 1],
                                    }}
                                    className="text-center text-[11px] text-slate-500"
                                >
                                    {date.getDate()}
                                </motion.div>
                            ))}

                            {members.map((member, memberIndex) => (
                                <React.Fragment key={member.id}>
                                    <motion.div
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{
                                            duration: 0.22,
                                            delay: memberIndex * 0.015,
                                            ease: [0.22, 1, 0.36, 1],
                                        }}
                                        className="sticky left-0 z-10 bg-white/90 pr-2 text-xs font-medium text-slate-700 backdrop-blur-sm"
                                    >
                                        <span className="line-clamp-1">{member.name}</span>
                                    </motion.div>

                                    {dates.map((date, dateIndex) => {
                                        const dateKey = formatDateLocal(date);
                                        const value = member.heatmapByDate[dateKey] ?? 0;

                                        return (
                                            <motion.div
                                                key={`${member.id}-${dateKey}`}
                                                title={`${member.name} • ${dateKey}: ${value}`}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{
                                                    duration: 0.18,
                                                    delay: memberIndex * 0.01 + dateIndex * 0.004,
                                                    ease: [0.22, 1, 0.36, 1],
                                                }}
                                                className="h-[18px] w-full rounded-[5px] transition-transform duration-150 hover:scale-105"
                                                style={{
                                                    backgroundColor: colorMap[value] ?? colorMap[0],
                                                }}
                                            />
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>Ít</span>
                    {[0, 1, 2, 3, 4].map((level) => (
                        <div
                            key={level}
                            className="h-3.5 w-3.5 rounded-[4px]"
                            style={{ backgroundColor: colorMap[level] }}
                        />
                    ))}
                    <span>Nhiều</span>
                </div>

                <div className="text-sm text-slate-400">
                    Cập nhật: {new Date().toLocaleDateString("vi-VN")}
                </div>
            </div>
        </div>
    );
}

function deriveMemberAnalytics(
    analytics: GroupAnalyticsResponse | null,
    memberId: string,
    memberName: string
): PersonalAnalyticsData {
    const contribution = analytics?.memberContribution ?? [];
    const currentMember =
        contribution.find((item) => item.userId === memberId) ?? contribution[0];

    const fallbackTotal = currentMember
        ? (currentMember.tasksCreated ?? 0) + (currentMember.tasksCompleted ?? 0)
        : 18;

    const doneTasks = currentMember?.tasksCompleted ?? 8;
    const totalTasks = Math.max(fallbackTotal, doneTasks, 1);
    const overdueTasks = Math.max(0, Math.round(totalTasks * 0.08));
    const inProgressTasks = Math.max(0, Math.round((totalTasks - doneTasks) * 0.5));
    const todoTasks = Math.max(
        0,
        totalTasks - doneTasks - inProgressTasks - overdueTasks
    );

    const compareMembers: MemberCompareSeries[] = contribution
        .slice(0, 24)
        .map((item, index) => {
            const total = Math.max(
                (item.tasksCreated ?? 0) + (item.tasksCompleted ?? 0),
                item.tasksCompleted ?? 0,
                1
            );
            const overdue = Math.max(
                0,
                Math.round(total * (0.04 + (index % 4) * 0.03))
            );
            const inProgress = Math.max(
                0,
                Math.round((total - (item.tasksCompleted ?? 0)) * 0.45)
            );
            const todo = Math.max(
                0,
                total - (item.tasksCompleted ?? 0) - inProgress - overdue
            );

            return {
                userId: item.userId ?? `member-${index}`,
                userName: item.userName ?? item.userId ?? `Member ${index + 1}`,
                totalTasks: total,
                doneTasks: item.tasksCompleted ?? 0,
                inProgressTasks: inProgress,
                todoTasks: todo,
                overdueTasks: overdue,
                contributionPercentage: item.contributionPercentage ?? 0,
                messagesSent: item.messagesSent ?? 0,
                colorSeed: index,
            };
        })
        .sort((a, b) => b.doneTasks - a.doneTasks);

    const meExists = compareMembers.some((member) => member.userId === memberId);
    const members = meExists
        ? compareMembers
        : [
            {
                userId: memberId,
                userName: memberName || "Tôi",
                totalTasks,
                doneTasks,
                inProgressTasks,
                todoTasks,
                overdueTasks,
                contributionPercentage: 0,
                messagesSent: 0,
                colorSeed: 0,
            },
            ...compareMembers,
        ];

    return {
        totalTasks,
        todoTasks,
        inProgressTasks,
        doneTasks,
        overdueTasks,
        completionTrend: [],
        compareMembers: members,
        heatmapByDate: generateYearHeatmapByDate(
            selectedYear,
            currentMember?.userId || memberId || "me-heatmap"
        ),
    };
}

function getProgressPercent(completed: number, total: number) {
    if (!total || total <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
}

function getMemberStatus(percent: number): {
    key: MemberProgressStatus;
    label: string;
    textClass: string;
    dotClass: string;
    barClass: string;
} {
    if (percent >= 70) {
        return {
            key: "on-track",
            label: "Đúng tiến độ",
            textClass: "text-emerald-600",
            dotClass: "bg-emerald-500",
            barClass: "bg-emerald-500",
        };
    }

    if (percent >= 30) {
        return {
            key: "warning",
            label: "Cần chú ý",
            textClass: "text-orange-500",
            dotClass: "bg-orange-500",
            barClass: "bg-orange-500",
        };
    }

    return {
        key: "delayed",
        label: "Chậm tiến độ",
        textClass: "text-red-500",
        dotClass: "bg-red-500",
        barClass: "bg-red-500",
    };
}

function ProgressLegend() {
    const items = [
        { label: "Đúng tiến độ", dotClass: "bg-emerald-500" },
        { label: "Cần chú ý", dotClass: "bg-orange-500" },
        { label: "Chậm tiến độ", dotClass: "bg-red-500" },
    ];

    return (
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 sm:text-sm">
            {items.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 rounded-full", item.dotClass)} />
                    <span>{item.label}</span>
                </div>
            ))}
        </div>
    );
}

function MemberProgressCard({ member }: { member: MemberProgressItem }) {
    const percent = getProgressPercent(member.completedTasks, member.totalTasks);
    const status = getMemberStatus(percent);

    return (
        <div className="rounded-[14px] border border-slate-200 bg-slate-50/80 p-3.5">
            <div className="mb-2.5 flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                    <Layers3 className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    <h3 className="truncate text-[14px] font-semibold text-slate-900">
                        {member.name}
                    </h3>
                </div>

                <div className={cn("shrink-0 text-[12px] font-medium", status.textClass)}>
                    {status.label}
                </div>
            </div>

            <div className="mb-2.5 flex items-center gap-2.5">
                <div className="h-2.5 flex-1 overflow-hidden rounded-md bg-slate-200">
                    <div
                        className={cn(
                            "h-full rounded-md transition-all duration-500",
                            status.barClass
                        )}
                        style={{ width: `${percent}%` }}
                    />
                </div>

                <div className="w-[38px] text-right text-[13px] font-bold text-slate-900">
                    {percent}%
                </div>
            </div>

            <div className="space-y-1.5 text-[12px] text-slate-500">
                <div className="flex items-center gap-1.5">
                    <Layers3 className="h-3.5 w-3.5" />
                    <span>
                        {member.completedTasks} / {member.totalTasks} tasks
                    </span>
                </div>

                <div className="flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" />
                    <span>last activity: {member.lastActivity}</span>
                </div>
            </div>
        </div>
    );
}

function TeamMemberProgressLayer({
    members,
    open,
    onClose,
}: {
    members: MemberProgressItem[];
    open: boolean;
    onClose: () => void;
}) {
    React.useEffect(() => {
        if (!open) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };

        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKeyDown);

        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.98 }}
                        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                        onClick={(event) => event.stopPropagation()}
                        className="relative max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_24px_90px_rgba(15,23,42,0.24)]"
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute right-5 top-5 z-20 rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition-all duration-300 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 active:scale-95"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="max-h-[88vh] overflow-y-auto px-5 pb-5 pt-16 lg:px-6 lg:pb-6 lg:pt-16">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {members.map((member) => (
                                    <MemberProgressCard key={member.id} member={member} />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function TeamMemberProgressSection({
    members,
}: {
    members: Array<{
        userId: string;
        userName: string;
        totalTasks: number;
        doneTasks: number;
        messagesSent: number;
    }>;
}) {
    const [openLayer, setOpenLayer] = React.useState(false);

    const mappedMembers: MemberProgressItem[] = React.useMemo(
        () =>
            members.map((item, index) => ({
                id: item.userId,
                name: item.userName,
                completedTasks: item.doneTasks,
                totalTasks: item.totalTasks,
                lastActivity:
                    index % 4 === 0
                        ? "20m ago"
                        : index % 4 === 1
                            ? "2h ago"
                            : index % 4 === 2
                                ? "1d ago"
                                : "3d ago",
            })),
        [members]
    );

    const previewMembers = mappedMembers.slice(0, 2);

    return (
        <>
            <section className="rounded-[24px] border border-white/70 bg-white/85 p-4 lg:p-5 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                            6. Tiến độ thành viên
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Xem chi tiết.
                        </p>
                    </div>
                    <ProgressLegend />
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {previewMembers.map((member) => (
                        <MemberProgressCard key={member.id} member={member} />
                    ))}
                </div>

                <div className="mt-4 flex justify-end">
                    <button
                        type="button"
                        onClick={() => setOpenLayer(true)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-300 hover:bg-orange-600 hover:shadow-md active:scale-[0.98]"
                    >
                        <Users className="h-4 w-4" />
                        Xem chi tiết
                    </button>
                </div>
            </section>

            <TeamMemberProgressLayer
                members={mappedMembers.slice(0, 10)}
                open={openLayer}
                onClose={() => setOpenLayer(false)}
            />
        </>
    );
}

export default function GroupMemberAnalyticsPage() {
    const pathname = usePathname();
    const groupId = extractGroupIdFromPath(pathname || "");

    const [loading, setLoading] = React.useState(false);
    const [analytics, setAnalytics] = React.useState<GroupAnalyticsResponse | null>(null);
    const [trendFilter, setTrendFilter] = React.useState<TrendFilter>("week");
    const [trendAnchorDate, setTrendAnchorDate] = React.useState(
        new Date(2026, 3, 20)
    );
    const [currentMemberId] = React.useState("me");
    const [currentMemberName] = React.useState("Tôi");
    const [heatmapRange, setHeatmapRange] =
        React.useState<HeatmapRangeFilter>("month");
    const [heatmapAnchorDate, setHeatmapAnchorDate] = React.useState(
        new Date(2026, 2, 24)
    );

    const handlePrevTrendRange = React.useCallback(() => {
        setTrendAnchorDate((prev) => {
            const next = new Date(prev);

            if (trendFilter === "week") {
                next.setDate(next.getDate() - 7);
            } else if (trendFilter === "month") {
                next.setMonth(next.getMonth() - 1);
            } else {
                next.setFullYear(next.getFullYear() - 1);
            }

            return next;
        });
    }, [trendFilter]);

    const handleNextTrendRange = React.useCallback(() => {
        setTrendAnchorDate((prev) => {
            const next = new Date(prev);

            if (trendFilter === "week") {
                next.setDate(next.getDate() + 7);
            } else if (trendFilter === "month") {
                next.setMonth(next.getMonth() + 1);
            } else {
                next.setFullYear(next.getFullYear() + 1);
            }

            return next;
        });
    }, [trendFilter]);

    const trendRangeLabel = React.useMemo(() => {
        return getTrendRangeLabel(trendAnchorDate, trendFilter);
    }, [trendAnchorDate, trendFilter]);

    React.useEffect(() => {
        if (!groupId) return;

        setLoading(true);
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 90);

        getGroupAnalytics(groupId, {
            startDate: start.toISOString().slice(0, 10),
            endDate: end.toISOString().slice(0, 10),
        })
            .then((res) => {
                if (res.status === "success" && res.data) {
                    setAnalytics(res.data);
                }
            })
            .catch(() => {
                setAnalytics(null);
            })
            .finally(() => setLoading(false));
    }, [groupId]);

    const data = React.useMemo(
        () => deriveMemberAnalytics(analytics, currentMemberId, currentMemberName),
        [analytics, currentMemberId, currentMemberName]
    );

    const uniqueMembers = React.useMemo(
        () =>
            Array.from(
                new Map(data.compareMembers.map((member) => [member.userId, member])).values()
            ),
        [data.compareMembers]
    );

    const myTrendData = React.useMemo(() => {
        const source = generateDailyCompletionSource(selectedYear, currentMemberId);
        return getTrendDataByFilter(
            source,
            trendFilter,
            selectedYear,
            "me",
            trendAnchorDate
        );
    }, [currentMemberId, trendFilter, trendAnchorDate]);

    const groupTrendData = React.useMemo(() => {
        if (uniqueMembers.length === 0) {
            return [] as DailyProgressPoint[];
        }

        const merged = new Map<string, DailyProgressPoint>();

        uniqueMembers.forEach((member) => {
            const source = generateDailyCompletionSource(selectedYear, member.userId);
            const trend = getTrendDataByFilter(
                source,
                trendFilter,
                selectedYear,
                member.userId,
                trendAnchorDate
            );

            trend.forEach((point) => {
                const current = merged.get(point.label) ?? { label: point.label };
                current[member.userId] = point[member.userId];
                merged.set(point.label, current);
            });
        });

        return Array.from(merged.values()).map((point) => {
            const totalCompleted = uniqueMembers.reduce(
                (sum, member) => sum + Number(point[member.userId] || 0),
                0
            );

            return {
                label: point.label,
                group: totalCompleted,
            };
        });
    }, [trendFilter, uniqueMembers, trendAnchorDate]);

    const mockTeamHeatmapMembers = React.useMemo<TeamHeatmapMember[]>(
        () =>
            MOCK_MEMBER_NAMES.map((name, index) => ({
                id: `mock-member-${index + 1}`,
                name,
                heatmapByDate: generateYearHeatmapByDate(
                    selectedYear,
                    `team-member-${index + 1}-${name}`
                ),
            })),
        []
    );

    const handlePrevHeatmapRange = React.useCallback(() => {
        setHeatmapAnchorDate((prev) => {
            const next = new Date(prev);
            if (heatmapRange === "week") {
                next.setDate(next.getDate() - 7);
            } else {
                next.setMonth(next.getMonth() - 1);
            }
            return next;
        });
    }, [heatmapRange]);

    const handleNextHeatmapRange = React.useCallback(() => {
        setHeatmapAnchorDate((prev) => {
            const next = new Date(prev);
            if (heatmapRange === "week") {
                next.setDate(next.getDate() + 7);
            } else {
                next.setMonth(next.getMonth() + 1);
            }
            return next;
        });
    }, [heatmapRange]);

    const barCompareMembers = React.useMemo<MemberCompareSeries[]>(
        () => [
            {
                userId: "me",
                userName: "Tôi",
                totalTasks: 42,
                doneTasks: 20,
                inProgressTasks: 10,
                todoTasks: 8,
                overdueTasks: 4,
                contributionPercentage: 14.2,
                messagesSent: 120,
                colorSeed: 0,
            },
            {
                userId: "member-1",
                userName: "Nguyễn An",
                totalTasks: 50,
                doneTasks: 26,
                inProgressTasks: 11,
                todoTasks: 9,
                overdueTasks: 4,
                contributionPercentage: 16.5,
                messagesSent: 140,
                colorSeed: 1,
            },
            {
                userId: "member-2",
                userName: "Trần Bình",
                totalTasks: 46,
                doneTasks: 23,
                inProgressTasks: 10,
                todoTasks: 9,
                overdueTasks: 4,
                contributionPercentage: 15.1,
                messagesSent: 110,
                colorSeed: 2,
            },
            {
                userId: "member-3",
                userName: "Lê Chi",
                totalTasks: 40,
                doneTasks: 18,
                inProgressTasks: 9,
                todoTasks: 9,
                overdueTasks: 4,
                contributionPercentage: 13.3,
                messagesSent: 98,
                colorSeed: 3,
            },
            {
                userId: "member-4",
                userName: "Phạm Duy",
                totalTasks: 38,
                doneTasks: 17,
                inProgressTasks: 8,
                todoTasks: 9,
                overdueTasks: 4,
                contributionPercentage: 12.4,
                messagesSent: 95,
                colorSeed: 4,
            },
            {
                userId: "member-5",
                userName: "Hoàng Giang",
                totalTasks: 35,
                doneTasks: 16,
                inProgressTasks: 8,
                todoTasks: 7,
                overdueTasks: 4,
                contributionPercentage: 11.8,
                messagesSent: 87,
                colorSeed: 5,
            },
            {
                userId: "member-6",
                userName: "Vũ Hạnh",
                totalTasks: 33,
                doneTasks: 15,
                inProgressTasks: 7,
                todoTasks: 7,
                overdueTasks: 4,
                contributionPercentage: 10.9,
                messagesSent: 80,
                colorSeed: 6,
            },
            {
                userId: "member-7",
                userName: "Đỗ Khôi",
                totalTasks: 31,
                doneTasks: 14,
                inProgressTasks: 7,
                todoTasks: 6,
                overdueTasks: 4,
                contributionPercentage: 10.1,
                messagesSent: 76,
                colorSeed: 7,
            },
            {
                userId: "member-8",
                userName: "Bùi Lan",
                totalTasks: 29,
                doneTasks: 13,
                inProgressTasks: 6,
                todoTasks: 6,
                overdueTasks: 4,
                contributionPercentage: 9.4,
                messagesSent: 70,
                colorSeed: 8,
            },
            {
                userId: "member-9",
                userName: "Mai Nam",
                totalTasks: 27,
                doneTasks: 12,
                inProgressTasks: 6,
                todoTasks: 5,
                overdueTasks: 4,
                contributionPercentage: 8.7,
                messagesSent: 65,
                colorSeed: 9,
            },
        ],
        []
    );

    const pieData = React.useMemo(
        () => [
            { name: "To do", value: data.todoTasks },
            { name: "In progress", value: data.inProgressTasks },
            { name: "Done", value: data.doneTasks },
            { name: "Overdue", value: data.overdueTasks },
        ],
        [data]
    );

    const totalPie = React.useMemo(
        () => pieData.reduce((sum, item) => sum + item.value, 0),
        [pieData]
    );

    const teamPieData = React.useMemo(() => {
        return [
            {
                name: "To do",
                value: uniqueMembers.reduce((sum, member) => sum + member.todoTasks, 0),
            },
            {
                name: "In progress",
                value: uniqueMembers.reduce(
                    (sum, member) => sum + member.inProgressTasks,
                    0
                ),
            },
            {
                name: "Done",
                value: uniqueMembers.reduce((sum, member) => sum + member.doneTasks, 0),
            },
            {
                name: "Overdue",
                value: uniqueMembers.reduce(
                    (sum, member) => sum + member.overdueTasks,
                    0
                ),
            },
        ];
    }, [uniqueMembers]);

    const teamTotalPie = React.useMemo(
        () => teamPieData.reduce((sum, item) => sum + item.value, 0),
        [teamPieData]
    );

    const statusDonutOption = React.useMemo<echarts.EChartsOption>(
        () => ({
            animationDuration: 700,
            animationDurationUpdate: 400,
            animationEasing: "cubicOut",
            animationEasingUpdate: "cubicOut",
            color: ["#3b82f6", "#f59e0b", "#10b981", "#ef4444"],
            tooltip: {
                trigger: "item",
                backgroundColor: "#0f172a",
                borderWidth: 0,
                textStyle: { color: "#fff" },
                formatter: (params: any) =>
                    `${params.name}<br/>${params.value} tasks (${params.percent}%)`,
            },
            legend: { show: false },
            graphic: [
                {
                    type: "text",
                    left: "center",
                    top: "42%",
                    style: {
                        text: `${totalPie}`,
                        textAlign: "center",
                        fill: "#0f172a",
                        fontSize: 28,
                        fontWeight: 700,
                    },
                },
                {
                    type: "text",
                    left: "center",
                    top: "56%",
                    style: {
                        text: "My tasks",
                        textAlign: "center",
                        fill: "#64748b",
                        fontSize: 13,
                        fontWeight: 500,
                    },
                },
            ],
            series: [
                {
                    name: "Task status",
                    type: "pie",
                    radius: ["58%", "76%"],
                    center: ["50%", "48%"],
                    startAngle: 90,
                    minAngle: 6,
                    avoidLabelOverlap: true,
                    itemStyle: {
                        borderColor: "#ffffff",
                        borderWidth: 6,
                        shadowBlur: 12,
                        shadowColor: "rgba(15,23,42,0.08)",
                    },
                    label: { show: false },
                    labelLine: { show: false },
                    emphasis: {
                        scale: true,
                        scaleSize: 6,
                        itemStyle: {
                            shadowBlur: 18,
                            shadowColor: "rgba(249,115,22,0.18)",
                        },
                    },
                    data: pieData,
                },
            ],
        }),
        [pieData, totalPie]
    );

    const teamStatusDonutOption = React.useMemo<echarts.EChartsOption>(
        () => ({
            animationDuration: 700,
            animationDurationUpdate: 400,
            animationEasing: "cubicOut",
            animationEasingUpdate: "cubicOut",
            color: ["#3b82f6", "#f59e0b", "#10b981", "#ef4444"],
            tooltip: {
                trigger: "item",
                backgroundColor: "#0f172a",
                borderWidth: 0,
                textStyle: { color: "#fff" },
                formatter: (params: any) =>
                    `${params.name}<br/>${params.value} tasks (${params.percent}%)`,
            },
            legend: { show: false },
            graphic: [
                {
                    type: "text",
                    left: "center",
                    top: "42%",
                    style: {
                        text: `${teamTotalPie}`,
                        textAlign: "center",
                        fill: "#0f172a",
                        fontSize: 28,
                        fontWeight: 700,
                    },
                },
                {
                    type: "text",
                    left: "center",
                    top: "56%",
                    style: {
                        text: "Group tasks",
                        textAlign: "center",
                        fill: "#64748b",
                        fontSize: 13,
                        fontWeight: 500,
                    },
                },
            ],
            series: [
                {
                    name: "Group task status",
                    type: "pie",
                    radius: ["58%", "76%"],
                    center: ["50%", "48%"],
                    startAngle: 90,
                    minAngle: 6,
                    avoidLabelOverlap: true,
                    itemStyle: {
                        borderColor: "#ffffff",
                        borderWidth: 6,
                        shadowBlur: 12,
                        shadowColor: "rgba(15,23,42,0.08)",
                    },
                    label: { show: false },
                    labelLine: { show: false },
                    emphasis: {
                        scale: true,
                        scaleSize: 6,
                        itemStyle: {
                            shadowBlur: 18,
                            shadowColor: "rgba(249,115,22,0.18)",
                        },
                    },
                    data: teamPieData,
                },
            ],
        }),
        [teamPieData, teamTotalPie]
    );

    const compareLineOption = React.useMemo<echarts.EChartsOption>(() => {
        const labels = myTrendData.map((item) => item.label);

        return {
            animationDuration: 700,
            animationDurationUpdate: 400,
            animationEasing: "cubicOut",
            animationEasingUpdate: "cubicOut",
            tooltip: {
                trigger: "axis",
                backgroundColor: "#0f172a",
                borderWidth: 0,
                textStyle: { color: "#fff" },
            },
            legend: {
                bottom: 0,
                textStyle: { color: "#64748B" },
            },
            grid: {
                left: 30,
                right: 20,
                top: 30,
                bottom: 48,
                containLabel: true,
            },
            xAxis: {
                type: "category",
                boundaryGap: false,
                data: labels,
                axisTick: { show: false },
                axisLine: { lineStyle: { color: "#CBD5E1" } },
                axisLabel: { color: "#64748B" },
            },
            yAxis: {
                type: "value",
                minInterval: 1,
                axisLabel: { color: "#64748B" },
                splitLine: { lineStyle: { color: "#E2E8F0" } },
            },
            series: [
                {
                    name: "Tôi",
                    type: "line",
                    smooth: true,
                    symbol: "circle",
                    symbolSize: 9,
                    data: myTrendData.map((item) => Number(item.me || 0)),
                    lineStyle: {
                        width: 4,
                        color: "#2563eb",
                        opacity: 1,
                    },
                    itemStyle: {
                        color: "#2563eb",
                        borderColor: "#fff",
                        borderWidth: 2,
                    },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: "rgba(37,99,235,0.20)" },
                            { offset: 1, color: "rgba(37,99,235,0.03)" },
                        ]),
                    },
                },
                {
                    name: "Nhóm",
                    type: "line",
                    smooth: true,
                    symbol: "circle",
                    symbolSize: 7,
                    data: groupTrendData.map((item) => Number(item.group || 0)),
                    lineStyle: {
                        width: 2.8,
                        color: "#f97316",
                        opacity: 0.95,
                    },
                    itemStyle: {
                        color: "#f97316",
                        borderColor: "#fff",
                        borderWidth: 2,
                    },
                },
            ],
        };
    }, [groupTrendData, myTrendData]);

    const compareBarOption = React.useMemo<echarts.EChartsOption>(() => {
        const categories = ["To do", "In progress", "Done", "Overdue"];

        const series: echarts.BarSeriesOption[] = barCompareMembers.map(
            (member, index) => ({
                name: member.userName,
                type: "bar",
                barMaxWidth: 18,
                barGap: "8%",
                data: [
                    member.todoTasks,
                    member.inProgressTasks,
                    member.doneTasks,
                    member.overdueTasks,
                ],
                itemStyle: {
                    borderRadius: [8, 8, 0, 0],
                    color: MEMBER_COLORS[index % MEMBER_COLORS.length],
                },
                emphasis: {
                    focus: "series",
                },
            })
        );

        return {
            animationDuration: 800,
            animationDurationUpdate: 450,
            animationEasing: "cubicOut",
            animationEasingUpdate: "cubicOut",
            tooltip: {
                trigger: "axis",
                axisPointer: { type: "shadow" },
                backgroundColor: "#0f172a",
                borderWidth: 0,
                padding: [10, 12],
                textStyle: { color: "#fff" },
            },
            legend: {
                bottom: 0,
                type: "scroll",
                textStyle: { color: "#64748B" },
                pageTextStyle: { color: "#64748B" },
            },
            grid: {
                left: 8,
                right: 8,
                top: 24,
                bottom: 64,
                containLabel: true,
            },
            xAxis: {
                type: "category",
                data: categories,
                axisTick: { show: false },
                axisLine: { lineStyle: { color: "#CBD5E1" } },
                axisLabel: {
                    color: "#475569",
                    interval: 0,
                    fontSize: 12,
                    margin: 14,
                },
            },
            yAxis: {
                type: "value",
                minInterval: 1,
                axisLabel: { color: "#64748B" },
                splitLine: { lineStyle: { color: "#E2E8F0", type: "dashed" } },
            },
            series,
        };
    }, [barCompareMembers]);

    return (
        <div className="relative overflow-hidden bg-[linear-gradient(180deg,#F8FAFC_0%,#FFF7ED_34%,#FFFBF5_66%,#F8FAFC_100%)]">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-[-80px] top-[-40px] h-72 w-72 rounded-full bg-orange-200/25 blur-3xl" />
                <div className="absolute right-[-80px] top-[18%] h-80 w-80 rounded-full bg-amber-200/20 blur-3xl" />
                <div className="absolute bottom-[-120px] left-[15%] h-96 w-96 rounded-full bg-orange-100/20 blur-3xl" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:28px_28px] opacity-40" />
            </div>

            <Container className="relative pb-6 pt-8">
                <div className="space-y-5">
                    <SectionReveal delay={0.04}>
                        <section className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
                            <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 lg:p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                                <div className="mb-5">
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        1. My Task Status Distribution
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Trạng thái task cá nhân trong group hiện tại.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                                    <div className="mx-auto w-full max-w-[260px]">
                                        <EChart option={statusDonutOption} height={250} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {pieData.map((item, index) => {
                                            const colors = [
                                                "#3b82f6",
                                                "#f59e0b",
                                                "#10b981",
                                                "#ef4444",
                                            ];

                                            return (
                                                <div
                                                    key={item.name}
                                                    className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="h-2.5 w-2.5 rounded-full"
                                                            style={{
                                                                backgroundColor: colors[index],
                                                            }}
                                                        />
                                                        <span className="text-xs font-medium text-slate-500">
                                                            {item.name}
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 text-lg font-bold text-slate-900">
                                                        {item.value}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 lg:p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                                <div className="mb-5">
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        2. Group Task Status Distribution
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Tổng quan trạng thái task của toàn bộ nhóm.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                                    <div className="mx-auto w-full max-w-[260px]">
                                        <EChart option={teamStatusDonutOption} height={250} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {teamPieData.map((item, index) => {
                                            const colors = [
                                                "#3b82f6",
                                                "#f59e0b",
                                                "#10b981",
                                                "#ef4444",
                                            ];

                                            return (
                                                <div
                                                    key={item.name}
                                                    className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="h-2.5 w-2.5 rounded-full"
                                                            style={{
                                                                backgroundColor: colors[index],
                                                            }}
                                                        />
                                                        <span className="text-xs font-medium text-slate-500">
                                                            {item.name}
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 text-lg font-bold text-slate-900">
                                                        {item.value}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </section>
                    </SectionReveal>

                    <SectionReveal delay={0.08}>
                        <section className="rounded-[30px] border border-white/70 bg-white/85 p-5 lg:p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        3. Task Progress Over Time
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        So sánh tổng số task hoàn thành của bạn với toàn bộ nhóm theo thời gian.
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="inline-flex rounded-2xl bg-slate-100 p-1">
                                        {[
                                            { key: "week", label: "Tuần" },
                                            { key: "month", label: "Tháng" },
                                            { key: "year", label: "Năm" },
                                        ].map((item) => (
                                            <button
                                                key={item.key}
                                                type="button"
                                                onClick={() => {
                                                    const nextFilter = item.key as TrendFilter;
                                                    setTrendFilter(nextFilter);

                                                    if (nextFilter === "week") {
                                                        setTrendAnchorDate(new Date(2026, 3, 20));
                                                    } else if (nextFilter === "month") {
                                                        setTrendAnchorDate(new Date(2026, 3, 1));
                                                    } else {
                                                        setTrendAnchorDate(new Date(2026, 0, 1));
                                                    }
                                                }}
                                                className={cn(
                                                    "rounded-xl px-4 py-2 text-sm font-medium transition",
                                                    trendFilter === item.key
                                                        ? "bg-white text-slate-900 shadow-sm"
                                                        : "text-slate-500 hover:text-slate-900"
                                                )}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                        <button
                                            type="button"
                                            onClick={handlePrevTrendRange}
                                            className="rounded-full px-2 py-1 text-slate-500 transition-all duration-300 hover:bg-slate-100 hover:text-slate-900 active:scale-95"
                                        >
                                            ‹
                                        </button>

                                        <div className="min-w-[190px] text-center text-sm font-semibold text-slate-700">
                                            {trendRangeLabel}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleNextTrendRange}
                                            className="rounded-full px-2 py-1 text-slate-500 transition-all duration-300 hover:bg-slate-100 hover:text-slate-900 active:scale-95"
                                        >
                                            ›
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <EChart option={compareLineOption} height={360} />
                        </section>
                    </SectionReveal>

                    <SectionReveal delay={0.12}>
                        <section className="space-y-4">
                            <div className="rounded-[30px] border border-white/70 bg-white/85 p-5 lg:p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                                <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold text-slate-900">
                                            4. Compare Task Status by Member
                                        </h2>
                                    </div>
                                </div>

                                <EChart option={compareBarOption} height={430} />
                            </div>

                            <GroupActivityHeatmap
                                members={mockTeamHeatmapMembers}
                                range={heatmapRange}
                                anchorDate={heatmapAnchorDate}
                                onPrev={handlePrevHeatmapRange}
                                onNext={handleNextHeatmapRange}
                                onChangeRange={setHeatmapRange}
                            />
                        </section>
                    </SectionReveal>

                    <SectionReveal delay={0.16}>
                        <TeamMemberProgressSection members={barCompareMembers} />
                    </SectionReveal>

                    {loading && (
                        <div className="text-sm text-slate-500">Đang tải dữ liệu...</div>
                    )}
                </div>
            </Container>
        </div>
    );
}