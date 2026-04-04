import { apiGet, apiPatch } from "./api-client";
import type { components } from "./types";

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
    status: string;
    code: string;
    message: string;
    data: T | null;
}

// Type aliases from types.ts
export type AdminStudioListResponse = components["schemas"]["AdminStudioListResponse"];
export type StudioListItem = components["schemas"]["StudioListItem"];
export type StudioListSummary = components["schemas"]["StudioListSummary"];
export type UpdateStudioStatusRequest = components["schemas"]["UpdateStudioStatusRequest"];

/**
 * Get studios list parameters
 */
export interface GetStudiosParams {
    PageNumber?: number;
    PageSize?: number;
    SearchTerm?: string;
}

/**
 * Get all studios with pagination and filters
 */
export async function getStudios(
    params?: GetStudiosParams,
    locale = "vi"
): Promise<ApiResponse<AdminStudioListResponse>> {
    try {
        const queryParams = new URLSearchParams();
        if (params?.PageNumber) queryParams.append("PageNumber", params.PageNumber.toString());
        if (params?.PageSize) queryParams.append("PageSize", params.PageSize.toString());
        if (params?.SearchTerm) queryParams.append("SearchTerm", params.SearchTerm);

        const queryString = queryParams.toString();
        const endpoint = `/admin/studios${queryString ? `?${queryString}` : ""}`;

        console.log("Gọi API studios:", endpoint);

        const response = await apiGet<AdminStudioListResponse>(endpoint, locale);

        console.log("Phản hồi API studios:", response);

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
            message: response.message || "Không thể tải danh sách studios",
            data: null
        };
    } catch (error: unknown) {
        console.error("Lỗi khi gọi API studios:", error);
        return {
            status: "error",
            code: "FETCH_ERROR",
            message: error instanceof Error ? error.message : "Có lỗi không xác định xảy ra",
            data: null
        };
    }
}

/**
 * Update studio status (Active/Inactive)
 */
export async function updateStudioStatus(
    studioId: string,
    isActive: boolean,
    locale = "vi"
): Promise<ApiResponse<string>> {
    try {
        console.log("Gọi API update studio status:", `/admin/studios/${studioId}/status`, { isActive });

        const requestBody: UpdateStudioStatusRequest = {
            isActive: isActive
        };

        const response = await apiPatch<string>(`/admin/studios/${studioId}/status`, requestBody, locale);

        console.log("Phản hồi API update studio status:", response);

        if (response.status === "success") {
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
            message: response.message || "Không thể cập nhật trạng thái studio",
            data: null
        };
    } catch (error: unknown) {
        console.error("Lỗi khi cập nhật trạng thái studio:", error);
        return {
            status: "error",
            code: "FETCH_ERROR",
            message: error instanceof Error ? error.message : "Có lỗi không xác định xảy ra",
            data: null
        };
    }
}

/**
 * Studio display status type
 */
export type StudioDisplayStatus = "active" | "inactive";

/**
 * Convert API status to display status
 */
export function convertStudioStatus(isActive: boolean | null | undefined): StudioDisplayStatus {
    if (isActive === true) return "active";
    return "inactive";
}

/**
 * Format date for display
 */
export function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return "-";
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    } catch {
        return dateString;
    }
}

/**
 * Get status badge color
 */
export function getStatusColor(isActive: boolean | null | undefined): string {
    return isActive ? "green" : "red";
}

/**
 * Get status text
 */
export function getStatusText(isActive: boolean | null | undefined): string {
    return isActive ? "Hoạt động" : "Tạm khóa";
}
