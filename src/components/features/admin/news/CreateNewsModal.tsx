"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CreateNewsModalProps = {
    onClose: () => void;
};

export function CreateNewsModal({ onClose }: CreateNewsModalProps) {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [type, setType] = useState<"System" | "Update" | "Maintenance" | "Announcement">("Announcement");
    const [priority, setPriority] = useState<"Low" | "Normal" | "High" | "Urgent">("Normal");
    const [status, setStatus] = useState<"Published" | "Draft">("Draft");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!(title.trim() && content.trim())) {
            return;
        }

        setIsSubmitting(true);
        // TODO: Replace with actual API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsSubmitting(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-gray-200 bg-white p-6">
                {/* Header */}
                <div className="mb-6 flex items-start justify-between">
                    <div>
                        <h2 className="mb-2 font-bold text-2xl text-[#261E33]">Tạo tin tức mới</h2>
                        <p className="text-[#6F6B99] text-sm">Thêm tin tức hoặc thông báo mới cho hệ thống</p>
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

                {/* Form */}
                <div className="space-y-4">
                    {/* Title */}
                    <div>
                        <p className="mb-2 block font-medium text-[#261E33] text-sm">
                            Tiêu đề <span className="text-red-500">*</span>
                        </p>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Nhập tiêu đề tin tức..."
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#FF5F3D] focus:outline-none focus:ring-2 focus:ring-[#FF5F3D]/20"
                        />
                    </div>

                    {/* Content */}
                    <div>
                        <p className="mb-2 block font-medium text-[#261E33] text-sm">
                            Nội dung <span className="text-red-500">*</span>
                        </p>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Nhập nội dung chi tiết..."
                            rows={6}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#FF5F3D] focus:outline-none focus:ring-2 focus:ring-[#FF5F3D]/20"
                        />
                    </div>

                    {/* Type and Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="mb-2 block font-medium text-[#261E33] text-sm">
                                Loại tin tức
                            </p>
                            <Select value={type} onValueChange={(value) => setType(value as typeof type)}>
                                <SelectTrigger className="w-full rounded-lg px-4">
                                    <SelectValue placeholder="Loại tin tức" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="System">Hệ thống</SelectItem>
                                    <SelectItem value="Update">Cập nhật</SelectItem>
                                    <SelectItem value="Maintenance">Bảo trì</SelectItem>
                                    <SelectItem value="Announcement">Thông báo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <p className="mb-2 block font-medium text-[#261E33] text-sm">
                                Mức độ ưu tiên
                            </p>
                            <Select value={priority} onValueChange={(value) => setPriority(value as typeof priority)}>
                                <SelectTrigger className="w-full rounded-lg px-4">
                                    <SelectValue placeholder="Mức độ ưu tiên" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Low">Thấp</SelectItem>
                                    <SelectItem value="Normal">Bình thường</SelectItem>
                                    <SelectItem value="High">Cao</SelectItem>
                                    <SelectItem value="Urgent">Khẩn cấp</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <p className="mb-2 block font-medium text-[#261E33] text-sm">
                            Trạng thái
                        </p>
                        <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
                            <SelectTrigger className="w-full rounded-lg px-4">
                                <SelectValue placeholder="Trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Draft">Bản nháp</SelectItem>
                                <SelectItem value="Published">Đã xuất bản</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex items-center justify-end gap-3">
                    <Button
                        type="button"
                        onClick={onClose}
                        variant="outline"
                        className="border-gray-300 text-[#261E33] hover:bg-gray-50">
                        Hủy
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !title.trim() || !content.trim()}
                        className="bg-[#FF5F3D] text-white hover:bg-[#ff4620]">
                        {isSubmitting ? "Đang tạo..." : "Tạo tin tức"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
