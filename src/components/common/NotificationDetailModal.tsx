"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Bell,
    CalendarDays,
    CheckCircle2,
    Info,
    MessageCircle,
    MessageSquareText,
    TriangleAlert,
    X,
    XCircle
} from "lucide-react";

import { getNotificationDetail, type Notification } from "@/api/notifications";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface NotificationDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    notification: Notification | null;
    locale: string;
}

export function NotificationDetailModal({
    isOpen,
    onClose,
    notification,
    locale
}: NotificationDetailModalProps) {
    const t = useTranslations("Notifications");
    const [detail, setDetail] = useState<Notification | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const loadNotificationDetail = useCallback(async () => {
        if (!notification) return;

        setIsLoading(true);
        try {
            const result = await getNotificationDetail(notification, locale);
            setDetail(result);
        } catch (error) {
            console.error("🔔 Modal: Lỗi khi tải chi tiết thông báo:", error);
            setDetail(null);
        } finally {
            setIsLoading(false);
        }
    }, [notification, locale]);

    useEffect(() => {
        if (isOpen && notification) {
            loadNotificationDetail();
        }
    }, [isOpen, notification, loadNotificationDetail]);

    useEffect(() => {
        if (!isOpen) {
            setDetail(null);
            setIsLoading(false);
        }
    }, [isOpen]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString(locale === "vi" ? "vi-VN" : locale, {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const getNotificationMeta = (type?: Notification["type"]) => {
        switch (type) {
            case "success":
                return {
                    icon: CheckCircle2,
                    badgeClass:
                        "border-emerald-200 bg-emerald-100 text-emerald-700",
                    iconWrapperClass: "bg-emerald-100 text-emerald-600",
                    label: t("typeSuccess")
                };
            case "warning":
                return {
                    icon: TriangleAlert,
                    badgeClass: "border-amber-200 bg-amber-100 text-amber-700",
                    iconWrapperClass: "bg-amber-100 text-amber-600",
                    label: t("typeWarning")
                };
            case "info":
                return {
                    icon: Info,
                    badgeClass: "border-sky-200 bg-sky-100 text-sky-700",
                    iconWrapperClass: "bg-sky-100 text-sky-600",
                    label: t("typeInfo")
                };
            default:
                return {
                    icon: Bell,
                    badgeClass:
                        "border-violet-200 bg-violet-100 text-violet-700",
                    iconWrapperClass: "bg-violet-100 text-violet-600",
                    label: t("typeSystem")
                };
        }
    };

    const isMentionLikeNotification = useMemo(() => {
        if (!detail) return false;

        const sourceType = detail.sourceType?.toLowerCase?.() ?? "";
        const title = detail.title?.toLowerCase?.() ?? "";
        const description = detail.description?.toLowerCase?.() ?? "";

        return (
            sourceType === "mention_chat" ||
            sourceType === "mention_comment" ||
            sourceType === "chat_message" ||
            title.includes("được nhắc đến") ||
            title.includes("mentioned") ||
            description.includes("đã nhắc đến bạn") ||
            description.includes("mentioned you")
        );
    }, [detail]);

    const sourceMeta = useMemo(() => {
        if (isMentionLikeNotification) {
            if (detail?.sourceType === "mention_comment") {
                return {
                    label: t("mentionedInComment"),
                    icon: MessageSquareText
                };
            }

            return {
                label: t("mentionedInChat"),
                icon: MessageCircle
            };
        }

        switch (detail?.sourceType) {
            case "chat_message":
                return {
                    label: t("chatMessage"),
                    icon: MessageCircle
                };
            default:
                return {
                    label: t("announcement"),
                    icon: Bell
                };
        }
    }, [detail?.sourceType, isMentionLikeNotification, t]);

    const splitMentionDescription = useMemo(() => {
        const raw = detail?.description?.trim();
        if (!raw) {
            return {
                summary: null,
                message: null
            };
        }

        // Tách theo " - " để lấy nội dung thật phía sau
        const separator = " - ";
        const separatorIndex = raw.lastIndexOf(separator);

        if (separatorIndex === -1) {
            return {
                summary: raw,
                message: detail?.originalMessage?.trim() || null
            };
        }

        const summary = raw.slice(0, separatorIndex).trim();
        const message = raw.slice(separatorIndex + separator.length).trim();

        return {
            summary: summary || null,
            message: message || detail?.originalMessage?.trim() || null
        };
    }, [detail?.description, detail?.originalMessage]);

    const getMainContentTitle = () => {
        if (isMentionLikeNotification) return t("notificationContent");
        return t("content");
    };

    const getOriginalMessageTitle = () => {
        switch (detail?.sourceType) {
            case "mention_chat":
            case "chat_message":
                return t("messageContent");
            case "mention_comment":
                return t("commentContent");
            default:
                return t("content");
        }
    };

    const contentSummary = useMemo(() => {
        if (!detail) return null;

        if (isMentionLikeNotification) {
            return splitMentionDescription.summary;
        }

        return null;
    }, [detail, isMentionLikeNotification, splitMentionDescription]);

    const mainContent = useMemo(() => {
        if (!detail) return null;

        if (isMentionLikeNotification) {
            return (
                detail.originalMessage?.trim() ||
                splitMentionDescription.message ||
                null
            );
        }

        return detail.description?.trim() || null;
    }, [detail, isMentionLikeNotification, splitMentionDescription]);

    const renderParagraphs = (content?: string | null) => {
        if (!content?.trim()) return null;

        return content
            .split("\n")
            .filter((paragraph) => paragraph.trim() !== "")
            .map((paragraph, index) => <p key={index}>{paragraph}</p>);
    };

    const renderLoading = () => (
        <div className="space-y-6 py-2">
            <div className="flex items-start gap-4">
                <Skeleton className="h-14 w-14 rounded-2xl" />
                <div className="flex-1 space-y-3">
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-32" />
                </div>
            </div>

            <Separator />

            <div className="space-y-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
            </div>

            <div className="space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-20 w-full rounded-2xl" />
            </div>
        </div>
    );

    const renderEmpty = () => (
        <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <XCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
                {t("notFound")}
            </h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
                {t("notFoundDescription")}
            </p>
        </div>
    );

    const renderContent = () => {
        if (!detail) return renderEmpty();

        const meta = getNotificationMeta(detail.type);
        const Icon = meta.icon;
        const SourceIcon = sourceMeta.icon;

        return (
            <div className="space-y-6">
                <div className="flex items-start gap-4">
                    <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${meta.iconWrapperClass}`}>
                        <Icon className="h-7 w-7" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-2">
                                <h3 className="text-xl font-semibold leading-snug text-foreground">
                                    {detail.title}
                                </h3>

                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <CalendarDays className="h-4 w-4" />
                                    <span>{formatDate(detail.date)}</span>
                                </div>

                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <SourceIcon className="h-4 w-4" />
                                    <span>{sourceMeta.label}</span>
                                </div>
                            </div>

                            <Badge
                                variant="outline"
                                className={`w-fit rounded-full px-3 py-1 text-xs font-medium hover:bg-inherit ${meta.badgeClass}`}>
                                {meta.label}
                            </Badge>
                        </div>
                    </div>
                </div>

                <Separator />

                <div className="space-y-3">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        {getMainContentTitle()}
                    </h4>

                    {contentSummary && (
                        <p className="text-sm text-muted-foreground">
                            {contentSummary}
                        </p>
                    )}

                    <div className="rounded-2xl border bg-muted/30 p-4 sm:p-5">
                        <div className="space-y-3 text-sm leading-7 text-foreground/90">
                            {renderParagraphs(mainContent) ?? (
                                <p className="text-muted-foreground">
                                    {t("noContent")}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {detail.originalMessage &&
                    !isMentionLikeNotification &&
                    detail.originalMessage.trim() !== detail.description?.trim() && (
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                {getOriginalMessageTitle()}
                            </h4>

                            <div className="rounded-2xl border bg-background p-4 sm:p-5">
                                {detail.senderName && (
                                    <div className="mb-3">
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                            {t("from")}
                                        </p>
                                        <p className="text-sm font-medium text-foreground">
                                            {detail.senderName}
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-3 text-sm leading-7 text-foreground/90">
                                    {renderParagraphs(detail.originalMessage)}
                                </div>
                            </div>
                        </div>
                    )}
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[90vh] w-[calc(100%-24px)] max-w-3xl overflow-hidden rounded-2xl border bg-background p-0 shadow-2xl [&>button]:hidden">
                <DialogHeader className="relative border-b px-6 py-5 pr-20">
                    <div className="flex items-center justify-between gap-4">
                        <DialogTitle className="text-left text-xl font-semibold">
                            {t("detailTitle")}
                        </DialogTitle>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-1/2 right-6 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition-colors hover:bg-zinc-50"
                        aria-label={t("close")}>
                        <X className="h-5 w-5" />
                    </button>
                </DialogHeader>

                <ScrollArea className="max-h-[calc(90vh-140px)] px-6 py-6">
                    {isLoading ? renderLoading() : renderContent()}
                </ScrollArea>

                <div className="border-t bg-muted/20 px-6 py-4">
                    <div className="flex justify-end">
                        <Button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl px-5">
                            {t("close")}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}