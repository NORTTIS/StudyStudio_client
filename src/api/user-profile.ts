/**
 * User Profile API
 * Handles fetching and updating user profile data
 */

import { type ApiResponse, apiFetch } from "@/api/api-client";

export interface UserProfile {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    bio: string;
    avatarUrl: string;
    status: string;
    isAdmin: boolean;
    language: string;
    emailNotificationEnabled: boolean;
    googleId: string | null;
    createdAt: string;
    updatedAt: string;
}

/**
 * Get user profile data
 * @param locale - Current locale for API response messages
 */
export async function getUserProfile(locale: string): Promise<ApiResponse<UserProfile>> {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    return apiFetch<UserProfile>(`${baseUrl}/user-profile`, {
        method: "GET",
        locale
    });
}
