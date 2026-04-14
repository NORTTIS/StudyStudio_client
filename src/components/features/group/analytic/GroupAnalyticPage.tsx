"use client";

import * as echarts from "echarts";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Clock3, Layers3, MessageSquare, Plus, Users, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import * as React from "react";
import { createPortal } from "react-dom";
import type {
    GroupSummaryResponse,
    MemberHeatmapData,
    MemberProgressTrendData
} from "@/api/analytics";
import { getGroupHeatmap, getGroupSummary, getGroupTrend } from "@/api/analytics";
import { apiGet } from "@/api/api-client";
import { Container } from "@/components/common";
import TaskStatusPopup from "@/components/features/group/analytic/TaskStatusPopup";

type Props = {
    groupName?: string;
};

// ==================== Types ====================

type TrendFilter = "week" | "month" | "year";
type HeatmapRangeFilter = "week" | "month";
type GroupRole = "owner" | "moderator" | "member" | "commenter";

type MemberProgressStatus = "on-track" | "warning" | "delayed";

type MemberProgressItem = {
    id: string;
    name: string;
    completedTasks: number;
    totalTasks: number;
    lastActivity: string;
    // From MemberContributionData (weighted scoring)
    contributionScoreRate?: number;
    totalScore?: number;
    tasksCompleted?: number;
    tasksCreated?: number;
    tasksUpdated?: number;
    tasksDeleted?: number;
    tasksAssigned?: number;
    commentsCreated?: number;
    messagesSent?: number;
    completedScore?: number;
    createdScore?: number;
    updatedScore?: number;
    deletedScore?: number;
};

type UserProfileLike = {
    userId?: string;
    id?: string;
    email?: string;
};

type GroupMemberLike = {
    userId?: string;
    id?: string;
    email?: string;
    role?: string;
    groupRole?: string;
    memberRole?: string;
    userName?: string;
    fullName?: string;
    isCurrentUser?: boolean;
};

type GroupMemberListData = {
    groupId?: string;
    groupName?: string | null;
    members?: GroupMemberLike[] | null;
    totalMembers?: number;
};

// ==================== Utils ====================

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
    "#22c55e"
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

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function normalizeRole(input?: string | null): GroupRole | null {
    if (!input) return null;
    const value = input.toLowerCase();
    if (value === "owner") return "owner";
    if (value === "moderator") return "moderator";
    if (value === "member") return "member";
    if (value === "commenter") return "commenter";
    return null;
}

async function getCurrentUserProfile(): Promise<UserProfileLike | null> {
    const res = await apiGet<UserProfileLike>("/user-profile");
    return res.data ?? null;
}

async function getCurrentUserRoleInGroup(
    groupId: string
): Promise<{ role: GroupRole; groupName: string }> {
    const [profileRes, membersRes] = await Promise.all([
        getCurrentUserProfile(),
        apiGet<GroupMemberListData>(`/group/${groupId}/members`)
    ]);
    const members = membersRes?.data?.members ?? [];
    const profile = profileRes;
    const matchedMember =
        members.find((m) => m.isCurrentUser === true) ??
        members.find((m) => !!profile?.userId && (m.userId === profile.userId || m.id === profile.userId)) ??
        members.find((m) => !!profile?.id && (m.userId === profile.id || m.id === profile.id)) ??
        members.find((m) => !!profile?.email && !!m.email && m.email.toLowerCase() === profile.email.toLowerCase());
    const role =
        normalizeRole(matchedMember?.role) ??
        normalizeRole(matchedMember?.groupRole) ??
        normalizeRole(matchedMember?.memberRole);
    return {
        role: role ?? "member",
        groupName: membersRes?.data?.groupName ?? ""
    };
}

// ==================== Sub-components ====================

function SectionReveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}>
            {children}
        </motion.div>
    );
}

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
                chartRef.current?.resize({
                    animation: { duration: 260, easing: "cubicOut" }
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
    }, [option]);

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

function formatLastActivity(
    dateStr: string | null | undefined,
    t: (key: string, values?: Record<string, string | number>) => string
): string {
    if (!dateStr) return t("formatLastActivity.noActivity");
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return t("formatLastActivity.minutesAgo", { count: diffMins });
    if (diffHours < 24) return t("formatLastActivity.hoursAgo", { count: diffHours });
    if (diffDays < 7) return t("formatLastActivity.daysAgo", { count: diffDays });
    return formatDisplayDate(date);
}

