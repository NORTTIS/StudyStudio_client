"use client";

import {
    AlertTriangle,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Layers3,
    Sparkles,
    TrendingUp,
    Flame,
    X
} from "lucide-react";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
import { apiFetch } from "@/api/api-client";
import type { components } from "@/api/types";
import { Container } from "@/components/common";
import { Button } from "@/components/ui/button";
import HomeTopTabs from "./HomeTopTabs";

type HomeSummaryResponse = components["schemas"]["HomeSummaryResponse"];
type HomeSummaryResponseApiResponse = components["schemas"]["HomeSummaryResponseApiResponse"];

type DeltaInfo = {
    value: number;
    changedAt: number;
    expiresAt: number;
    baseline: number;
};

type StatCardProps = {
    label: string;
    value: number;
    icon: React.ReactNode;
    tone?: "neutral" | "danger" | "success" | "violet";
    note?: string;
    delta?: number;
    index?: number;
    onClick?: () => void;
};

type OverviewCardProps = {
    title: string;
    value: number;
    total: number;
    description: string;
    tone?: "neutral" | "danger" | "success";
    index?: number;
};

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function useStatDelta(key: string, currentValue: number, enabled: boolean, accountKey?: string | number | null) {
    const safeAccountKey = String(accountKey ?? "default").trim() || "default";

    const storageKey = React.useMemo(() => `home-summary-delta:${safeAccountKey}:${key}`, [safeAccountKey, key]);
    const baselineKey = React.useMemo(() => `home-summary-baseline:${safeAccountKey}:${key}`, [safeAccountKey, key]);
    const [delta, setDelta] = React.useState<DeltaInfo | null>(null);

    React.useEffect(() => {
        if (!enabled || typeof window === "undefined") {
            setDelta(null);
            return;
        }

        const now = Date.now();

        try {
            const savedRaw = localStorage.getItem(storageKey);
            let savedDelta: DeltaInfo | null = null;

            if (savedRaw) {
                const parsed = JSON.parse(savedRaw) as DeltaInfo;

                if (
                    typeof parsed?.value === "number" &&
                    typeof parsed?.baseline === "number" &&
                    typeof parsed?.changedAt === "number" &&
                    typeof parsed?.expiresAt === "number" &&
                    now < parsed.expiresAt
                ) {
                    savedDelta = parsed;
                } else {
                    localStorage.removeItem(storageKey);
                }
            }

            const baselineRaw = localStorage.getItem(baselineKey);

            if (baselineRaw === null) {
                localStorage.setItem(baselineKey, String(currentValue));
                localStorage.removeItem(storageKey);
                setDelta(null);
                return;
            }

            const baseline = Number(baselineRaw);

            if (Number.isNaN(baseline)) {
                localStorage.setItem(baselineKey, String(currentValue));
                localStorage.removeItem(storageKey);
                setDelta(null);
                return;
            }

            const diff = currentValue - baseline;

            if (diff === 0) {
                localStorage.removeItem(storageKey);
                setDelta(null);
                return;
            }

            const nextDelta: DeltaInfo = {
                value: diff,
                baseline,
                changedAt: savedDelta?.changedAt ?? now,
                expiresAt: savedDelta?.expiresAt ?? now + ONE_WEEK_MS
            };

            localStorage.setItem(storageKey, JSON.stringify(nextDelta));
            setDelta(nextDelta);
        } catch {
            setDelta(null);
        }
    }, [enabled, currentValue, storageKey, baselineKey]);

    React.useEffect(() => {
        if (!(enabled && delta) || typeof window === "undefined") return;

        const timeout = delta.expiresAt - Date.now();

        if (timeout <= 0) {
            setDelta(null);
            try {
                localStorage.removeItem(storageKey);
                localStorage.removeItem(baselineKey);
            } catch { }
            return;
        }

        const timer = window.setTimeout(() => {
            setDelta(null);
            try {
                localStorage.removeItem(storageKey);
                localStorage.removeItem(baselineKey);
            } catch { }
        }, timeout);

        return () => window.clearTimeout(timer);
    }, [enabled, delta, storageKey, baselineKey]);

    return delta;
}

function SectionReveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
        >
            {children}
        </motion.div>
    );
}

