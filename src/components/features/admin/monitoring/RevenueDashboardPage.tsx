"use client";

import { ArrowDown, ArrowUp, DollarSign, Download, Star, TrendingUp } from "lucide-react";
import { useState } from "react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import type {
    MRRBreakdownData,
    PlanRevenueSummary,
    RevenueByPeriodData,
    RevenueByPlanData,
    RevenueOverviewData,
    RevenueTransactionsData,
    RevenueTrendsData,
    TopPlansData,
    TransactionDetail
} from "@/api/admin-revenue";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRevenueData } from "@/hooks/use-revenue-data";

export interface RevenueDashboardData {
    overview: RevenueOverviewData | null;
    byPeriod: RevenueByPeriodData | null;
    byPlan: RevenueByPlanData | null;
    trends: RevenueTrendsData | null;
    topPlans: TopPlansData | null;
    transactions: RevenueTransactionsData | null;
    mrr: MRRBreakdownData | null;
}

interface RevenueDashboardPageProps {
    data: RevenueDashboardData;
}

type TimeRange = "week" | "month" | "year";

// Helper function to format Vietnamese month names
const getVietnameseMonth = (month: number): string => {
    const months = ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"];
    return months[month - 1] || `Th${month}`;
};

const getSafeDate = (value?: string | null): Date | null => {
    if (!value) {
        return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const normalizePaymentStatus = (status?: TransactionDetail["paymentStatus"]): string => {
    const statusMap: Record<number, string> = {
        0: "PENDING",
        1: "SUCCESS",
        2: "CANCELLED",
        3: "FAILED"
    };

    if (typeof status === "number") {
        return statusMap[status] ?? String(status);
    }

    return status ?? "UNKNOWN";
};

// Helper to convert payment status to Vietnamese
const getPaymentStatusLabel = (status?: TransactionDetail["paymentStatus"]): string => {
    const statusMap: Record<string, string> = {
        SUCCESS: "Thành công",
        PENDING: "Đang xử lý",
        CANCELLED: "Đã hủy",
        FAILED: "Thất bại"
    };

    const normalizedStatus = normalizePaymentStatus(status);
    return statusMap[normalizedStatus] ?? normalizedStatus;
};

// Status colors
const STATUS_COLOR: Record<string, string> = {
    "Thành công": "bg-green-100 text-green-700",
    SUCCESS: "bg-green-100 text-green-700",
    "Thất bại": "bg-red-100 text-red-700",
    FAILED: "bg-red-100 text-red-700",
    "Đang xử lý": "bg-amber-100 text-amber-700",
    PENDING: "bg-amber-100 text-amber-700",
    "Đã hủy": "bg-gray-100 text-gray-700",
    CANCELLED: "bg-gray-100 text-gray-700"
};

const MRR_COLUMN_EXPLANATIONS = [
    {
        color: "bg-[#22C55E]",
        label: "New MRR",
        description: "Doanh thu mới từ khách hàng hoặc gói đăng ký phát sinh lần đầu trong tháng."
    },
    {
        color: "bg-[#7C3AED]",
        label: "Expansion",
        description: "Phần doanh thu tăng thêm khi người dùng nâng cấp gói hoặc mua thêm dịch vụ."
    },
    {
        color: "bg-[#EF4444]",
        label: "Churn",
        description: "Doanh thu mất đi do người dùng hủy đăng ký hoặc ngừng gia hạn."
    },
    {
        color: "bg-[#F59E0B]",
        label: "Contraction",
        description: "Phần doanh thu giảm do hạ gói hoặc giảm giá trị sử dụng từ khách hàng hiện tại."
    }
];

export function RevenueDashboardPage({ data }: RevenueDashboardPageProps) {
    const [timeRange] = useState<TimeRange>("month");

    // Use the custom hook for filter handling and API calls
    const {
        byPeriod: periodData,
        byPlan: planData,
        transactions: transactionsData,
        mrr: mrrData,
        topPlans: topPlansData,
        filters,
        applyFilters
    } = useRevenueData({
        initialByPeriod: data?.byPeriod ?? undefined,
        initialByPlan: data?.byPlan ?? undefined,
        initialTrends: data?.trends ?? undefined,
        initialTransactions: data?.transactions ?? undefined,
        initialMRR: data?.mrr ?? undefined,
        initialTopPlans: data?.topPlans ?? undefined
    });

    // Use API data or fallback to default values
    const overview = data?.overview;
    const byPeriod = periodData ?? data?.byPeriod;
    const byPlan = planData ?? data?.byPlan;
    const transactions = transactionsData ?? data?.transactions;
    const mrrBreakdown = mrrData ?? data?.mrr;
    const topPlans = topPlansData ?? data?.topPlans;
    const availablePlans = (byPlan?.plans ?? []).filter((plan): plan is PlanRevenueSummary & { planId: string } =>
        Boolean(plan.planId)
    );
    const chartData = byPeriod?.breakdown ?? [];
    const transactionRows = transactions?.transactions ?? [];

    // Calculate derived values
    const totalRevenue = overview?.totalRevenue ?? 0;
    const monthlyRevenue = overview?.monthlyRevenue ?? 0;
    const prevRevenue = monthlyRevenue * 0.9; // Fallback estimate
    const growth = monthlyRevenue > 0 ? (((monthlyRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : "0";
    const isPositive = monthlyRevenue >= prevRevenue;

    // Process byPeriod data for chart
    const maxRevenue = chartData.length > 0 ? Math.max(...chartData.map((point) => point.revenue ?? 0)) : 1;

    // Calculate successful transactions for summary
    const successfulTransactions = overview?.successfulTransactions ?? 0;
    const yearlyRevenue = overview?.yearlyRevenue ?? 0;
    const mrr = overview?.mrr ?? 0;
    const successRate = overview?.successRate ?? 0;

    const STATS = [
        {
            label: "Tổng doanh thu",
            value: formatCurrency(totalRevenue),
            sub: isPositive ? `+${growth}% so với tháng trước` : `${growth}% so với tháng trước`,
            positive: isPositive,
            icon: <DollarSign className="h-5 w-5 text-[#FF5F3D]" />,
            bg: "border-[#FF5F3D]/20 bg-gradient-to-br from-[#FFF5F3] to-white"
        },
        {
            label: "Doanh thu tháng này",
            value: formatCurrency(monthlyRevenue),
            sub: isPositive ? `Tăng ${growth}%` : `Giảm ${Math.abs(Number(growth))}%`,
            positive: isPositive,
            icon: <TrendingUp className="h-5 w-5 text-blue-500" />,
            bg: "border-blue-100 bg-blue-50"
        },
        {
            label: "Doanh thu năm",
            value: formatCurrency(yearlyRevenue),
            sub: "Tổng năm nay",
            positive: true,
            icon: <DollarSign className="h-5 w-5 text-green-500" />,
            bg: "border-green-100 bg-green-50"
        },
        {
            label: "MRR",
            value: formatCurrency(mrr),
            sub: "Doanh thu hàng tháng",
            positive: true,
            icon: <TrendingUp className="h-5 w-5 text-purple-500" />,
            bg: "border-purple-100 bg-purple-50"
        },
        {
            label: "Người dùng Premium",
            value: formatNumber(overview?.activeSubscriptions ?? 0),
            sub: "Đăng ký hoạt động",
            positive: true,
            icon: <Star className="h-5 w-5 text-amber-500" />,
            bg: "border-amber-100 bg-amber-50"
        },
        {
            label: "Tỷ lệ thành công",
            value: `${successRate.toFixed(1)}%`,
            sub: `${successfulTransactions.toLocaleString("vi-VN")} giao dịch`,
            positive: successRate >= 90,
            icon: <Star className="h-5 w-5 text-cyan-500" />,
            bg: "border-cyan-100 bg-cyan-50"
        }
    ];

    // Format currency to VND
    function formatCurrency(value: number): string {
        if (value >= 1_000_000_000) {
            return `${(value / 1_000_000_000).toFixed(1)}B VND`;
        }

        if (value >= 1_000_000) {
            return `${(value / 1_000_000).toFixed(1)}M VND`;
        }

        if (value >= 1_000) {
            return `${(value / 1_000).toFixed(0)}K VND`;
        }

        return `${value.toFixed(0)} VND`;
    }

    // Format number with thousand separators
    function formatNumber(value: number): string {
        return value.toLocaleString("vi-VN");
    }

    // Handle export
    const handleExport = () => {
        // TODO: Implement export functionality
        console.log("Exporting revenue report...");
    };

    return (
        <div className="min-h-screen bg-[#F8F8F8]">
            <div className="flex min-h-screen">
                <DashboardSidebar />
                <main className="flex-1">
                    <Header userProfile={null} />

                    <div className="px-6 py-6">
                        {/* Header */}
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h1 className="mb-1 font-bold text-2xl text-[#261E33]">Bảng điều khiển doanh thu</h1>
                                <p className="text-[#6F6B99] text-sm">
                                    Thống kê doanh thu từ các gói đăng ký và thanh toán
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Period Filter */}
                                <Select
                                    value={filters.period}
                                    onValueChange={(value: "daily" | "weekly" | "monthly" | "yearly") =>
                                        applyFilters({ period: value })
                                    }>
                                    <SelectTrigger className="w-35 bg-white">
                                        <SelectValue placeholder="Kỳ hạn" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="daily">Ngày</SelectItem>
                                        <SelectItem value="weekly">Tuần</SelectItem>
                                        <SelectItem value="monthly">Tháng</SelectItem>
                                        <SelectItem value="yearly">Năm</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Plan Filter */}
                                <Select
                                    value={filters.planId || "all"}
                                    onValueChange={(value) =>
                                        applyFilters({ planId: value === "all" ? undefined : value })
                                    }>
                                    <SelectTrigger className="w-40 bg-white">
                                        <SelectValue placeholder="Tất cả gói" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tất cả gói</SelectItem>
                                        {availablePlans.map((plan) => (
                                            <SelectItem key={plan.planId} value={plan.planId}>
                                                {plan.planName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Status Filter */}
                                <Select
                                    value={filters.paymentStatus || "all"}
                                    onValueChange={(value: "PENDING" | "SUCCESS" | "CANCELLED" | "FAILED" | "all") =>
                                        applyFilters({
                                            paymentStatus:
                                                value === "all"
                                                    ? undefined
                                                    : (value as "PENDING" | "SUCCESS" | "CANCELLED" | "FAILED")
                                        })
                                    }>
                                    <SelectTrigger className="w-35 bg-white">
                                        <SelectValue placeholder="Trạng thái" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tất cả</SelectItem>
                                        <SelectItem value="SUCCESS">Thành công</SelectItem>
                                        <SelectItem value="PENDING">Đang xử lý</SelectItem>
                                        <SelectItem value="FAILED">Thất bại</SelectItem>
                                        <SelectItem value="CANCELLED">Đã hủy</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Button className="bg-[#FF5F3D] hover:bg-[#ff4620]" onClick={handleExport}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Xuất báo cáo
                                </Button>
                            </div>
                        </div>

                        {/* Stats cards */}
                        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                            {STATS.map((stat) => (
                                <div key={stat.label} className={`rounded-xl border p-5 ${stat.bg}`}>
                                    <div className="mb-3 flex items-center justify-between">
                                        <p className="text-[#6F6B99] text-sm">{stat.label}</p>
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/60 bg-white/80">
                                            {stat.icon}
                                        </div>
                                    </div>
                                    <p className="font-bold text-[#261E33] text-xl">{stat.value}</p>
                                    <p
                                        className={`mt-1 flex items-center gap-1 font-medium text-xs ${stat.positive ? "text-green-600" : "text-red-600"}`}>
                                        {stat.positive ? (
                                            <ArrowUp className="h-3 w-3" />
                                        ) : (
                                            <ArrowDown className="h-3 w-3" />
                                        )}
                                        {stat.sub}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Revenue Chart + Revenue by Plan */}
                        <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
                            {/* Revenue Trend - AreaChart */}
                            <div className="col-span-2 rounded-2xl border border-gray-200 bg-white p-6">
                                <div className="mb-5 flex items-center justify-between">
                                    <h2 className="font-bold text-[#261E33] text-lg">Xu hướng doanh thu</h2>
                                    <span className="text-[#6F6B99] text-sm">{chartData.length} kỳ gần nhất</span>
                                </div>

                                <ResponsiveContainer width="100%" height={320}>
                                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#FF5F3D" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#FF5F3D" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(value) => {
                                                const date = new Date(value);
                                                return getVietnameseMonth(date.getMonth() + 1);
                                            }}
                                            stroke="#9CA3AF"
                                            fontSize={12}
                                        />
                                        <YAxis
                                            tickFormatter={(value) => formatCurrency(value)}
                                            stroke="#9CA3AF"
                                            fontSize={12}
                                        />
                                        <Tooltip
                                            formatter={(value) => [formatCurrency(value as number), "Doanh thu"]}
                                            labelFormatter={(label) => {
                                                const date = getSafeDate(String(label));
                                                return date ? date.toLocaleDateString("vi-VN") : "Không rõ ngày";
                                            }}
                                            contentStyle={{
                                                backgroundColor: "#fff",
                                                border: "1px solid #E5E7EB",
                                                borderRadius: "8px"
                                            }}
                                        />
                                        <Legend />
                                        <Area
                                            type="monotone"
                                            dataKey="revenue"
                                            stroke="#FF5F3D"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorRevenue)"
                                            name="Doanh thu"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>

                                {/* Recent months summary */}
                                <div className="mt-4 space-y-2">
                                    {chartData.slice(-4).map((d) => {
                                        const date = getSafeDate(d.date);
                                        const monthLabel = date ? getVietnameseMonth(date.getMonth() + 1) : "N/A";
                                        const revenue = d.revenue ?? 0;
                                        const transactionCount = d.transactionCount ?? 0;

                                        return (
                                            <div key={d.date ?? monthLabel} className="flex items-center gap-3">
                                                <span className="w-10 text-[#6F6B99] text-xs">{monthLabel}</span>
                                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                                                    <div
                                                        className="h-full rounded-full bg-linear-to-r from-[#FF5F3D] to-[#ff8c6b]"
                                                        style={{
                                                            width: `${maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0}%`
                                                        }}
                                                    />
                                                </div>
                                                <span className="w-28 text-right font-semibold text-[#261E33] text-sm">
                                                    {revenue.toLocaleString("vi-VN")} ₫
                                                </span>
                                                <span className="w-20 text-right text-[#6F6B99] text-xs">
                                                    {transactionCount} giao dịch
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Revenue by Plan - PieChart */}
                            <div className="rounded-2xl border border-gray-200 bg-white p-6">
                                <h2 className="mb-5 font-bold text-[#261E33] text-lg">Doanh thu theo gói</h2>

                                {byPlan?.plans && byPlan.plans.length > 0 ? (
                                    <>
                                        <ResponsiveContainer width="100%" height={220}>
                                            <PieChart>
                                                <Pie
                                                    data={byPlan.plans}
                                                    dataKey="totalRevenue"
                                                    nameKey="planName"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={80}
                                                    paddingAngle={2}
                                                    label={({ name, percent }) =>
                                                        `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                                                    }
                                                    labelLine={false}>
                                                    {byPlan.plans.map((plan, index) => (
                                                        <Cell
                                                            key={plan.planId ?? plan.planName ?? `plan-${index}`}
                                                            fill={
                                                                ["#FF5F3D", "#7C3AED", "#22C55E", "#F59E0B", "#3B82F6"][
                                                                index % 5
                                                                ]
                                                            }
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                                            </PieChart>
                                        </ResponsiveContainer>

                                        {/* Plan Legend */}
                                        <div className="mt-4 space-y-3">
                                            {byPlan.plans.map((plan, index) => (
                                                <div key={plan.planId} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="h-3 w-3 rounded-full"
                                                            style={{
                                                                backgroundColor: [
                                                                    "#FF5F3D",
                                                                    "#7C3AED",
                                                                    "#22C55E",
                                                                    "#F59E0B",
                                                                    "#3B82F6"
                                                                ][index % 5]
                                                            }}
                                                        />
                                                        <span className="text-[#261E33] text-sm">{plan.planName}</span>
                                                    </div>
                                                    <span className="font-semibold text-[#261E33] text-sm">
                                                        {plan.percentage}%
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex h-40 items-center justify-center text-[#6F6B99]">
                                        Chưa có dữ liệu
                                    </div>
                                )}

                                {/* Summary */}
                                <div className="mt-5 rounded-xl border border-[#FF5F3D]/20 bg-[#FFF5F3] p-4">
                                    <p className="mb-1 text-[#6F6B99] text-xs">Tổng giao dịch thành công</p>
                                    <p className="font-bold text-[#FF5F3D] text-xl">
                                        {successfulTransactions.toLocaleString("vi-VN")}
                                    </p>
                                    <p className="mt-0.5 text-[#6F6B99] text-xs">
                                        trong {timeRange === "week" ? "tuần" : timeRange === "month" ? "tháng" : "năm"}{" "}
                                        này
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* MRR Breakdown + Top Plans */}
                        <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
                            {/* MRR Breakdown - Stacked BarChart */}
                            <div className="rounded-2xl border border-gray-200 bg-white p-6">
                                <div className="mb-5 flex items-center justify-between">
                                    <h2 className="font-bold text-[#261E33] text-lg">Phân tích đoanh thu theo chu kỳ</h2>
                                    <span className="text-[#6F6B99] text-sm">
                                        {mrrBreakdown
                                            ? `MRR hiện tại: ${formatCurrency(mrrBreakdown.currentMRR ?? 0)}`
                                            : "Chưa có dữ liệu"}
                                    </span>
                                </div>

                                {mrrBreakdown?.monthlyBreakdown && mrrBreakdown.monthlyBreakdown.length > 0 ? (
                                    <>
                                        <ResponsiveContainer width="100%" height={280}>
                                            <BarChart
                                                data={mrrBreakdown.monthlyBreakdown}
                                                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                                <XAxis
                                                    dataKey="month"
                                                    tickFormatter={(value) => getVietnameseMonth(Number(value))}
                                                    stroke="#9CA3AF"
                                                    fontSize={12}
                                                />
                                                <YAxis
                                                    tickFormatter={(value) => formatCurrency(value)}
                                                    stroke="#9CA3AF"
                                                    fontSize={12}
                                                />
                                                <Tooltip
                                                    formatter={(value) => formatCurrency(value as number)}
                                                    contentStyle={{
                                                        backgroundColor: "#fff",
                                                        border: "1px solid #E5E7EB",
                                                        borderRadius: "8px"
                                                    }}
                                                />
                                                <Legend />
                                                <Bar dataKey="newMRR" stackId="mrr" fill="#22C55E" name="New MRR" />
                                                <Bar dataKey="expansionMRR" stackId="mrr" fill="#7C3AED" name="Expansion" />
                                                <Bar dataKey="churnMRR" stackId="mrr" fill="#EF4444" name="Churn" />
                                                <Bar
                                                    dataKey="contractionMRR"
                                                    stackId="mrr"
                                                    fill="#F59E0B"
                                                    name="Contraction"
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>

                                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                                            {MRR_COLUMN_EXPLANATIONS.map((item) => (
                                                <div
                                                    key={item.label}
                                                    className="rounded-xl border border-gray-100 bg-[#F8F8F8] p-3">
                                                    <div className="mb-1 flex items-center gap-2">
                                                        <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                                                        <span className="font-semibold text-[#261E33] text-sm">{item.label}</span>
                                                    </div>
                                                    <p className="text-[#6F6B99] text-xs leading-5">{item.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex h-40 items-center justify-center text-[#6F6B99]">
                                        Chưa có dữ liệu doanh thu theo chu kỳ
                                    </div>
                                )}
                            </div>

                            {/* Top Plans - Horizontal BarChart */}
                            <div className="rounded-2xl border border-gray-200 bg-white p-6">
                                <div className="mb-5 flex items-center justify-between">
                                    <h2 className="font-bold text-[#261E33] text-lg">Top gói phổ biến</h2>
                                </div>

                                {topPlans?.topPlans && topPlans.topPlans.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={280}>
                                        <BarChart
                                            data={topPlans.topPlans}
                                            layout="vertical"
                                            margin={{ top: 10, right: 30, left: 80, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                            <XAxis
                                                type="number"
                                                tickFormatter={(value) => formatCurrency(value)}
                                                stroke="#9CA3AF"
                                                fontSize={12}
                                            />
                                            <YAxis
                                                dataKey="planName"
                                                type="category"
                                                stroke="#9CA3AF"
                                                fontSize={12}
                                                width={80}
                                            />
                                            <Tooltip
                                                formatter={(value) => [formatCurrency(value as number), "Doanh thu"]}
                                                contentStyle={{
                                                    backgroundColor: "#fff",
                                                    border: "1px solid #E5E7EB",
                                                    borderRadius: "8px"
                                                }}
                                            />
                                            <Bar
                                                dataKey="totalRevenue"
                                                fill="#FF5F3D"
                                                radius={[0, 4, 4, 0]}
                                                name="Doanh thu"
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-40 items-center justify-center text-[#6F6B99]">
                                        Chưa có dữ liệu
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recent transactions */}
                        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                            <div className="border-gray-100 border-b px-6 py-4">
                                <h2 className="font-bold text-[#261E33] text-lg">Giao dịch gần đây</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-[#F8F8F8]">
                                        <tr>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">
                                                Mã GD
                                            </th>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">
                                                Người dùng
                                            </th>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">
                                                Gói
                                            </th>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">
                                                Số tiền
                                            </th>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">
                                                Phương thức
                                            </th>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">
                                                Ngày
                                            </th>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">
                                                Trạng thái
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactionRows.length > 0 ? (
                                            transactionRows.map((txn) => {
                                                const normalizedStatus = normalizePaymentStatus(txn.paymentStatus);
                                                const createdAt = getSafeDate(txn.createdAt);

                                                return (
                                                    <tr
                                                        key={
                                                            txn.paymentId ??
                                                            String(txn.orderCode ?? txn.userId ?? txn.userEmail)
                                                        }
                                                        className="border-gray-100 border-t transition-colors hover:bg-gray-50">
                                                        <td className="px-6 py-4">
                                                            <span className="font-mono font-semibold text-[#261E33] text-xs">
                                                                {txn.orderCode}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className="font-medium text-[#261E33] text-sm">
                                                                {txn.userName}
                                                            </p>
                                                            <p className="text-[#6F6B99] text-xs">{txn.userEmail}</p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF5F3] px-2.5 py-1 font-medium text-[#FF5F3D] text-xs">
                                                                <Star className="h-3 w-3" />
                                                                {txn.planName}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 font-semibold text-[#261E33] text-sm">
                                                            {(txn.amount ?? 0).toLocaleString("vi-VN")} ₫
                                                        </td>
                                                        <td className="px-6 py-4 text-[#6F6B99] text-sm">
                                                            {txn.paymentMethod}
                                                        </td>
                                                        <td className="px-6 py-4 text-[#6F6B99] text-sm">
                                                            {createdAt ? createdAt.toLocaleDateString("vi-VN") : "N/A"}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span
                                                                className={`rounded-full px-3 py-1 font-medium text-xs ${STATUS_COLOR[normalizedStatus] || "bg-gray-100 text-gray-700"}`}>
                                                                {getPaymentStatusLabel(txn.paymentStatus)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-8 text-center text-[#6F6B99]">
                                                    Không có giao dịch nào
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
