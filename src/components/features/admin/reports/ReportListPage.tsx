"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { ReportDetailModal } from "./ReportDetailModal";

type Report = {
    id: string;
    title: string;
    type: "Bug" | "Feedback" | "Support" | "Other";
    status: "Open" | "In Progress" | "Resolved" | "Closed";
    priority: "Low" | "Medium" | "High" | "Critical";
    user: {
        name: string;
        email: string;
    };
    createdAt: string;
    updatedAt: string;
    description: string;
};

export function ReportListPage() {
    const t = useTranslations("AdminReports");
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<"all" | "open" | "in-progress" | "resolved" | "closed">("all");
    const [filterType, setFilterType] = useState<"all" | "bug" | "feedback" | "support" | "other">("all");

    // Mock data
    const reports: Report[] = [
        {
            id: "1",
            title: "Cannot upload files larger than 10MB",
            type: "Bug",
            status: "Open",
            priority: "High",
            user: {
                name: "Nguyễn Văn A",
                email: "nguyenvana@example.com"
            },
            createdAt: "2024-03-05",
            updatedAt: "2024-03-05",
            description:
                "When trying to upload files larger than 10MB, the system shows an error message and the upload fails. This happens consistently across different file types."
        },
        {
            id: "2",
            title: "Suggestion: Add dark mode",
            type: "Feedback",
            status: "In Progress",
            priority: "Medium",
            user: {
                name: "Trần Thị B",
                email: "tranthib@example.com"
            },
            createdAt: "2024-03-04",
            updatedAt: "2024-03-05",
            description:
                "It would be great to have a dark mode option for the application. Many users work late at night and a dark theme would be easier on the eyes."
        },
        {
            id: "3",
            title: "How to reset password?",
            type: "Support",
            status: "Resolved",
            priority: "Low",
            user: {
                name: "Lê Văn C",
                email: "levanc@example.com"
            },
            createdAt: "2024-03-03",
            updatedAt: "2024-03-04",
            description: "I forgot my password and cannot find the reset password option. Can you help me reset it?"
        },
        {
            id: "4",
            title: "Payment failed but money was deducted",
            type: "Bug",
            status: "Open",
            priority: "Critical",
            user: {
                name: "Phạm Thị D",
                email: "phamthid@example.com"
            },
            createdAt: "2024-03-05",
            updatedAt: "2024-03-05",
            description:
                "I tried to upgrade to Premium plan. The payment failed with an error, but the money was deducted from my account. My account still shows as Free plan."
        },
        {
            id: "5",
            title: "Improve search functionality",
            type: "Feedback",
            status: "Closed",
            priority: "Low",
            user: {
                name: "Hoàng Văn E",
                email: "hoangvane@example.com"
            },
            createdAt: "2024-03-01",
            updatedAt: "2024-03-03",
            description: "The search feature could be improved by adding filters and better relevance ranking."
        }
    ];

    const filteredReports = reports.filter((report) => {
        const matchesSearch =
            report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.user.email.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = filterStatus === "all" || report.status.toLowerCase().replace(" ", "-") === filterStatus;

        const matchesType = filterType === "all" || report.type.toLowerCase() === filterType;

        return matchesSearch && matchesStatus && matchesType;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Open":
                return "bg-blue-100 text-blue-700";
            case "In Progress":
                return "bg-yellow-100 text-yellow-700";
            case "Resolved":
                return "bg-green-100 text-green-700";
            case "Closed":
                return "bg-gray-100 text-gray-700";
            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "Critical":
                return "bg-red-100 text-red-700";
            case "High":
                return "bg-orange-100 text-orange-700";
            case "Medium":
                return "bg-yellow-100 text-yellow-700";
            case "Low":
                return "bg-gray-100 text-gray-700";
            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    const stats = {
        total: reports.length,
        open: reports.filter((r) => r.status === "Open").length,
        inProgress: reports.filter((r) => r.status === "In Progress").length,
        resolved: reports.filter((r) => r.status === "Resolved").length
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
                            <h1 className="mb-2 font-bold text-2xl text-[#261E33]">{t("title")}</h1>
                            <p className="text-[#6F6B99] text-sm">{t("subtitle")}</p>
                        </div>

                        {/* Stats Cards */}
                        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                            <div className="rounded-xl border border-gray-200 bg-white p-5">
                                <p className="mb-2 text-[#6F6B99] text-sm">{t("totalReports")}</p>
                                <p className="font-bold text-2xl text-[#261E33]">{stats.total}</p>
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-white p-5">
                                <p className="mb-2 text-[#6F6B99] text-sm">{t("open")}</p>
                                <p className="font-bold text-2xl text-blue-600">{stats.open}</p>
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-white p-5">
                                <p className="mb-2 text-[#6F6B99] text-sm">{t("inProgress")}</p>
                                <p className="font-bold text-2xl text-yellow-600">{stats.inProgress}</p>
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-white p-5">
                                <p className="mb-2 text-[#6F6B99] text-sm">{t("resolved")}</p>
                                <p className="font-bold text-2xl text-green-600">{stats.resolved}</p>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="relative max-w-md flex-1">
                                <input
                                    type="text"
                                    placeholder={t("searchPlaceholder")}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 text-sm focus:border-[#FF5F3D] focus:outline-none focus:ring-2 focus:ring-[#FF5F3D]/20"
                                />
                                <svg
                                    className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                            </div>

                            <div className="flex gap-2">
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value as any)}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#FF5F3D] focus:outline-none focus:ring-2 focus:ring-[#FF5F3D]/20">
                                    <option value="all">{t("filters.allTypes")}</option>
                                    <option value="bug">{t("filters.bug")}</option>
                                    <option value="feedback">{t("filters.feedback")}</option>
                                    <option value="support">{t("filters.support")}</option>
                                    <option value="other">{t("filters.other")}</option>
                                </select>

                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value as any)}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#FF5F3D] focus:outline-none focus:ring-2 focus:ring-[#FF5F3D]/20">
                                    <option value="all">{t("filters.allStatus")}</option>
                                    <option value="open">{t("filters.open")}</option>
                                    <option value="in-progress">{t("filters.inProgress")}</option>
                                    <option value="resolved">{t("filters.resolved")}</option>
                                    <option value="closed">{t("filters.closed")}</option>
                                </select>
                            </div>
                        </div>

                        {/* Reports Table */}
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-[#F8F8F8]">
                                        <tr>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">
                                                {t("table.title")}
                                            </th>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">
                                                {t("table.type")}
                                            </th>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">
                                                {t("table.user")}
                                            </th>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">
                                                {t("table.priority")}
                                            </th>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">
                                                {t("table.status")}
                                            </th>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">
                                                {t("table.date")}
                                            </th>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">
                                                {t("table.actions")}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredReports.map((report) => (
                                            <tr key={report.id} className="border-gray-100 border-t hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <p className="font-medium text-[#261E33] text-sm">{report.title}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-[#261E33] text-xs">
                                                        {report.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="font-medium text-[#261E33] text-sm">
                                                            {report.user.name}
                                                        </p>
                                                        <p className="text-[#6F6B99] text-xs">{report.user.email}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`rounded-full px-3 py-1 font-medium text-xs ${getPriorityColor(report.priority)}`}>
                                                        {report.priority}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`rounded-full px-3 py-1 font-medium text-xs ${getStatusColor(report.status)}`}>
                                                        {report.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-[#6F6B99] text-sm">{report.createdAt}</td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedReport(report)}
                                                        className="cursor-pointer font-medium text-[#FF5F3D] text-sm hover:text-[#ff4620]">
                                                        {t("table.viewDetails")}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {filteredReports.length === 0 && (
                                <div className="py-12 text-center">
                                    <p className="text-[#6F6B99]">{t("noReports")}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* Detail Modal */}
            {selectedReport && <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />}
        </div>
    );
}
