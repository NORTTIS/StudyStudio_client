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

type StatCardProps = {
    label: string;
    value: number;
    icon: React.ReactNode;
    tone?: "neutral" | "danger" | "success" | "violet";
    note?: string;
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

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
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

function StatCard({ label, value, icon, tone = "neutral", note, index = 0, onClick }: StatCardProps) {
    const styles = {
        neutral: {
            card: "border-slate-200 bg-white backdrop-blur-xl",
            glow: "",
            iconWrap: "bg-slate-100 text-slate-700 h-11 w-11 rounded-2xl",
            iconSize: "h-5 w-5",
            label: "text-black",
            value: "text-black",
            note: "text-slate-600"
        },
        danger: {
            card: "border-[#F1D7CE]/85 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(255,248,245,0.98)_52%,rgba(251,235,229,0.94)_100%)] backdrop-blur-xl",
            glow: "",
            iconWrap: "bg-[#FEE2E2] text-[#DC2626] h-12 w-12 rounded-full",
            iconSize: "h-5.5 w-5.5",
            label: "text-red-500",
            value: "text-red-600",
            note: "text-red-400"
        },
        success: {
            card: "border-[#CDE4DB]/85 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(244,251,248,0.98)_52%,rgba(228,243,237,0.94)_100%)] backdrop-blur-xl",
            glow: "",
            iconWrap: "bg-[#DCEFE6] text-[#2C7A63] h-10 w-10 rounded-xl",
            iconSize: "h-4.5 w-4.5",
            label: "text-green-500",
            value: "text-green-600",
            note: "text-green-500"
        },
        violet: {
            card: "border-[#F3D6B4]/85 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(255,249,242,0.98)_52%,rgba(252,237,217,0.94)_100%)] backdrop-blur-xl",
            glow: "",
            iconWrap: "bg-[#FDE7CC] text-[#EA580C] h-11 w-11 rounded-2xl",
            iconSize: "h-5 w-5",
            label: "text-orange-500",
            value: "text-orange-600",
            note: "text-orange-500"
        }
    };

    const s = styles[tone];
    const cardClassName = cx(
        "group relative w-full overflow-hidden rounded-[28px] border p-5 text-left shadow-[0_10px_34px_rgba(15,23,42,0.06)] transition-[transform,box-shadow,border-color,background-color] duration-300 hover:shadow-[0_18px_42px_rgba(15,23,42,0.08)]",
        onClick && "cursor-pointer",
        s.card
    );

    const cardContent = (
        <>
            <div className="absolute -top-8 -right-8 h-28 w-28 rounded-full bg-white/60 opacity-70 blur-3xl" />

            <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className={cx("font-medium text-sm", s.label)}>{label}</p>

                    <p className={cx("mt-3 font-bold text-3xl tracking-tight", s.value)}>{value}</p>
                    {note ? <p className={cx("mt-2 text-xs font-medium", s.note)}>{note}</p> : null}
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
        </>
    );

    if (!onClick) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.06 * index }}
                className={cardClassName}>
                {cardContent}
            </motion.div>
        );
    }

    return (
        <motion.button
            type="button"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.06 * index }}
            whileHover={{ y: -6 }}
            onClick={onClick}
            className={cardClassName}>
            {cardContent}
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
            card: "border-slate-200 bg-white backdrop-blur-xl",
            badge: "bg-slate-100 text-slate-700",
            title: "text-black",
            subtitle: "text-slate-500",
            percent: "text-black",
            desc: "text-slate-700",
            track: "bg-slate-200",
            bar: "bg-[linear-gradient(90deg,#111827_0%,#000000_100%)]",
            quantityBox: "border-slate-200 bg-white",
            quantityLabel: "text-slate-500",
            quantityValue: "text-black",
            glow: ""
        },
        danger: {
            card: "border-[#F1D7CE]/85 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(255,248,245,0.98)_52%,rgba(251,235,229,0.94)_100%)] backdrop-blur-xl",
            badge: "bg-[#FEE2E2] text-[#DC2626]",
            title: "text-red-600",
            subtitle: "text-red-400",
            percent: "text-red-600",
            desc: "text-red-500",
            track: "bg-[#FEE2E2]",
            bar: "bg-[linear-gradient(90deg,#EF4444_0%,#DC2626_100%)]",
            quantityBox: "border-[#FECACA] bg-[#FEF2F2]",
            quantityLabel: "text-red-400",
            quantityValue: "text-red-600",
            glow: ""
        },
        success: {
            card: "border-[#CDE4DB]/85 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(244,251,248,0.98)_52%,rgba(228,243,237,0.94)_100%)] backdrop-blur-xl",
            badge: "bg-[#DCEFE6] text-[#2C7A63]",
            title: "text-green-700",
            subtitle: "text-green-500",
            percent: "text-green-600",
            desc: "text-green-600",
            track: "bg-[#DCFCE7]",
            bar: "bg-[linear-gradient(90deg,#4ADE80_0%,#16A34A_100%)]",
            quantityBox: "border-[#BBF7D0] bg-[#F0FDF4]",
            quantityLabel: "text-green-500",
            quantityValue: "text-green-700",
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
                        <h3 className={cx("font-semibold text-sm", s.title)}>{title}</h3>
                        <p className={cx("text-xs", s.subtitle)}>{subtitleLabel}</p>
                    </div>
                </div>

                <div className="mt-8 flex items-end justify-between gap-4">
                    <div>
                        <p className={cx("font-bold text-5xl tracking-tight", s.percent)}>{percent}%</p>
                        <p className={cx("mt-3 text-sm leading-6 font-medium", s.desc)}>{description}</p>
                    </div>

                    <div className={cx("rounded-2xl border px-3 py-2 text-right shadow-sm backdrop-blur", s.quantityBox)}>
                        <p className={cx("text-[11px] uppercase tracking-wide", s.quantityLabel)}>{quantityLabel}</p>
                        <p className={cx("mt-1 font-semibold text-sm", s.quantityValue)}>
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
    totalTasks,
    t
}: DetailLayerProps) {
    const titleId = React.useId();

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
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-[#3F2A1D]/22 p-4 backdrop-blur-[5px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}>
                    <motion.div
                        initial={{ opacity: 0, y: 28, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 18, scale: 0.98 }}
                        transition={{ duration: 0.25 }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        className="relative flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(255,249,244,0.96))] shadow-[0_28px_90px_rgba(146,64,14,0.12)]">
                        <div className="flex items-center justify-between border-[#F0DED0] border-b bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,249,244,0.96))] px-6 py-5 md:px-8">
                            <div>
                                <h2 id={titleId} className="font-bold text-2xl text-slate-900 tracking-tight md:text-3xl">
                                    {t("detailsTitle")}
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={onClose}
                                aria-label={t("close")}
                                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#F0DDCF] bg-white/90 text-[#9A6B4A] transition hover:bg-[#FFF8F3]">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#FFFBF7_0%,#FDF4EC_100%)] px-6 py-6 md:px-8">
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
                                            icon={<Clock3 className="h-5 w-5" />}
                                            note={t("remainingTasksNote")}
                                            tone="neutral"
                                            index={0}
                                        />

                                        <StatCard
                                            label={t("overdueTasksLabel")}
                                            value={overdueTaskCount}
                                            icon={<Flame className="h-5 w-5" />}
                                            note={t("overdueTasksNote")}
                                            tone="danger"
                                            index={1}
                                        />

                                        <StatCard
                                            label={t("completedTasksLabel")}
                                            value={completedTaskCount}
                                            icon={<CheckCircle2 className="h-5 w-5" />}
                                            note={t("completedTasksNote")}
                                            tone="success"
                                            index={2}
                                        />

                                        <StatCard
                                            label={t("joinedGroupsLabel")}
                                            value={totalJoinedGroupCount}
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

    const totalTasks = remainingTaskCount + overdueTaskCount + completedTaskCount;

    return (
        <>
            <div
                id="home-summary-section"
                className="relative scroll-mt-24 overflow-hidden bg-[linear-gradient(180deg,#FFF9F4_0%,#FEF3E8_34%,#FCEBDD_68%,#F7EFE8_100%)]">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute top-[-40px] left-[-80px] h-72 w-72 rounded-full bg-[#F7D7BF]/48 blur-3xl" />
                    <div className="absolute top-[18%] right-[-80px] h-80 w-80 rounded-full bg-[#F6C9A5]/35 blur-3xl" />
                    <div className="absolute bottom-[-120px] left-[15%] h-96 w-96 rounded-full bg-[#FBE4D2]/38 blur-3xl" />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] bg-[size:28px_28px] opacity-30" />
                </div>

                <Container className="relative pt-8 pb-8">
                    <div className="space-y-8">
                        <SectionReveal>
                            <section className="relative overflow-hidden rounded-[32px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(255,247,240,0.76))] px-6 py-6 shadow-[0_18px_60px_rgba(180,83,9,0.08)] backdrop-blur-2xl">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.12),transparent_30%)]" />

                                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0">
                                        <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-white/85 px-3 py-1 font-semibold text-[11px] text-orange-700 uppercase tracking-[0.18em] shadow-sm backdrop-blur">
                                            <Sparkles className="h-3.5 w-3.5 shrink-0" />
                                            {t("heroPill")}
                                        </div>
                                        <h1 className="mt-3 bg-[linear-gradient(135deg,#7C2D12_0%,#EA580C_48%,#FB923C_100%)] bg-clip-text font-bold text-3xl text-transparent tracking-tight md:text-[38px]">
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
                                            className="h-11 rounded-2xl border-orange-200/80 bg-white/85 px-4 text-orange-700 shadow-sm backdrop-blur transition-[transform,box-shadow,border-color,background-color] hover:border-orange-300 hover:bg-white">
                                            <CalendarDays className="mr-2 h-4 w-4" />
                                            {t("calendar")}
                                        </Button>
                                    </div>
                                </div>
                            </section>
                        </SectionReveal>

                        <SectionReveal delay={0.06}>
                            <section className="rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,246,238,0.62))] p-4 shadow-[0_18px_50px_rgba(180,83,9,0.06)] backdrop-blur-xl md:p-6">
                                {isLoading ? (
                                    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                        {Array.from({ length: 4 }).map((_, index) => (
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
                                        <SectionReveal delay={0.06}>
                                            <section className="rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,246,238,0.62))] p-4 shadow-[0_18px_50px_rgba(180,83,9,0.06)] backdrop-blur-xl md:p-6">
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
                                                                icon={<Clock3 className="h-5 w-5" />}
                                                                note={t("remainingTasksNote")}
                                                                tone="neutral"
                                                                index={0}
                                                                onClick={() => setOpenDetail(true)}
                                                            />

                                                            <StatCard
                                                                label={t("overdueTasksLabel")}
                                                                value={overdueTaskCount}
                                                                icon={<Flame className="h-5 w-5" />}
                                                                tone="danger"
                                                                note={t("overdueTasksNote")}
                                                                index={1}
                                                                onClick={() => setOpenDetail(true)}
                                                            />

                                                            <StatCard
                                                                label={t("completedTasksLabel")}
                                                                value={completedTaskCount}
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
                                                                className="h-11 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 px-5 text-white shadow-[0_14px_28px_rgba(15,23,42,0.12)] transition hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-4">
                                                                {t("viewDetails")}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </section>
                                        </SectionReveal>
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
                totalTasks={totalTasks}
                t={t}
            />

            <PersonalCalendar open={openCalendar} onClose={() => setOpenCalendar(false)} />
        </>
    );
}
