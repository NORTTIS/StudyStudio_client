"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { Announcement } from "@/api/notifications";
import { markAnnouncementAsRead } from "@/api/notifications";
import { Button } from "@/components/ui/button";

const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M3 10L10 3L17 10V17H13V13H7V17H3V10Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const GroupsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M13 6C14.1046 6 15 5.10457 15 4C15 2.89543 14.1046 2 13 2C11.8954 2 11 2.89543 11 4C11 5.10457 11.8954 6 13 6Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7 9C8.66274 9 10 7.66274 10 6C10 4.33726 8.66274 3 7 3C5.33726 3 4 4.33726 4 6C4 7.66274 5.33726 9 7 9Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M18 16C18 14.3431 17.1046 13 16 13H10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 13C8.89543 13 8 13.8954 8 15V18H12V15C12 13.8954 11.1046 13 10 13Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 12C2.89543 12 2 12.8954 2 14V18H6V14C6 12.8954 5.10457 12 4 12Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

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

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M19 19L14.65 14.65" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

export default function AnnouncementsPage() {
  const t = useTranslations("AnnouncementsPage");
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");

  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: "1",
      title: t("announcements.upgrade.title"),
      description: t("announcements.upgrade.description"),
      type: "warning",
      date: t("announcements.upgrade.date"),
      read: false,
      priority: "high"
    },
    {
      id: "2",
      title: t("announcements.maintenance.title"),
      description: t("announcements.maintenance.description"),
      type: "system",
      date: t("announcements.maintenance.date"),
      read: false,
      priority: "high"
    },
    {
      id: "3",
      title: t("announcements.feature.title"),
      description: t("announcements.feature.description"),
      type: "success",
      date: t("announcements.feature.date"),
      read: true,
      priority: "medium"
    },
    {
      id: "4",
      title: t("announcements.member.title"),
      description: t("announcements.member.description"),
      type: "info",
      date: t("announcements.member.date"),
      read: true,
      priority: "low"
    },
    {
      id: "5",
      title: t("announcements.achievement.title"),
      description: t("announcements.achievement.description"),
      type: "success",
      date: t("announcements.achievement.date"),
      read: true,
      priority: "low"
    }
  ]);

  const [filter, setFilter] = useState<"all" | "unread" | "warning">("all");

  // TODO: Fetch announcements from API
  // useEffect(() => {
  //   const fetchAnnouncements = async () => {
  //     try {
  //       const response = await fetch('/api/announcements');
  //       const data = await response.json();
  //       setAnnouncements(data);
  //     } catch (error) {
  //       console.error('Failed to fetch announcements:', error);
  //     }
  //   };
  //   fetchAnnouncements();
  // }, []);

  // Scroll to selected notification
  useEffect(() => {
    if (selectedId) {
      setTimeout(() => {
        const element = document.getElementById(`announcement-${selectedId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }
  }, [selectedId]);

  const handleMarkAsRead = async (id: string) => {
    try {
      // Call API to mark announcement as read
      await markAnnouncementAsRead(id);
    } catch (error) {
      console.error("Failed to mark announcement as read:", error);
    }

    // Optimistically update UI
    setAnnouncements(announcements.map((a) => (a.id === id ? { ...a, read: true } : a)));
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case "warning":
        return { bg: "bg-orange-50", border: "border-orange-200", icon: "text-orange-500" };
      case "system":
        return { bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-500" };
      case "success":
        return { bg: "bg-green-50", border: "border-green-200", icon: "text-green-500" };
      case "info":
        return { bg: "bg-purple-50", border: "border-purple-200", icon: "text-purple-500" };
      default:
        return { bg: "bg-gray-50", border: "border-gray-200", icon: "text-gray-500" };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <WarningIcon />;
      case "system":
        return <BellIcon />;
      case "success":
        return <CheckIcon />;
      case "info":
        return <InfoIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return (
          <span className="rounded-full bg-red-100 px-2.5 py-1 font-semibold text-red-700 text-xs">
            {t("priority.high")}
          </span>
        );
      case "medium":
        return (
          <span className="rounded-full bg-yellow-100 px-2.5 py-1 font-semibold text-xs text-yellow-700">
            {t("priority.medium")}
          </span>
        );
      case "low":
        return (
          <span className="rounded-full bg-gray-100 px-2.5 py-1 font-semibold text-gray-700 text-xs">
            {t("priority.low")}
          </span>
        );
      default:
        return null;
    }
  };

  const filteredAnnouncements = announcements.filter((ann) => {
    if (filter === "unread") return !ann.read;
    if (filter === "warning") return ann.type === "warning";
    return true;
  });

  const unreadCount = announcements.filter((a) => !a.read).length;

  return (
    <div className="flex h-screen bg-[#F4F5FA]">
      {/* Sidebar */}
      <div className="hidden w-64 border-[#E5E5E5] border-r bg-white p-4 md:block">
        <Link href="/" className="mb-8 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FF5F3D]">
            <span className="font-bold text-sm text-white">SS</span>
          </div>
          <span className="font-bold text-[#261E33] text-sm">Study Studio</span>
        </Link>

        <nav className="space-y-2">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-[#6F6B99] text-sm hover:bg-[#E5E5E5]">
            <HomeIcon />
            <span>{t("nav.home")}</span>
          </Link>
          <Link
            href="/groups"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-[#6F6B99] text-sm hover:bg-[#E5E5E5]">
            <GroupsIcon />
            <span>{t("nav.groups")}</span>
          </Link>
          <button
            type="button"
            className="w-full rounded-lg bg-[#261E33] px-3 py-2 text-left font-medium text-sm text-white">
            {t("nav.announcements")}
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="border-[#E5E5E5] border-b bg-white px-6 py-4 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <SearchIcon />
                </div>
                <input
                  type="text"
                  placeholder={t("searchPlaceholder")}
                  className="w-full rounded-lg border border-[#E5E5E5] bg-[#F9F9F9] py-2 pr-4 pl-10 text-[#261E33] text-sm placeholder:text-[#9CA3AF] focus:border-[#FF5F3D] focus:outline-none focus:ring-1 focus:ring-[#FF5F3D]"
                />
              </div>
            </div>
            <button type="button" className="relative rounded-lg bg-[#FF5F3D] p-2 text-white hover:bg-[#ff4620]">
              <BellIcon />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 font-bold text-white text-xs">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="mb-2 font-bold text-3xl text-[#261E33]">{t("title")}</h1>
              <p className="text-[#6F6B99]">{t("subtitle")}</p>
            </div>

            {/* Filters */}
            <div className="mb-6 flex gap-3">
              <Button
                type="button"
                onClick={() => setFilter("all")}
                className={`rounded-lg px-4 py-2 font-medium text-sm transition-all ${
                  filter === "all"
                    ? "bg-[#FF5F3D] text-white"
                    : "border border-[#E5E5E5] bg-white text-[#6F6B99] hover:bg-[#F9F9F9]"
                }`}>
                {t("filters.all")}
              </Button>
              <Button
                type="button"
                onClick={() => setFilter("unread")}
                className={`rounded-lg px-4 py-2 font-medium text-sm transition-all ${
                  filter === "unread"
                    ? "bg-[#FF5F3D] text-white"
                    : "border border-[#E5E5E5] bg-white text-[#6F6B99] hover:bg-[#F9F9F9]"
                }`}>
                {t("filters.unread")} ({unreadCount})
              </Button>
              <Button
                type="button"
                onClick={() => setFilter("warning")}
                className={`rounded-lg px-4 py-2 font-medium text-sm transition-all ${
                  filter === "warning"
                    ? "bg-[#FF5F3D] text-white"
                    : "border border-[#E5E5E5] bg-white text-[#6F6B99] hover:bg-[#F9F9F9]"
                }`}>
                {t("filters.important")}
              </Button>
            </div>

            {/* Announcements List */}
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
                      className={`w-full cursor-pointer rounded-xl border-2 p-4 text-left transition-all hover:shadow-md ${styles.bg} ${styles.border} ${
                        !announcement.read ? "ring-2 ring-orange-400" : ""
                      } ${isSelected ? "shadow-lg ring-2 ring-[#FF5F3D]" : ""}`}>
                      <div className="flex items-start gap-4">
                        <div className={`mt-1 flex-shrink-0 text-2xl ${styles.icon}`}>
                          {getTypeIcon(announcement.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-[#261E33] text-lg">{announcement.title}</h3>
                                {!announcement.read && (
                                  <span className="inline-flex h-2 w-2 rounded-full bg-[#FF5F3D]" />
                                )}
                              </div>
                              <p className="mt-1 text-[#6F6B99] text-sm">{announcement.description}</p>
                              <div className="mt-3 flex items-center gap-2">
                                <span className="text-[#9CA3AF] text-xs">{announcement.date}</span>
                                {getPriorityBadge(announcement.priority)}
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              {announcement.type === "warning" && (
                                <Button
                                  type="button"
                                  className="rounded-lg bg-[#FF5F3D] px-4 py-2 font-semibold text-white text-xs hover:bg-[#ff4620]">
                                  {t("upgradeNow")}
                                </Button>
                              )}
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
          </div>
        </div>
      </div>
    </div>
  );
}
