import { apiGet, apiPost, apiPut } from "./api-client";

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
}

export interface UpdateAnnouncementRequest {
    announcementId: string;
    title: string;
    content: string;
    type: number;
    isActive: boolean;
    publishedAt: string;
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
        const response = await apiPut<AdminAnnouncement>("/admin/announcements", request, locale);

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
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/announcements/${id}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "Accept-Language": locale,
                Authorization: `Bearer ${localStorage.getItem("accessToken")}`
            }
        });

        const data = await response.json();

        if (data.status === "success") {
            return {
                status: data.status,
                code: data.code,
                message: data.message,
                data: data.data
            };
        }
        return {
            status: "error",
            code: data.code || "API_ERROR",
            message: data.message || "Không thể xóa thông báo",
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
    0: "Thông báo chung",
    1: "Cập nhật tính năng",
    2: "Bảo trì hệ thống",
    3: "Khuyến mãi"
} as const;

export function getAnnouncementTypeLabel(type: number): string {
    return ANNOUNCEMENT_TYPES[type as keyof typeof ANNOUNCEMENT_TYPES] || "Khác";
}

export function getAnnouncementTypeColor(type: number): string {
    switch (type) {
        case 0:
            return "bg-blue-100 text-blue-700"; // Thông báo chung
        case 1:
            return "bg-green-100 text-green-700"; // Cập nhật tính năng
        case 2:
            return "bg-orange-100 text-orange-700"; // Bảo trì hệ thống
        case 3:
            return "bg-purple-100 text-purple-700"; // Khuyến mãi
        default:
            return "bg-gray-100 text-gray-700";
    }
}
