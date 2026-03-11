import { apiFetch, apiGet } from "@/api/api-client";
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

type AnnouncementApiResponse = components["schemas"]["AnnouncementResponse"];
type UserAnnouncementResponse = components["schemas"]["UserAnnouncementResponse"];
type UserAnnouncementListResponse = UserAnnouncementResponse[];
type ObjectApiResponse = components["schemas"]["ObjectApiResponse"];

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

/**
 * Map a UserAnnouncementResponse to an Announcement (server-safe, no localStorage)
 */
export function mapUserAnnouncement(item: UserAnnouncementResponse): Announcement {
    const id = item.userAnnouncementId ?? item.announcementId ?? "";
    const type = detectType(item.type);

    return {
        id,
        title: item.title || "",
        description: item.content || "",
        type,
        date: formatDate(item.publishedAt || item.createdAt),
        read: Boolean(item.isRead),
        priority: getPriorityFromType(type)
    };
}

/**
 * Merge an AnnouncementResponse with an optional UserAnnouncementResponse.
 * Server-safe — no localStorage access.
 */
export function mapMergedAnnouncement(
    announcement: AnnouncementApiResponse,
    userAnnouncement?: UserAnnouncementResponse
): Announcement {
    const id =
        userAnnouncement?.userAnnouncementId ?? userAnnouncement?.announcementId ?? announcement.announcementId ?? "";
    const type = detectType(announcement.type);

    return {
        id,
        title: announcement.title || "",
        description: announcement.content || "",
        type,
        date: formatDate(announcement.publishedAt || announcement.createdAt),
        read: Boolean(userAnnouncement?.isRead),
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
export async function markNotificationAsRead(notificationId: string, locale = "vi"): Promise<void> {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";

    const response = await apiFetch<ObjectApiResponse>(`${baseUrl}/announcements/user/${notificationId}/read`, {
        method: "PUT",
        locale
    });

    if (response.status !== "success") {
        throw new Error(response.message || "Failed to mark notification as read");
    }

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

    const unreadAnnouncements = announcements.filter((announcement) => !announcement.read);
    await Promise.all(unreadAnnouncements.map(async (announcement) => markNotificationAsRead(announcement.id, locale)));

    for (const announcement of announcements) {
        currentMap[announcement.id] = true;
    }

    saveReadMap(currentMap);
}

/**
 * Fetch all announcements merged with user read status.
 * Calls both /announcements (master list) and /announcements/user (read state) in parallel.
 * @returns Promise<Announcement[]>
 */
export async function fetchAnnouncements(locale = "vi"): Promise<Announcement[]> {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";

    const [announcementsRes, userAnnouncementsRes] = await Promise.all([
        apiGet<AnnouncementApiResponse[]>(`${baseUrl}/announcements`, locale),
        apiGet<UserAnnouncementListResponse>(`${baseUrl}/announcements/user`, locale)
    ]);

    if (announcementsRes.status !== "success") {
        throw new Error(announcementsRes.message || "Failed to fetch announcements");
    }

    const announcements = announcementsRes.data || [];
    const userAnnouncements = userAnnouncementsRes.data || [];
    const readMap = getReadMap();

    const userAnnouncementMap = new Map<string, UserAnnouncementResponse>();
    for (const ua of userAnnouncements) {
        if (ua.announcementId) {
            userAnnouncementMap.set(ua.announcementId, ua);
        }
    }

    return announcements
        .filter((a) => a.isActive !== false)
        .map((a) => {
            const ua = a.announcementId ? userAnnouncementMap.get(a.announcementId) : undefined;
            const item = mapMergedAnnouncement(a, ua);
            item.read = item.read || Boolean(readMap[item.id]);
            return item;
        });
}

/**
 * Mark an announcement as read
 * @param announcementId - The ID of the announcement to mark as read
 */
export async function markAnnouncementAsRead(announcementId: string, locale = "vi"): Promise<void> {
    await markNotificationAsRead(announcementId, locale);

    const currentMap = getReadMap();
    currentMap[announcementId] = true;
    saveReadMap(currentMap);
}
