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
import { Badge, Button, ConfigProvider, Input, Modal, message, Select, Spin, Tabs, Typography } from "antd";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { type AdminAnnouncement } from "@/api/admin-announcements";
import {
    type Announcement,
    deleteUserAnnouncement,
    getAllAnnouncements,
    getAnnouncementById,
    getUserAnnouncements,
    markAnnouncementAsRead,
    type UserAnnouncement
} from "@/api/user-announcements";

const { Title, Text, Paragraph } = Typography;

export function AnnouncementsPage() {
    const locale = useLocale();
    const t = useTranslations();

    // Data State
    const [publicAnnouncements, setPublicAnnouncements] = useState<Announcement[]>([]);
    const [userAnnouncements, setUserAnnouncements] = useState<UserAnnouncement[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // UI State
    const [activeTab, setActiveTab] = useState("public");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("newest");
    const [filterType, setFilterType] = useState("all");

    // Detail Modal State
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedDetail, setSelectedDetail] = useState<Announcement | UserAnnouncement | null>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);

    const loadAnnouncements = useCallback(async () => {
        setIsLoading(true);
        try {
            const [publicResult, userResult] = await Promise.allSettled([
                getAllAnnouncements(locale),
                getUserAnnouncements(locale)
            ]);

            if (publicResult.status === "fulfilled" && publicResult.value.status === "success") {
                setPublicAnnouncements(publicResult.value.data || []);
            }

            if (userResult.status === "fulfilled" && userResult.value.status === "success") {
                setUserAnnouncements(userResult.value.data || []);
            }
        } catch (error) {
            console.error("Failed to load announcements:", error);
            message.error(t("Common.loadError") || "Failed to load announcements");
        } finally {
            setIsLoading(false);
        }
    }, [locale, t]);

    useEffect(() => {
        loadAnnouncements();
    }, [loadAnnouncements]);

    const handleViewDetail = async (id: string, isUserAnn: boolean) => {
        setSelectedId(id);
        setIsDetailLoading(true);
        try {
            const localData = isUserAnn
                ? userAnnouncements.find((a) => a.userAnnouncementId === id)
                : publicAnnouncements.find((a) => a.announcementId === id);

            if (localData) {
                setSelectedDetail(localData as any);
                if (isUserAnn && !(localData as UserAnnouncement).isRead) {
                    await handleMarkAsRead(id, false);
                }
            }

            const actualId = isUserAnn ? (localData as UserAnnouncement).announcementId : id;
            const result = await getAnnouncementById(actualId, locale);
            if (result.status === "success" && result.data) {
                setSelectedDetail(result.data);
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
                setUserAnnouncements((prev) =>
                    prev.map((ann) => (ann.userAnnouncementId === userAnnouncementId ? { ...ann, isRead: true } : ann))
                );
                if (showMsg) message.success(t("Announcements.markAsReadSuccess"));
            }
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    };

    const handleDeleteAnnouncement = (e: React.MouseEvent, userAnnouncementId: string) => {
        e.stopPropagation();

        Modal.confirm({
            title: t("Announcements.confirmDelete"),
            icon: <ExclamationCircleOutlined className="text-red-500" />,
            okText: t("Announcements.delete"),
            okType: "danger",
            cancelText: t("Announcements.cancel") || "Cancel",
            async onOk() {
                try {
                    const result = await deleteUserAnnouncement(userAnnouncementId, locale);
                    if (result.status === "success") {
                        setUserAnnouncements((prev) =>
                            prev.filter((ann) => ann.userAnnouncementId !== userAnnouncementId)
                        );
                        message.success(t("Announcements.deleteSuccess"));
                    }
                } catch (_error) {
                    message.error("Xóa không thành công");
                }
            }
        });
    };

    const filterAndSort = <T extends { title: string; content: string; publishedAt: string; type: string }>(
        items: T[]
    ) => {
        let filtered = items;

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (item) => item.title.toLowerCase().includes(query) || item.content.toLowerCase().includes(query)
            );
        }

        if (filterType !== "all") {
            filtered = filtered.filter((item) => {
                const type = item.type.toLowerCase();
                if (filterType === "info") return type === "0" || type === "info";
                if (filterType === "warning") return type === "1" || type === "warning";
                if (filterType === "critical") return type === "2" || type === "critical";
                return true;
            });
        }

        return [...filtered].sort((a, b) => {
            const dateA = new Date(a.publishedAt).getTime();
            const dateB = new Date(b.publishedAt).getTime();
            return sortBy === "newest" ? dateB - dateA : dateA - dateB;
        });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(locale, {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const getTypeColorClass = (type: string) => {
        switch (type.toLowerCase()) {
            case "1":
            case "warning":
                return "text-amber-500 bg-amber-50";
            case "2":
            case "critical":
                return "text-red-500 bg-red-50";
            default:
                return "text-orange-500 bg-orange-50";
        }
    };

    const getTypeIcon = (type: string, isLarge = false) => {
        const size = isLarge ? "text-2xl" : "text-xl";
        switch (type.toLowerCase()) {
            case "0":
            case "info":
                return <InfoCircleOutlined className={`${size} text-blue-500`} />;
            case "1":
            case "warning":
                return <WarningOutlined className={`${size} text-amber-500`} />;
            case "2":
            case "critical":
                return <ExclamationCircleOutlined className={`${size} text-red-500`} />;
            default:
                return <BellOutlined className={`${size} text-orange-500`} />;
        }
    };

    const unreadCount = userAnnouncements.filter((ann) => !ann.isRead).length;

    if (isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Spin size="large" tip="Đang tải thông báo..." />
            </div>
        );
    }

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: "#f97316", // Orange-500
                    borderRadius: 8, // 2xl (approx based on brief's 8px)
                    fontFamily: "inherit"
                }
            }}>
            <div className="mx-auto min-h-screen max-w-full bg-white px-8 py-12">
                {/* Header Section */}
                <div className="mb-16 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                    <Title level={1} className="!m-0 !text-6xl !font-black !tracking-tighter">
                        {t("Announcements.title")}
                    </Title>
                    {unreadCount > 0 && (
                        <Badge
                            count={`${unreadCount} ${t("Announcements.new")}`}
                            color="#f97316"
                            className="scale-125 font-bold md:ml-4"
                        />
                    )}
                </div>

                {/* Stats Cards Grid */}
                <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
                    {[
                        {
                            label: t("Announcements.total"),
                            value: publicAnnouncements.length + userAnnouncements.length,
                            icon: <BellOutlined />
                        },
                        {
                            label: t("Announcements.public"),
                            value: publicAnnouncements.length,
                            icon: <CheckCircleOutlined />
                        },
                        { label: t("Announcements.personal"), value: userAnnouncements.length, icon: <EyeOutlined /> }
                    ].map((stat) => (
                        <motion.div
                            key={stat.label}
                            whileHover={{ scale: 0.98 }}
                            className="flex items-center gap-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-2xl text-orange-500">
                                {stat.icon}
                            </div>
                            <div>
                                <Text className="mb-1 block font-bold text-gray-400 text-xs uppercase tracking-widest">
                                    {stat.label}
                                </Text>
                                <Title level={2} className="!m-0 !font-black">
                                    {stat.value}
                                </Title>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Sticky Control Bar */}
                <div className="sticky top-4 z-50 mb-10 flex flex-col gap-4 rounded-xl border border-gray-200 bg-gray-50/90 p-2 shadow-sm backdrop-blur-md lg:flex-row">
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        className="!mb-0 flex-shrink-0"
                        items={[
                            { label: t("Announcements.publicTab"), key: "public" },
                            {
                                label: (
                                    <Badge count={unreadCount} offset={[10, 0]} size="small">
                                        {t("Announcements.personalTab")}
                                    </Badge>
                                ),
                                key: "personal"
                            }
                        ]}
                    />

                    <div className="flex flex-1 flex-col items-center gap-3 md:flex-row">
                        <Input
                            placeholder={t("Announcements.searchPlaceholder")}
                            prefix={<SearchOutlined className="text-gray-300" />}
                            variant="filled"
                            className="h-10 rounded-lg"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <div className="flex w-full gap-2 md:w-auto">
                            <Select
                                value={filterType}
                                onChange={setFilterType}
                                className="h-10 w-full md:w-40"
                                variant="filled"
                                options={[
                                    { value: "all", label: t("Announcements.typeAll") || "Tất cả loại" },
                                    { value: "info", label: t("Announcements.info") },
                                    { value: "warning", label: t("Announcements.warning") },
                                    { value: "critical", label: t("Announcements.critical") }
                                ]}
                            />
                            <Select
                                value={sortBy}
                                onChange={setSortBy}
                                className="h-10 w-full md:w-40"
                                variant="filled"
                                options={[
                                    { value: "newest", label: t("Announcements.sortNewest") || "Mới nhất" },
                                    { value: "oldest", label: t("Announcements.sortOldest") || "Cũ nhất" }
                                ]}
                            />
                        </div>
                    </div>
                </div>

                {/* Content List */}
                <div className="space-y-4">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}>
                            {activeTab === "public" ? (
                                filterAndSort(publicAnnouncements).length === 0 ? (
                                    <EmptyState isSearch={!!searchQuery} t={t} />
                                ) : (
                                    filterAndSort(publicAnnouncements).map((ann) => (
                                        <AnnouncementCard
                                            key={ann.announcementId}
                                            item={ann}
                                            onClick={() => handleViewDetail(ann.announcementId, false)}
                                            formatDate={formatDate}
                                            getTypeIcon={getTypeIcon}
                                            t={t}
                                        />
                                    ))
                                )
                            ) : filterAndSort(userAnnouncements).length === 0 ? (
                                <EmptyState isSearch={!!searchQuery} t={t} />
                            ) : (
                                filterAndSort(userAnnouncements).map((ann) => (
                                    <AnnouncementCard
                                        key={ann.userAnnouncementId}
                                        item={ann}
                                        isUserAnn
                                        onClick={() => handleViewDetail(ann.userAnnouncementId, true)}
                                        onDelete={handleDeleteAnnouncement}
                                        formatDate={formatDate}
                                        getTypeIcon={getTypeIcon}
                                        t={t}
                                    />
                                ))
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Detail Modal */}
                <Modal
                    open={!!selectedId}
                    onCancel={() => setSelectedId(null)}
                    footer={[
                        <Button
                            key="ok"
                            type="primary"
                            size="large"
                            onClick={() => setSelectedId(null)}
                            className="rounded-xl px-10 font-bold">
                            {t("Announcements.confirmed") || "Đã hiểu"}
                        </Button>
                    ]}
                    width={700}
                    className="announcement-modal"
                    closeIcon={<CloseOutlined className="text-gray-400" />}
                    styles={{
                        header: { borderBottom: "none" },
                        footer: { borderTop: "none", padding: "0 40px 40px 40px" },
                        body: { borderRadius: "24px", padding: 0 }
                    }}>
                    {isDetailLoading ? (
                        <div className="flex justify-center p-20">
                            <Spin />
                        </div>
                    ) : (
                        selectedDetail && (
                            <div className="p-10 pb-0">
                                <div className="mb-6 flex items-center gap-4">
                                    {getTypeIcon(selectedDetail.type, true)}
                                    <Badge
                                        text={
                                            selectedDetail.type === "0" || selectedDetail.type === "info"
                                                ? t("Announcements.info")
                                                : selectedDetail.type === "1" || selectedDetail.type === "warning"
                                                  ? t("Announcements.warning")
                                                  : t("Announcements.critical")
                                        }
                                        className={`${getTypeColorClass(selectedDetail.type)} rounded-full px-4 py-1 font-bold text-[10px] uppercase tracking-widest`}
                                    />
                                </div>
                                <Title level={3} className="!font-black !text-4xl !mb-4 leading-tight">
                                    {selectedDetail.title}
                                </Title>
                                <Text className="mb-10 flex items-center gap-2 font-bold text-gray-400 text-xs">
                                    <ClockCircleOutlined /> {formatDate(selectedDetail.publishedAt)}
                                </Text>
                                <Paragraph className="whitespace-pre-wrap text-gray-700 text-lg leading-relaxed">
                                    {selectedDetail.content}
                                </Paragraph>
                            </div>
                        )
                    )}
                </Modal>
            </div>
        </ConfigProvider>
    );
}

