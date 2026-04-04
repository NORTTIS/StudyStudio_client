"use client";

import { useCallback, useEffect, useState } from "react";
import { exportRevenueData, getMRR, getRevenueOverview, getRevenueTrends, getTopPlans } from "@/api/admin-revenue";
import { Button } from "@/components/ui/button";

export function RevenueStatsTab() {
    const locale = "vi";
    const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("month");
    const [_isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        monthlyRevenue: 0,
        averageRevenuePerUser: 0,
        growth: 0
    });
    const [monthlyData, setMonthlyData] = useState<any[]>([]);
    const [topPlans, setTopPlans] = useState<any[]>([]);

    const loadRevenueData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [overviewResult, trendsResult, plansResult, _mrrResult] = await Promise.all([
                getRevenueOverview(locale),
                getRevenueTrends(timeRange, locale),
                getTopPlans(5, undefined, undefined, locale),
                getMRR(locale)
            ]);

            // Update stats
            if (overviewResult.status === "success" && overviewResult.data) {
                setStats({
                    totalRevenue: overviewResult.data.totalRevenue,
                    monthlyRevenue: overviewResult.data.monthlyRevenue,
                    averageRevenuePerUser: overviewResult.data.arpu, // Changed from averageRevenuePerUser
                    growth: overviewResult.data.successRate // Fallback or mapping
                });
            }

            // Update trends
            if (trendsResult.status === "success" && trendsResult.data) {
                const current = trendsResult.data.currentPeriod;
                setMonthlyData([
                    {
                        month: new Date(current.startDate).toLocaleDateString("en-US", { month: "short" }),
                        revenue: current.totalRevenue,
                        subscriptions: current.transactionCount
                    }
                ]);
            }

            // Update top plans
            if (plansResult.status === "success" && plansResult.data) {
                setTopPlans(
                    plansResult.data.map((p: any) => ({
                        plan: p.planName,
                        subscribers: p.subscriptions,
                        revenue: p.revenue,
                        percentage: p.growth // or calculate
                    }))
                );
            }
        } catch (error) {
            console.error("Failed to load revenue data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [locale, timeRange]);

    useEffect(() => {
        loadRevenueData();
    }, [loadRevenueData]);

    const handleExportReport = async () => {
        try {
            const endDate = new Date().toISOString().split("T")[0];
            const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

            await exportRevenueData("overview", startDate, endDate, "month", false, locale);
            console.log("Revenue report exported successfully");
        } catch (error) {
            console.error("Failed to export revenue report:", error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header with Time Range Selector */}
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setTimeRange("week")}
                        className={`rounded-lg px-4 py-2 font-medium text-sm transition-colors ${timeRange === "week"
                                ? "bg-[#FF5F3D] text-white"
                                : "bg-white text-[#6F6B99] hover:bg-gray-50"
                            }`}>
                        This Week
                    </button>
                    <button
                        type="button"
                        onClick={() => setTimeRange("month")}
                        className={`rounded-lg px-4 py-2 font-medium text-sm transition-colors ${timeRange === "month"
                                ? "bg-[#FF5F3D] text-white"
                                : "bg-white text-[#6F6B99] hover:bg-gray-50"
                            }`}>
                        This Month
                    </button>
                    <button
                        type="button"
                        onClick={() => setTimeRange("year")}
                        className={`rounded-lg px-4 py-2 font-medium text-sm transition-colors ${timeRange === "year"
                                ? "bg-[#FF5F3D] text-white"
                                : "bg-white text-[#6F6B99] hover:bg-gray-50"
                            }`}>
                        This Year
                    </button>
                </div>

                <Button onClick={handleExportReport} className="bg-[#FF5F3D] hover:bg-[#ff4620]">
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                    </svg>
                    Export Report
                </Button>
            </div>

            {/* Revenue Stats Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-[#6F6B99] text-sm">Total Revenue</p>
                        <svg className="h-5 w-5 text-[#FF5F3D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <p className="font-bold text-2xl text-[#261E33]">{stats.totalRevenue.toLocaleString()} VND</p>
                    <p className="mt-1 text-green-600 text-xs">+{stats.growth}% from last period</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-[#6F6B99] text-sm">Monthly Revenue</p>
                        <svg className="h-5 w-5 text-[#6F6B99]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                            />
                        </svg>
                    </div>
                    <p className="font-bold text-2xl text-[#261E33]">{stats.monthlyRevenue.toLocaleString()} VND</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-[#6F6B99] text-sm">Avg Revenue/User</p>
                        <svg className="h-5 w-5 text-[#6F6B99]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                        </svg>
                    </div>
                    <p className="font-bold text-2xl text-[#261E33]">
                        {stats.averageRevenuePerUser.toLocaleString()} VND
                    </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-[#6F6B99] text-sm">Growth Rate</p>
                        <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M trending-up" />
                        </svg>
                    </div>
                    <p className="font-bold text-2xl text-[#261E33]">+{stats.growth}%</p>
                </div>
            </div>

            {/* Monthly Revenue Chart */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-4 font-bold text-[#261E33] text-lg">Monthly Revenue Trend</h3>
                <div className="space-y-3">
                    {monthlyData.map((data: any, index: number) => {
                        const maxRevenue = Math.max(...monthlyData.map((d: any) => d.revenue));
                        const percentage = (data.revenue / maxRevenue) * 100;

                        return (
                            <div key={index} className="flex items-center gap-4">
                                <span className="w-12 text-[#6F6B99] text-sm">{data.month}</span>
                                <div className="flex-1">
                                    <div className="h-8 w-full overflow-hidden rounded-lg bg-gray-100">
                                        <div
                                            className="h-full bg-gradient-to-r from-[#FF5F3D] to-[#ff8c6b] transition-all"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                                <span className="w-32 text-right font-semibold text-[#261E33] text-sm">
                                    {data.revenue.toLocaleString()} VND
                                </span>
                                <span className="w-24 text-right text-[#6F6B99] text-sm">
                                    {data.subscriptions} subs
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Top Plans by Revenue */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-4 font-bold text-[#261E33] text-lg">Revenue by Plan</h3>
                <div className="space-y-4">
                    {topPlans.map((plan: any, index: number) => (
                        <div
                            key={index}
                            className="flex items-center justify-between rounded-lg border border-gray-100 p-4">
                            <div>
                                <p className="font-semibold text-[#261E33]">{plan.plan}</p>
                                <p className="text-[#6F6B99] text-sm">
                                    {plan.subscribers.toLocaleString()} subscribers
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-[#261E33] text-lg">{plan.revenue.toLocaleString()} VND</p>
                                <p className="text-[#6F6B99] text-sm">{plan.percentage}% of total</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
