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
const DELETED_NOTIFICATIONS_STORAGE_KEY = "study_studio_deleted_notifications";

type RawNotification = Notification & {
    userAnnouncementId?: string;
    announcementId?: string;
    _id?: string;
};

type ExtendedNotification = Notification & {
    isFallback?: boolean;
    actionId: string;
};

function getStoredIds(key: string): string[] {
    if (typeof window === "undefined") return [];

    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveStoredId(key: string, id: string) {
    if (typeof window === "undefined") return;

    try {
        const currentIds = getStoredIds(key);
        if (!currentIds.includes(id)) {
            localStorage.setItem(key, JSON.stringify([...currentIds, id]));
        }
    } catch (error) {
        console.error(`Save storage id error [${key}]:`, error);
    }
}

function saveManyStoredIds(key: string, ids: string[]) {
    if (typeof window === "undefined") return;

    try {
        const currentIds = getStoredIds(key);
        const mergedIds = Array.from(new Set([...currentIds, ...ids]));
        localStorage.setItem(key, JSON.stringify(mergedIds));
    } catch (error) {
        console.error(`Save many storage ids error [${key}]:`, error);
    }
}

function removeStoredId(key: string, id: string) {
    if (typeof window === "undefined") return;

    try {
        const currentIds = getStoredIds(key);
        localStorage.setItem(key, JSON.stringify(currentIds.filter((item) => item !== id)));
    } catch (error) {
        console.error(`Remove storage id error [${key}]:`, error);
    }
}

function getReadNotificationIds(): string[] {
    return getStoredIds(READ_NOTIFICATIONS_STORAGE_KEY);
}

function saveReadNotificationId(id: string) {
    saveStoredId(READ_NOTIFICATIONS_STORAGE_KEY, id);
}

function saveManyReadNotificationIds(ids: string[]) {
    saveManyStoredIds(READ_NOTIFICATIONS_STORAGE_KEY, ids);
}

function getDeletedNotificationIds(): string[] {
    return getStoredIds(DELETED_NOTIFICATIONS_STORAGE_KEY);
}

function saveDeletedNotificationId(id: string) {
    saveStoredId(DELETED_NOTIFICATIONS_STORAGE_KEY, id);
}

function removeDeletedNotificationId(id: string) {
    removeStoredId(DELETED_NOTIFICATIONS_STORAGE_KEY, id);
}

function isNotificationNotFoundMessage(message?: string) {
    if (!message) return false;

    const normalized = message.toLowerCase().trim();

    return (
        normalized.includes("không tìm thấy thông báo") ||
        normalized.includes("notification not found") ||
        normalized.includes("not found")
    );
}

function resolveNotificationActionId(notification: RawNotification): string {
    return notification.userAnnouncementId || notification.announcementId || notification._id || notification.id;
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
    getNotificationIcon,
    deleteLabel
}: {
    notification: ExtendedNotification;
    onClick: () => void;
    onDelete: () => void;
    formatDate: (date: string) => string;
    getNotificationIcon: (type: Notification["type"]) => React.ReactNode;
    deleteLabel: string;
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
                aria-label={deleteLabel}>
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );
}

