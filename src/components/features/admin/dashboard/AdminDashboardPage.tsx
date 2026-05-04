"use client";

import type { EChartsOption } from "echarts";
import { Activity, DollarSign, FileText, Star, TrendingUp, UserPlus, Users } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import {
    exportRevenueData,
    getRevenueByPeriod,
    getRevenueOverview,
    getRevenueTransactions,
    getRevenueTrends
} from "@/api/admin-revenue";
import {
    getHourlyActivity,
    getRecentActivity,
    getReportStatus,
    getSubscriptionDistribution,
    getTopActiveGroups,
    getUserDistribution
} from "@/api/admin-statistics";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

export function AdminDashboardPage() {
    const locale = "vi";
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        totalSubscriptions: 0,
        totalRevenue: 0,
        revenueGrowth: 0,
        totalReports: 0
    });
    const [_isLoading, setIsLoading] = useState(true);
    const [recentActivities, setRecentActivities] = useState<any[]>([]);
    const [topGroups, setTopGroups] = useState<any[]>([]);
    const [_revenueData, setRevenueData] = useState<any>(null);
    const [userDistData, setUserDistData] = useState<any[]>([]);
    const [subscriptionDistData, setSubscriptionDistData] = useState<any[]>([]);
    const [hourlyActivityData, setHourlyActivityData] = useState<any[]>([]);
    const [reportStatusData, setReportStatusData] = useState<any[]>([]);

    // Filters for each chart
    const [reportPeriod, setReportPeriod] = useState<string>("month");
    const [activityPeriod, setActivityPeriod] = useState<string>("week");
    const [userPeriod, setUserPeriod] = useState<string>("month");
    const [subPeriod, setSubPeriod] = useState<string>("month");

    const [revenueByPeriodData, setRevenueByPeriodData] = useState<any[]>([]);
    const [revenueOverviewData, setRevenueOverviewData] = useState<any>(null);
    const [transactionsData, setTransactionsData] = useState<any[]>([]);

    // Chart-specific filters
    const [revPeriodFilter, setRevPeriodFilter] = useState<string>("month");

    // Chart-specific custom date ranges
    const [useUserCustomDateRange, setUseUserCustomDateRange] = useState(false);
    const [userCustomStartDate, setUserCustomStartDate] = useState<string>(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split("T")[0];
    });
    const [userCustomEndDate, setUserCustomEndDate] = useState<string>(() => new Date().toISOString().split("T")[0]);

    const [useSubCustomDateRange, setUseSubCustomDateRange] = useState(false);
    const [subCustomStartDate, setSubCustomStartDate] = useState<string>(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split("T")[0];
    });
    const [subCustomEndDate, setSubCustomEndDate] = useState<string>(() => new Date().toISOString().split("T")[0]);

    const [useReportCustomDateRange, setUseReportCustomDateRange] = useState(false);
    const [reportCustomStartDate, setReportCustomStartDate] = useState<string>(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split("T")[0];
    });
    const [reportCustomEndDate, setReportCustomEndDate] = useState<string>(() => new Date().toISOString().split("T")[0]);

    const [useRevenueCustomDateRange, setUseRevenueCustomDateRange] = useState(false);
    const [revenueCustomStartDate, setRevenueCustomStartDate] = useState<string>(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split("T")[0];
    });
    const [revenueCustomEndDate, setRevenueCustomEndDate] = useState<string>(() => new Date().toISOString().split("T")[0]);

    // Export Modal States
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportReportType, setExportReportType] = useState<string>("overview");
    const [exportPeriod, setExportPeriod] = useState<string>("month");
    const [exportStartDate, setExportStartDate] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split("T")[0];
    });
    const [exportEndDate, setExportEndDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
    const [exportIncludeCharts, setExportIncludeCharts] = useState<boolean>(false);

    const loadDashboardData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Determine date range for Revenue distribution By Period
            const end = useRevenueCustomDateRange ? new Date(revenueCustomEndDate) : new Date();
            const start = useRevenueCustomDateRange ? new Date(revenueCustomStartDate) : new Date();
            if (useRevenueCustomDateRange) {
                end.setHours(23, 59, 59, 999);
                start.setHours(0, 0, 0, 0);
            }
            if (!useRevenueCustomDateRange) {
                if (revPeriodFilter === "week") start.setDate(start.getDate() - 7);
                else if (revPeriodFilter === "month") {
                    // Show all days in current month when month filter is selected
                    start.setDate(1);
                    end.setMonth(end.getMonth() + 1, 0);
                    end.setHours(23, 59, 59, 999);
                }
                else if (revPeriodFilter === "year") start.setFullYear(start.getFullYear() - 1);
                else if (revPeriodFilter === "day") start.setDate(start.getDate() - 1);
            }

            const periodMapping: any = { day: "daily", week: "weekly", month: "daily", year: "monthly" };
            const apiPeriod = periodMapping[revPeriodFilter] || "monthly";

            const [
                revenueResult,
                recentResult,
                groupsResult,
                kpiUserResult,
                kpiSubResult,
                kpiReportResult,
                userDistResult,
                subDistResult,
                hourlyResult,
                reportResult,
                overviewResult,
                transactionsResult,
                periodResult
            ] = await Promise.allSettled([
                getRevenueTrends("custom", locale, start.toISOString(), end.toISOString()).catch(() => ({
                    status: "error",
                    data: null
                })),
                getRecentActivity(5, locale).catch(() => ({ status: "error", data: null })),
                getTopActiveGroups(5, locale).catch(() => ({ status: "error", data: null })),
                getUserDistribution(undefined, locale).catch(() => ({ status: "error", data: null })),
                getSubscriptionDistribution(undefined, locale).catch(() => ({ status: "error", data: null })),
                getReportStatus(undefined, locale).catch(() => ({ status: "error", data: null })),
                useUserCustomDateRange
                    ? getUserDistribution(undefined, locale, userCustomStartDate, userCustomEndDate).catch(() => ({ status: "error", data: null }))
                    : getUserDistribution(userPeriod, locale).catch(() => ({ status: "error", data: null })),
                useSubCustomDateRange
                    ? getSubscriptionDistribution(undefined, locale, subCustomStartDate, subCustomEndDate).catch(() => ({ status: "error", data: null }))
                    : getSubscriptionDistribution(subPeriod, locale).catch(() => ({ status: "error", data: null })),
                getHourlyActivity(activityPeriod, locale).catch(() => ({ status: "error", data: null })),
                useReportCustomDateRange
                    ? getReportStatus(undefined, locale, reportCustomStartDate, reportCustomEndDate).catch(() => ({ status: "error", data: null }))
                    : getReportStatus(reportPeriod, locale).catch(() => ({ status: "error", data: null })),
                getRevenueOverview(locale).catch(() => ({ status: "error", data: null })),
                getRevenueTransactions(1, 5, locale).catch(() => ({ status: "error", data: null })),
                getRevenueByPeriod(apiPeriod, start.toISOString(), end.toISOString(), locale).catch(() => ({
                    status: "error",
                    data: null
                }))
            ]);

            const newStats: any = {};

            if (kpiUserResult.status === "fulfilled" && kpiUserResult.value?.data) {
                const data = kpiUserResult.value.data;
                newStats.totalUsers = data.totalUsers || 0;
                const active = data.distribution?.find((d: any) => d.status === "Active");
                if (active) newStats.activeUsers = active.count;
            }

            if (kpiSubResult.status === "fulfilled" && kpiSubResult.value?.data) {
                newStats.totalSubscriptions = kpiSubResult.value.data.totalSubscriptions || 0;
            }

            if (kpiReportResult.status === "fulfilled" && kpiReportResult.value?.data) {
                newStats.totalReports = kpiReportResult.value.data.totalReports || 0;
            }

            if (userDistResult.status === "fulfilled" && userDistResult.value?.data) {
                const data = userDistResult.value.data;
                setUserDistData(data.distribution || []);
            }

            if (revenueResult.status === "fulfilled" && revenueResult.value?.data) {
                const data = revenueResult.value.data;
                newStats.totalRevenue = data.currentPeriod?.totalRevenue || 0;
                newStats.revenueGrowth = data.growthRate || 0;
                setRevenueData(data);
            }

            if (reportResult.status === "fulfilled" && reportResult.value?.data) {
                const data = reportResult.value.data;
                setReportStatusData(data.data || []);
            }

            if (subDistResult.status === "fulfilled" && subDistResult.value?.data) {
                const data = subDistResult.value.data;
                setSubscriptionDistData(data.distribution || []);
            }

            setStats((prev) => ({ ...prev, ...newStats }));

            if (recentResult.status === "fulfilled" && recentResult.value?.data) {
                const acts = recentResult.value.data.activities || [];
                setRecentActivities(
                    acts.map((activity: any) => ({
                        id: activity.id,
                        type: activity.type,
                        message: activity.title,
                        time: new Date(activity.timestamp).toLocaleString("vi-VN")
                    }))
                );
            }

            if (groupsResult.status === "fulfilled" && groupsResult.value?.data) {
                const grps = groupsResult.value.data.groups || [];
                setTopGroups(
                    grps.map((group: any) => ({
                        id: group.groupId,
                        name: group.groupName,
                        members: group.memberCount,
                        activity: group.completionRate || 0
                    }))
                );
            }

            if (hourlyResult.status === "fulfilled" && hourlyResult.value?.data) {
                setHourlyActivityData(hourlyResult.value.data.data || []);
            }

            // Removed MRR data handling since it's deleted

            if (overviewResult.status === "fulfilled" && overviewResult.value?.data) {
                setRevenueOverviewData(overviewResult.value.data);
            }

            if (transactionsResult.status === "fulfilled" && transactionsResult.value?.data) {
                setTransactionsData((transactionsResult.value.data as any).transactions || []);
            }

            if (periodResult.status === "fulfilled" && periodResult.value?.data) {
                const resData = periodResult.value.data;
                // Swagger says data has `breakdown[]` within, or `data` IS the array. Let's handle both.
                let items = [];
                if (Array.isArray(resData)) items = resData;
                else if (resData && (resData as any).breakdown) items = (resData as any).breakdown;
                else if (resData && Array.isArray((resData as any).data)) items = (resData as any).data;
                setRevenueByPeriodData(items);
            }
        } catch (error) {
            console.error("Failed to load dashboard data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [
        reportPeriod,
        activityPeriod,
        userPeriod,
        subPeriod,
        revPeriodFilter,
        useUserCustomDateRange,
        userCustomStartDate,
        userCustomEndDate,
        useSubCustomDateRange,
        subCustomStartDate,
        subCustomEndDate,
        useReportCustomDateRange,
        reportCustomStartDate,
        reportCustomEndDate,
        useRevenueCustomDateRange,
        revenueCustomStartDate,
        revenueCustomEndDate
    ]);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    const handleExport = async () => {
        try {
            const startStr = new Date(exportStartDate).toISOString();
            const endObj = new Date(exportEndDate);
            endObj.setHours(23, 59, 59, 999);
            const endStr = endObj.toISOString();

            const result: Blob = (await exportRevenueData(
                exportReportType,
                startStr,
                endStr,
                exportPeriod,
                exportIncludeCharts,
                locale
            )) as any;
            if (result) {
                const url = window.URL.createObjectURL(result);
                const link = document.createElement("a");
                link.href = url;
                link.setAttribute("download", "revenue-export.csv");
                document.body.appendChild(link);
                link.click();
                link.parentNode?.removeChild(link);
                window.URL.revokeObjectURL(url);
                setIsExportModalOpen(false);
            }
        } catch (error) {
            console.error("Export failed:", error);
        }
    };

    // User Distribution Pie Chart
    const userDistributionOption: EChartsOption = {
        tooltip: { trigger: "item", formatter: "{a} <br/>{b}: {c} ({d}%)" },
        legend: { orient: "vertical", right: 10, top: "center", textStyle: { color: "#6F6B99" } },
        series: [
            {
                name: "Phân bố người dùng",
                type: "pie",
                radius: ["40%", "70%"],
                avoidLabelOverlap: false,
                itemStyle: { borderRadius: 10, borderColor: "#fff", borderWidth: 2 },
                label: { show: false, position: "center" },
                emphasis: { label: { show: true, fontSize: 20, fontWeight: "bold" } },
                labelLine: { show: false },
                data: userDistData.map((d) => ({
                    value: d.count,
                    name: d.status,
                    itemStyle: { color: d.status === "Active" ? "#10B981" : "#6B7280" }
                }))
            }
        ]
    };

    // Subscription Distribution
    const subscriptionOption: EChartsOption = {
        tooltip: { trigger: "item", formatter: "{a} <br/>{b}: {c} ({d}%)" },
        legend: { orient: "vertical", right: 10, top: "center", textStyle: { color: "#6F6B99" } },
        series: [
            {
                name: "Gói đăng ký",
                type: "pie",
                radius: ["40%", "70%"],
                avoidLabelOverlap: false,
                itemStyle: { borderRadius: 10, borderColor: "#fff", borderWidth: 2 },
                label: { show: false, position: "center" },
                emphasis: { label: { show: true, fontSize: 20, fontWeight: "bold" } },
                labelLine: { show: false },
                data: subscriptionDistData.map((d) => ({
                    value: d.count,
                    name: d.planType,
                    itemStyle: {
                        color: d.planType === "Free" ? "#94A3B8" : d.planType === "Premium" ? "#FF5F3D" : "#261E33"
                    }
                }))
            }
        ]
    };

    // Report Status Chart
    const reportStatusOption: EChartsOption = {
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        legend: {
            data: ["Chờ xử lý", "Đang xử lý", "Đã giải quyết", "Từ chối"],
            textStyle: { color: "#6F6B99" },
            bottom: 0
        },
        grid: { left: "3%", right: "4%", bottom: "15%", containLabel: true },
        xAxis: {
            type: "category",
            data: reportStatusData.map((d) => d.period),
            axisLine: { lineStyle: { color: "#E5E7EB" } },
            axisLabel: { color: "#6F6B99" }
        },
        yAxis: { type: "value", splitLine: { lineStyle: { color: "#F3F4F6" } }, minInterval: 1 },
        series: [
            {
                name: "Chờ xử lý",
                type: "bar",
                stack: "total",
                barWidth: 15,
                data: reportStatusData.map((d) => d.pending),
                itemStyle: { color: "#FCD34D" }
            },
            {
                name: "Đang xử lý",
                type: "bar",
                stack: "total",
                data: reportStatusData.map((d) => d.processing),
                itemStyle: { color: "#60A5FA" }
            },
            {
                name: "Đã giải quyết",
                type: "bar",
                stack: "total",
                data: reportStatusData.map((d) => d.resolved),
                itemStyle: { color: "#10B981" }
            },
            {
                name: "Từ chối",
                type: "bar",
                stack: "total",
                data: reportStatusData.map((d) => d.rejected),
                itemStyle: { color: "#EF4444" }
            }
        ]
    };

    // Activity Heatmap
    const activityHeatmapOption: EChartsOption = {
        tooltip: { position: "top" },
        grid: { left: "10%", right: "5%", bottom: "25%", top: "5%", containLabel: true },
        xAxis: { type: "category", data: Array.from({ length: 24 }, (_, i) => `${i}h`), splitArea: { show: true } },
        yAxis: { type: "category", data: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"], splitArea: { show: true } },
        visualMap: {
            min: 0,
            max: 10,
            calculable: true,
            orient: "horizontal",
            left: "center",
            bottom: "0%",
            inRange: { color: ["#F3F4F6", "#FECACA", "#FCA5A5", "#FF5F3D", "#DC2626"] }
        },
        series: [
            {
                name: "Hoạt động",
                type: "heatmap",
                data: hourlyActivityData.map((d) => [d.hour, d.dayOfWeek, d.userCount]),
                label: { show: false },
                emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(0, 0, 0, 0.5)" } }
            }
        ]
    };

    // Revenue By Period Chart (Basic Line Chart)
    const revenueByPeriodOption: EChartsOption = {
        tooltip: {
            trigger: "axis",
            formatter: (params: any) => {
                const data = params[0].data;
                const name = params[0].name;
                return `${name}<br/>Doanh thu: ${(data).toLocaleString("vi-VN")} VNĐ`;
            }
        },
        grid: { left: "3%", right: "4%", bottom: "5%", top: "10%", containLabel: true },
        xAxis: {
            type: "category",
            boundaryGap: false,
            data: revenueByPeriodData.map((d) => {
                const dateObj = new Date(d.date);
                return Number.isNaN(dateObj.getTime()) ? d.date : dateObj.toLocaleDateString("vi-VN");
            }),
            axisLine: { lineStyle: { color: "#E5E7EB" } },
            axisLabel: { color: "#6F6B99" }
        },
        yAxis: {
            type: "value",
            splitLine: { lineStyle: { color: "#F3F4F6" } },
            axisLabel: { formatter: (val) => `${(val / 1000).toFixed(0)}K` }
        },
        series: [
            {
                name: "Doanh thu",
                type: "line",
                data: revenueByPeriodData.map((d) => d.revenue),
                itemStyle: { color: "#FF5F3D" },
                areaStyle: {
                    color: {
                        type: "linear",
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: "rgba(255,95,61,0.5)" },
                            { offset: 1, color: "rgba(255,95,61,0.05)" }
                        ]
                    }
                },
                smooth: true
            }
        ]
    };

    return (
        <div className="min-h-screen bg-[#F8F8F8] font-[family-name:var(--font-app-inter)]">
            <div className="flex min-h-screen">
                <DashboardSidebar />
                <main className="flex-1">
                    <Header userProfile={null} />

                    <div className="px-6 py-6">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h1 className="mb-2 font-bold text-2xl text-[#261E33]">Bảng điều khiển</h1>
                                <p className="text-[#6F6B99] text-sm">Tổng quan hệ thống Study Studio</p>
                            </div>
                        </div>

                        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
                            <div className="rounded-xl border border-gray-200 bg-white p-5">
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                                        <Users className="h-5 w-5 text-blue-600" />
                                    </div>
                                </div>
                                <p className="mb-1 text-[#6F6B99] text-sm">Tổng người dùng</p>
                                <p className="font-bold text-2xl text-[#261E33]">{stats.totalUsers}</p>
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-white p-5">
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                                        <UserPlus className="h-5 w-5 text-green-600" />
                                    </div>
                                    <span className="font-medium text-green-600 text-xs">
                                        {((stats.activeUsers / (stats.totalUsers || 1)) * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <p className="mb-1 text-[#6F6B99] text-sm">Người dùng hoạt động</p>
                                <p className="font-bold text-2xl text-[#261E33]">{stats.activeUsers}</p>
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-white p-5">
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                                        <DollarSign className="h-5 w-5 text-[#FF5F3D]" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`font-medium text-xs ${stats.revenueGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
                                            {stats.revenueGrowth >= 0 ? "+" : ""}
                                            {stats.revenueGrowth}%
                                        </span>
                                        <Select
                                            value={revPeriodFilter}
                                            onValueChange={(val: any) => setRevPeriodFilter(val)}>
                                            <SelectTrigger className="h-7 w-[75px] border-none bg-orange-50 px-2 py-0 text-[#FF5F3D] text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white">
                                                <SelectItem className="text-xs" value="day">
                                                    Ngày
                                                </SelectItem>
                                                <SelectItem className="text-xs" value="week">
                                                    Tuần
                                                </SelectItem>
                                                <SelectItem className="text-xs" value="month">
                                                    Tháng
                                                </SelectItem>
                                                <SelectItem className="text-xs" value="year">
                                                    Năm
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <p className="mb-1 text-[#6F6B99] text-sm">Doanh thu VNĐ</p>
                                <p className="font-bold text-2xl text-[#261E33]">
                                    {(stats.totalRevenue / 1000000).toFixed(1)}M
                                </p>
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-white p-5">
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                                        <FileText className="h-5 w-5 text-red-600" />
                                    </div>
                                </div>
                                <p className="mb-1 text-[#6F6B99] text-sm">Tổng báo cáo</p>
                                <p className="font-bold text-2xl text-[#261E33]">{stats.totalReports}</p>
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-white p-5">
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                                        <TrendingUp className="h-5 w-5 text-green-600" />
                                    </div>
                                    <span className="font-medium text-green-600 text-xs">ARPU</span>
                                </div>
                                <p className="mb-1 text-[#6F6B99] text-sm">Doanh thu/Người dùng</p>
                                <p className="font-bold text-2xl text-[#261E33]">
                                    {((revenueOverviewData?.arpu || 0) / 1000).toFixed(0)}K
                                </p>
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-white p-5">
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                                        <Star className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <span className="font-medium text-green-600 text-xs">
                                        {(revenueOverviewData?.successRate || 0).toFixed(1)}%
                                    </span>
                                </div>
                                <p className="mb-1 text-[#6F6B99] text-sm">Tỷ lệ thành công</p>
                                <p className="font-bold text-2xl text-[#261E33]">
                                    {revenueOverviewData?.successfulTransactions || 0}
                                </p>
                            </div>
                        </div>

                        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <div className="rounded-xl border border-gray-200 bg-white p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="font-semibold text-[#261E33]">Phân bố người dùng</h3>
                                    <div className="flex items-center gap-3">
                                        <label className="flex items-center gap-1 text-xs">
                                            <input
                                                type="checkbox"
                                                checked={useUserCustomDateRange}
                                                onChange={(e) => setUseUserCustomDateRange(e.target.checked)}
                                            />
                                            Tùy chỉnh
                                        </label>
                                        <Select value={userPeriod} onValueChange={setUserPeriod}>
                                            <SelectTrigger className="h-8 w-[120px] text-xs" disabled={useUserCustomDateRange}>
                                                <SelectValue placeholder="Chọn thời gian" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white">
                                                <SelectItem value="day">Hôm nay</SelectItem>
                                                <SelectItem value="week">Tuần này</SelectItem>
                                                <SelectItem value="month">Tháng này</SelectItem>
                                                <SelectItem value="year">Năm nay</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                {useUserCustomDateRange && (
                                    <div className="mb-3 flex items-center gap-2">
                                        <input
                                            type="date"
                                            value={userCustomStartDate}
                                            onChange={(e) => setUserCustomStartDate(e.target.value)}
                                            className="rounded border border-gray-300 px-2 py-1 text-xs"
                                        />
                                        <span className="text-xs">-</span>
                                        <input
                                            type="date"
                                            value={userCustomEndDate}
                                            onChange={(e) => setUserCustomEndDate(e.target.value)}
                                            className="rounded border border-gray-300 px-2 py-1 text-xs"
                                        />
                                    </div>
                                )}
                                <ReactECharts option={userDistributionOption} style={{ height: "280px" }} />
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-white p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="font-semibold text-[#261E33]">Phân bố gói đăng ký</h3>
                                    <div className="flex items-center gap-3">
                                        <label className="flex items-center gap-1 text-xs">
                                            <input
                                                type="checkbox"
                                                checked={useSubCustomDateRange}
                                                onChange={(e) => setUseSubCustomDateRange(e.target.checked)}
                                            />
                                            Tùy chỉnh
                                        </label>
                                        <Select value={subPeriod} onValueChange={setSubPeriod}>
                                            <SelectTrigger className="h-8 w-[120px] text-xs" disabled={useSubCustomDateRange}>
                                                <SelectValue placeholder="Chọn thời gian" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white">
                                                <SelectItem value="day">Hôm nay</SelectItem>
                                                <SelectItem value="week">Tuần này</SelectItem>
                                                <SelectItem value="month">Tháng này</SelectItem>
                                                <SelectItem value="year">Năm nay</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                {useSubCustomDateRange && (
                                    <div className="mb-3 flex items-center gap-2">
                                        <input
                                            type="date"
                                            value={subCustomStartDate}
                                            onChange={(e) => setSubCustomStartDate(e.target.value)}
                                            className="rounded border border-gray-300 px-2 py-1 text-xs"
                                        />
                                        <span className="text-xs">-</span>
                                        <input
                                            type="date"
                                            value={subCustomEndDate}
                                            onChange={(e) => setSubCustomEndDate(e.target.value)}
                                            className="rounded border border-gray-300 px-2 py-1 text-xs"
                                        />
                                    </div>
                                )}
                                <ReactECharts option={subscriptionOption} style={{ height: "280px" }} />
                            </div>
                        </div>

                        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">

                            <div className="rounded-xl border border-gray-200 bg-white p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="font-semibold text-[#261E33]">Trạng thái báo cáo</h3>
                                    <div className="flex items-center gap-3">
                                        <label className="flex items-center gap-1 text-xs">
                                            <input
                                                type="checkbox"
                                                checked={useReportCustomDateRange}
                                                onChange={(e) => setUseReportCustomDateRange(e.target.checked)}
                                            />
                                            Tùy chỉnh
                                        </label>
                                        <Select value={reportPeriod} onValueChange={setReportPeriod}>
                                            <SelectTrigger className="h-8 w-[120px] text-xs" disabled={useReportCustomDateRange}>
                                                <SelectValue placeholder="Chọn thời gian" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white">
                                                <SelectItem value="week">Tuần này</SelectItem>
                                                <SelectItem value="month">Tháng này</SelectItem>
                                                <SelectItem value="year">Năm nay</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                {useReportCustomDateRange && (
                                    <div className="mb-3 flex items-center gap-2">
                                        <input
                                            type="date"
                                            value={reportCustomStartDate}
                                            onChange={(e) => setReportCustomStartDate(e.target.value)}
                                            className="rounded border border-gray-300 px-2 py-1 text-xs"
                                        />
                                        <span className="text-xs">-</span>
                                        <input
                                            type="date"
                                            value={reportCustomEndDate}
                                            onChange={(e) => setReportCustomEndDate(e.target.value)}
                                            className="rounded border border-gray-300 px-2 py-1 text-xs"
                                        />
                                    </div>
                                )}
                                <ReactECharts option={reportStatusOption} style={{ height: "280px" }} />
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-white p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="font-semibold text-[#261E33]">Doanh thu theo thời gian</h3>
                                    <div className="flex items-center gap-3">
                                        <label className="flex items-center gap-1 text-xs">
                                            <input
                                                type="checkbox"
                                                checked={useRevenueCustomDateRange}
                                                onChange={(e) => setUseRevenueCustomDateRange(e.target.checked)}
                                            />
                                            Tùy chỉnh
                                        </label>
                                        <Select value={revPeriodFilter} onValueChange={setRevPeriodFilter}>
                                            <SelectTrigger className="h-8 w-[120px] text-xs" disabled={useRevenueCustomDateRange}>
                                                <SelectValue placeholder="Kỳ hạn" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white">
                                                <SelectItem value="day">Hôm nay</SelectItem>
                                                <SelectItem value="week">Tuần này</SelectItem>
                                                <SelectItem value="month">Tháng này</SelectItem>
                                                <SelectItem value="year">Năm nay</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                {useRevenueCustomDateRange && (
                                    <div className="mb-3 flex items-center gap-2">
                                        <input
                                            type="date"
                                            value={revenueCustomStartDate}
                                            onChange={(e) => setRevenueCustomStartDate(e.target.value)}
                                            className="rounded border border-gray-300 px-2 py-1 text-xs"
                                        />
                                        <span className="text-xs">-</span>
                                        <input
                                            type="date"
                                            value={revenueCustomEndDate}
                                            onChange={(e) => setRevenueCustomEndDate(e.target.value)}
                                            className="rounded border border-gray-300 px-2 py-1 text-xs"
                                        />
                                    </div>
                                )}
                                <ReactECharts option={revenueByPeriodOption} style={{ height: "280px" }} />
                            </div>
                        </div>

                        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                            

                            <div className="rounded-xl border border-gray-200 bg-white p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="font-semibold text-[#261E33]">Giao dịch gần đây (Top 5)</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-gray-500 text-sm">
                                        <thead className="bg-gray-50 text-gray-700 text-xs">
                                            <tr>
                                                <th scope="col" className="px-4 py-3">
                                                    Mã GD
                                                </th>
                                                <th scope="col" className="px-4 py-3">
                                                    Người dùng
                                                </th>
                                                <th scope="col" className="px-4 py-3">
                                                    Gói
                                                </th>
                                                <th scope="col" className="px-4 py-3">
                                                    Số tiền
                                                </th>
                                                <th scope="col" className="px-4 py-3">
                                                    Trạng thái
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactionsData.map((txn, index) => (
                                                <tr key={index} className="border-b bg-white">
                                                    <td className="px-4 py-3 font-medium text-gray-900">
                                                        {txn.orderCode || ""}
                                                    </td>
                                                    <td className="px-4 py-3">{txn.userName || ""}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="rounded bg-orange-100 px-2 py-0.5 font-medium text-orange-800 text-xs">
                                                            {txn.planName}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-[#261E33]">
                                                        {(txn.amount || 0).toLocaleString()} ₫
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span
                                                            className={`rounded-full px-2 py-1 font-medium text-xs ${txn.paymentStatus === 1 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                                                            {txn.paymentStatus === 1 ? "Thành công" : "Đang xử lý"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

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
