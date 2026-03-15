"use client";

import {
    AlertTriangle,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Layers3,
    Sparkles,
    TrendingUp
} from "lucide-react";
import * as React from "react";
import useSWR from "swr";
import { apiFetch } from "@/api/api-client";
import type { components } from "@/api/types";
import { Container } from "@/components/common";
import { Button } from "@/components/ui/button";

type HomeSummaryResponse = components["schemas"]["HomeSummaryResponse"];
type HomeSummaryResponseApiResponse =
    components["schemas"]["HomeSummaryResponseApiResponse"];

type DeltaInfo = {
    value: number;
    changedAt: number;
    expiresAt: number;
};

type StatCardProps = {
    label: string;
    value: number;
    icon: React.ReactNode;
    tone?: "neutral" | "danger" | "success";
    note?: string;
    delta?: number;
};

type OverviewCardProps = {
    title: string;
    value: number;
    total: number;
    description: string;
    tone?: "neutral" | "danger" | "success";
};

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function useStatDelta(key: string, currentValue: number, enabled: boolean) {
    const storageKey = `home-summary-delta:${key}`;
    const prevValueKey = `home-summary-prev:${key}`;
    const [delta, setDelta] = React.useState<DeltaInfo | null>(null);

    React.useEffect(() => {
        if (!enabled || typeof window === "undefined") return;

        const now = Date.now();

        try {
            const savedDeltaRaw = localStorage.getItem(storageKey);
            if (savedDeltaRaw) {
                const savedDelta = JSON.parse(savedDeltaRaw) as DeltaInfo;

                if (
                    typeof savedDelta?.value === "number" &&
                    typeof savedDelta?.expiresAt === "number" &&
                    now < savedDelta.expiresAt &&
                    savedDelta.value !== 0
                ) {
                    setDelta(savedDelta);
                } else {
                    localStorage.removeItem(storageKey);
                    setDelta(null);
                }
            } else {
                setDelta(null);
            }

            const prevRaw = localStorage.getItem(prevValueKey);

            if (prevRaw === null) {
                localStorage.setItem(prevValueKey, String(currentValue));
                return;
            }

            const prevValue = Number(prevRaw);

            if (!Number.isNaN(prevValue) && prevValue !== currentValue) {
                const diff = currentValue - prevValue;

                const nextDelta: DeltaInfo = {
                    value: diff,
                    changedAt: now,
                    expiresAt: now + ONE_WEEK_MS
                };

                localStorage.setItem(storageKey, JSON.stringify(nextDelta));
                localStorage.setItem(prevValueKey, String(currentValue));
                setDelta(nextDelta);
                return;
            }

            if (!Number.isNaN(prevValue)) {
                localStorage.setItem(prevValueKey, String(currentValue));
            }
        } catch {
            setDelta(null);
        }
    }, [currentValue, enabled, prevValueKey, storageKey]);

    React.useEffect(() => {
        if (!enabled || !delta) return;

        const timeout = delta.expiresAt - Date.now();
        if (timeout <= 0) {
            setDelta(null);
            if (typeof window !== "undefined") {
                try {
                    localStorage.removeItem(storageKey);
                } catch { }
            }
            return;
        }

        const timer = window.setTimeout(() => {
            setDelta(null);
            try {
                localStorage.removeItem(storageKey);
            } catch { }
        }, timeout);

        return () => window.clearTimeout(timer);
    }, [delta, enabled, storageKey]);

    return delta;
}

function StatCard({
    label,
    value,
    icon,
    tone = "neutral",
    note,
    delta
}: StatCardProps) {
    const styles = {
        neutral: {
            card: "border-gray-200/80 bg-white hover:border-gray-300",
            ring: "from-gray-100/80 to-white",
            iconWrap: "bg-gray-100 text-gray-700",
            label: "text-gray-500",
            value: "text-gray-900",
            note: "text-gray-400"
        },
        danger: {
            card: "border-red-200/80 bg-white hover:border-red-300",
            ring: "from-red-50 to-white",
            iconWrap: "bg-red-50 text-red-500",
            label: "text-red-500",
            value: "text-red-600",
            note: "text-red-400"
        },
        success: {
            card: "border-green-200/80 bg-white hover:border-green-300",
            ring: "from-green-50 to-white",
            iconWrap: "bg-green-50 text-green-600",
            label: "text-green-600",
            value: "text-green-600",
            note: "text-green-500"
        }
    };

    const s = styles[tone];
    const hasDelta = typeof delta === "number" && delta !== 0;
    const isPositive = (delta ?? 0) > 0;

    return (
        <div
            className={cx(
                "group relative overflow-hidden rounded-3xl border p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]",
                s.card
            )}
        >
            <div
                className={cx(
                    "absolute inset-x-0 top-0 h-24 bg-gradient-to-b opacity-80",
                    s.ring
                )}
            />

            <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className={cx("text-sm font-medium", s.label)}>{label}</p>

                    <div className="mt-3 flex items-end gap-2">
                        <p className={cx("text-3xl font-bold tracking-tight", s.value)}>
                            {value}
                        </p>

                        {hasDelta ? (
                            <span
                                className={cx(
                                    "mb-1 text-sm font-semibold",
                                    isPositive ? "text-green-600" : "text-red-500"
                                )}
                            >
                                {isPositive ? `+${delta}` : `${delta}`}
                            </span>
                        ) : null}
                    </div>

                    {note ? <p className={cx("mt-2 text-xs", s.note)}>{note}</p> : null}
                </div>

                <div
                    className={cx(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm",
                        s.iconWrap
                    )}
                >
                    {icon}
                </div>
            </div>
        </div>
    );
}

