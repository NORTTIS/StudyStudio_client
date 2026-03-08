"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type News = {
    id: string;
    title: string;
    content: string;
    type: "System" | "Update" | "Maintenance" | "Announcement";
    status: "Published" | "Draft" | "Archived";
    priority: "Low" | "Normal" | "High" | "Urgent";
    author: string;
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
};

type EditNewsModalProps = {
    news: News;
    onClose: () => void;
};

export function EditNewsModal({ news, onClose }: EditNewsModalProps) {
    const t = useTranslations("AdminNews");
    const [title, setTitle] = useState(news.title);
    const [content, setContent] = useState(news.content);
    const [type, setType] = useState(news.type);
    const [priority, setPriority] = useState(news.priority);
    const [status, setStatus] = useState(news.status);
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
                        <h2 className="mb-2 font-bold text-2xl text-[#261E33]">{t("editModal.title")}</h2>
                        <p className="text-[#6F6B99] text-sm">{t("editModal.subtitle")}</p>
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
                        <label className="mb-2 block font-medium text-[#261E33] text-sm">
                            {t("editModal.titleLabel")} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t("editModal.titlePlaceholder")}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#FF5F3D] focus:outline-none focus:ring-2 focus:ring-[#FF5F3D]/20"
                        />
                    </div>

                    {/* Content */}
                    <div>
                        <label className="mb-2 block font-medium text-[#261E33] text-sm">
                            {t("editModal.contentLabel")} <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder={t("editModal.contentPlaceholder")}
                            rows={6}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#FF5F3D] focus:outline-none focus:ring-2 focus:ring-[#FF5F3D]/20"
                        />
                    </div>

                    {/* Type and Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-2 block font-medium text-[#261E33] text-sm">
                                {t("editModal.typeLabel")}
                            </label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as any)}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#FF5F3D] focus:outline-none focus:ring-2 focus:ring-[#FF5F3D]/20">
                                <option value="System">System</option>
                                <option value="Update">Update</option>
                                <option value="Maintenance">Maintenance</option>
                                <option value="Announcement">Announcement</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block font-medium text-[#261E33] text-sm">
                                {t("editModal.priorityLabel")}
                            </label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as any)}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#FF5F3D] focus:outline-none focus:ring-2 focus:ring-[#FF5F3D]/20">
                                <option value="Low">Low</option>
                                <option value="Normal">Normal</option>
                                <option value="High">High</option>
                                <option value="Urgent">Urgent</option>
                            </select>
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="mb-2 block font-medium text-[#261E33] text-sm">
                            {t("editModal.statusLabel")}
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as any)}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#FF5F3D] focus:outline-none focus:ring-2 focus:ring-[#FF5F3D]/20">
                            <option value="Draft">Draft</option>
                            <option value="Published">Published</option>
                            <option value="Archived">Archived</option>
                        </select>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex items-center justify-end gap-3">
                    <Button
                        type="button"
                        onClick={onClose}
                        variant="outline"
                        className="border-gray-300 text-[#261E33] hover:bg-gray-50">
                        {t("editModal.cancel")}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !title.trim() || !content.trim()}
                        className="bg-[#FF5F3D] text-white hover:bg-[#ff4620]">
                        {isSubmitting ? t("editModal.updating") : t("editModal.update")}
                    </Button>
                </div>
            </div>
        </div>
    );
}
