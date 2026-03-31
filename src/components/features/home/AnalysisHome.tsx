"use client";

import { motion } from "framer-motion";
import {
    Activity,
    AlertCircle,
    ArrowDownRight,
    ArrowUpRight,
    CheckCircle2,
    ChevronDown,
    Clock,
    Filter,
    HelpCircle,
    Star,
    Target,
    TrendingUp,
    Zap
} from "lucide-react";
import * as React from "react";
import { useCallback, useEffect, useState } from "react";

type TrendPeriod = 7 | 14 | 30;
type BenchmarkPeriod = 4 | 7 | 12;
// Recharts
import {
    Area,
    AreaChart,
    Bar,
    CartesianGrid,
    Cell,
    ComposedChart,
    Legend,
    Line,
    Pie,
    PieChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import {
    getUserBenchmark,
    getUserGroupRankings,
    getUserKpiSummary,
    getUserOnTimeOverview,
    getUserPriorityDistribution,
    getUserProductivityTrend,
    getUserRiskAlerts,
    getUserTaskStatus,
    getUserUrgencyDistribution,
    type UserBenchmarkResponse,
    type UserGroupRankingsResponse,
    type UserKpiSummaryResponse,
    type UserOnTimeOverviewResponse,
    type UserPriorityDistributionResponse,
    type UserProductivityTrendResponse,
    type UserRiskAlertsResponse,
    type UserTaskStatusResponse,
    type UserUrgencyDistributionResponse
} from "@/api/analytics-personal";
import { getUserData } from "@/api/auth";
import { Container } from "@/components/common";
import HomeTopTabs from "./HomeTopTabs";

// ─── Color Tokens ───────────────────────────────────────────
const C = {
    orange: "#f97316",
    orangeLight: "#fed7aa",
    orangeDark: "#ea580c",
    teal: "#14b8a6",
    tealLight: "#d0f7f3",
    tealDark: "#0d9488",
    red: "#ef4444",
    redLight: "#fecaca",
    green: "#10b981",
    amber: "#f59e0b",
    blue: "#3b82f6",
    blueLight: "#bfdbfe",
    slate: "#64748b",
    slateLight: "#f1f5f9",
    slateMid: "#94a3b8",
    white: "#ffffff",
    border: "#e2e8f0",
    bg: "#f8fafc"
} as const;

// Donut colors matching GroupAnalyticPage: Todo/InProgress/Done/Overdue
const DONUT_STATUS_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444"];

// ─── Skeleton Helper ──────────────────────────────────────────
function SkeletonBlock({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
    return <div className={`animate-pulse rounded-lg bg-slate-100 ${className}`} style={style} />;
}

function SkeletonCard() {
    return (
        <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <SkeletonBlock className="mb-3 h-3 w-24" />
            <SkeletonBlock className="h-8 w-16" />
        </div>
    );
}

function SkeletonChart({ height = 256 }: { height?: number }) {
    return (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <SkeletonBlock className="mb-4 h-4 w-40" />
            <SkeletonBlock className="w-full" style={{ height }} />
        </div>
    );
}

// ─── Utility ─────────────────────────────────────────────────
function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

// Parse ISO week string "2026-W08" → label "02/03–08/03"
function formatWeekRange(isoWeek: string): string {
    const match = isoWeek.match(/^(\d{4})-W(\d{2})$/);
    if (!match) return isoWeek;
    const year = parseInt(match[1]);
    const week = parseInt(match[2]);

    // Get Monday of the ISO week
    const jan4 = new Date(year, 0, 4); // Jan 4 is always in week 1
    const jan4Day = jan4.getDay() || 7;
    const weekStart = new Date(jan4);
    weekStart.setDate(jan4.getDate() - jan4Day + 1 + (week - 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const pad = (n: number) => `${n}`.padStart(2, "0");
    return `${pad(weekStart.getDate())}/${pad(weekStart.getMonth() + 1)}–${pad(weekEnd.getDate())}/${pad(weekEnd.getMonth() + 1)}`;
}

// ─── Section Header ──────────────────────────────────────────
function SectionTitle({
    children,
    action,
    subtitle
}: {
    children: React.ReactNode;
    action?: React.ReactNode;
    subtitle?: string;
}) {
    return (
        <div className="mb-4 flex items-start justify-between gap-4">
            <div>
                <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">{children}</h2>
                {subtitle && <p className="mt-0.5 text-slate-400 text-xs">{subtitle}</p>}
            </div>
            {action}
        </div>
    );
}

// ─── Benchmark Formula Tooltip ──────────────────────────────────
function BenchmarkTooltip() {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative inline-flex">
            <button
                onClick={() => setOpen((o) => !o)}
                className="flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:text-orange-500 transition-colors cursor-help"
                title="Công thức tính Benchmark">
                <HelpCircle className="h-4 w-4" />
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl">
                        <p className="mb-3 font-bold text-slate-700 text-xs uppercase tracking-wide">Công thức tính Benchmark</p>

                        <div className="space-y-3">
                            {/* Bạn */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                                    <span className="font-semibold text-slate-700 text-xs">Bạn — Điểm tuần này</span>
                                </div>
                                <div className="rounded-lg bg-slate-50 px-3 py-2 text-slate-500 text-[11px] leading-relaxed">
                                    <span className="font-medium text-orange-600">Hoàn thành task</span> → 10 × Priority × Severity<br />
                                    <span className="font-medium text-orange-600">Tạo task</span> → +3 điểm (flat)<br />
                                    <span className="font-medium text-orange-600">Cập nhật task</span> → +1 điểm (flat)<br />
                                    <span className="font-medium text-orange-600">Comment / Tin nhắn nhóm</span> → +1 điểm (flat)<br />
                                    <span className="mt-1 block text-slate-400 italic">Priority: Low=1.0, Med=1.5, High=2.0</span>
                                    <span className="text-slate-400 italic">Severity: Minor=1.0, Mod=1.2, Major=1.5, Critical=2.0</span>
                                </div>
                            </div>

                            {/* TB nhóm */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                                    <span className="font-semibold text-slate-700 text-xs">TB nhóm — Trung bình cộng</span>
                                </div>
                                <div className="rounded-lg bg-slate-50 px-3 py-2 text-slate-500 text-[11px] leading-relaxed">
                                    Tổng điểm tất cả thành viên trong nhóm<br />
                                    ÷ Số thành viên của nhóm
                                </div>
                            </div>

                            {/* Xu hướng */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                                    <span className="font-semibold text-slate-700 text-xs">Xu hướng — Trung bình 3 tuần</span>
                                </div>
                                <div className="rounded-lg bg-slate-50 px-3 py-2 text-slate-500 text-[11px] leading-relaxed">
                                    Trung bình cộng điểm của bạn trong 3 tuần gần nhất (bao gồm tuần hiện tại)
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Card Shell ─────────────────────────────────────────────
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn(
            "rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl",
            className
        )}>{children}</div>
    );
}

// ─── KPI Card ────────────────────────────────────────────────
function KpiCard({
    title,
    value,
    badge,
    badgeType = "neutral",
    sub,
    progress,
    accentColor
}: {
    title: string;
    value: string | number;
    badge?: string;
    badgeType?: "up" | "down" | "neutral";
    sub?: string;
    progress?: number;
    accentColor?: string;
}) {
    const badgeColors = {
        up: "bg-orange-50 text-orange-600",
        down: "bg-red-50 text-red-500",
        neutral: "bg-slate-100 text-slate-500"
    };

    return (
        <Card className="flex flex-col gap-3">
            <p className="font-medium text-slate-400 text-xs uppercase tracking-wider">{title}</p>
            <div className="flex items-end gap-2">
                <p className="font-bold text-3xl text-slate-900 tracking-tight">{value}</p>
                {sub && <span className="mb-1 text-slate-400 text-sm">{sub}</span>}
            </div>
            {badge && (
                <div className="flex items-center gap-1.5">
                    <span
                        className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-xs",
                            badgeColors[badgeType]
                        )}>
                        {badgeType === "up" && <ArrowUpRight className="h-3 w-3" />}
                        {badgeType === "down" && <ArrowDownRight className="h-3 w-3" />}
                        {badge}
                    </span>
                </div>
            )}
            {progress !== undefined && (
                <div className="mt-auto">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                                width: `${progress}%`,
                                backgroundColor: accentColor ?? C.orange
                            }}
                        />
                    </div>
                </div>
            )}
        </Card>
    );
}

// ─── Rank Badge (Group Avatar) ─────────────────────────────────
function RankBadge({ rank, groupName }: { rank: number; groupName: string }) {
    const config: Record<number, { bg: string; text: string; initials: string }> = {
        1: { bg: "bg-gradient-to-br from-teal-400 to-teal-600", text: "text-white", initials: "" },
        2: { bg: "bg-gradient-to-br from-amber-300 to-amber-500", text: "text-white", initials: "" },
        3: { bg: "bg-gradient-to-br from-slate-300 to-slate-500", text: "text-white", initials: "" }
    };
    const c = config[rank] ?? { bg: "bg-slate-100", text: "text-slate-400", initials: "" };

    // Derive initials from group name (e.g. "UI/UX Team" → "UT", "DevOps" → "DO")
    const words = groupName.split(/\s+/);
    const initials = words.length >= 2 ? words[0][0] + words[1][0] : groupName.slice(0, 2).toUpperCase();

    return (
        <span
            className={cn(
                "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-black text-xs uppercase shadow-sm",
                c.bg,
                c.text
            )}
            title={`#${rank} — ${groupName}`}>
            {initials}
        </span>
    );
}

// ─── Delta Badge ─────────────────────────────────────────────
function DeltaBadge({ delta }: { delta: number }) {
    const positive = delta >= 0;
    return (
        <span
            className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-bold text-xs",
                positive ? "bg-orange-50 text-orange-600" : "bg-red-50 text-red-500"
            )}>
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {positive ? "+" : ""}
            {delta}%
        </span>
    );
}