function StatCard({ label, value, icon, tone = "neutral", note, delta, index = 0, onClick }: StatCardProps) {
    const styles = {
        neutral: {
            card: "border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(248,250,252,0.92))]",
            glow: "from-slate-100/70 via-white to-transparent",
            iconWrap: "bg-slate-100 text-slate-700",
            label: "text-slate-500",
            value: "text-slate-900",
            note: "text-slate-400"
        },
        danger: {
            card: "border-red-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(254,242,242,0.92))]",
            glow: "from-red-100/70 via-white to-transparent",
            iconWrap: "bg-red-50 text-red-500",
            label: "text-red-500",
            value: "text-red-600",
            note: "text-red-400"
        },
        success: {
            card: "border-emerald-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(236,253,245,0.92))]",
            glow: "from-emerald-100/70 via-white to-transparent",
            iconWrap: "bg-emerald-50 text-emerald-600",
            label: "text-emerald-600",
            value: "text-emerald-600",
            note: "text-emerald-500"
        },
        violet: {
            card: "border-violet-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(245,243,255,0.94))]",
            glow: "from-violet-100/70 via-white to-transparent",
            iconWrap: "bg-violet-50 text-violet-600",
            label: "text-violet-600",
            value: "text-violet-700",
            note: "text-violet-500"
        }
    };

    const s = styles[tone];
    const hasDelta = typeof delta === "number" && delta !== 0;
    const isPositive = (delta ?? 0) > 0;

    return (
        <motion.button
            type="button"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.06 * index }}
            whileHover={{ y: -6 }}
            onClick={onClick}
            className={cx(
                "group relative w-full overflow-hidden rounded-[28px] border p-5 text-left shadow-[0_10px_34px_rgba(15,23,42,0.06)] transition-all duration-300 hover:shadow-[0_20px_48px_rgba(15,23,42,0.10)]",
                onClick && "cursor-pointer",
                s.card
            )}
        >
            <div className={cx("absolute inset-x-0 top-0 h-24 bg-gradient-to-b opacity-90", s.glow)} />
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/60 blur-3xl opacity-70" />

            <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className={cx("font-medium text-sm", s.label)}>{label}</p>
                        {hasDelta ? (
                            <span
                                className={cx(
                                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                    isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                                )}
                            >
                                {isPositive ? `+${delta}` : `${delta}`}
                            </span>
                        ) : null}
                    </div>

                    <p className={cx("mt-3 font-bold text-3xl tracking-tight", s.value)}>{value}</p>
                    {note ? <p className={cx("mt-2 text-xs", s.note)}>{note}</p> : null}
                </div>

                <motion.div
                    whileHover={{ rotate: 8, scale: 1.05 }}
                    className={cx(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]",
                        s.iconWrap
                    )}
                >
                    {icon}
                </motion.div>
            </div>
        </motion.button>
    );
}

function OverviewCard({ title, value, total, description, tone = "neutral", index = 0 }: OverviewCardProps) {
    const percent = total > 0 ? Math.round((value / total) * 100) : 0;

    const styles = {
        neutral: {
            card: "border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,250,252,0.95))]",
            badge: "bg-violet-50 text-violet-600",
            percent: "text-slate-900",
            desc: "text-slate-500",
            track: "bg-slate-100",
            bar: "bg-[linear-gradient(90deg,#8B5CF6_0%,#6366F1_100%)]",
            glow: "from-violet-50/80 via-white to-transparent"
        },
        danger: {
            card: "border-red-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(254,242,242,0.94))]",
            badge: "bg-red-50 text-red-500",
            percent: "text-red-600",
            desc: "text-red-400",
            track: "bg-red-50",
            bar: "bg-[linear-gradient(90deg,#F97316_0%,#EF4444_100%)]",
            glow: "from-red-50/80 via-white to-transparent"
        },
        success: {
            card: "border-emerald-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(236,253,245,0.94))]",
            badge: "bg-emerald-50 text-emerald-600",
            percent: "text-emerald-600",
            desc: "text-emerald-500",
            track: "bg-emerald-50",
            bar: "bg-[linear-gradient(90deg,#10B981_0%,#22C55E_100%)]",
            glow: "from-emerald-50/80 via-white to-transparent"
        }
    };

    const s = styles[tone];

    return (
        <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 * index }}
            whileHover={{ y: -6 }}
            className={cx(
                "relative overflow-hidden rounded-[30px] border p-6 shadow-[0_10px_34px_rgba(15,23,42,0.06)] transition-all duration-300 hover:shadow-[0_20px_48px_rgba(15,23,42,0.10)]",
                s.card
            )}
        >
            <div className={cx("absolute inset-x-0 top-0 h-28 bg-gradient-to-b opacity-90", s.glow)} />

            <div className="relative">
                <div className="flex items-center gap-3">
                    <div className={cx("rounded-2xl p-2.5 shadow-sm", s.badge)}>
                        <TrendingUp className="h-4 w-4" />
                    </div>

                    <div>
                        <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
                        <p className="text-slate-400 text-xs">Tổng quan hiện tại</p>
                    </div>
                </div>

                <div className="mt-8 flex items-end justify-between gap-4">
                    <div>
                        <p className={cx("font-bold text-5xl tracking-tight", s.percent)}>{percent}%</p>
                        <p className={cx("mt-3 text-sm leading-6", s.desc)}>{description}</p>
                    </div>

                    <div className="rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-right shadow-sm backdrop-blur">
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">số lượng</p>
                        <p className="mt-1 font-semibold text-slate-700 text-sm">
                            {value}/{total}
                        </p>
                    </div>
                </div>

                <div className={cx("mt-6 h-3 w-full overflow-hidden rounded-full", s.track)}>
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.8, delay: 0.12 + 0.08 * index, ease: "easeOut" }}
                        className={cx("h-full rounded-full", s.bar)}
                    />
                </div>
            </div>
        </motion.div>
    );
}

