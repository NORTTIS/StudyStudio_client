/**
 * Subscription Plans API
 * Handles fetching available subscription plans
 */

import { type ApiResponse, apiGet } from "@/api/api-client";

export interface SubscriptionPlan {
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
}

export interface SubscriptionPlansResponse {
    plans: SubscriptionPlan[];
}

/**
 * Get all available subscription plans
 * @param locale - Current locale for API response messages
 */
export async function getSubscriptionPlans(locale: string): Promise<ApiResponse<SubscriptionPlansResponse>> {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";
    return apiGet<SubscriptionPlansResponse>(`${baseUrl}/SubscriptionPlan`, locale);
}
