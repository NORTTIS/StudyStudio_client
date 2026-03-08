"use client";

import {
    Activity,
    AlertCircle,
    CheckCircle2,
    Clock,
    Database,
    RefreshCw,
    Server,
    Wifi,
    XCircle,
    Zap
} from "lucide-react";
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";

type HealthStatus = "healthy" | "degraded" | "down";

type ServiceItem = {
    name: string;
    status: HealthStatus;
    uptime: string;
    latency: string;
    lastChecked: string;
    icon: React.ReactNode;
};

type MetricItem = {
    label: string;
    value: string;
    unit: string;
    percent: number;
    color: string;
    bgColor: string;
};

type LogItem = {
    time: string;
    level: "INFO" | "WARN" | "ERROR";
    message: string;
};

const SERVICES: ServiceItem[] = [
    {
        name: "API Server",
        status: "healthy",
        uptime: "99.97%",
        latency: "42ms",
        lastChecked: "30 giây trước",
        icon: <Server className="h-5 w-5" />
    },
    {
        name: "Database (PostgreSQL)",
        status: "healthy",
        uptime: "99.99%",
        latency: "8ms",
        lastChecked: "30 giây trước",
        icon: <Database className="h-5 w-5" />
    },
    {
        name: "Authentication Service",
        status: "healthy",
        uptime: "100%",
        latency: "15ms",
        lastChecked: "30 giây trước",
        icon: <Wifi className="h-5 w-5" />
    },
    {
        name: "AI Q&A Service",
        status: "degraded",
        uptime: "97.3%",
        latency: "380ms",
        lastChecked: "30 giây trước",
        icon: <Zap className="h-5 w-5" />
    },
    {
        name: "File Storage (S3)",
        status: "healthy",
        uptime: "99.95%",
        latency: "61ms",
        lastChecked: "30 giây trước",
        icon: <Database className="h-5 w-5" />
    },
    {
        name: "Email Service",
        status: "down",
        uptime: "88.5%",
        latency: "—",
        lastChecked: "2 phút trước",
        icon: <Activity className="h-5 w-5" />
    }
];

const METRICS: MetricItem[] = [
    {
        label: "CPU Usage",
        value: "38",
        unit: "%",
        percent: 38,
        color: "bg-green-500",
        bgColor: "text-green-600"
    },
    {
        label: "Memory Usage",
        value: "61",
        unit: "%",
        percent: 61,
        color: "bg-amber-500",
        bgColor: "text-amber-600"
    },
    {
        label: "Disk I/O",
        value: "22",
        unit: "%",
        percent: 22,
        color: "bg-blue-500",
        bgColor: "text-blue-600"
    },
    {
        label: "Network In/Out",
        value: "74",
        unit: "Mbps",
        percent: 74,
        color: "bg-[#FF5F3D]",
        bgColor: "text-[#FF5F3D]"
    }
];

const LOGS: LogItem[] = [
    { time: "15:52:14", level: "ERROR", message: "Email service connection timeout — retrying (attempt 3/5)" },
    { time: "15:51:03", level: "WARN", message: "AI Q&A service latency spike: 380ms (threshold: 200ms)" },
    { time: "15:48:30", level: "INFO", message: "Database backup completed successfully (2.4 GB)" },
    { time: "15:45:00", level: "INFO", message: "Scheduled health check passed — 5/6 services healthy" },
    { time: "15:30:17", level: "WARN", message: "High memory usage detected: 61% (warning threshold: 60%)" },
    { time: "15:12:08", level: "INFO", message: "New user registration spike: 47 sign-ups in 10 minutes" },
    { time: "14:55:22", level: "ERROR", message: "Email service went down — incident #INC-2024-031 opened" },
    { time: "14:40:00", level: "INFO", message: "API Server auto-scaled: 2 → 3 instances" }
];

const STATUS_CONFIG: Record<HealthStatus, { label: string; icon: React.ReactNode; badge: string; dot: string }> = {
    healthy: {
        label: "Hoạt động",
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        badge: "bg-green-50 text-green-700 border-green-200",
        dot: "bg-green-500"
    },
    degraded: {
        label: "Chậm",
        icon: <AlertCircle className="h-4 w-4 text-amber-500" />,
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        dot: "bg-amber-500"
    },
    down: {
        label: "Ngừng hoạt động",
        icon: <XCircle className="h-4 w-4 text-red-500" />,
        badge: "bg-red-50 text-red-700 border-red-200",
        dot: "bg-red-500"
    }
};

const LOG_LEVEL_COLOR: Record<LogItem["level"], string> = {
    INFO: "text-blue-600 bg-blue-50",
    WARN: "text-amber-600 bg-amber-50",
    ERROR: "text-red-600 bg-red-50"
};