function SkeletonCard({ large = false }: { large?: boolean }) {
    return (
        <div className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="animate-pulse">
                <div className="mb-3 h-4 w-28 rounded bg-slate-200" />
                <div className={cx("rounded bg-slate-200", large ? "h-12 w-28" : "h-8 w-20")} />
                <div className="mt-3 h-3 w-24 rounded bg-slate-100" />
                {large ? <div className="mt-6 h-3 w-full rounded-full bg-slate-100" /> : null}
            </div>
        </div>
    );
}

function buildSummaryUrl() {
    const rawBase = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";
    const base = rawBase.replace(/\/+$/, "");

    if (!base) return "";
    if (/\/api$/i.test(base)) return `${base}/Home/summary`;
    return `${base}/api/Home/summary`;
}

function extractSummaryData(payload: unknown): HomeSummaryResponse | null {
    const source = payload as
        | HomeSummaryResponseApiResponse
        | {
            status?: string;
            data?: HomeSummaryResponseApiResponse | HomeSummaryResponse | null;
        }
        | null
        | undefined;

    const firstLayer = source?.data;

    if (
        firstLayer &&
        typeof firstLayer === "object" &&
        "remainingTaskCount" in firstLayer &&
        "overdueTaskCount" in firstLayer &&
        "completedTaskCount" in firstLayer &&
        "totalJoinedGroupCount" in firstLayer
    ) {
        return firstLayer as HomeSummaryResponse;
    }

    if (
        firstLayer &&
        typeof firstLayer === "object" &&
        "data" in firstLayer &&
        (firstLayer as HomeSummaryResponseApiResponse).data
    ) {
        return (firstLayer as HomeSummaryResponseApiResponse).data ?? null;
    }

    if (source && typeof source === "object" && "data" in source && (source as HomeSummaryResponseApiResponse).data) {
        return (source as HomeSummaryResponseApiResponse).data ?? null;
    }

    return null;
}

const fetchHomeSummary = async (): Promise<HomeSummaryResponse | null> => {
    const url = buildSummaryUrl();
    if (!url) return null;

    const response = await apiFetch<HomeSummaryResponseApiResponse>(url, {
        method: "GET"
    });

    return extractSummaryData(response);
};

type DetailLayerProps = {
    open: boolean;
    onClose: () => void;
    isLoading: boolean;
    error: unknown;
    remainingTaskCount: number;
    overdueTaskCount: number;
    completedTaskCount: number;
    totalJoinedGroupCount: number;
    remainingDelta?: number;
    overdueDelta?: number;
    completedDelta?: number;
    joinedGroupDelta?: number;
    totalTasks: number;
};

