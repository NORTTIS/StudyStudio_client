"use client";

import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Eye, Flag, MessageSquare, Shield, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import type { Report, ReportStatus } from "./ReportListPage";

// Re-export mock data so detail page can look up by ID
const MOCK_REPORTS: Report[] = [
    {
        id: "RPT-001",
        title: "Lạm dụng nội dung",
        subtitle: "Bình luận không phù hợp",
        description:
            "Người dùng đã đăng nội dung không phù hợp trong diễn đàn thảo luận, vi phạm nguyên tắc cộng đồng. Nội dung bao gồm ngôn từ xúc phạm và hành vi quấy rồi đối với các thành viên khác. Trường hợp này cần được xem xét và xử lý ngay.",
        reporterName: "Nguyen Xuan Bac",
        reporterEmail: "bac@gmail.com",
        reportType: "Lạm dụng nội dung",
        status: "reviewing",
        reportDate: "20 tháng 1, 2024",
        targetContent: "Bình luận #1234 trong nhóm học tập"
    },
    {
        id: "RPT-002",
        title: "Spam",
        subtitle: "Tin nhắn spam liên tục",
        description:
            "Tài khoản này liên tục gửi tin nhắn quảng cáo không mong muốn đến các thành viên trong nhóm. Hành vi này gây phiền nhiễu và ảnh hưởng đến trải nghiệm học tập của mọi người.",
        reporterName: "Trần Thị Mai",
        reporterEmail: "mai.tran@example.com",
        reportType: "Spam",
        status: "pending",
        reportDate: "18 tháng 1, 2024",
        targetContent: "Nhóm Toán cao cấp - K22"
    },
    {
        id: "RPT-003",
        title: "Ngôn ngữ thù địch",
        subtitle: "Phát ngôn thù ghét",
        description:
            "Người dùng sử dụng ngôn ngữ thù địch và kỳ thị trong các bình luận công khai, tạo môi trường không lành mạnh cho cộng đồng học tập.",
        reporterName: "Lê Minh Khoa",
        reporterEmail: "khoa.le@example.com",
        reportType: "Ngôn ngữ thù địch",
        status: "resolved",
        reportDate: "15 tháng 1, 2024",
        targetContent: "Bài đăng trong Studio #567"
    },
    {
        id: "RPT-004",
        title: "Vi phạm bản quyền",
        subtitle: "Tài liệu sao chép trái phép",
        description:
            "Tài liệu được chia sẻ trong nhóm học tập được sao chép từ sách giáo khoa có bản quyền mà không có sự cho phép của tác giả hoặc nhà xuất bản.",
        reporterName: "Phạm Thị Hương",
        reporterEmail: "huong.pham@example.com",
        reportType: "Vi phạm bản quyền",
        status: "pending",
        reportDate: "12 tháng 1, 2024",
        targetContent: "Tài liệu PDF trong Studio Vật lý"
    },
    {
        id: "RPT-005",
        title: "Thông tin sai lệch",
        subtitle: "Nội dung giáo dục sai",
        description:
            "Người dùng chia sẻ thông tin học thuật sai lệch có thể gây hiểu nhầm cho các học sinh. Các nội dung này cần được kiểm duyệt và xử lý kịp thời.",
        reporterName: "Nguyễn Văn Nam",
        reporterEmail: "nam.nv@example.com",
        reportType: "Thông tin sai lệch",
        status: "reviewing",
        reportDate: "10 tháng 1, 2024",
        targetContent: "Bình luận trong nhóm Hóa học"
    }
];

const STATUS_STEPS: { key: ReportStatus; label: string; icon: React.ReactNode }[] = [
    { key: "pending", label: "Chờ xử lý", icon: <Clock className="h-4 w-4" /> },
    { key: "reviewing", label: "Đang xem xét", icon: <Eye className="h-4 w-4" /> },
    { key: "resolved", label: "Đã giải quyết", icon: <CheckCircle2 className="h-4 w-4" /> }
];

