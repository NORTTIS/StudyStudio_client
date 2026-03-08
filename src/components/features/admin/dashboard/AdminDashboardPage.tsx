"use client";

import type { EChartsOption } from "echarts";
import { Activity, DollarSign, FileText, Newspaper, TrendingUp, UserPlus, Users } from "lucide-react";
import dynamic from "next/dynamic";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

export function AdminDashboardPage() {
    // Mock data
    const stats = {
        totalUsers: 1247,
        newUsersThisMonth: 89,
        activeUsers: 856,
        totalRevenue: 45678000,
        revenueGrowth: 12.5,
        totalReports: 23,
        pendingReports: 8,
        totalNews: 15,
        publishedNews: 12
    };

    const recentActivities = [
        { id: 1, type: "user", message: "Người dùng mới đăng ký: nguyenvana@example.com", time: "5 phút trước" },
        { id: 2, type: "report", message: "Báo cáo mới: Lạm dụng nội dung", time: "15 phút trước" },
        { id: 3, type: "subscription", message: "Nâng cấp Premium: tranthib@example.com", time: "1 giờ trước" },
        { id: 4, type: "news", message: "Tin tức mới được xuất bản: Cập nhật hệ thống", time: "2 giờ trước" },
        { id: 5, type: "user", message: "Người dùng mới đăng ký: levanc@example.com", time: "3 giờ trước" }
    ];

    const topGroups = [
        { id: 1, name: "Nhóm Toán cao cấp K22", members: 45, activity: 98 },
        { id: 2, name: "Lập trình Web", members: 38, activity: 95 },
        { id: 3, name: "Vật lý đại cương", members: 52, activity: 87 },
        { id: 4, name: "Hóa học hữu cơ", members: 29, activity: 82 },
        { id: 5, name: "Tiếng Anh chuyên ngành", members: 41, activity: 79 }
    ];

    // User Growth Chart Data
    const userGrowthOption: EChartsOption = {
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" }
        },
        grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
        xAxis: {
            type: "category",
            data: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"],
            axisLine: { lineStyle: { color: "#E5E7EB" } },
            axisLabel: { color: "#6F6B99" }
        },
        yAxis: {
            type: "value",
            axisLine: { lineStyle: { color: "#E5E7EB" } },
            axisLabel: { color: "#6F6B99" },
            splitLine: { lineStyle: { color: "#F3F4F6" } }
        },
        series: [
            {
                name: "Người dùng mới",
                type: "bar",
                data: [65, 78, 92, 88, 105, 120, 135, 142, 158, 165, 178, 189],
                itemStyle: {
                    color: "#FF5F3D",
                    borderRadius: [4, 4, 0, 0]
                }
            }
        ]
    };

    // Revenue Chart Data
    const revenueOption: EChartsOption = {
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "cross" }
        },
        grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
        xAxis: {
            type: "category",
            data: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"],
            axisLine: { lineStyle: { color: "#E5E7EB" } },
            axisLabel: { color: "#6F6B99" }
        },
        yAxis: {
            type: "value",
            axisLine: { lineStyle: { color: "#E5E7EB" } },
            axisLabel: {
                color: "#6F6B99",
                formatter: (value: number) => `${(value / 1000000).toFixed(1)}M`
            },
            splitLine: { lineStyle: { color: "#F3F4F6" } }
        },
        series: [
            {
                name: "Doanh thu",
                type: "line",
                data: [
                    2500000, 3200000, 2800000, 3500000, 4200000, 3800000, 4500000, 4800000, 5200000, 4900000, 5500000,
                    5800000
                ],
                smooth: true,
                itemStyle: { color: "#FF5F3D" },
                areaStyle: {
                    color: {
                        type: "linear",
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: "rgba(255, 95, 61, 0.3)" },
                            { offset: 1, color: "rgba(255, 95, 61, 0.05)" }
                        ]
                    }
                }
            }
        ]
    };

    // User Distribution Pie Chart
    const userDistributionOption: EChartsOption = {
        tooltip: {
            trigger: "item",
            formatter: "{a} <br/>{b}: {c} ({d}%)"
        },
        legend: {
            orient: "vertical",
            right: 10,
            top: "center",
            textStyle: { color: "#6F6B99" }
        },
        series: [
            {
                name: "Phân bố người dùng",
                type: "pie",
                radius: ["40%", "70%"],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: "#fff",
                    borderWidth: 2
                },
                label: {
                    show: false,
                    position: "center"
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 20,
                        fontWeight: "bold"
                    }
                },
                labelLine: { show: false },
                data: [
                    { value: 856, name: "Hoạt động", itemStyle: { color: "#10B981" } },
                    { value: 302, name: "Không hoạt động", itemStyle: { color: "#6B7280" } },
                    { value: 89, name: "Mới", itemStyle: { color: "#FF5F3D" } }
                ]
            }
        ]
    };

    // Subscription Distribution
    const subscriptionOption: EChartsOption = {
        tooltip: {
            trigger: "item",
            formatter: "{a} <br/>{b}: {c} ({d}%)"
        },
        legend: {
            orient: "vertical",
            right: 10,
            top: "center",
            textStyle: { color: "#6F6B99" }
        },
        series: [
            {
                name: "Gói đăng ký",
                type: "pie",
                radius: ["40%", "70%"],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: "#fff",
                    borderWidth: 2
                },
                label: {
                    show: false,
                    position: "center"
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 20,
                        fontWeight: "bold"
                    }
                },
                labelLine: { show: false },
                data: [
                    { value: 892, name: "Free", itemStyle: { color: "#94A3B8" } },
                    { value: 245, name: "Premium", itemStyle: { color: "#FF5F3D" } },
                    { value: 110, name: "Enterprise", itemStyle: { color: "#261E33" } }
                ]
            }
        ]
    };

    // Activity Heatmap
    const activityHeatmapOption: EChartsOption = {
        tooltip: {
            position: "top"
        },
        grid: {
            left: "10%",
            right: "5%",
            bottom: "10%",
            top: "5%",
            containLabel: true
        },
        xAxis: {
            type: "category",
            data: ["0h", "4h", "8h", "12h", "16h", "20h"],
            splitArea: { show: true },
            axisLabel: { color: "#6F6B99" }
        },
        yAxis: {
            type: "category",
            data: ["CN", "T7", "T6", "T5", "T4", "T3", "T2"],
            splitArea: { show: true },
            axisLabel: { color: "#6F6B99" }
        },
        visualMap: {
            min: 0,
            max: 100,
            calculable: true,
            orient: "horizontal",
            left: "center",
            bottom: "0%",
            inRange: {
                color: ["#F3F4F6", "#FECACA", "#FCA5A5", "#FF5F3D", "#DC2626"]
            },
            textStyle: { color: "#6F6B99" }
        },
        series: [
            {
                name: "Hoạt động",
                type: "heatmap",
                data: [
                    ["0h", "T2", 45],
                    ["4h", "T2", 12],
                    ["8h", "T2", 78],
                    ["12h", "T2", 92],
                    ["16h", "T2", 85],
                    ["20h", "T2", 56],
                    ["0h", "T3", 38],
                    ["4h", "T3", 15],
                    ["8h", "T3", 82],
                    ["12h", "T3", 95],
                    ["16h", "T3", 88],
                    ["20h", "T3", 62],
                    ["0h", "T4", 42],
                    ["4h", "T4", 18],
                    ["8h", "T4", 85],
                    ["12h", "T4", 98],
                    ["16h", "T4", 90],
                    ["20h", "T4", 65],
                    ["0h", "T5", 48],
                    ["4h", "T5", 20],
                    ["8h", "T5", 88],
                    ["12h", "T5", 100],
                    ["16h", "T5", 92],
                    ["20h", "T5", 68],
                    ["0h", "T6", 52],
                    ["4h", "T6", 22],
                    ["8h", "T6", 90],
                    ["12h", "T6", 96],
                    ["16h", "T6", 87],
                    ["20h", "T6", 70],
                    ["0h", "T7", 35],
                    ["4h", "T7", 10],
                    ["8h", "T7", 45],
                    ["12h", "T7", 58],
                    ["16h", "T7", 52],
                    ["20h", "T7", 48],
                    ["0h", "CN", 28],
                    ["4h", "CN", 8],
                    ["8h", "CN", 38],
                    ["12h", "CN", 48],
                    ["16h", "CN", 42],
                    ["20h", "CN", 35]
                ],
                label: { show: false },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowColor: "rgba(0, 0, 0, 0.5)"
                    }
                }
            }
        ]
    };

    // Report Status Chart
    const reportStatusOption: EChartsOption = {
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" }
        },
        legend: {
            data: ["Chờ xử lý", "Đang xử lý", "Đã giải quyết", "Từ chối"],
            textStyle: { color: "#6F6B99" }
        },
        grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
        xAxis: {
            type: "category",
            data: ["T1", "T2", "T3", "T4", "T5", "T6"],
            axisLine: { lineStyle: { color: "#E5E7EB" } },
            axisLabel: { color: "#6F6B99" }
        },
        yAxis: {
            type: "value",
            axisLine: { lineStyle: { color: "#E5E7EB" } },
            axisLabel: { color: "#6F6B99" },
            splitLine: { lineStyle: { color: "#F3F4F6" } }
        },
        series: [
            {
                name: "Chờ xử lý",
                type: "bar",
                stack: "total",
                data: [5, 8, 6, 7, 9, 8],
                itemStyle: { color: "#FCD34D" }
            },
            {
                name: "Đang xử lý",
                type: "bar",
                stack: "total",
                data: [3, 4, 5, 4, 6, 5],
                itemStyle: { color: "#60A5FA" }
            },
            {
                name: "Đã giải quyết",
                type: "bar",
                stack: "total",
                data: [12, 15, 18, 20, 22, 25],
                itemStyle: { color: "#10B981" }
            },
            {
                name: "Từ chối",
                type: "bar",
                stack: "total",
                data: [2, 1, 3, 2, 1, 2],
                itemStyle: { color: "#EF4444" }
            }
        ]
    };

    return (
        <div className="min-h-screen bg-[#F8F8F8]">
            <div className="flex min-h-screen">
                <DashboardSidebar />
                <main className="flex-1">
                    <Header userProfile={null} />

                    <div className="px-6 py-6">
                        {/* Page Header */}
                        <div className="mb-6">
                            <h1 className="mb-2 font-bold text-2xl text-[#261E33]">Bảng điều khiển</h1>
                            <p className="text-[#6F6B99] text-sm">Tổng quan hệ thống Study Studio</p>
                        </div>

                        {/* Stats Grid */}
                        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {/* Total Users */}
                            <div className="rounded-xl border border-gray-200 bg-white p-5">
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                                        <Users className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <span className="font-medium text-green-600 text-xs">
                                        +{stats.newUsersThisMonth} tháng này
                                    </span>
                                </div>
                                <p className="mb-1 text-[#6F6B99] text-sm">Tổng người dùng</p>
                                <p className="font-bold text-2xl text-[#261E33]">{stats.totalUsers.toLocaleString()}</p>
                            </div>

                            {/* Active Users */}
                            <div className="rounded-xl border border-gray-200 bg-white p-5">
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                                        <UserPlus className="h-5 w-5 text-green-600" />
                                    </div>
                                    <span className="font-medium text-green-600 text-xs">
                                        {((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <p className="mb-1 text-[#6F6B99] text-sm">Người dùng hoạt động</p>
                                <p className="font-bold text-2xl text-[#261E33]">
                                    {stats.activeUsers.toLocaleString()}
                                </p>
                            </div>

                            {/* Revenue */}
                            <div className="rounded-xl border border-gray-200 bg-white p-5">
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                                        <DollarSign className="h-5 w-5 text-[#FF5F3D]" />
                                    </div>
                                    <span className="font-medium text-green-600 text-xs">+{stats.revenueGrowth}%</span>
                                </div>
                                <p className="mb-1 text-[#6F6B99] text-sm">Doanh thu</p>
                                <p className="font-bold text-2xl text-[#261E33]">
                                    {(stats.totalRevenue / 1000000).toFixed(1)}M VNĐ
                                </p>
                            </div>

                            {/* Reports */}
                            <div className="rounded-xl border border-gray-200 bg-white p-5">
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                                        <FileText className="h-5 w-5 text-red-600" />
                                    </div>
                                    <span className="font-medium text-amber-600 text-xs">
                                        {stats.pendingReports} chờ xử lý
                                    </span>
                                </div>
                                <p className="mb-1 text-[#6F6B99] text-sm">Báo cáo</p>
                                <p className="font-bold text-2xl text-[#261E33]">{stats.totalReports}</p>
                            </div>
                        </div>

                        {/* Charts Row 1 - User Growth & Revenue */}
                        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {/* User Growth Chart */}
                            <div className="rounded-xl border border-gray-200 bg-white p-6">
                                <h3 className="mb-4 font-semibold text-[#261E33]">Tăng trưởng người dùng</h3>
                                <ReactECharts option={userGrowthOption} style={{ height: "280px" }} />
                            </div>

                            {/* Revenue Chart */}
                            <div className="rounded-xl border border-gray-200 bg-white p-6">
                                <h3 className="mb-4 font-semibold text-[#261E33]">Doanh thu theo tháng</h3>
                                <ReactECharts option={revenueOption} style={{ height: "280px" }} />
                            </div>
                        </div>

                        {/* Charts Row 2 - Distribution Pies */}
                        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {/* User Distribution */}
                            <div className="rounded-xl border border-gray-200 bg-white p-6">
                                <h3 className="mb-4 font-semibold text-[#261E33]">Phân bố người dùng</h3>
                                <ReactECharts option={userDistributionOption} style={{ height: "280px" }} />
                            </div>

                            {/* Subscription Distribution */}
                            <div className="rounded-xl border border-gray-200 bg-white p-6">
                                <h3 className="mb-4 font-semibold text-[#261E33]">Phân bố gói đăng ký</h3>
                                <ReactECharts option={subscriptionOption} style={{ height: "280px" }} />
                            </div>
                        </div>

                        {/* Charts Row 3 - Heatmap & Report Status */}
                        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {/* Activity Heatmap */}
                            <div className="rounded-xl border border-gray-200 bg-white p-6">
                                <h3 className="mb-4 font-semibold text-[#261E33]">Hoạt động theo giờ</h3>
                                <ReactECharts option={activityHeatmapOption} style={{ height: "280px" }} />
                            </div>

                            {/* Report Status */}
                            <div className="rounded-xl border border-gray-200 bg-white p-6">
                                <h3 className="mb-4 font-semibold text-[#261E33]">Trạng thái báo cáo</h3>
                                <ReactECharts option={reportStatusOption} style={{ height: "280px" }} />
                            </div>
                        </div>

                        {/* Bottom Row */}
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {/* Recent Activities */}
                            <div className="rounded-xl border border-gray-200 bg-white p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="font-semibold text-[#261E33]">Hoạt động gần đây</h3>
                                    <Activity className="h-5 w-5 text-[#6F6B99]" />
                                </div>
                                <div className="space-y-3">
                                    {recentActivities.map((activity) => (
                                        <div
                                            key={activity.id}
                                            className="flex items-start gap-3 rounded-lg border border-gray-100 bg-[#F8F8F8] p-3">
                                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FF5F3D]/10">
                                                {activity.type === "user" && (
                                                    <Users className="h-4 w-4 text-[#FF5F3D]" />
                                                )}
                                                {activity.type === "report" && (
                                                    <FileText className="h-4 w-4 text-[#FF5F3D]" />
                                                )}
                                                {activity.type === "subscription" && (
                                                    <DollarSign className="h-4 w-4 text-[#FF5F3D]" />
                                                )}
                                                {activity.type === "news" && (
                                                    <Newspaper className="h-4 w-4 text-[#FF5F3D]" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[#261E33] text-sm">{activity.message}</p>
                                                <p className="mt-0.5 text-[#6F6B99] text-xs">{activity.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Top Groups */}
                            <div className="rounded-xl border border-gray-200 bg-white p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="font-semibold text-[#261E33]">Nhóm hoạt động tích cực</h3>
                                    <TrendingUp className="h-5 w-5 text-[#6F6B99]" />
                                </div>
                                <div className="space-y-3">
                                    {topGroups.map((group, index) => (
                                        <div
                                            key={group.id}
                                            className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FF5F3D]/10 font-semibold text-[#FF5F3D] text-sm">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-[#261E33] text-sm">{group.name}</p>
                                                <p className="text-[#6F6B99] text-xs">{group.members} thành viên</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-green-600 text-sm">
                                                    {group.activity}%
                                                </p>
                                                <p className="text-[#6F6B99] text-xs">hoạt động</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
