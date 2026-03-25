"use client";

import * as React from "react";
import * as echarts from "echarts";
import { AnimatePresence, motion } from "framer-motion";
import {
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    X
} from "lucide-react";

type TaskStatusKey = "todo" | "inProgress" | "done" | "overdue";
type TimeViewMode = "week" | "month" | "year";

type MemberProgress = {
    id: string;
    name: string;
    completedTasks: number;
    totalTasks: number;
    lastActivity: string;
};

type GroupAnalytics = {
    id: string;
    name: string;
    color: string;
    statuses: Record<TaskStatusKey, number>;
    completionTrend: Array<{ label: string; value: number }>;
    members: MemberProgress[];
};

const STATUS_META: Array<{
    key: TaskStatusKey;
    label: string;
    color: string;
}> = [
        { key: "todo", label: "To do", color: "#3b82f6" },
        { key: "inProgress", label: "In progress", color: "#f59e0b" },
        { key: "done", label: "Done", color: "#10b981" },
        { key: "overdue", label: "Overdue", color: "#ef4444" }
    ];

const GROUPS: GroupAnalytics[] = [
    {
        id: "group-1",
        name: "Marketing",
        color: "#f97316",
        statuses: { todo: 14, inProgress: 10, done: 23, overdue: 4 },
        completionTrend: [
            { label: "T1", value: 8 },
            { label: "T2", value: 10 },
            { label: "T3", value: 12 },
            { label: "T4", value: 13 },
            { label: "T5", value: 15 },
            { label: "T6", value: 18 },
            { label: "T7", value: 17 },
            { label: "T8", value: 19 },
            { label: "T9", value: 20 },
            { label: "T10", value: 23 },
            { label: "T11", value: 24 },
            { label: "T12", value: 26 }
        ],
        members: [
            { id: "m1", name: "Nguyễn An", completedTasks: 12, totalTasks: 16, lastActivity: "20 phút trước" },
            { id: "m2", name: "Trần Bình", completedTasks: 10, totalTasks: 15, lastActivity: "1 giờ trước" },
            { id: "m3", name: "Lê Chi", completedTasks: 9, totalTasks: 14, lastActivity: "2 giờ trước" },
            { id: "m4", name: "Phạm Duy", completedTasks: 8, totalTasks: 13, lastActivity: "Hôm qua" }
        ]
    },
    {
        id: "group-2",
        name: "Thiết kế UI/UX",
        color: "#3b82f6",
        statuses: { todo: 12, inProgress: 8, done: 20, overdue: 3 },
        completionTrend: [
            { label: "T1", value: 6 },
            { label: "T2", value: 8 },
            { label: "T3", value: 9 },
            { label: "T4", value: 10 },
            { label: "T5", value: 12 },
            { label: "T6", value: 14 },
            { label: "T7", value: 15 },
            { label: "T8", value: 17 },
            { label: "T9", value: 18 },
            { label: "T10", value: 18 },
            { label: "T11", value: 20 },
            { label: "T12", value: 22 }
        ],
        members: [
            { id: "m5", name: "Hoàng Giang", completedTasks: 11, totalTasks: 15, lastActivity: "30 phút trước" },
            { id: "m6", name: "Vũ Hạnh", completedTasks: 8, totalTasks: 13, lastActivity: "3 giờ trước" },
            { id: "m7", name: "Đỗ Khôi", completedTasks: 7, totalTasks: 12, lastActivity: "Hôm qua" },
            { id: "m8", name: "Bùi Lan", completedTasks: 6, totalTasks: 11, lastActivity: "2 ngày trước" }
        ]
    },
    {
        id: "group-3",
        name: "Kỹ thuật",
        color: "#10b981",
        statuses: { todo: 10, inProgress: 14, done: 28, overdue: 5 },
        completionTrend: [
            { label: "T1", value: 9 },
            { label: "T2", value: 11 },
            { label: "T3", value: 13 },
            { label: "T4", value: 15 },
            { label: "T5", value: 18 },
            { label: "T6", value: 19 },
            { label: "T7", value: 21 },
            { label: "T8", value: 23 },
            { label: "T9", value: 25 },
            { label: "T10", value: 26 },
            { label: "T11", value: 28 },
            { label: "T12", value: 30 }
        ],
        members: [
            { id: "m9", name: "Mai Nam", completedTasks: 14, totalTasks: 18, lastActivity: "10 phút trước" },
            { id: "m10", name: "Quốc Bảo", completedTasks: 11, totalTasks: 16, lastActivity: "1 giờ trước" },
            { id: "m11", name: "Hà My", completedTasks: 10, totalTasks: 15, lastActivity: "5 giờ trước" },
            { id: "m12", name: "Nhật Minh", completedTasks: 9, totalTasks: 14, lastActivity: "Hôm qua" }
        ]
    },
    {
        id: "group-4",
        name: "Vận hành",
        color: "#8b5cf6",
        statuses: { todo: 9, inProgress: 7, done: 16, overdue: 2 },
        completionTrend: [
            { label: "T1", value: 5 },
            { label: "T2", value: 6 },
            { label: "T3", value: 8 },
            { label: "T4", value: 8 },
            { label: "T5", value: 10 },
            { label: "T6", value: 11 },
            { label: "T7", value: 12 },
            { label: "T8", value: 13 },
            { label: "T9", value: 14 },
            { label: "T10", value: 15 },
            { label: "T11", value: 16 },
            { label: "T12", value: 18 }
        ],
        members: [
            { id: "m13", name: "An Nhiên", completedTasks: 9, totalTasks: 12, lastActivity: "25 phút trước" },
            { id: "m14", name: "Thanh Tùng", completedTasks: 7, totalTasks: 11, lastActivity: "2 giờ trước" },
            { id: "m15", name: "Gia Huy", completedTasks: 6, totalTasks: 10, lastActivity: "Hôm qua" }
        ]
    },
    {
        id: "group-5",
        name: "Nội dung",
        color: "#ec4899",
        statuses: { todo: 11, inProgress: 8, done: 18, overdue: 3 },
        completionTrend: [
            { label: "T1", value: 7 },
            { label: "T2", value: 7 },
            { label: "T3", value: 9 },
            { label: "T4", value: 10 },
            { label: "T5", value: 11 },
            { label: "T6", value: 12 },
            { label: "T7", value: 14 },
            { label: "T8", value: 15 },
            { label: "T9", value: 16 },
            { label: "T10", value: 17 },
            { label: "T11", value: 18 },
            { label: "T12", value: 19 }
        ],
        members: [
            { id: "m16", name: "Thiên Kim", completedTasks: 8, totalTasks: 12, lastActivity: "35 phút trước" },
            { id: "m17", name: "Bảo Trâm", completedTasks: 7, totalTasks: 11, lastActivity: "3 giờ trước" },
            { id: "m18", name: "Đức Hòa", completedTasks: 6, totalTasks: 10, lastActivity: "1 ngày trước" }
        ]
    },
    {
        id: "group-6",
        name: "Kinh doanh",
        color: "#06b6d4",
        statuses: { todo: 13, inProgress: 9, done: 19, overdue: 4 },
        completionTrend: [
            { label: "T1", value: 6 },
            { label: "T2", value: 9 },
            { label: "T3", value: 10 },
            { label: "T4", value: 11 },
            { label: "T5", value: 13 },
            { label: "T6", value: 14 },
            { label: "T7", value: 15 },
            { label: "T8", value: 16 },
            { label: "T9", value: 18 },
            { label: "T10", value: 19 },
            { label: "T11", value: 20 },
            { label: "T12", value: 21 }
        ],
        members: [
            { id: "m19", name: "Hồng Phúc", completedTasks: 9, totalTasks: 14, lastActivity: "15 phút trước" },
            { id: "m20", name: "Minh Quân", completedTasks: 8, totalTasks: 13, lastActivity: "4 giờ trước" },
            { id: "m21", name: "Lan Vy", completedTasks: 7, totalTasks: 12, lastActivity: "Hôm qua" }
        ]
    },
    {
        id: "group-7",
        name: "CSKH",
        color: "#f59e0b",
        statuses: { todo: 8, inProgress: 10, done: 17, overdue: 3 },
        completionTrend: [
            { label: "T1", value: 5 },
            { label: "T2", value: 6 },
            { label: "T3", value: 7 },
            { label: "T4", value: 9 },
            { label: "T5", value: 10 },
            { label: "T6", value: 12 },
            { label: "T7", value: 13 },
            { label: "T8", value: 14 },
            { label: "T9", value: 15 },
            { label: "T10", value: 16 },
            { label: "T11", value: 17 },
            { label: "T12", value: 18 }
        ],
        members: [
            { id: "m22", name: "Khánh Linh", completedTasks: 8, totalTasks: 11, lastActivity: "40 phút trước" },
            { id: "m23", name: "Tuấn Vũ", completedTasks: 7, totalTasks: 10, lastActivity: "2 giờ trước" },
            { id: "m24", name: "Mỹ Duyên", completedTasks: 6, totalTasks: 9, lastActivity: "Hôm qua" }
        ]
    },
    {
        id: "group-8",
        name: "Tài chính",
        color: "#6366f1",
        statuses: { todo: 7, inProgress: 6, done: 15, overdue: 2 },
        completionTrend: [
            { label: "T1", value: 4 },
            { label: "T2", value: 5 },
            { label: "T3", value: 6 },
            { label: "T4", value: 7 },
            { label: "T5", value: 8 },
            { label: "T6", value: 9 },
            { label: "T7", value: 10 },
            { label: "T8", value: 11 },
            { label: "T9", value: 12 },
            { label: "T10", value: 13 },
            { label: "T11", value: 14 },
            { label: "T12", value: 15 }
        ],
        members: [
            { id: "m25", name: "Tuệ Minh", completedTasks: 7, totalTasks: 9, lastActivity: "1 giờ trước" },
            { id: "m26", name: "Gia Bảo", completedTasks: 5, totalTasks: 8, lastActivity: "Hôm qua" }
        ]
    },
    {
        id: "group-9",
        name: "Nhân sự",
        color: "#14b8a6",
        statuses: { todo: 6, inProgress: 5, done: 13, overdue: 2 },
        completionTrend: [
            { label: "T1", value: 3 },
            { label: "T2", value: 4 },
            { label: "T3", value: 5 },
            { label: "T4", value: 6 },
            { label: "T5", value: 7 },
            { label: "T6", value: 8 },
            { label: "T7", value: 9 },
            { label: "T8", value: 10 },
            { label: "T9", value: 11 },
            { label: "T10", value: 11 },
            { label: "T11", value: 12 },
            { label: "T12", value: 13 }
        ],
        members: [
            { id: "m27", name: "Phúc An", completedTasks: 6, totalTasks: 8, lastActivity: "30 phút trước" },
            { id: "m28", name: "Như Ý", completedTasks: 4, totalTasks: 7, lastActivity: "5 giờ trước" }
        ]
    },
    {
        id: "group-10",
        name: "QA",
        color: "#ef4444",
        statuses: { todo: 10, inProgress: 9, done: 21, overdue: 4 },
        completionTrend: [
            { label: "T1", value: 6 },
            { label: "T2", value: 7 },
            { label: "T3", value: 9 },
            { label: "T4", value: 10 },
            { label: "T5", value: 12 },
            { label: "T6", value: 14 },
            { label: "T7", value: 15 },
            { label: "T8", value: 16 },
            { label: "T9", value: 18 },
            { label: "T10", value: 19 },
            { label: "T11", value: 20 },
            { label: "T12", value: 22 }
        ],
        members: [
            { id: "m29", name: "Bảo Ngọc", completedTasks: 10, totalTasks: 14, lastActivity: "50 phút trước" },
            { id: "m30", name: "Minh Đức", completedTasks: 8, totalTasks: 12, lastActivity: "3 giờ trước" },
            { id: "m31", name: "Ánh Dương", completedTasks: 7, totalTasks: 11, lastActivity: "Hôm qua" }
        ]
    }
];

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function pad2(value: number) {
    return String(value).padStart(2, "0");
}

