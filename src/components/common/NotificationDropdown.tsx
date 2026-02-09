"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

interface Notification {
  id: string;
  title: string;
  description: string;
  type: "system" | "warning" | "info" | "success";
  date: string;
  read: boolean;
  link?: string;
}

const BellIcon = () => (
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
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 10L8 16L18 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const WarningIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
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
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
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

export function NotificationDropdown() {
  const t = useTranslations("Notifications");
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get current locale from pathname
  const currentLocale = pathname.split("/")[1] || "vi";

  const getInitialNotifications = (): Notification[] => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("notifications");
      if (saved) {
        return JSON.parse(saved);
      }
    }

    return [
      {
        id: "1",
        title: t("items.upgrade.title"),
        description: t("items.upgrade.description"),
        type: "warning",
        date: t("items.upgrade.date"),
        read: false
      },
      {
        id: "2",
        title: t("items.maintenance.title"),
        description: t("items.maintenance.description"),
        type: "system",
        date: t("items.maintenance.date"),
        read: false
      },
      {
        id: "3",
        title: t("items.feature.title"),
        description: t("items.feature.description"),
        type: "success",
        date: t("items.feature.date"),
        read: true
      }
    ];
  };

  const [notifications, setNotifications] = useState<Notification[]>(getInitialNotifications());

  // Save to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("notifications", JSON.stringify(notifications));
    }
  }, [notifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    setNotifications(notifications.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));

    // Close dropdown
    setIsOpen(false);

    // Navigate to announcements page with the notification ID
    router.push(`/${currentLocale}/announcements?id=${notification.id}`);
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <WarningIcon />;
      case "success":
        return <CheckIcon />;
      case "info":
        return <InfoIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "warning":
        return "text-orange-500";
      case "success":
        return "text-green-500";
      case "info":
        return "text-blue-500";
      case "system":
        return "text-purple-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-[#6F6B99] transition-colors hover:bg-[#F4F5FA] hover:text-[#261E33]">
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF5F3D] font-bold text-white text-xs">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 z-50 mt-2 w-96 rounded-xl border border-[#E5E5E5] bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-[#E5E5E5] border-b px-4 py-3">
            <h3 className="font-semibold text-[#261E33]">{t("title")}</h3>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllAsRead} className="text-[#FF5F3D] text-xs hover:underline">
                {t("markAllRead")}
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full cursor-pointer border-[#E5E5E5] border-b px-4 py-3 text-left transition-colors hover:bg-[#F9F9F9] ${
                    !notification.read ? "bg-orange-50" : ""
                  }`}>
                  <div className="flex gap-3">
                    <div className={`mt-1 flex-shrink-0 ${getTypeColor(notification.type)}`}>
                      {getTypeIcon(notification.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-[#261E33] text-sm">{notification.title}</h4>
                        {!notification.read && (
                          <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[#FF5F3D]" />
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-[#6F6B99] text-xs">{notification.description}</p>
                      <span className="mt-2 block text-[#9CA3AF] text-xs">{notification.date}</span>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="py-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center text-[#9CA3AF]">
                  <BellIcon />
                </div>
                <p className="text-[#6F6B99] text-sm">{t("noNotifications")}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-[#E5E5E5] border-t px-4 py-3">
              <Link
                href={`/${currentLocale}/announcements`}
                onClick={() => setIsOpen(false)}
                className="block text-center font-medium text-[#FF5F3D] text-sm hover:underline">
                {t("viewAll")}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
