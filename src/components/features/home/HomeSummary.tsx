"use client";

import {
    CalendarDays,
    CheckCircle2,
    Clock3,
    Layers3,
    AlertTriangle
} from "lucide-react";
import * as React from "react";
import { apiFetch } from "@/api/api-client";
import type { components } from "@/api/types";
import { Container } from "@/components/common";
import { Button } from "@/components/ui/button";

type HomeSummaryResponse = components["schemas"]["HomeSummaryResponse"];
type HomeSummaryResponseApiResponse =
    components["schemas"]["HomeSummaryResponseApiResponse"];

type StatCardProps = {
    label: string;
    value: number;
    icon: React.ReactNode;
};

type ProgressCardProps = {
    completed: number;
    total: number;
};

function StatCard({ label, value, icon }: StatCardProps) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm text-gray-500">{label}</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                    {icon}
                </div>
            </div>
        </div>
    );
}

function ProgressCard({ completed, total }: ProgressCardProps) {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-gray-900">Tiến độ công việc</h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Tỷ lệ hoàn thành trên tổng số công việc hiện tại
                    </p>
                </div>

                <span className="rounded-md bg-gray-100 px-2.5 py-1 text-sm font-medium text-gray-700">
                    {percentage}%
                </span>
            </div>

            <div className="mb-3 flex items-end justify-between gap-4">
                <div>
                    <p className="text-3xl font-semibold text-gray-900">{percentage}%</p>
                    <p className="mt-1 text-sm text-gray-500">
                        {completed} / {total} công việc đã hoàn thành
                    </p>
                </div>
            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                    className="h-full rounded-full bg-violet-600 transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                />
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
        | { status?: string; data?: HomeSummaryResponseApiResponse | HomeSummaryResponse | null }
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

export default function HomeSummary() {
    const [summary, setSummary] = React.useState<HomeSummaryResponse | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        let isMounted = true;

        const fetchSummary = async () => {
            try {
                const url = buildSummaryUrl();

                if (!url) {
                    setIsLoading(false);
                    return;
                }

                const response = await apiFetch<HomeSummaryResponseApiResponse>(url, {
                    method: "GET"
                });

                if (!isMounted) return;

                const nextSummary = extractSummaryData(response);

                if (nextSummary) {
                    setSummary(nextSummary);
                } else {
                    console.error("Home summary response format unexpected:", response);
                }
            } catch (error) {
                console.error("Failed to fetch home summary:", error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        void fetchSummary();

        return () => {
            isMounted = false;
        };
    }, []);

    const remainingTaskCount = summary?.remainingTaskCount ?? 0;
    const overdueTaskCount = summary?.overdueTaskCount ?? 0;
    const completedTaskCount = summary?.completedTaskCount ?? 0;
    const totalJoinedGroupCount = summary?.totalJoinedGroupCount ?? 0;

    const totalTasks = remainingTaskCount + overdueTaskCount + completedTaskCount;

    return (
        <div className="bg-gray-50">
            <Container className="py-6">
                <div className="mb-6 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Tổng quan</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Theo dõi nhanh công việc và nhóm bạn đang tham gia
                        </p>
                    </div>

                    <Button
                        variant="outline"
                        className="h-10 rounded-lg border-gray-300 bg-white px-4 text-gray-700 hover:bg-gray-50"
                    >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        Lịch
                    </Button>
                </div>

                {isLoading ? (
                    <>
                        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                                >
                                    <div className="animate-pulse">
                                        <div className="mb-3 h-4 w-28 rounded bg-gray-200" />
                                        <div className="h-8 w-20 rounded bg-gray-200" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
                                <div className="animate-pulse">
                                    <div className="mb-3 h-5 w-40 rounded bg-gray-200" />
                                    <div className="mb-3 h-8 w-24 rounded bg-gray-200" />
                                    <div className="mb-4 h-4 w-48 rounded bg-gray-200" />
                                    <div className="h-2.5 w-full rounded-full bg-gray-200" />
                                </div>
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                                <div className="animate-pulse">
                                    <div className="mb-3 h-5 w-32 rounded bg-gray-200" />
                                    <div className="space-y-3">
                                        <div className="h-4 w-full rounded bg-gray-200" />
                                        <div className="h-4 w-5/6 rounded bg-gray-200" />
                                        <div className="h-4 w-4/6 rounded bg-gray-200" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <StatCard
                                label="Công việc còn lại"
                                value={remainingTaskCount}
                                icon={<Clock3 className="h-5 w-5" />}
                            />
                            <StatCard
                                label="Công việc quá hạn"
                                value={overdueTaskCount}
                                icon={<AlertTriangle className="h-5 w-5" />}
                            />
                            <StatCard
                                label="Đã hoàn thành"
                                value={completedTaskCount}
                                icon={<CheckCircle2 className="h-5 w-5" />}
                            />
                            <StatCard
                                label="Số nhóm tham gia"
                                value={totalJoinedGroupCount}
                                icon={<Layers3 className="h-5 w-5" />}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                            <div className="lg:col-span-2">
                                <ProgressCard
                                    completed={completedTaskCount}
                                    total={totalTasks}
                                />
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                                <h2 className="text-base font-semibold text-gray-900">Tóm tắt</h2>
                                <div className="mt-4 space-y-3 text-sm text-gray-600">
                                    <div className="flex items-center justify-between">
                                        <span>Còn lại</span>
                                        <span className="font-medium text-gray-900">
                                            {remainingTaskCount}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Quá hạn</span>
                                        <span className="font-medium text-gray-900">
                                            {overdueTaskCount}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Hoàn thành</span>
                                        <span className="font-medium text-gray-900">
                                            {completedTaskCount}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Nhóm tham gia</span>
                                        <span className="font-medium text-gray-900">
                                            {totalJoinedGroupCount}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </Container>
        </div>
    );
}