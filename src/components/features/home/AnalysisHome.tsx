"use client";

import * as React from "react";
import * as echarts from "echarts";
import { motion } from "framer-motion";
import { useLocale, useMessages, useTranslations } from "next-intl";
import {
    CheckCircle2,
    Clock3,
    Flame,
    Sparkles,
    Target
} from "lucide-react";
import { Container } from "@/components/common";
import HomeTopTabs from "./HomeTopTabs";

type DailyProgressPoint = {
    label: string;
    completed: number;
};

type WorkloadGroup = {
    groupId: string;
    groupName: string;
    taskCount: number;
};

type TrendFilter = "week" | "month" | "year";

type PersonalAnalyticsData = {
    totalTasks: number;
    todoTasks: number;
    inProgressTasks: number;
    doneTasks: number;
    overdueTasks: number;
    productivityScore: number;
    completionTrend: DailyProgressPoint[];
    workloadByGroup: WorkloadGroup[];
    heatmapByDate: Record<string, number>;
};

const selectedYear = 2026;

function formatDateLocal(date: Date) {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, "0");
    const d = `${date.getDate()}`.padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/**
 * Pseudo-random ổn định theo seed.
 * Cùng một seed => luôn ra cùng một kết quả trên server và client.
 */
function seededRandom(seed: string) {
    let hash = 2166136261;

    for (let i = 0; i < seed.length; i++) {
        hash ^= seed.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }

    return ((hash >>> 0) % 1000) / 1000;
}

