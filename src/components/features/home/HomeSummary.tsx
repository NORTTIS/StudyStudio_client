"use client";

import { BarChart3, CalendarDays } from "lucide-react";
import * as React from "react";
import { apiFetch } from "@/api/api-client";
import type { components } from "@/api/types";
import { Container } from "@/components/common";
import { Button } from "@/components/ui/button";

type HomeSummaryResponse = components["schemas"]["HomeSummaryResponse"];
type HomeSummaryResponseApiResponse = components["schemas"]["HomeSummaryResponseApiResponse"];

type SummaryCardProps = {
    label: string;
    value: number;
};

type CompletionCardProps = {
    completed: number;
    total: number;
};

function SummaryCard({ label, value }: SummaryCardProps) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-[#6F6B99]">{label}</p>
            <p className="mt-5 font-bold text-3xl text-[#261E33]">{value}</p>
        </div>
    );
}

function CompletionCard({ completed, total }: CompletionCardProps) {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#261E33]" />
                <p className="font-semibold text-[#261E33] text-sm">Task Completion</p>
            </div>

            <div className="flex h-[140px] flex-col items-center justify-center text-center">
                <p className="font-bold text-4xl text-[#261E33]">{percentage}%</p>
                <p className="mt-1 text-[#6F6B99] text-sm">
                    {completed} of {total} completed
                </p>
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
        <div className="bg-white">
            <Container className="bg-white py-6">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="mb-2 font-bold text-3xl text-[#261E33]">Home Dashboard</h1>
                        <p className="text-[#6F6B99]">Tổng hợp tất cả công việc và hoạt động của bạn</p>
                    </div>

                    <Button
                        variant="outline"
                        className="border-gray-200 bg-white text-[#261E33] shadow-sm hover:bg-gray-50"
                    >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        Lịch
                    </Button>
                </div>

                {isLoading ? (
                    <>
                        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="h-[132px] animate-pulse rounded-xl border border-gray-200 bg-white"
                                />
                            ))}
                        </div>

                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                            {Array.from({ length: 3 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="h-[190px] animate-pulse rounded-xl border border-gray-200 bg-white"
                                />
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                            <SummaryCard label="Công việc còn lại" value={remainingTaskCount} />
                            <SummaryCard label="Công việc quá hạn" value={overdueTaskCount} />
                            <SummaryCard label="Công việc đã hoàn thành" value={completedTaskCount} />
                            <SummaryCard label="Tổng số nhóm tham gia" value={totalJoinedGroupCount} />
                        </div>

                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                            <CompletionCard completed={completedTaskCount} total={totalTasks} />
                            <CompletionCard completed={completedTaskCount} total={totalTasks} />
                            <CompletionCard completed={completedTaskCount} total={totalTasks} />
                        </div>
                    </>
                )}
            </Container>
        </div>
    );
}