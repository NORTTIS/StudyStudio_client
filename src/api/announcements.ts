import { apiGet } from "./api-client";

export interface UserAnnouncement {
    announcementId: string;
    title: string;
    content: string;
    type: string;
    isActive: boolean;
    createdAt: string;
    publishedAt: string;
}

export interface ApiResponse<T> {
    status: string;
    code: string;
    message: string;
    data: T | null;
}

/**
 * Get announcements for users (public endpoint)
 */
export async function getUserAnnouncements(locale: string): Promise<ApiResponse<UserAnnouncement[]>> {
    try {
        console.log("Gọi API user announcements: /announcements");
        
        const response = await apiGet<UserAnnouncement[]>("/announcements", locale);
        console.log("Phản hồi API user announcements:", response);
        
        if (response.status === "success" && response.data) {
            return {
                status: response.status,
                code: response.code,
                message: response.message,
                data: response.data
            };
        } else {
            return {
                status: "error",
                code: response.code || "API_ERROR",
                message: response.message || "Không thể tải thông báo",
                data: null
            };
        }
    } catch (error: unknown) {
        console.error("Lỗi khi gọi API user announcements:", error);
        return {
            status: "error",
            code: "FETCH_ERROR",
            message: error instanceof Error ? error.message : "Có lỗi không xác định xảy ra",
            data: null
        };
    }
}

// Helper functions for announcement types
export const USER_ANNOUNCEMENT_TYPES = {
    "Info": "Thông báo chung",
    "Feature": "Cập nhật tính năng", 
    "Maintenance": "Bảo trì hệ thống",
    "Promotion": "Khuyến mãi"
} as const;

export function getUserAnnouncementTypeLabel(type: string): string {
    return USER_ANNOUNCEMENT_TYPES[type as keyof typeof USER_ANNOUNCEMENT_TYPES] || "Khác";
}

export function getUserAnnouncementTypeColor(type: string): string {
    switch (type) {
        case "Info": return "bg-blue-100 text-blue-700"; // Thông báo chung
        case "Feature": return "bg-green-100 text-green-700"; // Cập nhật tính năng
        case "Maintenance": return "bg-orange-100 text-orange-700"; // Bảo trì hệ thống
        case "Promotion": return "bg-purple-100 text-purple-700"; // Khuyến mãi
        default: return "bg-gray-100 text-gray-700";
    }
}