"use client";

import { useEffect, useState } from "react";
import { Empty } from "antd";
import {
    getAdminAnnouncements,
    createAdminAnnouncement,
    updateAdminAnnouncement,
    deleteAdminAnnouncement,
    type AdminAnnouncement,
    type CreateAnnouncementRequest,
    type UpdateAnnouncementRequest,
    getAnnouncementTypeLabel,
    getAnnouncementTypeColor,
    ANNOUNCEMENT_TYPES
} from "@/api/admin-announcements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export function AdminAnnouncementsTab() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<AdminAnnouncement | null>(null);

    const [formData, setFormData] = useState({
        title: "",
        content: "",
        type: 0,
        isActive: true,
        publishedAt: new Date().toISOString().slice(0, 16) // Format for datetime-local input
    });

    // Load announcements data
    const loadAnnouncements = async () => {
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
    };

    useEffect(() => {
        loadAnnouncements();
    }, []);

    const resetForm = () => {
        setFormData({
            title: "",
            content: "",
            type: 0,
            isActive: true,
            publishedAt: new Date().toISOString().slice(0, 16)
        });
    };

    const handleCreate = () => {
        resetForm();
        setIsCreateModalOpen(true);
    };

    const handleEdit = (announcement: AdminAnnouncement) => {
        setSelectedAnnouncement(announcement);
        setFormData({
            title: announcement.title,
            content: announcement.content,
            type: parseInt(announcement.type) || 0,
            isActive: announcement.isActive,
            publishedAt: new Date(announcement.publishedAt).toISOString().slice(0, 16)
        });
        setIsEditModalOpen(true);
    };

    const handleSubmitCreate = async () => {
        if (!formData.title.trim() || !formData.content.trim()) {
            toast({
                description: "Vui lòng điền đầy đủ tiêu đề và nội dung",
                variant: "destructive"
            });
            return;
        }

        try {
            const request: CreateAnnouncementRequest = {
                title: formData.title.trim(),
                content: formData.content.trim(),
                type: formData.type,
                isActive: formData.isActive,
                publishedAt: new Date(formData.publishedAt).toISOString()
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
        }
    };

    const handleSubmitEdit = async () => {
        if (!selectedAnnouncement || !formData.title.trim() || !formData.content.trim()) {
            toast({
                description: "Vui lòng điền đầy đủ tiêu đề và nội dung",
                variant: "destructive"
            });
            return;
        }

        try {
            const request: UpdateAnnouncementRequest = {
                announcementId: selectedAnnouncement.announcementId,
                title: formData.title.trim(),
                content: formData.content.trim(),
                type: formData.type,
                isActive: formData.isActive,
                publishedAt: new Date(formData.publishedAt).toISOString()
            };

            const result = await updateAdminAnnouncement(request, "vi");

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
        }
    };

    const handleDelete = async (announcement: AdminAnnouncement) => {
        if (!confirm(`Bạn có chắc chắn muốn xóa thông báo "${announcement.title}"?`)) {
            return;
        }

        try {
            const result = await deleteAdminAnnouncement(announcement.announcementId, "vi");

            if (result.status === "success") {
                toast({
                    description: "Xóa thông báo thành công!",
                    variant: "default"
                });
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
                <Button
                    onClick={handleCreate}
                    className="bg-[#FF5F3D] hover:bg-[#ff4620]"
                >
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
                                    <p className="text-[#261E33] font-medium mb-2">Không thể tải dữ liệu</p>
                                    <p className="text-[#6F6B99] text-sm mb-4">{error}</p>
                                    <Button
                                        onClick={loadAnnouncements}
                                        className="bg-[#FF5F3D] hover:bg-[#ff4620]"
                                    >
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
                                    <p className="text-[#261E33] font-medium mb-2">Chưa có thông báo nào</p>
                                    <p className="text-[#6F6B99] text-sm mb-4">Tạo thông báo đầu tiên để bắt đầu.</p>
                                    <Button
                                        onClick={handleCreate}
                                        className="bg-[#FF5F3D] hover:bg-[#ff4620]"
                                    >
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
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="mb-2 flex items-center gap-3">
                                            <h4 className="font-semibold text-[#261E33] text-lg">{announcement.title}</h4>
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getAnnouncementTypeColor(parseInt(announcement.type) || 0)}`}>
                                                {getAnnouncementTypeLabel(parseInt(announcement.type) || 0)}
                                            </span>
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${announcement.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                {announcement.isActive ? 'Đang hoạt động' : 'Tạm dừng'}
                                            </span>
                                        </div>
                                        <p className="text-[#6F6B99] text-sm mb-3 line-clamp-2">{announcement.content}</p>
                                        <div className="flex items-center gap-4 text-[#6F6B99] text-xs">
                                            <span>Tạo: {formatDate(announcement.createdAt)}</span>
                                            <span>Xuất bản: {formatDate(announcement.publishedAt)}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleEdit(announcement)}
                                        >
                                            Chỉnh sửa
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDelete(announcement)}
                                            className="text-red-600 hover:text-red-700 hover:border-red-300"
                                        >
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
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="font-bold text-[#261E33] text-xl">Tạo thông báo mới</h2>
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="text-[#6F6B99] transition-colors hover:text-[#261E33]"
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="mb-2 block font-medium text-[#261E33] text-sm">Tiêu đề *</label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Nhập tiêu đề thông báo"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block font-medium text-[#261E33] text-sm">Nội dung *</label>
                                <Textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                    placeholder="Nhập nội dung thông báo"
                                    rows={5}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-2 block font-medium text-[#261E33] text-sm">Loại thông báo</label>
                                    <select
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                        value={formData.type}
                                        onChange={(e) => setFormData(prev => ({ ...prev, type: Number(e.target.value) }))}
                                    >
                                        {Object.entries(ANNOUNCEMENT_TYPES).map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block font-medium text-[#261E33] text-sm">Thời gian xuất bản</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                        value={formData.publishedAt}
                                        onChange={(e) => setFormData(prev => ({ ...prev, publishedAt: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    id="isActive"
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                                    className="h-4 w-4 text-[#FF5F3D] focus:ring-[#FF5F3D] border-gray-300 rounded"
                                />
                                <label htmlFor="isActive" className="font-medium text-[#261E33] text-sm">
                                    Kích hoạt thông báo ngay
                                </label>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} className="flex-1">
                                Hủy
                            </Button>
                            <Button onClick={handleSubmitCreate} className="flex-1 bg-[#FF5F3D] hover:bg-[#ff4620]">
                                Tạo thông báo
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && selectedAnnouncement && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="font-bold text-[#261E33] text-xl">Chỉnh sửa thông báo</h2>
                            <button
                                type="button"
                                onClick={() => setIsEditModalOpen(false)}
                                className="text-[#6F6B99] transition-colors hover:text-[#261E33]"
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="mb-2 block font-medium text-[#261E33] text-sm">Tiêu đề *</label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Nhập tiêu đề thông báo"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block font-medium text-[#261E33] text-sm">Nội dung *</label>
                                <Textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                    placeholder="Nhập nội dung thông báo"
                                    rows={5}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-2 block font-medium text-[#261E33] text-sm">Loại thông báo</label>
                                    <select
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                        value={formData.type}
                                        onChange={(e) => setFormData(prev => ({ ...prev, type: Number(e.target.value) }))}
                                    >
                                        {Object.entries(ANNOUNCEMENT_TYPES).map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block font-medium text-[#261E33] text-sm">Thời gian xuất bản</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                        value={formData.publishedAt}
                                        onChange={(e) => setFormData(prev => ({ ...prev, publishedAt: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    id="isActiveEdit"
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                                    className="h-4 w-4 text-[#FF5F3D] focus:ring-[#FF5F3D] border-gray-300 rounded"
                                />
                                <label htmlFor="isActiveEdit" className="font-medium text-[#261E33] text-sm">
                                    Kích hoạt thông báo
                                </label>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="flex-1">
                                Hủy
                            </Button>
                            <Button onClick={handleSubmitEdit} className="flex-1 bg-[#FF5F3D] hover:bg-[#ff4620]">
                                Cập nhật thông báo
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}