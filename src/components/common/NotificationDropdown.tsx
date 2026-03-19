"use client";

import { AlertTriangle, Bell, CheckCheck, CheckCircle2, Info, RefreshCw, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    deleteUserAnnouncement,
    getAllAnnouncements,
    markUserAnnouncementAsRead,
    type Notification
} from "@/api/notifications";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { NotificationDetailModal } from "./NotificationDetailModal";

const READ_NOTIFICATIONS_STORAGE_KEY = "study_studio_read_notifications";

function getReadNotificationIds(): string[] {
    if (typeof window === "undefined") return [];

    try {
        const raw = localStorage.getItem(READ_NOTIFICATIONS_STORAGE_KEY);
        if (!raw) return [];

        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveReadNotificationId(id: string) {
    if (typeof window === "undefined") return;

    try {
        const currentIds = getReadNotificationIds();

        if (!currentIds.includes(id)) {
            localStorage.setItem(READ_NOTIFICATIONS_STORAGE_KEY, JSON.stringify([...currentIds, id]));
        }
    } catch (error) {
        console.error("Save read notification error:", error);
    }
}

function saveManyReadNotificationIds(ids: string[]) {
    if (typeof window === "undefined") return;

    try {
        const currentIds = getReadNotificationIds();
        const mergedIds = Array.from(new Set([...currentIds, ...ids]));

        localStorage.setItem(READ_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(mergedIds));
    } catch (error) {
        console.error("Save many read notifications error:", error);
    }
}

function BellButton({ unreadCount }: { unreadCount: number }) {
    const hasUnread = unreadCount > 0;

    return (
        <div className="relative flex h-6 w-6 items-center justify-center">
            <Bell className="h-6 w-6 shrink-0 text-foreground" />

            {hasUnread && (
                <span className="absolute -top-2 -right-2 z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 font-semibold text-[10px] text-white leading-none shadow ring-2 ring-background">
                    {unreadCount > 99 ? "99+" : unreadCount > 9 ? "9+" : unreadCount}
                </span>
            )}
        </div>
    );
}

function NotificationItem({
    notification,
    onClick,
    onDelete,
    formatDate,
    getNotificationIcon
}: {
    notification: Notification;
    onClick: () => void;
    onDelete: () => void;
    formatDate: (date: string) => string;
    getNotificationIcon: (type: Notification["type"]) => React.ReactNode;
}) {
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onClick();
                }
            }}
            className={cn(
                "group relative flex cursor-pointer gap-3 rounded-2xl border p-4 transition-all",
                "hover:bg-accent/60 hover:shadow-sm",
                !notification.read ? "border-blue-200 bg-blue-50/60" : "border-border bg-background"
            )}>
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted shadow-sm">
                {getNotificationIcon(notification.type)}
            </div>

            <div className="min-w-0 flex-1 pr-8">
                <div className="flex items-start gap-2">
                    <p
                        className={cn(
                            "line-clamp-2 text-foreground text-sm leading-5",
                            !notification.read && "font-semibold"
                        )}>
                        {notification.title}
                    </p>

                    {!notification.read && (
                        <span className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500" />
                    )}
                </div>

                <p className="mt-1.5 line-clamp-2 text-muted-foreground text-sm leading-6">
                    {notification.description}
                </p>

                <p className="mt-3 text-muted-foreground text-xs">{formatDate(notification.date)}</p>
            </div>

            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
                className="absolute top-3 right-3 h-8 w-8 rounded-lg text-muted-foreground opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                aria-label="Delete notification">
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );
}

