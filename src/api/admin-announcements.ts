import { apiDelete, apiGet, apiPost, apiPut } from "./api-client";

export interface AdminAnnouncement {
    announcementId: string;
    title: string;
    content: string;
    type: string;
    isActive: boolean;
    createdAt: string;
    publishedAt: string;
}

export interface CreateAnnouncementRequest {
    title: string;
    content: string;
    type: number;
    isActive: boolean;
    publishedAt: string;
    createdAt?: string; // Optional for backward compatibility
}

export interface UpdateAnnouncementRequest {
    announcementId: string;
    title: string;
    content: string;
    type: number;
    isActive: boolean;
    publishedAt: string;
    createdAt?: string; // Optional for backward compatibility
}

export interface ApiResponse<T> {
    status: string;
    code: string;
    message: string;
    data: T | null;
}

/**
 * Get all admin announcements
 */
export async function getAdminAnnouncements(locale: string): Promise<ApiResponse<AdminAnnouncement[]>> {
    try {
        console.log("Gọi API announcements: /admin/announcements");

        const response = await apiGet<AdminAnnouncement[]>("/admin/announcements", locale);
        console.log("Phản hồi API announcements:", response);

        if (response.status === "success" && response.data) {
            return {
                status: response.status,
                code: response.code,
                message: response.message,
                data: response.data
            };
        }
        return {
            status: "error",
            code: response.code || "API_ERROR",
            message: response.message || "Không thể tải dữ liệu thông báo",
            data: null
        };
    } catch (error: unknown) {
        console.error("Lỗi khi gọi API admin announcements:", error);
        return {
            status: "error",
            code: "FETCH_ERROR",
            message: error instanceof Error ? error.message : "Có lỗi không xác định xảy ra",
            data: null
        };
    }
}

/**
 * Get single announcement by ID
 */
export async function getAdminAnnouncementById(id: string, locale: string): Promise<ApiResponse<AdminAnnouncement>> {
    try {
        const response = await apiGet<AdminAnnouncement>(`/admin/announcements/${id}`, locale);

        if (response.status === "success" && response.data) {
            return {
                status: response.status,
                code: response.code,
                message: response.message,
                data: response.data
            };
        }
        return {
            status: "error",
            code: response.code || "API_ERROR",
            message: response.message || "Không thể tải thông báo",
            data: null
        };
    } catch (error: unknown) {
        console.error("Lỗi khi tải thông báo:", error);
        return {
            status: "error",
            code: "FETCH_ERROR",
            message: error instanceof Error ? error.message : "Có lỗi không xác định xảy ra",
            data: null
        };
    }
}

/**
 * Create new announcement
 */
export async function createAdminAnnouncement(
    request: CreateAnnouncementRequest,
    locale: string
): Promise<ApiResponse<AdminAnnouncement>> {
    try {
        const response = await apiPost<AdminAnnouncement>("/admin/announcements", request, locale);

        if (response.status === "success" && response.data) {
            return {
                status: response.status,
                code: response.code,
                message: response.message,
                data: response.data
            };
        }
        return {
            status: "error",
            code: response.code || "API_ERROR",
            message: response.message || "Không thể tạo thông báo",
            data: null
        };
    } catch (error: unknown) {
        console.error("Lỗi khi tạo thông báo:", error);
        return {
            status: "error",
            code: "CREATE_ERROR",
            message: error instanceof Error ? error.message : "Có lỗi không xác định xảy ra",
            data: null
        };
    }
}

/**
 * Update announcement
 */
export async function updateAdminAnnouncement(
    request: UpdateAnnouncementRequest,
    locale: string
): Promise<ApiResponse<AdminAnnouncement>> {
    try {
        console.log("🌐 API: Sending update request:", request);
        console.log("🌐 API: Type field:", request.type, typeof request.type);

        const response = await apiPut<AdminAnnouncement>("/admin/announcements", request, locale);

        console.log("🌐 API: Server response:", response);

        if (response.status === "success" && response.data) {
            return {
                status: response.status,
                code: response.code,
                message: response.message,
                data: response.data
            };
        }
        return {
            status: "error",
            code: response.code || "API_ERROR",
            message: response.message || "Không thể cập nhật thông báo",
            data: null
        };
    } catch (error: unknown) {
        console.error("Lỗi khi cập nhật thông báo:", error);
        return {
            status: "error",
            code: "UPDATE_ERROR",
            message: error instanceof Error ? error.message : "Có lỗi không xác định xảy ra",
            data: null
        };
    }
}

/**
 * Delete announcement
 */
export async function deleteAdminAnnouncement(id: string, locale: string): Promise<ApiResponse<string>> {
    try {
        const response = await apiDelete<string>(`/admin/announcements/${id}`, locale);

        if (response.status === "success") {
            return {
                status: response.status,
                code: response.code,
                message: response.message,
                data: response.data as string
            };
        }
        return {
            status: "error",
            code: response.code || "API_ERROR",
            message: response.message || "Không thể xóa thông báo",
            data: null
        };
    } catch (error: unknown) {
        console.error("Lỗi khi xóa thông báo:", error);
        return {
            status: "error",
            code: "DELETE_ERROR",
            message: error instanceof Error ? error.message : "Có lỗi không xác định xảy ra",
            data: null
        };
    }
}

// Helper functions for announcement types
export const ANNOUNCEMENT_TYPES = {
    0: "Thông tin",
    1: "Cảnh báo",
    2: "Bảo trì hệ thống",
    3: "Khuyến mãi",
    4: "Nhắc nhở"
} as const;

// Map string types from API to numbers
export const TYPE_STRING_TO_NUMBER: Record<string, number> = {
    Info: 0,
    Warning: 1,
    Maintenance: 2,
    Promotion: 3,
    Mention: 4
};

// Map numbers to string types for API
export const TYPE_NUMBER_TO_STRING: Record<number, string> = {
    0: "Info",
    1: "Warning",
    2: "Maintenance",
    3: "Promotion",
    4: "Mention"
};

export function getAnnouncementTypeLabel(type: number | string): string {
    if (typeof type === "string") {
        const numType = TYPE_STRING_TO_NUMBER[type];
        return ANNOUNCEMENT_TYPES[numType as keyof typeof ANNOUNCEMENT_TYPES] || "Nhắc nhở";
    }
    return ANNOUNCEMENT_TYPES[type as keyof typeof ANNOUNCEMENT_TYPES] || "Nhắc nhở";
}

export function getAnnouncementTypeColor(type: number | string): string {
    let numType: number;
    if (typeof type === "string") {
        numType = TYPE_STRING_TO_NUMBER[type] || 4;
    } else {
        numType = type;
    }

    switch (numType) {
        case 0:
            return "bg-blue-100 text-blue-700"; // Thông tin
        case 1:
            return "bg-yellow-100 text-yellow-700"; // Cảnh báo
        case 2:
            return "bg-orange-100 text-orange-700"; // Bảo trì hệ thống
        case 3:
            return "bg-purple-100 text-purple-700"; // Khuyến mãi
        case 4:
            return "bg-green-100 text-green-700"; // Nhắc nhở
        default:
            return "bg-gray-100 text-gray-700"; // Default
    }
}
