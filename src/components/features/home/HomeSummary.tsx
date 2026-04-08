"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
    AlertTriangle,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Flame,
    Layers3,
    Sparkles,
    TrendingUp,
    X
} from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import useSWR from "swr";
import { apiFetch } from "@/api/api-client";
import type { components } from "@/api/types";
import { Container } from "@/components/common";
import { Button } from "@/components/ui/button";
import HomeTopTabs from "./HomeTopTabs";
import PersonalCalendar from "./PersonalCalendar";

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
    subtitleLabel?: string;
    quantityLabel?: string;
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
            transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}>
            {children}
        </motion.div>
    );
}

function StatCard({ label, value, icon, tone = "neutral", note, delta, index = 0, onClick }: StatCardProps) {
    const styles = {
        neutral: {
            card: "border-[#DCE6F4]/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(246,249,252,0.98)_55%,rgba(232,239,250,0.92)_100%)] backdrop-blur-xl",
            glow: "",
            iconWrap: "bg-[#EAF1FB] text-[#4B607D] h-11 w-11 rounded-2xl",
            iconSize: "h-5 w-5",
            label: "text-slate-500",
            value: "text-slate-900",
            note: "text-[#63738A]"
        },
        danger: {
            card: "border-[#F4D0C6]/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(255,248,245,0.98)_55%,rgba(255,234,228,0.94)_100%)] backdrop-blur-xl",
            glow: "",
            iconWrap: "bg-[#FDE2D9] text-[#C14E35] h-12 w-12 rounded-full",
            iconSize: "h-5.5 w-5.5",
            label: "text-slate-500",
            value: "text-slate-900",
            note: "text-[#B56A57]"
        },
        success: {
            card: "border-[#CDE9D9]/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(244,252,248,0.98)_55%,rgba(227,246,236,0.94)_100%)] backdrop-blur-xl",
            glow: "",
            iconWrap: "bg-[#DFF4E9] text-[#1F7A55] h-10 w-10 rounded-xl",
            iconSize: "h-4.5 w-4.5",
            label: "text-slate-500",
            value: "text-slate-900",
            note: "text-[#4F876B]"
        },
        violet: {
            card: "border-[#DDD3F8]/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(250,247,255,0.98)_55%,rgba(239,232,255,0.94)_100%)] backdrop-blur-xl",
            glow: "",
            iconWrap: "bg-[#EEE7FF] text-[#6A4FD8] h-11 w-11 rounded-2xl",
            iconSize: "h-5 w-5",
            label: "text-slate-500",
            value: "text-slate-900",
            note: "text-[#7864AF]"
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
                "group relative w-full overflow-hidden rounded-[28px] border p-5 text-left shadow-[0_10px_34px_rgba(15,23,42,0.06)] transition-[transform,box-shadow,border-color,background-color] duration-300 hover:shadow-[0_18px_42px_rgba(15,23,42,0.08)]",
                onClick && "cursor-pointer",
                s.card
            )}>
            <div className="absolute -top-8 -right-8 h-28 w-28 rounded-full bg-white/60 opacity-70 blur-3xl" />

            <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className={cx("font-medium text-sm", s.label)}>{label}</p>
                        {hasDelta ? (
                            <span
                                className={cx(
                                    "rounded-full px-2 py-0.5 font-semibold text-[11px]",
                                    isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                                )}>
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
                        "flex shrink-0 items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]",
                        s.iconWrap
                    )}>
                    <span className={s.iconSize}>{icon}</span>
                </motion.div>
            </div>
        </motion.button>
    );
}