function AnnouncementCard({
    item,
    isUserAnn = false,
    onClick,
    onDelete,
    formatDate,
    getTypeIcon,
    t
}: {
    item: UserAnnouncement | AdminAnnouncement | Announcement;
    isUserAnn?: boolean;
    onClick: (item: UserAnnouncement | AdminAnnouncement | Announcement) => void;
    onDelete?: (e: React.MouseEvent, id: string) => void;
    formatDate: (date: string) => string;
    getTypeIcon: (type: string) => React.ReactNode;
    t: (key: string) => string;
}) {
    const userAnn = item as UserAnnouncement;
    const isUnread = isUserAnn && !userAnn.isRead;

    return (
        <motion.div
            whileHover={{ y: -4 }}
            onClick={() => onClick(item)}
            className={`group relative flex cursor-pointer items-center gap-6 rounded-2xl border border-gray-100 bg-white p-6 transition-all ${isUnread ? "border-l-4 border-l-orange-500 bg-orange-50/30 shadow-sm" : "hover:shadow-md"}`}>
            {/* Icon (Left) */}
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gray-50 transition-colors duration-300 group-hover:bg-white">
                {getTypeIcon(item.type)}
            </div>

            {/* Content (Middle) */}
            <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-3">
                    <Text
                        className={`block truncate font-bold text-lg ${isUnread ? "font-black text-black" : "text-gray-800"}`}>
                        {item.title}
                    </Text>
                    {isUnread && <div className="h-2 w-2 shrink-0 rounded-full bg-orange-500" />}
                </div>
                <Paragraph className="!m-0 line-clamp-2 whitespace-pre-wrap text-gray-400 text-sm leading-relaxed">
                    {item.content}
                </Paragraph>
                <div className="mt-3 flex items-center gap-4">
                    <Text className="font-bold text-[10px] text-gray-300 uppercase tracking-widest">
                        {formatDate(item.publishedAt)}
                    </Text>
                    <div className="h-1 w-1 rounded-full bg-gray-200" />
                    <Text className="font-bold text-[10px] text-gray-300 uppercase tracking-widest">
                        {item.type === "0" || item.type === "info" ? "System" : "Update"}
                    </Text>
                </div>
            </div>

            {/* Actions (Right) */}
            <div className="ml-4 flex items-center gap-2">
                <AnimatePresence>
                    {isUserAnn && (
                        <Button
                            icon={<DeleteOutlined />}
                            type="text"
                            danger
                            className="opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={(e) => onDelete?.(e, userAnn.userAnnouncementId)}
                        />
                    )}
                </AnimatePresence>
                <RightOutlined className="text-gray-200 transition-all group-hover:translate-x-1 group-hover:text-orange-400" />
            </div>
        </motion.div>
    );
}

function EmptyState({ isSearch, t }: { isSearch: boolean; t: (key: string) => string }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-gray-200 border-dashed bg-gray-50 py-24">
            <SoundOutlined className="mb-6 text-5xl text-gray-200" />
            <Title level={4} className="!m-0 !font-black text-gray-800">
                {isSearch ? "Không có kết quả" : "Mọi thứ đều cập nhật!"}
            </Title>
            <Text className="mt-2 font-medium text-gray-400">
                {isSearch ? "Thử tìm kiếm với từ khóa khác xem sao." : "Bạn đã đọc hết tất cả thông báo rồi."}
            </Text>
        </div>
    );
}
