import { type ApiResponse, apiDelete, apiGet, apiPut } from "./api-client";
import { localizeNotificationText } from "@/utils/notification-localization";

export type NotificationSourceType =
    | "announcement"
    | "task"
    | "discuss"
    | "comment";

function isNotificationSourceType(value: unknown): value is NotificationSourceType {
    return (
        value === "announcement" ||
        value === "task" ||
        value === "discuss" ||
        value === "comment"
    );
}

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
    isRead: boolean;
    taskId?: string;
    groupId?: string;
    sourceType?: string;
}

interface AnnouncementPageResponse {
    items: AnnouncementResponse[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
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
    taskId?: string;
    groupId?: string;
    sourceType?: string;
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
 * Fetch all notifications (both type 0-3 and type 4-17) from unified endpoint
 * Type 0-3: all users see these, with IsRead from UserAnnouncement
 * Type 4-17: only mentioned users see these, with IsRead
 */
function mapAnnouncementToNotification(announcement: AnnouncementResponse, locale: string): Notification {
    return {
        id: announcement.announcementId,
        title: localizeNotificationText(announcement.title, locale),
        description: localizeNotificationText(announcement.content, locale),
        type: getNotificationType(announcement.type),
        date: announcement.publishedAt,
        read: announcement.isRead,
        link: undefined,
        announcementId: announcement.announcementId,
        sourceType: (announcement.sourceType as NotificationSourceType) || "announcement",
        groupId: announcement.groupId,
        taskId: announcement.taskId
    };
}

async function fetchNotificationPage(
    locale = "vi",
    page = 1,
    pageSize = 10
): Promise<AnnouncementPageResponse | null> {
    try {
        const response = await apiGet<AnnouncementPageResponse>(`/announcements?page=${page}&pageSize=${pageSize}`, locale);

        if (response.status === "success" && response.data) {
            return response.data;
        }

        if (response.status === "error") {
            console.log("🔔 API: Lỗi từ server:", response.message);
        }

        return null;
    } catch (error) {
        console.error("🔔 API: Lỗi trong fetchNotificationPage:", error);
        return null;
    }
}

export async function getAnnouncementPage(
    locale = "vi",
    page = 1,
    pageSize = 10
): Promise<AnnouncementPageResponse> {
    const response = await fetchNotificationPage(locale, page, pageSize);

    return response ?? {
        items: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0
    };
}

/**
 * Fetch all notifications by paging through the unified endpoint.
 * Type 0-3: all users see these, with IsRead from UserAnnouncement
 * Type 4-17: only mentioned users see these, with IsRead
 */
export async function fetchNotifications(locale = "vi"): Promise<Notification[]> {
    console.log("🔔 API: fetchNotifications được gọi với locale:", locale);

    try {
        const pageSize = 20;
        const firstPage = await fetchNotificationPage(locale, 1, pageSize);

        if (!firstPage) {
            console.log("🔔 API: Không có dữ liệu hợp lệ - trả về mảng rỗng");
            return [];
        }

        const notifications = firstPage.items.map((announcement) => mapAnnouncementToNotification(announcement, locale));

        if (firstPage.totalPages <= 1) {
            console.log("🔔 API: Trả về thông báo:", notifications);
            return notifications;
        }

        const additionalPages = await Promise.all(
            Array.from({ length: firstPage.totalPages - 1 }, (_, index) => index + 2).map(async (page) => {
                const response = await fetchNotificationPage(locale, page, pageSize);
                return response?.items.map((announcement) => mapAnnouncementToNotification(announcement, locale)) ?? [];
            })
        );

        const allNotifications = [...notifications, ...additionalPages.flat()];
        console.log("🔔 API: Trả về thông báo:", allNotifications);
        return allNotifications;
    } catch (error) {
        console.error("🔔 API: Lỗi trong fetchNotifications:", error);
        return [];
    }
}

/**
 * Mark a notification as read
 * PUT /api/announcements/{announcementId}/read
 */
export async function markAsRead(announcementId: string, locale = "vi"): Promise<ApiResponse<string>> {
    try {
        console.log("🔔 API: Đánh dấu thông báo đã đọc ID:", announcementId);
        const response = await apiPut<string>(`/announcements/${announcementId}/read`, {}, locale);
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
 * Delete a notification
 * DELETE /api/announcements/{announcementId}
 */
export async function deleteAnnouncement(announcementId: string, locale = "vi"): Promise<ApiResponse<string>> {
    try {
        console.log("🔔 API: Xóa thông báo ID:", announcementId);
        const response = await apiDelete<string>(`/announcements/${announcementId}`, locale);
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
 * Get all announcements from unified endpoint (replaces old getAllAnnouncements)
 * Now uses the single /announcements endpoint that returns both type 0-3 and type 4-17
 */
export async function getAllAnnouncements(locale = "vi"): Promise<Notification[]> {
    return fetchNotifications(locale);
}

/**
 * Get notification count (active) - calculated from active announcements
 */
export async function getNotificationCount(locale = "vi"): Promise<number> {
    try {
        const response = await fetchNotificationPage(locale, 1, 1);

        if (response) {
            return response.totalCount;
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
        const response = await apiGet<AnnouncementResponse>(`/announcements/${announcementId}`, locale);

        if (response.status === "success" && response.data) {
            const announcement = response.data;
            const sourceType = isNotificationSourceType(announcement.sourceType)
                ? announcement.sourceType
                : "announcement";

            return {
                id: announcement.announcementId,
                title: localizeNotificationText(announcement.title, locale),
                description: localizeNotificationText(announcement.content, locale),
                type: getNotificationType(announcement.type),
                date: announcement.publishedAt,
                read: announcement.isRead,
                link: undefined,
                announcementId: announcement.announcementId,
                sourceType,
                groupId: announcement.groupId,
                taskId: announcement.taskId
            };
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
 * - discuss => gọi /group-messages/{groupId}
 * - comment => gọi /task-comments/{taskId}
 *
 * Không tạo endpoint mới.
 */
export async function getNotificationDetail(notification: Notification, locale = "vi"): Promise<Notification | null> {
    try {
        if (!notification.sourceType || notification.sourceType === "announcement") {
            return await getAnnouncementDetail(notification.announcementId ?? notification.id, locale);
        }

        if (notification.sourceType === "discuss" && notification.groupId) {
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

        if (notification.sourceType === "comment" && notification.taskId) {
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
