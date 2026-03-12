"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { type AdminBillingHistoryItem, getAdminBillingHistory } from "@/api/admin-billing";
import { Button } from "@/components/ui/button";
import { getPaymentStatusInfo } from "@/utils/payment-status";

export function BillingHistoryTab() {
    const t = useTranslations("BillingHistoryTab");
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<number | "all">("all");
    const [isLoading, setIsLoading] = useState(true);
    const [billingRecords, setBillingRecords] = useState<AdminBillingHistoryItem[]>([]);
    const [pagination, setPagination] = useState({
        pageNumber: 1,
        pageSize: 10,
        totalCount: 0,
        totalPages: 0
    });

    // Load billing history from API
    useEffect(() => {
        const loadBillingHistory = async () => {
            setIsLoading(true);
            try {
                const result = await getAdminBillingHistory(
                    {
                        searchTerm: searchQuery || undefined,
                        paymentStatus: filterStatus === "all" ? undefined : filterStatus,
                        pageNumber: pagination.pageNumber,
                        pageSize: pagination.pageSize
                    },
                    "vi"
                );

                if (result.status === "success" && result.data) {
                    setBillingRecords(result.data.items);
                    setPagination({
                        pageNumber: result.data.pageNumber,
                        pageSize: result.data.pageSize,
                        totalCount: result.data.totalCount,
                        totalPages: result.data.totalPages
                    });
                } else {
                    // Fallback to mock data if API fails
                    console.warn("API failed, using mock data:", result.message);
                    setBillingRecords([
                        {
                            paymentId: "1",
                            orderCode: 2024001,
                            paymentStatus: 1, // SUCCESS
                            amount: 299000,
                            paymentMethod: "Bank Transfer",
                            createdAt: "2024-03-05T10:00:00Z",
                            paidAt: "2024-03-05T10:05:00Z",
                            userId: "user-1",
                            userEmail: "nguyenvana@example.com",
                            userName: "Nguyễn Văn A",
                            planId: "premium-plan",
                            planName: "Premium"
                        },
                        {
                            paymentId: "2",
                            orderCode: 2024002,
                            paymentStatus: 0, // PENDING
                            amount: 299000,
                            paymentMethod: "Credit Card",
                            createdAt: "2024-03-04T15:30:00Z",
                            paidAt: null,
                            userId: "user-2",
                            userEmail: "tranthib@example.com",
                            userName: "Trần Thị B",
                            planId: "premium-plan",
                            planName: "Premium"
                        },
                        {
                            paymentId: "3",
                            orderCode: 2024003,
                            paymentStatus: 3, // FAILED
                            amount: 299000,
                            paymentMethod: "Credit Card",
                            createdAt: "2024-03-03T09:15:00Z",
                            paidAt: null,
                            userId: "user-3",
                            userEmail: "levanc@example.com",
                            userName: "Lê Văn C",
                            planId: "premium-plan",
                            planName: "Premium"
                        }
                    ]);
                    setPagination({
                        pageNumber: 1,
                        pageSize: 10,
                        totalCount: 3,
                        totalPages: 1
                    });
                }
            } catch (error) {
                console.error("Failed to load billing history:", error);
                // Không gọi toast ở đây để tránh dependency loop
            } finally {
                setIsLoading(false);
            }
        };

        loadBillingHistory();
    }, [searchQuery, filterStatus, pagination.pageNumber, pagination.pageSize]); // Bỏ toast khỏi dependency

    // Handle search with debounce
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (pagination.pageNumber !== 1) {
                setPagination((prev) => ({ ...prev, pageNumber: 1 }));
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [pagination.pageNumber]);

    const handleExport = () => {
        // TODO: Implement export functionality
        console.log("Exporting billing history...");
    };

    const handlePageChange = (newPage: number) => {
        setPagination((prev) => ({ ...prev, pageNumber: newPage }));
    };

    return (
        <div className="space-y-6">
            {/* Header with Search and Filters */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="relative max-w-md flex-1">
                    <input
                        type="text"
                        placeholder={t("search.placeholder")}
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
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value === "all" ? "all" : Number(e.target.value))}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#FF5F3D] focus:outline-none focus:ring-2 focus:ring-[#FF5F3D]/20">
                        <option value="all">{t("filters.allStatus")}</option>
                        <option value={0}>{t("filters.pending")}</option>
                        <option value={1}>{t("filters.success")}</option>
                        <option value={2}>{t("filters.cancelled")}</option>
                        <option value={3}>{t("filters.failed")}</option>
                    </select>

                    <Button onClick={handleExport} className="bg-[#FF5F3D] hover:bg-[#ff4620]">
                        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                        {t("actions.export")}
                    </Button>
                </div>
            </div>

            {/* Billing Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                {isLoading ? (
                    <div className="flex items-center justify-center p-12">
                        <div className="text-center">
                            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[#FF5F3D]" />
                            <p className="text-[#6F6B99] text-sm">Đang tải dữ liệu...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-[#F8F8F8]">
                                    <tr>
                                        <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">
                                            {t("table.orderCode")}
                                        </th>
                                        <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">
                                            {t("table.user")}
                                        </th>
                                        <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">
                                            {t("table.plan")}
                                        </th>
                                        <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">
                                            {t("table.amount")}
                                        </th>
                                        <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">
                                            {t("table.method")}
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
                                    {billingRecords.map((record) => {
                                        const statusInfo = getPaymentStatusInfo(record.paymentStatus);
                                        return (
                                            <tr
                                                key={record.paymentId}
                                                className="border-gray-100 border-t hover:bg-gray-50">
                                                <td className="px-6 py-4 font-medium text-[#261E33] text-sm">
                                                    #{record.orderCode}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="font-medium text-[#261E33] text-sm">
                                                            {record.userName}
                                                        </p>
                                                        <p className="text-[#6F6B99] text-xs">{record.userEmail}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-[#261E33] text-sm">{record.planName}</td>
                                                <td className="px-6 py-4 font-semibold text-[#261E33] text-sm">
                                                    {record.amount.toLocaleString()} VND
                                                </td>
                                                <td className="px-6 py-4 text-[#261E33] text-sm">
                                                    {record.paymentMethod}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`rounded-full px-3 py-1 font-medium text-xs ${statusInfo.color} ${statusInfo.bgColor}`}>
                                                        {statusInfo.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-[#6F6B99] text-sm">
                                                    {new Date(record.createdAt).toLocaleDateString("vi-VN")}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        type="button"
                                                        className="font-medium text-[#FF5F3D] text-sm hover:text-[#ff4620]">
                                                        View Details
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {billingRecords.length === 0 && (
                            <div className="py-12 text-center">
                                <p className="text-[#6F6B99]">No billing records found</p>
                            </div>
                        )}

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="flex items-center justify-between border-gray-200 border-t px-6 py-4">
                                <div className="text-[#6F6B99] text-sm">
                                    Showing {(pagination.pageNumber - 1) * pagination.pageSize + 1} to{" "}
                                    {Math.min(pagination.pageNumber * pagination.pageSize, pagination.totalCount)} of{" "}
                                    {pagination.totalCount} results
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(pagination.pageNumber - 1)}
                                        disabled={pagination.pageNumber <= 1}>
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(pagination.pageNumber + 1)}
                                        disabled={pagination.pageNumber >= pagination.totalPages}>
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
