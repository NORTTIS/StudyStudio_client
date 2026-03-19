"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    deleteUserAnnouncement,
    getAllAnnouncements,
    markUserAnnouncementAsRead,
    type Notification
} from "@/api/notifications";
import { NotificationDetailModal } from "./NotificationDetailModal";

const BellIcon = ({ hasUnread }: { hasUnread: boolean }) => (
    <div className="relative">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
        {hasUnread && (
            <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500">
                <div className="h-full w-full animate-ping rounded-full bg-red-400" />
            </div>
        )}
    </div>
);

export function NotificationDropdown() {
    const t = useTranslations("Notifications");
    const locale = useLocale();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedNotificationId, setSelectedNotificationId] = useState<string>("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [notificationToDelete, setNotificationToDelete] = useState<string>("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter((n) => !n.read).length;
    const hasUnread = unreadCount > 0;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const loadNotifications = useCallback(async () => {
        console.log("🔔 NotificationDropdown: Starting to load notifications...");
        setIsLoading(true);
        try {
            const data = await getAllAnnouncements(locale);

            // Check if data contains corrupted characters and provide fallback
            const cleanedData = data.map((notification) => ({
                ...notification,
                title: notification.title,
                description: notification.description
            }));

            setNotifications(cleanedData);
        } catch (error) {
            // Provide fallback notifications if API fails
            const fallbackNotifications: Notification[] = [
                {
                    id: "fallback-1",
                    title: locale === "vi" ? "Chào mừng đến Study Studio" : "Welcome to Study Studio",
                    description:
                        locale === "vi" ? "Cảm ơn bạn đã sử dụng Study Studio!" : "Thank you for using Study Studio!",
                    type: "info",
                    date: new Date().toISOString(),
                    read: false
                }
            ];
            setNotifications(fallbackNotifications);
        } finally {
            setIsLoading(false);
        }
    }, [locale]);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    const handleNotificationClick = async (notification: Notification) => {
        // Đánh dấu đã đọc nếu chưa đọc
        if (!notification.read) {
            try {
                const result = await markUserAnnouncementAsRead(notification.id, locale);
                if (result.status === "success") {
                    // Cập nhật local state
                    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
                }
            } catch (error) {
                console.error("🔔 UI: Lỗi khi đánh dấu đã đọc:", error);
                // Vẫn cập nhật local state nếu API thất bại
                setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
            }
        }

        // Mở modal chi tiết sử dụng announcementId
        setSelectedNotificationId(notification.id); // Bây giờ id chính là announcementId
        setIsDetailModalOpen(true);
        setIsOpen(false); // Đóng dropdown
    };

    const handleMarkAllAsRead = async () => {
        try {
            console.log("🔔 UI: Đánh dấu tất cả đã đọc");

            // Lấy danh sách thông báo chưa đọc
            const unreadNotifications = notifications.filter((n) => !n.read);

            // Đánh dấu từng thông báo đã đọc
            const promises = unreadNotifications.map((notification) =>
                markUserAnnouncementAsRead(notification.id, locale)
            );

            await Promise.all(promises);

            // Cập nhật local state
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        } catch (error) {
            console.error("🔔 UI: Lỗi khi đánh dấu tất cả đã đọc:", error);
            // Vẫn cập nhật local state nếu API thất bại
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        }
    };

    const handleDeleteNotification = async (notificationId: string, event: React.MouseEvent) => {
        event.stopPropagation(); // Prevent triggering the notification click

        // Show confirmation dialog
        setNotificationToDelete(notificationId);
        setShowDeleteConfirm(true);
    };

    const confirmDeleteNotification = async () => {
        try {
            console.log("🔔 UI: Xóa thông báo ID:", notificationToDelete);

            const result = await deleteUserAnnouncement(notificationToDelete, locale);

            if (result.status === "success") {
                // Xóa khỏi local state
                setNotifications((prev) => prev.filter((n) => n.id !== notificationToDelete));
            } else {
                console.error("🔔 UI: Lỗi API khi xóa thông báo:", result.message);
                // Show error message to user
                alert(result.message || (locale === "vi" ? "Không thể xóa thông báo" : "Cannot delete notification"));
            }
        } catch (error) {
            console.error("🔔 UI: Lỗi khi xóa thông báo:", error);
            alert(
                locale === "vi" ? "Có lỗi xảy ra khi xóa thông báo" : "An error occurred while deleting notification"
            );
        } finally {
            setShowDeleteConfirm(false);
            setNotificationToDelete("");
        }
    };

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
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 1) {
            return t("justNow");
        }
        if (diffInHours < 24) {
            return t("hoursAgo", { hours: diffInHours });
        }
        const diffInDays = Math.floor(diffInHours / 24);
        return t("daysAgo", { count: diffInDays });
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="relative rounded-lg p-2 text-[#6F6B99] transition-colors hover:bg-[#F4F5FA] hover:text-[#261E33]">
                <BellIcon hasUnread={hasUnread} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 font-medium text-white text-xs">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 z-50 mt-2 w-80 rounded-xl border border-[#E5E5E5] bg-white shadow-xl">
                    <div className="flex items-center justify-between border-[#E5E5E5] border-b px-4 py-3">
                        <h3 className="font-semibold text-[#261E33] text-sm">{t("title")}</h3>
                        <div className="flex items-center gap-2">
                            {hasUnread && (
                                <button
                                    type="button"
                                    onClick={handleMarkAllAsRead}
                                    className="text-[#FF5F3D] text-xs hover:underline">
                                    {t("markAllRead")}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={loadNotifications}
                                className="text-[#6F6B99] text-xs hover:underline"
                                title="Reload notifications">
                            </button>
                        </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#FF5F3D] border-t-transparent" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="py-8 text-center">
                                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                                    <BellIcon hasUnread={false} />
                                </div>
                                <p className="text-[#6F6B99] text-sm">{t("noNotifications")}</p>
                            </div>
                        ) : (
                            <div className="py-2">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => handleNotificationClick(notification)}
                                        onKeyDown={(e) => e.key === "Enter" && handleNotificationClick(notification)}
                                        className={`w-full cursor-pointer px-4 py-3 text-left transition-colors hover:bg-[#F4F5FA] ${!notification.read ? "bg-blue-50" : ""}`}>
                                        <div className="flex items-start gap-3">
                                            <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p
                                                        className={`text-sm ${!notification.read ? "font-semibold text-[#261E33]" : "text-[#261E33]"}`}>
                                                        {notification.title}
                                                    </p>
                                                    {!notification.read && (
                                                        <div className="h-2 w-2 rounded-full bg-[#FF5F3D]" />
                                                    )}
                                                </div>
                                                <p className="mt-1 text-[#6F6B99] text-xs">
                                                    {notification.description.length > 100
                                                        ? `${notification.description.substring(0, 100)}...`
                                                        : notification.description}
                                                </p>
                                                <p className="mt-1 text-[#9CA3AF] text-xs">
                                                    {formatDate(notification.date)}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => handleDeleteNotification(notification.id, e)}
                                                className="ml-2 rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                                                title={t("delete")}>
                                                <svg
                                                    className="h-4 w-4"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24">
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M6 18L18 6M6 6l12 12"
                                                    />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="border-[#E5E5E5] border-t px-4 py-3">
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="w-full text-center text-[#FF5F3D] text-sm hover:underline">
                                {t("viewAll")}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Modal chi tiết thông báo */}
            <NotificationDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                notificationId={selectedNotificationId}
                locale={locale}
            />

            {/* Confirmation Dialog for Delete */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="mx-4 max-w-sm rounded-lg bg-white p-6 shadow-xl">
                        <h3 className="mb-2 font-semibold text-gray-900 text-lg">{t("confirmDeleteTitle")}</h3>
                        <p className="mb-4 text-gray-600">{t("confirmDelete")}</p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setNotificationToDelete("");
                                }}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-600 transition-colors hover:bg-gray-50">
                                {t("cancel")}
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteNotification}
                                className="rounded-lg bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-600">
                                {t("confirm")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