const STATUS_ORDER: Record<ReportStatus, number> = {
    pending: 0,
    reviewing: 1,
    resolved: 2
};

const STATUS_LABEL: Record<ReportStatus, string> = {
    pending: "Đang chờ xử lý",
    reviewing: "Đang Chờ Xử Lý",
    resolved: "Đã giải quyết"
};

const TYPE_ICON: Record<string, React.ReactNode> = {
    "Lạm dụng nội dung": <AlertTriangle className="h-5 w-5 text-[#FF5F3D]" />,
    Spam: <MessageSquare className="h-5 w-5 text-amber-500" />,
    "Ngôn ngữ thù địch": <UserX className="h-5 w-5 text-red-500" />,
    "Vi phạm bản quyền": <Flag className="h-5 w-5 text-purple-500" />,
    "Thông tin sai lệch": <AlertTriangle className="h-5 w-5 text-blue-500" />,
    "Hành vi quấy rối": <UserX className="h-5 w-5 text-pink-500" />
};

type ActionLog = {
    action: string;
    timestamp: string;
    note: string;
};

export function ReportDetailPage({ reportId }: { reportId: string }) {
    const router = useRouter();
    const locale = useLocale();

    const report = MOCK_REPORTS.find((r) => r.id === reportId);

    const [status, setStatus] = useState<ReportStatus>(report?.status ?? "pending");
    const [adminNote, setAdminNote] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [actionLogs, setActionLogs] = useState<ActionLog[]>([
        {
            action: "pending",
            timestamp: "20 tháng 1, 2024 - 09:00",
            note: "Báo cáo được tạo và đang chờ xử lý."
        }
    ]);

    if (!report) {
        return (
            <div className="min-h-screen bg-[#F8F8F8]">
                <div className="flex min-h-screen">
                    <DashboardSidebar />
                    <main className="flex-1">
                        <Header userProfile={null} />
                        <div className="flex h-64 items-center justify-center">
                            <p className="text-[#6F6B99]">Không tìm thấy báo cáo</p>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            const now = new Date();
            const formatted = `${now.getDate()} tháng ${now.getMonth() + 1}, ${now.getFullYear()} - ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
            setActionLogs((prev) => [
                ...prev,
                {
                    action: status,
                    timestamp: formatted,
                    note: adminNote || "Không có ghi chú."
                }
            ]);
            setAdminNote("");
            setIsSaving(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        }, 800);
    };

    const currentStep = STATUS_ORDER[status];

    return (
        <div className="min-h-screen bg-[#F8F8F8]">
            <div className="flex min-h-screen">
                <DashboardSidebar />
                <main className="flex-1">
                    <Header userProfile={null} />

                    <div className="px-6 py-6">
                        {/* Back */}
                        <button
                            type="button"
                            onClick={() => router.push(`/${locale}/admin/reports`)}
                            className="mb-6 inline-flex cursor-pointer items-center gap-1.5 text-[#6F6B99] text-sm transition-colors hover:text-[#261E33]">
                            <ArrowLeft className="h-4 w-4" />
                            Quay lại danh sách báo cáo
                        </button>

                        {/* Main card */}
                        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                            {/* Card Header */}
                            <div className="flex flex-col gap-4 border-gray-100 border-b px-8 py-6 md:flex-row md:items-start md:justify-between">
                                <div>
                                    <div className="mb-1 flex items-center gap-2">
                                        {TYPE_ICON[report.reportType]}
                                        <h1 className="font-bold text-2xl text-[#261E33]">{report.title}</h1>
                                    </div>
                                    <p className="text-[#6F6B99] text-sm">{report.subtitle}</p>
                                </div>

                                {/* Status badge */}
                                <div
                                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-medium text-sm ${
                                        status === "pending"
                                            ? "border-amber-200 bg-amber-50 text-amber-600"
                                            : status === "reviewing"
                                              ? "border-orange-200 bg-orange-50 text-[#FF5F3D]"
                                              : "border-green-200 bg-green-50 text-green-600"
                                    }`}>
                                    {status === "pending" && <Clock className="h-4 w-4" />}
                                    {status === "reviewing" && <Eye className="h-4 w-4" />}
                                    {status === "resolved" && <Shield className="h-4 w-4" />}
                                    {status === "reviewing"
                                        ? "Đang Chờ Xử Lý"
                                        : status === "pending"
                                          ? "Chờ xử lý"
                                          : "Đã giải quyết"}
                                </div>
                            </div>

                            <div className="px-8 py-6">
                                {/* Progress steps */}
                                <div className="mb-8">
                                    <div className="flex items-center gap-0">
                                        {STATUS_STEPS.map((step, idx) => {
                                            const isComplete = STATUS_ORDER[step.key] < currentStep;
                                            const isActive = step.key === status;
                                            return (
                                                <div key={step.key} className="flex flex-1 items-center">
                                                    <div className="flex flex-col items-center">
                                                        <div
                                                            className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                                                                isComplete
                                                                    ? "border-green-500 bg-green-500 text-white"
                                                                    : isActive
                                                                      ? "border-[#FF5F3D] bg-[#FF5F3D] text-white"
                                                                      : "border-gray-300 bg-white text-gray-400"
                                                            }`}>
                                                            {isComplete ? (
                                                                <CheckCircle2 className="h-4 w-4" />
                                                            ) : (
                                                                step.icon
                                                            )}
                                                        </div>
                                                        <p
                                                            className={`mt-2 font-medium text-xs ${isActive ? "text-[#FF5F3D]" : isComplete ? "text-green-600" : "text-gray-400"}`}>
                                                            {step.label}
                                                        </p>
                                                    </div>
                                                    {idx < STATUS_STEPS.length - 1 && (
                                                        <div
                                                            className={`mb-5 h-0.5 flex-1 transition-colors ${STATUS_ORDER[STATUS_STEPS[idx + 1].key] <= currentStep ? "bg-green-400" : "bg-gray-200"}`}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 2-col info grid */}
                                <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                                    {/* Reporter */}
                                    <div className="rounded-xl border border-gray-100 bg-[#F8F8F8] p-5">
                                        <p className="mb-3 font-semibold text-[#6F6B99] text-xs uppercase tracking-wider">
                                            Người báo cáo
                                        </p>
                                        <p className="font-semibold text-[#261E33]">{report.reporterName}</p>
                                        <p className="text-[#6F6B99] text-sm">{report.reporterEmail}</p>
                                    </div>

                                    {/* Report Type */}
                                    <div className="rounded-xl border border-gray-100 bg-[#F8F8F8] p-5">
                                        <p className="mb-3 font-semibold text-[#6F6B99] text-xs uppercase tracking-wider">
                                            Loại báo cáo
                                        </p>
                                        <div className="flex items-center gap-2">
                                            {TYPE_ICON[report.reportType]}
                                            <p className="font-semibold text-[#261E33]">{report.reportType}</p>
                                        </div>
                                    </div>

                                    {/* Report Date */}
                                    <div className="rounded-xl border border-gray-100 bg-[#F8F8F8] p-5">
                                        <p className="mb-3 font-semibold text-[#6F6B99] text-xs uppercase tracking-wider">
                                            Ngày báo cáo
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-[#6F6B99]" />
                                            <p className="font-semibold text-[#261E33]">{report.reportDate}</p>
                                        </div>
                                    </div>

                                    {/* Target Content */}
                                    {report.targetContent && (
                                        <div className="rounded-xl border border-gray-100 bg-[#F8F8F8] p-5">
                                            <p className="mb-3 font-semibold text-[#6F6B99] text-xs uppercase tracking-wider">
                                                Nội dung bị báo cáo
                                            </p>
                                            <p className="font-semibold text-[#261E33]">{report.targetContent}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Description */}
                                <div className="mb-6 rounded-xl border border-gray-200 p-6">
                                    <h2 className="mb-3 font-semibold text-[#261E33]">{report.title}</h2>
                                    <p className="text-[#6F6B99] text-sm leading-relaxed">{report.description}</p>
                                </div>

                                {/* Action Logs */}
                                {actionLogs.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="mb-3 font-semibold text-[#261E33]">Lịch sử xử lý</h3>
                                        <div className="space-y-2">
                                            {actionLogs.map((log, i) => (
                                                <div
                                                    key={i}
                                                    className="flex items-start gap-3 rounded-lg border border-gray-100 bg-[#F8F8F8] px-4 py-3">
                                                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FF5F3D]/10">
                                                        <Shield className="h-3.5 w-3.5 text-[#FF5F3D]" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <p className="font-medium text-[#261E33] text-sm">
                                                                Trạng thái:{" "}
                                                                <span className="text-[#FF5F3D]">
                                                                    {STATUS_LABEL[log.action as ReportStatus]}
                                                                </span>
                                                            </p>
                                                            <p className="text-[#6F6B99] text-xs">{log.timestamp}</p>
                                                        </div>
                                                        <p className="mt-0.5 text-[#6F6B99] text-xs">{log.note}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Update Section */}
                                <div className="rounded-xl border border-gray-300 border-dashed p-6">
                                    <h3 className="mb-4 font-semibold text-[#261E33]">Cập nhật xử lý</h3>

                                    <div className="mb-4">
                                        <label className="mb-2 block font-medium text-[#6F6B99] text-sm">
                                            Ghi chú xử lý (tuỳ chọn)
                                        </label>
                                        <textarea
                                            value={adminNote}
                                            onChange={(e) => setAdminNote(e.target.value)}
                                            placeholder="Nhập ghi chú về hành động xử lý..."
                                            rows={3}
                                            className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-[#FF5F3D] focus:outline-none focus:ring-2 focus:ring-[#FF5F3D]/20"
                                        />
                                    </div>

                                    <div className="flex items-center justify-end gap-3">
                                        <div className="flex items-center gap-2">
                                            <label className="font-medium text-[#261E33] text-sm">Trạng thái:</label>
                                            <select
                                                value={status}
                                                onChange={(e) => setStatus(e.target.value as ReportStatus)}
                                                className="cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#FF5F3D] focus:outline-none focus:ring-2 focus:ring-[#FF5F3D]/20">
                                                <option value="pending">Đang chờ xử lý</option>
                                                <option value="reviewing">Đang xem xét</option>
                                                <option value="resolved">Đã giải quyết</option>
                                            </select>
                                        </div>

                                        <Button
                                            onClick={handleSave}
                                            disabled={isSaving}
                                            className={`min-w-[90px] transition-all ${
                                                saved
                                                    ? "bg-green-500 hover:bg-green-600"
                                                    : "bg-[#FF5F3D] hover:bg-[#ff4620]"
                                            }`}>
                                            {isSaving ? (
                                                <span className="flex items-center gap-2">
                                                    <svg
                                                        className="h-4 w-4 animate-spin"
                                                        viewBox="0 0 24 24"
                                                        fill="none">
                                                        <circle
                                                            className="opacity-25"
                                                            cx="12"
                                                            cy="12"
                                                            r="10"
                                                            stroke="currentColor"
                                                            strokeWidth="4"
                                                        />
                                                        <path
                                                            className="opacity-75"
                                                            fill="currentColor"
                                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                                        />
                                                    </svg>
                                                    Đang lưu...
                                                </span>
                                            ) : saved ? (
                                                <span className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    Đã lưu!
                                                </span>
                                            ) : (
                                                "Lưu"
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
