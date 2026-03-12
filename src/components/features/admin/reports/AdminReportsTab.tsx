"use client";

import { Empty } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import {
    type AdminReport,
    type AdminReportsParams,
    type AdminReportsResponse,
    getAdminReports,
    getReportPriorityColor,
    getReportPriorityLabel,
    getReportStatusColor,
    getReportStatusLabel,
    getReportTypeLabel,
    REPORT_PRIORITIES,
    REPORT_STATUSES,
    updateAdminReport
} from "@/api/admin-reports";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export function AdminReportsTab() {
    const t = useTranslations("AdminReports");
    const locale = useLocale();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [reports, setReports] = useState<AdminReportsResponse>({
        summary: {
            totalReport: 0,
            totalOpen: 0,
            totalInProgress: 0,
            totalResolved: 0
        },
        reportList: [],
        totalCount: 0,
        pageNumber: 1,
        pageSize: 10
    });

    const [error, setError] = useState<string | null>(null);

    const [filters, setFilters] = useState<AdminReportsParams>({
        pageNumber: 1,
        pageSize: 10
    });

    const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        status: 0,
        priority: 0,
        adminNote: ""
    });

    // Load reports data
    const loadReports = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await getAdminReports(filters, locale);

            if (result.status === "success" && result.data) {
                setReports(result.data);
                console.log("Đã tải dữ liệu reports thành công:", result.data);
            } else {
                setError(result.message || t("errors.loadFailed"));
                console.error("API reports thất bại:", result.message);
                // Reset về empty state
                setReports({
                    summary: {
                        totalReport: 0,
                        totalOpen: 0,
                        totalInProgress: 0,
                        totalResolved: 0
                    },
                    reportList: [],
                    totalCount: 0,
                    pageNumber: 1,
                    pageSize: 10
                });
            }
        } catch (error) {
            const errorMessage = t("errors.loadError");
            setError(errorMessage);
            console.error("Lỗi khi tải reports:", error);

            // Reset về empty state
            setReports({
                summary: {
                    totalReport: 0,
                    totalOpen: 0,
                    totalInProgress: 0,
                    totalResolved: 0
                },
                reportList: [],
                totalCount: 0,
                pageNumber: 1,
                pageSize: 10
            });

            toast({
                description: errorMessage,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }, [filters, locale, t, toast]); // Dependency on filters để reload khi filters thay đổi, bỏ toast để tránh infinite loop

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    const handleEditReport = (report: AdminReport) => {
        setSelectedReport(report);
        setEditForm({
            status: report.status,
            priority: report.priority,
            adminNote: report.adminNote || ""
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateReport = async () => {
        if (!selectedReport) return;

        try {
            const result = await updateAdminReport(
                {
                    reportId: selectedReport.reportId,
                    status: editForm.status,
                    priority: editForm.priority,
                    adminNote: editForm.adminNote
                },
                locale
            );

            if (result.status === "success") {
                toast({
                    description: t("success.updateReport"),
                    variant: "default"
                });
                setIsEditModalOpen(false);
                setSelectedReport(null);
                loadReports(); // Reload data
            } else {
                toast({
                    description: result.message || t("errors.updateFailed"),
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Failed to update report:", error);
            toast({
                description: t("errors.updateError"),
                variant: "destructive"
            });
        }
    };

    const handleFilterChange = (key: keyof AdminReportsParams, value: string | number | undefined) => {
        setFilters((prev) => ({
            ...prev,
            [key]: value,
            pageNumber: key !== "pageNumber" ? 1 : typeof value === "string" ? Number.parseInt(value, 10) : value || 1 // Reset to page 1 when changing filters
        }));
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("vi-VN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-[#6F6B99] text-sm">{t("summary.totalReports")}</p>
                        <svg className="h-5 w-5 text-[#6F6B99]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                    </div>
                    <p className="font-bold text-2xl text-[#261E33]">{reports.summary.totalReport}</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-[#6F6B99] text-sm">{t("summary.open")}</p>
                        <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    </div>
                    <p className="font-bold text-2xl text-[#261E33]">{reports.summary.totalOpen}</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-[#6F6B99] text-sm">{t("summary.inProgress")}</p>
                        <div className="h-3 w-3 rounded-full bg-blue-500" />
                    </div>
                    <p className="font-bold text-2xl text-[#261E33]">{reports.summary.totalInProgress}</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-[#6F6B99] text-sm">{t("summary.resolved")}</p>
                        <div className="h-3 w-3 rounded-full bg-green-500" />
                    </div>
                    <p className="font-bold text-2xl text-[#261E33]">{reports.summary.totalResolved}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="mb-4">
                    <h3 className="font-semibold text-[#261E33] text-lg">{t("filters.title")}</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div>
                        <label className="mb-2 block font-medium text-[#261E33] text-sm">{t("filters.search")}</label>
                        <Input
                            placeholder={t("filters.searchPlaceholder")}
                            value={filters.searchTerm || ""}
                            onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="mb-2 block font-medium text-[#261E33] text-sm">{t("filters.type")}</label>
                        <select
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            value={filters.type || ""}
                            onChange={(e) =>
                                handleFilterChange("type", e.target.value ? Number(e.target.value) : undefined)
                            }>
                            <option value="">{t("filters.all")}</option>
                            <option value="0">{t("filters.types.bugReport")}</option>
                            <option value="1">{t("filters.types.featureRequest")}</option>
                            <option value="2">{t("filters.types.accountIssue")}</option>
                            <option value="3">{t("filters.types.other")}</option>
                        </select>
                    </div>
                    <div>
                        <label className="mb-2 block font-medium text-[#261E33] text-sm">{t("filters.status")}</label>
                        <select
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            value={filters.status || ""}
                            onChange={(e) =>
                                handleFilterChange("status", e.target.value ? Number(e.target.value) : undefined)
                            }>
                            <option value="">{t("filters.all")}</option>
                            <option value="0">{t("filters.statuses.open")}</option>
                            <option value="1">{t("filters.statuses.inProgress")}</option>
                            <option value="2">{t("filters.statuses.resolved")}</option>
                            <option value="3">{t("filters.statuses.closed")}</option>
                        </select>
                    </div>
                    <div>
                        <label className="mb-2 block font-medium text-[#261E33] text-sm">{t("filters.pageSize")}</label>
                        <select
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            value={filters.pageSize || 10}
                            onChange={(e) => handleFilterChange("pageSize", Number(e.target.value))}>
                            <option value="10">10</option>
                            <option value="20">20</option>
                            <option value="50">50</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Reports Table */}
            <div className="rounded-xl border border-gray-200 bg-white">
                <div className="border-gray-200 border-b p-6">
                    <h3 className="font-semibold text-[#261E33] text-lg">{t("table.title")}</h3>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center p-12">
                        <div className="text-center">
                            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[#FF5F3D]" />
                            <p className="text-[#6F6B99] text-sm">{t("loading")}</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center p-12">
                        <Empty
                            description={
                                <div className="text-center">
                                    <p className="mb-2 font-medium text-[#261E33]">{t("errors.loadFailedTitle")}</p>
                                    <p className="mb-4 text-[#6F6B99] text-sm">{error}</p>
                                    <Button onClick={loadReports} className="bg-[#FF5F3D] hover:bg-[#ff4620]">
                                        {t("actions.retry")}
                                    </Button>
                                </div>
                            }
                        />
                    </div>
                ) : reports.reportList.length === 0 ? (
                    <div className="flex items-center justify-center p-12">
                        <Empty
                            description={
                                <div className="text-center">
                                    <p className="mb-2 font-medium text-[#261E33]">{t("empty.title")}</p>
                                    <p className="text-[#6F6B99] text-sm">{t("empty.description")}</p>
                                </div>
                            }
                        />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left font-medium text-[#261E33] text-xs uppercase tracking-wider">
                                        {t("table.headers.email")}
                                    </th>
                                    <th className="px-6 py-3 text-left font-medium text-[#261E33] text-xs uppercase tracking-wider">
                                        {t("table.headers.title")}
                                    </th>
                                    <th className="px-6 py-3 text-left font-medium text-[#261E33] text-xs uppercase tracking-wider">
                                        {t("table.headers.type")}
                                    </th>
                                    <th className="px-6 py-3 text-left font-medium text-[#261E33] text-xs uppercase tracking-wider">
                                        {t("table.headers.status")}
                                    </th>
                                    <th className="px-6 py-3 text-left font-medium text-[#261E33] text-xs uppercase tracking-wider">
                                        {t("table.headers.priority")}
                                    </th>
                                    <th className="px-6 py-3 text-left font-medium text-[#261E33] text-xs uppercase tracking-wider">
                                        {t("table.headers.createdAt")}
                                    </th>
                                    <th className="px-6 py-3 text-left font-medium text-[#261E33] text-xs uppercase tracking-wider">
                                        {t("table.headers.actions")}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {reports.reportList.map((report) => (
                                    <tr key={report.reportId} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-[#261E33] text-sm">{report.email}</td>
                                        <td className="px-6 py-4">
                                            <div className="max-w-xs">
                                                <p className="truncate font-medium text-[#261E33] text-sm">
                                                    {report.title}
                                                </p>
                                                <p className="truncate text-[#6F6B99] text-xs">{report.content}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-[#6F6B99] text-sm">
                                            {getReportTypeLabel(report.type)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex rounded-full px-2 py-1 font-semibold text-xs ${getReportStatusColor(report.status)}`}>
                                                {getReportStatusLabel(report.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex rounded-full px-2 py-1 font-semibold text-xs ${getReportPriorityColor(report.priority)}`}>
                                                {getReportPriorityLabel(report.priority)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-[#6F6B99] text-sm">
                                            {formatDate(report.createdAt)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleEditReport(report)}>
                                                {t("actions.edit")}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {reports.totalCount > 0 && (
                    <div className="flex items-center justify-between border-gray-200 border-t px-6 py-3">
                        <div className="text-[#6F6B99] text-sm">
                            {t("pagination.showing", {
                                start: (reports.pageNumber - 1) * reports.pageSize + 1,
                                end: Math.min(reports.pageNumber * reports.pageSize, reports.totalCount),
                                total: reports.totalCount
                            })}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={reports.pageNumber <= 1}
                                onClick={() => handleFilterChange("pageNumber", reports.pageNumber - 1)}>
                                {t("pagination.previous")}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={reports.pageNumber * reports.pageSize >= reports.totalCount}
                                onClick={() => handleFilterChange("pageNumber", reports.pageNumber + 1)}>
                                {t("pagination.next")}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && selectedReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="font-bold text-[#261E33] text-xl">{t("modal.title")}</h2>
                            <button
                                type="button"
                                onClick={() => setIsEditModalOpen(false)}
                                className="text-[#6F6B99] transition-colors hover:text-[#261E33]">
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="mb-2 font-medium text-[#261E33] text-sm">{t("modal.reportTitle")}:</p>
                                <p className="text-[#6F6B99] text-sm">{selectedReport.title}</p>
                            </div>

                            <div>
                                <p className="mb-2 font-medium text-[#261E33] text-sm">{t("modal.content")}:</p>
                                <p className="text-[#6F6B99] text-sm">{selectedReport.content}</p>
                            </div>

                            <div>
                                <label className="mb-2 block font-medium text-[#261E33] text-sm">
                                    {t("modal.status")}
                                </label>
                                <select
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    value={editForm.status}
                                    onChange={(e) =>
                                        setEditForm((prev) => ({ ...prev, status: Number(e.target.value) }))
                                    }>
                                    {Object.entries(REPORT_STATUSES).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block font-medium text-[#261E33] text-sm">
                                    {t("modal.priority")}
                                </label>
                                <select
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    value={editForm.priority}
                                    onChange={(e) =>
                                        setEditForm((prev) => ({ ...prev, priority: Number(e.target.value) }))
                                    }>
                                    {Object.entries(REPORT_PRIORITIES).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block font-medium text-[#261E33] text-sm">
                                    {t("modal.adminNote")}
                                </label>
                                <Textarea
                                    value={editForm.adminNote}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, adminNote: e.target.value }))}
                                    placeholder={t("modal.adminNotePlaceholder")}
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="flex-1">
                                {t("modal.cancel")}
                            </Button>
                            <Button onClick={handleUpdateReport} className="flex-1 bg-[#FF5F3D] hover:bg-[#ff4620]">
                                {t("modal.update")}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
