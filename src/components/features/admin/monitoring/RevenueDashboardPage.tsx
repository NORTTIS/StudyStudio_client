"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import {
    ArrowDown,
    ArrowUp,
    CreditCard,
    DollarSign,
    Download,
    Star,
    TrendingUp,
    Users,
} from "lucide-react";

type TimeRange = "week" | "month" | "year";

const MONTHLY_DATA = [
    { month: "Th7", revenue: 45_000_000, subscriptions: 150, newUsers: 320 },
    { month: "Th8", revenue: 52_000_000, subscriptions: 174, newUsers: 410 },
    { month: "Th9", revenue: 58_000_000, subscriptions: 195, newUsers: 390 },
    { month: "Th10", revenue: 61_000_000, subscriptions: 204, newUsers: 450 },
    { month: "Th11", revenue: 67_000_000, subscriptions: 224, newUsers: 500 },
    { month: "Th12", revenue: 72_000_000, subscriptions: 241, newUsers: 560 },
    { month: "Th1", revenue: 68_000_000, subscriptions: 228, newUsers: 420 },
    { month: "Th2", revenue: 74_000_000, subscriptions: 247, newUsers: 510 },
    { month: "Th3", revenue: 80_250_000, subscriptions: 268, newUsers: 590 },
];

const PAYMENT_METHODS = [
    { name: "Thẻ tín dụng / thẻ ghi nợ", count: 1524, percent: 65, color: "bg-[#FF5F3D]" },
    { name: "VNPay", count: 563, percent: 24, color: "bg-blue-500" },
    { name: "Momo", count: 188, percent: 8, color: "bg-pink-400" },
    { name: "Chuyển khoản ngân hàng", count: 66, percent: 3, color: "bg-purple-400" },
];

const RECENT_TRANSACTIONS = [
    { id: "TXN-8821", user: "Nguyễn Văn A", email: "a@example.com", plan: "Premium", amount: 299_000, method: "Thẻ tín dụng", date: "05/03/2024", status: "Thành công" },
    { id: "TXN-8820", user: "Trần Thị B", email: "b@example.com", plan: "Premium", amount: 299_000, method: "VNPay", date: "05/03/2024", status: "Thành công" },
    { id: "TXN-8819", user: "Lê Văn C", email: "c@example.com", plan: "Premium", amount: 299_000, method: "Momo", date: "04/03/2024", status: "Thất bại" },
    { id: "TXN-8818", user: "Phạm Thị D", email: "d@example.com", plan: "Premium", amount: 299_000, method: "VNPay", date: "04/03/2024", status: "Đang xử lý" },
    { id: "TXN-8817", user: "Hoàng Văn E", email: "e@example.com", plan: "Premium", amount: 299_000, method: "Thẻ tín dụng", date: "03/03/2024", status: "Thành công" },
];

const STATUS_COLOR: Record<string, string> = {
    "Thành công": "bg-green-100 text-green-700",
    "Thất bại": "bg-red-100 text-red-700",
    "Đang xử lý": "bg-amber-100 text-amber-700",
};