export function NotificationDropdown() {
    const t = useTranslations("Notifications");
    const locale = useLocale();

    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<ExtendedNotification[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState<ExtendedNotification | null>(null);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [notificationToDelete, setNotificationToDelete] = useState<ExtendedNotification | null>(null);

    const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

    const loadNotifications = useCallback(async () => {
        setIsLoading(true);

        try {
            const data = (await getAllAnnouncements(locale)) as RawNotification[];
            const readIds = getReadNotificationIds();
            const deletedIds = getDeletedNotificationIds();

            const cleanedData: ExtendedNotification[] = data
                .map((notification) => {
                    const actionId = resolveNotificationActionId(notification);

                    return {
                        ...notification,
                        id: notification.id,
                        actionId,
                        title: notification.title,
                        description: notification.description,
                        read: Boolean(notification.read || readIds.includes(actionId)),
                        isFallback: false
                    };
                })
                .filter((notification) => !deletedIds.includes(notification.actionId));

            setNotifications(cleanedData);
        } catch (error) {
            console.error("Load notifications error:", error);

            const fallbackNotifications: ExtendedNotification[] = [
                {
                    id: "fallback-1",
                    actionId: "fallback-1",
                    title: locale === "vi" ? "Chào mừng đến Study Studio" : "Welcome to Study Studio",
                    description:
                        locale === "vi" ? "Cảm ơn bạn đã sử dụng Study Studio!" : "Thank you for using Study Studio!",
                    type: "info",
                    date: new Date().toISOString(),
                    read: false,
                    isFallback: true
                }
            ];

            const readIds = getReadNotificationIds();

            setNotifications(
                fallbackNotifications.map((notification) => ({
                    ...notification,
                    read: Boolean(notification.read || readIds.includes(notification.actionId))
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

    const handleNotificationClick = async (notification: ExtendedNotification) => {
        if (!notification.read) {
            saveReadNotificationId(notification.actionId);

            setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));

            if (!notification.isFallback) {
                try {
                    const result = await markUserAnnouncementAsRead(notification.actionId, locale);

                    if (result.status !== "success" && !isNotificationNotFoundMessage(result.message)) {
                        console.error("Mark as read API error:", result.message);
                    }
                } catch (error) {
                    console.error("Mark as read error:", error);
                }
            }
        }

        setSelectedNotification(notification);
        setIsDetailModalOpen(true);
        setOpen(false);
    };

    const handleMarkAllAsRead = async () => {
        const unreadNotifications = notifications.filter((n) => !n.read);
        const unreadActionIds = unreadNotifications.map((n) => n.actionId);

        saveManyReadNotificationIds(unreadActionIds);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

        try {
            await Promise.all(
                unreadNotifications
                    .filter((notification) => !notification.isFallback)
                    .map((notification) => markUserAnnouncementAsRead(notification.actionId, locale))
            );
        } catch (error) {
            console.error("Mark all as read error:", error);
        }
    };

    const handleDeleteNotification = (notification: ExtendedNotification) => {
        if (notification.isFallback) {
            setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
            return;
        }

        setNotificationToDelete(notification);
        setShowDeleteConfirm(true);
    };

    const confirmDeleteNotification = async () => {
        if (!notificationToDelete) return;

        const deletingNotification = notificationToDelete;
        const deletingActionId = deletingNotification.actionId;

        setNotifications((prev) => prev.filter((n) => n.id !== deletingNotification.id));
        setShowDeleteConfirm(false);
        setNotificationToDelete(null);

        try {
            const result = await deleteUserAnnouncement(deletingActionId, locale);

            if (result.status === "success" || isNotificationNotFoundMessage(result.message)) {
                saveDeletedNotificationId(deletingActionId);
                return;
            }

            console.error("Delete notification API error:", result.message);

            setNotifications((prev) => {
                const alreadyExists = prev.some((n) => n.id === deletingNotification.id);
                if (alreadyExists) return prev;
                return [deletingNotification, ...prev];
            });
        } catch (error) {
            console.error("Delete notification error:", error);

            setNotifications((prev) => {
                const alreadyExists = prev.some((n) => n.id === deletingNotification.id);
                if (alreadyExists) return prev;
                return [deletingNotification, ...prev];
            });
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
                                    className="h-8 gap-1.5 rounded-lg px-2.5 text-sm transition-all duration-200 hover:bg-orange-50 hover:text-orange-600 hover:shadow-sm active:scale-[0.98]">
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
                                className="group h-8 w-8 rounded-lg transition-all duration-200 hover:bg-orange-50 hover:text-orange-600 hover:shadow-sm active:scale-[0.95]">
                                <RefreshCw
                                    className={cn(
                                        "h-4 w-4 transition-transform duration-300",
                                        isLoading && "animate-spin",
                                        "group-hover:rotate-180"
                                    )}
                                />
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
                                        onDelete={() => handleDeleteNotification(notification)}
                                        formatDate={formatDate}
                                        getNotificationIcon={getNotificationIcon}
                                        deleteLabel={t("delete")}
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
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setSelectedNotification(null);
                }}
                notification={selectedNotification}
                locale={locale}
            />

            <AlertDialog
                open={showDeleteConfirm}
                onOpenChange={(value) => {
                    setShowDeleteConfirm(value);
                    if (!value) {
                        setNotificationToDelete(null);
                    }
                }}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("confirmDeleteTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("confirmDelete")}</AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setNotificationToDelete(null)}>
                            {t("cancel")}
                        </AlertDialogCancel>

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