export function NotificationDropdown() {
    const t = useTranslations("Notifications");
    const locale = useLocale();

    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedNotificationId, setSelectedNotificationId] = useState("");

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [notificationToDelete, setNotificationToDelete] = useState("");

    const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

    const loadNotifications = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getAllAnnouncements(locale);
            const readIds = getReadNotificationIds();

            const cleanedData = data.map((notification) => ({
                ...notification,
                title: notification.title,
                description: notification.description,
                read: Boolean(notification.read || readIds.includes(notification.id))
            }));

            setNotifications(cleanedData);
        } catch (error) {
            console.error("Load notifications error:", error);

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

            const readIds = getReadNotificationIds();

            setNotifications(
                fallbackNotifications.map((notification) => ({
                    ...notification,
                    read: Boolean(notification.read || readIds.includes(notification.id))
                }))
            );
        } finally {
            setIsLoading(false);
        }
    }, [locale]);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    const formatDate = useCallback(
        (dateString: string) => {
            const date = new Date(dateString);
            const now = new Date();

            if (Number.isNaN(date.getTime())) {
                return locale === "vi" ? "Không xác định" : "Invalid date";
            }

            const diffMs = date.getTime() - now.getTime();
            const diffMinutes = Math.round(diffMs / (1000 * 60));
            const diffHours = Math.round(diffMs / (1000 * 60 * 60));
            const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

            const rtf = new Intl.RelativeTimeFormat(locale === "vi" ? "vi" : "en", { numeric: "auto" });

            if (Math.abs(diffMinutes) < 1) {
                return locale === "vi" ? "Vừa xong" : "Just now";
            }

            if (Math.abs(diffMinutes) < 60) {
                return rtf.format(diffMinutes, "minute");
            }

            if (Math.abs(diffHours) < 24) {
                return rtf.format(diffHours, "hour");
            }

            if (Math.abs(diffDays) < 7) {
                return rtf.format(diffDays, "day");
            }

            return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }).format(date);
        },
        [locale]
    );

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.read) {
            saveReadNotificationId(notification.id);

            setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));

            try {
                const result = await markUserAnnouncementAsRead(notification.id, locale);

                if (result.status !== "success") {
                    console.error("Mark as read API error:", result.message);
                }
            } catch (error) {
                console.error("Mark as read error:", error);
            }
        }

        setSelectedNotificationId(notification.id);
        setIsDetailModalOpen(true);
        setOpen(false);
    };

    const handleMarkAllAsRead = async () => {
        try {
            const unreadNotifications = notifications.filter((n) => !n.read);
            const unreadIds = unreadNotifications.map((n) => n.id);

            saveManyReadNotificationIds(unreadIds);

            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

            await Promise.all(
                unreadNotifications.map((notification) => markUserAnnouncementAsRead(notification.id, locale))
            );
        } catch (error) {
            console.error("Mark all as read error:", error);
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        }
    };

    const handleDeleteNotification = (notificationId: string) => {
        setNotificationToDelete(notificationId);
        setShowDeleteConfirm(true);
    };

    const confirmDeleteNotification = async () => {
        try {
            const result = await deleteUserAnnouncement(notificationToDelete, locale);

            if (result.status === "success") {
                setNotifications((prev) => prev.filter((n) => n.id !== notificationToDelete));
            } else {
                console.error("Delete notification API error:", result.message);
            }
        } catch (error) {
            console.error("Delete notification error:", error);
        } finally {
            setShowDeleteConfirm(false);
            setNotificationToDelete("");
        }
    };

    const getNotificationIcon = (type: Notification["type"]) => {
        switch (type) {
            case "success":
                return <CheckCircle2 className="h-4 w-4 text-green-600" />;
            case "warning":
                return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
            case "info":
                return <Info className="h-4 w-4 text-blue-600" />;
            default:
                return <Bell className="h-4 w-4 text-muted-foreground" />;
        }
    };

    return (
        <>
            <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="relative h-11 w-11 rounded-full border border-transparent hover:border-border hover:bg-accent">
                        <BellButton unreadCount={unreadCount} />
                    </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                    align="end"
                    sideOffset={12}
                    className="w-[420px] overflow-hidden rounded-3xl border bg-background p-0 shadow-2xl">
                    <div className="flex items-center justify-between border-b px-4 py-4">
                        <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-foreground text-lg">{t("title")}</h3>

                            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs">
                                {notifications.length}
                            </Badge>
                        </div>

                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleMarkAllAsRead}
                                    className="h-8 gap-1.5 rounded-lg px-2.5 text-sm">
                                    <CheckCheck className="h-4 w-4" />
                                    {t("markAllRead")}
                                </Button>
                            )}

                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={loadNotifications}
                                disabled={isLoading}
                                className="h-8 w-8 rounded-lg">
                                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                            </Button>
                        </div>
                    </div>

                    <ScrollArea className="h-[420px]">
                        <div className="space-y-3 p-3">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="mb-3 rounded-full bg-muted p-3">
                                        <Bell className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <p className="text-muted-foreground text-sm">{t("noNotifications")}</p>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <NotificationItem
                                        key={notification.id}
                                        notification={notification}
                                        onClick={() => handleNotificationClick(notification)}
                                        onDelete={() => handleDeleteNotification(notification.id)}
                                        formatDate={formatDate}
                                        getNotificationIcon={getNotificationIcon}
                                    />
                                ))
                            )}
                        </div>
                    </ScrollArea>

                    {notifications.length > 0 && (
                        <div className="border-t p-2">
                            <Button
                                type="button"
                                variant="ghost"
                                className="h-11 w-full rounded-2xl font-medium text-primary hover:bg-accent"
                                onClick={() => setOpen(false)}>
                                {t("viewAll")}
                            </Button>
                        </div>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <NotificationDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                notificationId={selectedNotificationId}
                locale={locale}
            />

            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("confirmDeleteTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("confirmDelete")}</AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setNotificationToDelete("")}>{t("cancel")}</AlertDialogCancel>

                        <AlertDialogAction
                            onClick={confirmDeleteNotification}
                            className="bg-red-500 text-white hover:bg-red-600">
                            {t("confirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
