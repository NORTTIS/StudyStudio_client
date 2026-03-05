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

type DeleteNewsModalProps = {
    news: News;
    onClose: () => void;
};

export function DeleteNewsModal({ news, onClose }: DeleteNewsModalProps) {
    const t = useTranslations("AdminNews");
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        // TODO: Replace with actual API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsDeleting(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="relative w-full max-w-md rounded-xl border border-gray-200 bg-white p-6">
                {/* Header */}
                <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                            <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                        </div>
                        <div>
                            <h2 className="font-bold text-[#261E33] text-lg">{t("deleteModal.title")}</h2>
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

                {/* Content */}
                <div className="mb-6">
                    <p className="mb-3 text-[#6F6B99] text-sm">
                        {t("deleteModal.message")} <span className="font-semibold text-[#261E33]">"{news.title}"</span>?
                    </p>
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                        <p className="text-red-700 text-xs">{t("deleteModal.warning")}</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3">
                    <Button
                        type="button"
                        onClick={onClose}
                        variant="outline"
                        className="border-gray-300 text-[#261E33] hover:bg-gray-50">
                        {t("deleteModal.cancel")}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-red-600 text-white hover:bg-red-700">
                        {isDeleting ? t("deleteModal.deleting") : t("deleteModal.delete")}
                    </Button>
                </div>
            </div>
        </div>
    );
}