export function SystemHealthPage() {
    const [refreshing, setRefreshing] = useState(false);
    const [lastRefresh, setLastRefresh] = useState("15:52:30");

    const healthy = SERVICES.filter((s) => s.status === "healthy").length;
    const degraded = SERVICES.filter((s) => s.status === "degraded").length;
    const down = SERVICES.filter((s) => s.status === "down").length;

    const handleRefresh = () => {
        setRefreshing(true);
        setTimeout(() => {
            const now = new Date();
            setLastRefresh(
                `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`
            );
            setRefreshing(false);
        }, 1200);
    };

    const overallStatus: HealthStatus = down > 0 ? "down" : degraded > 0 ? "degraded" : "healthy";

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
                                <h1 className="mb-1 font-bold text-2xl text-[#261E33]">Tình trạng hệ thống</h1>
                                <p className="text-[#6F6B99] text-sm">
                                    Theo dõi hiệu suất và trạng thái các dịch vụ theo thời gian thực
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 text-[#6F6B99] text-sm">
                                    <Clock className="h-4 w-4" />
                                    Cập nhật: {lastRefresh}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleRefresh}
                                    disabled={refreshing}
                                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 font-medium text-[#261E33] text-sm transition-colors hover:border-[#FF5F3D] hover:text-[#FF5F3D] disabled:opacity-60">
                                    <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                                    Làm mới
                                </button>
                            </div>
                        </div>

                        {/* Overall status banner */}
                        <div
                            className={`mb-6 flex items-center gap-4 rounded-2xl border p-5 ${
                                overallStatus === "healthy"
                                    ? "border-green-200 bg-green-50"
                                    : overallStatus === "degraded"
                                      ? "border-amber-200 bg-amber-50"
                                      : "border-red-200 bg-red-50"
                            }`}>
                            <div
                                className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                                    overallStatus === "healthy"
                                        ? "bg-green-100"
                                        : overallStatus === "degraded"
                                          ? "bg-amber-100"
                                          : "bg-red-100"
                                }`}>
                                {STATUS_CONFIG[overallStatus].icon}
                            </div>
                            <div>
                                <p
                                    className={`font-bold text-lg ${
                                        overallStatus === "healthy"
                                            ? "text-green-700"
                                            : overallStatus === "degraded"
                                              ? "text-amber-700"
                                              : "text-red-700"
                                    }`}>
                                    {overallStatus === "healthy"
                                        ? "Tất cả hệ thống hoạt động bình thường"
                                        : overallStatus === "degraded"
                                          ? "Một số dịch vụ hoạt động chậm"
                                          : "Có dịch vụ ngừng hoạt động"}
                                </p>
                                <p className="text-[#6F6B99] text-sm">
                                    {healthy} hoạt động · {degraded} chậm · {down} ngừng
                                </p>
                            </div>
                        </div>

                        {/* System metrics */}
                        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                            {METRICS.map((m) => (
                                <div key={m.label} className="rounded-xl border border-gray-200 bg-white p-5">
                                    <p className="mb-2 text-[#6F6B99] text-sm">{m.label}</p>
                                    <p className={`mb-3 font-bold text-2xl ${m.bgColor}`}>
                                        {m.value}
                                        <span className="ml-0.5 font-medium text-base">{m.unit}</span>
                                    </p>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                        <div
                                            className={`h-full rounded-full transition-all ${m.color}`}
                                            style={{ width: `${m.percent}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Services table */}
                        <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">
                            <div className="border-gray-100 border-b px-6 py-4">
                                <h2 className="font-bold text-[#261E33] text-lg">Trạng thái dịch vụ</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-[#F8F8F8]">
                                        <tr>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">
                                                Dịch vụ
                                            </th>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">
                                                Trạng thái
                                            </th>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">
                                                Uptime
                                            </th>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">
                                                Độ trễ
                                            </th>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">
                                                Kiểm tra lần cuối
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {SERVICES.map((svc) => {
                                            const cfg = STATUS_CONFIG[svc.status];
                                            return (
                                                <tr
                                                    key={svc.name}
                                                    className="border-gray-100 border-t transition-colors hover:bg-gray-50">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-100 bg-[#F8F8F8] text-[#6F6B99]">
                                                                {svc.icon}
                                                            </div>
                                                            <p className="font-medium text-[#261E33] text-sm">
                                                                {svc.name}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span
                                                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium text-xs ${cfg.badge}`}>
                                                            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                                                            {cfg.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 font-semibold text-[#261E33] text-sm">
                                                        {svc.uptime}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm">
                                                        <span
                                                            className={
                                                                svc.latency === "—"
                                                                    ? "text-gray-400"
                                                                    : svc.status === "degraded"
                                                                      ? "font-semibold text-amber-600"
                                                                      : "text-[#261E33]"
                                                            }>
                                                            {svc.latency}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-[#6F6B99] text-sm">
                                                        {svc.lastChecked}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Recent logs */}
                        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                            <div className="border-gray-100 border-b px-6 py-4">
                                <h2 className="font-bold text-[#261E33] text-lg">Nhật ký hệ thống gần đây</h2>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {LOGS.map((log, i) => (
                                    <div
                                        key={i}
                                        className="flex items-start gap-4 px-6 py-4 transition-colors hover:bg-gray-50">
                                        <span className="mt-0.5 w-16 shrink-0 font-mono text-[#6F6B99] text-xs">
                                            {log.time}
                                        </span>
                                        <span
                                            className={`mt-0.5 shrink-0 rounded px-2 py-0.5 font-semibold text-xs ${LOG_LEVEL_COLOR[log.level]}`}>
                                            {log.level}
                                        </span>
                                        <p className="text-[#261E33] text-sm">{log.message}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