function OverviewCard({
    title,
    value,
    total,
    description,
    tone = "neutral",
    index = 0,
    subtitleLabel = "Current Overview",
    quantityLabel = "Quantity"
}: OverviewCardProps) {
    const percent = total > 0 ? Math.round((value / total) * 100) : 0;

    const styles = {
        neutral: {
            card: "border-[#DCE6F4]/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(246,249,252,0.98)_55%,rgba(232,239,250,0.92)_100%)] backdrop-blur-xl",
            badge: "bg-[#EDF3FF] text-[#4D5F88]",
            percent: "text-slate-900",
            desc: "text-slate-500",
            track: "bg-[#E9EEF7]",
            bar: "bg-[linear-gradient(90deg,#748FB8_0%,#90A8CF_100%)]",
            glow: ""
        },
        danger: {
            card: "border-[#F4D0C6]/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(255,248,245,0.98)_55%,rgba(255,234,228,0.94)_100%)] backdrop-blur-xl",
            badge: "bg-[#FDE4DB] text-[#C14E35]",
            percent: "text-slate-900",
            desc: "text-slate-500",
            track: "bg-[#F6E8E2]",
            bar: "bg-[linear-gradient(90deg,#D97B60_0%,#C85A43_100%)]",
            glow: ""
        },
        success: {
            card: "border-[#CDE9D9]/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(244,252,248,0.98)_55%,rgba(227,246,236,0.94)_100%)] backdrop-blur-xl",
            badge: "bg-[#DFF4E9] text-[#1F7A55]",
            percent: "text-slate-900",
            desc: "text-slate-500",
            track: "bg-[#E4F3EB]",
            bar: "bg-[linear-gradient(90deg,#58C893_0%,#31B476_100%)]",
            glow: ""
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
                "relative overflow-hidden rounded-[30px] border p-6 shadow-[0_10px_34px_rgba(15,23,42,0.06)] transition-[transform,box-shadow,border-color,background-color] duration-300 hover:shadow-[0_18px_42px_rgba(15,23,42,0.08)]",
                s.card
            )}>
            <div className="relative">
                <div className="flex items-center gap-3">
                    <div className={cx("rounded-2xl p-2.5 shadow-sm", s.badge)}>
                        <TrendingUp className="h-4 w-4" />
                    </div>

                    <div>
                        <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
                        <p className="text-slate-400 text-xs">{subtitleLabel}</p>
                    </div>
                </div>

                <div className="mt-8 flex items-end justify-between gap-4">
                    <div>
                        <p className={cx("font-bold text-5xl tracking-tight", s.percent)}>{percent}%</p>
                        <p className={cx("mt-3 text-sm leading-6", s.desc)}>{description}</p>
                    </div>

                    <div className="rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-right shadow-sm backdrop-blur">
                        <p className="text-[11px] text-slate-400 uppercase tracking-wide">{quantityLabel}</p>
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
    t: (key: string, values?: Record<string, string | number | Date>) => string;
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
    totalTasks,
    t
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
                    exit={{ opacity: 0 }}>
                    <motion.div
                        initial={{ opacity: 0, y: 28, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 18, scale: 0.98 }}
                        transition={{ duration: 0.25 }}
                        className="relative flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.20)]">
                        {/* Layer 1: Header */}
                        <div className="flex items-center justify-between border-slate-200 border-b bg-white px-6 py-5 md:px-8">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50/90 px-3 py-1.5 font-medium text-violet-700 text-xs shadow-sm">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    {t("detailedBadge")}
                                </div>

                                <h2 className="mt-3 font-bold text-2xl text-slate-900 tracking-tight md:text-3xl">
                                    {t("detailsTitle")}
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={onClose}
                                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50">
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
                                    className="rounded-[28px] border border-red-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(254,242,242,0.96))] px-5 py-4 text-red-600 text-sm shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                                            <AlertTriangle className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold">{t("loadingError")}</p>
                                            <p className="mt-1 text-red-400">{t("loadingErrorHint")}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="space-y-5">
                                    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                        <StatCard
                                            label={t("remainingTasksLabel")}
                                            value={remainingTaskCount}
                                            delta={remainingDelta}
                                            icon={<Clock3 className="h-5 w-5" />}
                                            note={t("remainingTasksNote")}
                                            tone="neutral"
                                            index={0}
                                        />

                                        <StatCard
                                            label={t("overdueTasksLabel")}
                                            value={overdueTaskCount}
                                            delta={overdueDelta}
                                            icon={<Flame className="h-5 w-5" />}
                                            note={t("overdueTasksNote")}
                                            tone="danger"
                                            index={1}
                                        />

                                        <StatCard
                                            label={t("completedTasksLabel")}
                                            value={completedTaskCount}
                                            delta={completedDelta}
                                            icon={<CheckCircle2 className="h-5 w-5" />}
                                            note={t("completedTasksNote")}
                                            tone="success"
                                            index={2}
                                        />

                                        <StatCard
                                            label={t("joinedGroupsLabel")}
                                            value={totalJoinedGroupCount}
                                            delta={joinedGroupDelta}
                                            icon={<Layers3 className="h-5 w-5" />}
                                            note={t("joinedGroupsNote")}
                                            tone="violet"
                                            index={3}
                                        />
                                    </section>

                                    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                        <OverviewCard
                                            title={t("overview.completedTitle")}
                                            value={completedTaskCount}
                                            total={totalTasks}
                                            description={t("overview.completedDescription", {
                                                count: completedTaskCount,
                                                total: totalTasks
                                            })}
                                            tone="success"
                                            index={0}
                                            subtitleLabel={t("currentOverview")}
                                            quantityLabel={t("quantity")}
                                        />

                                        <OverviewCard
                                            title={t("overview.remainingTitle")}
                                            value={remainingTaskCount}
                                            total={totalTasks}
                                            description={t("overview.remainingDescription", {
                                                count: remainingTaskCount,
                                                total: totalTasks
                                            })}
                                            tone="neutral"
                                            index={1}
                                            subtitleLabel={t("currentOverview")}
                                            quantityLabel={t("quantity")}
                                        />

                                        <OverviewCard
                                            title={t("overview.overdueTitle")}
                                            value={overdueTaskCount}
                                            total={totalTasks}
                                            description={t("overview.overdueDescription", {
                                                count: overdueTaskCount,
                                                total: totalTasks
                                            })}
                                            tone="danger"
                                            index={2}
                                            subtitleLabel={t("currentOverview")}
                                            quantityLabel={t("quantity")}
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
    const t = useTranslations("HomeSummary");
    const [cacheKey, setCacheKey] = React.useState(0);
    const [openDetail, setOpenDetail] = React.useState(false);
    const [openCalendar, setOpenCalendar] = React.useState(false);

    React.useEffect(() => {
        setCacheKey((prev) => prev + 1);
    }, []);

    const {
        data: summary,
        isLoading,
        error
    } = useSWR(["home-summary", cacheKey], fetchHomeSummary, {
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
                className="relative scroll-mt-24 overflow-hidden bg-[linear-gradient(180deg,#F8FAFC_0%,#F8F7FF_34%,#F4F7FB_66%,#F1F5F9_100%)]">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute top-[-40px] left-[-80px] h-72 w-72 rounded-full bg-violet-200/25 blur-3xl" />
                    <div className="absolute top-[18%] right-[-80px] h-80 w-80 rounded-full bg-sky-200/20 blur-3xl" />
                    <div className="absolute bottom-[-120px] left-[15%] h-96 w-96 rounded-full bg-emerald-100/20 blur-3xl" />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:28px_28px] opacity-40" />
                </div>

                <Container className="relative pt-8 pb-8">
                    <div className="space-y-8">
                        <SectionReveal>
                            <section className="relative overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0.68))] px-6 py-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.14),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.10),transparent_30%)]" />

                                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0">
                                        <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-orange-100/80 bg-white/70 px-3 py-1 font-semibold text-[11px] text-orange-700 uppercase tracking-[0.18em] shadow-sm backdrop-blur">
                                            <Sparkles className="h-3.5 w-3.5 shrink-0" />
                                            {t("heroPill")}
                                        </div>
                                        <h1 className="mt-3 bg-[linear-gradient(135deg,#0F172A_0%,#4338CA_55%,#0F766E_100%)] bg-clip-text font-bold text-3xl text-transparent tracking-tight md:text-[38px]">
                                            {t("title")}
                                        </h1>

                                        <div className="mt-4">
                                            <HomeTopTabs />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={() => setOpenCalendar(true)}
                                            className="h-11 rounded-2xl border-white/80 bg-white/75 px-4 text-slate-700 shadow-sm backdrop-blur transition-[transform,box-shadow,border-color,background-color] hover:bg-white">
                                            <CalendarDays className="mr-2 h-4 w-4" />
                                            {t("calendar")}
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
                                        className="rounded-[28px] border border-red-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(254,242,242,0.96))] px-5 py-4 text-red-600 text-sm shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                                                <AlertTriangle className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-semibold">{t("loadingError")}</p>
                                                <p className="mt-1 text-red-400">{t("loadingErrorHint")}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="space-y-5">
                                        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                                            <StatCard
                                                label={t("remainingTasksLabel")}
                                                value={remainingTaskCount}
                                                delta={remainingDelta?.value}
                                                icon={<Clock3 className="h-5 w-5" />}
                                                note={t("remainingTasksNote")}
                                                tone="neutral"
                                                index={0}
                                                onClick={() => setOpenDetail(true)}
                                            />

                                            <StatCard
                                                label={t("overdueTasksLabel")}
                                                value={overdueTaskCount}
                                                delta={overdueDelta?.value}
                                                icon={<Flame className="h-5 w-5" />}
                                                tone="danger"
                                                note={t("overdueTasksNote")}
                                                index={1}
                                                onClick={() => setOpenDetail(true)}
                                            />

                                            <StatCard
                                                label={t("completedTasksLabel")}
                                                value={completedTaskCount}
                                                delta={completedDelta?.value}
                                                icon={<CheckCircle2 className="h-5 w-5" />}
                                                tone="success"
                                                note={t("completedTasksNote")}
                                                index={2}
                                                onClick={() => setOpenDetail(true)}
                                            />
                                        </section>

                                        <div className="flex justify-end">
                                            <Button
                                                onClick={() => setOpenDetail(true)}
                                                className="h-11 rounded-2xl bg-gradient-to-r from-[#FF8A63] to-[#E9644A] px-5 text-white shadow-[0_14px_28px_rgba(15,23,42,0.12)] transition-[transform,box-shadow,background-image] hover:from-[#FF9A76] hover:to-[#D95342] focus:outline-none focus:ring-4">
                                                {t("viewDetails")}
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
                t={t}
            />

            <PersonalCalendar open={openCalendar} onClose={() => setOpenCalendar(false)} />
        </>
    );
}
