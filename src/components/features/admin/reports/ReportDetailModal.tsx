"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

type ReportDetailModalProps = {
    report: Report;
    onClose: () => void;
};

export function ReportDetailModal({ report, onClose }: ReportDetailModalProps) {
    const [status, setStatus] = useState(report.status);
    const [priority, setPriority] = useState(report.priority);
    const [note, setNote] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);

    const handleUpdateStatus = async () => {
        setIsUpdating(true);
        // TODO: Replace with actual API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsUpdating(false);
        onClose();
    };

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-gray-200 bg-white p-6">
                {/* Header */}
                <div className="mb-6 flex items-start justify-between">
                    <div className="flex-1">
                        <h2 className="mb-2 font-bold text-2xl text-[#261E33]">{report.title}</h2>
                        <div className="flex items-center gap-3">
                            <span
                                className={`rounded-full px-3 py-1 font-medium text-xs ${getStatusColor(report.status)}`}>
                                {report.status}
                            </span>
                            <span
                                className={`rounded-full px-3 py-1 font-medium text-xs ${getPriorityColor(report.priority)}`}>
                                {report.priority}
                            </span>
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-[#261E33] text-xs">
                                {report.type}
                            </span>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
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

                {/* User Info */}
                <div className="mb-6 rounded-lg border border-gray-200 bg-[#F8F8F8] p-4">
                    <h3 className="mb-3 font-semibold text-[#261E33] text-sm">Thông tin người dùng</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="mb-1 text-[#6F6B99] text-xs">Tên</p>
                            <p className="font-medium text-[#261E33] text-sm">{report.user.name}</p>
                        </div>
                        <div>
                            <p className="mb-1 text-[#6F6B99] text-xs">Email</p>
                            <p className="font-medium text-[#261E33] text-sm">{report.user.email}</p>
                        </div>
                        <div>
                            <p className="mb-1 text-[#6F6B99] text-xs">Ngày tạo</p>
                            <p className="font-medium text-[#261E33] text-sm">{report.createdAt}</p>
                        </div>
                        <div>
                            <p className="mb-1 text-[#6F6B99] text-xs">Cập nhật lần cuối</p>
                            <p className="font-medium text-[#261E33] text-sm">{report.updatedAt}</p>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="mb-6">
                    <h3 className="mb-3 font-semibold text-[#261E33] text-sm">Mô tả</h3>
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <p className="text-[#261E33] text-sm leading-relaxed">{report.description}</p>
                    </div>
                </div>

                {/* Update Status & Priority */}
                <div className="mb-6 grid grid-cols-2 gap-4">
                    <div>
                        <p className="mb-2 block font-medium text-[#261E33] text-sm">
                            Cập nhật trạng thái
                        </p>
                        <Select value={status} onValueChange={(value) => setStatus(value as Report["status"])}>
                            <SelectTrigger className="w-full rounded-lg px-4">
                                <SelectValue placeholder="Cập nhật trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Open">Đang mở</SelectItem>
                                <SelectItem value="In Progress">Đang xử lý</SelectItem>
                                <SelectItem value="Resolved">Đã giải quyết</SelectItem>
                                <SelectItem value="Closed">Đã đóng</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <p className="mb-2 block font-medium text-[#261E33] text-sm">
                            Cập nhật độ ưu tiên
                        </p>
                        <Select value={priority} onValueChange={(value) => setPriority(value as Report["priority"])}>
                            <SelectTrigger className="w-full rounded-lg px-4">
                                <SelectValue placeholder="Cập nhật độ ưu tiên" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Low">Thấp</SelectItem>
                                <SelectItem value="Medium">Trung bình</SelectItem>
                                <SelectItem value="High">Cao</SelectItem>
                                <SelectItem value="Critical">Nghiêm trọng</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Add Note */}
                <div className="mb-6">
                    <p className="mb-2 block font-medium text-[#261E33] text-sm">Thêm ghi chú</p>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Nhập ghi chú..."
                        rows={4}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#FF5F3D] focus:outline-none focus:ring-2 focus:ring-[#FF5F3D]/20"
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3">
                    <Button
                        type="button"
                        onClick={onClose}
                        variant="outline"
                        className="border-gray-300 text-[#261E33] hover:bg-gray-50">
                        Hủy
                    </Button>
                    <Button
                        type="button"
                        onClick={handleUpdateStatus}
                        disabled={isUpdating}
                        className="bg-[#FF5F3D] text-white hover:bg-[#ff4620]">
                        {isUpdating ? "Đang cập nhật..." : "Cập nhật"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
