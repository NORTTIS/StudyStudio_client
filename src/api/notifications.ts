import { apiGet } from "@/api/api-client";
import type { components } from "@/api/types";

export interface Notification {
    id: string;
    title: string;
    description: string;
    type: "system" | "warning" | "info" | "success";
    date: string;
    read: boolean;
    link?: string;
}

export interface Announcement extends Notification {
    priority: "high" | "medium" | "low";
}

type AnnouncementResponse = components["schemas"]["AnnouncementResponse"];
type AnnouncementListResponse = AnnouncementResponse[];

const ANNOUNCEMENT_READ_KEY = "announcementReadMap";

function isBrowser() {
    return typeof window !== "undefined";
}

function getReadMap(): Record<string, boolean> {
    if (!isBrowser()) return {};

    const raw = localStorage.getItem(ANNOUNCEMENT_READ_KEY);
    if (!raw) return {};

    try {
        return JSON.parse(raw) as Record<string, boolean>;
    } catch {
        return {};
    }
}

function saveReadMap(map: Record<string, boolean>): void {
    if (!isBrowser()) return;
    localStorage.setItem(ANNOUNCEMENT_READ_KEY, JSON.stringify(map));
}

function detectType(rawType?: string | null): Notification["type"] {
    const normalized = (rawType || "").toLowerCase();

    if (normalized.includes("warn") || normalized.includes("critical") || normalized.includes("urgent")) {
        return "warning";
    }

    if (normalized.includes("success") || normalized.includes("done") || normalized.includes("complete")) {
        return "success";
    }

    if (normalized.includes("system") || normalized.includes("maintain") || normalized.includes("update")) {
        return "system";
    }

    return "info";
}

function getPriorityFromType(type: Notification["type"]): Announcement["priority"] {
    if (type === "warning") return "high";
    if (type === "system") return "medium";
    return "low";
}

function formatDate(value?: string | null): string {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
}

function mapAnnouncement(item: AnnouncementResponse, readMap: Record<string, boolean>): Announcement {
    const id = item.announcementId ?? "";
    const type = detectType(item.type);

    return {
        id,
        title: item.title || "",
        description: item.content || "",
        type,
        date: formatDate(item.publishedAt || item.createdAt),
        read: Boolean(readMap[id]),
        priority: getPriorityFromType(type)
    };
}

/**
 * Fetch all notifications for the current user
 * @returns Promise<Notification[]>
 */
export async function fetchNotifications(locale = "vi"): Promise<Notification[]> {
    const announcements = await fetchAnnouncements(locale);
    return announcements.map(({ priority: _priority, ...notification }) => notification);
}

/**
 * Mark a notification as read
 * @param notificationId - The ID of the notification to mark as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
    const currentMap = getReadMap();
    currentMap[notificationId] = true;
    saveReadMap(currentMap);
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(locale = "vi"): Promise<void> {
    const announcements = await fetchAnnouncements(locale);
    const currentMap = getReadMap();

    for (const announcement of announcements) {
        currentMap[announcement.id] = true;
    }

    saveReadMap(currentMap);
}

/**
 * Fetch all announcements
 * @returns Promise<Announcement[]>
 */
export async function fetchAnnouncements(locale = "vi"): Promise<Announcement[]> {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    const response = await apiGet<AnnouncementListResponse>(`${baseUrl}/announcements`, locale);
    if (response.status !== "success") {
        throw new Error(response.message || "Failed to fetch announcements");
    }

    const announcementItems = response.data || [];
    const readMap = getReadMap();
    return announcementItems.map((item) => mapAnnouncement(item, readMap));
}

/**
 * Mark an announcement as read
 * @param announcementId - The ID of the announcement to mark as read
 */
export async function markAnnouncementAsRead(announcementId: string): Promise<void> {
    const currentMap = getReadMap();
    currentMap[announcementId] = true;
    saveReadMap(currentMap);
}
