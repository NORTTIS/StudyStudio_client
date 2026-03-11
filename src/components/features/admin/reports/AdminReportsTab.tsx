"use client";

import { Empty } from "antd";
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
            const result = await getAdminReports(filters, "vi");

            if (result.status === "success" && result.data) {
                setReports(result.data);
                console.log("Đã tải dữ liệu reports thành công:", result.data);
            } else {
                setError(result.message || "Không thể tải dữ liệu báo cáo");
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
            const errorMessage = "Có lỗi xảy ra khi tải dữ liệu báo cáo";
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
    }, [filters]); // Dependency on filters để reload khi filters thay đổi, bỏ toast để tránh infinite loop

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
                "vi"
            );

            if (result.status === "success") {
                toast({
                    description: "Cập nhật báo cáo thành công!",
                    variant: "default"
                });
                setIsEditModalOpen(false);
                setSelectedReport(null);
                loadReports(); // Reload data
            } else {
                toast({
                    description: result.message || "Cập nhật báo cáo thất bại",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Failed to update report:", error);
            toast({
                description: "Có lỗi xảy ra khi cập nhật báo cáo",
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
                        <p className="text-[#6F6B99] text-sm">Tổng báo cáo</p>
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
                        <p className="text-[#6F6B99] text-sm">Đang mở</p>
                        <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    </div>
                    <p className="font-bold text-2xl text-[#261E33]">{reports.summary.totalOpen}</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-[#6F6B99] text-sm">Đang xử lý</p>
                        <div className="h-3 w-3 rounded-full bg-blue-500" />
                    </div>
                    <p className="font-bold text-2xl text-[#261E33]">{reports.summary.totalInProgress}</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-[#6F6B99] text-sm">Đã giải quyết</p>
                        <div className="h-3 w-3 rounded-full bg-green-500" />
                    </div>
                    <p className="font-bold text-2xl text-[#261E33]">{reports.summary.totalResolved}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="mb-4">
                    <h3 className="font-semibold text-[#261E33] text-lg">Bộ lọc</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div>
                        <label className="mb-2 block font-medium text-[#261E33] text-sm">Tìm kiếm</label>
                        <Input
                            placeholder="Tìm theo email, tiêu đề..."
                            value={filters.searchTerm || ""}
                            onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="mb-2 block font-medium text-[#261E33] text-sm">Loại báo cáo</label>
                        <select
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            value={filters.type || ""}
                            onChange={(e) =>
                                handleFilterChange("type", e.target.value ? Number(e.target.value) : undefined)
                            }>
                            <option value="">Tất cả</option>
                            <option value="0">Bug Report</option>
                            <option value="1">Feature Request</option>
                            <option value="2">Account Issue</option>
                            <option value="3">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="mb-2 block font-medium text-[#261E33] text-sm">Trạng thái</label>
                        <select
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            value={filters.status || ""}
                            onChange={(e) =>
                                handleFilterChange("status", e.target.value ? Number(e.target.value) : undefined)
                            }>
                            <option value="">Tất cả</option>
                            <option value="0">Open</option>
                            <option value="1">In Progress</option>
                            <option value="2">Resolved</option>
                            <option value="3">Closed</option>
                        </select>
                    </div>
                    <div>
                        <label className="mb-2 block font-medium text-[#261E33] text-sm">Số lượng/trang</label>
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
                    <h3 className="font-semibold text-[#261E33] text-lg">Danh sách báo cáo</h3>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center p-12">
                        <div className="text-center">
                            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[#FF5F3D]" />
                            <p className="text-[#6F6B99] text-sm">Đang tải dữ liệu...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center p-12">
                        <Empty
                            description={
                                <div className="text-center">
                                    <p className="mb-2 font-medium text-[#261E33]">Không thể tải dữ liệu</p>
                                    <p className="mb-4 text-[#6F6B99] text-sm">{error}</p>
                                    <Button onClick={loadReports} className="bg-[#FF5F3D] hover:bg-[#ff4620]">
                                        Thử lại
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
                                    <p className="mb-2 font-medium text-[#261E33]">Chưa có báo cáo nào</p>
                                    <p className="text-[#6F6B99] text-sm">
                                        Hiện tại chưa có báo cáo nào từ người dùng.
                                    </p>
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
                                        Email
                                    </th>
                                    <th className="px-6 py-3 text-left font-medium text-[#261E33] text-xs uppercase tracking-wider">
                                        Tiêu đề
                                    </th>
                                    <th className="px-6 py-3 text-left font-medium text-[#261E33] text-xs uppercase tracking-wider">
                                        Loại
                                    </th>
                                    <th className="px-6 py-3 text-left font-medium text-[#261E33] text-xs uppercase tracking-wider">
                                        Trạng thái
                                    </th>
                                    <th className="px-6 py-3 text-left font-medium text-[#261E33] text-xs uppercase tracking-wider">
                                        Độ ưu tiên
                                    </th>
                                    <th className="px-6 py-3 text-left font-medium text-[#261E33] text-xs uppercase tracking-wider">
                                        Ngày tạo
                                    </th>
                                    <th className="px-6 py-3 text-left font-medium text-[#261E33] text-xs uppercase tracking-wider">
                                        Thao tác
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
                                                Chỉnh sửa
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
                            Hiển thị {(reports.pageNumber - 1) * reports.pageSize + 1} -{" "}
                            {Math.min(reports.pageNumber * reports.pageSize, reports.totalCount)} trong tổng số{" "}
                            {reports.totalCount} báo cáo
                        </div>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={reports.pageNumber <= 1}
                                onClick={() => handleFilterChange("pageNumber", reports.pageNumber - 1)}>
                                Trước
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={reports.pageNumber * reports.pageSize >= reports.totalCount}
                                onClick={() => handleFilterChange("pageNumber", reports.pageNumber + 1)}>
                                Sau
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
                            <h2 className="font-bold text-[#261E33] text-xl">Chỉnh sửa báo cáo</h2>
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
                                <p className="mb-2 font-medium text-[#261E33] text-sm">Tiêu đề:</p>
                                <p className="text-[#6F6B99] text-sm">{selectedReport.title}</p>
                            </div>

                            <div>
                                <p className="mb-2 font-medium text-[#261E33] text-sm">Nội dung:</p>
                                <p className="text-[#6F6B99] text-sm">{selectedReport.content}</p>
                            </div>

                            <div>
                                <label className="mb-2 block font-medium text-[#261E33] text-sm">Trạng thái</label>
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
                                <label className="mb-2 block font-medium text-[#261E33] text-sm">Độ ưu tiên</label>
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
                                <label className="mb-2 block font-medium text-[#261E33] text-sm">Ghi chú admin</label>
                                <Textarea
                                    value={editForm.adminNote}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, adminNote: e.target.value }))}
                                    placeholder="Nhập ghi chú của admin..."
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="flex-1">
                                Hủy
                            </Button>
                            <Button onClick={handleUpdateReport} className="flex-1 bg-[#FF5F3D] hover:bg-[#ff4620]">
                                Cập nhật
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
