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
export type UserStatus = components["schemas"]["UserStatus"];
export type UserListItem = components["schemas"]["UserListItem"];
export type UserListResponse = components["schemas"]["UserListResponse"];
export type UserDetailItem = components["schemas"]["UserDetailItem"];
export type UserListSummary = components["schemas"]["UserListSummary"];
export type SubscriptionPlanInfo = components["schemas"]["SubscriptionPlanInfo"];

/**
 * Get users list parameters
 */
export interface GetUsersParams {
    Package?: string;
    PageNumber?: number;
    PageSize?: number;
    SearchTerm?: string;
    Status?: UserStatus;
}

/**
 * Get all users with pagination and filters
 */
export async function getUsers(
    params?: GetUsersParams,
    locale: string = "vi"
): Promise<ApiResponse<UserListResponse>> {
    try {
        // Build query string
        const queryParams = new URLSearchParams();
        if (params?.Package) queryParams.append("Package", params.Package);
        if (params?.PageNumber) queryParams.append("PageNumber", params.PageNumber.toString());
        if (params?.PageSize) queryParams.append("PageSize", params.PageSize.toString());
        if (params?.SearchTerm) queryParams.append("SearchTerm", params.SearchTerm);
        if (params?.Status !== undefined) queryParams.append("Status", params.Status.toString());

        const queryString = queryParams.toString();
        const endpoint = `/admin/users${queryString ? `?${queryString}` : ""}`;

        console.log("Gọi API users:", endpoint);

        const response = await apiGet<UserListResponse>(endpoint, locale);

        console.log("Phản hồi API users:", response);

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
            message: response.message || "Không thể tải danh sách người dùng",
            data: null
        };
    } catch (error: unknown) {
        console.error("Lỗi khi gọi API users:", error);
        return {
            status: "error",
            code: "FETCH_ERROR",
            message: error instanceof Error ? error.message : "Có lỗi không xác định xảy ra",
            data: null
        };
    }
}

/**
 * Get user details by ID
 */
export async function getUserById(
    userId: string,
    locale: string = "vi"
): Promise<ApiResponse<UserDetailItem>> {
    try {
        console.log("Gọi API user details:", `/admin/users/${userId}`);

        const response = await apiGet<UserDetailItem>(`/admin/users/${userId}`, locale);

        console.log("Phản hồi API user details:", response);

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
            message: response.message || "Không thể tải thông tin người dùng",
            data: null
        };
    } catch (error: unknown) {
        console.error("Lỗi khi gọi API user details:", error);
        return {
            status: "error",
            code: "FETCH_ERROR",
            message: error instanceof Error ? error.message : "Có lỗi không xác định xảy ra",
            data: null
        };
    }
}

/**
 * Update user status (Active/Inactive)
 * Note: Cannot change status of deleted users
 */
export async function updateUserStatus(
    userId: string,
    status: "Active" | "Inactive",
    locale: string = "vi"
): Promise<ApiResponse<string>> {
    try {
        console.log("Gọi API update user status:", `/admin/users/${userId}/status`, { status });

        const requestBody = {
            status: status
        };

        const response = await apiPatch<string>(`/admin/users/${userId}/status`, requestBody, locale);

        console.log("Phản hồi API update user status:", response);

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
            message: response.message || "Không thể cập nhật trạng thái người dùng",
            data: null
        };
    } catch (error: unknown) {
        console.error("Lỗi khi cập nhật trạng thái user:", error);
        return {
            status: "error",
            code: "FETCH_ERROR",
            message: error instanceof Error ? error.message : "Có lỗi không xác định xảy ra",
            data: null
        };
    }
}

/**
 * Remove Vietnamese diacritics for comparison
 */
function removeDiacritics(str: string): string {
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d");
}

/**
 * Check if user status can be changed
 * Deleted users cannot have their status changed
 * Handles both English and Vietnamese status values
 */
export function canChangeUserStatus(userStatus: string | null | undefined): boolean {
    if (!userStatus) return false;
    // Cannot change status if user is deleted
    const statusNormalized = removeDiacritics(userStatus.toLowerCase());
    // English values
    if (statusNormalized === "deleted" || userStatus === "2") return false;
    // Vietnamese values (after removing diacritics)
    if (statusNormalized === "da xoa" || statusNormalized === "deleted") return false;
    return true;
}

/**
 * Helper functions
 */

/**
 * User display status type
 */
export type UserDisplayStatus = "active" | "inactive" | "deleted";

/**
 * Convert API status to display status
 * Handles both English and Vietnamese status values
 */
export function convertApiStatus(status: string | null | undefined): UserDisplayStatus {
    if (!status) return "inactive";
    const statusNormalized = removeDiacritics(status.toLowerCase());
    // Check for deleted first
    if (statusNormalized === "da xoa" || statusNormalized === "deleted" || status === "2") return "deleted";
    // English values
    if (statusNormalized === "active" || status === "0") return "active";
    // Vietnamese values (after removing diacritics)
    if (statusNormalized === "hoat dong") return "active";
    return "inactive";
}

/**
 * Convert API package to role
 */
export function convertApiPackage(
    pkg: string | null | undefined
): "user" | "premium" | "admin" {
    if (!pkg) return "user";
    const packageLower = pkg.toLowerCase();
    if (packageLower === "premium" || packageLower === "vip") return "premium";
    if (packageLower === "admin" || packageLower === "administrator") return "admin";
    return "user";
}

/**
 * Get package label for display
 */
export function getPackageLabel(pkg: string | null | undefined): string {
    if (!pkg) return "Free";
    const packageLower = pkg.toLowerCase();
    if (packageLower === "premium" || packageLower === "vip") return "Premium";
    if (packageLower === "admin" || packageLower === "administrator") return "Admin";
    return "Free";
}

/**
 * Get package color for tag
 */
export function getPackageColor(pkg: string | null | undefined): string {
    if (!pkg) return "default";
    const packageLower = pkg.toLowerCase();
    if (packageLower === "premium" || packageLower === "vip") return "orange";
    if (packageLower === "admin" || packageLower === "administrator") return "red";
    return "default";
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
 * Get initials from full name for avatar
 */
export function getInitials(fullName: string | null | undefined): string {
    if (!fullName) return "?";
    const parts = fullName.trim().split(" ");
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
}
