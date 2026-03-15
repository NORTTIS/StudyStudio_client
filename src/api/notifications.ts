import { type ApiResponse, apiDelete, apiGet, apiPut } from "./api-client";

export interface Notification {
    id: string; // userAnnouncementId for user announcements
    title: string;
    description: string;
    type: "system" | "warning" | "info" | "success";
    date: string;
    read: boolean;
    link?: string;
    announcementId?: string; // Original announcementId for detail view
}

// API response interfaces based on the provided schema
interface AnnouncementResponse {
    announcementId: string;
    title: string;
    content: string;
    type: string;
    isActive: boolean;
    createdAt: string;
    publishedAt: string;
}

interface UserAnnouncementResponse {
    userAnnouncementId: string;
    announcementId: string;
    title: string;
    content: string;
    type: string;
    isRead: boolean;
    createdAt: string;
    publishedAt: string;
}

/**
 * Fetch user notifications from user announcements API
 */
export async function fetchNotifications(locale = "vi"): Promise<Notification[]> {
    console.log("🔔 API: fetchNotifications được gọi với locale:", locale);

    try {
        // Gọi API user announcements để lấy thông báo của user với userAnnouncementId
        console.log("🔔 API: Đang gọi /announcements/user...");
        const response = await apiGet<UserAnnouncementResponse[]>("/announcements/user", locale);
        console.log("🔔 API: Phản hồi từ /announcements/user:", response);

        if (response.status === "success" && response.data && Array.isArray(response.data)) {
            const notifications = response.data.map((userAnnouncement: UserAnnouncementResponse) => ({
                id: userAnnouncement.userAnnouncementId, // Sử dụng userAnnouncementId để có thể mark as read/delete
                title: userAnnouncement.title,
                description: userAnnouncement.content,
                type: getNotificationType(userAnnouncement.type),
                date: userAnnouncement.publishedAt,
                read: userAnnouncement.isRead,
                link: undefined,
                announcementId: userAnnouncement.announcementId // Lưu announcementId để xem chi tiết
            }));
            console.log("🔔 API: Trả về thông báo user:", notifications);
            return notifications;
        }

        // Handle specific error cases
        if (response.status === "error") {
            console.log("🔔 API: Lỗi từ server:", response.message);

            // If it's "Không tìm thấy thông báo" (no notifications found), return empty array
            if (response.code === "ANNOUNCEMENT001") {
                console.log("🔔 API: Không có thông báo nào - trả về mảng rỗng");
                return [];
            }
        }

        // Return empty array for other cases
        console.log("🔔 API: Không có dữ liệu hợp lệ - trả về mảng rỗng");
        return [];
    } catch (error) {
        console.error("🔔 API: Lỗi trong fetchNotifications:", error);
        return [];
    }
}

/**
 * Mark a notification as read using announcementId
 * PUT /api/announcements/user/{userAnnouncementId}/read
 * Note: We use announcementId as userAnnouncementId since we don't have user-specific mapping
 */
export async function markUserAnnouncementAsRead(announcementId: string, locale = "vi"): Promise<ApiResponse<string>> {
    try {
        console.log("🔔 API: Đánh dấu thông báo đã đọc ID:", announcementId);
        const response = await apiPut<string>(`/announcements/user/${announcementId}/read`, {}, locale);
        console.log("🔔 API: Phản hồi đánh dấu đã đọc:", response);
        return response;
    } catch (error) {
        console.error("🔔 API: Lỗi khi đánh dấu thông báo đã đọc:", error);
        return {
            status: "error",
            code: "NETWORK_ERROR",
            message: locale === "vi" ? "Không thể đánh dấu đã đọc" : "Cannot mark as read",
            data: null
        };
    }
}

/**
 * Delete a notification using announcementId
 * DELETE /api/announcements/user/{userAnnouncementId}
 * Note: We use announcementId as userAnnouncementId since we don't have user-specific mapping
 */
export async function deleteUserAnnouncement(announcementId: string, locale = "vi"): Promise<ApiResponse<string>> {
    try {
        console.log("🔔 API: Xóa thông báo ID:", announcementId);
        const response = await apiDelete<string>(`/announcements/user/${announcementId}`, locale);
        console.log("🔔 API: Phản hồi xóa thông báo:", response);
        return response;
    } catch (error) {
        console.error("🔔 API: Lỗi khi xóa thông báo:", error);
        return {
            status: "error",
            code: "NETWORK_ERROR",
            message: locale === "vi" ? "Không thể xóa thông báo" : "Cannot delete notification",
            data: null
        };
    }
}

/**
 * Get all announcements from the system
 * GET /api/announcements
 */
export async function getAllAnnouncements(locale = "vi"): Promise<Notification[]> {
    try {
        console.log("🔔 API: Lấy tất cả announcements...");
        const response = await apiGet<AnnouncementResponse[]>("/announcements", locale);
        console.log("🔔 API: Phản hồi từ /announcements:", response);

        if (response.status === "success" && response.data && Array.isArray(response.data)) {
            const announcements = response.data.map((announcement: AnnouncementResponse) => ({
                id: announcement.announcementId,
                title: announcement.title,
                description: announcement.content,
                type: getNotificationType(announcement.type),
                date: announcement.publishedAt,
                read: false, // System announcements don't have read status
                link: undefined,
                announcementId: announcement.announcementId
            }));
            console.log("🔔 API: Trả về announcements:", announcements);
            return announcements;
        }

        // Handle error response
        if (response.status === "error") {
            console.log("🔔 API: Lỗi từ server:", response.message);
        }

        return [];
    } catch (error) {
        console.error("🔔 API: Lỗi khi lấy announcements:", error);
        return [];
    }
}

/**
 * Get notification count (unread) - tính từ announcements chung
 */
export async function getNotificationCount(locale = "vi"): Promise<number> {
    try {
        const response = await apiGet<AnnouncementResponse[]>("/announcements", locale);

        if (response.status === "success" && response.data && Array.isArray(response.data)) {
            // Đếm số thông báo đang hoạt động
            return response.data.filter((announcement: AnnouncementResponse) => announcement.isActive).length;
        }

        return 0;
    } catch (error) {
        console.error("🔔 API: Lỗi khi lấy số lượng thông báo:", error);
        return 0;
    }
}

/**
 * Get announcement detail by ID
 */
export async function getAnnouncementDetail(announcementId: string, locale = "vi"): Promise<Notification | null> {
    try {
        console.log("🔔 API: Lấy chi tiết thông báo ID:", announcementId);
        // apiGet trả về ApiResponse<AnnouncementResponse>, không cần wrap thêm
        const response = await apiGet<AnnouncementResponse>(`/announcements/${announcementId}`, locale);
        console.log("🔔 API: Phản hồi chi tiết thông báo:", response);

        if (response.status === "success" && response.data) {
            const announcement = response.data;
            return {
                id: announcement.announcementId,
                title: announcement.title,
                description: announcement.content,
                type: getNotificationType(announcement.type),
                date: announcement.publishedAt,
                read: false,
                link: undefined,
                announcementId: announcement.announcementId
            };
        }

        // Handle error response from API
        if (response.status === "error") {
            console.log("🔔 API: Không tìm thấy thông báo:", response.message);
        }

        return null;
    } catch (error) {
        console.error("🔔 API: Lỗi khi lấy chi tiết thông báo:", error);
        return null;
    }
}

// Helper functions
function getNotificationType(type: string): Notification["type"] {
    switch (type.toLowerCase()) {
        case "success":
            return "success";
        case "warning":
            return "warning";
        case "info":
            return "info";
        default:
            return "system";
    }
}
