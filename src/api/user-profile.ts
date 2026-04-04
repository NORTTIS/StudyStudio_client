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

// In-flight request cache to deduplicate concurrent calls
let inFlightRequest: Promise<ApiResponse<UserProfile>> | null = null;

/**
 * Get user profile data with request deduplication.
 * All concurrent callers share the same in-flight request to avoid
 * triggering multiple API calls on the same resource.
 * @param locale - Current locale for API response messages
 */
export async function getUserProfile(locale: string): Promise<ApiResponse<UserProfile>> {
    if (inFlightRequest) {
        return inFlightRequest;
    }

    inFlightRequest = apiGet<UserProfile>("/user-profile", locale, false, { cache: "no-store" });

    try {
        return await inFlightRequest;
    } finally {
        inFlightRequest = null;
    }
}
