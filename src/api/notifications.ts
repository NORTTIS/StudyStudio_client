import { type ApiResponse, apiDelete, apiGet, apiPut } from "./api-client";
import { localizeNotificationText } from "@/utils/notification-localization";

export type NotificationSourceType = "announcement" | "mention_chat" | "mention_comment" | "chat_message";

export interface Notification {
    id: string; // userAnnouncementId for user announcements
    title: string;
    description: string;
    type: "system" | "warning" | "info" | "success";
    date: string;
    read: boolean;
    link?: string;
    announcementId?: string; // Original announcementId for detail view
    isSystem?: boolean; // Flag to distinguish system vs user announcements

    // Thêm metadata để support mention/chat bằng các API có sẵn
    sourceType?: NotificationSourceType;
    groupId?: string;
    taskId?: string;
    messageId?: string;
    commentId?: string;

    // Nội dung chi tiết bổ sung
    originalMessage?: string;
    senderName?: string;
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

// Dựa trên spec: GET /api/group-messages/{groupId}
interface GroupMessageSender {
    userId?: string;
    fullName?: string | null;
    name?: string | null;
}

interface GroupMessageItem {
    messageId?: string;
    content?: string | null;
    createdAt?: string;
    sender?: GroupMessageSender | null;
    senderName?: string | null;
}

interface GroupMessageListPayload {
    items?: GroupMessageItem[] | null;
    messages?: GroupMessageItem[] | null;
}

// Dựa trên spec: GET /api/task-comments/{taskId}
interface TaskCommentUser {
    userId?: string;
    fullName?: string | null;
    name?: string | null;
}

interface TaskCommentItem {
    commentId?: string;
    content?: string | null;
    createdAt?: string;
    createdBy?: TaskCommentUser | null;
    userName?: string | null;
}

interface TaskCommentListPayload {
    items?: TaskCommentItem[] | null;
    comments?: TaskCommentItem[] | null;
}

/**
 * Fetch user notifications from user announcements API
 */
export async function fetchNotifications(locale = "vi"): Promise<Notification[]> {
    console.log("🔔 API: fetchNotifications được gọi với locale:", locale);

    try {
        console.log("🔔 API: Đang gọi /announcements/user...");
        const response = await apiGet<UserAnnouncementResponse[]>("/announcements/user", locale);
        console.log("🔔 API: Phản hồi từ /announcements/user:", response);

        if (response.status === "success" && response.data && Array.isArray(response.data)) {
            const notifications = response.data.map((userAnnouncement: UserAnnouncementResponse) => ({
                id: userAnnouncement.userAnnouncementId,
                title: localizeNotificationText(userAnnouncement.title, locale),
                description: localizeNotificationText(userAnnouncement.content, locale),
                type: getNotificationType(userAnnouncement.type),
                date: userAnnouncement.publishedAt,
                read: userAnnouncement.isRead,
                link: undefined,
                announcementId: userAnnouncement.announcementId,
                sourceType: "announcement" as NotificationSourceType
            }));
            console.log("🔔 API: Trả về thông báo user:", notifications);
            return notifications;
        }

        if (response.status === "error") {
            console.log("🔔 API: Lỗi từ server:", response.message);

            if (response.code === "ANNOUNCEMENT001") {
                console.log("🔔 API: Không có thông báo nào - trả về mảng rỗng");
                return [];
            }
        }

        console.log("🔔 API: Không có dữ liệu hợp lệ - trả về mảng rỗng");
        return [];
    } catch (error) {
        console.error("🔔 API: Lỗi trong fetchNotifications:", error);
        return [];
    }
}

/**
 * Mark a notification as read using userAnnouncementId
 * PUT /api/announcements/user/{userAnnouncementId}/read
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
 * Delete a notification using userAnnouncementId
 * DELETE /api/announcements/user/{userAnnouncementId}
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
 * Get all announcements (system + user) merged and sorted by publishedAt descending
 * GET /api/announcements (system) + GET /api/announcements/user (user)
 */
export async function getAllAnnouncements(locale = "vi"): Promise<Notification[]> {
    try {
        console.log("🔔 API: Lấy tất cả announcements (system + user)...");

        const [systemResponse, userResponse] = await Promise.all([
            apiGet<AnnouncementResponse[]>("/announcements", locale),
            apiGet<UserAnnouncementResponse[]>("/announcements/user", locale)
        ]);

        const allNotifications: Notification[] = [];

        if (systemResponse.status === "success" && systemResponse.data) {
            const systemNotifications = systemResponse.data.map((announcement) => ({
                id: announcement.announcementId,
                title: localizeNotificationText(announcement.title, locale),
                description: localizeNotificationText(announcement.content, locale),
                type: getNotificationType(announcement.type),
                date: announcement.publishedAt,
                read: false,
                link: undefined,
                announcementId: announcement.announcementId,
                isSystem: true,
                sourceType: "announcement" as NotificationSourceType
            }));
            allNotifications.push(...systemNotifications);
        }

        if (userResponse.status === "success" && userResponse.data) {
            const userNotifications = userResponse.data.map((userAnnouncement) => ({
                id: userAnnouncement.userAnnouncementId,
                title: localizeNotificationText(userAnnouncement.title, locale),
                description: localizeNotificationText(userAnnouncement.content, locale),
                type: getNotificationType(userAnnouncement.type),
                date: userAnnouncement.publishedAt,
                read: userAnnouncement.isRead,
                link: undefined,
                announcementId: userAnnouncement.announcementId,
                isSystem: false,
                sourceType: "announcement" as NotificationSourceType
            }));
            allNotifications.push(...userNotifications);
        }

        allNotifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        console.log("🔔 API: Trả về tất cả notifications:", allNotifications.length);
        return allNotifications;
    } catch (error) {
        console.error("🔔 API: Lỗi khi lấy announcements:", error);
        return [];
    }
}

/**
 * Get notification count (active) - calculated from active announcements
 */
export async function getNotificationCount(locale = "vi"): Promise<number> {
    try {
        const response = await apiGet<AnnouncementResponse[]>("/announcements", locale);

        if (response.status === "success" && response.data && Array.isArray(response.data)) {
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
        const response = await apiGet<AnnouncementResponse>(`/announcements/${announcementId}`, locale);
        console.log("🔔 API: Phản hồi chi tiết thông báo:", response);

        if (response.status === "success" && response.data) {
            const announcement = response.data;
            return {
                id: announcement.announcementId,
                title: localizeNotificationText(announcement.title, locale),
                description: localizeNotificationText(announcement.content, locale),
                type: getNotificationType(announcement.type),
                date: announcement.publishedAt,
                read: false,
                link: undefined,
                announcementId: announcement.announcementId,
                sourceType: "announcement"
            };
        }

        if (response.status === "error") {
            console.log("🔔 API: Không tìm thấy thông báo:", response.message);
        }

        return null;
    } catch (error) {
        console.error("🔔 API: Lỗi khi lấy chi tiết thông báo:", error);
        return null;
    }
}

/**
 * Lấy danh sách message trong group
 * GET /group-messages/{groupId}
 */
export async function getGroupMessages(groupId: string, locale = "vi"): Promise<GroupMessageItem[]> {
    try {
        console.log("🔔 API: Lấy group messages, groupId:", groupId);
        const response = await apiGet<GroupMessageListPayload>(`/group-messages/${groupId}`, locale);
        console.log("🔔 API: Phản hồi group messages:", response);

        if (response.status === "success" && response.data) {
            return response.data.items ?? response.data.messages ?? [];
        }

        return [];
    } catch (error) {
        console.error("🔔 API: Lỗi khi lấy group messages:", error);
        return [];
    }
}

/**
 * Lấy danh sách comment của task
 * GET /task-comments/{taskId}
 */
export async function getTaskComments(taskId: string, locale = "vi"): Promise<TaskCommentItem[]> {
    try {
        console.log("🔔 API: Lấy task comments, taskId:", taskId);
        const response = await apiGet<TaskCommentListPayload>(`/task-comments/${taskId}`, locale);
        console.log("🔔 API: Phản hồi task comments:", response);

        if (response.status === "success" && response.data) {
            return response.data.items ?? response.data.comments ?? [];
        }

        return [];
    } catch (error) {
        console.error("🔔 API: Lỗi khi lấy task comments:", error);
        return [];
    }
}

/**
 * Hàm detail tổng quát:
 * - announcement => gọi /announcements/{id}
 * - mention_chat/chat_message => gọi /group-messages/{groupId}
 * - mention_comment => gọi /task-comments/{taskId}
 *
 * Không tạo endpoint mới.
 */
export async function getNotificationDetail(notification: Notification, locale = "vi"): Promise<Notification | null> {
    try {
        if (notification.sourceType === "announcement" || notification.announcementId) {
            return await getAnnouncementDetail(notification.announcementId ?? notification.id, locale);
        }

        if (
            (notification.sourceType === "mention_chat" || notification.sourceType === "chat_message") &&
            notification.groupId
        ) {
            const messages = await getGroupMessages(notification.groupId, locale);
            const matchedMessage = messages.find((item) => item.messageId === notification.messageId);

            return {
                ...notification,
                originalMessage: localizeNotificationText(matchedMessage?.content ?? "", locale),
                senderName:
                    matchedMessage?.sender?.fullName ??
                    matchedMessage?.sender?.name ??
                    matchedMessage?.senderName ??
                    "",
                date: matchedMessage?.createdAt ?? notification.date
            };
        }

        if (notification.sourceType === "mention_comment" && notification.taskId) {
            const comments = await getTaskComments(notification.taskId, locale);
            const matchedComment = comments.find((item) => item.commentId === notification.commentId);

            return {
                ...notification,
                originalMessage: localizeNotificationText(matchedComment?.content ?? "", locale),
                senderName:
                    matchedComment?.createdBy?.fullName ??
                    matchedComment?.createdBy?.name ??
                    matchedComment?.userName ??
                    "",
                date: matchedComment?.createdAt ?? notification.date
            };
        }

        return notification;
    } catch (error) {
        console.error("🔔 API: Lỗi khi lấy notification detail:", error);
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
