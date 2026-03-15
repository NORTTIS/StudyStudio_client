"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { getAnnouncementDetail, type Notification } from "@/api/notifications";

interface NotificationDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    notificationId: string;
    locale: string;
}

export function NotificationDetailModal({ isOpen, onClose, notificationId, locale }: NotificationDetailModalProps) {
    const t = useTranslations("Notifications");
    const [notification, setNotification] = useState<Notification | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const loadNotificationDetail = useCallback(async () => {
        setIsLoading(true);
        try {
            const detail = await getAnnouncementDetail(notificationId, locale);
            setNotification(detail);
        } catch (error) {
            console.error("🔔 Modal: Lỗi khi tải chi tiết thông báo:", error);
        } finally {
            setIsLoading(false);
        }
    }, [notificationId, locale]);

    useEffect(() => {
        if (isOpen && notificationId) {
            loadNotificationDetail();
        }
    }, [isOpen, notificationId, loadNotificationDetail]);

    const getNotificationIcon = (type: Notification["type"]) => {
        switch (type) {
            case "success":
                return "✅";
            case "warning":
                return "⚠️";
            case "info":
                return "ℹ️";
            default:
                return "🔔";
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("vi-VN", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-gray-200 border-b px-6 py-4">
                    <h2 className="font-bold text-[#261E33] text-xl">{t("detailTitle")}</h2>
                    <button
                        type="button"
                        onClick={onClose}
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

                {/* Content */}
                <div className="px-6 py-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[#FF5F3D]" />
                                <p className="text-[#6F6B99] text-sm">{t("loading")}</p>
                            </div>
                        </div>
                    ) : notification ? (
                        <div className="space-y-6">
                            {/* Icon and Title */}
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                                    <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-[#261E33] text-xl">{notification.title}</h3>
                                    <p className="mt-1 text-[#6F6B99] text-sm">{formatDate(notification.date)}</p>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="rounded-lg bg-gray-50 p-4">
                                <h4 className="mb-3 font-semibold text-[#261E33]">{t("content")}</h4>
                                <div className="prose prose-sm max-w-none text-[#6F6B99]">
                                    {notification.description.split("\n").map((paragraph, index) => (
                                        <p key={index} className="mb-2 last:mb-0">
                                            {paragraph}
                                        </p>
                                    ))}
                                </div>
                            </div>

                            {/* Type Badge */}
                            <div className="flex items-center gap-2">
                                <span className="text-[#6F6B99] text-sm">{t("type")}:</span>
                                <span
                                    className={`rounded-full px-3 py-1 font-medium text-xs ${
                                        notification.type === "success"
                                            ? "bg-green-100 text-green-700"
                                            : notification.type === "warning"
                                              ? "bg-yellow-100 text-yellow-700"
                                              : notification.type === "info"
                                                ? "bg-blue-100 text-blue-700"
                                                : "bg-gray-100 text-gray-700"
                                    }`}>
                                    {notification.type === "success"
                                        ? t("typeSuccess")
                                        : notification.type === "warning"
                                          ? t("typeWarning")
                                          : notification.type === "info"
                                            ? t("typeInfo")
                                            : t("typeSystem")}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="py-12 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                                <svg
                                    className="h-8 w-8 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>
                            <h3 className="mb-2 font-semibold text-[#261E33]">{t("notFound")}</h3>
                            <p className="text-[#6F6B99] text-sm">{t("notFoundDescription")}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-gray-200 border-t px-6 py-4">
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg bg-[#FF5F3D] px-4 py-2 font-medium text-white transition-colors hover:bg-[#ff4620]">
                            {t("close")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
