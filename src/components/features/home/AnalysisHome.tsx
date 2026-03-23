"use client";

import * as React from "react";
import * as echarts from "echarts";
import { motion, AnimatePresence } from "framer-motion";
import {
    AlertTriangle,
    BarChart3,
    FileWarning,
    Files,
    Filter,
    Gauge,
    Layers3,
    Search,
    Sparkles,
    Target,
    TrendingUp,
    X
} from "lucide-react";
import { Container } from "@/components/common";
import HomeTopTabs from "./HomeTopTabs";

type GroupAnalyticsItem = {
    groupId: string;
    groupName: string;
    totalTaskCount: number;
    overdueTaskCount: number;
    averageProgress: number;
    completedTaskCount: number;
    remainingTaskCount: number;
    documentCount: number;
    weeklyDocumentUpload: number;
};

const MAX_COMPARE_GROUPS = 10;
const DOCUMENT_WARNING_THRESHOLD = 20;
const WEEKLY_UPLOAD_WARNING_THRESHOLD = 8;

const mockData: GroupAnalyticsItem[] = [
    {
        groupId: "g1",
        groupName: "Marketing",
        totalTaskCount: 32,
        overdueTaskCount: 6,
        averageProgress: 74,
        completedTaskCount: 18,
        remainingTaskCount: 8,
        documentCount: 42,
        weeklyDocumentUpload: 9
    },
    {
        groupId: "g2",
        groupName: "Thiết kế",
        totalTaskCount: 24,
        overdueTaskCount: 3,
        averageProgress: 81,
        completedTaskCount: 14,
        remainingTaskCount: 7,
        documentCount: 17,
        weeklyDocumentUpload: 4
    },
    {
        groupId: "g3",
        groupName: "Kỹ thuật",
        totalTaskCount: 41,
        overdueTaskCount: 9,
        averageProgress: 67,
        completedTaskCount: 20,
        remainingTaskCount: 12,
        documentCount: 51,
        weeklyDocumentUpload: 11
    },
    {
        groupId: "g4",
        groupName: "Vận hành",
        totalTaskCount: 19,
        overdueTaskCount: 2,
        averageProgress: 88,
        completedTaskCount: 12,
        remainingTaskCount: 5,
        documentCount: 14,
        weeklyDocumentUpload: 3
    },
    {
        groupId: "g5",
        groupName: "Nội dung",
        totalTaskCount: 28,
        overdueTaskCount: 5,
        averageProgress: 72,
        completedTaskCount: 15,
        remainingTaskCount: 8,
        documentCount: 33,
        weeklyDocumentUpload: 7
    }
];

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
    height = 380
}: {
    option: echarts.EChartsOption;
    height?: number;
}) {
    const ref = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        if (!ref.current) return;

        const chart = echarts.init(ref.current);
        chart.setOption(option);

        const handleResize = () => chart.resize();
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            chart.dispose();
        };
    }, [option]);

    return <div ref={ref} style={{ width: "100%", height }} />;
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
    tone?: "default" | "danger" | "accent" | "success" | "warning";
}) {
    const styles = {
        default:
            "border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.95))]",
        danger:
            "border-red-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(254,242,242,0.96))]",
        accent:
            "border-violet-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(245,243,255,0.96))]",
        success:
            "border-emerald-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(236,253,245,0.96))]",
        warning:
            "border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,251,235,0.96))]"
    };

    return (
        <motion.div
            whileHover={{ y: -5 }}
            className={cn(
                "rounded-[28px] border p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)] transition",
                styles[tone]
            )}
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
                    <p className="mt-2 text-xs text-slate-400">{note}</p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-slate-700 shadow-sm">
                    {icon}
                </div>
            </div>
        </motion.div>
    );
}

function InsightCard({
    title,
    value,
    description,
    tone = "default"
}: {
    title: string;
    value: string;
    description: string;
    tone?: "default" | "danger" | "success" | "accent" | "warning";
}) {
    const styles = {
        default: "border-slate-200 bg-white/80",
        danger: "border-red-200 bg-red-50/70",
        success: "border-emerald-200 bg-emerald-50/70",
        accent: "border-violet-200 bg-violet-50/70",
        warning: "border-amber-200 bg-amber-50/70"
    };

    return (
        <div className={cn("rounded-[24px] border p-5 shadow-sm", styles[tone])}>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>
    );
}

function getHealthLabel(item: GroupAnalyticsItem) {
    if (item.averageProgress >= 80 && item.overdueTaskCount <= 3) {
        return {
            label: "Ổn định",
            className: "bg-emerald-50 text-emerald-700 border-emerald-200"
        };
    }

    if (item.averageProgress < 70 || item.overdueTaskCount >= 7) {
        return {
            label: "Cần chú ý",
            className: "bg-red-50 text-red-600 border-red-200"
        };
    }

    return {
        label: "Theo dõi",
        className: "bg-amber-50 text-amber-700 border-amber-200"
    };
}

function getDocumentAlert(item: GroupAnalyticsItem) {
    if (
        item.documentCount >= DOCUMENT_WARNING_THRESHOLD ||
        item.weeklyDocumentUpload >= WEEKLY_UPLOAD_WARNING_THRESHOLD
    ) {
        return {
            label: "Cảnh báo",
            className: "bg-red-50 text-red-600 border-red-200"
        };
    }

    if (item.documentCount >= 14 || item.weeklyDocumentUpload >= 5) {
        return {
            label: "Theo dõi",
            className: "bg-amber-50 text-amber-700 border-amber-200"
        };
    }

    return {
        label: "Ổn định",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200"
    };
}

function createProgressTrend(group: GroupAnalyticsItem) {
    const start = Math.max(20, group.averageProgress - 18);
    const second = Math.max(25, group.averageProgress - 10);
    const third = Math.max(30, group.averageProgress - 6);
    const fourth = Math.max(35, group.averageProgress - 3);
    const end = group.averageProgress;

    return [start, second, third, fourth, end];
}