function formatDate(date: Date) {
    return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function getStartOfWeek(date: Date) {
    const copy = new Date(date);
    const day = copy.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    copy.setDate(copy.getDate() + diff);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

function getEndOfWeek(date: Date) {
    const start = getStartOfWeek(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
}

function getStartOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getEndOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getStartOfYear(date: Date) {
    return new Date(date.getFullYear(), 0, 1);
}

function getEndOfYear(date: Date) {
    return new Date(date.getFullYear(), 11, 31);
}

function shiftDateByMode(date: Date, mode: TimeViewMode, amount: number) {
    const next = new Date(date);

    if (mode === "week") {
        next.setDate(next.getDate() + amount * 7);
        return next;
    }

    if (mode === "month") {
        next.setMonth(next.getMonth() + amount);
        return next;
    }

    next.setFullYear(next.getFullYear() + amount);
    return next;
}

function getRangeLabel(date: Date, mode: TimeViewMode) {
    if (mode === "week") {
        const start = getStartOfWeek(date);
        const end = getEndOfWeek(date);

        return `${pad2(start.getDate())}/${pad2(start.getMonth() + 1)} - ${pad2(end.getDate())}/${pad2(end.getMonth() + 1)}/${end.getFullYear()}`;
    }

    if (mode === "month") {
        const start = getStartOfMonth(date);
        return `Tháng ${pad2(start.getMonth() + 1)}/${start.getFullYear()}`;
    }

    const start = getStartOfYear(date);
    return `Năm ${start.getFullYear()}`;
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

        const chart = echarts.init(ref.current, undefined, { renderer: "canvas" });
        chartRef.current = chart;
        chart.setOption(option, true);

        const smoothResize = () => {
            if (!chartRef.current) return;
            if (frameRef.current) cancelAnimationFrame(frameRef.current);

            frameRef.current = requestAnimationFrame(() => {
                chartRef.current?.resize({
                    animation: { duration: 260, easing: "cubicOut" }
                });
            });
        };

        const observer = new ResizeObserver(smoothResize);
        observer.observe(ref.current);
        window.addEventListener("resize", smoothResize);

        return () => {
            window.removeEventListener("resize", smoothResize);
            observer.disconnect();
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
                animation: { duration: 260, easing: "cubicOut" }
            });
        });
    }, [option]);

    return <div ref={ref} style={{ width: "100%", height }} />;
}

