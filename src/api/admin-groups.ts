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
export type AdminGroupListResponse = components["schemas"]["AdminGroupListResponse"];
export type GroupListItem = components["schemas"]["GroupListItem"];
export type GroupListSummary = components["schemas"]["GroupListSummary"];
export type UpdateGroupStatusRequest = components["schemas"]["UpdateGroupStatusRequest"];

/**
 * Get groups list parameters
 */
export interface GetGroupsParams {
    GroupType?: string;
    PageNumber?: number;
    PageSize?: number;
    SearchTerm?: string;
}

/**
 * Get all groups with pagination and filters
 */
export async function getGroups(params?: GetGroupsParams, locale = "vi"): Promise<ApiResponse<AdminGroupListResponse>> {
    try {
        // Build query string
        const queryParams = new URLSearchParams();
        if (params?.GroupType) queryParams.append("GroupType", params.GroupType);
        if (params?.PageNumber) queryParams.append("PageNumber", params.PageNumber.toString());
        if (params?.PageSize) queryParams.append("PageSize", params.PageSize.toString());
        if (params?.SearchTerm) queryParams.append("SearchTerm", params.SearchTerm);

        const queryString = queryParams.toString();
        const endpoint = `/admin/groups${queryString ? `?${queryString}` : ""}`;

        console.log("Gọi API groups:", endpoint);

        const response = await apiGet<AdminGroupListResponse>(endpoint, locale);

        console.log("Phản hồi API groups:", response);

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
            message: response.message || "Không thể tải danh sách nhóm",
            data: null
        };
    } catch (error: unknown) {
        console.error("Lỗi khi gọi API groups:", error);
        return {
            status: "error",
            code: "FETCH_ERROR",
            message: error instanceof Error ? error.message : "Có lỗi không xác định xảy ra",
            data: null
        };
    }
}

/**
 * Update group status (Active/Inactive)
 */
export async function updateGroupStatus(
    groupId: string,
    isActive: boolean,
    locale = "vi"
): Promise<ApiResponse<string>> {
    try {
        console.log("Gọi API update group status:", `/admin/groups/${groupId}/status`, { isActive });

        const requestBody: UpdateGroupStatusRequest = {
            isActive: isActive
        };

        const response = await apiPatch<string>(`/admin/groups/${groupId}/status`, requestBody, locale);

        console.log("Phản hồi API update group status:", response);

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
            message: response.message || "Không thể cập nhật trạng thái nhóm",
            data: null
        };
    } catch (error: unknown) {
        console.error("Lỗi khi cập nhật trạng thái nhóm:", error);
        return {
            status: "error",
            code: "FETCH_ERROR",
            message: error instanceof Error ? error.message : "Có lỗi không xác định xảy ra",
            data: null
        };
    }
}

/**
 * Group display status type
 */
export type GroupDisplayStatus = "active" | "inactive";

/**
 * Convert API status to display status
 */
export function convertGroupStatus(isActive: boolean | null | undefined): GroupDisplayStatus {
    if (isActive === true) return "active";
    return "inactive";
}

/**
 * Get group type label for display
 */
export function getGroupTypeLabel(type: string | null | undefined): string {
    if (!type) return "Công khai";
    const typeLower = type.toLowerCase();
    if (typeLower === "public") return "Công khai";
    if (typeLower === "private") return "Riêng tư";
    return type;
}

/**
 * Get group type for display
 */
export function getGroupType(type: string | null | undefined): "public" | "private" {
    if (!type) return "public";
    const typeLower = type.toLowerCase();
    if (typeLower === "private") return "private";
    return "public";
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
            year: "numeric"
        });
    } catch {
        return dateString;
    }
}

/**
 * Get member count display
 */
export function getMemberDisplay(memberCount: number | null | undefined, maxMembers = 50): string {
    const count = memberCount ?? 0;
    return `${count} / ${maxMembers}`;
}

/**
 * Calculate member percentage
 */
export function getMemberPercent(memberCount: number | null | undefined, maxMembers = 50): number {
    const count = memberCount ?? 0;
    return Math.round((count / maxMembers) * 100);
}
