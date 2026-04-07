"use client";

import {
    BellOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    CloseOutlined,
    DeleteOutlined,
    ExclamationCircleOutlined,
    EyeOutlined,
    InfoCircleOutlined,
    RightOutlined,
    SearchOutlined,
    SoundOutlined,
    WarningOutlined
} from "@ant-design/icons";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    deleteUserAnnouncement,
    getAllAnnouncements,
    getAnnouncementById,
    getUserAnnouncements,
    markAnnouncementAsRead,
    type Announcement,
    type UserAnnouncement
} from "@/api/user-announcements";
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
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { ANNOUNCEMENT_DELETED_EVENT, dispatchAnnouncementDeleted, type AnnouncementDeletedDetail } from "@/lib/announcement-events";

type PublicAnnouncementItem = Announcement & {
    userAnnouncementId?: string;
    isRead?: boolean;
};

const DELETED_SYSTEM_ANNOUNCEMENTS_KEY = "study_studio_deleted_system_announcements";

function readDeletedSystemAnnouncementIds(): string[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(DELETED_SYSTEM_ANNOUNCEMENTS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.map((v) => String(v)) : [];
    } catch {
        return [];
    }
}

function saveDeletedSystemAnnouncementId(id: string) {
    if (typeof window === "undefined") return;
    try {
        const current = readDeletedSystemAnnouncementIds();
        if (!current.includes(id)) {
            window.localStorage.setItem(DELETED_SYSTEM_ANNOUNCEMENTS_KEY, JSON.stringify([...current, id]));
        }
    } catch {
        // ignore
    }
}