function OverviewCard({
    title,
    value,
    total,
    description,
    tone = "neutral"
}: OverviewCardProps) {
    const percent = total > 0 ? Math.round((value / total) * 100) : 0;

    const styles = {
        neutral: {
            card: "border-gray-200/80 bg-white",
            badge: "bg-violet-50 text-violet-600",
            percent: "text-gray-900",
            desc: "text-gray-500",
            track: "bg-gray-100",
            bar: "bg-violet-500",
            glow: "from-violet-50/80 to-white"
        },
        danger: {
            card: "border-red-200/80 bg-white",
            badge: "bg-red-50 text-red-500",
            percent: "text-red-600",
            desc: "text-red-400",
            track: "bg-red-50",
            bar: "bg-red-500",
            glow: "from-red-50/80 to-white"
        },
        success: {
            card: "border-green-200/80 bg-white",
            badge: "bg-green-50 text-green-600",
            percent: "text-green-600",
            desc: "text-green-500",
            track: "bg-green-50",
            bar: "bg-green-500",
            glow: "from-green-50/80 to-white"
        }
    };

    const s = styles[tone];

    return (
        <div
            className={cx(
                "relative overflow-hidden rounded-3xl border p-6 shadow-[0_8px_30px_rgba(15,23,42,0.05)]",
                s.card
            )}
        >
            <div
                className={cx(
                    "absolute inset-x-0 top-0 h-28 bg-gradient-to-b opacity-90",
                    s.glow
                )}
            />

            <div className="relative">
                <div className="flex items-center gap-3">
                    <div className={cx("rounded-2xl p-2.5", s.badge)}>
                        <TrendingUp className="h-4 w-4" />
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                        <p className="text-xs text-gray-400">Tổng quan hiện tại</p>
                    </div>
                </div>

                <div className="mt-8 flex items-end justify-between gap-4">
                    <div>
                        <p className={cx("text-5xl font-bold tracking-tight", s.percent)}>
                            {percent}%
                        </p>
                        <p className={cx("mt-3 text-sm leading-6", s.desc)}>
                            {description}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2 text-right">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">
                            số lượng
                        </p>
                        <p className="mt-1 text-sm font-semibold text-gray-700">
                            {value}/{total}
                        </p>
                    </div>
                </div>

                <div className={cx("mt-6 h-2.5 w-full overflow-hidden rounded-full", s.track)}>
                    <div
                        className={cx("h-full rounded-full transition-all duration-500", s.bar)}
                        style={{ width: `${percent}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

function buildSummaryUrl() {
    const rawBase =
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        "";
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

    if (
        source &&
        typeof source === "object" &&
        "data" in source &&
        (source as HomeSummaryResponseApiResponse).data
    ) {
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

export default function HomeSummary() {
    const {
        data: summary,
        isLoading,
        error
    } = useSWR("home-summary", fetchHomeSummary, {
        refreshInterval: 3000,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 1000
    });

    const remainingTaskCount = summary?.remainingTaskCount ?? 0;
    const overdueTaskCount = summary?.overdueTaskCount ?? 0;
    const completedTaskCount = summary?.completedTaskCount ?? 0;
    const totalJoinedGroupCount = summary?.totalJoinedGroupCount ?? 0;

    const hasSummary = !!summary;

    const remainingDelta = useStatDelta(
        "remainingTaskCount",
        remainingTaskCount,
        hasSummary
    );
    const overdueDelta = useStatDelta(
        "overdueTaskCount",
        overdueTaskCount,
        hasSummary
    );
    const completedDelta = useStatDelta(
        "completedTaskCount",
        completedTaskCount,
        hasSummary
    );
    const joinedGroupDelta = useStatDelta(
        "totalJoinedGroupCount",
        totalJoinedGroupCount,
        hasSummary
    );

    const totalTasks =
        remainingTaskCount + overdueTaskCount + completedTaskCount;

    return (
        <div className="bg-[radial-gradient(circle_at_top,#f8fafc_0%,#f8fafc_35%,#f3f4f6_100%)]">
            <Container className="pt-8 pb-8">
                <div className="space-y-8">
                    <section className="rounded-[28px] border border-gray-200/80 bg-white/90 px-6 py-5 shadow-[0_10px_40px_rgba(15,23,42,0.06)] backdrop-blur">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Dashboard tổng quan
                                </div>

                                <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">
                                    Tổng quan công việc
                                </h1>

                                <p className="mt-2 text-sm text-gray-500">
                                    Theo dõi tiến độ xử lý, công việc quá hạn và số nhóm bạn đang
                                    tham gia.
                                </p>
                            </div>

                            <Button
                                variant="outline"
                                className="h-11 rounded-2xl border-gray-200 bg-white px-4 text-gray-700 shadow-sm hover:bg-gray-50"
                            >
                                <CalendarDays className="mr-2 h-4 w-4" />
                                Lịch
                            </Button>
                        </div>
                    </section>

                    {isLoading ? (
                        <>
                            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                {Array.from({ length: 4 }).map((_, index) => (
                                    <div
                                        key={index}
                                        className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
                                    >
                                        <div className="animate-pulse">
                                            <div className="mb-3 h-4 w-28 rounded bg-gray-200" />
                                            <div className="mb-2 h-8 w-20 rounded bg-gray-200" />
                                            <div className="h-3 w-24 rounded bg-gray-100" />
                                        </div>
                                    </div>
                                ))}
                            </section>

                            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {Array.from({ length: 3 }).map((_, index) => (
                                    <div
                                        key={index}
                                        className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
                                    >
                                        <div className="animate-pulse">
                                            <div className="h-5 w-36 rounded bg-gray-200" />
                                            <div className="mt-8 h-12 w-28 rounded bg-gray-200" />
                                            <div className="mt-3 h-4 w-40 rounded bg-gray-100" />
                                            <div className="mt-5 h-2.5 w-full rounded bg-gray-100" />
                                        </div>
                                    </div>
                                ))}
                            </section>
                        </>
                    ) : error ? (
                        <div className="rounded-3xl border border-red-200 bg-white px-5 py-4 text-sm text-red-600 shadow-sm">
                            Không tải được dữ liệu tổng quan.
                        </div>
                    ) : (
                        <>
                            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <StatCard
                                    label="Công việc còn lại"
                                    value={remainingTaskCount}
                                    delta={remainingDelta?.value}
                                    icon={<Clock3 className="h-5 w-5" />}
                                    note="Đang chờ xử lý"
                                />

                                <StatCard
                                    label="Công việc quá hạn"
                                    value={overdueTaskCount}
                                    delta={overdueDelta?.value}
                                    icon={<AlertTriangle className="h-5 w-5" />}
                                    tone="danger"
                                    note="Cần ưu tiên ngay"
                                />

                                <StatCard
                                    label="Đã hoàn thành"
                                    value={completedTaskCount}
                                    delta={completedDelta?.value}
                                    icon={<CheckCircle2 className="h-5 w-5" />}
                                    tone="success"
                                    note="Đã xử lý xong"
                                />

                                <StatCard
                                    label="Số nhóm tham gia"
                                    value={totalJoinedGroupCount}
                                    delta={joinedGroupDelta?.value}
                                    icon={<Layers3 className="h-5 w-5" />}
                                    note="Nhóm đang hoạt động"
                                />
                            </section>

                            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                <OverviewCard
                                    title="Hoàn thành"
                                    value={completedTaskCount}
                                    total={totalTasks}
                                    description={`${completedTaskCount} trên ${totalTasks} công việc đã hoàn tất`}
                                    tone="success"
                                />

                                <OverviewCard
                                    title="Còn lại"
                                    value={remainingTaskCount}
                                    total={totalTasks}
                                    description={`${remainingTaskCount} công việc vẫn đang chờ xử lý`}
                                    tone="neutral"
                                />

                                <OverviewCard
                                    title="Quá hạn"
                                    value={overdueTaskCount}
                                    total={totalTasks}
                                    description={`${overdueTaskCount} công việc cần được ưu tiên`}
                                    tone="danger"
                                />
                            </section>
                        </>
                    )}
                </div>
            </Container>
        </div>
    );
}