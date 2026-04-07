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

// Cache for user profile - prevents excessive API calls
interface CacheEntry {
    data: ApiResponse<UserProfile>;
    timestamp: number;
}
const CACHE_TTL_MS = 30_000; // 30 seconds TTL
let cachedProfile: CacheEntry | null = null;
let inFlightRequest: Promise<ApiResponse<UserProfile>> | null = null;

/**
 * Get user profile data with caching and request deduplication.
 * - Uses a 30-second TTL cache to prevent rapid successive calls
 * - All concurrent callers share the same in-flight request
 * @param locale - Current locale for API response messages
 */
export async function getUserProfile(locale: string): Promise<ApiResponse<UserProfile>> {
    // Return cached data if still valid (within TTL)
    if (cachedProfile && Date.now() - cachedProfile.timestamp < CACHE_TTL_MS) {
        return cachedProfile.data;
    }

    // Wait for existing in-flight request if present
    if (inFlightRequest) {
        return inFlightRequest;
    }

    inFlightRequest = apiGet<UserProfile>("/user-profile", locale, false, { cache: "no-store" });

    try {
        const result = await inFlightRequest;
        // Cache successful responses
        if (result.status === "success" && result.data) {
            cachedProfile = { data: result, timestamp: Date.now() };
        }
        return result;
    } finally {
        inFlightRequest = null;
    }
}

/**
 * Clear the user profile cache. Call this after profile updates.
 */
export function clearUserProfileCache(): void {
    cachedProfile = null;
}