function generateYearHeatmapByDate(year: number) {
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
        const r = seededRandom(`heatmap-${year}-${dateKey}`);

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

function generateDailyCompletionSource(year: number) {
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
        const r = seededRandom(`daily-${year}-${dateKey}`);

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
            completed
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

function getTrendDataByFilter(
    source: Array<{ date: string; completed: number }>,
    filter: TrendFilter,
    year: number,
    labels: {
        weekdays: string[];
        weeks: string[];
        months: string[];
    }
): DailyProgressPoint[] {
    const now = new Date(year, 10, 18);

    if (filter === "week") {
        const weekStart = getWeekStart(now);

        return Array.from({ length: 7 }).map((_, index) => {
            const current = new Date(weekStart);
            current.setDate(weekStart.getDate() + index);
            const key = formatDateLocal(current);
            const found = source.find((item) => item.date === key);

            return {
                label: labels.weekdays[index] ?? "",
                completed: found?.completed ?? 0
            };
        });
    }

    if (filter === "month") {
        const month = now.getMonth();
        const monthItems = source.filter((item) => {
            const d = new Date(item.date);
            return d.getFullYear() === year && d.getMonth() === month;
        });

        const buckets = labels.weeks.map((label) => ({ label, completed: 0 }));

        monthItems.forEach((item) => {
            const day = new Date(item.date).getDate();
            const bucketIndex = Math.min(Math.floor((day - 1) / 7), 4);
            buckets[bucketIndex].completed += item.completed;
        });

        return buckets;
    }

    return labels.months.map((label, monthIndex) => {
        const total = source
            .filter((item) => {
                const d = new Date(item.date);
                return d.getFullYear() === year && d.getMonth() === monthIndex;
            })
            .reduce((sum, item) => sum + item.completed, 0);

        return {
            label,
            completed: total
        };
    });
}

const dailyCompletionSource = generateDailyCompletionSource(selectedYear);

const mockData: PersonalAnalyticsData = {
    totalTasks: 42,
    todoTasks: 14,
    inProgressTasks: 12,
    doneTasks: 10,
    overdueTasks: 6,
    productivityScore: 76,
    completionTrend: [
        { label: "T2", completed: 1 },
        { label: "T3", completed: 3 },
        { label: "T4", completed: 2 },
        { label: "T5", completed: 4 },
        { label: "T6", completed: 5 },
        { label: "T7", completed: 3 },
        { label: "CN", completed: 2 }
    ],
    workloadByGroup: [
        { groupId: "g1", groupName: "Marketing", taskCount: 12 },
        { groupId: "g2", groupName: "Thiết kế UI/UX", taskCount: 9 },
        { groupId: "g3", groupName: "Kỹ thuật", taskCount: 11 },
        { groupId: "g4", groupName: "Vận hành", taskCount: 4 },
        { groupId: "g5", groupName: "Nội dung", taskCount: 6 },
        { groupId: "g6", groupName: "Kinh doanh", taskCount: 8 },
        { groupId: "g7", groupName: "CSKH", taskCount: 5 },
        { groupId: "g8", groupName: "Tài chính", taskCount: 7 },
        { groupId: "g9", groupName: "Nhân sự", taskCount: 3 },
        { groupId: "g10", groupName: "QA", taskCount: 10 },
        { groupId: "g11", groupName: "Pháp lý", taskCount: 2 }
    ],
    heatmapByDate: generateYearHeatmapByDate(selectedYear)
};

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function SectionReveal({
    children,
    delay = 0
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
    height = 320
}: {
    option: echarts.EChartsOption;
    height?: number;
}) {
    const ref = React.useRef<HTMLDivElement | null>(null);
    const chartRef = React.useRef<echarts.ECharts | null>(null);
    const frameRef = React.useRef<number | null>(null);

    React.useEffect(() => {
        if (!ref.current) return;

        const el = ref.current;
        const chart = echarts.init(el, undefined, {
            renderer: "canvas"
        });

        chartRef.current = chart;
        chart.setOption(option, true);

        const smoothResize = () => {
            if (!chartRef.current) return;

            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }

            frameRef.current = requestAnimationFrame(() => {
                chartRef.current?.resize({
                    animation: {
                        duration: 260,
                        easing: "cubicOut"
                    }
                });
            });
        };

        const resizeObserver = new ResizeObserver(() => {
            smoothResize();
        });

        resizeObserver.observe(el);
        window.addEventListener("resize", smoothResize);

        return () => {
            window.removeEventListener("resize", smoothResize);
            resizeObserver.disconnect();

            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }

            chart.dispose();
            chartRef.current = null;
        };
    }, []);

    React.useEffect(() => {
        if (!chartRef.current) return;

        chartRef.current.setOption(option, {
            notMerge: true,
            lazyUpdate: true
        });

        if (frameRef.current) {
            cancelAnimationFrame(frameRef.current);
        }

        frameRef.current = requestAnimationFrame(() => {
            chartRef.current?.resize({
                animation: {
                    duration: 260,
                    easing: "cubicOut"
                }
            });
        });
    }, [option]);

    return (
        <div
            ref={ref}
            style={{
                width: "100%",
                height,
                transition: "height 0.28s ease"
            }}
        />
    );
}

function SummaryCard({
    title,
    value,
    note,
    icon,
    tone = "default"
}: {
    title: string;
    value: string | number;
    note: string;
    icon: React.ReactNode;
    tone?: "default" | "danger" | "success" | "accent" | "warning";
}) {
    const styles = {
        default:
            "border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.95))]",
        danger:
            "border-red-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(254,242,242,0.96))]",
        success:
            "border-emerald-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(236,253,245,0.96))]",
        accent:
            "border-orange-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,247,237,0.96))]",
        warning:
            "border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,251,235,0.96))]"
    };

    return (
        <motion.div
            whileHover={{ y: -4 }}
            className={cn(
                "rounded-[28px] border p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)] transition",
                styles[tone]
            )}
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                        {value}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">{note}</p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-slate-700 shadow-sm">
                    {icon}
                </div>
            </div>
        </motion.div>
    );
}

