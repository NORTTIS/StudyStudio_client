import { type ApiResponse, apiDelete, apiGet, apiPut } from "./api-client";
import { localizeNotificationText } from "@/utils/notification-localization";

// Types for user announcements
export interface UserAnnouncement {
    userAnnouncementId: string;
    announcementId: string;
    title: string;
    content: string;
    type: string;
    isRead: boolean;
    createdAt: string;
    publishedAt: string;
    mentionedId: string;
    createdBy: string;
}

export interface Announcement {
    announcementId: string;
    title: string;
    content: string;
    type: string;
    isActive: boolean;
    createdAt: string;
    publishedAt: string;
}

// Get all public announcements
export async function getAllAnnouncements(locale = "vi"): Promise<ApiResponse<Announcement[]>> {
    const response = await apiGet<Announcement[]>('/announcements', locale);

    if (response.status === "success" && response.data) {
        return {
            ...response,
            data: response.data.map((announcement) => ({
                ...announcement,
                title: localizeNotificationText(announcement.title, locale),
                content: localizeNotificationText(announcement.content, locale)
            }))
        };
    }

    return response;
}

// Get announcement by ID
export async function getAnnouncementById(id: string, locale = "vi"): Promise<ApiResponse<Announcement>> {
    const response = await apiGet<Announcement>(`/announcements/${id}`, locale);

    if (response.status === "success" && response.data) {
        return {
            ...response,
            data: {
                ...response.data,
                title: localizeNotificationText(response.data.title, locale),
                content: localizeNotificationText(response.data.content, locale)
            }
        };
    }

    return response;
}

// Get user's announcements (personalized)
export async function getUserAnnouncements(locale = "vi"): Promise<ApiResponse<UserAnnouncement[]>> {
    const response = await apiGet<UserAnnouncement[]>('/announcements/user', locale);

    if (response.status === "success" && response.data) {
        return {
            ...response,
            data: response.data.map((announcement) => ({
                ...announcement,
                title: localizeNotificationText(announcement.title, locale),
                content: localizeNotificationText(announcement.content, locale)
            }))
        };
    }

    return response;
}

// Mark announcement as read
export async function markAnnouncementAsRead(userAnnouncementId: string, locale = "vi"): Promise<ApiResponse<string>> {
    return apiPut<string>(`/announcements/user/${userAnnouncementId}/read`, {}, locale);
}

// Delete user announcement
export async function deleteUserAnnouncement(userAnnouncementId: string, locale = "vi"): Promise<ApiResponse<string>> {
    return apiDelete<string>(`/announcements/user/${userAnnouncementId}`, locale);
}

// Helper function to get announcement type color
export function getAnnouncementTypeColor(type: string): string {
    switch (type.toLowerCase()) {
        case "info":
        case "0":
            return "bg-blue-100 text-blue-800 border-blue-200";
        case "warning":
        case "1":
            return "bg-yellow-100 text-yellow-800 border-yellow-200";
        case "critical":
        case "error":
        case "2":
            return "bg-red-100 text-red-800 border-red-200";
        default:
            return "bg-gray-100 text-gray-800 border-gray-200";
    }
}

// Helper function to get announcement type icon
export function getAnnouncementTypeIcon(type: string): string {
    switch (type.toLowerCase()) {
        case "info":
        case "0":
            return "📢";
        case "warning":
        case "1":
            return "⚠️";
        case "critical":
        case "error":
        case "2":
            return "🚨";
        default:
            return "📄";
    }
}