const linePalette = [
    "#3B82F6",
    "#06B6D4",
    "#10B981",
    "#8B5CF6",
    "#F97316",
    "#EF4444",
    "#14B8A6",
    "#22C55E",
    "#A855F7",
    "#0EA5E9"
];

function GroupDetailModal({
    open,
    group,
    onClose
}: {
    open: boolean;
    group: GroupAnalyticsItem | null;
    onClose: () => void;
}) {
    const detailOption = React.useMemo<echarts.EChartsOption>(() => {
        if (!group) return {};

        return {
            animationDuration: 600,
            tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
            grid: { left: 30, right: 20, top: 20, bottom: 24, containLabel: true },
            xAxis: {
                type: "category",
                data: ["Hoàn thành", "Còn lại", "Quá hạn", "Tài liệu"],
                axisLabel: { color: "#64748B" },
                axisTick: { show: false },
                axisLine: { lineStyle: { color: "#CBD5E1" } }
            },
            yAxis: {
                type: "value",
                axisLabel: { color: "#64748B" },
                splitLine: { lineStyle: { color: "#E2E8F0" } }
            },
            series: [
                {
                    type: "bar",
                    barWidth: 36,
                    data: [
                        group.completedTaskCount,
                        group.remainingTaskCount,
                        group.overdueTaskCount,
                        group.documentCount
                    ],
                    label: {
                        show: true,
                        position: "top",
                        color: "#334155",
                        fontWeight: 600
                    },
                    itemStyle: {
                        borderRadius: [10, 10, 0, 0],
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: "#6366F1" },
                            { offset: 1, color: "#8B5CF6" }
                        ])
                    }
                }
            ]
        };
    }, [group]);

    const docAlert = group ? getDocumentAlert(group) : null;
    const health = group ? getHealthLabel(group) : null;

    return (
        <AnimatePresence>
            {open && group && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 24, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 18, scale: 0.98 }}
                        transition={{ duration: 0.25 }}
                        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[32px] border border-white/70 bg-white p-6 shadow-[0_20px_80px_rgba(15,23,42,0.2)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium text-violet-600">Chi tiết dashboard nhóm</p>
                                <h3 className="mt-2 text-2xl font-bold text-slate-900">{group.groupName}</h3>
                                <p className="mt-1 text-sm text-slate-500">Mã nhóm: {group.groupId}</p>
                            </div>

                            <button
                                type="button"
                                onClick={onClose}
                                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <SummaryCard
                                title="Tiến độ trung bình"
                                value={`${group.averageProgress}%`}
                                note="Hiệu suất hiện tại của nhóm"
                                icon={<Gauge className="h-5 w-5" />}
                                tone="success"
                            />
                            <SummaryCard
                                title="Task quá hạn"
                                value={group.overdueTaskCount}
                                note="Việc cần ưu tiên xử lý"
                                icon={<AlertTriangle className="h-5 w-5" />}
                                tone="danger"
                            />
                            <SummaryCard
                                title="Tổng tài liệu"
                                value={group.documentCount}
                                note="Số lượng tài liệu đang quản lý"
                                icon={<Files className="h-5 w-5" />}
                                tone="warning"
                            />
                            <SummaryCard
                                title="Upload tuần này"
                                value={group.weeklyDocumentUpload}
                                note="Theo dõi tốc độ tăng tài liệu"
                                icon={<FileWarning className="h-5 w-5" />}
                                tone="accent"
                            />
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
                            <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
                                <p className="text-sm text-slate-500">Trạng thái vận hành</p>
                                <div className="mt-3">
                                    <span
                                        className={cn(
                                            "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                                            health?.className
                                        )}
                                    >
                                        {health?.label}
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
                                <p className="text-sm text-slate-500">Cảnh báo tài liệu</p>
                                <div className="mt-3">
                                    <span
                                        className={cn(
                                            "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                                            docAlert?.className
                                        )}
                                    >
                                        {docAlert?.label}
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
                                <p className="text-sm text-slate-500">Tỷ lệ hoàn thành</p>
                                <p className="mt-2 text-2xl font-bold text-slate-900">
                                    {group.totalTaskCount > 0
                                        ? Math.round(
                                            (group.completedTaskCount / group.totalTaskCount) * 100
                                        )
                                        : 0}
                                    %
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="mb-4">
                                <h4 className="text-lg font-semibold text-slate-900">
                                    Tổng quan chỉ số của nhóm
                                </h4>
                                <p className="mt-1 text-sm text-slate-500">
                                    So sánh nhanh giữa task hoàn thành, còn lại, quá hạn và tài liệu.
                                </p>
                            </div>
                            <EChart option={detailOption} height={320} />
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default function AnalysisHome() {
    const [selectedGroupId, setSelectedGroupId] = React.useState<string>("all");
    const [sortBy, setSortBy] = React.useState<
        "total" | "progress" | "overdue" | "documents"
    >("total");
    const [selectedCompareGroupIds, setSelectedCompareGroupIds] = React.useState<string[]>([]);
    const [searchKeyword, setSearchKeyword] = React.useState("");
    const [healthFilter, setHealthFilter] = React.useState<"all" | "stable" | "watch" | "risk">(
        "all"
    );
    const [documentFilter, setDocumentFilter] = React.useState<
        "all" | "normal" | "warning"
    >("all");
    const [showOnlyOverdue, setShowOnlyOverdue] = React.useState(false);
    const [minProgress, setMinProgress] = React.useState<number>(0);
    const [modalGroup, setModalGroup] = React.useState<GroupAnalyticsItem | null>(null);

    const filteredData = React.useMemo(() => {
        let base =
            selectedGroupId === "all"
                ? mockData
                : mockData.filter((item) => item.groupId === selectedGroupId);

        base = base.filter((item) =>
            item.groupName.toLowerCase().includes(searchKeyword.trim().toLowerCase())
        );

        if (showOnlyOverdue) {
            base = base.filter((item) => item.overdueTaskCount > 0);
        }

        base = base.filter((item) => item.averageProgress >= minProgress);

        if (healthFilter !== "all") {
            base = base.filter((item) => {
                const health = getHealthLabel(item).label;
                if (healthFilter === "stable") return health === "Ổn định";
                if (healthFilter === "watch") return health === "Theo dõi";
                return health === "Cần chú ý";
            });
        }

        if (documentFilter !== "all") {
            base = base.filter((item) => {
                const status = getDocumentAlert(item).label;
                if (documentFilter === "warning") return status === "Cảnh báo";
                return status === "Ổn định" || status === "Theo dõi";
            });
        }

        const next = [...base];

        next.sort((a, b) => {
            if (sortBy === "progress") return b.averageProgress - a.averageProgress;
            if (sortBy === "overdue") return b.overdueTaskCount - a.overdueTaskCount;
            if (sortBy === "documents") return b.documentCount - a.documentCount;
            return b.totalTaskCount - a.totalTaskCount;
        });

        return next;
    }, [
        selectedGroupId,
        sortBy,
        searchKeyword,
        healthFilter,
        documentFilter,
        showOnlyOverdue,
        minProgress
    ]);

    React.useEffect(() => {
        setSelectedCompareGroupIds((prev) =>
            prev
                .filter((id) => filteredData.some((item) => item.groupId === id))
                .slice(0, MAX_COMPARE_GROUPS)
        );
    }, [filteredData]);

    const compareData = React.useMemo(() => {
        if (selectedCompareGroupIds.length === 0) return filteredData.slice(0, MAX_COMPARE_GROUPS);

        const mapped = selectedCompareGroupIds
            .map((id) => filteredData.find((item) => item.groupId === id))
            .filter(Boolean) as GroupAnalyticsItem[];

        return mapped.slice(0, MAX_COMPARE_GROUPS);
    }, [filteredData, selectedCompareGroupIds]);

    const totalGroups = filteredData.length;
    const totalTasks = filteredData.reduce((sum, item) => sum + item.totalTaskCount, 0);
    const totalOverdue = filteredData.reduce((sum, item) => sum + item.overdueTaskCount, 0);
    const totalDocuments = filteredData.reduce((sum, item) => sum + item.documentCount, 0);
    const warningDocumentGroups = filteredData.filter(
        (item) => getDocumentAlert(item).label === "Cảnh báo"
    ).length;

    const averageProgressAll =
        filteredData.length > 0
            ? Math.round(
                filteredData.reduce((sum, item) => sum + item.averageProgress, 0) /
                filteredData.length
            )
            : 0;

    const mostTasksGroup = filteredData[0]
        ? [...filteredData].sort((a, b) => b.totalTaskCount - a.totalTaskCount)[0]
        : null;

    const bestProgressGroup = filteredData[0]
        ? [...filteredData].sort((a, b) => b.averageProgress - a.averageProgress)[0]
        : null;

    const lowestProgressGroup = filteredData[0]
        ? [...filteredData].sort((a, b) => a.averageProgress - b.averageProgress)[0]
        : null;

    const highestOverdueGroup = filteredData[0]
        ? [...filteredData].sort((a, b) => b.overdueTaskCount - a.overdueTaskCount)[0]
        : null;

    const highestDocumentGroup = filteredData[0]
        ? [...filteredData].sort((a, b) => b.documentCount - a.documentCount)[0]
        : null;

    const progressGap =
        bestProgressGroup && lowestProgressGroup
            ? bestProgressGroup.averageProgress - lowestProgressGroup.averageProgress
            : 0;

    const groupNames = compareData.map((item) => item.groupName);
    const totalTaskSeries = compareData.map((item) => item.totalTaskCount);
    const overdueSeries = compareData.map((item) => item.overdueTaskCount);
    const progressSeries = compareData.map((item) => item.averageProgress);
    const documentSeries = compareData.map((item) => item.documentCount);

    const toggleCompareGroup = (groupId: string) => {
        setSelectedCompareGroupIds((prev) => {
            if (prev.includes(groupId)) {
                return prev.filter((id) => id !== groupId);
            }

            if (prev.length >= MAX_COMPARE_GROUPS) {
                return prev;
            }

            return [...prev, groupId];
        });
    };

    const clearCompareSelection = () => {
        setSelectedCompareGroupIds([]);
    };

    const resetFilters = () => {
        setSelectedGroupId("all");
        setSortBy("total");
        setSearchKeyword("");
        setHealthFilter("all");
        setDocumentFilter("all");
        setShowOnlyOverdue(false);
        setMinProgress(0);
    };

    const barChartOption = React.useMemo<echarts.EChartsOption>(
        () => ({
            animationDuration: 700,
            tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
            grid: {
                left: 36,
                right: 20,
                top: 24,
                bottom: 48,
                containLabel: true
            },
            xAxis: {
                type: "category",
                data: groupNames,
                axisTick: { show: false },
                axisLine: { lineStyle: { color: "#CBD5E1" } },
                axisLabel: { color: "#475569", interval: 0, rotate: groupNames.length > 5 ? 18 : 0 }
            },
            yAxis: {
                type: "value",
                minInterval: 1,
                axisLabel: { color: "#64748B" },
                splitLine: { lineStyle: { color: "#E2E8F0" } }
            },
            series: [
                {
                    name: "Tổng task",
                    type: "bar",
                    barWidth: 34,
                    data: totalTaskSeries,
                    label: {
                        show: true,
                        position: "top",
                        color: "#334155",
                        fontWeight: 600
                    },
                    itemStyle: {
                        borderRadius: [10, 10, 0, 0],
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: "#8B5CF6" },
                            { offset: 1, color: "#6366F1" }
                        ])
                    }
                }
            ]
        }),
        [groupNames, totalTaskSeries]
    );

    const overdueBarChartOption = React.useMemo<echarts.EChartsOption>(
        () => ({
            animationDuration: 700,
            tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
            grid: {
                left: 36,
                right: 20,
                top: 24,
                bottom: 48,
                containLabel: true
            },
            xAxis: {
                type: "category",
                data: groupNames,
                axisTick: { show: false },
                axisLine: { lineStyle: { color: "#CBD5E1" } },
                axisLabel: { color: "#475569", interval: 0, rotate: groupNames.length > 5 ? 18 : 0 }
            },
            yAxis: {
                type: "value",
                minInterval: 1,
                axisLabel: { color: "#64748B" },
                splitLine: { lineStyle: { color: "#E2E8F0" } }
            },
            series: [
                {
                    name: "Task quá hạn",
                    type: "bar",
                    barWidth: 34,
                    data: overdueSeries,
                    label: {
                        show: true,
                        position: "top",
                        color: "#334155",
                        fontWeight: 600
                    },
                    itemStyle: {
                        borderRadius: [10, 10, 0, 0],
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: "#FB7185" },
                            { offset: 1, color: "#EF4444" }
                        ])
                    }
                }
            ]
        }),
        [groupNames, overdueSeries]
    );

    const documentBarChartOption = React.useMemo<echarts.EChartsOption>(
        () => ({
            animationDuration: 700,
            tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
            grid: {
                left: 36,
                right: 20,
                top: 24,
                bottom: 48,
                containLabel: true
            },
            xAxis: {
                type: "category",
                data: groupNames,
                axisTick: { show: false },
                axisLine: { lineStyle: { color: "#CBD5E1" } },
                axisLabel: { color: "#475569", interval: 0, rotate: groupNames.length > 5 ? 18 : 0 }
            },
            yAxis: {
                type: "value",
                minInterval: 1,
                axisLabel: { color: "#64748B" },
                splitLine: { lineStyle: { color: "#E2E8F0" } }
            },
            series: [
                {
                    name: "Số tài liệu",
                    type: "bar",
                    barWidth: 34,
                    data: documentSeries,
                    label: {
                        show: true,
                        position: "top",
                        color: "#334155",
                        fontWeight: 600
                    },
                    markLine: {
                        symbol: "none",
                        label: {
                            formatter: `Ngưỡng cảnh báo: ${DOCUMENT_WARNING_THRESHOLD}`,
                            color: "#B45309"
                        },
                        lineStyle: {
                            type: "dashed",
                            color: "#F59E0B"
                        },
                        data: [{ yAxis: DOCUMENT_WARNING_THRESHOLD }]
                    },
                    itemStyle: {
                        borderRadius: [10, 10, 0, 0],
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: "#F59E0B" },
                            { offset: 1, color: "#F97316" }
                        ])
                    }
                }
            ]
        }),
        [groupNames, documentSeries]
    );

    const progressCompareBarOption = React.useMemo<echarts.EChartsOption>(
        () => ({
            animationDuration: 700,
            tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
            grid: {
                left: 36,
                right: 20,
                top: 24,
                bottom: 48,
                containLabel: true
            },
            xAxis: {
                type: "category",
                data: groupNames,
                axisTick: { show: false },
                axisLine: { lineStyle: { color: "#CBD5E1" } },
                axisLabel: { color: "#475569", interval: 0, rotate: groupNames.length > 5 ? 18 : 0 }
            },
            yAxis: {
                type: "value",
                min: 0,
                max: 100,
                axisLabel: {
                    color: "#64748B",
                    formatter: "{value}%"
                },
                splitLine: { lineStyle: { color: "#E2E8F0" } }
            },
            series: [
                {
                    name: "Tiến độ trung bình",
                    type: "bar",
                    barWidth: 34,
                    data: progressSeries,
                    label: {
                        show: true,
                        position: "top",
                        formatter: "{c}%",
                        color: "#334155",
                        fontWeight: 600
                    },
                    itemStyle: {
                        borderRadius: [10, 10, 0, 0],
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: "#10B981" },
                            { offset: 1, color: "#22C55E" }
                        ])
                    }
                }
            ]
        }),
        [groupNames, progressSeries]
    );

    const overduePieOption = React.useMemo<echarts.EChartsOption>(
        () => ({
            animationDuration: 700,
            tooltip: { trigger: "item" },
            legend: {
                bottom: 0,
                left: "center",
                textStyle: { color: "#475569", fontSize: 12 }
            },
            series: [
                {
                    name: "Task quá hạn",
                    type: "pie",
                    radius: ["42%", "68%"],
                    center: ["50%", "44%"],
                    avoidLabelOverlap: true,
                    minShowLabelAngle: 8,
                    label: {
                        show: true,
                        formatter: "{b}\n{d}%",
                        color: "#334155",
                        fontSize: 11
                    },
                    labelLine: {
                        show: true,
                        length: 10,
                        length2: 8
                    },
                    data: compareData.map((item) => ({
                        name: item.groupName,
                        value: item.overdueTaskCount
                    }))
                }
            ]
        }),
        [compareData]
    );

    const totalTaskPieOption = React.useMemo<echarts.EChartsOption>(
        () => ({
            animationDuration: 700,
            tooltip: { trigger: "item" },
            legend: {
                bottom: 0,
                left: "center",
                textStyle: { color: "#475569", fontSize: 12 }
            },
            series: [
                {
                    name: "Tổng task",
                    type: "pie",
                    radius: ["42%", "68%"],
                    center: ["50%", "44%"],
                    avoidLabelOverlap: true,
                    minShowLabelAngle: 8,
                    label: {
                        show: true,
                        formatter: "{b}\n{d}%",
                        color: "#334155",
                        fontSize: 11
                    },
                    labelLine: {
                        show: true,
                        length: 10,
                        length2: 8
                    },
                    data: compareData.map((item) => ({
                        name: item.groupName,
                        value: item.totalTaskCount
                    }))
                }
            ]
        }),
        [compareData]
    );

    const lineChartOption = React.useMemo<echarts.EChartsOption>(
        () => ({
            animationDuration: 700,
            tooltip: { trigger: "axis" },
            legend: {
                top: 0,
                right: 0,
                textStyle: {
                    color: "#64748B",
                    fontSize: 12
                },
                data: compareData.map((item) => item.groupName)
            },
            grid: {
                left: 36,
                right: 20,
                top: 42,
                bottom: 28,
                containLabel: true
            },
            xAxis: {
                type: "category",
                boundaryGap: false,
                data: ["Giai đoạn 1", "Giai đoạn 2", "Giai đoạn 3", "Giai đoạn 4", "Hiện tại"],
                axisTick: { show: false },
                axisLine: { lineStyle: { color: "#CBD5E1" } },
                axisLabel: { color: "#64748B" }
            },
            yAxis: {
                type: "value",
                min: 0,
                max: 100,
                axisLabel: {
                    color: "#64748B",
                    formatter: "{value}%"
                },
                splitLine: {
                    lineStyle: {
                        color: "#E2E8F0"
                    }
                }
            },
            series: compareData.map((item, index) => ({
                name: item.groupName,
                type: "line",
                smooth: true,
                symbol: "circle",
                symbolSize: 6,
                data: createProgressTrend(item),
                lineStyle: {
                    width: 3,
                    color: linePalette[index % linePalette.length]
                },
                itemStyle: {
                    color: linePalette[index % linePalette.length]
                },
                areaStyle:
                    index === 0
                        ? {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                {
                                    offset: 0,
                                    color: `${linePalette[index % linePalette.length]}33`
                                },
                                {
                                    offset: 1,
                                    color: `${linePalette[index % linePalette.length]}05`
                                }
                            ])
                        }
                        : undefined
            }))
        }),
        [compareData]
    );

    const scatterChartOption = React.useMemo<echarts.EChartsOption>(
        () => ({
            animationDuration: 700,
            tooltip: {
                trigger: "item",
                formatter: (params: any) => `
                    <div>
                        <div><strong>${params.data.groupName}</strong></div>
                        <div>Tổng task: ${params.data.value[0]}</div>
                        <div>Tiến độ TB: ${params.data.value[1]}%</div>
                        <div>Quá hạn: ${params.data.overdue}</div>
                        <div>Tài liệu: ${params.data.documents}</div>
                    </div>
                `
            },
            grid: {
                left: 44,
                right: 20,
                top: 24,
                bottom: 28,
                containLabel: true
            },
            xAxis: {
                type: "value",
                name: "Tổng task",
                minInterval: 1,
                nameTextStyle: { color: "#64748B" },
                axisLine: { lineStyle: { color: "#CBD5E1" } },
                axisLabel: { color: "#64748B" },
                splitLine: { lineStyle: { color: "#E2E8F0" } }
            },
            yAxis: {
                type: "value",
                name: "Tiến độ %",
                min: 0,
                max: 100,
                nameTextStyle: { color: "#64748B" },
                axisLine: { lineStyle: { color: "#CBD5E1" } },
                axisLabel: {
                    color: "#64748B",
                    formatter: "{value}%"
                },
                splitLine: { lineStyle: { color: "#E2E8F0" } }
            },
            series: [
                {
                    name: "Tương quan khối lượng & tiến độ",
                    type: "scatter",
                    data: compareData.map((item) => ({
                        value: [item.totalTaskCount, item.averageProgress],
                        groupName: item.groupName,
                        overdue: item.overdueTaskCount,
                        documents: item.documentCount,
                        symbolSize: Math.max(18, item.overdueTaskCount * 4 + 12)
                    })),
                    itemStyle: {
                        color: "#F97316",
                        shadowBlur: 12,
                        shadowColor: "rgba(249,115,22,0.25)"
                    }
                }
            ]
        }),
        [compareData]
    );

    return (
        <>
            <div className="relative overflow-hidden bg-[linear-gradient(180deg,#F8FAFC_0%,#F7F7FF_34%,#F4F7FB_66%,#F1F5F9_100%)]">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute left-[-80px] top-[-40px] h-72 w-72 rounded-full bg-violet-200/25 blur-3xl" />
                    <div className="absolute right-[-80px] top-[18%] h-80 w-80 rounded-full bg-sky-200/20 blur-3xl" />
                    <div className="absolute bottom-[-120px] left-[15%] h-96 w-96 rounded-full bg-emerald-100/20 blur-3xl" />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:28px_28px] opacity-40" />
                </div>

                <Container className="relative pb-8 pt-8">
                    <div className="space-y-8">
                        <SectionReveal>
                            <section className="relative overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0.68))] px-6 py-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.14),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.10),transparent_30%)]" />

                                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0">
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.96 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ duration: 0.35 }}
                                            className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50/90 px-3 py-1.5 text-xs font-medium text-violet-700 shadow-sm"
                                        >
                                            <Sparkles className="h-3.5 w-3.5" />
                                            Dashboard phân tích nâng cao
                                        </motion.div>

                                        <h1 className="mt-4 bg-[linear-gradient(135deg,#0F172A_0%,#4338CA_55%,#0F766E_100%)] bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-[38px]">
                                            Phân tích hiệu quả công việc theo nhóm
                                        </h1>

                                        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
                                            So sánh khối lượng công việc, task quá hạn, tiến độ trung bình, mức
                                            tăng tài liệu và cảnh báo nhóm đang upload quá nhiều tài liệu.
                                        </p>

                                        <div className="mt-4">
                                            <HomeTopTabs />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <select
                                            value={selectedGroupId}
                                            onChange={(e) => setSelectedGroupId(e.target.value)}
                                            className="h-11 rounded-2xl border border-white/80 bg-white/80 px-4 text-sm text-slate-700 shadow-sm outline-none"
                                        >
                                            <option value="all">Tất cả nhóm</option>
                                            {mockData.map((item) => (
                                                <option key={item.groupId} value={item.groupId}>
                                                    {item.groupName}
                                                </option>
                                            ))}
                                        </select>

                                        <select
                                            value={sortBy}
                                            onChange={(e) =>
                                                setSortBy(
                                                    e.target.value as
                                                    | "total"
                                                    | "progress"
                                                    | "overdue"
                                                    | "documents"
                                                )
                                            }
                                            className="h-11 rounded-2xl border border-white/80 bg-white/80 px-4 text-sm text-slate-700 shadow-sm outline-none"
                                        >
                                            <option value="total">Sắp xếp theo tổng task</option>
                                            <option value="progress">Sắp xếp theo tiến độ</option>
                                            <option value="overdue">Sắp xếp theo quá hạn</option>
                                            <option value="documents">Sắp xếp theo tài liệu</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="relative mt-5 rounded-[24px] border border-white/80 bg-white/70 p-4 shadow-sm backdrop-blur">
                                    <div className="mb-4 flex items-center gap-2">
                                        <Filter className="h-4 w-4 text-violet-600" />
                                        <p className="text-sm font-semibold text-slate-800">Bộ lọc nâng cao</p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                                        <div className="relative">
                                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <input
                                                value={searchKeyword}
                                                onChange={(e) => setSearchKeyword(e.target.value)}
                                                placeholder="Tìm tên nhóm..."
                                                className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 outline-none"
                                            />
                                        </div>

                                        <select
                                            value={healthFilter}
                                            onChange={(e) =>
                                                setHealthFilter(
                                                    e.target.value as "all" | "stable" | "watch" | "risk"
                                                )
                                            }
                                            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none"
                                        >
                                            <option value="all">Mọi trạng thái</option>
                                            <option value="stable">Ổn định</option>
                                            <option value="watch">Theo dõi</option>
                                            <option value="risk">Cần chú ý</option>
                                        </select>

                                        <select
                                            value={documentFilter}
                                            onChange={(e) =>
                                                setDocumentFilter(
                                                    e.target.value as "all" | "normal" | "warning"
                                                )
                                            }
                                            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none"
                                        >
                                            <option value="all">Mọi mức tài liệu</option>
                                            <option value="normal">Bình thường / theo dõi</option>
                                            <option value="warning">Chỉ nhóm cảnh báo</option>
                                        </select>

                                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-sm text-slate-600">
                                                    Progress tối thiểu
                                                </span>
                                                <span className="text-sm font-semibold text-slate-900">
                                                    {minProgress}%
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min={0}
                                                max={100}
                                                step={5}
                                                value={minProgress}
                                                onChange={(e) => setMinProgress(Number(e.target.value))}
                                                className="mt-2 w-full"
                                            />
                                        </div>

                                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                            <input
                                                id="overdue-only"
                                                type="checkbox"
                                                checked={showOnlyOverdue}
                                                onChange={(e) => setShowOnlyOverdue(e.target.checked)}
                                                className="h-4 w-4 rounded border-slate-300"
                                            />
                                            <label
                                                htmlFor="overdue-only"
                                                className="text-sm text-slate-700"
                                            >
                                                Chỉ hiện nhóm có task quá hạn
                                            </label>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={resetFilters}
                                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                        >
                                            Reset filter
                                        </button>

                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                                            Kết quả: {filteredData.length} nhóm
                                        </span>
                                    </div>
                                </div>

                                <div className="relative mt-5 rounded-[24px] border border-white/80 bg-white/70 p-4 shadow-sm backdrop-blur">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">
                                                Chọn nhóm để so sánh
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                Tối đa {MAX_COMPARE_GROUPS} nhóm. Nếu không chọn, hệ thống sẽ dùng
                                                danh sách hiện tại sau khi lọc.
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                                                Đã chọn: {selectedCompareGroupIds.length}/{MAX_COMPARE_GROUPS}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={clearCompareSelection}
                                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                            >
                                                Xóa chọn
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                        {filteredData.map((group) => {
                                            const checked = selectedCompareGroupIds.includes(group.groupId);
                                            const disabled =
                                                !checked &&
                                                selectedCompareGroupIds.length >= MAX_COMPARE_GROUPS;
                                            const docStatus = getDocumentAlert(group);

                                            return (
                                                <label
                                                    key={group.groupId}
                                                    className={cn(
                                                        "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition",
                                                        checked
                                                            ? "border-violet-300 bg-violet-50"
                                                            : "border-slate-200 bg-white hover:bg-slate-50",
                                                        disabled && "cursor-not-allowed opacity-50"
                                                    )}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600"
                                                        checked={checked}
                                                        disabled={disabled}
                                                        onChange={() => toggleCompareGroup(group.groupId)}
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="font-semibold text-slate-900">
                                                                {group.groupName}
                                                            </div>
                                                            <span
                                                                className={cn(
                                                                    "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                                                                    docStatus.className
                                                                )}
                                                            >
                                                                {docStatus.label}
                                                            </span>
                                                        </div>
                                                        <div className="mt-1 text-xs text-slate-500">
                                                            {group.totalTaskCount} task • {group.averageProgress}% progress
                                                            • {group.overdueTaskCount} quá hạn • {group.documentCount} tài
                                                            liệu
                                                        </div>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            </section>
                        </SectionReveal>

                        <SectionReveal delay={0.04}>
                            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                                <SummaryCard
                                    title="Số nhóm đang xem"
                                    value={totalGroups}
                                    note="Nhóm nằm trong phạm vi lọc hiện tại"
                                    icon={<Layers3 className="h-5 w-5" />}
                                    tone="accent"
                                />
                                <SummaryCard
                                    title="Tổng số task"
                                    value={totalTasks}
                                    note="Khối lượng công việc của các nhóm"
                                    icon={<BarChart3 className="h-5 w-5" />}
                                />
                                <SummaryCard
                                    title="Task quá hạn"
                                    value={totalOverdue}
                                    note="Khối lượng việc cần ưu tiên xử lý"
                                    icon={<AlertTriangle className="h-5 w-5" />}
                                    tone="danger"
                                />
                                <SummaryCard
                                    title="Tiến độ trung bình"
                                    value={`${averageProgressAll}%`}
                                    note="Hiệu suất trung bình toàn bộ nhóm"
                                    icon={<Gauge className="h-5 w-5" />}
                                    tone="success"
                                />
                                <SummaryCard
                                    title="Tổng tài liệu"
                                    value={totalDocuments}
                                    note={`${warningDocumentGroups} nhóm đang ở mức cảnh báo`}
                                    icon={<Files className="h-5 w-5" />}
                                    tone="warning"
                                />
                            </section>
                        </SectionReveal>

                        <SectionReveal delay={0.08}>
                            <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
                                <InsightCard
                                    title="Nhóm có tải việc cao nhất"
                                    value={mostTasksGroup?.groupName ?? "-"}
                                    description={
                                        mostTasksGroup
                                            ? `${mostTasksGroup.totalTaskCount} task đang được quản lý.`
                                            : "-"
                                    }
                                    tone="accent"
                                />

                                <InsightCard
                                    title="Nhóm có tiến độ tốt nhất"
                                    value={bestProgressGroup?.groupName ?? "-"}
                                    description={
                                        bestProgressGroup
                                            ? `Tiến độ trung bình đạt ${bestProgressGroup.averageProgress}%.`
                                            : "-"
                                    }
                                    tone="success"
                                />

                                <InsightCard
                                    title="Nhóm cần chú ý nhất"
                                    value={highestOverdueGroup?.groupName ?? "-"}
                                    description={
                                        highestOverdueGroup
                                            ? `${highestOverdueGroup.overdueTaskCount} task đang quá hạn.`
                                            : "-"
                                    }
                                    tone="danger"
                                />

                                <InsightCard
                                    title="Nhóm up tài liệu nhiều nhất"
                                    value={highestDocumentGroup?.groupName ?? "-"}
                                    description={
                                        highestDocumentGroup
                                            ? `${highestDocumentGroup.documentCount} tài liệu đang được quản lý.`
                                            : "-"
                                    }
                                    tone="warning"
                                />
                            </section>
                        </SectionReveal>

                        <SectionReveal delay={0.12}>
                            <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                                <div className="xl:col-span-8 rounded-[30px] border border-white/70 bg-white/80 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                                    <div className="mb-5">
                                        <h2 className="text-lg font-semibold text-slate-900">
                                            So sánh số lượng công việc theo nhóm
                                        </h2>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Biểu đồ cột có ghi tên nhóm ở trục dưới để nhìn nhanh nhóm nào đang có
                                            nhiều hoặc ít task hơn.
                                        </p>
                                    </div>
                                    <EChart option={barChartOption} height={360} />
                                </div>

                                <div className="xl:col-span-4 grid grid-cols-1 gap-4">
                                    <div className="rounded-[30px] border border-white/70 bg-white/80 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                                        <div className="mb-5">
                                            <h2 className="text-lg font-semibold text-slate-900">
                                                Tỷ trọng task quá hạn
                                            </h2>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Theo dõi nhóm nào đang chiếm tỷ lệ quá hạn cao hơn.
                                            </p>
                                        </div>
                                        <EChart option={overduePieOption} height={260} />
                                    </div>

                                    <div className="rounded-[30px] border border-white/70 bg-white/80 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                                        <div className="mb-5">
                                            <h2 className="text-lg font-semibold text-slate-900">
                                                Tỷ trọng tổng task
                                            </h2>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Thể hiện phân bổ khối lượng công việc giữa các nhóm.
                                            </p>
                                        </div>
                                        <EChart option={totalTaskPieOption} height={260} />
                                    </div>
                                </div>
                            </section>
                        </SectionReveal>

                        <SectionReveal delay={0.16}>
                            <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                                <div className="rounded-[30px] border border-white/70 bg-white/80 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                                    <div className="mb-5">
                                        <h2 className="text-lg font-semibold text-slate-900">
                                            So sánh tiến độ trung bình
                                        </h2>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Biểu đồ cột so sánh trực tiếp tiến độ của từng nhóm.
                                        </p>
                                    </div>
                                    <EChart option={progressCompareBarOption} height={320} />
                                </div>

                                <div className="rounded-[30px] border border-white/70 bg-white/80 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                                    <div className="mb-5">
                                        <h2 className="text-lg font-semibold text-slate-900">
                                            Task quá hạn theo nhóm
                                        </h2>
                                        <p className="mt-1 text-sm text-slate-500">
                                            So sánh trực tiếp số lượng công việc quá hạn.
                                        </p>
                                    </div>
                                    <EChart option={overdueBarChartOption} height={320} />
                                </div>

                                <div className="rounded-[30px] border border-white/70 bg-white/80 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                                    <div className="mb-5">
                                        <h2 className="text-lg font-semibold text-slate-900">
                                            Cảnh báo tài liệu theo nhóm
                                        </h2>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Dùng để xem nhóm nào đang upload hoặc giữ quá nhiều tài liệu.
                                        </p>
                                    </div>
                                    <EChart option={documentBarChartOption} height={320} />
                                </div>
                            </section>
                        </SectionReveal>

                        <SectionReveal delay={0.2}>
                            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                <div className="rounded-[30px] border border-white/70 bg-white/80 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                                    <div className="mb-5">
                                        <h2 className="text-lg font-semibold text-slate-900">
                                            Xu hướng tiến độ theo từng nhóm
                                        </h2>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Mỗi nhóm là một đường riêng để theo dõi tiến độ qua các giai đoạn.
                                        </p>
                                    </div>
                                    <EChart option={lineChartOption} height={320} />
                                </div>

                                <div className="rounded-[30px] border border-white/70 bg-white/80 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                                    <div className="mb-5">
                                        <h2 className="text-lg font-semibold text-slate-900">
                                            Tương quan khối lượng và tiến độ
                                        </h2>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Nhìn ra nhóm nào đang tải việc nặng nhưng tiến độ chưa tương xứng.
                                        </p>
                                    </div>
                                    <EChart option={scatterChartOption} height={320} />
                                </div>
                            </section>
                        </SectionReveal>

                        <SectionReveal delay={0.24}>
                            <section className="overflow-hidden rounded-[30px] border border-white/70 bg-white/80 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                                <div className="flex flex-col gap-2 border-b border-slate-200/80 px-6 py-5 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold text-slate-900">
                                            Bảng xếp hạng nhóm
                                        </h2>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Theo dõi task, quá hạn, tiến độ trung bình, tài liệu và mở modal để xem
                                            chi tiết dashboard của từng nhóm.
                                        </p>
                                    </div>

                                    <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700">
                                        <TrendingUp className="h-3.5 w-3.5" />
                                        Advanced analytics
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="min-w-full border-collapse">
                                        <thead>
                                            <tr className="bg-[linear-gradient(180deg,#F8FAFC_0%,#F1F5F9_100%)]">
                                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-500">
                                                    Nhóm
                                                </th>
                                                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-500">
                                                    Tổng task
                                                </th>
                                                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-500">
                                                    Hoàn thành
                                                </th>
                                                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-500">
                                                    Còn lại
                                                </th>
                                                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-500">
                                                    Quá hạn
                                                </th>
                                                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-500">
                                                    Tài liệu
                                                </th>
                                                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-500">
                                                    Tiến độ TB
                                                </th>
                                                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-500">
                                                    Cảnh báo TL
                                                </th>
                                                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-500">
                                                    Đánh giá
                                                </th>
                                                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-500">
                                                    Chi tiết
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredData.map((group) => {
                                                const health = getHealthLabel(group);
                                                const docAlert = getDocumentAlert(group);

                                                return (
                                                    <tr
                                                        key={group.groupId}
                                                        className="border-t border-slate-200/70 hover:bg-slate-50/70"
                                                    >
                                                        <td className="px-6 py-4">
                                                            <div className="font-semibold text-slate-900">
                                                                {group.groupName}
                                                            </div>
                                                            <div className="mt-1 text-xs text-slate-400">
                                                                ID: {group.groupId}
                                                            </div>
                                                        </td>

                                                        <td className="px-6 py-4 text-center text-sm font-medium text-slate-700">
                                                            {group.totalTaskCount}
                                                        </td>

                                                        <td className="px-6 py-4 text-center text-sm font-medium text-emerald-600">
                                                            {group.completedTaskCount}
                                                        </td>

                                                        <td className="px-6 py-4 text-center text-sm font-medium text-violet-600">
                                                            {group.remainingTaskCount}
                                                        </td>

                                                        <td className="px-6 py-4 text-center text-sm font-medium text-red-500">
                                                            {group.overdueTaskCount}
                                                        </td>

                                                        <td className="px-6 py-4 text-center text-sm font-medium text-amber-600">
                                                            {group.documentCount}
                                                        </td>

                                                        <td className="px-6 py-4 text-center">
                                                            <div className="mx-auto w-[140px]">
                                                                <div className="mb-1 flex items-center justify-between text-xs">
                                                                    <span className="text-slate-500">Progress</span>
                                                                    <span className="font-semibold text-slate-700">
                                                                        {group.averageProgress}%
                                                                    </span>
                                                                </div>
                                                                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                                                                    <div
                                                                        className="h-full rounded-full bg-[linear-gradient(90deg,#10B981_0%,#22C55E_100%)]"
                                                                        style={{ width: `${group.averageProgress}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td className="px-6 py-4 text-center">
                                                            <span
                                                                className={cn(
                                                                    "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                                                                    docAlert.className
                                                                )}
                                                            >
                                                                {docAlert.label}
                                                            </span>
                                                        </td>

                                                        <td className="px-6 py-4 text-center">
                                                            <span
                                                                className={cn(
                                                                    "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                                                                    health.className
                                                                )}
                                                            >
                                                                {health.label}
                                                            </span>
                                                        </td>

                                                        <td className="px-6 py-4 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => setModalGroup(group)}
                                                                className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                                                            >
                                                                Xem chi tiết
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </SectionReveal>

                        <SectionReveal delay={0.28}>
                            <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-2xl bg-orange-50 p-2 text-orange-600">
                                            <Target className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">Gợi ý hành động</p>
                                            <p className="text-sm text-slate-500">Ưu tiên nhóm có nhiều việc trễ hạn</p>
                                        </div>
                                    </div>
                                    <p className="mt-4 text-sm leading-7 text-slate-600">
                                        Nhóm <strong>{highestOverdueGroup?.groupName ?? "-"}</strong> đang có số lượng
                                        task quá hạn cao nhất. Nên rà soát lại phân bổ đầu việc và deadline.
                                    </p>
                                </div>

                                <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-2xl bg-emerald-50 p-2 text-emerald-600">
                                            <Gauge className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">Nhóm hiệu quả cao</p>
                                            <p className="text-sm text-slate-500">Tiến độ đang ổn định</p>
                                        </div>
                                    </div>
                                    <p className="mt-4 text-sm leading-7 text-slate-600">
                                        Nhóm <strong>{bestProgressGroup?.groupName ?? "-"}</strong> đang có tiến độ
                                        trung bình tốt nhất, phù hợp để tham chiếu cách vận hành.
                                    </p>
                                </div>

                                <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-2xl bg-violet-50 p-2 text-violet-600">
                                            <BarChart3 className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">Khoảng cách tiến độ</p>
                                            <p className="text-sm text-slate-500">Độ lệch trung bình giữa các nhóm</p>
                                        </div>
                                    </div>
                                    <p className="mt-4 text-sm leading-7 text-slate-600">
                                        Chênh lệch giữa nhóm cao nhất và thấp nhất hiện là{" "}
                                        <strong>{progressGap}%</strong>. Đây là chỉ số nên theo dõi để cân bằng năng lực
                                        thực thi.
                                    </p>
                                </div>

                                <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-2xl bg-amber-50 p-2 text-amber-600">
                                            <Files className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">Cảnh báo tài liệu</p>
                                            <p className="text-sm text-slate-500">Theo dõi nhóm up tài liệu nhiều</p>
                                        </div>
                                    </div>
                                    <p className="mt-4 text-sm leading-7 text-slate-600">
                                        Nhóm <strong>{highestDocumentGroup?.groupName ?? "-"}</strong> hiện có số lượng
                                        tài liệu cao nhất. Cần xem thêm việc phân loại và kiểm soát tốc độ upload.
                                    </p>
                                </div>
                            </section>
                        </SectionReveal>
                    </div>
                </Container>
            </div>

            <GroupDetailModal
                open={!!modalGroup}
                group={modalGroup}
                onClose={() => setModalGroup(null)}
            />
        </>
    );
}