function DetailLayer({
    open,
    onClose,
    isLoading,
    error,
    remainingTaskCount,
    overdueTaskCount,
    completedTaskCount,
    totalJoinedGroupCount,
    remainingDelta,
    overdueDelta,
    completedDelta,
    joinedGroupDelta,
    totalTasks
}: DetailLayerProps) {
    React.useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        window.addEventListener("keydown", onKeyDown);
        document.body.style.overflow = "hidden";

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = "";
        };
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open ? (
                <motion.div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[3px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 28, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 18, scale: 0.98 }}
                        transition={{ duration: 0.25 }}
                        className="relative flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.20)]"
                    >
                        {/* Layer 1: Header */}
                        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5 md:px-8">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50/90 px-3 py-1.5 text-xs font-medium text-violet-700 shadow-sm">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Tổng quan chi tiết
                                </div>

                                <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                                    Chi tiết công việc
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={onClose}
                                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Layer 2: Body */}
                        <div className="flex-1 overflow-y-auto bg-[#FBFBFD] px-6 py-6 md:px-8">
                            {isLoading ? (
                                <div className="space-y-4">
                                    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                        {Array.from({ length: 4 }).map((_, index) => (
                                            <SkeletonCard key={index} />
                                        ))}
                                    </section>

                                    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                        {Array.from({ length: 3 }).map((_, index) => (
                                            <SkeletonCard key={index} large />
                                        ))}
                                    </section>
                                </div>
                            ) : error ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-[28px] border border-red-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(254,242,242,0.96))] px-5 py-4 text-sm text-red-600 shadow-sm"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                                            <AlertTriangle className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold">Không tải được dữ liệu tổng quan.</p>
                                            <p className="mt-1 text-red-400">Hãy kiểm tra kết nối hoặc thử tải lại sau.</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="space-y-5">
                                    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                        <StatCard
                                            label="Công việc còn lại"
                                            value={remainingTaskCount}
                                            delta={remainingDelta}
                                            icon={<Clock3 className="h-5 w-5" />}
                                            note="Đang chờ xử lý"
                                            tone="neutral"
                                            index={0}
                                        />

                                        <StatCard
                                            label="Công việc quá hạn"
                                            value={overdueTaskCount}
                                            delta={overdueDelta}
                                            icon={<Flame className="h-5 w-5" />}
                                            note="Cần ưu tiên ngay"
                                            tone="danger"
                                            index={1}
                                        />

                                        <StatCard
                                            label="Đã hoàn thành"
                                            value={completedTaskCount}
                                            delta={completedDelta}
                                            icon={<CheckCircle2 className="h-5 w-5" />}
                                            note="Đã xử lý xong"
                                            tone="success"
                                            index={2}
                                        />

                                        <StatCard
                                            label="Số nhóm tham gia"
                                            value={totalJoinedGroupCount}
                                            delta={joinedGroupDelta}
                                            icon={<Layers3 className="h-5 w-5" />}
                                            note="Nhóm đang hoạt động"
                                            tone="violet"
                                            index={3}
                                        />
                                    </section>

                                    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                        <OverviewCard
                                            title="Hoàn thành"
                                            value={completedTaskCount}
                                            total={totalTasks}
                                            description={`${completedTaskCount} trên ${totalTasks} công việc đã hoàn tất`}
                                            tone="success"
                                            index={0}
                                        />

                                        <OverviewCard
                                            title="Còn lại"
                                            value={remainingTaskCount}
                                            total={totalTasks}
                                            description={`${remainingTaskCount} công việc vẫn đang chờ xử lý`}
                                            tone="neutral"
                                            index={1}
                                        />

                                        <OverviewCard
                                            title="Quá hạn"
                                            value={overdueTaskCount}
                                            total={totalTasks}
                                            description={`${overdueTaskCount} công việc cần được ưu tiên`}
                                            tone="danger"
                                            index={2}
                                        />
                                    </section>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}