// ─── Custom Tooltip: Area Chart ──────────────────────────────
function AreaChartTooltip({ active, payload, label }: any) {
    if (!(active && payload?.length)) return null;
    // Filter out ReferenceLine payload entries (they have no dataKey)
    const filtered = payload.filter((entry: any) => entry.dataKey);
    if (!filtered.length) return null;

    const nameMap: Record<string, string> = {
        completed: "Hoàn thành",
        overdue: "Quá hạn"
    };

    return (
        <div className="rounded-xl border border-slate-100 bg-white/95 p-3 shadow-xl backdrop-blur-sm">
            <p className="mb-2 font-semibold text-slate-500 text-xs">{label}</p>
            {filtered.map((entry: any) => (
                <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-slate-600">{nameMap[entry.dataKey] ?? entry.dataKey}</span>
                    <span className="ml-auto font-semibold text-slate-900">{entry.value}</span>
                </div>
            ))}
        </div>
    );
}

// ─── Custom Tooltip: Pie/Donut ───────────────────────────────
function DonutTooltip({ active, payload }: any) {
    if (!(active && payload?.length)) return null;
    const d = payload[0];
    return (
        <div className="rounded-xl border border-slate-100 bg-white/95 p-3 shadow-xl backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: d.payload.color }} />
                <span className="font-medium text-slate-700">{d.name}</span>
                <span className="ml-auto font-bold text-slate-900">{d.value} tasks</span>
            </div>
        </div>
    );
}

// ─── Custom Tooltip: Bar Chart ───────────────────────────────
function BarChartTooltip({ active, payload, label }: any) {
    if (!(active && payload?.length)) return null;
    return (
        <div className="rounded-xl border border-slate-100 bg-white/95 p-3 shadow-xl backdrop-blur-sm">
            <p className="mb-2 font-semibold text-slate-500 text-xs">{label}</p>
            {payload.map((entry: any) => (
                <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                    <span className="text-slate-600">
                        {entry.name === "you"
                            ? "Bạn"
                            : entry.name === "avg"
                              ? "TB nhóm"
                              : entry.name === "groupAvg"
                                ? "TB nhóm"
                                : entry.name === "user"
                                  ? "Bạn"
                                  : entry.name}
                        :
                    </span>
                    <span className="ml-auto font-semibold text-slate-900">{entry.value}</span>
                </div>
            ))}
        </div>
    );
}

