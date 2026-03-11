/**
 * User Profile & Settings API
 * Handles user profile operations, password changes, and report submissions
 */

import { apiFetch } from "../../../../api/api-client";
import { getAccessToken, isTokenExpired, refreshAccessToken } from "../../../../api/auth";
import type { components } from "../../../../api/types";

// ===== Type Definitions =====

export type UserProfileResponse = {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    bio?: string;
    avatarUrl?: string;
    status?: string;
    isAdmin?: boolean;
    language: string;
    emailNotificationEnabled: boolean;
    googleId?: string;
    createdAt: string;
    updatedAt: string;
};

export type UserProfile = UserProfileResponse;

export type UpdateProfileRequest = {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    bio?: string;
    language?: string;
    emailNotificationEnabled?: boolean;
    avatar?: File;
};

export type ChangePasswordRequest = {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
};

export type ReportRequest = components["schemas"]["ReportRequest"];

// ===== API Functions =====

/**
 * Get user profile
 * GET /api/user-profile
 */
export async function getUserProfile(locale = "vi") {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    return apiFetch<UserProfileResponse>(`${baseUrl}/user-profile`, {
        method: "GET",
        locale
    });
}

/**
 * Update user profile
 * PUT /api/user-profile
 * Handles multipart/form-data for avatar upload
 */
export async function updateUserProfile(data: UpdateProfileRequest, locale = "vi") {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    const formData = new FormData();

    // Append form fields - always send firstName and lastName even if empty
    if (data.firstName !== undefined) formData.append("FirstName", data.firstName);
    if (data.lastName !== undefined) formData.append("LastName", data.lastName);
    if (data.phoneNumber !== undefined) formData.append("PhoneNumber", data.phoneNumber || "");
    if (data.bio !== undefined) formData.append("Bio", data.bio || "");
    if (data.language !== undefined) formData.append("Language", data.language);
    if (data.emailNotificationEnabled !== undefined) {
        formData.append("EmailNotificationEnabled", String(data.emailNotificationEnabled));
    }
    if (data.avatar) formData.append("Avatar", data.avatar);

    const headers = new Headers();
    headers.set("Accept-Language", locale);

    // Check token expiry and refresh if needed before sending
    if (isTokenExpired()) {
        const refreshed = await refreshAccessToken(locale);
        if (!refreshed) {
            if (typeof window !== "undefined") {
                window.location.href = `/${locale}/login`;
            }
            return {
                status: "error",
                code: "AUTH_REQUIRED",
                message: locale === "vi" ? "Vui lòng đăng nhập lại" : "Please login again",
                data: null
            };
        }
    }

    const token = getAccessToken();
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    try {
        const response = await fetch(`${baseUrl}/user-profile`, {
            method: "PUT",
            headers,
            body: formData
        });

        // Handle 401 - refresh token and retry once
        if (response.status === 401) {
            const refreshed = await refreshAccessToken(locale);
            if (refreshed) {
                headers.set("Authorization", `Bearer ${refreshed.accessToken}`);
                const retryResponse = await fetch(`${baseUrl}/user-profile`, {
                    method: "PUT",
                    headers,
                    body: formData
                });
                return await retryResponse.json();
            }
            if (typeof window !== "undefined") {
                window.location.href = `/${locale}/login`;
            }
            return {
                status: "error",
                code: "AUTH_REQUIRED",
                message: locale === "vi" ? "Vui lòng đăng nhập lại" : "Please login again",
                data: null
            };
        }

        return await response.json();
    } catch {
        return {
            status: "error",
            code: "NETWORK_ERROR",
            message:
                locale === "vi"
                    ? "Không thể cập nhật thông tin. Vui lòng thử lại."
                    : "Cannot update profile. Please try again.",
            data: null
        };
    }
}

/**
 * Delete current user account
 * DELETE /api/user-profile
 */
export async function deleteUserProfile(locale = "vi") {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    return apiFetch<null>(`${baseUrl}/user-profile`, {
        method: "DELETE",
        locale
    });
}

/**
 * Change password
 * POST /api/change-password
 */
export async function changePassword(data: ChangePasswordRequest, locale = "vi") {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    return apiFetch<null>(`${baseUrl}/change-password`, {
        method: "POST",
        body: JSON.stringify(data),
        locale
    });
}

/**
 * Send report/feedback
 */
export async function sendReport(data: ReportRequest, locale = "vi") {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    return apiFetch<null>(`${baseUrl}/reports`, {
        method: "POST",
        body: JSON.stringify(data),
        locale
    });
}
