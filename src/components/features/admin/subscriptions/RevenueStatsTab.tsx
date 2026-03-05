"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function RevenueStatsTab() {
    const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("month");

    // Mock data
    const stats = {
        totalRevenue: 699717000,
        monthlyRevenue: 58309750,
        averageRevenuePerUser: 24900,
        growth: 12.5
    };

    const monthlyData = [
        { month: "Jan", revenue: 45000000, subscriptions: 150 },
        { month: "Feb", revenue: 52000000, subscriptions: 174 },
        { month: "Mar", revenue: 58309750, subscriptions: 195 },
        { month: "Apr", revenue: 61000000, subscriptions: 204 },
        { month: "May", revenue: 67000000, subscriptions: 224 },
        { month: "Jun", revenue: 72000000, subscriptions: 241 }
    ];

    const topPlans = [
        { plan: "Premium", subscribers: 2341, revenue: 699717000, percentage: 100 },
        { plan: "Free", subscribers: 10117, revenue: 0, percentage: 0 }
    ];

    const handleExportReport = () => {
        console.log("Exporting revenue report...");
    };

    return (
        <div className="space-y-6">
            {/* Header with Time Range Selector */}
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setTimeRange("week")}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${timeRange === "week"
                                ? "bg-[#FF5F3D] text-white"
                                : "bg-white text-[#6F6B99] hover:bg-gray-50"
                            }`}>
                        This Week
                    </button>
                    <button
                        type="button"
                        onClick={() => setTimeRange("month")}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${timeRange === "month"
                                ? "bg-[#FF5F3D] text-white"
                                : "bg-white text-[#6F6B99] hover:bg-gray-50"
                            }`}>
                        This Month
                    </button>
                    <button
                        type="button"
                        onClick={() => setTimeRange("year")}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${timeRange === "year"
                                ? "bg-[#FF5F3D] text-white"
                                : "bg-white text-[#6F6B99] hover:bg-gray-50"
                            }`}>
                        This Year
                    </button>
                </div>

                <Button onClick={handleExportReport} className="bg-[#FF5F3D] hover:bg-[#ff4620]">
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="font-bold text-2xl text-[#261E33]">{stats.totalRevenue.toLocaleString()} VND</p>
                    <p className="mt-1 text-green-600 text-xs">+{stats.growth}% from last period</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-[#6F6B99] text-sm">Monthly Revenue</p>
                        <svg className="h-5 w-5 text-[#6F6B99]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    </div>
                    <p className="font-bold text-2xl text-[#261E33]">{stats.monthlyRevenue.toLocaleString()} VND</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-[#6F6B99] text-sm">Avg Revenue/User</p>
                        <svg className="h-5 w-5 text-[#6F6B99]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <p className="font-bold text-2xl text-[#261E33]">{stats.averageRevenuePerUser.toLocaleString()} VND</p>
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
                <h3 className="mb-4 font-bold text-lg text-[#261E33]">Monthly Revenue Trend</h3>
                <div className="space-y-3">
                    {monthlyData.map((data, index) => {
                        const maxRevenue = Math.max(...monthlyData.map(d => d.revenue));
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
                <h3 className="mb-4 font-bold text-lg text-[#261E33]">Revenue by Plan</h3>
                <div className="space-y-4">
                    {topPlans.map((plan, index) => (
                        <div key={index} className="flex items-center justify-between rounded-lg border border-gray-100 p-4">
                            <div>
                                <p className="font-semibold text-[#261E33]">{plan.plan}</p>
                                <p className="text-[#6F6B99] text-sm">{plan.subscribers.toLocaleString()} subscribers</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-lg text-[#261E33]">{plan.revenue.toLocaleString()} VND</p>
                                <p className="text-[#6F6B99] text-sm">{plan.percentage}% of total</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
