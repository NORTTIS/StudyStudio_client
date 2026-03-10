/**
 * User Profile API
 * Handles fetching and updating user profile data
 */

import { type ApiResponse, apiGet } from "@/api/api-client";

export interface UserProfile {
    userId: string;
    aiDailyLimit?: number;
    aiRequestsRemaining?: number;
    aiRequestsUsedToday?: number;
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
    subscriptionPlan?: {
        planId: string;
        planName: string;
        price: number;
        billingCycle: number;
        description: string;
        maxAiRequestsPerDay: number;
        maxGroups: number;
        maxMembersPerGroup: number;
        maxStorageMb: number;
        maxStudios: number;
    };
}

/**
 * Get user profile data
 * @param locale - Current locale for API response messages
 */
export async function getUserProfile(locale: string): Promise<ApiResponse<UserProfile>> {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";
    return apiGet<UserProfile>(`${baseUrl}/user-profile`, locale);
}