export function RevenueDashboardPage() {
    const [timeRange, setTimeRange] = useState<TimeRange>("month");

    const totalRevenue = MONTHLY_DATA.reduce((s, d) => s + d.revenue, 0);
    const latestRevenue = MONTHLY_DATA[MONTHLY_DATA.length - 1].revenue;
    const prevRevenue = MONTHLY_DATA[MONTHLY_DATA.length - 2].revenue;
    const growth = (((latestRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1);
    const isPositive = latestRevenue >= prevRevenue;

    const maxRevenue = Math.max(...MONTHLY_DATA.map((d) => d.revenue));

    const STATS = [
        {
            label: "Tổng doanh thu",
            value: `${(totalRevenue / 1_000_000).toFixed(0)}M VND`,
            sub: `+${growth}% so với tháng trước`,
            positive: true,
            icon: <DollarSign className="h-5 w-5 text-[#FF5F3D]" />,
            bg: "border-[#FF5F3D]/20 bg-gradient-to-br from-[#FFF5F3] to-white",
        },
        {
            label: "Doanh thu tháng này",
            value: `${(latestRevenue / 1_000_000).toFixed(2)}M VND`,
            sub: isPositive ? `Tăng ${growth}%` : `Giảm ${Math.abs(Number(growth))}%`,
            positive: isPositive,
            icon: <TrendingUp className="h-5 w-5 text-blue-500" />,
            bg: "border-blue-100 bg-blue-50",
        },
        {
            label: "Người dùng Premium",
            value: "2,341",
            sub: "+268 trong tháng này",
            positive: true,
            icon: <Star className="h-5 w-5 text-amber-500" />,
            bg: "border-amber-100 bg-amber-50",
        },
        {
            label: "ARPU (VND)",
            value: "299,000",
            sub: "Doanh thu TB / người",
            positive: true,
            icon: <CreditCard className="h-5 w-5 text-purple-500" />,
            bg: "border-purple-100 bg-purple-50",
        },
    ];

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
                                <h1 className="mb-1 font-bold text-2xl text-[#261E33]">
                                    Bảng điều khiển doanh thu
                                </h1>
                                <p className="text-[#6F6B99] text-sm">
                                    Thống kê doanh thu từ các gói đăng ký và thanh toán
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Time range tabs */}
                                <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
                                    {(["week", "month", "year"] as TimeRange[]).map((r) => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => setTimeRange(r)}
                                            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${timeRange === r
                                                ? "bg-[#FF5F3D] text-white"
                                                : "text-[#6F6B99] hover:text-[#261E33]"
                                                }`}
                                        >
                                            {r === "week" ? "Tuần" : r === "month" ? "Tháng" : "Năm"}
                                        </button>
                                    ))}
                                </div>

                                <Button className="bg-[#FF5F3D] hover:bg-[#ff4620]">
                                    <Download className="mr-2 h-4 w-4" />
                                    Xuất báo cáo
                                </Button>
                            </div>
                        </div>

                        {/* Stats cards */}
                        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                            {STATS.map((stat) => (
                                <div key={stat.label} className={`rounded-xl border p-5 ${stat.bg}`}>
                                    <div className="mb-3 flex items-center justify-between">
                                        <p className="text-[#6F6B99] text-sm">{stat.label}</p>
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/60 bg-white/80">
                                            {stat.icon}
                                        </div>
                                    </div>
                                    <p className="font-bold text-xl text-[#261E33]">{stat.value}</p>
                                    <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${stat.positive ? "text-green-600" : "text-red-600"}`}>
                                        {stat.positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                        {stat.sub}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Revenue chart + Payment methods */}
                        <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
                            {/* Bar chart */}
                            <div className="col-span-2 rounded-2xl border border-gray-200 bg-white p-6">
                                <div className="mb-5 flex items-center justify-between">
                                    <h2 className="font-bold text-lg text-[#261E33]">Xu hướng doanh thu</h2>
                                    <span className="text-[#6F6B99] text-sm">9 tháng gần nhất</span>
                                </div>

                                {/* Chart bars */}
                                <div className="flex h-48 items-end gap-3">
                                    {MONTHLY_DATA.map((d, i) => {
                                        const h = (d.revenue / maxRevenue) * 100;
                                        const isLast = i === MONTHLY_DATA.length - 1;
                                        return (
                                            <div key={d.month} className="group flex flex-1 flex-col items-center gap-2">
                                                <div className="relative w-full">
                                                    <div
                                                        className={`w-full rounded-t-lg transition-all ${isLast
                                                            ? "bg-gradient-to-t from-[#FF5F3D] to-[#ff8c6b]"
                                                            : "bg-gradient-to-t from-gray-200 to-gray-100 group-hover:from-[#FF5F3D]/40 group-hover:to-[#FF5F3D]/20"
                                                            }`}
                                                        style={{ height: `${h * 1.8}px` }}
                                                    />
                                                    {/* Tooltip */}
                                                    <div className="pointer-events-none absolute -top-10 left-1/2 hidden -translate-x-1/2 rounded-lg bg-[#261E33] px-2 py-1 text-xs text-white group-hover:block whitespace-nowrap">
                                                        {(d.revenue / 1_000_000).toFixed(1)}M
                                                    </div>
                                                </div>
                                                <p className="text-center text-[10px] text-[#6F6B99]">{d.month}</p>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Subscriptions row */}
                                <div className="mt-4 space-y-2">
                                    {MONTHLY_DATA.slice(-4).map((d) => (
                                        <div key={d.month} className="flex items-center gap-3">
                                            <span className="w-10 text-[#6F6B99] text-xs">{d.month}</span>
                                            <div className="flex-1 overflow-hidden rounded-full bg-gray-100 h-1.5">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-[#FF5F3D] to-[#ff8c6b]"
                                                    style={{ width: `${(d.revenue / maxRevenue) * 100}%` }}
                                                />
                                            </div>
                                            <span className="w-28 text-right text-sm font-semibold text-[#261E33]">
                                                {d.revenue.toLocaleString()} ₫
                                            </span>
                                            <span className="w-20 text-right text-xs text-[#6F6B99]">
                                                {d.subscriptions} thuê bao
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Payment breakdown */}
                            <div className="rounded-2xl border border-gray-200 bg-white p-6">
                                <h2 className="mb-5 font-bold text-lg text-[#261E33]">
                                    Phương thức thanh toán
                                </h2>
                                <div className="space-y-4">
                                    {PAYMENT_METHODS.map((pm) => (
                                        <div key={pm.name}>
                                            <div className="mb-1.5 flex items-center justify-between">
                                                <p className="text-sm text-[#261E33]">{pm.name}</p>
                                                <p className="text-sm font-semibold text-[#261E33]">{pm.percent}%</p>
                                            </div>
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                                <div
                                                    className={`h-full rounded-full ${pm.color}`}
                                                    style={{ width: `${pm.percent}%` }}
                                                />
                                            </div>
                                            <p className="mt-1 text-xs text-[#6F6B99]">{pm.count.toLocaleString()} giao dịch</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Summary */}
                                <div className="mt-5 rounded-xl border border-[#FF5F3D]/20 bg-[#FFF5F3] p-4">
                                    <p className="mb-1 text-xs text-[#6F6B99]">Tổng giao dịch thành công</p>
                                    <p className="font-bold text-xl text-[#FF5F3D]">2,341</p>
                                    <p className="mt-0.5 text-xs text-[#6F6B99]">trong {timeRange === "week" ? "tuần" : timeRange === "month" ? "tháng" : "năm"} này</p>
                                </div>
                            </div>
                        </div>

                        {/* Recent transactions */}
                        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                            <div className="border-b border-gray-100 px-6 py-4">
                                <h2 className="font-bold text-lg text-[#261E33]">Giao dịch gần đây</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-[#F8F8F8]">
                                        <tr>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">Mã GD</th>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">Người dùng</th>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">Gói</th>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">Số tiền</th>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">Phương thức</th>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">Ngày</th>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {RECENT_TRANSACTIONS.map((txn) => (
                                            <tr key={txn.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className="font-mono text-xs font-semibold text-[#261E33]">{txn.id}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="font-medium text-[#261E33] text-sm">{txn.user}</p>
                                                    <p className="text-[#6F6B99] text-xs">{txn.email}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF5F3] px-2.5 py-1 text-xs font-medium text-[#FF5F3D]">
                                                        <Star className="h-3 w-3" />
                                                        {txn.plan}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-semibold text-[#261E33] text-sm">
                                                    {txn.amount.toLocaleString()} ₫
                                                </td>
                                                <td className="px-6 py-4 text-[#6F6B99] text-sm">{txn.method}</td>
                                                <td className="px-6 py-4 text-[#6F6B99] text-sm">{txn.date}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLOR[txn.status]}`}>
                                                        {txn.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
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
