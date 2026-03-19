"use client";

import { Empty } from "antd";
import { useCallback, useEffect, useState } from "react";
import {
    type AdminAnnouncement,
    ANNOUNCEMENT_TYPES,
    type CreateAnnouncementRequest,
    createAdminAnnouncement,
    deleteAdminAnnouncement,
    getAdminAnnouncements,
    getAnnouncementTypeColor,
    getAnnouncementTypeLabel,
    TYPE_STRING_TO_NUMBER,
    type UpdateAnnouncementRequest,
    updateAdminAnnouncement
} from "@/api/admin-announcements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

/**
 * Helper to get local date string for datetime-local input (YYYY-MM-DDTHH:mm)
 * This ensures the picker displays time correctly in the user's local timezone.
 */
const getLocalDatetimeString = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

export function AdminAnnouncementsTab() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<AdminAnnouncement | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState(() => {
        const now = new Date();
        const futureTime = new Date(now.getTime() + 5 * 60000); // 5 minutes in future
        return {
            title: "",
            content: "",
            type: 0,
            isActive: true,
            publishedAt: getLocalDatetimeString(futureTime),
            createdAt: getLocalDatetimeString(now)
        };
    });

    const [formErrors, setFormErrors] = useState({
        title: false,
        content: false
    });

    // Load announcements data
    const loadAnnouncements = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await getAdminAnnouncements("vi");

            if (result.status === "success" && result.data) {
                setAnnouncements(result.data);
                console.log("Đã tải dữ liệu announcements thành công:", result.data);
            } else {
                setError(result.message || "Không thể tải dữ liệu thông báo");
                console.error("API announcements thất bại:", result.message);
                setAnnouncements([]);
            }
        } catch (error) {
            const errorMessage = "Có lỗi xảy ra khi tải dữ liệu thông báo";
            setError(errorMessage);
            console.error("Lỗi khi tải announcements:", error);
            setAnnouncements([]);

            toast({
                description: errorMessage,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]); // Empty dependency - chỉ load một lần khi mount, bỏ toast để tránh infinite loop

    useEffect(() => {
        loadAnnouncements();
    }, [loadAnnouncements]); // Empty dependency - chỉ load một lần khi mount

    const resetForm = () => {
        const now = new Date();
        const futureTime = new Date(now.getTime() + 5 * 60000); // 5 minutes in future

        setFormData({
            title: "",
            content: "",
            type: 0,
            isActive: true,
            publishedAt: getLocalDatetimeString(futureTime),
            createdAt: getLocalDatetimeString(now)
        });
        setFormErrors({
            title: false,
            content: false
        });
    };

    const handleCreate = () => {
        resetForm();
        setIsCreateModalOpen(true);
    };

    const handleEdit = (announcement: AdminAnnouncement) => {
        setSelectedAnnouncement(announcement);
        const typeNumber =
            typeof announcement.type === "string"
                ? TYPE_STRING_TO_NUMBER[announcement.type] || 0
                : Number.parseInt(announcement.type, 10) || 0;

        setFormData({
            title: announcement.title,
            content: announcement.content,
            type: typeNumber,
            isActive: announcement.isActive,
            publishedAt: getLocalDatetimeString(new Date(announcement.publishedAt)),
            createdAt: getLocalDatetimeString(new Date(announcement.createdAt))
        });
        setIsEditModalOpen(true);
        console.log("📝 handleEdit: Form data set and modal opened", {
            announcementId: announcement.announcementId,
            title: announcement.title,
            content: announcement.content,
            type: typeNumber,
            publishedAt: getLocalDatetimeString(new Date(announcement.publishedAt)),
            createdAt: getLocalDatetimeString(new Date(announcement.createdAt))
        });
    };

    const handleSubmitCreate = async () => {
        console.log("🚀 Submit Create clicked", formData);
        // Reset errors
        setFormErrors({ title: false, content: false });

        let hasError = false;

        // Kiểm tra tiêu đề
        if (!formData.title.trim()) {
            console.log("❌ Title is empty");
            setFormErrors((prev) => ({ ...prev, title: true }));
            toast({
                description: "⚠️ Vui lòng nhập tiêu đề thông báo",
                variant: "destructive"
            });
            hasError = true;
        }

        // Kiểm tra nội dung
        if (!formData.content.trim()) {
            setFormErrors((prev) => ({ ...prev, content: true }));
            toast({
                description: "⚠️ Vui lòng nhập nội dung thông báo",
                variant: "destructive"
            });
            hasError = true;
        }

        if (hasError) return;

        if (formData.title.trim().length > 50) {
            toast({
                description: "Tiêu đề không được vượt quá 50 ký tự",
                variant: "destructive"
            });
            return;
        }

        if (formData.content.trim().length > 500) {
            toast({
                description: "Nội dung không được vượt quá 500 ký tự",
                variant: "destructive"
            });
            return;
        }

        // Kiểm tra thời gian xuất bản phải sau thời gian tạo
        const createdTime = new Date(formData.createdAt);
        const publishedTime = new Date(formData.publishedAt);

        if (publishedTime < createdTime) {
            console.log("❌ publishedAt is before createdAt");
            toast({
                description: "⚠️ Thời gian xuất bản phải sau hoặc bằng thời gian tạo",
                variant: "destructive"
            });
            return;
        }

        // Kiểm tra trùng lặp tiêu đề - chỉ cảnh báo, không chặn
        const duplicateTitle = announcements.find(
            (announcement) => announcement.title.toLowerCase().trim() === formData.title.toLowerCase().trim()
        );
        if (duplicateTitle) {
            console.log("⚠️ Warning: Duplicate title found in Create mode:", duplicateTitle);
            toast({
                description: "Thông báo: Tiêu đề này đã tồn tại",
                variant: "default"
            });
            // Không chặn hành động tạo mới, cho phép người dùng quyết định
        }

        setIsSubmitting(true);
        console.log("🔄 Starting create API call...");
        try {
            const request: CreateAnnouncementRequest = {
                title: formData.title.trim(),
                content: formData.content.trim(),
                type: formData.type,
                isActive: formData.isActive,
                publishedAt: new Date(formData.publishedAt).toISOString(),
                createdAt: new Date(formData.createdAt).toISOString()
            };

            const result = await createAdminAnnouncement(request, "vi");

            if (result.status === "success") {
                toast({
                    description: "Tạo thông báo thành công!",
                    variant: "default"
                });
                setIsCreateModalOpen(false);
                resetForm();
                loadAnnouncements(); // Reload data
            } else {
                toast({
                    description: result.message || "Tạo thông báo thất bại",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Failed to create announcement:", error);
            toast({
                description: "Có lỗi xảy ra khi tạo thông báo",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitEdit = async () => {
        console.log("🚀 Submit Edit clicked", formData);
        if (!selectedAnnouncement) {
            console.log("❌ No selected announcement");
            toast({
                description: "Không tìm thấy thông báo để chỉnh sửa",
                variant: "destructive"
            });
            return;
        }

        // Reset errors
        setFormErrors({ title: false, content: false });

        let hasError = false;

        // Kiểm tra tiêu đề
        if (!formData.title.trim()) {
            console.log("❌ Validation failed: empty title");
            setFormErrors((prev) => ({ ...prev, title: true }));
            toast({
                description: "⚠️ Vui lòng nhập tiêu đề thông báo",
                variant: "destructive"
            });
            hasError = true;
        }

        // Kiểm tra nội dung
        if (!formData.content.trim()) {
            console.log("❌ Validation failed: empty content");
            setFormErrors((prev) => ({ ...prev, content: true }));
            toast({
                description: "⚠️ Vui lòng nhập nội dung thông báo",
                variant: "destructive"
            });
            hasError = true;
        }

        if (hasError) {
            console.log("❌ Validation failed: hasError is true");
            return;
        }

        if (formData.title.trim().length > 50) {
            console.log("❌ Validation failed: title too long (>50)");
            toast({
                description: "Tiêu đề không được vượt quá 50 ký tự",
                variant: "destructive"
            });
            return;
        }

        if (formData.content.trim().length > 500) {
            console.log("❌ Validation failed: content too long (>500)");
            toast({
                description: "Nội dung không được vượt quá 500 ký tự",
                variant: "destructive"
            });
            return;
        }

        // Khi chỉnh sửa, cho phép sự linh hoạt về thời gian.
        // Chỉ lưu log để debug nếu cần, không chặn hành động của người dùng
        const createdTime = new Date(formData.createdAt);
        const publishedTime = new Date(formData.publishedAt);

        console.log("🔍 Edit Submission - Time Info:", {
            createdAt: formData.createdAt,
            publishedAt: formData.publishedAt,
            createdTime: createdTime.toISOString(),
            publishedTime: publishedTime.toISOString(),
            isPublishedBeforeCreated: publishedTime < createdTime
        });

        // Bỏ qua việc chặn (return) ở đây để người dùng có thể thoải mái điều chỉnh
        if (publishedTime < createdTime) {
            console.log("⚠️ Warning: publishedTime is before createdTime, but allowed in Edit mode.");
        }

        // Kiểm tra trùng lặp tiêu đề (trừ chính nó)
        const duplicateTitle = announcements.find(
            (announcement) =>
                announcement.announcementId !== selectedAnnouncement.announcementId &&
                announcement.title.toLowerCase().trim() === formData.title.toLowerCase().trim()
        );
        if (duplicateTitle) {
            console.log("⚠️ Warning: duplicate title found but allowing edit", duplicateTitle);
            toast({
                description: "Thông báo: Tiêu đề này đã tồn tại",
                variant: "default"
            });
            // Bỏ qua việc chặn (return) để người dùng có thể thoải mái lưu
        }

        setIsSubmitting(true);
        console.log("🔄 Starting update API call...");
        try {
            console.log("📝 Preparing request object with times:", {
                publishedAt: formData.publishedAt,
                createdAt: formData.createdAt
            });

            const request: UpdateAnnouncementRequest = {
                announcementId: selectedAnnouncement.announcementId,
                title: formData.title.trim(),
                content: formData.content.trim(),
                type: formData.type,
                isActive: formData.isActive,
                publishedAt: new Date(formData.publishedAt).toISOString(),
                createdAt: new Date(formData.createdAt).toISOString()
            };

            console.log("🚀 Calling updateAdminAnnouncement with:", request);
            console.log("🔄 Type value being sent:", formData.type, typeof formData.type);

            const result = await updateAdminAnnouncement(request, "vi");

            console.log("✅ Update result:", result);

            if (result.status === "success") {
                toast({
                    description: "Cập nhật thông báo thành công!",
                    variant: "default"
                });
                setIsEditModalOpen(false);
                setSelectedAnnouncement(null);
                resetForm();
                loadAnnouncements(); // Reload data
            } else {
                toast({
                    description: result.message || "Cập nhật thông báo thất bại",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Failed to update announcement:", error);
            toast({
                description: "Có lỗi xảy ra khi cập nhật thông báo",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (announcement: AdminAnnouncement) => {
        // Sử dụng modal thay vì confirm
        setSelectedAnnouncement(announcement);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedAnnouncement) return;

        try {
            const result = await deleteAdminAnnouncement(selectedAnnouncement.announcementId, "vi");

            if (result.status === "success") {
                toast({
                    description: "Xóa thông báo thành công!",
                    variant: "default"
                });
                setIsDeleteModalOpen(false);
                setSelectedAnnouncement(null);
                loadAnnouncements(); // Reload data
            } else {
                toast({
                    description: result.message || "Xóa thông báo thất bại",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Failed to delete announcement:", error);
            toast({
                description: "Có lỗi xảy ra khi xóa thông báo",
                variant: "destructive"
            });
        }
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
            {/* Header with Create Button */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-bold text-[#261E33] text-xl">Quản lý thông báo</h2>
                    <p className="text-[#6F6B99] text-sm">Tạo và quản lý thông báo hệ thống</p>
                </div>
                <Button onClick={handleCreate} className="bg-[#FF5F3D] hover:bg-[#ff4620]">
                    Tạo thông báo mới
                </Button>
            </div>

            {/* Announcements List */}
            <div className="rounded-xl border border-gray-200 bg-white">
                <div className="border-gray-200 border-b p-6">
                    <h3 className="font-semibold text-[#261E33] text-lg">Danh sách thông báo</h3>
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
                                    <Button onClick={loadAnnouncements} className="bg-[#FF5F3D] hover:bg-[#ff4620]">
                                        Thử lại
                                    </Button>
                                </div>
                            }
                        />
                    </div>
                ) : announcements.length === 0 ? (
                    <div className="flex items-center justify-center p-12">
                        <Empty
                            description={
                                <div className="text-center">
                                    <p className="mb-2 font-medium text-[#261E33]">Chưa có thông báo nào</p>
                                    <p className="mb-4 text-[#6F6B99] text-sm">Tạo thông báo đầu tiên để bắt đầu.</p>
                                    <Button onClick={handleCreate} className="bg-[#FF5F3D] hover:bg-[#ff4620]">
                                        Tạo thông báo mới
                                    </Button>
                                </div>
                            }
                        />
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {announcements.map((announcement) => (
                            <div key={announcement.announcementId} className="p-6 hover:bg-gray-50">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-2 flex flex-wrap items-center gap-3">
                                            <h4 className="break-words font-semibold text-[#261E33] text-lg">
                                                {announcement.title}
                                            </h4>
                                            <span
                                                className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 font-semibold text-xs ${getAnnouncementTypeColor(announcement.type)}`}>
                                                {getAnnouncementTypeLabel(announcement.type)}
                                            </span>
                                            <span
                                                className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 font-semibold text-xs ${announcement.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                                                {announcement.isActive ? "Đang hoạt động" : "Tạm dừng"}
                                            </span>
                                        </div>
                                        <p className="word-wrap mb-3 max-w-2xl overflow-hidden whitespace-pre-line break-words break-all text-[#6F6B99] text-sm leading-relaxed">
                                            {announcement.content}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-4 text-[#6F6B99] text-xs">
                                            <span className="whitespace-nowrap">
                                                Tạo: {formatDate(announcement.createdAt)}
                                            </span>
                                            <span className="whitespace-nowrap">
                                                Xuất bản: {formatDate(announcement.publishedAt)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-shrink-0 gap-2">
                                        <Button size="sm" variant="outline" onClick={() => handleEdit(announcement)}>
                                            Chỉnh sửa
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDelete(announcement)}
                                            className="text-red-600 hover:border-red-300 hover:text-red-700">
                                            Xóa
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="font-bold text-[#261E33] text-xl">Tạo thông báo mới</h2>
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
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
                                <label className="mb-2 block font-medium text-[#261E33] text-sm">
                                    Tiêu đề *
                                    <span className="ml-2 text-[#6F6B99] text-xs">
                                        ({formData.title.length}/50 ký tự)
                                    </span>
                                </label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => {
                                        if (e.target.value.length <= 50) {
                                            setFormData((prev) => ({ ...prev, title: e.target.value }));
                                            // Clear error when user starts typing
                                            if (formErrors.title && e.target.value.trim()) {
                                                setFormErrors((prev) => ({ ...prev, title: false }));
                                            }
                                        }
                                    }}
                                    onBlur={(e) => {
                                        // Validate on blur
                                        if (!e.target.value.trim()) {
                                            setFormErrors((prev) => ({ ...prev, title: true }));
                                        }
                                    }}
                                    placeholder="Nhập tiêu đề thông báo"
                                    maxLength={50}
                                    className={`${formData.title.length >= 45 ? "border-amber-300 focus:border-amber-500" : ""} ${formErrors.title ? "border-red-300 focus:border-red-500" : ""}`}
                                />
                                {formErrors.title && (
                                    <p className="mt-1 text-red-600 text-xs">⚠️ Vui lòng nhập tiêu đề thông báo</p>
                                )}
                                {formData.title.length >= 45 && !formErrors.title && (
                                    <p className="mt-1 text-amber-600 text-xs">
                                        Sắp đạt giới hạn ký tự ({50 - formData.title.length} ký tự còn lại)
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="mb-2 block font-medium text-[#261E33] text-sm">
                                    Nội dung *
                                    <span className="ml-2 text-[#6F6B99] text-xs">
                                        ({formData.content.length}/500 ký tự)
                                    </span>
                                </label>
                                <Textarea
                                    value={formData.content}
                                    onChange={(e) => {
                                        if (e.target.value.length <= 500) {
                                            setFormData((prev) => ({ ...prev, content: e.target.value }));
                                            // Clear error when user starts typing
                                            if (formErrors.content && e.target.value.trim()) {
                                                setFormErrors((prev) => ({ ...prev, content: false }));
                                            }
                                        }
                                    }}
                                    onBlur={(e) => {
                                        // Validate on blur
                                        if (!e.target.value.trim()) {
                                            setFormErrors((prev) => ({ ...prev, content: true }));
                                        }
                                    }}
                                    placeholder="Nhập nội dung thông báo"
                                    rows={6}
                                    maxLength={500}
                                    className={`resize-none whitespace-pre-line ${formData.content.length >= 450 ? "border-amber-300 focus:border-amber-500" : ""} ${formErrors.content ? "border-red-300 focus:border-red-500" : ""}`}
                                />
                                {formErrors.content && (
                                    <p className="mt-1 text-red-600 text-xs">⚠️ Vui lòng nhập nội dung thông báo</p>
                                )}
                                {formData.content.length >= 450 && !formErrors.content && (
                                    <p className="mt-1 text-amber-600 text-xs">
                                        Sắp đạt giới hạn ký tự ({500 - formData.content.length} ký tự còn lại)
                                    </p>
                                )}
                                <p className="mt-1 text-[#6F6B99] text-xs">
                                    Nhấn Enter để xuống dòng. Nội dung sẽ hiển thị đúng định dạng khi xuất bản.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-2 block font-medium text-[#261E33] text-sm">
                                        Loại thông báo
                                    </label>
                                    <select
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                        value={formData.type}
                                        onChange={(e) =>
                                            setFormData((prev) => ({ ...prev, type: Number(e.target.value) }))
                                        }>
                                        {Object.entries(ANNOUNCEMENT_TYPES).map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block font-medium text-[#261E33] text-sm">
                                        Thời gian xuất bản
                                    </label>
                                    <input
                                        type="datetime-local"
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                        value={formData.publishedAt}
                                        onChange={(e) =>
                                            setFormData((prev) => ({ ...prev, publishedAt: e.target.value }))
                                        }
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block font-medium text-[#261E33] text-sm">Thời gian tạo</label>
                                <input
                                    type="datetime-local"
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    value={formData.createdAt}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, createdAt: e.target.value }))}
                                />
                                <p className="mt-1 text-[#6F6B99] text-xs">Thời gian tạo của thông báo</p>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    id="isActive"
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                                    className="h-4 w-4 rounded border-gray-300 text-[#FF5F3D] focus:ring-[#FF5F3D]"
                                />
                                <label htmlFor="isActive" className="font-medium text-[#261E33] text-sm">
                                    Kích hoạt thông báo ngay
                                </label>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setIsCreateModalOpen(false)}
                                disabled={isSubmitting}
                                className="flex-1">
                                Hủy
                            </Button>
                            <Button
                                onClick={handleSubmitCreate}
                                disabled={isSubmitting}
                                className="flex-1 bg-[#FF5F3D] hover:bg-[#ff4620]">
                                {isSubmitting ? "Đang xử lý..." : "Tạo thông báo"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && selectedAnnouncement && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="font-bold text-[#261E33] text-xl">Chỉnh sửa thông báo</h2>
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
                                <label className="mb-2 block font-medium text-[#261E33] text-sm">
                                    Tiêu đề *
                                    <span className="ml-2 text-[#6F6B99] text-xs">
                                        ({formData.title.length}/50 ký tự)
                                    </span>
                                </label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => {
                                        if (e.target.value.length <= 50) {
                                            setFormData((prev) => ({ ...prev, title: e.target.value }));
                                            // Clear error when user starts typing
                                            if (formErrors.title && e.target.value.trim()) {
                                                setFormErrors((prev) => ({ ...prev, title: false }));
                                            }
                                        }
                                    }}
                                    onBlur={(e) => {
                                        // Validate on blur
                                        if (!e.target.value.trim()) {
                                            setFormErrors((prev) => ({ ...prev, title: true }));
                                        }
                                    }}
                                    placeholder="Nhập tiêu đề thông báo"
                                    maxLength={50}
                                    className={`${formData.title.length >= 45 ? "border-amber-300 focus:border-amber-500" : ""} ${formErrors.title ? "border-red-300 focus:border-red-500" : ""}`}
                                />
                                {formErrors.title && (
                                    <p className="mt-1 text-red-600 text-xs">⚠️ Vui lòng nhập tiêu đề thông báo</p>
                                )}
                                {formData.title.length >= 45 && !formErrors.title && (
                                    <p className="mt-1 text-amber-600 text-xs">
                                        Sắp đạt giới hạn ký tự ({50 - formData.title.length} ký tự còn lại)
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="mb-2 block font-medium text-[#261E33] text-sm">
                                    Nội dung *
                                    <span className="ml-2 text-[#6F6B99] text-xs">
                                        ({formData.content.length}/500 ký tự)
                                    </span>
                                </label>
                                <Textarea
                                    value={formData.content}
                                    onChange={(e) => {
                                        if (e.target.value.length <= 500) {
                                            setFormData((prev) => ({ ...prev, content: e.target.value }));
                                            // Clear error when user starts typing
                                            if (formErrors.content && e.target.value.trim()) {
                                                setFormErrors((prev) => ({ ...prev, content: false }));
                                            }
                                        }
                                    }}
                                    onBlur={(e) => {
                                        // Validate on blur
                                        if (!e.target.value.trim()) {
                                            setFormErrors((prev) => ({ ...prev, content: true }));
                                        }
                                    }}
                                    placeholder="Nhập nội dung thông báo"
                                    rows={6}
                                    maxLength={500}
                                    className={`resize-none whitespace-pre-line ${formData.content.length >= 450 ? "border-amber-300 focus:border-amber-500" : ""} ${formErrors.content ? "border-red-300 focus:border-red-500" : ""}`}
                                />
                                {formErrors.content && (
                                    <p className="mt-1 text-red-600 text-xs">⚠️ Vui lòng nhập nội dung thông báo</p>
                                )}
                                {formData.content.length >= 450 && !formErrors.content && (
                                    <p className="mt-1 text-amber-600 text-xs">
                                        Sắp đạt giới hạn ký tự ({500 - formData.content.length} ký tự còn lại)
                                    </p>
                                )}
                                <p className="mt-1 text-[#6F6B99] text-xs">
                                    Nhấn Enter để xuống dòng. Nội dung sẽ hiển thị đúng định dạng khi xuất bản.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-2 block font-medium text-[#261E33] text-sm">
                                        Loại thông báo
                                    </label>
                                    <select
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                        value={formData.type}
                                        onChange={(e) =>
                                            setFormData((prev) => ({ ...prev, type: Number(e.target.value) }))
                                        }>
                                        {Object.entries(ANNOUNCEMENT_TYPES).map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block font-medium text-[#261E33] text-sm">
                                        Thời gian xuất bản
                                    </label>
                                    <input
                                        type="datetime-local"
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                        value={formData.publishedAt}
                                        onChange={(e) =>
                                            setFormData((prev) => ({ ...prev, publishedAt: e.target.value }))
                                        }
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block font-medium text-[#261E33] text-sm">Thời gian tạo</label>
                                <input
                                    type="datetime-local"
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    value={formData.createdAt}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, createdAt: e.target.value }))}
                                />
                                <p className="mt-1 text-[#6F6B99] text-xs">Thời gian tạo của thông báo</p>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    id="isActiveEdit"
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                                    className="h-4 w-4 rounded border-gray-300 text-[#FF5F3D] focus:ring-[#FF5F3D]"
                                />
                                <label htmlFor="isActiveEdit" className="font-medium text-[#261E33] text-sm">
                                    Kích hoạt thông báo
                                </label>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setIsEditModalOpen(false)}
                                disabled={isSubmitting}
                                className="flex-1">
                                Hủy
                            </Button>
                            <Button
                                onClick={handleSubmitEdit}
                                disabled={isSubmitting}
                                className="flex-1 bg-[#FF5F3D] hover:bg-[#ff4620]">
                                {isSubmitting ? "Đang xử lý..." : "Cập nhật thông báo"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && selectedAnnouncement && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                                <svg
                                    className="h-6 w-6 text-red-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
                                    />
                                </svg>
                            </div>
                        </div>

                        <div className="mb-6 text-center">
                            <h3 className="mb-2 font-bold text-[#261E33] text-lg">Xác nhận xóa thông báo</h3>
                            <p className="text-[#6F6B99] text-sm">
                                Bạn có chắc chắn muốn xóa thông báo "{selectedAnnouncement.title}"?
                            </p>
                            <p className="mt-2 text-[#6F6B99] text-xs">Hành động này không thể hoàn tác.</p>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsDeleteModalOpen(false);
                                    setSelectedAnnouncement(null);
                                }}
                                className="flex-1">
                                Hủy
                            </Button>
                            <Button onClick={confirmDelete} className="flex-1 bg-red-600 hover:bg-red-700">
                                Xóa thông báo
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