export function AnnouncementsPage() {
    const locale = useLocale();
    const t = useTranslations("Announcements");
    const { toast } = useToast();

    const isMentionType = (type: string) => type === "Mention" || type === "mention" || type === "4";

    const [publicAnnouncements, setPublicAnnouncements] = useState<PublicAnnouncementItem[]>([]);
    const [userAnnouncements, setUserAnnouncements] = useState<UserAnnouncement[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<"public" | "personal">("public");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("newest");

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedDetail, setSelectedDetail] = useState<(PublicAnnouncementItem | UserAnnouncement) | null>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<
        | { kind: "personal"; item: UserAnnouncement }
        | { kind: "system"; announcementId: string }
        | null
    >(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadAnnouncements = useCallback(async () => {
        setIsLoading(true);
        try {
            const deletedSystemIds = new Set(readDeletedSystemAnnouncementIds());
            const [publicResult, userResult] = await Promise.allSettled([
                getAllAnnouncements(locale),
                getUserAnnouncements(locale)
            ]);

            let systemAnnouncements: PublicAnnouncementItem[] = [];

            // Lấy thông báo chưa đọc từ /api/announcements (lọc type != Mention)
            if (publicResult.status === "fulfilled" && publicResult.value.status === "success") {
                const all = publicResult.value.data || [];
                systemAnnouncements = all
                    .filter((ann) => !isMentionType(ann.type))
                    .filter((ann) => !deletedSystemIds.has(String(ann.announcementId)));
            }

            // Lấy thông báo đã đọc từ /api/announcements/user (type != Mention)
            if (userResult.status === "fulfilled" && userResult.value.status === "success") {
                const all = userResult.value.data || [];
                const readAnnouncements = all.filter((ann) => !isMentionType(ann.type));

                // Map UserAnnouncement to Announcement for type compatibility
                const normalizedRead: PublicAnnouncementItem[] = readAnnouncements.map((a) => ({
                    announcementId: a.announcementId,
                    title: a.title,
                    content: a.content,
                    type: a.type,
                    isActive: true,
                    createdAt: a.createdAt,
                    publishedAt: a.publishedAt,
                    userAnnouncementId: a.userAnnouncementId,
                    isRead: a.isRead
                }));

                // Merge: thêm các thông báo đã đọc không có trong danh sách chưa đọc
                const readIds = new Set(normalizedRead.map((a) => a.announcementId));
                const newAnnouncements = systemAnnouncements.filter((a) => !readIds.has(a.announcementId));
                const combined = [...newAnnouncements, ...normalizedRead].filter(
                    (ann) => !deletedSystemIds.has(String(ann.announcementId))
                );
                setPublicAnnouncements(combined);
            } else {
                setPublicAnnouncements(systemAnnouncements);
            }

            // Tab "Thông báo cá nhân" - chỉ hiển thị type = Mention
            if (userResult.status === "fulfilled" && userResult.value.status === "success") {
                const all = userResult.value.data || [];
                setUserAnnouncements(all.filter((ann) => isMentionType(ann.type)));
            }
        } catch (error) {
            console.error("Failed to load announcements:", error);
            toast({
                description: t("loadFailed"),
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }, [locale, t, toast]);

    useEffect(() => {
        loadAnnouncements();
    }, [loadAnnouncements]);

    useEffect(() => {
        const handleAnnouncementDeleted = (event: Event) => {
            const detail = (event as CustomEvent<AnnouncementDeletedDetail>).detail;
            if (!detail) return;

            setUserAnnouncements((prev) =>
                prev.filter((ann) => {
                    if (detail.userAnnouncementId && ann.userAnnouncementId === detail.userAnnouncementId) return false;
                    if (detail.announcementId && ann.announcementId === detail.announcementId) return false;
                    return true;
                })
            );

            setPublicAnnouncements((prev) =>
                prev.filter((ann) => {
                    if (detail.userAnnouncementId && ann.userAnnouncementId === detail.userAnnouncementId) return false;
                    if (detail.announcementId && ann.announcementId === detail.announcementId) return false;
                    return true;
                })
            );

            setSelectedDetail((prev) => {
                if (!prev) return prev;
                if ("userAnnouncementId" in prev && detail.userAnnouncementId && prev.userAnnouncementId === detail.userAnnouncementId) {
                    setSelectedId(null);
                    return null;
                }
                if ("announcementId" in prev && detail.announcementId && prev.announcementId === detail.announcementId) {
                    setSelectedId(null);
                    return null;
                }
                return prev;
            });
        };

        window.addEventListener(ANNOUNCEMENT_DELETED_EVENT, handleAnnouncementDeleted);
        return () => {
            window.removeEventListener(ANNOUNCEMENT_DELETED_EVENT, handleAnnouncementDeleted);
        };
    }, []);

    const handleViewDetail = async (id: string, isPersonalTab: boolean) => {
        setSelectedId(id);
        setIsDetailLoading(true);

        try {
            let localData: PublicAnnouncementItem | UserAnnouncement | null = null;

            if (isPersonalTab) {
                // Tab cá nhân - tìm trong userAnnouncements
                localData = userAnnouncements.find((a) => a.userAnnouncementId === id) || null;
            } else {
                // Tab hệ thống - tìm trong publicAnnouncements
                localData = publicAnnouncements.find((a) => a.announcementId === id) || null;
            }

            if (localData) {
                setSelectedDetail(localData);

                // Chỉ đánh dấu đọc nếu là tab cá nhân và chưa đọc
                if (isPersonalTab && "isRead" in localData && !localData.isRead) {
                    await handleMarkAsRead(id, false);
                }
            }

            // Lấy chi tiết từ API
            const actualId = localData && "announcementId" in localData ? localData.announcementId : id;
            if (!actualId) return;

            const result = await getAnnouncementById(actualId, locale);

            if (result.status === "success" && result.data) {
                setSelectedDetail({
                    ...result.data,
                    ...(localData && "userAnnouncementId" in localData && localData.userAnnouncementId
                        ? {
                              userAnnouncementId: localData.userAnnouncementId,
                              isRead: "isRead" in localData ? localData.isRead : undefined
                          }
                        : {})
                });
            }
        } catch (error) {
            console.error("Failed to fetch detail:", error);
        } finally {
            setIsDetailLoading(false);
        }
    };

    const handleMarkAsRead = async (userAnnouncementId: string, showMsg = true) => {
        try {
            const result = await markAnnouncementAsRead(userAnnouncementId, locale);
            if (result.status === "success") {
                // Cập nhật trạng thái đã đọc cho userAnnouncements
                setUserAnnouncements((prev) =>
                    prev.map((ann) => (ann.userAnnouncementId === userAnnouncementId ? { ...ann, isRead: true } : ann))
                );

                if (showMsg) {
                    toast({
                        description: t("markAsReadSuccess")
                    });
                }
            }
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    };

    const openDeleteAnnouncementConfirm = (target: UserAnnouncement) => {
        setDeleteTarget({ kind: "personal", item: target });
        setIsDeleteConfirmOpen(true);
    };

    const openDeleteSystemAnnouncementConfirm = (announcementId: string) => {
        const id = String(announcementId || "").trim();
        if (!id) return;
        setDeleteTarget({ kind: "system", announcementId: id });
        setIsDeleteConfirmOpen(true);
    };

    const handleDeleteAnnouncement = (e: React.MouseEvent, target: UserAnnouncement) => {
        e.stopPropagation();
        openDeleteAnnouncementConfirm(target);
    };

    const confirmDeleteAnnouncement = async () => {
        if (!deleteTarget) return;

        if (deleteTarget.kind === "system") {
            const targetAnnouncementId = deleteTarget.announcementId;
            saveDeletedSystemAnnouncementId(targetAnnouncementId);
            setPublicAnnouncements((prev) => prev.filter((ann) => String(ann.announcementId) !== targetAnnouncementId));
            if (selectedDetail && "announcementId" in selectedDetail && String(selectedDetail.announcementId) === targetAnnouncementId) {
                setSelectedId(null);
                setSelectedDetail(null);
            }
            if (selectedId === targetAnnouncementId) {
                setSelectedId(null);
                setSelectedDetail(null);
            }
            dispatchAnnouncementDeleted({ announcementId: targetAnnouncementId });
            setIsDeleteConfirmOpen(false);
            setDeleteTarget(null);
            toast({
                description: t("deleteSuccess"),
                variant: "success"
            });
            return;
        }

        const targetId = deleteTarget.item.userAnnouncementId;
        const targetAnnouncementId = deleteTarget.item.announcementId;
        setIsDeleting(true);
        try {
            const result = await deleteUserAnnouncement(targetId, locale);
            if (result.status === "success") {
                setUserAnnouncements((prev) => prev.filter((ann) => ann.userAnnouncementId !== targetId));
                setPublicAnnouncements((prev) => prev.filter((ann) => ann.userAnnouncementId !== targetId));
                if (selectedDetail && "userAnnouncementId" in selectedDetail && selectedDetail.userAnnouncementId === targetId) {
                    setSelectedId(null);
                    setSelectedDetail(null);
                }
                if (selectedId === targetAnnouncementId || selectedId === targetId) {
                    setSelectedId(null);
                    setSelectedDetail(null);
                }
                dispatchAnnouncementDeleted({
                    announcementId: targetAnnouncementId,
                    userAnnouncementId: targetId
                });
                setIsDeleteConfirmOpen(false);
                setDeleteTarget(null);
                toast({
                    description: t("deleteSuccess"),
                    variant: "success"
                });
            } else {
                toast({
                    description: t("deleteFailed"),
                    variant: "destructive"
                });
            }
        } catch {
            toast({
                description: t("deleteFailed"),
                variant: "destructive"
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const filterAndSort = <T extends { title: string; content: string; publishedAt: string }>(items: T[]) => {
        let filtered = items;

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (item) => item.title.toLowerCase().includes(query) || item.content.toLowerCase().includes(query)
            );
        }

        return [...filtered].sort((a, b) => {
            const dateA = new Date(a.publishedAt).getTime();
            const dateB = new Date(b.publishedAt).getTime();
            return sortBy === "newest" ? dateB - dateA : dateA - dateB;
        });
    };

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString(locale, {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });

    const getTypeMeta = (type: string) => {
        switch (type.toLowerCase()) {
            case "0":
            case "info":
                return {
                    label: t("info"),
                    icon: <InfoCircleOutlined className="text-sky-500" />,
                    iconLarge: <InfoCircleOutlined className="text-3xl text-sky-500" />,
                    badgeClass: "border-sky-200 bg-sky-50 text-sky-600",
                    cardClass: "bg-sky-50",
                    modalBg: "from-sky-50 to-cyan-50"
                };
            case "1":
            case "warning":
                return {
                    label: t("warning"),
                    icon: <WarningOutlined className="text-amber-500" />,
                    iconLarge: <WarningOutlined className="text-3xl text-amber-500" />,
                    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
                    cardClass: "bg-amber-50",
                    modalBg: "from-amber-50 to-orange-50"
                };
            case "2":
            case "critical":
                return {
                    label: t("critical"),
                    icon: <ExclamationCircleOutlined className="text-rose-500" />,
                    iconLarge: <ExclamationCircleOutlined className="text-3xl text-rose-500" />,
                    badgeClass: "border-rose-200 bg-rose-50 text-rose-600",
                    cardClass: "bg-rose-50",
                    modalBg: "from-rose-50 to-red-50"
                };
            default:
                return {
                    label: t("other"),
                    icon: <BellOutlined className="text-orange-500" />,
                    iconLarge: <BellOutlined className="text-3xl text-orange-500" />,
                    badgeClass: "border-orange-200 bg-orange-50 text-orange-600",
                    cardClass: "bg-orange-50",
                    modalBg: "from-orange-50 to-amber-50"
                };
        }
    };

    const unreadCount = userAnnouncements.filter((ann) => !ann.isRead).length;

    const currentItems = useMemo(() => {
        return activeTab === "public" ? filterAndSort(publicAnnouncements) : filterAndSort(userAnnouncements);
    }, [activeTab, publicAnnouncements, userAnnouncements, searchQuery, sortBy]);

    if (isLoading) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
                    <p className="font-medium text-[#7C6A5A] text-sm">{t("loading")}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="w-full rounded-3xl border border-orange-200 bg-white px-4 py-5 shadow-[0_10px_40px_rgba(249,115,22,0.08)] lg:px-6 lg:py-6">
                    <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <motion.div
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.22 }}
                                className="mb-1 inline-flex items-center gap-2 rounded-full border border-orange-100/80 bg-white/70 px-3 py-1 font-semibold text-[11px] text-orange-700 uppercase tracking-[0.18em] shadow-sm backdrop-blur">
                                <SoundOutlined className="text-[14px]" />
                                {t("learningHub")}
                            </motion.div>

                            <div className="mt-4 flex items-start gap-3">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-md shadow-orange-200">
                                    <BellOutlined className="text-white text-xl" />
                                </div>

                                <div className="min-w-0">
                                    <motion.h1
                                        layout
                                        transition={{ type: "spring", stiffness: 280, damping: 26 }}
                                        className="font-extrabold text-3xl text-[#261E33] leading-[1.2] tracking-tight lg:text-5xl">
                                        {t("title")}
                                    </motion.h1>

                                    <motion.p
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.22, delay: 0.05 }}
                                        className="mt-2 max-w-3xl text-[#7C6A5A] text-sm leading-7 lg:text-[15px]">
                                        {t("heroDescription")}
                                    </motion.p>
                                </div>
                            </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-3 self-start">
                            <motion.div
                                layout
                                whileHover={{ y: -1 }}
                                transition={{ duration: 0.18 }}
                                className="inline-flex h-11 items-center gap-2 rounded-xl border border-orange-200 bg-white px-4 text-[#7C6A5A] text-sm shadow-sm">
                                <BellOutlined className="text-[#EA580C]" />
                                <span>
                                    <motion.span
                                        key={publicAnnouncements.length + userAnnouncements.length}
                                        initial={{ opacity: 0.6, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.2 }}
                                        className="font-bold text-[#261E33]">
                                        {publicAnnouncements.length + userAnnouncements.length}
                                    </motion.span>{" "}
                                    {t("labelAnnouncements")}
                                </span>
                            </motion.div>

                            <motion.div
                                layout
                                whileHover={{ y: -1 }}
                                transition={{ duration: 0.18 }}
                                className="inline-flex h-11 items-center gap-2 rounded-xl border border-orange-200 bg-white px-4 text-[#7C6A5A] text-sm shadow-sm">
                                <EyeOutlined className="text-[#EA580C]" />
                                <span>
                                    <motion.span
                                        key={unreadCount}
                                        initial={{ opacity: 0.6, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.2 }}
                                        className="font-bold text-[#261E33]">
                                        {unreadCount}
                                    </motion.span>{" "}
                                    {t("labelUnread")}
                                </span>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <StatCard
                        label={t("total")}
                        value={publicAnnouncements.length + userAnnouncements.length}
                        icon={<BellOutlined />}
                        iconClass="bg-orange-50 text-orange-500"
                    />
                    <StatCard
                        label={t("public")}
                        value={publicAnnouncements.length}
                        icon={<CheckCircleOutlined />}
                        iconClass="bg-emerald-50 text-emerald-500"
                    />
                    <StatCard
                        label={t("personal")}
                        value={userAnnouncements.length}
                        icon={<EyeOutlined />}
                        iconClass="bg-sky-50 text-sky-500"
                    />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05, duration: 0.3 }}
                    className="mt-6">
                    <div className="rounded-[28px] border border-orange-200 bg-white p-4 shadow-[0_8px_24px_rgba(249,115,22,0.06)]">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex w-fit max-w-full items-center gap-2 overflow-x-auto rounded-2xl border border-orange-200 bg-orange-50/40 p-1.5 shadow-sm">
                                {[
                                    {
                                        key: "public" as const,
                                        icon: <CheckCircleOutlined />,
                                        label: t("publicTab")
                                    },
                                    {
                                        key: "personal" as const,
                                        icon: <EyeOutlined />,
                                        label: t("personalTab"),
                                        badge: unreadCount
                                    }
                                ].map((tab) => {
                                    const active = activeTab === tab.key;

                                    return (
                                        <button
                                            key={tab.key}
                                            type="button"
                                            onClick={() => setActiveTab(tab.key)}
                                            className="relative shrink-0">
                                            <motion.div
                                                whileHover={{ y: -1 }}
                                                whileTap={{ scale: 0.98 }}
                                                transition={{ duration: 0.15 }}
                                                className={`group relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-medium text-sm transition-all duration-200 ${
                                                    active
                                                        ? "text-white shadow-md shadow-orange-200"
                                                        : "text-[#6B7280] hover:bg-[#FFF1E6] hover:text-[#EA580C]"
                                                }`}>
                                                {active ? (
                                                    <motion.div
                                                        layoutId="activeAnnouncementTab"
                                                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C]"
                                                        transition={{
                                                            type: "spring",
                                                            stiffness: 380,
                                                            damping: 30
                                                        }}
                                                    />
                                                ) : null}

                                                <span
                                                    className={`relative z-10 transition-colors duration-200 ${
                                                        active
                                                            ? "text-white"
                                                            : "text-[#8C8C8C] group-hover:text-[#EA580C]"
                                                    }`}>
                                                    {tab.icon}
                                                </span>

                                                <span className="relative z-10 whitespace-nowrap">{tab.label}</span>

                                                {"badge" in tab && tab.badge ? (
                                                    <span
                                                        className={`relative z-10 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 font-bold text-[11px] ${
                                                            active
                                                                ? "bg-white/20 text-white"
                                                                : "bg-orange-100 text-orange-700"
                                                        }`}>
                                                        {tab.badge}
                                                    </span>
                                                ) : null}
                                            </motion.div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex flex-1 flex-col gap-3 xl:max-w-xl xl:flex-row xl:justify-end">
                                <div className="relative">
                                    <SearchOutlined className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={t("searchPlaceholder")}
                                        className="h-11 rounded-xl border-orange-200 bg-white pl-10"
                                    />
                                </div>

                                <Select value={sortBy} onValueChange={setSortBy}>
                                    <SelectTrigger className="h-11 min-w-[150px] rounded-xl border-orange-200 bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="newest">{t("sortNewest")}</SelectItem>
                                        <SelectItem value="oldest">{t("sortOldest")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <div className="mt-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`${activeTab}-${searchQuery}-${sortBy}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}>
                            {currentItems.length === 0 ? (
                                <EmptyState
                                    isSearch={!!searchQuery}
                                    emptyTitle={t("emptyStateTitle")}
                                    emptyDescription={t("emptyStateDescription")}
                                    noResultTitle={t("noResultTitle")}
                                    noResultDescription={t("noResultDescription")}
                                />
                            ) : (
                                <div className="grid gap-4">
                                    {currentItems.map((ann) => (
                                        <AnnouncementCard
                                            key={
                                                activeTab === "public"
                                                    ? (ann as Announcement).announcementId
                                                    : (ann as UserAnnouncement).userAnnouncementId
                                            }
                                            item={ann}
                                            isUserAnn={activeTab === "personal"}
                                            onClick={() =>
                                                handleViewDetail(
                                                    activeTab === "public"
                                                        ? (ann as PublicAnnouncementItem).announcementId
                                                        : (ann as UserAnnouncement).userAnnouncementId,
                                                    activeTab === "personal"
                                                )
                                            }
                                            onDelete={handleDeleteAnnouncement}
                                            onDeleteSystem={(e, announcementId) => {
                                                e.stopPropagation();
                                                openDeleteSystemAnnouncementConfirm(announcementId);
                                            }}
                                            formatDate={formatDate}
                                            getTypeMeta={getTypeMeta}
                                            unreadLabel={t("new")}
                                            systemLabel={t("systemNews")}
                                            updateLabel={t("update")}
                                        />
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            <Dialog
                open={!!selectedId}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedId(null);
                        setSelectedDetail(null);
                    }
                }}>
                <DialogContent className="max-h-[90vh] overflow-hidden rounded-[28px] border border-orange-100 bg-white p-0 sm:max-w-[760px] [&>button:last-child]:hidden">
                    <DialogTitle className="sr-only">Announcement Details</DialogTitle>
                    {isDetailLoading ? (
                        <div className="flex justify-center p-20">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
                        </div>
                    ) : (
                        selectedDetail && (
                            <div>
                                <div
                                    className={`bg-gradient-to-br ${getTypeMeta(selectedDetail.type).modalBg} border-orange-100 border-b px-6 py-6`}>
                                    <div className="mb-4 flex items-center gap-4">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                                            {getTypeMeta(selectedDetail.type).iconLarge}
                                        </div>
                                        <div>
                                            <div
                                                className={`inline-flex rounded-full border px-3 py-1 font-bold text-xs uppercase tracking-[0.16em] ${getTypeMeta(selectedDetail.type).badgeClass}`}>
                                                {getTypeMeta(selectedDetail.type).label}
                                            </div>
                                            <p className="mt-2 block text-slate-500 text-sm">
                                                <ClockCircleOutlined className="mr-2" />
                                                {formatDate(selectedDetail.publishedAt)}
                                            </p>
                                        </div>
                                    </div>

                                    <h3 className="font-extrabold text-3xl text-slate-900 leading-[1.2]">
                                        {selectedDetail.title}
                                    </h3>
                                </div>

                                <div className="max-h-[50vh] overflow-y-auto px-6 py-6">
                                    <p className="whitespace-pre-wrap text-[15px] text-slate-600 leading-8">
                                        {selectedDetail.content}
                                    </p>
                                </div>

                                <DialogFooter className="border-orange-100 border-t px-6 py-5">
                                    <Button
                                        onClick={() => setSelectedId(null)}
                                        className="h-11 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-8 font-semibold text-white hover:from-[#EA580C] hover:to-[#DC2626]">
                                        {t("confirmed")}
                                    </Button>
                                </DialogFooter>
                            </div>
                        )
                    )}

                    <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        className="absolute top-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-slate-400 transition hover:bg-white hover:text-slate-700">
                        <CloseOutlined />
                    </button>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={isDeleteConfirmOpen}
                onOpenChange={(open) => {
                    setIsDeleteConfirmOpen(open);
                    if (!open && !isDeleting) {
                        setDeleteTarget(null);
                    }
                }}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("confirmDeleteTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("confirmDelete")}</AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isDeleting}
                            onClick={(e) => {
                                e.preventDefault();
                                void confirmDeleteAnnouncement();
                            }}
                            className="bg-red-500 text-white hover:bg-red-600">
                            {isDeleting ? t("deleting") : t("delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function StatCard({
    label,
    value,
    icon,
    iconClass
}: {
    label: string;
    value: number;
    icon: React.ReactNode;
    iconClass: string;
}) {
    return (
        <motion.div
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl border border-orange-200 bg-white p-5 shadow-[0_10px_30px_rgba(249,115,22,0.06)]">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="block font-bold text-[#7C6A5A] text-sm">{label}</p>
                    <h2 className="mt-2 font-extrabold text-4xl text-[#261E33] tracking-tight">{value}</h2>
                </div>
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${iconClass}`}>
                    <span className="text-xl">{icon}</span>
                </div>
            </div>
        </motion.div>
    );
}

function AnnouncementCard({
    item,
    isUserAnn,
    onClick,
    onDelete,
    onDeleteSystem,
    formatDate,
    getTypeMeta,
    unreadLabel,
    systemLabel,
    updateLabel
}: {
    item: Announcement | UserAnnouncement;
    isUserAnn?: boolean;
    onClick: () => void;
    onDelete?: (e: React.MouseEvent, target: UserAnnouncement) => void;
    onDeleteSystem?: (e: React.MouseEvent, announcementId: string) => void;
    formatDate: (value: string) => string;
    unreadLabel: string;
    systemLabel: string;
    updateLabel: string;
    getTypeMeta: (type: string) => {
        label: string;
        icon: React.ReactNode;
        iconLarge: React.ReactNode;
        badgeClass: string;
        cardClass: string;
        modalBg: string;
    };
}) {
    const userAnn = item as UserAnnouncement;
    const isUnread = isUserAnn && "isRead" in item && !item.isRead;
    const canDelete = isUserAnn && "userAnnouncementId" in item;
    const systemAnnouncementId = !isUserAnn && "announcementId" in item ? String((item as Announcement).announcementId) : "";
    const meta = getTypeMeta(item.type);

    return (
        <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.18 }}
            onClick={onClick}
            className="group cursor-pointer rounded-3xl border border-orange-200 bg-white p-5 shadow-[0_10px_30px_rgba(249,115,22,0.06)] transition-all hover:shadow-[0_14px_36px_rgba(249,115,22,0.12)]">
            <div className="flex items-start gap-4">
                <div
                    className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl ${meta.cardClass}`}>
                    {meta.icon}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                        <div
                            className={`inline-flex rounded-full border px-3 py-1 font-bold text-[11px] uppercase tracking-[0.16em] ${meta.badgeClass}`}>
                            {meta.label}
                        </div>

                        {isUnread && (
                            <Badge className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 font-bold text-[11px] text-orange-700 hover:bg-orange-100">
                                <span className="h-2 w-2 rounded-full bg-orange-500" />
                                {unreadLabel}
                            </Badge>
                        )}
                    </div>

                    <h4
                        className={`mb-2 text-lg leading-7 ${
                            isUnread ? "font-extrabold text-[#261E33]" : "font-bold text-slate-800"
                        }`}>
                        {item.title}
                    </h4>

                    <p className="mb-4 line-clamp-2 text-[#7C6A5A] text-sm leading-7">{item.content}</p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <p className="font-medium text-slate-400 text-xs">
                            <ClockCircleOutlined className="mr-2" />
                            {formatDate(item.publishedAt)}
                        </p>
                        <p className="font-medium text-slate-400 text-xs">
                            {item.type === "0" || item.type === "info" ? systemLabel : updateLabel}
                        </p>
                    </div>
                </div>

                <div className="ml-auto flex items-center gap-2">
                    {canDelete && onDelete ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-full border border-red-200 bg-red-50 text-red-600 opacity-100 transition-all hover:border-red-300 hover:bg-red-100 hover:text-red-700"
                            onClick={(e) => onDelete(e, userAnn)}>
                            <DeleteOutlined />
                        </Button>
                    ) : systemAnnouncementId && onDeleteSystem ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-full border border-red-200 bg-red-50 text-red-600 opacity-100 transition-all hover:border-red-300 hover:bg-red-100 hover:text-red-700"
                            onClick={(e) => onDeleteSystem(e, systemAnnouncementId)}>
                            <DeleteOutlined />
                        </Button>
                    ) : null}

                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-400 transition-all group-hover:translate-x-0.5 group-hover:bg-orange-100 group-hover:text-orange-600">
                        <RightOutlined />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function EmptyState({
    isSearch,
    emptyTitle,
    emptyDescription,
    noResultTitle,
    noResultDescription
}: {
    isSearch: boolean;
    emptyTitle: string;
    emptyDescription: string;
    noResultTitle: string;
    noResultDescription: string;
}) {
    return (
        <div className="rounded-[32px] border border-orange-200 border-dashed bg-white px-6 py-20 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-orange-50">
                <SoundOutlined className="text-4xl text-orange-300" />
            </div>
            <h4 className="mb-2 font-extrabold text-[#261E33] text-xl">{isSearch ? noResultTitle : emptyTitle}</h4>
            <p className="text-[#7C6A5A]">{isSearch ? noResultDescription : emptyDescription}</p>
        </div>
    );
}
