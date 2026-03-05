"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type BillingRecord = {
    id: string;
    invoice: string;
    user: string;
    email: string;
    plan: "Free" | "Premium";
    amount: number;
    status: "Paid" | "Pending" | "Failed";
    date: string;
};

export function BillingHistoryTab() {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "pending" | "failed">("all");

    // Mock data
    const billingRecords: BillingRecord[] = [
        {
            id: "1",
            invoice: "INV-2024-001",
            user: "Nguyễn Văn A",
            email: "nguyenvana@example.com",
            plan: "Premium",
            amount: 299000,
            status: "Paid",
            date: "2024-03-05"
        },
        {
            id: "2",
            invoice: "INV-2024-002",
            user: "Trần Thị B",
            email: "tranthib@example.com",
            plan: "Premium",
            amount: 299000,
            status: "Paid",
            date: "2024-03-04"
        },
        {
            id: "3",
            invoice: "INV-2024-003",
            user: "Lê Văn C",
            email: "levanc@example.com",
            plan: "Premium",
            amount: 299000,
            status: "Pending",
            date: "2024-03-03"
        },
        {
            id: "4",
            invoice: "INV-2024-004",
            user: "Phạm Thị D",
            email: "phamthid@example.com",
            plan: "Premium",
            amount: 299000,
            status: "Failed",
            date: "2024-03-02"
        }
    ];

    const filteredRecords = billingRecords.filter((record) => {
        const matchesSearch =
            record.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
            record.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            record.invoice.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
            filterStatus === "all" || record.status.toLowerCase() === filterStatus;

        return matchesSearch && matchesStatus;
    });

    const handleExport = () => {
        // TODO: Implement export functionality
        console.log("Exporting billing history...");
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Paid":
                return "bg-green-100 text-green-700";
            case "Pending":
                return "bg-yellow-100 text-yellow-700";
            case "Failed":
                return "bg-red-100 text-red-700";
            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    return (
        <div className="space-y-6">
            {/* Header with Search and Filters */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="relative flex-1 max-w-md">
                    <input
                        type="text"
                        placeholder="Search by user, email, or invoice..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 text-sm focus:border-[#FF5F3D] focus:outline-none focus:ring-2 focus:ring-[#FF5F3D]/20"
                    />
                    <svg
                        className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                <div className="flex gap-2">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#FF5F3D] focus:outline-none focus:ring-2 focus:ring-[#FF5F3D]/20">
                        <option value="all">All Status</option>
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                    </select>

                    <Button onClick={handleExport} className="bg-[#FF5F3D] hover:bg-[#ff4620]">
                        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export
                    </Button>
                </div>
            </div>

            {/* Billing Table */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[#F8F8F8]">
                            <tr>
                                <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">Invoice</th>
                                <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">User</th>
                                <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">Plan</th>
                                <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">Amount</th>
                                <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">Status</th>
                                <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">Date</th>
                                <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRecords.map((record) => (
                                <tr key={record.id} className="border-t border-gray-100 hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-[#261E33] text-sm">{record.invoice}</td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-medium text-[#261E33] text-sm">{record.user}</p>
                                            <p className="text-[#6F6B99] text-xs">{record.email}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-[#261E33] text-sm">{record.plan}</td>
                                    <td className="px-6 py-4 font-semibold text-[#261E33] text-sm">
                                        {record.amount.toLocaleString()} VND
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(record.status)}`}>
                                            {record.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-[#6F6B99] text-sm">{record.date}</td>
                                    <td className="px-6 py-4">
                                        <button
                                            type="button"
                                            className="text-[#FF5F3D] hover:text-[#ff4620] text-sm font-medium">
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredRecords.length === 0 && (
                    <div className="py-12 text-center">
                        <p className="text-[#6F6B99]">No billing records found</p>
                    </div>
                )}
            </div>
        </div>
    );
}