function getPercent(completed: number, total: number) {
    if (!total) return 0;
    return Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
}

function getStatusTone(percent: number) {
    if (percent >= 70) {
        return {
            label: "Đúng tiến độ",
            textClass: "text-emerald-600",
            barClass: "bg-emerald-500"
        };
    }

    if (percent >= 40) {
        return {
            label: "Cần chú ý",
            textClass: "text-orange-500",
            barClass: "bg-orange-500"
        };
    }

    return {
        label: "Chậm tiến độ",
        textClass: "text-red-500",
        barClass: "bg-red-500"
    };
}

function MemberProgressCard({ member }: { member: MemberProgress }) {
    const percent = getPercent(member.completedTasks, member.totalTasks);
    const tone = getStatusTone(percent);

    return (
        <div className="rounded-[18px] border border-slate-200 bg-slate-50/80 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900">{member.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{member.lastActivity}</div>
                </div>
                <div className={cn("shrink-0 text-xs font-semibold", tone.textClass)}>
                    {tone.label}
                </div>
            </div>

            <div className="mb-2 flex items-center gap-3">
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                    <div
                        className={cn("h-full rounded-full transition-all duration-500", tone.barClass)}
                        style={{ width: `${percent}%` }}
                    />
                </div>
                <div className="w-10 text-right text-sm font-bold text-slate-900">{percent}%</div>
            </div>

            <div className="text-xs text-slate-500">
                {member.completedTasks} / {member.totalTasks} tasks hoàn thành
            </div>
        </div>
    );
}

function SectionTitle({
    title,
    description
}: {
    title: string;
    description?: string;
}) {
    return (
        <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
    );
}

function GroupSelect({
    groups,
    value,
    onChange
}: {
    groups: GroupAnalytics[];
    value: string;
    onChange: (value: string) => void;
}) {
    const [open, setOpen] = React.useState(false);
    const wrapRef = React.useRef<HTMLDivElement | null>(null);

    const selectedGroup = React.useMemo(
        () => groups.find((group) => group.id === value) ?? groups[0],
        [groups, value]
    );

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!wrapRef.current) return;
            if (!wrapRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    return (
        <div ref={wrapRef} className="relative w-full max-w-[340px]">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className={cn(
                    "group relative flex h-14 w-full items-center justify-between overflow-hidden rounded-[20px] border px-4",
                    "bg-white/95 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur",
                    "transition-all duration-200",
                    open
                        ? "border-orange-300 ring-4 ring-orange-100"
                        : "border-slate-200 hover:border-orange-200 hover:shadow-[0_14px_32px_rgba(15,23,42,0.08)]"
                )}
            >
                <div className="flex min-w-0 items-center gap-3">
                    <span
                        className="h-3 w-3 shrink-0 rounded-full shadow-sm"
                        style={{ backgroundColor: selectedGroup?.color }}
                    />
                    <div className="min-w-0 text-left">
                        <div className="text-xs font-medium text-slate-400">Chọn nhóm</div>
                        <div className="truncate text-sm font-semibold text-slate-800">
                            {selectedGroup?.name}
                        </div>
                    </div>
                </div>

                <ChevronDown
                    className={cn(
                        "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
                        open && "rotate-180 text-orange-500"
                    )}
                />
            </button>

            <AnimatePresence>
                {open ? (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 8, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="absolute left-0 right-0 z-30"
                    >
                        <div className="mt-2 overflow-hidden rounded-[22px] border border-slate-200 bg-white/98 p-2 shadow-[0_20px_50px_rgba(15,23,42,0.14)] backdrop-blur-xl">
                            <div className="max-h-[280px] overflow-y-auto pr-1">
                                {groups.map((group) => {
                                    const active = group.id === value;

                                    return (
                                        <button
                                            key={group.id}
                                            type="button"
                                            onClick={() => {
                                                onChange(group.id);
                                                setOpen(false);
                                            }}
                                            className={cn(
                                                "flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition-all duration-150",
                                                active
                                                    ? "bg-orange-50 text-orange-700"
                                                    : "text-slate-700 hover:bg-slate-50"
                                            )}
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span
                                                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                                                    style={{ backgroundColor: group.color }}
                                                />
                                                <span className="truncate text-sm font-medium">
                                                    {group.name}
                                                </span>
                                            </div>

                                            {active ? (
                                                <span className="rounded-full bg-orange-100 px-2 py-1 text-[11px] font-semibold text-orange-700">
                                                    Đang chọn
                                                </span>
                                            ) : null}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}

function TimeRangeToolbar({
    mode,
    onModeChange,
    rangeLabel,
    onPrev,
    onNext
}: {
    mode: TimeViewMode;
    onModeChange: (mode: TimeViewMode) => void;
    rangeLabel: string;
    onPrev: () => void;
    onNext: () => void;
}) {
    const tabs: Array<{ key: TimeViewMode; label: string }> = [
        { key: "week", label: "Tuần" },
        { key: "month", label: "Tháng" },
        { key: "year", label: "Năm" }
    ];

    return (
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                {tabs.map((tab) => {
                    const active = tab.key === mode;

                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => onModeChange(tab.key)}
                            className={cn(
                                "rounded-xl px-4 py-2 text-sm font-medium transition",
                                active
                                    ? "bg-white text-orange-600 shadow-sm"
                                    : "text-slate-500 hover:text-orange-600"
                            )}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-1">
                <button
                    type="button"
                    onClick={onPrev}
                    className="rounded-xl px-3 py-2 text-slate-500 transition hover:bg-white hover:text-slate-900"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="px-2 text-center text-sm font-medium text-slate-700 whitespace-nowrap">
                    {rangeLabel}
                </div>

                <button
                    type="button"
                    onClick={onNext}
                    className="rounded-xl px-3 py-2 text-slate-500 transition hover:bg-white hover:text-slate-900"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

function CompareGroupPicker({
    groups,
    selectedIds,
    onChange,
    title,
    description,
    triggerLabel
}: {
    groups: GroupAnalytics[];
    selectedIds: string[];
    onChange: (value: string[]) => void;
    title: string;
    description: string;
    triggerLabel: string;
}) {
    const [open, setOpen] = React.useState(false);
    const wrapRef = React.useRef<HTMLDivElement | null>(null);

    const selectedGroups = React.useMemo(
        () => groups.filter((group) => selectedIds.includes(group.id)),
        [groups, selectedIds]
    );

    const toggle = (id: string) => {
        const exists = selectedIds.includes(id);

        if (exists) {
            const next = selectedIds.filter((item) => item !== id);
            onChange(next.length ? next : [id]);
            return;
        }

        onChange([...selectedIds, id]);
    };

    const selectAll = () => {
        onChange(groups.map((group) => group.id));
    };

    const selectTopFour = () => {
        onChange(groups.slice(0, 4).map((group) => group.id));
    };

    const clearToFirst = () => {
        onChange(groups[0] ? [groups[0].id] : []);
    };

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!wrapRef.current) return;
            if (!wrapRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    return (
        <div ref={wrapRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className={cn(
                    "group flex min-h-[62px] w-full items-center justify-between gap-4 rounded-[24px] border px-4 py-3",
                    "bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))]",
                    "shadow-[0_16px_40px_rgba(15,23,42,0.07)] backdrop-blur-xl",
                    "transition-all duration-200",
                    open
                        ? "border-orange-300 ring-4 ring-orange-100"
                        : "border-slate-200 hover:border-orange-200 hover:shadow-[0_20px_48px_rgba(15,23,42,0.1)]"
                )}
            >
                <div className="min-w-0 text-left">
                    <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                        {triggerLabel}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        {selectedGroups.length ? (
                            selectedGroups.slice(0, 5).map((group) => (
                                <span
                                    key={group.id}
                                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm"
                                >
                                    <span
                                        className="h-2 w-2 rounded-full"
                                        style={{ backgroundColor: group.color }}
                                    />
                                    {group.name}
                                </span>
                            ))
                        ) : (
                            <span className="text-sm text-slate-500">Chưa có nhóm nào được chọn</span>
                        )}

                        {selectedGroups.length > 5 ? (
                            <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
                                +{selectedGroups.length - 5} nhóm
                            </span>
                        ) : null}
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                    <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                        {selectedGroups.length} đã chọn
                    </div>

                    <ChevronDown
                        className={cn(
                            "h-4 w-4 text-slate-400 transition-transform duration-200",
                            open && "rotate-180 text-orange-500"
                        )}
                    />
                </div>
            </button>

            <AnimatePresence>
                {open ? (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="relative mt-3"
                    >
                        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 shadow-[0_30px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl">
                            <div className="border-b border-slate-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,252,0.9))] px-5 py-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="text-base font-semibold text-slate-900">{title}</div>
                                        <div className="mt-1 text-sm text-slate-500">{description}</div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setOpen(false)}
                                        className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={selectAll}
                                        className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                                    >
                                        Chọn tất cả
                                    </button>

                                    <button
                                        type="button"
                                        onClick={selectTopFour}
                                        className="rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                                    >
                                        Top 4 mặc định
                                    </button>

                                    <button
                                        type="button"
                                        onClick={clearToFirst}
                                        className="rounded-full bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-100"
                                    >
                                        Giữ 1 nhóm
                                    </button>
                                </div>
                            </div>

                            <div className="max-h-[320px] overflow-y-auto p-4">
                                {groups.length ? (
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                        {groups.map((group) => {
                                            const active = selectedIds.includes(group.id);

                                            return (
                                                <button
                                                    key={group.id}
                                                    type="button"
                                                    onClick={() => toggle(group.id)}
                                                    className={cn(
                                                        "flex items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-left transition-all duration-200",
                                                        active
                                                            ? "border-orange-200 bg-orange-50"
                                                            : "border-slate-200 bg-white hover:border-orange-200 hover:bg-slate-50"
                                                    )}
                                                >
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <span
                                                            className="h-3 w-3 shrink-0 rounded-full"
                                                            style={{ backgroundColor: group.color }}
                                                        />
                                                        <span
                                                            className={cn(
                                                                "truncate text-sm font-medium",
                                                                active ? "text-orange-700" : "text-slate-800"
                                                            )}
                                                        >
                                                            {group.name}
                                                        </span>
                                                    </div>

                                                    <div
                                                        className={cn(
                                                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all",
                                                            active
                                                                ? "border-orange-500 bg-orange-500 text-white"
                                                                : "border-slate-300 bg-white text-transparent"
                                                        )}
                                                    >
                                                        <Check className="h-3.5 w-3.5" />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 p-10 text-center">
                                        <div className="text-sm font-medium text-slate-700">Không có nhóm nào</div>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-sm text-slate-600">
                                    Đang chọn{" "}
                                    <span className="font-semibold text-slate-900">{selectedGroups.length}</span> nhóm
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={clearToFirst}
                                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                    >
                                        Reset
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setOpen(false)}
                                        className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                                    >
                                        Xong
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}

function MemberProgressModal({
    group,
    open,
    onClose
}: {
    group: GroupAnalytics | null;
    open: boolean;
    onClose: () => void;
}) {
    React.useEffect(() => {
        if (!open) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        document.addEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [open, onClose]);

    if (!open || !group) return null;

    const total =
        group.statuses.todo +
        group.statuses.inProgress +
        group.statuses.done +
        group.statuses.overdue;

    const donePercent = total ? Math.round((group.statuses.done / total) * 100) : 0;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.22 }}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[88vh] w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]"
            >
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
                    <div className="min-w-0">
                        <div className="text-sm text-slate-500">Tiến độ thành viên</div>
                        <div className="mt-1 text-2xl font-bold text-slate-900">{group.name}</div>

                        <div className="mt-4 flex items-center gap-3">
                            <div className="h-2.5 w-64 overflow-hidden rounded-full bg-slate-200">
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${donePercent}%`,
                                        backgroundColor: group.color
                                    }}
                                />
                            </div>
                            <div className="text-sm font-semibold text-slate-700">
                                {donePercent}% hoàn thành
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                        Đóng
                    </button>
                </div>

                <div className="overflow-y-auto p-6">
                    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {STATUS_META.map((status) => (
                            <div
                                key={status.key}
                                className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3"
                            >
                                <div className="text-xs text-slate-500">{status.label}</div>
                                <div className="mt-1 text-lg font-bold text-slate-900">
                                    {group.statuses[status.key]}
                                </div>
                            </div>
                        ))}
                    </div>

                    {group.members.length ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {group.members.map((member) => (
                                <MemberProgressCard key={member.id} member={member} />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-10 text-center text-sm text-slate-500">
                            Nhóm này chưa có dữ liệu thành viên.
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

export default function AnalyticMaster() {
    const groups = GROUPS;
    const [selectedGroupId, setSelectedGroupId] = React.useState(groups[0]?.id ?? "");
    const [lineCompareIds, setLineCompareIds] = React.useState<string[]>(
        groups.slice(0, 4).map((group) => group.id)
    );
    const [barCompareIds, setBarCompareIds] = React.useState<string[]>(
        groups.slice(0, 5).map((group) => group.id)
    );
    const [memberModalGroupId, setMemberModalGroupId] = React.useState<string | null>(null);

    const [lineTimeMode, setLineTimeMode] = React.useState<TimeViewMode>("week");
    const [barTimeMode, setBarTimeMode] = React.useState<TimeViewMode>("week");
    const [lineAnchorDate, setLineAnchorDate] = React.useState<Date>(new Date(2026, 3, 20));
    const [barAnchorDate, setBarAnchorDate] = React.useState<Date>(new Date(2026, 3, 20));

    const selectedGroup = React.useMemo(
        () => groups.find((group) => group.id === selectedGroupId) ?? groups[0],
        [groups, selectedGroupId]
    );

    const memberModalGroup = React.useMemo(
        () => groups.find((group) => group.id === memberModalGroupId) ?? null,
        [groups, memberModalGroupId]
    );

    const allGroupStatusSummary = React.useMemo(() => {
        return STATUS_META.map((status) => ({
            name: status.label,
            value: groups.reduce((sum, group) => sum + group.statuses[status.key], 0)
        }));
    }, [groups]);

    const selectedGroupStatusSummary = React.useMemo(() => {
        return STATUS_META.map((status) => ({
            name: status.label,
            value: selectedGroup?.statuses[status.key] ?? 0
        }));
    }, [selectedGroup]);

    const totalAllGroups = React.useMemo(
        () => allGroupStatusSummary.reduce((sum, item) => sum + item.value, 0),
        [allGroupStatusSummary]
    );

    const totalSelectedGroup = React.useMemo(
        () => selectedGroupStatusSummary.reduce((sum, item) => sum + item.value, 0),
        [selectedGroupStatusSummary]
    );

    const selectedLineGroups = React.useMemo(() => {
        const found = groups.filter((group) => lineCompareIds.includes(group.id));
        return found.length ? found : groups.slice(0, 1);
    }, [groups, lineCompareIds]);

    const selectedBarGroups = React.useMemo(() => {
        const found = groups.filter((group) => barCompareIds.includes(group.id));
        return found.length ? found : groups.slice(0, 1);
    }, [groups, barCompareIds]);

    const lineRangeLabel = React.useMemo(
        () => getRangeLabel(lineAnchorDate, lineTimeMode),
        [lineAnchorDate, lineTimeMode]
    );

    const barRangeLabel = React.useMemo(
        () => getRangeLabel(barAnchorDate, barTimeMode),
        [barAnchorDate, barTimeMode]
    );

    const aggregatePieOption = React.useMemo<echarts.EChartsOption>(
        () => ({
            animationDuration: 700,
            animationDurationUpdate: 400,
            animationEasing: "cubicOut",
            animationEasingUpdate: "cubicOut",
            color: STATUS_META.map((item) => item.color),
            tooltip: {
                trigger: "item",
                backgroundColor: "#0f172a",
                borderWidth: 0,
                textStyle: { color: "#fff" },
                formatter: (params: any) =>
                    `${params.name}<br/>${params.value} tasks (${params.percent}%)`
            },
            legend: { show: false },
            graphic: [
                {
                    type: "text",
                    left: "center",
                    top: "41%",
                    style: {
                        text: `${totalAllGroups}`,
                        textAlign: "center",
                        fill: "#0f172a",
                        fontSize: 28,
                        fontWeight: 700
                    }
                },
                {
                    type: "text",
                    left: "center",
                    top: "56%",
                    style: {
                        text: "10 groups",
                        textAlign: "center",
                        fill: "#64748b",
                        fontSize: 13,
                        fontWeight: 500
                    }
                }
            ],
            series: [
                {
                    name: "Tổng quan nhóm",
                    type: "pie",
                    radius: ["58%", "78%"],
                    center: ["50%", "48%"],
                    startAngle: 90,
                    minAngle: 6,
                    avoidLabelOverlap: true,
                    itemStyle: {
                        borderColor: "#fff",
                        borderWidth: 6,
                        shadowBlur: 12,
                        shadowColor: "rgba(15,23,42,0.08)"
                    },
                    label: { show: false },
                    labelLine: { show: false },
                    emphasis: {
                        scale: true,
                        scaleSize: 6
                    },
                    data: allGroupStatusSummary
                }
            ]
        }),
        [allGroupStatusSummary, totalAllGroups]
    );

    const selectedPieOption = React.useMemo<echarts.EChartsOption>(
        () => ({
            animationDuration: 700,
            animationDurationUpdate: 400,
            animationEasing: "cubicOut",
            animationEasingUpdate: "cubicOut",
            color: STATUS_META.map((item) => item.color),
            tooltip: {
                trigger: "item",
                backgroundColor: "#0f172a",
                borderWidth: 0,
                textStyle: { color: "#fff" },
                formatter: (params: any) =>
                    `${params.name}<br/>${params.value} tasks (${params.percent}%)`
            },
            legend: { show: false },
            graphic: [
                {
                    type: "text",
                    left: "center",
                    top: "41%",
                    style: {
                        text: `${totalSelectedGroup}`,
                        textAlign: "center",
                        fill: "#0f172a",
                        fontSize: 28,
                        fontWeight: 700
                    }
                },
                {
                    type: "text",
                    left: "center",
                    top: "56%",
                    style: {
                        text: selectedGroup?.name ?? "Group",
                        textAlign: "center",
                        fill: "#64748b",
                        fontSize: 13,
                        fontWeight: 500
                    }
                }
            ],
            series: [
                {
                    name: "Theo nhóm",
                    type: "pie",
                    radius: ["58%", "78%"],
                    center: ["50%", "48%"],
                    startAngle: 90,
                    minAngle: 6,
                    avoidLabelOverlap: true,
                    itemStyle: {
                        borderColor: "#fff",
                        borderWidth: 6,
                        shadowBlur: 12,
                        shadowColor: "rgba(15,23,42,0.08)"
                    },
                    label: { show: false },
                    labelLine: { show: false },
                    emphasis: {
                        scale: true,
                        scaleSize: 6
                    },
                    data: selectedGroupStatusSummary
                }
            ]
        }),
        [selectedGroup, selectedGroupStatusSummary, totalSelectedGroup]
    );

    const lineChartOption = React.useMemo<echarts.EChartsOption>(() => {
        const labels =
            lineTimeMode === "week"
                ? ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
                : lineTimeMode === "month"
                    ? ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"]
                    : ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];

        return {
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
            legend: {
                bottom: 0,
                type: "scroll",
                data: selectedLineGroups.map((group) => group.name),
                textStyle: { color: "#64748B" }
            },
            grid: {
                left: 30,
                right: 20,
                top: 20,
                bottom: 58,
                containLabel: true
            },
            xAxis: {
                type: "category",
                boundaryGap: false,
                data: labels,
                axisTick: { show: false },
                axisLine: { lineStyle: { color: "#CBD5E1" } },
                axisLabel: { color: "#64748B" }
            },
            yAxis: {
                type: "value",
                minInterval: 1,
                axisLabel: { color: "#64748B" },
                splitLine: { lineStyle: { color: "#E2E8F0" } }
            },
            series: selectedLineGroups.map((group) => {
                let data = group.completionTrend.map((item) => item.value);

                if (lineTimeMode === "week") {
                    data = data.slice(-7);
                } else if (lineTimeMode === "month") {
                    data = [data[0] ?? 0, data[3] ?? 0, data[7] ?? 0, data[11] ?? 0];
                }

                return {
                    name: group.name,
                    type: "line",
                    smooth: true,
                    symbol: "circle",
                    symbolSize: 8,
                    data,
                    lineStyle: {
                        width: 3,
                        color: group.color
                    },
                    itemStyle: {
                        color: group.color,
                        borderColor: "#fff",
                        borderWidth: 2
                    }
                };
            })
        };
    }, [selectedLineGroups, lineTimeMode]);

    const barChartOption = React.useMemo<echarts.EChartsOption>(() => {
        const categories = STATUS_META.map((item) => item.label);

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
                textStyle: { color: "#fff" }
            },
            legend: {
                bottom: 0,
                type: "scroll",
                data: selectedBarGroups.map((group) => group.name),
                textStyle: { color: "#64748B" }
            },
            grid: {
                left: 10,
                right: 10,
                top: 24,
                bottom: 64,
                containLabel: true
            },
            xAxis: {
                type: "category",
                data: categories,
                axisTick: { show: false },
                axisLine: { lineStyle: { color: "#CBD5E1" } },
                axisLabel: {
                    color: "#475569",
                    interval: 0,
                    fontSize: 12
                }
            },
            yAxis: {
                type: "value",
                minInterval: 1,
                axisLabel: { color: "#64748B" },
                splitLine: { lineStyle: { color: "#E2E8F0", type: "dashed" } }
            },
            series: selectedBarGroups.map((group) => ({
                name: group.name,
                type: "bar",
                barMaxWidth: 18,
                data: STATUS_META.map((status) => {
                    const base = group.statuses[status.key];
                    if (barTimeMode === "week") return base;
                    if (barTimeMode === "month") return Math.round(base * 1.2);
                    return Math.round(base * 1.5);
                }),
                itemStyle: {
                    borderRadius: [8, 8, 0, 0],
                    color: group.color
                }
            }))
        };
    }, [selectedBarGroups, barTimeMode]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <motion.section
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.42, delay: 0.04 }}
                    className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl"
                >
                    <SectionTitle
                        title="1. Task Status của toàn bộ 10 nhóm"
                        description=""
                    />

                    <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                        <div className="mx-auto w-full max-w-[260px]">
                            <EChart option={aggregatePieOption} height={260} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {STATUS_META.map((status, index) => (
                                <div
                                    key={status.key}
                                    className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3"
                                >
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="h-2.5 w-2.5 rounded-full"
                                            style={{ backgroundColor: STATUS_META[index].color }}
                                        />
                                        <span className="text-xs font-medium text-slate-500">
                                            {status.label}
                                        </span>
                                    </div>
                                    <div className="mt-2 text-lg font-bold text-slate-900">
                                        {allGroupStatusSummary[index].value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.section>

                <motion.section
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.42, delay: 0.08 }}
                    className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl"
                >
                    <SectionTitle
                        title="2. Task Status theo từng nhóm"
                        description=""
                    />

                    <div className="mb-5">
                        <GroupSelect
                            groups={groups}
                            value={selectedGroupId}
                            onChange={setSelectedGroupId}
                        />
                    </div>

                    <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                        <div className="mx-auto w-full max-w-[260px]">
                            <EChart option={selectedPieOption} height={260} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {STATUS_META.map((status, index) => (
                                <div
                                    key={status.key}
                                    className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3"
                                >
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="h-2.5 w-2.5 rounded-full"
                                            style={{ backgroundColor: STATUS_META[index].color }}
                                        />
                                        <span className="text-xs font-medium text-slate-500">
                                            {status.label}
                                        </span>
                                    </div>
                                    <div className="mt-2 text-lg font-bold text-slate-900">
                                        {selectedGroupStatusSummary[index].value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.section>
            </div>

            <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.12 }}
                className="rounded-[30px] border border-white/70 bg-white/85 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl"
            >
                <SectionTitle
                    title="3. So sánh task hoàn thành theo thời gian"
                />

                <TimeRangeToolbar
                    mode={lineTimeMode}
                    onModeChange={setLineTimeMode}
                    rangeLabel={lineRangeLabel}
                    onPrev={() => setLineAnchorDate((prev) => shiftDateByMode(prev, lineTimeMode, -1))}
                    onNext={() => setLineAnchorDate((prev) => shiftDateByMode(prev, lineTimeMode, 1))}
                />

                <CompareGroupPicker
                    groups={groups}
                    selectedIds={lineCompareIds}
                    onChange={setLineCompareIds}
                    triggerLabel="Bộ lọc so sánh"
                    title="Chọn nhóm cho biểu đồ tiến độ"
                    description="Chọn một hoặc nhiều nhóm để so sánh tốc độ hoàn thành task theo thời gian."
                />

                <div className="mt-5">
                    <EChart option={lineChartOption} height={380} />
                </div>
            </motion.section>

            <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.16 }}
                className="rounded-[30px] border border-white/70 bg-white/85 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl"
            >
                <SectionTitle
                    title="4. So sánh trạng thái task giữa các nhóm"
                />

                <TimeRangeToolbar
                    mode={barTimeMode}
                    onModeChange={setBarTimeMode}
                    rangeLabel={barRangeLabel}
                    onPrev={() => setBarAnchorDate((prev) => shiftDateByMode(prev, barTimeMode, -1))}
                    onNext={() => setBarAnchorDate((prev) => shiftDateByMode(prev, barTimeMode, 1))}
                />

                <CompareGroupPicker
                    groups={groups}
                    selectedIds={barCompareIds}
                    onChange={setBarCompareIds}
                    triggerLabel="Bộ lọc so sánh"
                    title="Chọn nhóm cho biểu đồ trạng thái"
                    description="Lọc nhóm để so sánh số lượng task ở từng trạng thái như Done, In progress, To do và Overdue."
                />

                <div className="mt-5">
                    <EChart option={barChartOption} height={420} />
                </div>
            </motion.section>

            <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.2 }}
                className="rounded-[30px] border border-white/70 bg-white/85 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl"
            >
                <SectionTitle
                    title="5. Tiến độ thành viên trong nhóm"
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {groups.map((group) => {
                        const total =
                            group.statuses.todo +
                            group.statuses.inProgress +
                            group.statuses.done +
                            group.statuses.overdue;

                        const donePercent = total ? Math.round((group.statuses.done / total) * 100) : 0;

                        return (
                            <button
                                key={group.id}
                                type="button"
                                onClick={() => setMemberModalGroupId(group.id)}
                                className="rounded-[24px] border border-slate-200 bg-white p-5 text-left shadow-[0_10px_28px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-1 hover:border-orange-200 hover:bg-orange-50/40"
                            >
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <span
                                            className="h-3 w-3 shrink-0 rounded-full"
                                            style={{ backgroundColor: group.color }}
                                        />
                                        <span className="truncate text-sm font-semibold text-slate-900">
                                            {group.name}
                                        </span>
                                    </div>
                                    <span className="shrink-0 text-xs font-medium text-slate-500">
                                        {donePercent}%
                                    </span>
                                </div>

                                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${donePercent}%`,
                                            backgroundColor: group.color
                                        }}
                                    />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </motion.section>

            <MemberProgressModal
                group={memberModalGroup}
                open={!!memberModalGroup}
                onClose={() => setMemberModalGroupId(null)}
            />
        </div>
    );
}