// ─── Donut Center Label (SVG) ───────────────────────────────
function DonutCenterLabel({
    cx,
    cy,
    onTimeRate,
    total,
    label
}: {
    cx?: number;
    cy?: number;
    onTimeRate: number;
    total: number;
    label?: string;
}) {
    if (!(cx && cy)) return null;
    return (
        <g>
            <text
                x={cx}
                y={cy - 10}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-slate-900 font-black text-[28px]"
                style={{ fontFamily: "inherit" }}>
                {onTimeRate}%
            </text>
            <text
                x={cx}
                y={cy + 12}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-slate-400"
                style={{ fontSize: 11, fontFamily: "inherit" }}>
                {label ?? "Đúng hạn"}
            </text>
            <text
                x={cx}
                y={cy + 28}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-slate-300"
                style={{ fontSize: 10, fontFamily: "inherit" }}>
                Tổng {total} công việc
            </text>
        </g>
    );
}

// ─── My Task Status Donut ────────────────────────────────────────
function MyTaskStatusCard({
    data,
    completionRate,
    total
}: {
    data: Array<{ name: string; value: number; color: string }>;
    completionRate: number;
    total: number;
}) {
    return (
        <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            {/* Donut */}
            <div className="relative mx-auto w-full max-w-[220px]">
                <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={95}
                            paddingAngle={2}
                            dataKey="value"
                            startAngle={90}
                            endAngle={-270}
                            labelLine={false}
                            label={({ cx, cy }) => (
                                <DonutCenterLabel
                                    cx={cx}
                                    cy={cy}
                                    onTimeRate={completionRate}
                                    total={total}
                                    label="Hoàn thành"
                                />
                            )}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip content={<DonutTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Legend grid */}
            <div className="grid grid-cols-2 gap-2">
                {data.map((item) => (
                    <div key={item.name} className="rounded-xl border border-slate-50 bg-slate-50/60 px-3 py-3">
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="font-medium text-slate-500 text-xs">{item.name}</span>
                        </div>
                        <div className="mt-1.5 font-bold text-slate-900 text-xl">{item.value}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Risk Alert Card ─────────────────────────────────────────
function RiskAlertCard({
    type,
    title,
    description,
    group
}: {
    type: string;
    title: string;
    description: string;
    group: string;
}) {
    const config: Record<
        string,
        {
            bg: string;
            iconBg: string;
            icon: React.ReactNode;
            badge: string;
            badgeLabel: string;
        }
    > = {
        overdue: {
            bg: "bg-red-50 border-red-100",
            iconBg: "bg-red-500",
            icon: <AlertCircle className="h-4 w-4 text-white" />,
            badge: "bg-red-100 text-red-700",
            badgeLabel: "Quá hạn"
        },
        due_soon: {
            bg: "bg-orange-50 border-orange-100",
            iconBg: "bg-orange-500",
            icon: <Clock className="h-4 w-4 text-white" />,
            badge: "bg-orange-100 text-orange-700",
            badgeLabel: "Sắp đến hạn"
        },
        stuck: {
            bg: "bg-amber-50 border-amber-100",
            iconBg: "bg-amber-500",
            icon: <Zap className="h-4 w-4 text-white" />,
            badge: "bg-amber-100 text-amber-700",
            badgeLabel: "Bị stuck"
        }
    };
    const c = config[type] ?? config.overdue;

    return (
        <div className={cn("flex items-start gap-3 rounded-xl border p-4 transition-all hover:shadow-sm", c.bg)}>
            <div
                className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm",
                    c.iconBg
                )}>
                {c.icon}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <h4 className="truncate font-semibold text-slate-800 text-sm">{title}</h4>
                    <span
                        className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 font-bold text-[10px] uppercase tracking-wide",
                            c.badge
                        )}>
                        {c.badgeLabel}
                    </span>
                </div>
                <p className="mt-0.5 text-slate-500 text-xs">{description}</p>
                <p className="mt-1 font-medium text-[10px] text-slate-400 uppercase tracking-wider">{group}</p>
            </div>
        </div>
    );
}

// ─── Group Filter Dropdown (single select) ─────────────────────
function GroupFilterDropdown({
    allGroups,
    selectedGroupId,
    selectedGroupName,
    onSelect
}: {
    allGroups: Array<{ groupId: string; groupName: string }>;
    selectedGroupId: string;
    selectedGroupName: string;
    onSelect: (groupId: string, groupName: string) => void;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setOpen((o) => !o)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-medium text-slate-700 text-sm shadow-sm transition-all hover:border-orange-300 hover:text-orange-600">
                <Filter className="h-4 w-4" />
                {selectedGroupName || "Tất cả nhóm"}
                <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-180")} />
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute top-full right-0 z-50 mt-2 w-56 rounded-xl border border-slate-100 bg-white shadow-xl">
                        <div className="max-h-64 overflow-y-auto">
                            {allGroups.map((group) => (
                                <button
                                    key={group.groupId}
                                    onClick={() => {
                                        onSelect(group.groupId, group.groupName);
                                        setOpen(false);
                                    }}
                                    className={cn(
                                        "w-full px-4 py-2.5 text-left text-sm transition-colors",
                                        selectedGroupId === group.groupId
                                            ? "bg-orange-50 font-semibold text-orange-600"
                                            : "text-slate-600 hover:bg-slate-50"
                                    )}>
                                    {group.groupName}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Tab Bar ─────────────────────────────────────────────────
function TabBar({
    tabs,
    activeTab,
    onTabChange
}: {
    tabs: Array<{ key: string; label: string }>;
    activeTab: string;
    onTabChange: (key: string) => void;
}) {
    return (
        <div className="mb-4 flex items-center gap-0 border-slate-100 border-b">
            {tabs.map((tab) => {
                const isActive = tab.key === activeTab;
                return (
                    <button
                        key={tab.key}
                        onClick={() => onTabChange(tab.key)}
                        className={cn(
                            "relative px-4 py-2.5 font-semibold text-sm transition-colors",
                            isActive ? "text-orange-600" : "text-slate-400 hover:text-slate-600"
                        )}>
                        {tab.label}
                        {isActive && (
                            <span className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-orange-500" />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
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
export default function AnalysisHome() {
    const [priorityTab, setPriorityTab] = useState<"priority" | "urgency">("priority");

    // ── API State ────────────────────────────────────────────────
    const [userId, setUserId] = useState<string | null>(null);
    const [selectedGroupId, setSelectedGroupId] = useState<string>("");
    const [selectedGroupName, setSelectedGroupName] = useState<string>("Tất cả nhóm");

    // Data states
    const [kpiData, setKpiData] = useState<UserKpiSummaryResponse | null>(null);
    const [taskStatusData, setTaskStatusData] = useState<UserTaskStatusResponse | null>(null);
    const [groupRankingsData, setGroupRankingsData] = useState<UserGroupRankingsResponse | null>(null);
    const [trendData, setTrendData] = useState<UserProductivityTrendResponse | null>(null);
    const [onTimeData, setOnTimeData] = useState<UserOnTimeOverviewResponse | null>(null);
    const [priorityData, setPriorityData] = useState<UserPriorityDistributionResponse | null>(null);
    const [urgencyData, setUrgencyData] = useState<UserUrgencyDistributionResponse | null>(null);
    const [benchmarkData, setBenchmarkData] = useState<UserBenchmarkResponse | null>(null);
    const [riskAlertsData, setRiskAlertsData] = useState<UserRiskAlertsResponse | null>(null);

    // Loading / error states (per chart)
    const [kpiLoading, setKpiLoading] = useState(true);
    const [taskStatusLoading, setTaskStatusLoading] = useState(true);
    const [rankingsLoading, setRankingsLoading] = useState(true);
    const [trendLoading, setTrendLoading] = useState(true);
    const [onTimeLoading, setOnTimeLoading] = useState(true);
    const [priorityLoading, setPriorityLoading] = useState(true);
    const [urgencyLoading, setUrgencyLoading] = useState(true);
    const [benchmarkLoading, setBenchmarkLoading] = useState(true);
    const [riskAlertsLoading, setRiskAlertsLoading] = useState(true);

    // Filter states
    const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>(30);
    const [benchmarkPeriod, setBenchmarkPeriod] = useState<BenchmarkPeriod>(7);

    // ── Fetch on mount ───────────────────────────────────────────
    useEffect(() => {
        const user = getUserData();
        if (!user?.id) return;
        const uid = user.id;
        setUserId(uid);

        const locale = "vi";

        Promise.all([
            getUserKpiSummary(uid, locale).then((r) => {
                if (r.status === "success" && r.data) setKpiData(r.data);
                setKpiLoading(false);
            }),
            getUserTaskStatus(uid, locale).then((r) => {
                if (r.status === "success" && r.data) setTaskStatusData(r.data);
                setTaskStatusLoading(false);
            }),
            getUserGroupRankings(uid, locale).then((r) => {
                if (r.status === "success" && r.data) setGroupRankingsData(r.data);
                setRankingsLoading(false);
            }),
            getUserProductivityTrend(uid, trendPeriod, locale).then((r) => {
                if (r.status === "success" && r.data) setTrendData(r.data);
                setTrendLoading(false);
            }),
            getUserOnTimeOverview(uid, locale).then((r) => {
                if (r.status === "success" && r.data) setOnTimeData(r.data);
                setOnTimeLoading(false);
            }),
            getUserPriorityDistribution(uid, locale).then((r) => {
                if (r.status === "success" && r.data) setPriorityData(r.data);
                setPriorityLoading(false);
            }),
            getUserUrgencyDistribution(uid, locale).then((r) => {
                if (r.status === "success" && r.data) setUrgencyData(r.data);
                setUrgencyLoading(false);
            }),
            getUserBenchmark(uid, benchmarkPeriod, undefined, locale).then((r) => {
                if (r.status === "success" && r.data) setBenchmarkData(r.data);
                setBenchmarkLoading(false);
            }),
            getUserRiskAlerts(uid, 10, locale).then((r) => {
                if (r.status === "success" && r.data) setRiskAlertsData(r.data);
                setRiskAlertsLoading(false);
            })
        ]);
    }, []);

    // ── Refetch benchmark when group filter or period changes ─────
    const fetchBenchmark = useCallback((uid: string, groupId: string | undefined, weeks: number, locale = "vi") => {
        setBenchmarkLoading(true);
        getUserBenchmark(uid, weeks, groupId, locale).then((r) => {
            if (r.status === "success" && r.data) setBenchmarkData(r.data);
            setBenchmarkLoading(false);
        });
    }, []);

    useEffect(() => {
        if (!userId) return;
        fetchBenchmark(userId, selectedGroupId || undefined, benchmarkPeriod);
    }, [userId, selectedGroupId, benchmarkPeriod, fetchBenchmark]);

    // ── Refetch trend when period changes ──────────────────────
    const fetchTrend = useCallback((uid: string, period: number, locale = "vi") => {
        setTrendLoading(true);
        getUserProductivityTrend(uid, period, locale).then((r) => {
            if (r.status === "success" && r.data) setTrendData(r.data);
            setTrendLoading(false);
        });
    }, []);

    useEffect(() => {
        if (!userId) return;
        fetchTrend(userId, trendPeriod);
    }, [userId, trendPeriod, fetchTrend]);

    // ── Derived values ──────────────────────────────────────────
    const totalOnTime = onTimeData?.segments?.find((s) => s.name === "Đúng hạn")?.value ?? 0;
    const totalOverdue = onTimeData?.segments?.find((s) => s.name === "Quá hạn")?.value ?? 0;
    const totalTasks = totalOnTime + totalOverdue;
    const onTimeRate = totalTasks > 0 ? Math.round((totalOnTime / totalTasks) * 100) : 0;

    const taskStatusSegments = taskStatusData?.segments ?? [];
    const completedValue = taskStatusSegments.find((s) => s.name === "Hoàn thành")?.value ?? 0;
    const taskStatusTotal = taskStatusSegments.reduce((sum, s) => sum + (s.value ?? 0), 0);
    const taskStatusRate = taskStatusTotal > 0 ? Math.round((completedValue / taskStatusTotal) * 100) : 0;

    const benchmarkPoints = benchmarkData?.benchmark ?? [];
    const latestBenchmark = benchmarkPoints[benchmarkPoints.length - 1];
    const userScore = latestBenchmark?.user ?? 0;
    const groupAvgScore = latestBenchmark?.groupAvg ?? 0;
    const scoreDiff = userScore - groupAvgScore;

    const alertItems = riskAlertsData?.alerts ?? [];
    const rankings = groupRankingsData?.rankings ?? [];
    const trendPoints = trendData?.trend ?? [];

    // Dynamic Y-axis max for productivity trend chart
    const trendMaxY = Math.max(
        10,
        Math.ceil(
            Math.max(
                ...trendPoints.map((p) => p.completed ?? 0),
                ...trendPoints.map((p) => p.overdue ?? 0)
            ) / 10
        ) * 10
    );
    // Average completed per day for reference line
    const trendAvg = trendPoints.length > 0
        ? Math.round(trendPoints.reduce((sum, p) => sum + (p.completed ?? 0), 0) / trendPoints.length)
        : 0;
    const priorityItems = priorityData?.distribution ?? [];
    const urgencyItems = urgencyData?.distribution ?? [];

    // Flatten groups from rankings for filter dropdown
    const rankingGroups = rankings.map((r) => ({ groupId: r.groupId ?? "", groupName: r.groupName ?? "" }));

    // Default to first group when rankings load (no "all groups" option for benchmark)
    useEffect(() => {
        if (rankings.length > 0 && !selectedGroupId) {
            setSelectedGroupId(rankings[0].groupId ?? "");
            setSelectedGroupName(rankings[0].groupName ?? "");
        }
    }, [rankings, selectedGroupId]);

    return (
        <div className="relative min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#FFF7ED_34%,#FFFBF5_66%,#F8FAFC_100%)]">
            {/* Decorative blobs */}
            <div className="absolute top-[-40px] left-[-80px] h-72 w-72 rounded-full bg-orange-200/20 blur-3xl" />
            <div className="absolute top-[18%] right-[-80px] h-80 w-80 rounded-full bg-amber-200/15 blur-3xl" />
            <div className="absolute bottom-[-120px] left-[15%] h-96 w-96 rounded-full bg-orange-100/15 blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:28px_28px] opacity-40" />

            <Container className="relative z-10 py-6">
                <div className="space-y-6">
                    <SectionReveal>
                        <section className="relative overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,255,255,0.72))] px-6 py-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.14),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.10),transparent_30%)]" />

                            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0">
                                    <h1 className="mt-4 bg-[linear-gradient(135deg,#0F172A_0%,#EA580C_55%,#C2410C_100%)] bg-clip-text font-bold text-3xl text-transparent tracking-tight md:text-[38px]">
                                        Phân tích hiệu suất cá nhân
                                    </h1>

                                    <div className="mt-4">
                                        <HomeTopTabs />
                                    </div>
                                </div>
                            </div>
                        </section>
                    </SectionReveal>
                    {/* ── KPI Cards ── */}
                    {kpiLoading ? (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {[...Array(5)].map((_, i) => (
                                <SkeletonCard key={i} />
                            ))}
                        </div>
                    ) : kpiData ? (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                            <KpiCard
                                title="Tổng công việc"
                                value={kpiData.totalTasks ?? 0}
                                badge={
                                    kpiData.totalChangePercent !== undefined && kpiData.totalChangePercent !== null
                                        ? `${kpiData.totalChangePercent > 0 ? "+" : ""}${kpiData.totalChangePercent}% tuần trước`
                                        : undefined
                                }
                                badgeType={
                                    kpiData.totalChangePercent !== undefined && kpiData.totalChangePercent !== null
                                        ? kpiData.totalChangePercent >= 0
                                            ? "up"
                                            : "down"
                                        : "neutral"
                                }
                                accentColor={C.blue}
                            />
                            <KpiCard
                                title="Hoàn thành"
                                value={kpiData.completed ?? 0}
                                sub="tasks"
                                progress={kpiData.completionRate ?? 0}
                                accentColor={C.teal}
                            />
                            <KpiCard
                                title="Đang thực hiện"
                                value={kpiData.inProgress ?? 0}
                                sub="tasks"
                                badge="Active"
                                badgeType="neutral"
                                accentColor={C.amber}
                            />
                            <KpiCard
                                title="Quá hạn"
                                value={kpiData.overdueTasks ?? 0}
                                badge="Cần chú ý"
                                badgeType={kpiData.overdueTasks ? "down" : "neutral"}
                                accentColor={C.red}
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                            {[...Array(5)].map((_, i) => (
                                <SkeletonCard key={i} />
                            ))}
                        </div>
                    )}

                    {/* ──  My Task Status + Group Ranking ── */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {/* My Task Status Donut */}
                        <Card>
                            <SectionTitle subtitle="Cá nhân + các nhóm">
                                <span className="flex items-center gap-2">
                                    <Target className="h-4 w-4 text-orange-500" />
                                    Phân bố trạng thái task
                                </span>
                            </SectionTitle>
                            {taskStatusLoading ? (
                                <div className="flex h-56 items-center justify-center">
                                    <SkeletonBlock className="h-full w-full" />
                                </div>
                            ) : taskStatusSegments.length > 0 ? (
                                <MyTaskStatusCard
                                    data={taskStatusSegments.map((s, i) => ({
                                        name: s.name ?? "",
                                        value: s.value ?? 0,
                                        color: s.color ?? DONUT_STATUS_COLORS[i] ?? C.slate
                                    }))}
                                    completionRate={taskStatusRate}
                                    total={taskStatusTotal}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <CheckCircle2 className="mb-2 h-8 w-8 text-slate-300" />
                                    <p className="text-slate-400 text-sm">Không có dữ liệu</p>
                                </div>
                            )}
                        </Card>

                        {/* Group Ranking */}
                        <Card>
                            <SectionTitle subtitle="Top contributors">
                                <span className="flex items-center gap-2">
                                    <Star className="h-4 w-4 text-amber-500" />
                                    Tỉ lệ độ đóng góp trong các nhóm
                                </span>
                            </SectionTitle>

                            {rankingsLoading ? (
                                <div className="space-y-2">
                                    {[...Array(5)].map((_, i) => (
                                        <SkeletonBlock key={i} className="h-14 w-full" />
                                    ))}
                                </div>
                            ) : rankings.length > 0 ? (
                                <div className="space-y-2 overflow-y-auto pr-0.5" style={{ maxHeight: "320px" }}>
                                    {rankings.map((item) => (
                                        <div
                                            key={item.groupId}
                                            className="flex items-center gap-3 rounded-xl border border-slate-50 bg-slate-50/60 px-4 py-3 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-sm active:translate-y-0">
                                            <RankBadge rank={item.rank ?? 0} groupName={item.groupName ?? ""} />

                                            <div className="min-w-0 flex-1">
                                                <div className="mb-1 flex items-center justify-between">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <p className="truncate font-semibold text-slate-800 text-sm">
                                                            {item.groupName}
                                                        </p>
                                                        {item.userRankWithinGroup && item.userRankWithinGroup > 0 ? (
                                                            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                                                                #{item.userRankWithinGroup} contributor
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    <div className="ml-2 flex shrink-0 items-center gap-2">
                                                        <span className="font-bold text-sm" style={{ color: C.orange }}>
                                                            {item.contributionRate ?? 0}%
                                                        </span>
                                                        <span className="text-slate-400 text-xs">
                                                            ({item.score ?? 0} pts)
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                                    <div
                                                        className="h-full rounded-full transition-all"
                                                        style={{
                                                            width: `${item.contributionRate ?? 0}%`,
                                                            backgroundColor: C.orange
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <Star className="mb-2 h-8 w-8 text-slate-300" />
                                    <p className="text-slate-400 text-sm">Không có nhóm</p>
                                </div>
                            )}
                            {rankings.length > 8 && (
                                <p className="mt-2 text-center text-slate-400 text-xs">
                                    ↓ Cuộn để xem thêm ({rankings.length} nhóm)
                                </p>
                            )}
                        </Card>
                    </div>

                    {/* ── Row 2: Productivity Area ── */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {/* Productivity Area Chart */}
                        <Card className="lg:col-span-2">
                            <SectionTitle
                                subtitle={`Xu hướng ${trendPeriod} ngày`}
                                action={
                                    <div className="flex items-center gap-2">
                                        <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-xs">
                                            {([7, 14, 30] as TrendPeriod[]).map((p) => (
                                                <button
                                                    key={p}
                                                    onClick={() => setTrendPeriod(p)}
                                                    className={cn(
                                                        "rounded-lg px-3 py-1 text-xs font-semibold transition-all",
                                                        trendPeriod === p
                                                            ? "bg-orange-500 text-white shadow-sm"
                                                            : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                                                    )}>
                                                    {p}d
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                }>
                                <span className="flex items-center gap-2">
                                    <Target className="h-4 w-4 text-orange-500" />
                                    Xu hướng năng suất
                                </span>
                            </SectionTitle>

                            {trendLoading ? (
                                <SkeletonBlock className="h-64 w-full" />
                            ) : trendPoints.length > 0 ? (
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart
                                            data={trendPoints}
                                            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="tealGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={C.teal} stopOpacity={0.25} />
                                                    <stop offset="95%" stopColor={C.teal} stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={C.red} stopOpacity={0.15} />
                                                    <stop offset="95%" stopColor={C.red} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" vertical={false} />
                                            <XAxis
                                                dataKey="date"
                                                tick={{ fontSize: 11, fill: C.slateMid }}
                                                tickLine={false}
                                                axisLine={false}
                                                interval={4}
                                            />
                                            <YAxis
                                                tick={{ fontSize: 11, fill: C.slateMid }}
                                                tickLine={false}
                                                axisLine={false}
                                                domain={[0, trendMaxY]}
                                            />
                                            <Tooltip content={<AreaChartTooltip />} />
                                            <Legend
                                                iconType="circle"
                                                iconSize={7}
                                                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="completed"
                                                name="Hoàn thành"
                                                stroke={C.teal}
                                                strokeWidth={2}
                                                fill="url(#tealGradient)"
                                                dot={false}
                                                activeDot={{ r: 5, strokeWidth: 0 }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="overdue"
                                                name="Quá hạn"
                                                stroke={C.red}
                                                strokeWidth={2}
                                                fill="url(#redGradient)"
                                                dot={false}
                                                activeDot={{ r: 4, strokeWidth: 0 }}
                                            />
                                            <ReferenceLine
                                                y={trendAvg}
                                                stroke={C.slateMid}
                                                strokeDasharray="4 4"
                                                label={{
                                                    value: "TB",
                                                    position: "insideTopRight",
                                                    fontSize: 10,
                                                    fill: C.slateMid
                                                }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="flex h-64 flex-col items-center justify-center">
                                    <TrendingUp className="mb-2 h-8 w-8 text-slate-300" />
                                    <p className="text-slate-400 text-sm">Không có dữ liệu xu hướng</p>
                                </div>
                            )}
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        {/* Priority + Urgency Tabs */}
                        <Card className="lg:col-span-2">
                            <SectionTitle>
                                <span className="flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-orange-500" />
                                    Độ ưu tiên &amp; Khẩn cấp
                                </span>
                            </SectionTitle>

                            <TabBar
                                tabs={[
                                    { key: "priority", label: "Độ ưu tiên" },
                                    { key: "urgency", label: "Độ khẩn cấp" }
                                ]}
                                activeTab={priorityTab}
                                onTabChange={(key) => setPriorityTab(key as "priority" | "urgency")}
                            />

                            {priorityTab === "priority" ? (
                                priorityLoading ? (
                                    <div className="space-y-4">
                                        {[...Array(3)].map((_, i) => (
                                            <SkeletonBlock key={i} className="h-16 w-full" />
                                        ))}
                                    </div>
                                ) : priorityItems.length > 0 ? (
                                    <div className="space-y-5">
                                        <div className="flex gap-3 text-[11px] text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <span
                                                    className="h-2 w-2 rounded-full"
                                                    style={{ backgroundColor: C.orange }}
                                                />
                                                Hoàn thành
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span
                                                    className="h-2 w-2 rounded-full"
                                                    style={{ backgroundColor: C.orange }}
                                                />
                                                Đang làm
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span
                                                    className="h-2 w-2 rounded-full"
                                                    style={{ backgroundColor: C.red }}
                                                />
                                                Quá hạn
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span
                                                    className="h-2 w-2 rounded-full"
                                                    style={{ backgroundColor: C.slate }}
                                                />
                                                Chưa bắt đầu
                                            </span>
                                        </div>
                                        {priorityItems.map((item) => {
                                            const total = item.total ?? 0;
                                            const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
                                            return (
                                                <div key={item.priority ?? "unknown"} className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span
                                                            className={cn(
                                                                "inline-block rounded-full px-2 py-0.5 font-bold text-xs uppercase tracking-wide",
                                                                item.priority === "Cao"
                                                                    ? "bg-red-50 text-red-600"
                                                                    : item.priority === "Trung bình"
                                                                      ? "bg-orange-50 text-orange-600"
                                                                      : "bg-slate-100 text-slate-500"
                                                            )}>
                                                            {item.priority ?? "—"}
                                                        </span>
                                                        <span className="text-slate-400 text-xs">{total} tasks</span>
                                                    </div>
                                                    <div className="flex h-7 w-full overflow-hidden rounded-xl bg-slate-100 font-semibold text-xs shadow-inner">
                                                        {(item.completed ?? 0) > 0 && (
                                                            <div
                                                                className="flex items-center justify-center text-white"
                                                                style={{
                                                                    width: `${pct(item.completed ?? 0)}%`,
                                                                    backgroundColor: C.orange
                                                                }}>
                                                                {item.completed}
                                                            </div>
                                                        )}
                                                        {(item.inProgress ?? 0) > 0 && (
                                                            <div
                                                                className="flex items-center justify-center text-white"
                                                                style={{
                                                                    width: `${pct(item.inProgress ?? 0)}%`,
                                                                    backgroundColor: C.orange
                                                                }}>
                                                                {item.inProgress}
                                                            </div>
                                                        )}
                                                        {(item.overdue ?? 0) > 0 && (
                                                            <div
                                                                className="flex items-center justify-center text-white"
                                                                style={{
                                                                    width: `${pct(item.overdue ?? 0)}%`,
                                                                    backgroundColor: C.red
                                                                }}>
                                                                {item.overdue}
                                                            </div>
                                                        )}
                                                        {(item.todo ?? 0) > 0 && (
                                                            <div
                                                                className="flex items-center justify-center text-white"
                                                                style={{
                                                                    width: `${pct(item.todo ?? 0)}%`,
                                                                    backgroundColor: C.slate
                                                                }}>
                                                                {item.todo}
                                                            </div>
                                                        )}
                                                        {total === 0 && (
                                                            <div className="flex w-full items-center justify-center text-slate-400">
                                                                Không có task
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-8">
                                        <p className="text-slate-400 text-sm">Không có dữ liệu ưu tiên</p>
                                    </div>
                                )
                            ) : urgencyLoading ? (
                                <div className="space-y-4">
                                    {[...Array(4)].map((_, i) => (
                                        <SkeletonBlock key={i} className="h-16 w-full" />
                                    ))}
                                </div>
                            ) : urgencyItems.length > 0 ? (
                                <div className="space-y-5">
                                    <div className="flex gap-3 text-[11px] text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <span
                                                className="h-2 w-2 rounded-full"
                                                style={{ backgroundColor: C.orange }}
                                            />
                                            Hoàn thành
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span
                                                className="h-2 w-2 rounded-full"
                                                style={{ backgroundColor: "#dc2626" }}
                                            />
                                            Đang làm
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span
                                                className="h-2 w-2 rounded-full"
                                                style={{ backgroundColor: "#b91c1c" }}
                                            />
                                            Quá hạn
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span
                                                className="h-2 w-2 rounded-full"
                                                style={{ backgroundColor: C.slate }}
                                            />
                                            Chưa bắt đầu
                                        </span>
                                    </div>
                                    {urgencyItems.map((item) => {
                                        const total = item.total ?? 0;
                                        const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
                                        return (
                                            <div key={item.urgency ?? "unknown"} className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span
                                                        className={cn(
                                                            "inline-block rounded-full px-2 py-0.5 font-bold text-xs uppercase tracking-wide",
                                                            item.urgency === "Khẩn cấp"
                                                                ? "bg-red-100 text-red-700"
                                                                : item.urgency === "Cao"
                                                                  ? "bg-orange-100 text-orange-700"
                                                                  : item.urgency === "Trung bình"
                                                                    ? "bg-amber-50 text-amber-600"
                                                                    : "bg-orange-50 text-orange-600"
                                                        )}>
                                                        {item.urgency ?? "—"}
                                                    </span>
                                                    <span className="text-slate-400 text-xs">{total} tasks</span>
                                                </div>
                                                <div className="flex h-7 w-full overflow-hidden rounded-xl bg-slate-100 font-semibold text-xs shadow-inner">
                                                    {(item.completed ?? 0) > 0 && (
                                                        <div
                                                            className="flex items-center justify-center text-white"
                                                            style={{
                                                                width: `${pct(item.completed ?? 0)}%`,
                                                                backgroundColor: C.orange
                                                            }}>
                                                            {item.completed}
                                                        </div>
                                                    )}
                                                    {(item.inProgress ?? 0) > 0 && (
                                                        <div
                                                            className="flex items-center justify-center text-white"
                                                            style={{
                                                                width: `${pct(item.inProgress ?? 0)}%`,
                                                                backgroundColor:
                                                                    item.urgency === "Khẩn cấp" ? "#dc2626" : C.orange
                                                            }}>
                                                            {item.inProgress}
                                                        </div>
                                                    )}
                                                    {(item.overdue ?? 0) > 0 && (
                                                        <div
                                                            className="flex items-center justify-center text-white"
                                                            style={{
                                                                width: `${pct(item.overdue ?? 0)}%`,
                                                                backgroundColor: "#b91c1c"
                                                            }}>
                                                            {item.overdue}
                                                        </div>
                                                    )}
                                                    {(item.todo ?? 0) > 0 && (
                                                        <div
                                                            className="flex items-center justify-center text-white"
                                                            style={{
                                                                width: `${pct(item.todo ?? 0)}%`,
                                                                backgroundColor: C.slate
                                                            }}>
                                                            {item.todo}
                                                        </div>
                                                    )}
                                                    {total === 0 && (
                                                        <div className="flex w-full items-center justify-center text-slate-400">
                                                            Không có task
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8">
                                    <p className="text-slate-400 text-sm">Không có dữ liệu khẩn cấp</p>
                                </div>
                            )}
                        </Card>

                        {/* Risk Alerts */}
                        <Card className="max-h-120 overflow-y-scroll">
                            <SectionTitle subtitle={`${alertItems.length} cảnh báo`}>
                                <span className="flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                    Cảnh báo rủi ro
                                </span>
                            </SectionTitle>

                            {riskAlertsLoading ? (
                                <div className="space-y-2.5">
                                    {[...Array(3)].map((_, i) => (
                                        <SkeletonBlock key={i} className="h-16 w-full" />
                                    ))}
                                </div>
                            ) : alertItems.length > 0 ? (
                                <div className="space-y-2.5">
                                    {alertItems.map((alert, i) => (
                                        <RiskAlertCard
                                            key={i}
                                            type={alert.type ?? "overdue"}
                                            title={alert.title ?? ""}
                                            description={alert.description ?? ""}
                                            group={alert.group ?? "—"}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50">
                                        <CheckCircle2 className="h-6 w-6 text-orange-500" />
                                    </div>
                                    <p className="font-medium text-slate-600 text-sm">Không có cảnh báo</p>
                                    <p className="text-slate-400 text-xs">Tất cả tasks đang on-track</p>
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* ── Row 4: Performance Benchmark ── */}
                    <Card>
                        <div className="mb-4 flex items-start justify-between gap-4">
                            <div>
                                <span className="flex items-center gap-2 font-semibold text-slate-700 text-sm uppercase tracking-wide">
                                    <Activity className="h-4 w-4 text-orange-500" />
                                    Benchmark hiệu suất
                                    <BenchmarkTooltip />
                                </span>
                                <p className="mt-0.5 text-slate-400 text-xs">So sánh vs tuần trước và TB nhóm</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-xs">
                                    {([4, 7, 12] as BenchmarkPeriod[]).map((w) => (
                                        <button
                                            key={w}
                                            onClick={() => setBenchmarkPeriod(w)}
                                            className={cn(
                                                "rounded-lg px-3 py-1 text-xs font-semibold transition-all",
                                                benchmarkPeriod === w
                                                    ? "bg-orange-500 text-white shadow-sm"
                                                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                                            )}>
                                            {w}w
                                        </button>
                                    ))}
                                </div>
                                <GroupFilterDropdown
                                    allGroups={rankingGroups}
                                    selectedGroupId={selectedGroupId}
                                    selectedGroupName={selectedGroupName}
                                    onSelect={(groupId, groupName) => {
                                        setSelectedGroupId(groupId);
                                        setSelectedGroupName(groupName);
                                    }}
                                />
                            </div>
                        </div>

                        {benchmarkLoading ? (
                            <SkeletonBlock className="h-60 w-full" />
                        ) : benchmarkPoints.length > 0 ? (
                            <>
                                <div className="h-60">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart
                                            data={benchmarkPoints}
                                            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" vertical={false} />
                                            <XAxis
                                                dataKey="week"
                                                tick={{ fontSize: 10, fill: C.slateMid }}
                                                tickLine={false}
                                                axisLine={false}
                                                tickFormatter={(val: string) => formatWeekRange(val)}
                                            />
                                            <YAxis
                                                tick={{ fontSize: 11, fill: C.slateMid }}
                                                tickLine={false}
                                                axisLine={false}
                                                domain={[0, 100]}
                                            />
                                            <Tooltip content={<BarChartTooltip />} />
                                            <Legend
                                                iconType="circle"
                                                iconSize={7}
                                                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                                            />
                                            <Bar
                                                dataKey="user"
                                                name="Bạn"
                                                fill={C.teal}
                                                radius={[4, 4, 0, 0]}
                                                maxBarSize={24}
                                                barSize={20}
                                            />
                                            <Bar
                                                dataKey="groupAvg"
                                                name="TB nhóm"
                                                fill={C.slateMid}
                                                radius={[4, 4, 0, 0]}
                                                maxBarSize={24}
                                                barSize={20}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="trend"
                                                name="Xu hướng"
                                                stroke={C.orange}
                                                strokeWidth={2}
                                                dot={false}
                                                activeDot={{ r: 5 }}
                                            />
                                            <ReferenceLine
                                                y={groupAvgScore || 60}
                                                stroke={C.slateMid}
                                                strokeDasharray="4 4"
                                                label={{
                                                    value: "TB",
                                                    position: "insideTopRight",
                                                    fontSize: 10,
                                                    fill: C.slateMid
                                                }}
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </>
                        ) : (
                            <div className="flex h-60 flex-col items-center justify-center">
                                <Activity className="mb-2 h-8 w-8 text-slate-300" />
                                <p className="text-slate-400 text-sm">Không có dữ liệu benchmark</p>
                            </div>
                        )}
                    </Card>
                </div>
            </Container>
        </div>
    );
}
