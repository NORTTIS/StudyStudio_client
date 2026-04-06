"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TaskStatusEditor, type TaskStatusItem } from "./TaskStatusEditor";
import { createTemplate } from "@/api/admin-templates";
import { useToast } from "@/hooks/use-toast";

interface CreateTemplateModalProps {
    onClose: () => void;
    onSuccess: () => void;
    locale?: string;
}

export function CreateTemplateModal({ onClose, onSuccess, locale = "vi" }: CreateTemplateModalProps) {
    const { toast } = useToast();
    const [groupName, setGroupName] = useState("");
    const [description, setDescription] = useState("");
    const [taskStatuses, setTaskStatuses] = useState<TaskStatusItem[]>([
        { statusId: "new-1", statusName: "To Do", position: 0 },
        { statusId: "new-2", statusName: "In Progress", position: 1 },
        { statusId: "new-3", statusName: "Done", position: 2 }
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [nameError, setNameError] = useState(false);

    const handleSubmit = async () => {
        if (!groupName.trim()) {
            setNameError(true);
            return;
        }

        const validStatuses = taskStatuses.filter((s) => s.statusName.trim());
        if (validStatuses.length === 0) {
            toast({
                description: locale === "vi"
                    ? "Cần ít nhất 1 cột Kanban với tên hợp lệ."
                    : "At least 1 kanban column with a valid name is required.",
                variant: "destructive"
            });
            return;
        }

        setIsSubmitting(true);
        setNameError(false);

        try {
            const result = await createTemplate(
                {
                    groupName: groupName.trim(),
                    description: description.trim() || undefined,
                    groupTaskStatuses: validStatuses
                },
                locale
            );

            if (result.status === "success") {
                toast({
                    description: locale === "vi"
                        ? "Template đã được tạo thành công."
                        : "Template created successfully."
                });
                onSuccess();
                onClose();
            } else {
                toast({
                    description: result.message || (locale === "vi"
                        ? "Không thể tạo template."
                        : "Failed to create template."),
                    variant: "destructive"
                });
            }
        } catch {
            toast({
                description: locale === "vi"
                    ? "Có lỗi xảy ra khi tạo template."
                    : "An error occurred while creating the template.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const labelTitle = locale === "vi" ? "Tạo Template mới" : "Create new Template";
    const labelSubtitle = locale === "vi"
        ? "Tạo template nhóm học tập mới cho người dùng"
        : "Create a new study group template for users";
    const labelName = locale === "vi" ? "Tên template" : "Template name";
    const labelNamePlaceholder = locale === "vi"
        ? "VD: Template học tập Kỹ thuật..."
        : "e.g: Engineering Study Template...";
    const labelDescription = locale === "vi" ? "Mô tả" : "Description";
    const labelDescriptionPlaceholder = locale === "vi"
        ? "Mô tả ngắn gọn về template này..."
        : "Brief description of this template...";
    const labelTaskStatuses = locale === "vi" ? "Các cột Kanban" : "Kanban Columns";
    const labelTaskStatusesHint = locale === "vi"
        ? "Thiết lập các cột trạng thái công việc mặc định cho template."
        : "Set the default task status columns for this template.";
    const labelCancel = locale === "vi" ? "Hủy" : "Cancel";
    const labelCreate = locale === "vi" ? "Tạo Template" : "Create Template";
    const labelCreating = locale === "vi" ? "Đang tạo..." : "Creating...";
    const labelKanbanConfig = locale === "vi" ? "Cấu hình Kanban" : "Kanban Configuration";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#E5E5E5] bg-white shadow-xl">
                {/* Header */}
                <div className="sticky top-0 z-10 border-b border-[#E5E5E5] bg-white px-6 py-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="mb-1 font-bold text-2xl text-[#261E33] leading-tight">{labelTitle}</h2>
                            <p className="text-sm text-[#6F6B99]">{labelSubtitle}</p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="ml-4 flex-shrink-0 rounded-lg p-2 text-[#6F6B99] transition-all duration-150 hover:bg-[#F8F8F8] hover:text-[#261E33]"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Form */}
                <div className="space-y-6 px-6 py-6">
                    {/* Template name */}
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-[#261E33]">
                            {labelName} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={groupName}
                            onChange={(e) => {
                                setGroupName(e.target.value);
                                if (e.target.value.trim()) setNameError(false);
                            }}
                            placeholder={labelNamePlaceholder}
                            maxLength={100}
                            className={`w-full rounded-xl border px-4 py-3 text-sm font-medium text-[#261E33] placeholder:text-[#6F6B99]/50 focus:outline-none focus:ring-2 transition-colors duration-150 ${
                                nameError
                                    ? "border-red-400 bg-red-50/50 focus:border-red-400 focus:ring-red-200"
                                    : "border-[#E5E5E5] focus:border-[#FF5F3D] focus:ring-[#FF5F3D]/10"
                            }`}
                        />
                        {nameError && (
                            <p className="mt-1.5 text-xs text-red-500">
                                {locale === "vi" ? "Tên template không được để trống." : "Template name is required."}
                            </p>
                        )}
                    </div>

                    {/* Description */}
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-[#261E33]">
                            {labelDescription}
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={labelDescriptionPlaceholder}
                            rows={3}
                            maxLength={500}
                            className="w-full rounded-xl border border-[#E5E5E5] px-4 py-3 text-sm text-[#261E33] placeholder:text-[#6F6B99]/50 focus:border-[#FF5F3D] focus:outline-none focus:ring-2 focus:ring-[#FF5F3D]/10 transition-colors duration-150 resize-none"
                        />
                    </div>

                    {/* Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-[#E5E5E5]" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-white px-3 text-xs font-medium uppercase tracking-wider text-[#6F6B99]">
                                {labelKanbanConfig}
                            </span>
                        </div>
                    </div>

                    {/* Task statuses */}
                    <div>
                        <div className="mb-3">
                            <label className="block text-sm font-semibold text-[#261E33]">
                                {labelTaskStatuses}
                            </label>
                            <p className="mt-0.5 text-xs text-[#6F6B99]">{labelTaskStatusesHint}</p>
                        </div>
                        <TaskStatusEditor
                            items={taskStatuses}
                            onChange={setTaskStatuses}
                            disabled={isSubmitting}
                            locale={locale}
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="sticky bottom-0 z-10 border-t border-[#E5E5E5] bg-white px-6 py-4">
                    <div className="flex items-center justify-end gap-3">
                        <Button
                            type="button"
                            onClick={onClose}
                            variant="outline"
                            disabled={isSubmitting}
                            className="border-[#E5E5E5] text-[#261E33] hover:bg-[#F8F8F8] hover:border-[#261E33]/20">
                            {labelCancel}
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !groupName.trim()}
                            className="bg-[#FF5F3D] text-white shadow-sm hover:bg-[#ff4620] active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed">
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    {labelCreating}
                                </span>
                            ) : labelCreate}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
