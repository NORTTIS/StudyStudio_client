"use client";

import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { type Announcement, fetchAnnouncements, markAnnouncementAsRead } from "@/api/notifications";
import { Container, ErrorDisplay } from "@/components/common";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const BellIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M15.5 7C15.5 5.67392 14.9732 4.40215 14.0355 3.46447C13.0979 2.52678 11.8261 2 10.5 2C9.17392 2 7.90215 2.52678 6.96447 3.46447C6.02678 4.40215 5.5 5.67392 5.5 7C5.5 13 2 15 2 15H19C19 15 15.5 13 15.5 7Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M12.5 18.5C12.5 18.8978 12.342 19.2794 12.0607 19.5607C11.7794 19.842 11.3978 20 11 20H10C9.60218 20 9.22064 19.842 8.93934 19.5607C8.65804 19.2794 8.5 18.8978 8.5 18.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const CheckIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 10L8 16L18 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const WarningIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M10 2L2 17H18L10 2Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path d="M10 8V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 16H10.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const InfoIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path d="M10 14V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 6H10.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

type FilterType = "all" | "unread";

export default function AnnouncementsPage() {
    const t = useTranslations("AnnouncementsPage");
    const locale = useLocale();
    const searchParams = useSearchParams();
    const selectedId = searchParams.get("id");

    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterType>("all");
    const [search, setSearch] = useState("");

    useEffect(() => {
        const loadAnnouncements = async () => {
            setIsLoading(true);
            setErrorMessage(null);
            try {
                const data = await fetchAnnouncements(locale);
                setAnnouncements(data);
            } catch (error) {
                const message = error instanceof Error ? error.message : t("noAnnouncements");
                setErrorMessage(message);
                setAnnouncements([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadAnnouncements();
    }, [locale, t]);

    useEffect(() => {
        if (!selectedId) return;

        const timeout = setTimeout(() => {
            const element = document.getElementById(`announcement-${selectedId}`);
            if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        }, 100);

        return () => clearTimeout(timeout);
    }, [selectedId]);

    const handleMarkAsRead = async (id: string) => {
        await markAnnouncementAsRead(id);
        setAnnouncements((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)));
    };

    const getTypeStyles = (type: Announcement["type"]) => {
        switch (type) {
            case "warning":
                return { bg: "bg-orange-50", border: "border-orange-200", icon: "text-orange-500" };
            case "system":
                return { bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-500" };
            case "success":
                return { bg: "bg-green-50", border: "border-green-200", icon: "text-green-500" };
            default:
                return { bg: "bg-purple-50", border: "border-purple-200", icon: "text-purple-500" };
        }
    };

    const getTypeIcon = (type: Announcement["type"]) => {
        switch (type) {
            case "warning":
                return <WarningIcon />;
            case "system":
                return <BellIcon />;
            case "success":
                return <CheckIcon />;
            default:
                return <InfoIcon />;
        }
    };

    const filteredAnnouncements = announcements.filter((item) => {
        if (filter === "unread" && item.read) return false;

        if (search.trim()) {
            const keyword = search.toLowerCase();
            return item.title.toLowerCase().includes(keyword) || item.description.toLowerCase().includes(keyword);
        }

        return true;
    });

    const unreadCount = announcements.filter((item) => !item.read).length;

    if (errorMessage) {
        return (
            <div className="flex h-screen overflow-hidden bg-[#F8F8F8] text-[#261E33]">
                <DashboardSidebar />

                <main className="flex-1 overflow-y-auto">
                    <div className="sticky top-0 z-20 border-b bg-white">
                        <Header />
                    </div>

                    <Container className="py-6 sm:py-8">
                        <ErrorDisplay message={errorMessage} />
                    </Container>
                </main>
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden bg-[#F8F8F8] text-[#261E33]">
            <DashboardSidebar />

            <main className="flex-1 overflow-y-auto">
                <div className="sticky top-0 z-20 border-b bg-white">
                    <Header />
                </div>

                <Container className="py-6 sm:py-8">
                    <div className="mb-6">
                        <h1 className="mb-2 font-bold text-3xl text-[#261E33]">{t("title")}</h1>
                        <p className="text-[#6F6B99]">{t("subtitle")}</p>
                    </div>

                    <div className="mb-4 max-w-md">
                        <Input
                            type="text"
                            placeholder={t("searchPlaceholder")}
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>

                    <div className="mb-6 flex gap-3">
                        <Button
                            type="button"
                            onClick={() => setFilter("all")}
                            className={
                                filter === "all"
                                    ? "bg-[#FF5F3D] text-white"
                                    : "border border-[#E5E5E5] bg-white text-[#6F6B99] hover:bg-[#F9F9F9]"
                            }>
                            {t("filters.all")}
                        </Button>
                        <Button
                            type="button"
                            onClick={() => setFilter("unread")}
                            className={
                                filter === "unread"
                                    ? "bg-[#FF5F3D] text-white"
                                    : "border border-[#E5E5E5] bg-white text-[#6F6B99] hover:bg-[#F9F9F9]"
                            }>
                            {t("filters.unread")} ({unreadCount})
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="space-y-3">
                            <div className="h-24 animate-pulse rounded-xl border border-[#E5E5E5] bg-white" />
                            <div className="h-24 animate-pulse rounded-xl border border-[#E5E5E5] bg-white" />
                            <div className="h-24 animate-pulse rounded-xl border border-[#E5E5E5] bg-white" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredAnnouncements.length > 0 ? (
                                filteredAnnouncements.map((announcement) => {
                                    const styles = getTypeStyles(announcement.type);
                                    const isSelected = selectedId === announcement.id;

                                    return (
                                        <button
                                            key={announcement.id}
                                            type="button"
                                            id={`announcement-${announcement.id}`}
                                            onClick={() => handleMarkAsRead(announcement.id)}
                                            className={`w-full rounded-xl border-2 p-4 text-left transition-all hover:shadow-md ${styles.bg} ${styles.border} ${!announcement.read ? "ring-2 ring-orange-400" : ""} ${isSelected ? "shadow-lg ring-2 ring-[#FF5F3D]" : ""}`}>
                                            <div className="flex items-start gap-4">
                                                <div className={`mt-1 shrink-0 text-2xl ${styles.icon}`}>
                                                    {getTypeIcon(announcement.type)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="font-semibold text-[#261E33] text-lg">
                                                                    {announcement.title}
                                                                </h3>
                                                                {!announcement.read && (
                                                                    <span className="inline-flex h-2 w-2 rounded-full bg-[#FF5F3D]" />
                                                                )}
                                                            </div>
                                                            <p className="mt-1 text-[#6F6B99] text-sm">
                                                                {announcement.description}
                                                            </p>
                                                            <div className="mt-3 flex items-center gap-2">
                                                                <span className="text-[#9CA3AF] text-xs">
                                                                    {announcement.date}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="rounded-xl border-2 border-[#E5E5E5] border-dashed py-12 text-center">
                                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center text-[#9CA3AF]">
                                        <BellIcon />
                                    </div>
                                    <p className="text-[#6F6B99]">{t("noAnnouncements")}</p>
                                </div>
                            )}
                        </div>
                    )}
                </Container>
            </main>
        </div>
    );
}