function GroupActivityHeatmap({
    members,
    range,
    anchorDate,
    onPrev,
    onNext,
    onChangeRange,
    canFilterMembers,
    memberOptions,
    selectedMemberIds,
    dropdownOpen,
    onToggleDropdown,
    onCloseDropdown,
    onToggleMember,
    onClearMembers,
    locale,
    t
}: {
    members: { id: string; name: string; activityByDate: Array<{ date: string; activityLevel: number; activityCount: number }> }[];
    range: HeatmapRangeFilter;
    anchorDate: Date;
    onPrev: () => void;
    onNext: () => void;
    onChangeRange: (value: HeatmapRangeFilter) => void;
    canFilterMembers: boolean;
    memberOptions: Array<{ userId?: string | null; userName?: string | null }>;
    selectedMemberIds: string[];
    dropdownOpen: boolean;
    onToggleDropdown: () => void;
    onCloseDropdown: () => void;
    onToggleMember: (memberId: string) => void;
    onClearMembers: () => void;
    locale: string;
    t: (key: string, values?: Record<string, string | number>) => string;
}) {
    const [infoOpen, setInfoOpen] = React.useState(false);
    const infoButtonRef = React.useRef<HTMLButtonElement | null>(null);
    const infoCloseTimerRef = React.useRef<number | null>(null);
    const [infoTooltipPos, setInfoTooltipPos] = React.useState<{ top: number; left: number } | null>(null);

    const clearInfoCloseTimer = React.useCallback(() => {
        if (infoCloseTimerRef.current) {
            window.clearTimeout(infoCloseTimerRef.current);
            infoCloseTimerRef.current = null;
        }
    }, []);

    const openInfoTooltip = React.useCallback(() => {
        clearInfoCloseTimer();
        setInfoOpen(true);
    }, [clearInfoCloseTimer]);

    const scheduleCloseInfoTooltip = React.useCallback(() => {
        clearInfoCloseTimer();
        infoCloseTimerRef.current = window.setTimeout(() => {
            setInfoOpen(false);
            infoCloseTimerRef.current = null;
        }, 120);
    }, [clearInfoCloseTimer]);

    React.useEffect(() => {
        return () => {
            clearInfoCloseTimer();
        };
    }, [clearInfoCloseTimer]);

    const updateInfoTooltipPosition = React.useCallback(() => {
        if (!infoButtonRef.current) return;
        const rect = infoButtonRef.current.getBoundingClientRect();
        const panelWidth = 320;
        const viewportPadding = 12;
        const left = Math.min(
            Math.max(viewportPadding, rect.left),
            window.innerWidth - panelWidth - viewportPadding
        );
        setInfoTooltipPos({
            top: rect.bottom + 8,
            left
        });
    }, []);

    React.useEffect(() => {
        if (!infoOpen) return;

        updateInfoTooltipPosition();

        const handleReposition = () => updateInfoTooltipPosition();
        window.addEventListener("resize", handleReposition);
        window.addEventListener("scroll", handleReposition, true);

        return () => {
            window.removeEventListener("resize", handleReposition);
            window.removeEventListener("scroll", handleReposition, true);
        };
    }, [infoOpen, updateInfoTooltipPosition]);

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
        4: "#166534"
    };

    return (
        <div className="rounded-[26px] border border-white/70 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:p-6">
            <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-lg text-slate-900">{t("heatmap.title")}</h2>
                    <div className="relative">
                        <button
                            ref={infoButtonRef}
                            type="button"
                            onMouseEnter={openInfoTooltip}
                            onMouseLeave={scheduleCloseInfoTooltip}
                            onFocus={openInfoTooltip}
                            onBlur={scheduleCloseInfoTooltip}
                            className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-slate-500 text-xs font-bold transition-all duration-200 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600">
                            ?
                        </button>
                        {infoOpen && (
                            createPortal(
                                <div
                                    className="fixed z-[220] w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_40px_rgba(15,23,42,0.18)]"
                                    style={{
                                        top: infoTooltipPos?.top ?? 12,
                                        left: infoTooltipPos?.left ?? 12
                                    }}
                                    onMouseEnter={openInfoTooltip}
                                    onMouseLeave={scheduleCloseInfoTooltip}>
                                    <h3 className="mb-2 font-semibold text-slate-800 text-sm">Cách tính điểm Activity</h3>
                                    <div className="mb-3 space-y-1.5 text-xs text-slate-600">
                                        <p><span className="font-medium">Task hoàn thành:</span> 10 × Priority × Severity (10–40 điểm)</p>
                                        <p><span className="font-medium">Task tạo mới:</span> 3 điểm (flat)</p>
                                        <p><span className="font-medium">Task cập nhật:</span> 1 điểm (flat)</p>
                                        <p><span className="font-medium">Tin nhắn / Bình luận:</span> 1 điểm (flat)</p>
                                    </div>
                                    <h3 className="mb-2 font-semibold text-slate-800 text-sm">Mức Activity Level</h3>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-3">
                                            <div className="h-3.5 w-3.5 rounded-[4px] bg-[#ecfdf3]" />
                                            <span className="text-slate-600 text-sm"><strong>Level 0</strong> — 0 activity</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="h-3.5 w-3.5 rounded-[4px] bg-[#d1fadf]" />
                                            <span className="text-slate-600 text-sm"><strong>Level 1</strong> — 1–5 points</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="h-3.5 w-3.5 rounded-[4px] bg-[#73e2a3]" />
                                            <span className="text-slate-600 text-sm"><strong>Level 2</strong> — 6–15 points</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="h-3.5 w-3.5 rounded-[4px] bg-[#16a34a]" />
                                            <span className="text-slate-600 text-sm"><strong>Level 3</strong> — 16–30 points</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="h-3.5 w-3.5 rounded-[4px] bg-[#166534]" />
                                            <span className="text-slate-600 text-sm"><strong>Level 4</strong> — 31+ points</span>
                                        </div>
                                    </div>
                                </div>,
                                document.body
                            )
                        )}
                    </div>
                </div>
                    <p className="mt-1 text-slate-500 text-sm">
                        {t("heatmap.subtitle", {
                            count: members.length,
                            period: range === "week" ? t("heatmap.week") : t("heatmap.month")
                        })}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    

                    <div className="inline-flex rounded-2xl bg-slate-100 p-1">
                        {[
                            { key: "week", label: t("heatmap.week") },
                            { key: "month", label: t("heatmap.month") }
                        ].map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => onChangeRange(item.key as HeatmapRangeFilter)}
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

                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                        <button
                            type="button"
                            onClick={onPrev}
                            className="rounded-lg px-2 py-1 text-slate-500 transition-all duration-300 hover:bg-orange-50 hover:text-orange-600 active:scale-95">
                            ‹
                        </button>
                        <div className="min-w-[170px] text-center font-medium text-slate-700 text-sm">
                            {formatRangeLabel(start, end)}
                        </div>
                        <button
                            type="button"
                            onClick={onNext}
                            className="rounded-lg px-2 py-1 text-slate-500 transition-all duration-300 hover:bg-orange-50 hover:text-orange-600 active:scale-95">
                            ›
                        </button>
                    </div>
                    {canFilterMembers && memberOptions.length > 0 && (
                        <div className="relative">
                            <button
                                type="button"
                                onClick={onToggleDropdown}
                                className={cn(
                                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
                                    selectedMemberIds.length > 0
                                        ? "border-orange-500 bg-orange-500 text-white"
                                        : "border-slate-200 bg-white text-slate-600 hover:border-orange-300"
                                )}>
                                <Users className="h-4 w-4" />
                                <span>
                                    {selectedMemberIds.length > 0
                                        ? t("memberFilter.selected", { count: selectedMemberIds.length })
                                        : t("memberFilter.selectMembers")}
                                </span>
                                {selectedMemberIds.length > 0 && (
                                    <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                                        {selectedMemberIds.length}
                                    </span>
                                )}
                                <svg
                                    className={cn(
                                        "h-4 w-4 transition-transform duration-200",
                                        dropdownOpen && "rotate-180"
                                    )}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {dropdownOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={onCloseDropdown}
                                    />
                                    <div className="absolute right-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                                        <div className="max-h-64 overflow-y-auto p-2">
                                            {memberOptions.map((member) => {
                                                const memberId = member.userId ?? "";
                                                const isSelected = selectedMemberIds.includes(memberId);
                                                return (
                                                    <button
                                                        key={memberId}
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onToggleMember(memberId);
                                                        }}
                                                        className={cn(
                                                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
                                                            isSelected
                                                                ? "bg-orange-50 text-orange-600"
                                                                : "text-slate-600 hover:bg-slate-50"
                                                        )}>
                                                        <div
                                                            className={cn(
                                                                "flex h-5 w-5 items-center justify-center rounded-md border-2 transition",
                                                                isSelected
                                                                    ? "border-orange-500 bg-orange-500"
                                                                    : "border-slate-300"
                                                            )}>
                                                            {isSelected && (
                                                                <svg
                                                                    className="h-3 w-3 text-white"
                                                                    fill="none"
                                                                    viewBox="0 0 24 24"
                                                                    stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <span className="flex-1 truncate font-medium">{member.userName}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {selectedMemberIds.length > 0 && (
                                            <div className="border-t border-slate-100 p-2">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onClearMembers();
                                                    }}
                                                    className="w-full rounded-xl px-3 py-2 text-center text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700">
                                                    {t("memberFilter.clearAll")}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
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
                        className={cn("w-full", range === "week" ? "min-w-[520px]" : "min-w-[760px]")}>
                        <div
                            className="grid items-center gap-x-2 gap-y-3"
                            style={{
                                gridTemplateColumns: `88px repeat(${dates.length}, minmax(18px, 1fr))`
                            }}>
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
                                            ease: [0.22, 1, 0.36, 1]
                                        }}
                                        className="sticky left-0 z-10 bg-white/90 pr-2 font-medium text-slate-700 text-xs backdrop-blur-sm">
                                        <span className="line-clamp-1">{member.name}</span>
                                    </motion.div>

                                    {dates.map((date, dateIndex) => {
                                        const dateKey = formatDateLocal(date);
                                        const activityPoint = member.activityByDate.find((p) => p.date === dateKey);
                                        const value = activityPoint?.activityLevel ?? 0;
                                        const count = activityPoint?.activityCount ?? 0;

                                        return (
                                            <motion.div
                                                key={`${member.id}-${dateKey}`}
                                                title={`${member.name} • ${dateKey}: ${count} points (Level ${value})`}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{
                                                    duration: 0.18,
                                                    delay: memberIndex * 0.01 + dateIndex * 0.004,
                                                    ease: [0.22, 1, 0.36, 1]
                                                }}
                                                className="h-[18px] w-full rounded-[5px] transition-transform duration-150 hover:scale-105"
                                                style={{
                                                    backgroundColor: colorMap[value] ?? colorMap[0]
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
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <span>{t("heatmap.legend.low")}</span>
                    {[0, 1, 2, 3, 4].map((level) => (
                        <div
                            key={level}
                            className="h-3.5 w-3.5 rounded-[4px]"
                            style={{ backgroundColor: colorMap[level] }}
                        />
                    ))}
                    <span>{t("heatmap.legend.high")}</span>
                </div>
                <div className="text-slate-400 text-sm">
                    {t("heatmap.updated")}: {new Date().toLocaleDateString(locale)}
                </div>
            </div>
        </div>
    );
}

function getProgressPercent(completed: number, total: number) {
    if (!total || total <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
}

function getMemberStatus(
    percent: number,
    t: (key: string) => string
): {
    key: MemberProgressStatus;
    label: string;
    textClass: string;
    dotClass: string;
    barClass: string;
} {
    if (percent >= 70) {
        return {
            key: "on-track",
            label: t("memberStatus.onTrack"),
            textClass: "text-emerald-600",
            dotClass: "bg-emerald-500",
            barClass: "bg-emerald-500"
        };
    }
    if (percent >= 30) {
        return {
            key: "warning",
            label: t("memberStatus.needsAttention"),
            textClass: "text-orange-500",
            dotClass: "bg-orange-500",
            barClass: "bg-orange-500"
        };
    }
    return {
        key: "delayed",
        label: t("memberStatus.delayed"),
        textClass: "text-red-500",
        dotClass: "bg-red-500",
        barClass: "bg-red-500"
    };
}

function ProgressLegend({ t }: { t: (key: string, values?: Record<string, string | number>) => string }) {
    const items = [
        { label: t("memberStatus.onTrack"), dotClass: "bg-emerald-500" },
        { label: t("memberStatus.needsAttention"), dotClass: "bg-orange-500" },
        { label: t("memberStatus.delayed"), dotClass: "bg-red-500" }
    ];

    return (
        <div className="flex flex-wrap items-center gap-4 text-slate-600 text-xs sm:text-sm">
            {items.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 rounded-full", item.dotClass)} />
                    <span>{item.label}</span>
                </div>
            ))}
        </div>
    );
}

function MemberProgressCard({
    member,
    t,
    onClick
}: {
    member: MemberProgressItem;
    t: (key: string, values?: Record<string, string | number>) => string;
    onClick?: () => void;
}) {
    const percent = getProgressPercent(member.completedTasks, member.totalTasks);
    const status = getMemberStatus(percent, t);

    return (
        <div
            className={cn(
                "cursor-pointer rounded-[14px] border border-slate-200 bg-slate-50/80 p-3.5 transition-all duration-200 hover:border-orange-300 hover:bg-orange-50/50 hover:shadow-md",
                onClick && "active:scale-[0.98]"
            )}
            onClick={onClick}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}>
            <div className="mb-2.5 flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                    <Layers3 className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    <h3 className="truncate font-semibold text-[14px] text-slate-900">{member.name}</h3>
                </div>
            </div>

            <div className="mb-2.5 flex items-center gap-2.5">
                <div className="h-2.5 flex-1 overflow-hidden rounded-md bg-slate-200">
                    <div
                        className={cn("h-full rounded-md transition-all duration-500", status.barClass)}
                        style={{ width: `${percent}%` }}
                    />
                </div>
                <div className="w-[38px] text-right font-bold text-[13px] text-slate-900">{percent}%</div>
            </div>

            <div className="space-y-1.5 text-[12px] text-slate-500">
                <div className="flex items-center gap-1.5">
                    <Layers3 className="h-3.5 w-3.5" />
                    <span>
                        {member.completedTasks} / {member.totalTasks} {t("common.tasks")}
                    </span>
                </div>
                {member.contributionScoreRate !== undefined && (
                    <div className="flex items-center gap-1.5">
                        <div className="flex h-3.5 w-3.5 items-center justify-center rounded bg-orange-100">
                            <span className="font-bold text-[10px] text-orange-600">%</span>
                        </div>
                        <span>
                            {t("memberProgressCard.contribution")}: {member.contributionScoreRate.toFixed(2)}%
                        </span>
                    </div>
                )}
                <div className="flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" />
                    <span>
                        {t("memberProgressCard.lastActivity")}: {member.lastActivity}
                    </span>
                </div>
            </div>
        </div>
    );
}

function TeamMemberProgressLayer({
    members,
    open,
    onClose,
    onMemberClick,
    t
}: {
    members: MemberProgressItem[];
    open: boolean;
    onClose: () => void;
    onMemberClick?: (member: MemberProgressItem) => void;
    t: (key: string, values?: Record<string, string | number>) => string;
}) {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

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
                    onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.98 }}
                        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                        onClick={(event) => event.stopPropagation()}
                        className="relative max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_24px_90px_rgba(15,23,42,0.24)]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute top-5 right-5 z-20 rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition-all duration-300 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 active:scale-95">
                            <X className="h-5 w-5" />
                        </button>
                        <div className="max-h-[88vh] overflow-y-auto px-5 pt-16 pb-5 lg:px-6 lg:pt-16 lg:pb-6">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {members.map((member) => (
                                    <MemberProgressCard
                                        key={member.id}
                                        member={member}
                                        t={t}
                                        onClick={onMemberClick ? () => onMemberClick(member) : undefined}
                                    />
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
    onMemberClick,
    t
}: {
    members: MemberProgressItem[];
    onMemberClick?: (member: MemberProgressItem) => void;
    t: (key: string, values?: Record<string, string | number>) => string;
}) {
    const [openLayer, setOpenLayer] = React.useState(false);
    const previewMembers = members.slice(0, 2);

    return (
        <>
            <section className="rounded-[24px] border border-white/70 bg-white/85 p-4 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:p-5">
                <div className="mb-4">
                    <div>
                        <h2 className="font-semibold text-lg text-slate-900">{t("memberProgress.title")}</h2>
                        <p className="mt-1 text-slate-500 text-sm">{t("memberProgress.subtitle")}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {previewMembers.map((member) => (
                        <MemberProgressCard
                            key={member.id}
                            member={member}
                            t={t}
                            onClick={onMemberClick ? () => onMemberClick(member) : undefined}
                        />
                    ))}
                </div>

                {members.length > 2 && (
                    <div className="mt-4 flex justify-end">
                        <button
                            type="button"
                            onClick={() => setOpenLayer(true)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-2.5 font-medium text-sm text-white shadow-sm transition-all duration-300 hover:bg-orange-600 hover:shadow-md active:scale-[0.98]">
                            <Users className="h-4 w-4" />
                            {t("memberProgress.seeDetails")}
                        </button>
                    </div>
                )}
            </section>

            <TeamMemberProgressLayer
                members={members.slice(0, 10)}
                t={t}
                open={openLayer}
                onClose={() => setOpenLayer(false)}
                onMemberClick={onMemberClick}
            />
        </>
    );
}

// ==================== Member Detail Modal ====================

function MemberDetailModal({
    member,
    open,
    onClose,
    t
}: {
    member: MemberProgressItem | null;
    open: boolean;
    onClose: () => void;
    t: (key: string, values?: Record<string, string | number>) => string;
}) {
    const [mounted, setMounted] = React.useState(false);
    const [displayedMember, setDisplayedMember] = React.useState<MemberProgressItem | null>(member);

    React.useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    React.useEffect(() => {
        if (member) {
            setDisplayedMember(member);
        }
    }, [member]);

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

    if (!mounted) return null;

    const activeMember = displayedMember;
    const percent = activeMember ? getProgressPercent(activeMember.completedTasks, activeMember.totalTasks) : 0;
    const status = getMemberStatus(percent, t);

    return createPortal((
        <AnimatePresence onExitComplete={() => setDisplayedMember(member)}>
            {open && activeMember && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
                    onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, y: 24, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 24, scale: 0.96 }}
                        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                        onClick={(event) => event.stopPropagation()}
                        className="relative w-full max-w-md overflow-hidden rounded-[24px] border border-white/70 bg-white shadow-[0_24px_90px_rgba(15,23,42,0.28)]">
                        {/* Header */}
                        <div className="flex items-center justify-between border-slate-100 border-b bg-gradient-to-r from-orange-50 to-amber-50 px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                                    <Layers3 className="h-5 w-5 text-orange-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">{activeMember.name}</h3>
                                    <div className={cn("font-medium text-xs", status.textClass)}>{status.label}</div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition-all duration-200 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 active:scale-95">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="space-y-4 p-5">
                            {/* Progress bar */}
                            <div>
                                <div className="mb-2 flex items-center justify-between text-sm">
                                    <span className="font-medium text-slate-700">{t("memberModal.taskProgress")}</span>
                                    <span className={cn("font-bold", status.textClass)}>{percent}%</span>
                                </div>
                                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all duration-500",
                                            status.barClass
                                        )}
                                        style={{ width: `${percent}%` }}
                                    />
                                </div>
                                <div className="mt-1 text-slate-500 text-xs">
                                    {t("memberModal.taskCount", {
                                        completed: activeMember.completedTasks,
                                        total: activeMember.totalTasks
                                    })}
                                </div>
                            </div>

                            {/* Stats grid - weighted scores */}
                            <div className="grid grid-cols-4 gap-3">
                                <div className="rounded-xl border border-slate-100 bg-emerald-50/50 p-3 text-center">
                                    <CheckCircle2 className="mx-auto mb-1.5 h-5 w-5 text-emerald-500" />
                                    <div className="font-bold text-slate-900">
                                        {activeMember.completedScore?.toFixed(1) ?? 0}
                                    </div>
                                    <div className="text-slate-500 text-xs">{t("memberModal.completePts")}</div>
                                </div>
                                <div className="rounded-xl border border-slate-100 bg-blue-50/50 p-3 text-center">
                                    <Plus className="mx-auto mb-1.5 h-5 w-5 text-blue-500" />
                                    <div className="font-bold text-slate-900">
                                        {activeMember.createdScore?.toFixed(1) ?? 0}
                                    </div>
                                    <div className="text-slate-500 text-xs">{t("memberModal.createPts")}</div>
                                </div>
                                <div className="rounded-xl border border-slate-100 bg-amber-50/50 p-3 text-center">
                                    <div className="mx-auto mb-1.5 flex h-5 w-5 items-center justify-center text-amber-500">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                            />
                                        </svg>
                                    </div>
                                    <div className="font-bold text-slate-900">
                                        {activeMember.updatedScore?.toFixed(1) ?? 0}
                                    </div>
                                    <div className="text-slate-500 text-xs">{t("memberModal.updatePts")}</div>
                                </div>
                                <div className="rounded-xl border border-slate-100 bg-red-50/50 p-3 text-center">
                                    <div className="mx-auto mb-1.5 flex h-5 w-5 items-center justify-center text-red-400">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                        </svg>
                                    </div>
                                    <div className="font-bold text-slate-900">
                                        {activeMember.deletedScore?.toFixed(1) ?? 0}
                                    </div>
                                    <div className="text-slate-500 text-xs">
                                        {t("memberModal.activityItems.deleted")} pts
                                    </div>
                                </div>
                                <div className="rounded-xl border border-slate-100 bg-purple-50/50 p-3 text-center">
                                    <MessageSquare className="mx-auto mb-1.5 h-5 w-5 text-purple-500" />
                                    <div className="font-bold text-slate-900">
                                        {(activeMember.messagesSent ?? 0) + (activeMember.commentsCreated ?? 0)}
                                    </div>
                                    <div className="text-slate-500 text-xs">
                                        {t("memberModal.activityItems.messages")}
                                    </div>
                                </div>
                            </div>

                            {/* Detailed breakdown */}
                            <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                                <div className="mt-3 flex justify-between border-slate-200 border-t pt-3 font-semibold">
                                    <span className="text-slate-700">{t("memberModal.totalScore")}</span>
                                    <span className="font-mono text-orange-600">
                                        {activeMember.totalScore?.toFixed(1) ?? 0}
                                    </span>
                                </div>
                            </div>

                            {/* Contribution rate */}
                            {activeMember.contributionScoreRate !== undefined && (
                                <div className="rounded-xl border border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-slate-700 text-sm">
                                            {t("memberModal.contributionRate")}
                                        </span>
                                        <span className="font-bold text-lg text-orange-600">
                                            {activeMember.contributionScoreRate.toFixed(2)}%
                                        </span>
                                    </div>
                                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-orange-100">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-400"
                                            style={{ width: `${Math.min(100, activeMember.contributionScoreRate)}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Last activity */}
                            <div className="flex items-center gap-2 text-slate-500 text-sm">
                                <Clock3 className="h-4 w-4" />
                                <span>
                                    {t("memberModal.lastActivity")}: {activeMember.lastActivity}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    ), document.body);
}

// ==================== Main Component ====================

export default function GroupMemberAnalyticsPage({ groupName = "" }: Props) {
    const t = useTranslations("GroupAnalyticPage");
    const locale = useLocale();
    const pathname = usePathname();
    const groupId = extractGroupIdFromPath(pathname || "");

    const [loading, setLoading] = React.useState(false);
    const [summary, setSummary] = React.useState<GroupSummaryResponse | null>(null);
    const [trendData, setTrendData] = React.useState<MemberProgressTrendData[] | null>(null);
    const [heatmapData, setHeatmapData] = React.useState<MemberHeatmapData[] | null>(null);
    const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
    const [currentUserRole, setCurrentUserRole] = React.useState<GroupRole>("member");
    const [resolvedGroupName, setResolvedGroupName] = React.useState("");
    const [selectedMember, setSelectedMember] = React.useState<MemberProgressItem | null>(null);

    type StatusFilterType = "notstarted" | "inprogress" | "completed" | "overdue";

    const [trendFilter, setTrendFilter] = React.useState<TrendFilter>("week");
    const [trendAnchorDate, setTrendAnchorDate] = React.useState(new Date());

    const [heatmapRange, setHeatmapRange] = React.useState<HeatmapRangeFilter>("month");
    const [heatmapAnchorDate, setHeatmapAnchorDate] = React.useState(new Date());

    const [selectedTrendMembers, setSelectedTrendMembers] = React.useState<string[]>([]);
    const [selectedBarMembers, setSelectedBarMembers] = React.useState<string[]>([]);
    const [selectedHeatmapMembers, setSelectedHeatmapMembers] = React.useState<string[]>([]);
    const [selectedPieMembers, setSelectedPieMembers] = React.useState<string[]>([]);
    const [trendDropdownOpen, setTrendDropdownOpen] = React.useState(false);
    const [barDropdownOpen, setBarDropdownOpen] = React.useState(false);
    const [heatmapDropdownOpen, setHeatmapDropdownOpen] = React.useState(false);
    const [pieDropdownOpen, setPieDropdownOpen] = React.useState(false);

    const [statusFilter, setStatusFilter] = React.useState<{
        type: StatusFilterType | null;
        isPersonal: boolean;
    }>({ type: null, isPersonal: true });

    const filterTypes: StatusFilterType[] = ["notstarted", "inprogress", "completed", "overdue"];

    // Default select members when summary loads (only once on mount)
    const hasInitialized = React.useRef({ trend: false, bar: false, heatmap: false, pie: false });
    React.useEffect(() => {
        if (!summary?.memberActivitySummary) return;
        const members = summary.memberActivitySummary;

        // Trend: first 5 members
        if (!hasInitialized.current.trend && selectedTrendMembers.length === 0) {
            hasInitialized.current.trend = true;
            const firstFive = members.slice(0, 5).map((m) => m.userId ?? "").filter(Boolean);
            setSelectedTrendMembers(firstFive);
        }

        // Bar: first 5 members
        if (!hasInitialized.current.bar && selectedBarMembers.length === 0) {
            hasInitialized.current.bar = true;
            const firstFive = members.slice(0, 5).map((m) => m.userId ?? "").filter(Boolean);
            setSelectedBarMembers(firstFive);
        }

        // Heatmap: first 5 members
        if (!hasInitialized.current.heatmap && selectedHeatmapMembers.length === 0) {
            hasInitialized.current.heatmap = true;
            const firstFive = members.slice(0, 5).map((m) => m.userId ?? "").filter(Boolean);
            setSelectedHeatmapMembers(firstFive);
        }

        // Pie: current user only (default)
        if (!hasInitialized.current.pie && selectedPieMembers.length === 0 && currentUserId) {
            hasInitialized.current.pie = true;
            const currentUser = members.find((m) => m.userId === currentUserId);
            if (currentUser?.userId) {
                setSelectedPieMembers([currentUser.userId]);
            } else if (members.length > 0) {
                setSelectedPieMembers([members[0].userId ?? ""]);
            }
        }
    }, [summary, currentUserId]);
    React.useEffect(() => {
        if (!groupId) return;

        let isMounted = true;

        async function loadSummary() {
            try {
                setLoading(true);
                const [summaryRes, roleRes, profileRes] = await Promise.all([
                    getGroupSummary(groupId),
                    getCurrentUserRoleInGroup(groupId),
                    getCurrentUserProfile()
                ]);

                if (!isMounted) return;

                if (summaryRes.status === "success" && summaryRes.data) {
                    setSummary(summaryRes.data);
                }

                setCurrentUserRole(roleRes.role);
                setResolvedGroupName(roleRes.groupName);
                setCurrentUserId(profileRes?.userId ?? profileRes?.id ?? null);
            } catch {
                if (!isMounted) return;
                setSummary(null);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        loadSummary();

        return () => {
            isMounted = false;
        };
    }, [groupId]);

    // Load trend data with date filter - Chart 3
    React.useEffect(() => {
        if (!groupId) return;

        let isMounted = true;

        async function loadTrend() {
            try {
                const { start, end } =
                    trendFilter === "week"
                        ? getWeekRange(trendAnchorDate)
                        : trendFilter === "month"
                          ? getMonthRange(trendAnchorDate)
                          : {
                                start: new Date(trendAnchorDate.getFullYear(), 0, 1),
                                end: new Date(trendAnchorDate.getFullYear(), 11, 31)
                            };

                const res = await getGroupTrend(groupId, {
                    startDate: formatDateLocal(start),
                    endDate: formatDateLocal(end),
                    memberIds: selectedTrendMembers.length > 0 ? selectedTrendMembers : undefined
                });

                if (!isMounted) return;
                if (res.status === "success" && res.data) {
                    setTrendData(res.data);
                }
            } catch {
                if (!isMounted) return;
                setTrendData(null);
            }
        }

        loadTrend();

        return () => {
            isMounted = false;
        };
    }, [groupId, trendFilter, trendAnchorDate, selectedTrendMembers]);

    // Load heatmap data with date filter - Chart 5
    React.useEffect(() => {
        if (!groupId) return;

        let isMounted = true;

        async function loadHeatmap() {
            try {
                const { start, end } =
                    heatmapRange === "week" ? getWeekRange(heatmapAnchorDate) : getMonthRange(heatmapAnchorDate);

                const res = await getGroupHeatmap(groupId, {
                    startDate: formatDateLocal(start),
                    endDate: formatDateLocal(end)
                });

                if (!isMounted) return;
                if (res.status === "success" && res.data) {
                    setHeatmapData(res.data);
                }
            } catch {
                if (!isMounted) return;
                setHeatmapData(null);
            }
        }

        loadHeatmap();

        return () => {
            isMounted = false;
        };
    }, [groupId, heatmapRange, heatmapAnchorDate]);

    const canViewPersonalPieChart = currentUserRole !== "commenter";
    const canFilterMembers = currentUserRole === "owner" || currentUserRole === "moderator";

    const effectivePieMemberId = React.useMemo(() => {
        if (canFilterMembers && selectedPieMembers.length > 0) {
            return selectedPieMembers[0] ?? "";
        }
        return currentUserId ?? "";
    }, [canFilterMembers, selectedPieMembers, currentUserId]);

    const displayGroupName = React.useMemo(() => {
        return groupName || resolvedGroupName || "";
    }, [groupName, resolvedGroupName]);

    // ==================== Derived Data from API ====================

    // Personal donut data - Venn diagram with intersection support
    const personalPieData = React.useMemo(() => {
        if (!summary?.memberTaskBreakdown) {
            return { data: [], total: 0, intersections: { inProgressOverdue: 0, todoOverdue: 0 } };
        }

        const currentMember =
            summary.memberTaskBreakdown.find((m) => m.userId === effectivePieMemberId) ?? summary.memberTaskBreakdown[0];

        if (!currentMember) {
            return { data: [], total: 0, intersections: { inProgressOverdue: 0, todoOverdue: 0 } };
        }

        const todoTasks = currentMember.todoTasks ?? 0;
        const inProgressTasks = currentMember.inProgressTasks ?? 0;
        const doneTasks = currentMember.doneTasks ?? 0;
        const overdueTasks = currentMember.overdueTasks ?? 0;
        const inProgressOverdue = currentMember.inProgressOverdueTasks ?? 0;
        const todoOverdue = currentMember.todoOverdueTasks ?? 0;

        // For Venn: Todo = TodoOnly + TodoOverdue, InProgress = InProgressOnly + InProgressOverdue
        const todoOnly = todoTasks - todoOverdue;
        const inProgressOnly = inProgressTasks - inProgressOverdue;

        const data = [
            { name: t("taskStatus.todo"), value: todoTasks, itemStyle: { color: "#3b82f6" } },
            { name: t("taskStatus.inProgress"), value: inProgressTasks, itemStyle: { color: "#f59e0b" } },
            { name: t("taskStatus.done"), value: doneTasks, itemStyle: { color: "#10b981" } },
            { name: t("taskStatus.overdue"), value: overdueTasks, itemStyle: { color: "#ef4444" } }
        ];
        // Use totalTasks from backend (already unique, no Venn double-count). Fallback to exclusive sum.
        const total = currentMember.totalTasks ?? (todoOnly + inProgressOnly + doneTasks + overdueTasks);

        return { data, total, totalTasks: total, intersections: { inProgressOverdue, todoOverdue, todoOnly, inProgressOnly } };
    }, [summary, effectivePieMemberId, t]);

    // Group donut data - Venn diagram with intersection support
    const teamPieData = React.useMemo(() => {
        // Use unique task breakdown from API (GroupTaskBreakdown)
        const groupBreakdown = summary?.groupTaskBreakdown;
        if (!groupBreakdown) {
            return { data: [], total: 0, intersections: { inProgressOverdue: 0, todoOverdue: 0 } };
        }

        const todoTasks = groupBreakdown.todoTasks ?? 0;
        const inProgressTasks = groupBreakdown.inProgressTasks ?? 0;
        const doneTasks = groupBreakdown.doneTasks ?? 0;
        const overdueTasks = groupBreakdown.overdueTasks ?? 0;
        const inProgressOverdue = groupBreakdown.inProgressOverdueTasks ?? 0;
        const todoOverdue = groupBreakdown.todoOverdueTasks ?? 0;

        // Venn exclusive counts
        const todoOnly = todoTasks - todoOverdue;
        const inProgressOnly = inProgressTasks - inProgressOverdue;

        const data = [
            { name: t("taskStatus.todo"), value: todoTasks, itemStyle: { color: "#3b82f6" } },
            { name: t("taskStatus.inProgress"), value: inProgressTasks, itemStyle: { color: "#f59e0b" } },
            { name: t("taskStatus.done"), value: doneTasks, itemStyle: { color: "#10b981" } },
            { name: t("taskStatus.overdue"), value: overdueTasks, itemStyle: { color: "#ef4444" } }
        ];
        // Use totalTasks from backend (already unique, no Venn double-count). Fallback to exclusive sum.
        const total = groupBreakdown.totalTasks ?? (todoOnly + inProgressOnly + doneTasks + overdueTasks);

        return { data, total, intersections: { inProgressOverdue, todoOverdue } };
    }, [summary, t]);

    // Line chart data
    const lineChartData = React.useMemo(() => {
        if (!trendData) {
            return { groupData: [], labels: [] as string[], dates: [] as Date[] };
        }

        const { start, end } =
            trendFilter === "week"
                ? getWeekRange(trendAnchorDate)
                : trendFilter === "month"
                  ? getMonthRange(trendAnchorDate)
                  : {
                        start: new Date(trendAnchorDate.getFullYear(), 0, 1),
                        end: new Date(trendAnchorDate.getFullYear(), 11, 31)
                    };

        const dates = getDatesInRange(start, end);
        const labelKey = trendFilter === "week" ? "week" : trendFilter === "month" ? "month" : "year";
        const rawLabels = t.raw(`timeLabels.${labelKey}`);
        const labels = Array.isArray(rawLabels)
            ? rawLabels.map((label) => String(label))
            : typeof rawLabels === "string"
              ? rawLabels
                    .split(",")
                    .map((label) => label.trim())
                    .filter(Boolean)
              : [];

        let groupData: number[] = [];

        if (trendFilter === "week") {
            groupData = dates.map((date) => {
                const dateStr = formatDateLocal(date);
                return (
                    trendData?.reduce((sum, member) => {
                        const point = member.dailyCompletions?.find((p) => p.date === dateStr);
                        return sum + (point?.completedTasks ?? 0);
                    }, 0) ?? 0
                );
            });
        } else if (trendFilter === "month") {
            const bucketSize = Math.max(1, Math.ceil(dates.length / 5));
            for (let i = 0; i < 5; i++) {
                const bucketStart = i * bucketSize;
                const bucketEnd = Math.min((i + 1) * bucketSize, dates.length);
                const groupSum = dates.slice(bucketStart, bucketEnd).reduce((acc, date) => {
                    const dateStr = formatDateLocal(date);
                    return (
                        acc +
                        (trendData?.reduce((s, member) => {
                            const point = member.dailyCompletions?.find((p) => p.date === dateStr);
                            return s + (point?.completedTasks ?? 0);
                        }, 0) ?? 0)
                    );
                }, 0);
                groupData.push(groupSum);
            }
        } else {
            for (let month = 0; month < 12; month++) {
                const monthStart = new Date(trendAnchorDate.getFullYear(), month, 1);
                const monthEnd = new Date(trendAnchorDate.getFullYear(), month + 1, 0);

                const groupSum = dates
                    .filter((d) => d >= monthStart && d <= monthEnd)
                    .reduce((acc, date) => {
                        const dateStr = formatDateLocal(date);
                        return (
                            acc +
                            (trendData?.reduce((s, member) => {
                                const point = member.dailyCompletions?.find((p) => p.date === dateStr);
                                return s + (point?.completedTasks ?? 0);
                            }, 0) ?? 0)
                        );
                    }, 0);
                groupData.push(groupSum);
            }
        }

        return { groupData, labels, dates };
    }, [trendData, trendFilter, trendAnchorDate, t]);

    // Helper to compute data array for a specific member
    function computeMemberData(
        member: { dailyCompletions?: { date?: string; completedTasks?: number }[] | null },
        filter: TrendFilter,
        dates: Date[],
        fmt: (d: Date) => string
    ): number[] {
        if (filter === "week") {
            return dates.map((date) => {
                const dateStr = fmt(date);
                const point = member.dailyCompletions?.find((p) => p.date === dateStr);
                return point?.completedTasks ?? 0;
            });
        }
        if (filter === "month") {
            const bucketSize = Math.max(1, Math.ceil(dates.length / 5));
            const result: number[] = [];
            for (let i = 0; i < 5; i++) {
                const bucketStart = i * bucketSize;
                const bucketEnd = Math.min((i + 1) * bucketSize, dates.length);
                const sum = dates.slice(bucketStart, bucketEnd).reduce((acc, date) => {
                    const dateStr = fmt(date);
                    const point = member.dailyCompletions?.find((p) => p.date === dateStr);
                    return acc + (point?.completedTasks ?? 0);
                }, 0);
                result.push(sum);
            }
            return result;
        }
        // year
        const result: number[] = [];
        for (let month = 0; month < 12; month++) {
            const monthStart = new Date(trendAnchorDate.getFullYear(), month, 1);
            const monthEnd = new Date(trendAnchorDate.getFullYear(), month + 1, 0);
            const sum = dates
                .filter((d) => d >= monthStart && d <= monthEnd)
                .reduce((acc, date) => {
                    const dateStr = fmt(date);
                    const point = member.dailyCompletions?.find((p) => p.date === dateStr);
                    return acc + (point?.completedTasks ?? 0);
                }, 0);
            result.push(sum);
        }
        return result;
    }

    // Bar chart data
    const barCompareMembers = React.useMemo(() => {
        if (!summary?.memberTaskBreakdown) return [];

        return summary.memberTaskBreakdown.map((member, index) => ({
            userId: member.userId ?? `member-${index}`,
            userName: member.userName ?? `Member ${index + 1}`,
            totalTasks: member.totalTasks ?? 0,
            doneTasks: member.doneTasks ?? 0,
            inProgressTasks: member.inProgressTasks ?? 0,
            todoTasks: member.todoTasks ?? 0,
            overdueTasks: member.overdueTasks ?? 0,
            contributionScoreRate: member.contributionCountRate ?? 0,
            messagesSent: member.messagesSent ?? 0,
            colorSeed: index
        }));
    }, [summary]);

    const filteredBarCompareMembers = React.useMemo(() => {
        if (!canFilterMembers || selectedBarMembers.length === 0) {
            return barCompareMembers;
        }
        return barCompareMembers.filter((member) => selectedBarMembers.includes(member.userId));
    }, [barCompareMembers, canFilterMembers, selectedBarMembers]);

    // Heatmap data
    const heatmapMembers = React.useMemo(() => {
        if (!heatmapData) return [];

        return heatmapData.map((member) => ({
            id: member.userId ?? `member-${Math.random()}`,
            name: member.userName ?? "Unknown",
            activityByDate:
                member.activityByDate?.map((p) => ({
                    date: typeof p.date === "string" ? p.date : formatDateLocal(new Date(p.date as unknown as string)),
                    activityLevel: p.activityLevel ?? 0,
                    activityCount: p.activityCount ?? 0
                })) ?? []
        }));
    }, [heatmapData]);

    const filteredHeatmapMembers = React.useMemo(() => {
        if (selectedHeatmapMembers.length === 0) {
            return heatmapMembers;
        }
        return heatmapMembers.filter((member) => selectedHeatmapMembers.includes(member.id));
    }, [heatmapMembers, selectedHeatmapMembers]);

    // Member progress cards - combine with contribution data
    const memberProgressItems = React.useMemo((): MemberProgressItem[] => {
        if (!summary?.memberActivitySummary) return [];

        // Create map of contribution data by userId (includes weighted scores)
        const contributionMap = new Map<
            string,
            {
                contributionScoreRate: number;
                totalScore: number;
                tasksCompleted: number;
                tasksCreated: number;
                tasksUpdated: number;
                tasksDeleted: number;
                tasksAssigned: number;
                commentsCreated: number;
                messagesSent: number;
                completedScore: number;
                createdScore: number;
                updatedScore: number;
                deletedScore: number;
            }
        >();
        summary.memberContribution?.forEach((c) => {
            if (c.userId) {
                contributionMap.set(c.userId, {
                    contributionScoreRate: c.contributionScoreRate ?? 0,
                    totalScore: c.totalScore ?? 0,
                    tasksCompleted: c.tasksCompleted ?? 0,
                    tasksCreated: c.tasksCreated ?? 0,
                    tasksUpdated: c.tasksUpdated ?? 0,
                    tasksDeleted: c.tasksDeleted ?? 0,
                    tasksAssigned: c.tasksAssigned ?? 0,
                    commentsCreated: c.commentsCreated ?? 0,
                    messagesSent: c.messagesSent ?? 0,
                    completedScore: c.completedScore ?? 0,
                    createdScore: c.createdScore ?? 0,
                    updatedScore: c.updatedScore ?? 0,
                    deletedScore: c.deletedScore ?? 0
                });
            }
        });

        return summary.memberActivitySummary.map((member) => {
            const contribution = contributionMap.get(member.userId ?? "");
            return {
                id: member.userId ?? `member-${Math.random()}`,
                name: member.userName ?? "Unknown",
                completedTasks: member.completedTasks ?? 0,
                totalTasks: member.totalTasks ?? 0,
                lastActivity: formatLastActivity(member.lastActivityAt as unknown as string, t),
                // From memberContribution (weighted)
                contributionScoreRate: contribution?.contributionScoreRate,
                totalScore: contribution?.totalScore,
                tasksCompleted: contribution?.tasksCompleted,
                tasksCreated: contribution?.tasksCreated,
                tasksUpdated: contribution?.tasksUpdated,
                tasksDeleted: contribution?.tasksDeleted,
                tasksAssigned: contribution?.tasksAssigned,
                commentsCreated: contribution?.commentsCreated,
                messagesSent: contribution?.messagesSent,
                completedScore: contribution?.completedScore,
                createdScore: contribution?.createdScore,
                updatedScore: contribution?.updatedScore,
                deletedScore: contribution?.deletedScore
            };
        });
    }, [summary, t]);

    // ==================== Chart Options ====================

    const handlePrevTrendRange = React.useCallback(() => {
        setTrendAnchorDate((prev) => {
            const next = new Date(prev);
            if (trendFilter === "week") next.setDate(next.getDate() - 7);
            else if (trendFilter === "month") next.setMonth(next.getMonth() - 1);
            else next.setFullYear(next.getFullYear() - 1);
            return next;
        });
    }, [trendFilter]);

    const handleNextTrendRange = React.useCallback(() => {
        setTrendAnchorDate((prev) => {
            const next = new Date(prev);
            if (trendFilter === "week") next.setDate(next.getDate() + 7);
            else if (trendFilter === "month") next.setMonth(next.getMonth() + 1);
            else next.setFullYear(next.getFullYear() + 1);
            return next;
        });
    }, [trendFilter]);

    const trendRangeLabel = React.useMemo(() => {
        return getTrendRangeLabel(trendAnchorDate, trendFilter);
    }, [trendAnchorDate, trendFilter]);

    const handlePrevHeatmapRange = React.useCallback(() => {
        setHeatmapAnchorDate((prev) => {
            const next = new Date(prev);
            if (heatmapRange === "week") next.setDate(next.getDate() - 7);
            else next.setMonth(next.getMonth() - 1);
            return next;
        });
    }, [heatmapRange]);

    const handleNextHeatmapRange = React.useCallback(() => {
        setHeatmapAnchorDate((prev) => {
            const next = new Date(prev);
            if (heatmapRange === "week") next.setDate(next.getDate() + 7);
            else next.setMonth(next.getMonth() + 1);
            return next;
        });
    }, [heatmapRange]);

    const statusDonutOption = React.useMemo<echarts.EChartsOption>(() => {
        const { data, total, intersections } = personalPieData;
        const { inProgressOverdue = 0, todoOverdue = 0 } = intersections ?? {};

        return {
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
                formatter: (params: unknown) => {
                    const p = params as { name: string; value: number; percent: number };
                    const taskUnit = t("common.tasks");
                    const overdueLabel = t("taskStatus.overdue");
                    let extra = "";
                    if (p.name === t("taskStatus.inProgress") && inProgressOverdue > 0) {
                        extra = `<br/><span style="color:#ef4444">↳ ${inProgressOverdue} ${overdueLabel}</span>`;
                    }
                    if (p.name === t("taskStatus.todo") && todoOverdue > 0) {
                        extra = `<br/><span style="color:#ef4444">↳ ${todoOverdue} ${overdueLabel}</span>`;
                    }
                    return `${p.name}<br/>${p.value} ${taskUnit} (${p.percent}%)${extra}`;
                }
            },
            legend: { show: false },
            graphic: [
                {
                    type: "text",
                    left: "center",
                    top: "38%",
                    style: {
                        text: `${total}`,
                        textAlign: "center",
                        fill: "#0f172a",
                        fontSize: 28,
                        fontWeight: 700
                    }
                },
                {
                    type: "text",
                    left: "center",
                    top: "52%",
                    style: {
                        text: t("chart.myTasks"),
                        textAlign: "center",
                        fill: "#64748b",
                        fontSize: 13,
                        fontWeight: 500
                    }
                }
            ],
            series: [
                // Main pie chart (donut)
                {
                    name: t("chart.taskStatus"),
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
                    data
                }
            ]
        };
    }, [personalPieData, t]);

    const teamStatusDonutOption = React.useMemo<echarts.EChartsOption>(() => {
        const { data, total, intersections } = teamPieData;
        const { inProgressOverdue = 0, todoOverdue = 0 } = intersections ?? {};

        return {
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
                formatter: (params: unknown) => {
                    const p = params as { name: string; value: number; percent: number };
                    const taskUnit = t("common.tasks");
                    const overdueLabel = t("taskStatus.overdue");
                    let extra = "";
                    if (p.name === t("taskStatus.inProgress") && inProgressOverdue > 0) {
                        extra = `<br/><span style="color:#ef4444">↳ ${inProgressOverdue} ${overdueLabel}</span>`;
                    }
                    if (p.name === t("taskStatus.todo") && todoOverdue > 0) {
                        extra = `<br/><span style="color:#ef4444">↳ ${todoOverdue} ${overdueLabel}</span>`;
                    }
                    return `${p.name}<br/>${p.value} ${taskUnit} (${p.percent}%)${extra}`;
                }
            },
            legend: { show: false },
            graphic: [
                {
                    type: "text",
                    left: "center",
                    top: "38%",
                    style: {
                        text: `${total}`,
                        textAlign: "center",
                        fill: "#0f172a",
                        fontSize: 28,
                        fontWeight: 700
                    }
                },
                {
                    type: "text",
                    left: "center",
                    top: "52%",
                    style: {
                        text: t("chart.groupTasks"),
                        textAlign: "center",
                        fill: "#64748b",
                        fontSize: 13,
                        fontWeight: 500
                    }
                }
            ],
            series: [
                {
                    name: t("chart.groupTaskStatus"),
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
                    data
                }
            ]
        };
    }, [teamPieData, t]);

    const compareLineOption = React.useMemo<echarts.EChartsOption>(() => {
        const { groupData, labels, dates } = lineChartData;
        const seriesList: echarts.LineSeriesOption[] = [];

        // Selected members (only when owner/moderator filters)
        if (canFilterMembers && selectedTrendMembers.length > 0 && trendData) {
            selectedTrendMembers.forEach((memberId, idx) => {
                const member = trendData.find((m) => m.userId === memberId);
                if (!member) return;
                const color = MEMBER_COLORS[(idx + 2) % MEMBER_COLORS.length];
                seriesList.push({
                    name: member.userName ?? "",
                    type: "line",
                    smooth: true,
                    symbol: "circle",
                    symbolSize: 7,
                    data: computeMemberData(member, trendFilter, dates, formatDateLocal),
                    lineStyle: { width: 3, color, opacity: 0.95 },
                    itemStyle: { color, borderColor: "#fff", borderWidth: 2 }
                });
            });
        }

        // "Nhóm" line (always shown)
        seriesList.push({
            name: t("chart.group"),
            type: "line",
            smooth: true,
            symbol: "circle",
            symbolSize: 7,
            data: groupData,
            lineStyle: { width: 3, color: "#f97316", opacity: 0.95 },
            itemStyle: { color: "#f97316", borderColor: "#fff", borderWidth: 2 }
        });

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
                textStyle: { color: "#64748B" }
            },
            grid: {
                left: 30,
                right: 20,
                top: 30,
                bottom: 56,
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
            series: seriesList
        };
    }, [trendData, selectedTrendMembers, lineChartData, t, canFilterMembers]);

    const compareBarOption = React.useMemo<echarts.EChartsOption>(() => {
        const categories = [
            t("taskStatus.todo"),
            t("taskStatus.inProgress"),
            t("taskStatus.done"),
            t("taskStatus.overdue")
        ];
        const series: echarts.BarSeriesOption[] = filteredBarCompareMembers.map((member, index) => ({
            name: member.userName,
            type: "bar",
            barMaxWidth: 18,
            barGap: "8%",
            data: [member.todoTasks, member.inProgressTasks, member.doneTasks, member.overdueTasks],
            itemStyle: {
                borderRadius: [8, 8, 0, 0],
                color: MEMBER_COLORS[index % MEMBER_COLORS.length]
            },
            emphasis: {
                focus: "series"
            }
        }));

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
                textStyle: { color: "#fff" }
            },
            legend: {
                bottom: 0,
                type: "scroll",
                textStyle: { color: "#64748B" },
                pageTextStyle: { color: "#64748B" }
            },
            grid: {
                left: 8,
                right: 8,
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
                    fontSize: 12,
                    margin: 14
                }
            },
            yAxis: {
                type: "value",
                minInterval: 1,
                axisLabel: { color: "#64748B" },
                splitLine: { lineStyle: { color: "#E2E8F0", type: "dashed" } }
            },
            series
        };
    }, [filteredBarCompareMembers, t]);

    // ==================== Render ====================

    return (
        <div className="relative overflow-hidden bg-transparent px-8 py-6">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute top-[-40px] left-[-80px] h-72 w-72 rounded-full bg-orange-200/25 blur-3xl" />
                <div className="absolute top-[18%] right-[-80px] h-80 w-80 rounded-full bg-amber-200/20 blur-3xl" />
                <div className="absolute bottom-[-120px] left-[15%] h-96 w-96 rounded-full bg-orange-100/20 blur-3xl" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:28px_28px] opacity-40" />
            </div>

            <Container className="relative bg-transparent px-0 py-0 sm:px-0 lg:px-0">
                <div className="space-y-5">
                    <SectionReveal delay={0.04}>
                        <section className="space-y-4">
                            <div
                                className={cn(
                                    "grid gap-4",
                                    canViewPersonalPieChart ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"
                                )}>
                                {canViewPersonalPieChart && (
                                    <div className="rounded-[26px] border border-white/70 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:p-6">
                                        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                            <div>
                                                <h2 className="font-semibold text-lg text-slate-900">
                                                    {t("chart.myTaskDistribution")}
                                                </h2>
                                                <p className="mt-1 text-slate-500 text-sm">
                                                    {t("chart.myTaskDistributionDesc")}
                                                </p>
                                            </div>

                                            {/* Member filter dropdown - single selection for pie chart */}
                                            {canFilterMembers &&
                                                summary?.memberActivitySummary && (
                                                <div className="relative">
                                                    <button
                                                        type="button"
                                                        onClick={() => setPieDropdownOpen(!pieDropdownOpen)}
                                                        className={cn(
                                                            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
                                                            selectedPieMembers.length > 0
                                                                ? "border-orange-500 bg-orange-500 text-white"
                                                                : "border-slate-200 bg-white text-slate-600 hover:border-orange-300"
                                                        )}>
                                                        <Users className="h-4 w-4" />
                                                        <span>
                                                            {selectedPieMembers.length > 0
                                                                ? summary.memberActivitySummary.find((m) => m.userId === selectedPieMembers[0])?.userName ?? t("memberFilter.selectedMember")
                                                                : t("memberFilter.selectMembers")}
                                                        </span>
                                                        <svg
                                                            className={cn(
                                                                "h-4 w-4 transition-transform duration-200",
                                                                pieDropdownOpen && "rotate-180"
                                                            )}
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>

                                                    {pieDropdownOpen && (
                                                        <>
                                                            <div
                                                                className="fixed inset-0 z-10"
                                                                onClick={() => setPieDropdownOpen(false)}
                                                            />
                                                            <div className="absolute right-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                                                                <div className="max-h-64 overflow-y-auto p-2">
                                                                    {summary.memberActivitySummary.map((member) => {
                                                                        const isSelected = selectedPieMembers.includes(member.userId ?? "");
                                                                        return (
                                                                            <button
                                                                                key={member.userId}
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setSelectedPieMembers([member.userId ?? ""]);
                                                                                    setPieDropdownOpen(false);
                                                                                }}
                                                                                className={cn(
                                                                                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
                                                                                    isSelected
                                                                                        ? "bg-orange-50 text-orange-600"
                                                                                        : "text-slate-600 hover:bg-slate-50"
                                                                                )}>
                                                                                <div
                                                                                    className={cn(
                                                                                        "flex h-5 w-5 items-center justify-center rounded-full border-2 transition",
                                                                                        isSelected
                                                                                            ? "border-orange-500 bg-orange-500"
                                                                                            : "border-slate-300"
                                                                                    )}>
                                                                                    {isSelected && (
                                                                                        <div className="h-2 w-2 rounded-full bg-white" />
                                                                                    )}
                                                                                </div>
                                                                                <span className="flex-1 truncate font-medium">{member.userName}</span>
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                                            <div className="mx-auto w-full max-w-[260px]">
                                                <EChart option={statusDonutOption} height={250} />
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                {personalPieData.data.map((item, index) => {
                                                    const colors = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444"];
                                                    const intersections = personalPieData.intersections ?? {};
                                                    const isInProgress = index === 1;
                                                    const isTodo = index === 0;
                                                    const intersectionCount = isInProgress
                                                        ? intersections.inProgressOverdue
                                                        : isTodo
                                                          ? intersections.todoOverdue
                                                          : 0;
                                                    return (
                                                        <button
                                                            key={item.name}
                                                            type="button"
                                                            onClick={() => {
                                                                setStatusFilter({ type: filterTypes[index], isPersonal: true });
                                                            }}
                                                            className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3 text-left cursor-pointer transition-all duration-200 hover:-translate-y-[1px] hover:border-slate-200 hover:shadow-[0_8px_24px_rgba(15,23,42,0.10)] active:scale-[0.98]">
                                                            <div className="flex items-center gap-2">
                                                                <span
                                                                    className="h-2.5 w-2.5 rounded-full"
                                                                    style={{ backgroundColor: colors[index] }}
                                                                />
                                                                <span className="font-medium text-slate-500 text-xs">
                                                                    {item.name}
                                                                </span>
                                                            </div>
                                                            <div className="mt-2 font-bold text-lg text-slate-900">
                                                                {item.value}
                                                            </div>
                                                            {intersectionCount > 0 && (
                                                                <div className="mt-1 text-xs text-rose-500">
                                                                    ↳ {intersectionCount} {t("taskStatus.overdue")}
                                                                </div>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="rounded-[26px] border border-white/70 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:p-6">
                                    <div className="mb-5">
                                        <h2 className="font-semibold text-lg text-slate-900">
                                            {canViewPersonalPieChart
                                                ? t("chart.groupTaskDistribution")
                                                : t("chart.groupTaskDistribution")}
                                            {displayGroupName && (
                                                <span className="ml-2 font-normal text-slate-500">
                                                    — <span className="inline-block max-w-[200px] truncate align-bottom">{displayGroupName}</span>
                                                </span>
                                            )}
                                        </h2>
                                        <p className="mt-1 text-slate-500 text-sm">
                                            {t("chart.groupTaskDistributionDesc")}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                                        <div className="mx-auto w-full max-w-[260px]">
                                            <EChart option={teamStatusDonutOption} height={250} />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            {teamPieData.data.map((item, index) => {
                                                const colors = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444"];
                                                const intersections = teamPieData.intersections ?? {};
                                                const isInProgress = index === 1;
                                                const isTodo = index === 0;
                                                const intersectionCount = isInProgress
                                                    ? intersections.inProgressOverdue
                                                    : isTodo
                                                      ? intersections.todoOverdue
                                                      : 0;
                                                return (
                                                    <button
                                                        key={item.name}
                                                        type="button"
                                                        onClick={() => {
                                                            setStatusFilter({ type: filterTypes[index], isPersonal: false });
                                                        }}
                                                        className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3 text-left cursor-pointer transition-all duration-200 hover:-translate-y-[1px] hover:border-slate-200 hover:shadow-[0_8px_24px_rgba(15,23,42,0.10)] active:scale-[0.98]">
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className="h-2.5 w-2.5 rounded-full"
                                                                style={{ backgroundColor: colors[index] }}
                                                            />
                                                            <span className="font-medium text-slate-500 text-xs">
                                                                {item.name}
                                                            </span>
                                                        </div>
                                                        <div className="mt-2 font-bold text-lg text-slate-900">
                                                            {item.value}
                                                        </div>
                                                        {intersectionCount > 0 && (
                                                            <div className="mt-1 text-xs text-rose-500">
                                                                ↳ {intersectionCount} {t("taskStatus.overdue")}
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-[30px] border border-white/70 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:p-6">
                                <div className="mb-5 flex flex-col items-center gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <h2 className="font-semibold text-lg text-slate-900">
                                            {canViewPersonalPieChart
                                                ? t("chart.progressOverTime")
                                                : t("chart.progressOverTime")}
                                        </h2>
                                        <p className="mt-1 text-slate-500 text-sm">{t("chart.progressOverTimeDesc")}</p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="inline-flex rounded-2xl bg-slate-100 p-1">
                                            {[
                                                { key: "week", label: t("chartFilterLabels.week") },
                                                { key: "month", label: t("chartFilterLabels.month") },
                                                { key: "year", label: t("chartFilterLabels.year") }
                                            ].map((item) => (
                                                <button
                                                    key={item.key}
                                                    type="button"
                                                    onClick={() => {
                                                        const nextFilter = item.key as TrendFilter;
                                                        setTrendFilter(nextFilter);
                                                        setTrendAnchorDate(new Date());
                                                    }}
                                                    className={cn(
                                                        "rounded-xl px-4 py-2 font-medium text-sm transition",
                                                        trendFilter === item.key
                                                            ? "bg-white text-orange-500 shadow-sm"
                                                            : "text-slate-500 hover:text-orange-500"
                                                    )}>
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                            <button
                                                type="button"
                                                onClick={handlePrevTrendRange}
                                                className="rounded-full px-2 py-1 text-slate-500 transition-all duration-300 hover:bg-slate-100 hover:text-slate-900 active:scale-95">
                                                ‹
                                            </button>
                                            <div className="min-w-[190px] text-center font-semibold text-slate-700 text-sm">
                                                {trendRangeLabel}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleNextTrendRange}
                                                className="rounded-full px-2 py-1 text-slate-500 transition-all duration-300 hover:bg-slate-100 hover:text-slate-900 active:scale-95">
                                                ›
                                            </button>
                                        </div>
                                    </div>

                                    {/* Member filter dropdown — only for owner/moderator */}
                                    {canFilterMembers &&
                                        summary?.memberActivitySummary && (
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setTrendDropdownOpen(!trendDropdownOpen)}
                                                className={cn(
                                                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
                                                    selectedTrendMembers.length > 0
                                                        ? "border-orange-500 bg-orange-500 text-white"
                                                        : "border-slate-200 bg-white text-slate-600 hover:border-orange-300"
                                                )}>
                                                <Users className="h-4 w-4" />
                                                <span>
                                                    {selectedTrendMembers.length > 0
                                                        ? t("memberFilter.selected", { count: selectedTrendMembers.length })
                                                        : t("memberFilter.selectMembers")}
                                                </span>
                                                {selectedTrendMembers.length > 0 && (
                                                    <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                                                        {selectedTrendMembers.length}
                                                    </span>
                                                )}
                                                <svg
                                                    className={cn(
                                                        "h-4 w-4 transition-transform duration-200",
                                                        trendDropdownOpen && "rotate-180"
                                                    )}
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>

                                            {trendDropdownOpen && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={() => setTrendDropdownOpen(false)}
                                                    />
                                                    <div className="absolute right-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                                                        <div className="max-h-64 overflow-y-auto p-2">
                                                            {summary.memberActivitySummary.map((member) => {
                                                                const isSelected = selectedTrendMembers.includes(member.userId ?? "");
                                                                return (
                                                                    <button
                                                                        key={member.userId}
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedTrendMembers((prev) =>
                                                                                isSelected
                                                                                    ? prev.filter((id) => id !== member.userId)
                                                                                    : [...prev, member.userId ?? ""]
                                                                            );
                                                                        }}
                                                                        className={cn(
                                                                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
                                                                            isSelected
                                                                                ? "bg-orange-50 text-orange-600"
                                                                                : "text-slate-600 hover:bg-slate-50"
                                                                        )}>
                                                                        <div
                                                                            className={cn(
                                                                                "flex h-5 w-5 items-center justify-center rounded-md border-2 transition",
                                                                                isSelected
                                                                                    ? "border-orange-500 bg-orange-500"
                                                                                    : "border-slate-300"
                                                                            )}>
                                                                            {isSelected && (
                                                                                <svg
                                                                                    className="h-3 w-3 text-white"
                                                                                    fill="none"
                                                                                    viewBox="0 0 24 24"
                                                                                    stroke="currentColor">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                                </svg>
                                                                            )}
                                                                        </div>
                                                                        <span className="flex-1 truncate font-medium text-black">{member.userName}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        {selectedTrendMembers.length > 0 && (
                                                            <div className="border-t border-slate-100 p-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedTrendMembers([]);
                                                                    }}
                                                                    className="w-full rounded-xl px-3 py-2 text-center text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700">
                                                                    {t("memberFilter.clearAll")}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <EChart option={compareLineOption} height={460} />
                            </div>
                        </section>
                    </SectionReveal>

                    <SectionReveal delay={0.08}>
                        <section className="space-y-4">
                            <div className="rounded-[30px] border border-white/70 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:p-6">
                                <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <h2 className="font-semibold text-lg text-slate-900">
                                            {canViewPersonalPieChart
                                                ? t("chart.compareByMember")
                                                : t("chart.compareByMember")}
                                        </h2>
                                    </div>

                                    {/* Member filter dropdown for bar chart */}
                                    {(currentUserRole === "owner" || currentUserRole === "moderator") &&
                                        summary?.memberActivitySummary && (
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setBarDropdownOpen(!barDropdownOpen)}
                                                className={cn(
                                                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
                                                    selectedBarMembers.length > 0
                                                        ? "border-orange-500 bg-orange-500 text-white"
                                                        : "border-slate-200 bg-white text-slate-600 hover:border-orange-300"
                                                )}>
                                                <Users className="h-4 w-4" />
                                                <span>
                                                    {selectedBarMembers.length > 0
                                                        ? t("memberFilter.selected", { count: selectedBarMembers.length })
                                                        : t("memberFilter.selectMembers")}
                                                </span>
                                                {selectedBarMembers.length > 0 && (
                                                    <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                                                        {selectedBarMembers.length}
                                                    </span>
                                                )}
                                                <svg
                                                    className={cn(
                                                        "h-4 w-4 transition-transform duration-200",
                                                        barDropdownOpen && "rotate-180"
                                                    )}
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>

                                            {barDropdownOpen && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={() => setBarDropdownOpen(false)}
                                                    />
                                                    <div className="absolute right-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                                                        <div className="max-h-64 overflow-y-auto p-2">
                                                            {summary.memberActivitySummary.map((member) => {
                                                                const isSelected = selectedBarMembers.includes(member.userId ?? "");
                                                                return (
                                                                    <button
                                                                        key={member.userId}
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedBarMembers((prev) =>
                                                                                isSelected
                                                                                    ? prev.filter((id) => id !== member.userId)
                                                                                    : [...prev, member.userId ?? ""]
                                                                            );
                                                                        }}
                                                                        className={cn(
                                                                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
                                                                            isSelected
                                                                                ? "bg-orange-50 text-orange-600"
                                                                                : "text-slate-600 hover:bg-slate-50"
                                                                        )}>
                                                                        <div
                                                                            className={cn(
                                                                                "flex h-5 w-5 items-center justify-center rounded-md border-2 transition",
                                                                                isSelected
                                                                                    ? "border-orange-500 bg-orange-500"
                                                                                    : "border-slate-300"
                                                                            )}>
                                                                            {isSelected && (
                                                                                <svg
                                                                                    className="h-3 w-3 text-white"
                                                                                    fill="none"
                                                                                    viewBox="0 0 24 24"
                                                                                    stroke="currentColor">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                                </svg>
                                                                            )}
                                                                        </div>
                                                                        <span className="flex-1 truncate font-medium">{member.userName}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        {selectedBarMembers.length > 0 && (
                                                            <div className="border-t border-slate-100 p-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedBarMembers([]);
                                                                    }}
                                                                    className="w-full rounded-xl px-3 py-2 text-center text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700">
                                                                    {t("memberFilter.clearAll")}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <EChart option={compareBarOption} height={430} />
                            </div>

                            <GroupActivityHeatmap
                                members={filteredHeatmapMembers}
                                range={heatmapRange}
                                anchorDate={heatmapAnchorDate}
                                onPrev={handlePrevHeatmapRange}
                                onNext={handleNextHeatmapRange}
                                onChangeRange={setHeatmapRange}
                                canFilterMembers={canFilterMembers}
                                memberOptions={summary?.memberActivitySummary ?? []}
                                selectedMemberIds={selectedHeatmapMembers}
                                dropdownOpen={heatmapDropdownOpen}
                                onToggleDropdown={() => setHeatmapDropdownOpen((prev) => !prev)}
                                onCloseDropdown={() => setHeatmapDropdownOpen(false)}
                                onToggleMember={(memberId) => {
                                    setSelectedHeatmapMembers((prev) =>
                                        prev.includes(memberId)
                                            ? prev.filter((id) => id !== memberId)
                                            : [...prev, memberId]
                                    );
                                }}
                                onClearMembers={() => setSelectedHeatmapMembers([])}
                                locale={locale}
                                t={t}
                            />
                        </section>
                    </SectionReveal>

                    <SectionReveal delay={0.12}>
                        <TeamMemberProgressSection
                            members={memberProgressItems}
                            onMemberClick={setSelectedMember}
                            t={t}
                        />
                    </SectionReveal>

                    {/* Member Detail Modal - Layer 2 */}
                    <MemberDetailModal
                        member={selectedMember}
                        open={selectedMember !== null}
                        onClose={() => setSelectedMember(null)}
                        t={t}
                    />

                    {/* Task Status Popup */}
                    <TaskStatusPopup
                        open={statusFilter.type !== null}
                        onClose={() => setStatusFilter({ type: null, isPersonal: true })}
                        filter={statusFilter.type ?? "notstarted"}
                        isPersonal={statusFilter.isPersonal}
                        groupId={groupId}
                        currentUserId={statusFilter.isPersonal ? effectivePieMemberId : (currentUserId ?? "")}
                    />

                    {loading && <div className="text-slate-500 text-sm">{t("common.loading")}</div>}
                </div>
            </Container>
        </div>
    );
}