function buildGithubCalendarHeatmap(
    year: number,
    heatmapByDate: Record<string, number>,
    monthNames: string[]
) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const alignedStart = new Date(startDate);
    const startDay = (startDate.getDay() + 6) % 7;
    alignedStart.setDate(startDate.getDate() - startDay);

    const alignedEnd = new Date(endDate);
    const endDay = (endDate.getDay() + 6) % 7;
    alignedEnd.setDate(endDate.getDate() + (6 - endDay));

    const msPerDay = 1000 * 60 * 60 * 24;
    const totalDays =
        Math.floor((alignedEnd.getTime() - alignedStart.getTime()) / msPerDay) + 1;
    const totalWeeks = Math.ceil(totalDays / 7);

    const result: Array<[number, number, number, string]> = [];
    const monthLabels: Array<{ label: string; weekIndex: number }> = [];
    const seenMonths = new Set<string>();

    for (let i = 0; i < totalDays; i++) {
        const current = new Date(alignedStart);
        current.setDate(alignedStart.getDate() + i);

        const week = Math.floor(i / 7);
        const day = (current.getDay() + 6) % 7;
        const dateKey = formatDateLocal(current);
        const isInYear = current >= startDate && current <= endDate;
        const value = isInYear ? (heatmapByDate[dateKey] ?? 0) : -1;

        result.push([week, day, value, dateKey]);

        if (isInYear && current.getDate() === 1) {
            const monthKey = `${current.getFullYear()}-${current.getMonth()}`;
            if (!seenMonths.has(monthKey)) {
                seenMonths.add(monthKey);
                monthLabels.push({
                    label: monthNames[current.getMonth()] ?? "",
                    weekIndex: week
                });
            }
        }
    }

    return {
        result,
        monthLabels,
        totalWeeks
    };
}