export default function HomeSummary() {
    const [cacheKey, setCacheKey] = React.useState(0);
    const [openDetail, setOpenDetail] = React.useState(false);

    React.useEffect(() => {
        setCacheKey((prev) => prev + 1);
    }, []);

    const { data: summary, isLoading, error } = useSWR(["home-summary", cacheKey], fetchHomeSummary, {
        refreshInterval: 0,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 60000,
        revalidateIfStale: false
    });

    const remainingTaskCount = summary?.remainingTaskCount ?? 0;
    const overdueTaskCount = summary?.overdueTaskCount ?? 0;
    const completedTaskCount = summary?.completedTaskCount ?? 0;
    const totalJoinedGroupCount = summary?.totalJoinedGroupCount ?? 0;

    const hasSummary = !!summary;

    const accountKey =
        (summary as { userId?: string | number; accountId?: string | number; email?: string } | null)?.userId ??
        (summary as { userId?: string | number; accountId?: string | number; email?: string } | null)?.accountId ??
        (summary as { userId?: string | number; accountId?: string | number; email?: string } | null)?.email ??
        "default";

    React.useEffect(() => {
        if (!hasSummary || typeof window === "undefined") return;

        try {
            const keys = Object.keys(localStorage);
            const currentDeltaPrefix = `home-summary-delta:${String(accountKey)}:`;
            const currentBaselinePrefix = `home-summary-baseline:${String(accountKey)}:`;

            keys.forEach((key) => {
                if (
                    (key.startsWith("home-summary-delta:") ||
                        key.startsWith("home-summary-baseline:") ||
                        key.startsWith("home-summary-prev:")) &&
                    !key.startsWith(currentDeltaPrefix) &&
                    !key.startsWith(currentBaselinePrefix)
                ) {
                    localStorage.removeItem(key);
                }
            });
        } catch { }
    }, [accountKey, hasSummary]);

    const remainingDelta = useStatDelta("remainingTaskCount", remainingTaskCount, hasSummary, accountKey);
    const overdueDelta = useStatDelta("overdueTaskCount", overdueTaskCount, hasSummary, accountKey);
    const completedDelta = useStatDelta("completedTaskCount", completedTaskCount, hasSummary, accountKey);
    const joinedGroupDelta = useStatDelta("totalJoinedGroupCount", totalJoinedGroupCount, hasSummary, accountKey);

    const totalTasks = remainingTaskCount + overdueTaskCount + completedTaskCount;

    return (
        <>
            <div
                id="home-summary-section"
                className="relative overflow-hidden scroll-mt-24 bg-[linear-gradient(180deg,#F8FAFC_0%,#F8F7FF_34%,#F4F7FB_66%,#F1F5F9_100%)]"
            >
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
                                            Dashboard tổng quan
                                        </motion.div>

                                        <h1 className="mt-4 bg-[linear-gradient(135deg,#0F172A_0%,#4338CA_55%,#0F766E_100%)] bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-[38px]">
                                            Tổng quan công việc
                                        </h1>

                                        <div className="mt-4">
                                            <HomeTopTabs />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="outline"
                                            className="h-11 rounded-2xl border-white/80 bg-white/75 px-4 text-slate-700 shadow-sm backdrop-blur hover:bg-white"
                                        >
                                            <CalendarDays className="mr-2 h-4 w-4" />
                                            Lịch
                                        </Button>
                                    </div>
                                </div>
                            </section>
                        </SectionReveal>

                        <SectionReveal delay={0.06}>
                            <section className="rounded-[32px] border border-white/60 bg-white/40 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl md:p-6">
                                {isLoading ? (
                                    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                        {Array.from({ length: 3 }).map((_, index) => (
                                            <SkeletonCard key={index} />
                                        ))}
                                    </section>
                                ) : error ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="rounded-[28px] border border-red-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(254,242,242,0.96))] px-5 py-4 text-sm text-red-600 shadow-sm"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                                                <AlertTriangle className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-semibold">Không tải được dữ liệu tổng quan.</p>
                                                <p className="mt-1 text-red-400">Hãy kiểm tra kết nối hoặc thử tải lại sau.</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="space-y-5">
                                        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                            <StatCard
                                                label="Công việc còn lại"
                                                value={remainingTaskCount}
                                                delta={remainingDelta?.value}
                                                icon={<Clock3 className="h-5 w-5" />}
                                                note="Đang chờ xử lý"
                                                tone="neutral"
                                                index={0}
                                                onClick={() => setOpenDetail(true)}
                                            />

                                            <StatCard
                                                label="Công việc quá hạn"
                                                value={overdueTaskCount}
                                                delta={overdueDelta?.value}
                                                icon={<Flame className="h-5 w-5" />}
                                                tone="danger"
                                                note="Cần ưu tiên ngay"
                                                index={1}
                                                onClick={() => setOpenDetail(true)}
                                            />

                                            <StatCard
                                                label="Đã hoàn thành"
                                                value={completedTaskCount}
                                                delta={completedDelta?.value}
                                                icon={<CheckCircle2 className="h-5 w-5" />}
                                                tone="success"
                                                note="Đã xử lý xong"
                                                index={2}
                                                onClick={() => setOpenDetail(true)}
                                            />
                                        </section>

                                        <div className="flex justify-end">
                                            <Button
                                                onClick={() => setOpenDetail(true)}
                                                className="h-11 rounded-2xl bg-orange-500 px-5 text-white hover:bg-orange-600"
                                            >
                                                Xem chi tiết
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </section>
                        </SectionReveal>
                    </div>
                </Container>
            </div>

            <DetailLayer
                open={openDetail}
                onClose={() => setOpenDetail(false)}
                isLoading={isLoading}
                error={error}
                remainingTaskCount={remainingTaskCount}
                overdueTaskCount={overdueTaskCount}
                completedTaskCount={completedTaskCount}
                totalJoinedGroupCount={totalJoinedGroupCount}
                remainingDelta={remainingDelta?.value}
                overdueDelta={overdueDelta?.value}
                completedDelta={completedDelta?.value}
                joinedGroupDelta={joinedGroupDelta?.value}
                totalTasks={totalTasks}
            />
        </>
    );
}