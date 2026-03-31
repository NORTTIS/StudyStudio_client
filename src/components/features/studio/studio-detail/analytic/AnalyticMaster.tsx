"use client";

import * as echarts from "echarts";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, Layers3, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import * as React from "react";

import {
    getGroupSummary,
    getStudioCompletionTrend,
    getStudioGroupActivity,
    getStudioOverview,
    type MemberActivitySummary,
    type MemberContributionData,
    type StudioCompletionTrendResponse,
    type StudioGroupActivityResponse,
    type StudioGroupData,
    type StudioOverviewResponse,
    type StudioTrendPoint
} from "@/api/analytics";
import { formatRelativeTime } from "@/lib/utils";

import { GroupProgressChart } from "../GroupProgressChart";
import { StudioDateRange } from "../StudioDateRange";
import type { GroupProgress } from "../types";
import StudioAnalyticsDocuments from "./StudioAnalyticsDocuments";
import StudioGroupHeatmap from "./StudioGroupHeatmap";

type TimeViewMode = "week" | "month" | "year";
type HeatmapRangeFilter = "week" | "month";

const _STATUS_META: Array<{
    key: "todo" | "inProgress" | "done" | "overdue";
    label: string;
    color: string;
}> = [
    { key: "todo", label: "To do", color: "#3b82f6" },
    { key: "inProgress", label: "In progress", color: "#f59e0b" },
    { key: "done", label: "Done", color: "#10b981" },
    { key: "overdue", label: "Overdue", color: "#ef4444" }
];

// Consistent colors for groups across all charts
const GROUP_COLORS = [
    "#3b82f6", // blue
    "#f97316", // orange
    "#10b981", // emerald
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#14b8a6", // teal
    "#f59e0b", // amber
    "#6366f1", // indigo
    "#84cc16", // lime
    "#e11d48" // rose
];

// Get group color - use groupColor if available, otherwise generate consistent color from groupId
function getGroupColor(groupColor: string | null | undefined, groupId: string | undefined): string {
    if (groupColor && groupColor !== "null" && groupColor.trim() !== "") return groupColor;
    if (!groupId) return "#94a3b8";

    // Generate consistent color from groupId hash
    let hash = 0;
    for (let i = 0; i < groupId.length; i++) {
        hash = (hash << 5) - hash + groupId.charCodeAt(i);
        hash = hash & hash;
    }
    return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length];
}

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

// ──────────────────────────────────────────────
// EChart wrapper
// ──────────────────────────────────────────────
function EChart({ option, height = 320 }: { option: echarts.EChartsOption; height?: number }) {
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
                chartRef.current?.resize({ animation: { duration: 260, easing: "cubicOut" } });
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
    }, [option]);

    React.useEffect(() => {
        if (!chartRef.current) return;
        chartRef.current.setOption(option, { notMerge: true, lazyUpdate: true });
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        frameRef.current = requestAnimationFrame(() => {
            chartRef.current?.resize({ animation: { duration: 260, easing: "cubicOut" } });
        });
    }, [option]);

    return <div ref={ref} style={{ width: "100%", height }} />;
}

// ──────────────────────────────────────────────
// Shared UI components
// ──────────────────────────────────────────────
function SectionTitle({ title, description }: { title: string; description?: string }) {
    return (
        <div className="mb-5">
            <h2 className="font-semibold text-lg text-slate-900">{title}</h2>
            {description ? <p className="mt-1 text-slate-500 text-sm">{description}</p> : null}
        </div>
    );
}

function LoadingSkeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse rounded-xl bg-slate-200 ${className ?? ""}`} />;
}

// ──────────────────────────────────────────────
// Time navigation helpers
// ──────────────────────────────────────────────
function pad2(value: number) {
    return String(value).padStart(2, "0");
}

function getRangeLabel(date: Date, mode: TimeViewMode, labels?: { monthPrefix: string; yearPrefix: string }) {
    if (mode === "week") {
        const day = date.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const start = new Date(date);
        start.setDate(date.getDate() + diff);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return `${pad2(start.getDate())}/${pad2(start.getMonth() + 1)} – ${pad2(end.getDate())}/${pad2(end.getMonth() + 1)}/${end.getFullYear()}`;
    }
    if (mode === "month") return `${labels?.monthPrefix ?? "Month"} ${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
    return `${labels?.yearPrefix ?? "Year"} ${date.getFullYear()}`;
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

function dateToString(date: Date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
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
    const t = useTranslations("AnalyticMaster");

    const tabs: Array<{ key: TimeViewMode; label: string }> = [
        { key: "week", label: t("time.week") },
        { key: "month", label: t("time.month") },
        { key: "year", label: t("time.year") }
    ];

    return (
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => onModeChange(tab.key)}
                        className={cn(
                            "rounded-xl px-4 py-2 font-medium text-sm transition",
                            tab.key === mode
                                ? "bg-white text-orange-600 shadow-sm"
                                : "text-slate-500 hover:text-orange-600"
                        )}>
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-1">
                <button
                    type="button"
                    onClick={onPrev}
                    className="rounded-xl px-3 py-2 text-slate-500 transition hover:bg-white hover:text-slate-900">
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="whitespace-nowrap px-2 text-center font-medium text-slate-700 text-sm">
                    {rangeLabel}
                </div>
                <button
                    type="button"
                    onClick={onNext}
                    className="rounded-xl px-3 py-2 text-slate-500 transition hover:bg-white hover:text-slate-900">
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────
// Compare Group Picker
// ──────────────────────────────────────────────
function CompareGroupPicker({
    groups,
    selectedIds,
    onChange,
    title,
    description,
    triggerLabel
}: {
    groups: StudioGroupData[];
    selectedIds: string[];
    onChange: (value: string[]) => void;
    title: string;
    description: string;
    triggerLabel: string;
}) {
    const t = useTranslations("AnalyticMaster");
    const [open, setOpen] = React.useState(false);
    const wrapRef = React.useRef<HTMLDivElement | null>(null);

    const selectedGroups = React.useMemo(
        () => groups.filter((g) => selectedIds.includes(g.groupId ?? "")),
        [groups, selectedIds]
    );

    const toggle = (id: string) => {
        if (selectedIds.includes(id)) {
            const next = selectedIds.filter((item) => item !== id);
            onChange(next.length ? next : [id]);
        } else {
            onChange([...selectedIds, id]);
        }
    };

    const selectTopFour = () => onChange(groups.slice(0, 4).map((g) => g.groupId ?? ""));
    const clearToFirst = () => onChange(groups[0] ? [groups[0].groupId ?? ""] : []);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
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
                    open ? "border-orange-300 ring-4 ring-orange-100" : "border-slate-200 hover:border-orange-200"
                )}>
                <div className="min-w-0 text-left">
                    <div className="font-medium text-slate-400 text-xs uppercase tracking-[0.14em]">{triggerLabel}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        {selectedGroups.length ? (
                            selectedGroups.slice(0, 4).map((g) => (
                                <span
                                    key={g.groupId}
                                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 text-xs shadow-sm">
                                    <span
                                        className="h-2 w-2 rounded-full"
                                        style={{ backgroundColor: getGroupColor(g.groupColor, g.groupId) }}
                                    />
                                    {g.groupName}
                                </span>
                            ))
                        ) : (
                            <span className="text-slate-500 text-sm">{t("compare.noGroupSelected")}</span>
                        )}
                        {selectedGroups.length > 4 ? (
                            <span className="rounded-full bg-orange-50 px-3 py-1.5 font-semibold text-orange-700 text-xs">
                                {t("compare.moreGroups", { count: selectedGroups.length - 4 })}
                            </span>
                        ) : null}
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                    <div className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-700 text-xs">
                        {t("compare.selectedCount", { count: selectedGroups.length })}
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
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="relative z-30 mt-3">
                        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 shadow-[0_30px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl">
                            <div className="border-slate-100 border-b bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,252,0.9))] px-5 py-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="font-semibold text-base text-slate-900">{title}</div>
                                        <div className="mt-1 text-slate-500 text-sm">{description}</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setOpen(false)}
                                        className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={selectTopFour}
                                        className="rounded-full bg-blue-50 px-3 py-2 font-semibold text-blue-700 text-xs transition hover:bg-blue-100">
                                        {t("compare.topFourDefault")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={clearToFirst}
                                        className="rounded-full bg-orange-50 px-3 py-2 font-semibold text-orange-700 text-xs transition hover:bg-orange-100">
                                        {t("compare.keepOneGroup")}
                                    </button>
                                </div>
                            </div>
                            <div className="max-h-[280px] overflow-y-auto p-4">
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                    {groups.map((g) => {
                                        const active = selectedIds.includes(g.groupId ?? "");
                                        return (
                                            <button
                                                key={g.groupId}
                                                type="button"
                                                onClick={() => toggle(g.groupId ?? "")}
                                                className={cn(
                                                    "flex items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-left transition-all duration-200",
                                                    active
                                                        ? "border-orange-200 bg-orange-50"
                                                        : "border-slate-200 bg-white hover:border-orange-200"
                                                )}>
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <span
                                                        className="h-3 w-3 shrink-0 rounded-full"
                                                        style={{
                                                            backgroundColor: getGroupColor(g.groupColor, g.groupId)
                                                        }}
                                                    />
                                                    <span
                                                        className={cn(
                                                            "truncate font-medium text-sm",
                                                            active ? "text-orange-700" : "text-slate-800"
                                                        )}>
                                                        {g.groupName}
                                                    </span>
                                                </div>
                                                <div
                                                    className={cn(
                                                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all",
                                                        active
                                                            ? "border-orange-500 bg-orange-500 text-white"
                                                            : "border-slate-300 bg-white text-transparent"
                                                    )}>
                                                    <Check className="h-3.5 w-3.5" />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 border-slate-100 border-t bg-slate-50/70 px-5 py-4">
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="rounded-full bg-orange-500 px-4 py-2 font-semibold text-sm text-white transition hover:opacity-90">
                                    {t("common.done")}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ──────────────────────────────────────────────
// Chart 2: Group donut select
// ──────────────────────────────────────────────
function GroupSelect({
    groups,
    value,
    onChange
}: {
    groups: StudioGroupData[];
    value: string;
    onChange: (value: string) => void;
}) {
    const t = useTranslations("AnalyticMaster");
    const [open, setOpen] = React.useState(false);
    const wrapRef = React.useRef<HTMLDivElement | null>(null);

    const selected = React.useMemo(() => groups.find((g) => g.groupId === value) ?? groups[0], [groups, value]);

    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
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
                onClick={() => setOpen((p) => !p)}
                className={cn(
                    "group relative flex h-14 w-full items-center justify-between overflow-hidden rounded-[20px] border px-4",
                    "bg-white/95 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur",
                    "transition-all duration-200",
                    open ? "border-orange-300 ring-4 ring-orange-100" : "border-slate-200 hover:border-orange-200"
                )}>
                <div className="flex min-w-0 items-center gap-3">
                    <span
                        className="h-3 w-3 shrink-0 rounded-full shadow-sm"
                        style={{ backgroundColor: getGroupColor(selected?.groupColor, selected?.groupId) }}
                    />
                    <div className="min-w-0 text-left">
                        <div className="font-medium text-slate-400 text-xs">{t("groupSelect.selectGroup")}</div>
                        <div className="truncate font-semibold text-slate-800 text-sm">{selected?.groupName}</div>
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
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 8, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="absolute right-0 left-0 z-30">
                        <div className="mt-2 overflow-hidden rounded-[22px] border border-slate-200 bg-white/98 p-2 shadow-[0_20px_50px_rgba(15,23,42,0.14)] backdrop-blur-xl">
                            <div className="max-h-[280px] overflow-y-auto pr-1">
                                {groups.map((g) => {
                                    const active = g.groupId === value;
                                    return (
                                        <button
                                            key={g.groupId}
                                            type="button"
                                            onClick={() => {
                                                onChange(g.groupId ?? "");
                                                setOpen(false);
                                            }}
                                            className={cn(
                                                "flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition-all duration-150",
                                                active
                                                    ? "bg-orange-50 text-orange-700"
                                                    : "text-slate-700 hover:bg-slate-50"
                                            )}>
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span
                                                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                                                    style={{ backgroundColor: getGroupColor(g.groupColor, g.groupId) }}
                                                />
                                                <span className="truncate font-medium text-sm">{g.groupName}</span>
                                            </div>
                                            {active && (
                                                <span className="rounded-full bg-orange-100 px-2 py-1 font-semibold text-[11px] text-orange-700">
                                                    {t("groupSelect.selected")}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ──────────────────────────────────────────────
// Chart 6: Member progress modals
// ──────────────────────────────────────────────
type MemberProgressItem = {
    id: string;
    name: string;
    completedTasks: number;
    totalTasks: number;
    lastActivity: string;
    contributionScoreRate?: number;
    totalScore?: number;
    completedScore?: number;
    createdScore?: number;
    updatedScore?: number;
    messagesSent?: number;
};

function getPercent(completed: number, total: number) {
    if (!total) return 0;
    return Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
}

function getMemberStatus(percent: number) {
    if (percent >= 70)
        return { labelKey: "member.status.onTrack", textClass: "text-emerald-600", barClass: "bg-emerald-500" };
    if (percent >= 40)
        return { labelKey: "member.status.needAttention", textClass: "text-orange-500", barClass: "bg-orange-500" };
    return { labelKey: "member.status.behindSchedule", textClass: "text-red-500", barClass: "bg-red-500" };
}

function MemberProgressCard({ member, onClick }: { member: MemberProgressItem; onClick?: () => void }) {
    const t = useTranslations("AnalyticMaster");
    const percent = getPercent(member.completedTasks, member.totalTasks);
    const tone = getMemberStatus(percent);

    return (
        <div
            className={cn(
                "cursor-pointer rounded-[18px] border border-slate-200 bg-slate-50/80 p-4 transition-all duration-200 hover:border-orange-300 hover:bg-orange-50/50 hover:shadow-md",
                onClick && "active:scale-[0.98]"
            )}
            onClick={onClick}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? (e) => e.key === "Enter" && onClick?.() : undefined}>
            <div className="mb-2.5 flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                    <Layers3 className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    <h3 className="truncate font-semibold text-[14px] text-slate-900">{member.name}</h3>
                </div>
                <div className={cn("shrink-0 font-medium text-[12px]", tone.textClass)}>{t(tone.labelKey)}</div>
            </div>

            <div className="mb-2.5 flex items-center gap-2.5">
                <div className="h-2.5 flex-1 overflow-hidden rounded-md bg-slate-200">
                    <div
                        className={cn("h-full rounded-md transition-all duration-500", tone.barClass)}
                        style={{ width: `${percent}%` }}
                    />
                </div>
                <div className="w-[38px] text-right font-bold text-[13px] text-slate-900">{percent}%</div>
            </div>

            <div className="space-y-1.5 text-[12px] text-slate-500">
                <div className="flex items-center gap-1.5">
                    <Layers3 className="h-3.5 w-3.5" />
                    <span>
                        {member.completedTasks} / {member.totalTasks} {t("member.tasks")}
                    </span>
                </div>
                {member.contributionScoreRate !== undefined && (
                    <div className="flex items-center gap-1.5">
                        <div className="flex h-3.5 w-3.5 items-center justify-center rounded bg-orange-100">
                            <span className="font-bold text-[10px] text-orange-600">%</span>
                        </div>
                        <span>Contribution: {member.contributionScoreRate.toFixed(2)}%</span>
                    </div>
                )}
                <div className="flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" />
                    <span>{t("member.lastActivity", { value: member.lastActivity })}</span>
                </div>
            </div>
        </div>
    );
}

function MemberDetailModal({
    member,
    open,
    onClose
}: {
    member: MemberProgressItem | null;
    open: boolean;
    onClose: () => void;
}) {
    const t = useTranslations("AnalyticMaster");
    React.useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handler);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", handler);
            document.body.style.overflow = "";
        };
    }, [open, onClose]);

    if (!(open && member)) return null;

    const percent = getPercent(member.completedTasks, member.totalTasks);
    const tone = getMemberStatus(percent);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
            onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.22 }}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
                <div className="flex items-start justify-between gap-4 border-slate-200 border-b px-6 py-5">
                    <div>
                        <div className="text-slate-500 text-sm">{t("member.detail")}</div>
                        <div className="mt-1 font-bold text-2xl text-slate-900">{member.name}</div>
                        <div className={cn("mt-1 font-semibold text-sm", tone.textClass)}>{t(tone.labelKey)}</div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-2xl border border-slate-200 px-4 py-2 font-medium text-slate-600 text-sm transition hover:bg-slate-50">
                        {t("common.close")}
                    </button>
                </div>

                <div className="space-y-5 overflow-y-auto p-6">
                    {/* Progress */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="mb-3 flex items-center justify-between text-slate-500 text-sm">
                            <span>{t("member.taskProgress")}</span>
                            <span className="font-semibold text-slate-900">{percent}%</span>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                                className={cn("h-full rounded-full transition-all", tone.barClass)}
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                        <div className="mt-2 text-slate-500 text-sm">
                            {t("member.completedTasks", {
                                completed: member.completedTasks,
                                total: member.totalTasks
                            })}
                        </div>
                    </div>

                    {/* Weighted scores */}
                    {(member.totalScore !== undefined || member.contributionScoreRate !== undefined) && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                            <div className="mb-3 font-semibold text-slate-700 text-sm">
                                {t("member.contributionScore")}
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {[
                                    {
                                        label: t("member.score.completed"),
                                        value: member.completedScore ?? 0,
                                        color: "bg-emerald-50 text-emerald-700"
                                    },
                                    {
                                        label: t("member.score.created"),
                                        value: member.createdScore ?? 0,
                                        color: "bg-blue-50 text-blue-700"
                                    },
                                    {
                                        label: t("member.score.updated"),
                                        value: member.updatedScore ?? 0,
                                        color: "bg-amber-50 text-amber-700"
                                    },
                                    {
                                        label: t("member.score.messages"),
                                        value: member.messagesSent ?? 0,
                                        color: "bg-purple-50 text-purple-700"
                                    }
                                ].map((item) => (
                                    <div key={item.label} className={cn("rounded-xl p-3 text-center", item.color)}>
                                        <div className="font-bold text-lg">{item.value}</div>
                                        <div className="font-medium text-xs">{item.label}</div>
                                    </div>
                                ))}
                            </div>
                            {member.totalScore !== undefined && (
                                <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2">
                                    <span className="font-medium text-slate-600 text-sm">{t("member.totalScore")}</span>
                                    <span className="font-bold text-orange-600">{member.totalScore}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Contribution */}
                    {member.contributionScoreRate !== undefined && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                            <div className="mb-2 flex items-center justify-between text-sm">
                                <span className="font-semibold text-slate-700">Tỷ lệ đóng góp</span>
                                <span className="font-bold text-orange-600">{member.contributionScoreRate}%</span>
                            </div>
                            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-400"
                                    style={{ width: `${member.contributionScoreRate}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

function MemberProgressLayer({
    members,
    open,
    onClose,
    onMemberClick
}: {
    members: MemberProgressItem[];
    open: boolean;
    onClose: () => void;
    onMemberClick: (m: MemberProgressItem) => void;
}) {
    const t = useTranslations("AnalyticMaster");
    React.useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handler);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", handler);
            document.body.style.overflow = "";
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
            onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.22 }}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
                <div className="flex items-center justify-between border-slate-200 border-b px-6 py-5">
                    <div className="font-semibold text-lg text-slate-900">{t("member.listTitle")}</div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-2xl border border-slate-200 px-4 py-2 font-medium text-slate-600 text-sm transition hover:bg-slate-50">
                        {t("common.close")}
                    </button>
                </div>
                <div className="overflow-y-auto p-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {members.map((m) => (
                            <MemberProgressCard key={m.id} member={m} onClick={() => onMemberClick(m)} />
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// ──────────────────────────────────────────────
// Main export
// ──────────────────────────────────────────────
interface AnalyticMasterProps {
    studioRole?: number;
    maxStorageMb?: number;
}

export default function AnalyticMaster({ studioRole, maxStorageMb }: AnalyticMasterProps) {
    const t = useTranslations("AnalyticMaster");
    const params = useParams();
    const studioId = params?.studioId as string | undefined;

    // ── API data state ──
    const [overview, setOverview] = React.useState<StudioOverviewResponse | null>(null);
    const [trend, setTrend] = React.useState<StudioCompletionTrendResponse | null>(null);
    const [activity, setActivity] = React.useState<StudioGroupActivityResponse | null>(null);
    const [loading, setLoading] = React.useState(true);

    // ── Chart 2: selected group ──
    const [selectedGroupId, setSelectedGroupId] = React.useState<string>("");

    // ── Chart 3: line chart ──
    const [lineMode, setLineMode] = React.useState<TimeViewMode>("week");
    const [lineAnchor, setLineAnchor] = React.useState<Date>(new Date());
    const [lineCompareIds, setLineCompareIds] = React.useState<string[]>([]);

    // ── Chart 5: heatmap ──
    const [heatmapMode, setHeatmapMode] = React.useState<HeatmapRangeFilter>("week");
    const [heatmapAnchor, setHeatmapAnchor] = React.useState<Date>(new Date());

    // ── Chart 6: member progress ──
    const [_memberLayerGroupId, setMemberLayerGroupId] = React.useState<string | null>(null);
    const [memberLayerOpen, setMemberLayerOpen] = React.useState(false);
    const [memberLayerData, setMemberLayerData] = React.useState<{
        activity: MemberActivitySummary[];
        contribution: MemberContributionData[];
    } | null>(null);
    const [memberDetailMember, setMemberDetailMember] = React.useState<MemberProgressItem | null>(null);
    const [memberDetailOpen, setMemberDetailOpen] = React.useState(false);

    // ── Fetch overview ──
    React.useEffect(() => {
        if (!studioId) return;
        setLoading(true);
        getStudioOverview(studioId)
            .then((res) => {
                if (res.status === "success" && res.data) setOverview(res.data);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [studioId]);

    // ── Fetch trend (Chart 3) ──
    React.useEffect(() => {
        if (!studioId) return;
        const start = dateToString(shiftDateByMode(lineAnchor, lineMode, -1));
        const end = dateToString(shiftDateByMode(lineAnchor, lineMode, 1));
        getStudioCompletionTrend(studioId, {
            startDate: start,
            endDate: end,
            groupIds: lineCompareIds.length ? lineCompareIds : undefined
        })
            .then((res) => {
                if (res.status === "success") setTrend(res.data ?? null);
            })
            .catch(console.error);
    }, [studioId, lineAnchor, lineMode, lineCompareIds]);

    // ── Fetch activity (Chart 5) ──
    React.useEffect(() => {
        if (!studioId) return;
        const start = dateToString(shiftDateByMode(heatmapAnchor, heatmapMode === "week" ? "week" : "month", -1));
        const end = dateToString(heatmapAnchor);
        getStudioGroupActivity(studioId, { startDate: start, endDate: end })
            .then((res) => {
                if (res.status === "success") setActivity(res.data ?? null);
            })
            .catch(console.error);
    }, [studioId, heatmapAnchor, heatmapMode]);

    // ── Set defaults when overview loads ──
    React.useEffect(() => {
        if (!overview?.groups?.length) return;
        const ids = overview.groups.slice(0, 4).map((g) => g.groupId ?? "");
        setLineCompareIds(ids);
        setSelectedGroupId(overview.groups[0]?.groupId ?? "");
    }, [overview]);

    // ── Helpers ──
    const groups = overview?.groups ?? [];
    const selectedGroup = groups.find((g) => g.groupId === selectedGroupId) ?? groups[0];

    const transformToGroupProgress = React.useCallback(
        (g: StudioGroupData): GroupProgress => ({
            groupId: g.groupId ?? "",
            groupName: g.groupName ?? "",
            groupColor: g.groupColor && g.groupColor.trim() !== "" ? g.groupColor : undefined,
            // Use totalCompletedTasks from API; fall back to completionRate * totalTasks
            completedTasks: g.totalCompletedTasks ?? Math.round((g.completionRate ?? 0) * (g.totalTasks ?? 0)),
            totalTasks: g.totalTasks ?? 0,
            // completionRate is already 0-100 (percentage), no need to * 100
            progress:
                g.totalCompletedTasks !== undefined
                    ? Math.round((g.totalCompletedTasks / Math.max(g.totalTasks ?? 1, 1)) * 100)
                    : Math.round(g.completionRate ?? 0),
            isOverdue: (g.overdueTasks ?? 0) > 0,
            lastActivity: g.lastActivityDateTime
                ? formatRelativeTime(g.lastActivityDateTime)
                : t("common.notAvailable"),
            overdueCount: g.overdueTasks ?? 0
        }),
        [t]
    );

    // ── Chart 2 donut option ──
    const selectedPieOption = React.useMemo<echarts.EChartsOption>(() => {
        if (!selectedGroup) return {};

        // Use dynamic taskStatuses from API
        const dynamicStatuses = selectedGroup.taskStatuses ?? [];
        if (dynamicStatuses.length === 0) return {};

        const statuses = dynamicStatuses.map((s, index) => ({
            name: s.statusName ?? t("statusFallback", { index: index + 1 }),
            value: s.count ?? 0
        }));

        const total = statuses.reduce((s, x) => s + x.value, 0);

        // Dynamic colors for statuses
        const STATUS_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#6366f1"];
        const colors = dynamicStatuses.map((_, i) => STATUS_COLORS[i % STATUS_COLORS.length]);

        return {
            animationDuration: 700,
            animationEasing: "cubicOut",
            color: colors,
            tooltip: { trigger: "item", backgroundColor: "#0f172a", borderWidth: 0, textStyle: { color: "#fff" } },
            legend: { show: false },
            graphic: [
                {
                    type: "text",
                    left: "center",
                    top: "41%",
                    style: { text: `${total}`, textAlign: "center", fill: "#0f172a", fontSize: 28, fontWeight: 700 }
                },
                {
                    type: "text",
                    left: "center",
                    top: "56%",
                    style: {
                        text: selectedGroup.groupName ?? "Group",
                        textAlign: "center",
                        fill: "#64748b",
                        fontSize: 13,
                        fontWeight: 500
                    }
                }
            ],
            series: [
                {
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
                    emphasis: { scale: true, scaleSize: 6 },
                    data: statuses
                }
            ]
        };
    }, [selectedGroup, t]);

    // ── Chart 3 line option ──
    const lineChartOption = React.useMemo<echarts.EChartsOption>(() => {
        const data = trend?.groups ?? [];
        if (!data.length) return {};
        const labels =
            lineMode === "week"
                ? [
                      t("timeLabels.mon"),
                      t("timeLabels.tue"),
                      t("timeLabels.wed"),
                      t("timeLabels.thu"),
                      t("timeLabels.fri"),
                      t("timeLabels.sat"),
                      t("timeLabels.sun")
                  ]
                : lineMode === "month"
                  ? [t("timeLabels.week1"), t("timeLabels.week2"), t("timeLabels.week3"), t("timeLabels.week4")]
                  : [
                        t("timeLabels.month1"),
                        t("timeLabels.month2"),
                        t("timeLabels.month3"),
                        t("timeLabels.month4"),
                        t("timeLabels.month5"),
                        t("timeLabels.month6"),
                        t("timeLabels.month7"),
                        t("timeLabels.month8"),
                        t("timeLabels.month9"),
                        t("timeLabels.month10"),
                        t("timeLabels.month11"),
                        t("timeLabels.month12")
                    ];
        return {
            animationDuration: 700,
            animationEasing: "cubicOut",
            tooltip: { trigger: "axis", backgroundColor: "#0f172a", borderWidth: 0, textStyle: { color: "#fff" } },
            legend: {
                bottom: 0,
                type: "scroll",
                data: data.map((g) => g.groupName ?? ""),
                textStyle: { color: "#64748B" }
            },
            grid: { left: 30, right: 20, top: 20, bottom: 58, containLabel: true },
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
            series: data.map((g) => {
                const points: StudioTrendPoint[] = g.points ?? [];
                let values = points.map((p) => p.value ?? 0);
                if (lineMode === "week") values = values.slice(-7);
                else if (lineMode === "month")
                    values = [values[0] ?? 0, values[3] ?? 0, values[7] ?? 0, values[11] ?? 0];
                return {
                    name: g.groupName ?? "",
                    type: "line",
                    smooth: true,
                    symbol: "circle",
                    symbolSize: 8,
                    data: values,
                    lineStyle: { width: 3, color: getGroupColor(g.groupColor, g.groupId) },
                    itemStyle: { color: getGroupColor(g.groupColor, g.groupId), borderColor: "#fff", borderWidth: 2 }
                };
            })
        };
    }, [trend, lineMode, t]);

    // ── Handle group card click (Chart 6) ──
    const handleGroupClick = React.useCallback(async (groupId: string) => {
        setMemberLayerGroupId(groupId);
        setMemberLayerOpen(true);
        try {
            const res = await getGroupSummary(groupId);
            if (res.status === "success" && res.data) {
                const activity: MemberActivitySummary[] = (res.data as any).memberActivitySummary ?? [];
                const contribution: MemberContributionData[] = (res.data as any).memberContribution ?? [];
                setMemberLayerData({ activity, contribution });
            }
        } catch (e) {
            console.error(e);
            setMemberLayerData(null);
        }
    }, []);

    // ── Build member items for layer ──
    const memberItems = React.useMemo<MemberProgressItem[]>(() => {
        if (!memberLayerData) return [];
        const contribMap = new Map<string, MemberContributionData>();
        for (const c of memberLayerData.contribution) {
            contribMap.set(c.userId ?? "", c);
        }
        return memberLayerData.activity.map((a) => {
            const c = contribMap.get(a.userId ?? "");
            return {
                id: a.userId ?? "",
                name: a.userName ?? "",
                completedTasks: a.completedTasks ?? 0,
                totalTasks: a.totalTasks ?? 0,
                lastActivity: a.lastActivityAt ? formatRelativeTime(a.lastActivityAt) : "N/A",
                contributionScoreRate: c?.contributionScoreRate,
                totalScore: c?.totalScore,
                completedScore: c?.completedScore,
                createdScore: c?.createdScore,
                updatedScore: c?.updatedScore,
                messagesSent: c?.messagesSent
            };
        });
    }, [memberLayerData, t]);

    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <LoadingSkeleton className="h-48 w-full" />
                <LoadingSkeleton className="h-64 w-full" />
                <LoadingSkeleton className="h-80 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ── Chart 1: Tổng quan nhóm ── */}
            <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.42, delay: 0.04 }}
                className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                <SectionTitle title={t("sections.overview.title")} />
                <div className="space-y-4">
                    {overview?.startDate && overview?.dueDate && (
                        <StudioDateRange startDate={overview.startDate} dueDate={overview.dueDate} />
                    )}
                    {groups.length > 0 && (
                        <GroupProgressChart
                            groups={groups.map(transformToGroupProgress)}
                            studioStartDate={overview?.startDate ?? ""}
                            studioDueDate={overview?.dueDate ?? ""}
                        />
                    )}
                </div>
            </motion.section>

            {/* ── Chart 2: Task Status theo từng nhóm ── */}
            <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.42, delay: 0.08 }}
                className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                <SectionTitle title={t("sections.taskStatus.title")} />
                <div className="mb-5">
                    <GroupSelect groups={groups} value={selectedGroupId} onChange={setSelectedGroupId} />
                </div>
                <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                    <div className="mx-auto w-full max-w-[260px]">
                        {selectedGroup && (selectedGroup.taskStatuses?.length ?? 0) > 0 ? (
                            <EChart option={selectedPieOption} height={260} />
                        ) : (
                            <div className="flex h-[260px] items-center justify-center text-slate-400 text-sm">
                                {t("sections.taskStatus.noData")}
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {/* Dynamic statuses from API */}
                        {(selectedGroup?.taskStatuses ?? []).map((s, i) => {
                            const STATUS_COLORS = [
                                "#3b82f6",
                                "#f59e0b",
                                "#10b981",
                                "#ef4444",
                                "#8b5cf6",
                                "#ec4899",
                                "#14b8a6",
                                "#6366f1"
                            ];
                            return (
                                <div
                                    key={s.statusId ?? i}
                                    className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="h-2.5 w-2.5 rounded-full"
                                            style={{ backgroundColor: STATUS_COLORS[i % STATUS_COLORS.length] }}
                                        />
                                        <span className="font-medium text-slate-500 text-xs">
                                            {s.statusName ?? t("statusFallback", { index: i + 1 })}
                                        </span>
                                    </div>
                                    <div className="mt-2 font-bold text-lg text-slate-900">{s.count ?? 0}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </motion.section>

            {/* ── Chart 3: So sánh task hoàn thành theo thời gian ── */}
            <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.12 }}
                className="rounded-[30px] border border-white/70 bg-white/85 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                <SectionTitle title={t("sections.comparison.title")} />
                <TimeRangeToolbar
                    mode={lineMode}
                    onModeChange={setLineMode}
                    rangeLabel={getRangeLabel(lineAnchor, lineMode, {
                        monthPrefix: t("time.monthPrefix"),
                        yearPrefix: t("time.yearPrefix")
                    })}
                    onPrev={() => setLineAnchor((p) => shiftDateByMode(p, lineMode, -1))}
                    onNext={() => setLineAnchor((p) => shiftDateByMode(p, lineMode, 1))}
                />
                <CompareGroupPicker
                    groups={groups}
                    selectedIds={lineCompareIds}
                    onChange={setLineCompareIds}
                    triggerLabel={t("compare.triggerLabel")}
                    title={t("compare.title")}
                    description={t("compare.description")}
                />
                <div className="mt-5">{lineChartOption && <EChart option={lineChartOption} height={380} />}</div>
            </motion.section>

            {/* ── Chart 4: Tiến độ thành viên ── */}
            <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.16 }}>
                <StudioGroupHeatmap
                    data={(activity?.data ?? []) as any}
                    range={heatmapMode}
                    anchorDate={heatmapAnchor}
                    onPrev={() =>
                        setHeatmapAnchor((p) => shiftDateByMode(p, heatmapMode === "week" ? "week" : "month", -1))
                    }
                    onNext={() =>
                        setHeatmapAnchor((p) => shiftDateByMode(p, heatmapMode === "week" ? "week" : "month", 1))
                    }
                    onChangeRange={setHeatmapMode}
                />
            </motion.section>

            {/* ── Chart 5: Tiến độ thành viên ── */}
            <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.24 }}
                className="rounded-[30px] border border-white/70 bg-white/85 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                <SectionTitle
                    title={t("sections.memberProgress.title")}
                    description={t("sections.memberProgress.description")}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {groups.map((g) => {
                        // completionRate is already 0-100 (percentage)
                        const donePercent = Math.round(
                            g.totalCompletedTasks !== undefined
                                ? (g.totalCompletedTasks / Math.max(g.totalTasks ?? 1, 1)) * 100
                                : (g.completionRate ?? 0)
                        );
                        return (
                            <button
                                key={g.groupId}
                                type="button"
                                onClick={() => handleGroupClick(g.groupId ?? "")}
                                className="rounded-[24px] border border-slate-200 bg-white p-5 text-left shadow-[0_10px_28px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-1 hover:border-orange-200 hover:bg-orange-50/40">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <span
                                            className="h-3 w-3 shrink-0 rounded-full"
                                            style={{ backgroundColor: getGroupColor(g.groupColor, g.groupId) }}
                                        />
                                        <span className="truncate font-semibold text-slate-900 text-sm">
                                            {g.groupName}
                                        </span>
                                    </div>
                                    <span className="shrink-0 font-medium text-slate-500 text-xs">{donePercent}%</span>
                                </div>
                                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{
                                            width: `${donePercent}%`,
                                            backgroundColor: getGroupColor(g.groupColor, g.groupId)
                                        }}
                                    />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </motion.section>

            {/* ── Chart 5 Modals ── */}
            <MemberProgressLayer
                members={memberItems}
                open={memberLayerOpen}
                onClose={() => setMemberLayerOpen(false)}
                onMemberClick={(m) => {
                    setMemberDetailMember(m);
                    setMemberDetailOpen(true);
                }}
            />
            <MemberDetailModal
                member={memberDetailMember}
                open={memberDetailOpen}
                onClose={() => setMemberDetailOpen(false)}
            />

            {/* ── Section 6: Quản lý tài liệu ── */}
            <StudioAnalyticsDocuments groups={groups} studioRole={studioRole} maxStorageMb={maxStorageMb} />
        </div>
    );
}