function GitHubHeatmap({
    year,
    heatmapByDate,
    labels
}: {
    year: number;
    heatmapByDate: Record<string, number>;
    labels: {
        days: { mon: string; wed: string; fri: string };
        less: string;
        more: string;
        taskSingular: string;
        taskPlural: string;
        months: string[];
    };
}) {
    const { result, monthLabels, totalWeeks } = React.useMemo(
        () => buildGithubCalendarHeatmap(year, heatmapByDate, labels.months),
        [year, heatmapByDate, labels.months]
    );

    const colorMap: Record<number, string> = {
        0: "#ebedf0",
        1: "#9be9a8",
        2: "#40c463",
        3: "#30a14e",
        4: "#216e39"
    };

    const cells = React.useMemo(() => {
        const map = new Map<string, { value: number; date: string }>();

        result.forEach(([week, day, value, date]) => {
            map.set(`${week}-${day}`, { value, date });
        });

        return map;
    }, [result]);

    const dayLabels = [
        { label: labels.days.mon, row: 0 },
        { label: labels.days.wed, row: 2 },
        { label: labels.days.fri, row: 4 }
    ];

    const wrapperRef = React.useRef<HTMLDivElement | null>(null);
    const [wrapperWidth, setWrapperWidth] = React.useState(900);

    React.useEffect(() => {
        if (!wrapperRef.current) return;

        const element = wrapperRef.current;

        const updateSize = () => {
            setWrapperWidth(element.clientWidth);
        };

        updateSize();

        const observer = new ResizeObserver(() => {
            requestAnimationFrame(updateSize);
        });

        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    const leftLabelWidth = 54;
    const usableWidth = Math.max(wrapperWidth - leftLabelWidth, 320);

    const gap = wrapperWidth >= 1280 ? 6 : wrapperWidth >= 1024 ? 5 : 4;
    const cellSize = Math.max(
        12,
        Math.floor((usableWidth - (totalWeeks - 1) * gap) / totalWeeks)
    );

    const columnWidth = cellSize + gap;
    const rowHeight = cellSize + gap;
    const gridWidth = totalWeeks * cellSize + (totalWeeks - 1) * gap;
    const gridHeight = 7 * cellSize + 6 * gap;

    return (
        <div ref={wrapperRef} className="w-full overflow-x-auto">
            <div
                className="min-w-max"
                style={{
                    width: leftLabelWidth + gridWidth,
                    transition: "width 260ms cubic-bezier(0.22,1,0.36,1)"
                }}
            >
                <div className="flex">
                    <div className="shrink-0" style={{ width: leftLabelWidth }} />
                    <div
                        className="relative mb-4"
                        style={{
                            width: gridWidth,
                            height: 24,
                            transition: "width 260ms cubic-bezier(0.22,1,0.36,1)"
                        }}
                    >
                        {monthLabels.map((month) => (
                            <div
                                key={`${month.label}-${month.weekIndex}`}
                                className="absolute text-sm font-medium text-slate-500 transition-all duration-300"
                                style={{
                                    left: month.weekIndex * columnWidth
                                }}
                            >
                                {month.label}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-start">
                    <div
                        className="relative shrink-0 text-sm text-slate-500"
                        style={{
                            width: leftLabelWidth,
                            height: gridHeight,
                            transition: "height 260ms cubic-bezier(0.22,1,0.36,1)"
                        }}
                    >
                        {dayLabels.map((item) => (
                            <div
                                key={item.label}
                                className="absolute left-0 transition-all duration-300"
                                style={{
                                    top: item.row * rowHeight + Math.max(0, cellSize / 6)
                                }}
                            >
                                {item.label}
                            </div>
                        ))}
                    </div>

                    <div
                        className="grid"
                        style={{
                            gridTemplateColumns: `repeat(${totalWeeks}, ${cellSize}px)`,
                            gap: `${gap}px`,
                            transition: "gap 260ms cubic-bezier(0.22,1,0.36,1)"
                        }}
                    >
                        {Array.from({ length: totalWeeks }).map((_, week) => (
                            <div
                                key={week}
                                className="grid"
                                style={{
                                    gridTemplateRows: `repeat(7, ${cellSize}px)`,
                                    gap: `${gap}px`,
                                    transition: "gap 260ms cubic-bezier(0.22,1,0.36,1)"
                                }}
                            >
                                {Array.from({ length: 7 }).map((_, day) => {
                                    const cell = cells.get(`${week}-${day}`);
                                    const value = cell?.value ?? -1;
                                    const date = cell?.date ?? "";
                                    const hidden = value < 0;

                                    return (
                                        <div
                                            key={`${week}-${day}`}
                                            title={
                                                !hidden
                                                    ? `${date}: ${value} ${value === 1 ? labels.taskSingular : labels.taskPlural}`
                                                    : ""
                                            }
                                            className="rounded-[4px] hover:scale-[1.08]"
                                            style={{
                                                width: cellSize,
                                                height: cellSize,
                                                backgroundColor: hidden
                                                    ? "transparent"
                                                    : colorMap[value] ?? "#ebedf0",
                                                transition:
                                                    "width 260ms cubic-bezier(0.22,1,0.36,1), height 260ms cubic-bezier(0.22,1,0.36,1), background-color 180ms ease, transform 150ms ease"
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2 text-sm text-slate-500">
                    <span>{labels.less}</span>
                    {[0, 1, 2, 3, 4].map((level) => (
                        <div
                            key={level}
                            className="rounded-[4px]"
                            style={{
                                width: Math.max(14, Math.min(18, cellSize)),
                                height: Math.max(14, Math.min(18, cellSize)),
                                backgroundColor: colorMap[level],
                                transition:
                                    "width 260ms cubic-bezier(0.22,1,0.36,1), height 260ms cubic-bezier(0.22,1,0.36,1)"
                            }}
                        />
                    ))}
                    <span>{labels.more}</span>
                </div>
            </div>
        </div>
    );
}

export default function AnalysisHome() {
    const t = useTranslations("AnalysisHome");
    const locale = useLocale();
    const messages = useMessages();
    const data = mockData;
    const [trendFilter, setTrendFilter] = React.useState<TrendFilter>("week");

    const isVi = locale === "vi";

    const fallbackMessages = React.useMemo(
        () =>
            isVi
                ? {
                    "hero.badge": "Phân tích cá nhân",
                    "hero.title": "Phân tích hiệu suất cá nhân",
                    "cards.totalTasks.title": "Tổng công việc",
                    "cards.totalTasks.note": "Tổng số công việc hiện tại",
                    "cards.completed.title": "Hoàn thành",
                    "cards.completed.note": "Công việc đã hoàn thành",
                    "cards.inProgress.title": "Đang thực hiện",
                    "cards.inProgress.note": "Công việc đang thực hiện",
                    "sections.statusDistribution": "1. Phân bố trạng thái công việc",
                    "sections.progressOverTime": "2. Tiến độ công việc theo thời gian",
                    "sections.workloadByGroup": "3. Khối lượng công việc theo nhóm",
                    "sections.contributionActivity": "4. Hoạt động đóng góp {year}",
                    "trend.week": "Tuần",
                    "trend.month": "Tháng",
                    "trend.year": "Năm",
                    "status.todo": "Cần làm",
                    "status.inProgress": "Đang thực hiện",
                    "status.done": "Hoàn thành",
                    "status.overdue": "Quá hạn",
                    "chart.totalTasks": "Tổng công việc",
                    "chart.taskStatus": "Trạng thái công việc",
                    "chart.taskCompleted": "Công việc hoàn thành",
                    "chart.workload": "Khối lượng",
                    "chart.tasksUnit": "công việc"
                }
                : {
                    "hero.badge": "Personal Analytics",
                    "hero.title": "Personal Performance Analytics",
                    "cards.totalTasks.title": "Total Tasks",
                    "cards.totalTasks.note": "Total current tasks",
                    "cards.completed.title": "Completed",
                    "cards.completed.note": "Tasks completed",
                    "cards.inProgress.title": "In Progress",
                    "cards.inProgress.note": "Tasks in progress",
                    "sections.statusDistribution": "1. Task Status Distribution",
                    "sections.progressOverTime": "2. Task Progress Over Time",
                    "sections.workloadByGroup": "3. Workload by Group",
                    "sections.contributionActivity": "4. Contribution Activity {year}",
                    "trend.week": "Week",
                    "trend.month": "Month",
                    "trend.year": "Year",
                    "status.todo": "To do",
                    "status.inProgress": "In progress",
                    "status.done": "Done",
                    "status.overdue": "Overdue",
                    "chart.totalTasks": "Total tasks",
                    "chart.taskStatus": "Task status",
                    "chart.taskCompleted": "Task completed",
                    "chart.workload": "Workload",
                    "chart.tasksUnit": "tasks"
                },
        [isVi]
    );

    const tr = React.useCallback(
        (key: string, values?: Record<string, string | number>) => {
            const hasKey = key.split(".").reduce<unknown>((acc, part) => {
                if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
                    return (acc as Record<string, unknown>)[part];
                }

                return undefined;
            }, (messages as Record<string, unknown>).AnalysisHome);

            if (typeof hasKey === "string") {
                return t(key as never, values as never);
            }

            let message = fallbackMessages[key as keyof typeof fallbackMessages] ?? key;

            if (values) {
                Object.entries(values).forEach(([name, value]) => {
                    message = message.replaceAll(`{${name}}`, String(value));
                });
            }

            return message;
        },
        [fallbackMessages, messages, t]
    );

    const trendLabels = React.useMemo(
        () =>
            isVi
                ? {
                    weekdays: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
                    weeks: ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4", "Tuần 5"],
                    months: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"]
                }
                : {
                    weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                    weeks: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"],
                    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                },
        [isVi]
    );

    const heatmapLabels = React.useMemo(
        () => ({
            days: {
                mon: trendLabels.weekdays[0],
                wed: trendLabels.weekdays[2],
                fri: trendLabels.weekdays[4]
            },
            less: isVi ? "Ít" : "Less",
            more: isVi ? "Nhiều" : "More",
            taskSingular: isVi ? "công việc" : "task",
            taskPlural: isVi ? "công việc" : "tasks",
            months: trendLabels.months
        }),
        [isVi, trendLabels]
    );

    const filteredTrendData = React.useMemo(() => {
        return getTrendDataByFilter(dailyCompletionSource, trendFilter, selectedYear, trendLabels);
    }, [trendFilter, trendLabels]);

    const workloadGroups = React.useMemo(
        () =>
            [...data.workloadByGroup]
                .sort((a, b) => b.taskCount - a.taskCount)
                .slice(0, 10),
        [data.workloadByGroup]
    );

    const topGroup = workloadGroups[0] ?? null;

    const pieData = React.useMemo(
        () => [
            { name: tr("status.todo"), value: data.todoTasks },
            { name: tr("status.inProgress"), value: data.inProgressTasks },
            { name: tr("status.done"), value: data.doneTasks },
            { name: tr("status.overdue"), value: data.overdueTasks }
        ],
        [data, tr]
    );

    const totalPie = React.useMemo(
        () => pieData.reduce((sum, item) => sum + item.value, 0),
        [pieData]
    );

    const statusDonutOption = React.useMemo<echarts.EChartsOption>(
        () => ({
            animationDuration: 700,
            animationDurationUpdate: 400,
            animationEasing: "cubicOut",
            animationEasingUpdate: "cubicOut",
            color: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"],
            tooltip: {
                trigger: "item",
                backgroundColor: "#0f172a",
                borderWidth: 0,
                textStyle: { color: "#fff" },
                formatter: (params: any) => {
                    return `${params.name}<br/>${params.value} ${tr("chart.tasksUnit")} (${params.percent}%)`;
                }
            },
            legend: { show: false },
            graphic: [
                {
                    type: "text",
                    left: "center",
                    top: "40%",
                    style: {
                        text: `${totalPie}`,
                        textAlign: "center",
                        fill: "#0f172a",
                        fontSize: 34,
                        fontWeight: 700
                    }
                },
                {
                    type: "text",
                    left: "center",
                    top: "54%",
                    style: {
                        text: tr("chart.totalTasks"),
                        textAlign: "center",
                        fill: "#64748b",
                        fontSize: 13,
                        fontWeight: 500
                    }
                }
            ],
            series: [
                {
                    name: tr("chart.taskStatus"),
                    type: "pie",
                    radius: ["62%", "82%"],
                    center: ["50%", "46%"],
                    startAngle: 90,
                    minAngle: 6,
                    avoidLabelOverlap: true,
                    itemStyle: {
                        borderColor: "#ffffff",
                        borderWidth: 6,
                        shadowBlur: 12,
                        shadowColor: "rgba(15,23,42,0.08)"
                    },
                    label: { show: false },
                    labelLine: { show: false },
                    emphasis: {
                        scale: true,
                        scaleSize: 6,
                        itemStyle: {
                            shadowBlur: 18,
                            shadowColor: "rgba(249,115,22,0.18)"
                        }
                    },
                    data: pieData
                }
            ]
        }),
        [pieData, tr, totalPie]
    );

    const progressLineOption = React.useMemo<echarts.EChartsOption>(
        () => ({
            animationDuration: 700,
            animationDurationUpdate: 400,
            animationEasing: "cubicOut",
            animationEasingUpdate: "cubicOut",
            tooltip: {
                trigger: "axis",
                backgroundColor: "#0f172a",
                borderWidth: 0,
                textStyle: { color: "#fff" }
            },
            grid: {
                left: 30,
                right: 20,
                top: 30,
                bottom: 20,
                containLabel: true
            },
            xAxis: {
                type: "category",
                boundaryGap: false,
                data: filteredTrendData.map((item) => item.label),
                axisTick: { show: false },
                axisLine: { lineStyle: { color: "#CBD5E1" } },
                axisLabel: { color: "#64748B" }
            },
            yAxis: {
                type: "value",
                minInterval: 1,
                axisLabel: { color: "#64748B" },
                splitLine: {
                    lineStyle: {
                        color: "#E2E8F0"
                    }
                }
            },
            series: [
                {
                    name: tr("chart.taskCompleted"),
                    type: "line",
                    smooth: true,
                    symbol: "circle",
                    symbolSize: 8,
                    data: filteredTrendData.map((item) => item.completed),
                    lineStyle: {
                        width: 3,
                        color: "#2563eb"
                    },
                    itemStyle: {
                        color: "#2563eb",
                        borderColor: "#fff",
                        borderWidth: 2
                    },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: "rgba(37,99,235,0.28)" },
                            { offset: 1, color: "rgba(37,99,235,0.03)" }
                        ])
                    }
                }
            ]
        }),
        [filteredTrendData, tr]
    );

    const workloadBarOption = React.useMemo<echarts.EChartsOption>(
        () => {
            return {
                animationDuration: 800,
                animationDurationUpdate: 450,
                animationEasing: "cubicOut",
                animationEasingUpdate: "cubicOut",
                tooltip: {
                    trigger: "axis",
                    axisPointer: {
                        type: "shadow",
                        shadowStyle: {
                            color: "rgba(148,163,184,0.10)"
                        }
                    },
                    backgroundColor: "#0f172a",
                    borderWidth: 0,
                    padding: [10, 12],
                    textStyle: { color: "#fff" },
                    formatter: (params: any) => {
                        const item = params?.[0];
                        if (!item) return "";
                        return `${item.name}<br/>${item.value} ${tr("chart.tasksUnit")}`;
                    }
                },
                grid: {
                    left: 8,
                    right: 8,
                    top: 24,
                    bottom: 90,
                    containLabel: true
                },
                xAxis: {
                    type: "category",
                    data: workloadGroups.map((item) => item.groupName),
                    axisTick: { show: false },
                    axisLine: {
                        lineStyle: {
                            color: "#CBD5E1"
                        }
                    },
                    axisLabel: {
                        color: "#475569",
                        interval: 0,
                        rotate: 0,
                        fontSize: 12,
                        margin: 14,
                        formatter: (value: string) => {
                            const max = 12;
                            return value.length > max
                                ? `${value.slice(0, max)}...`
                                : value;
                        }
                    }
                },
                yAxis: {
                    type: "value",
                    minInterval: 1,
                    axisLabel: {
                        color: "#64748B"
                    },
                    splitLine: {
                        lineStyle: {
                            color: "#E2E8F0",
                            type: "dashed"
                        }
                    }
                },
                series: [
                    {
                        name: tr("chart.workload"),
                        type: "bar",
                        barWidth:
                            workloadGroups.length <= 4
                                ? 72
                                : workloadGroups.length <= 7
                                    ? 56
                                    : 44,
                        barMaxWidth: 72,
                        barCategoryGap: "18%",
                        data: workloadGroups.map((item) => ({
                            value: item.taskCount,
                            itemStyle: {
                                borderRadius: [12, 12, 0, 0],
                                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                    { offset: 0, color: "#fb923c" },
                                    { offset: 1, color: "#ea580c" }
                                ]),
                                shadowBlur: 14,
                                shadowColor: "rgba(234,88,12,0.20)",
                                shadowOffsetY: 8
                            }
                        })),
                        label: {
                            show: true,
                            position: "top",
                            color: "#0f172a",
                            fontWeight: 700,
                            fontSize: 12
                        },
                        emphasis: {
                            focus: "series",
                            itemStyle: {
                                shadowBlur: 18,
                                shadowOffsetY: 10
                            }
                        }
                    }
                ]
            };
        },
        [tr, workloadGroups]
    );

    return (
        <div className="relative overflow-hidden bg-[linear-gradient(180deg,#F8FAFC_0%,#FFF7ED_34%,#FFFBF5_66%,#F8FAFC_100%)]">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-[-80px] top-[-40px] h-72 w-72 rounded-full bg-orange-200/25 blur-3xl" />
                <div className="absolute right-[-80px] top-[18%] h-80 w-80 rounded-full bg-amber-200/20 blur-3xl" />
                <div className="absolute bottom-[-120px] left-[15%] h-96 w-96 rounded-full bg-orange-100/20 blur-3xl" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:28px_28px] opacity-40" />
            </div>

            <Container className="relative pb-8 pt-8">
                <div className="space-y-8">
                    <SectionReveal>
                        <section className="relative overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.72))] px-6 py-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.14),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.10),transparent_30%)]" />

                            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.96 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.35 }}
                                        className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50/90 px-3 py-1.5 text-xs font-medium text-orange-700 shadow-sm"
                                    >
                                        <Sparkles className="h-3.5 w-3.5" />
                                        {tr("hero.badge")}
                                    </motion.div>

                                    <h1 className="mt-4 bg-[linear-gradient(135deg,#0F172A_0%,#EA580C_55%,#C2410C_100%)] bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-[38px]">
                                        {tr("hero.title")}
                                    </h1>

                                    <div className="mt-4">
                                        <HomeTopTabs />
                                    </div>
                                </div>
                            </div>
                        </section>
                    </SectionReveal>

                    <SectionReveal delay={0.04}>
                        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <SummaryCard
                                title={tr("cards.totalTasks.title")}
                                value={data.totalTasks}
                                note={tr("cards.totalTasks.note")}
                                icon={<Target className="h-5 w-5" />}
                                tone="accent"
                            />
                            <SummaryCard
                                title={tr("cards.completed.title")}
                                value={data.doneTasks}
                                note={tr("cards.completed.note")}
                                icon={<CheckCircle2 className="h-5 w-5" />}
                                tone="success"
                            />
                            <SummaryCard
                                title={tr("cards.inProgress.title")}
                                value={data.inProgressTasks}
                                note={tr("cards.inProgress.note")}
                                icon={<Clock3 className="h-5 w-5" />}
                                tone="warning"
                            />
                        </section>
                    </SectionReveal>

                    <SectionReveal delay={0.08}>
                        <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                            <div className="xl:col-span-4 rounded-[30px] border border-white/70 bg-white/85 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                                <div className="mb-5">
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        {tr("sections.statusDistribution")}
                                    </h2>
                                </div>

                                <EChart option={statusDonutOption} height={300} />

                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    {pieData.map((item, index) => {
                                        const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
                                        return (
                                            <div
                                                key={item.name}
                                                className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="h-2.5 w-2.5 rounded-full"
                                                        style={{ backgroundColor: colors[index] }}
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

                            <div className="xl:col-span-8 rounded-[30px] border border-white/70 bg-white/85 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                                <div className="mb-5 flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className="h-5 w-5 shrink-0" aria-hidden="true" />
                                        <div>
                                            <h2 className="text-lg font-semibold text-slate-900">
                                                {tr("sections.progressOverTime")}
                                            </h2>
                                        </div>
                                    </div>

                                    <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                                        {[
                                            { key: "week", label: tr("trend.week") },
                                            { key: "month", label: tr("trend.month") },
                                            { key: "year", label: tr("trend.year") }
                                        ].map((item) => (
                                            <button
                                                key={item.key}
                                                type="button"
                                                onClick={() => setTrendFilter(item.key as TrendFilter)}
                                                className={cn(
                                                    "rounded-xl px-4 py-2 text-sm font-medium transition",
                                                    trendFilter === item.key
                                                        ? "bg-white text-orange-600 shadow-sm"
                                                        : "text-slate-500 hover:text-orange-600"
                                                )}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <EChart option={progressLineOption} height={340} />
                            </div>
                        </section>
                    </SectionReveal>

                    <SectionReveal delay={0.12}>
                        <section className="space-y-4">
                            <div className="rounded-[30px] border border-white/70 bg-white/85 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                                <div className="mb-5">
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        {tr("sections.workloadByGroup")}
                                    </h2>
                                </div>
                                <EChart option={workloadBarOption} height={430} />
                            </div>

                            <div className="rounded-[30px] border border-white/70 bg-white/85 p-8 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                                <div className="mb-5">
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        {tr("sections.contributionActivity", { year: selectedYear })}
                                    </h2>
                                </div>

                                <GitHubHeatmap
                                    year={selectedYear}
                                    heatmapByDate={data.heatmapByDate}
                                    labels={heatmapLabels}
                                />
                            </div>
                        </section>
                    </SectionReveal>
                </div>
            </Container>
        </div>
    );
}