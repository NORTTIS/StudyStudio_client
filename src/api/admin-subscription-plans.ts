import type { components } from "@/api/types";
import { apiGet, apiPut } from "./api-client";

export type UpdateSubscriptionPlanRequest = components["schemas"]["UpdateSubscriptionPlanRequest"];
export type SubscriptionPlanDetail = components["schemas"]["SubscriptionPlanDetail"];

export interface AdminSubscriptionPlan {
    planId: string;
    planName: string;
    price: number;
    billingCycle: number;
    description: string;
    maxStudios: number;
    maxStorageMb: number;
    maxAiRequestsPerDay: number;
    maxGroups: number;
    maxMembersPerGroup: number;
    isActive: boolean;
    subscriberCount: number;
}

export interface UserStats {
    totalActiveUsers: number;
    freeUsers: number;
    premiumUsers: number;
    conversionRate: number;
}

export interface AdminSubscriptionStatsResponse {
    userStats: UserStats;
    plans: AdminSubscriptionPlan[];
}

export interface ApiResponse<T> {
    status: string;
    code: string;
    message: string;
    data: T | null;
}

/**
 * Get admin subscription plans statistics
 */
export async function getAdminSubscriptionStats(locale: string): Promise<ApiResponse<AdminSubscriptionStatsResponse>> {
    try {
        const response = await apiGet<AdminSubscriptionStatsResponse>("/admin/subscription-plans/statistics", locale);

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
            message: response.message || "Failed to fetch data",
            data: null
        };
    } catch (error: unknown) {
        console.error("Failed to get admin subscription stats:", error);
        return {
            status: "error",
            code: "FETCH_ERROR",
            message: error instanceof Error ? error.message : "Unknown error occurred",
            data: {
                userStats: {
                    totalActiveUsers: 0,
                    freeUsers: 0,
                    premiumUsers: 0,
                    conversionRate: 0
                },
                plans: []
            }
        };
    }
}

/**
 * Get subscription plans (public endpoint)
 */
export async function getSubscriptionPlans(locale: string): Promise<ApiResponse<{ plans: AdminSubscriptionPlan[] }>> {
    try {
        const response = await apiGet<{ plans: AdminSubscriptionPlan[] }>("/SubscriptionPlan", locale);

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
            message: response.message || "Failed to fetch plans",
            data: null
        };
    } catch (error: unknown) {
        console.error("Failed to get subscription plans:", error);
        return {
            status: "error",
            code: "FETCH_ERROR",
            message: error instanceof Error ? error.message : "Unknown error occurred",
            data: {
                plans: []
            }
        };
    }
}
export function planToUpdateRequest(
    plan: AdminSubscriptionPlan,
    overrides?: Partial<UpdateSubscriptionPlanRequest>
): UpdateSubscriptionPlanRequest {
    return {
        planId: plan.planId,
        planName: plan.planName,
        price: plan.price,
        billingCycle: plan.billingCycle as UpdateSubscriptionPlanRequest["billingCycle"],
        description: plan.description,
        maxStudios: plan.maxStudios,
        maxStorageMb: plan.maxStorageMb,
        maxAiRequestsPerDay: plan.maxAiRequestsPerDay,
        maxGroups: plan.maxGroups,
        maxMembersPerGroup: plan.maxMembersPerGroup,
        isActive: plan.isActive,
        ...overrides
    };
}

export async function updateSubscriptionPlan(
    plan: UpdateSubscriptionPlanRequest,
    locale: string
): Promise<ApiResponse<SubscriptionPlanDetail>> {
    try {
        const response = await apiPut<SubscriptionPlanDetail>("/admin/subscription-plans", plan, locale);
        console.log("Phản hồi từ API:", response);

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
            message: response.message || "Cập nhật gói thất bại",
            data: null
        };
    } catch (error: unknown) {
        console.error("Lỗi khi cập nhật gói subscription:", error);
        return {
            status: "error",
            code: "UPDATE_ERROR",
            message: error instanceof Error ? error.message : "Có lỗi không xác định xảy ra",
            data: null
        };
    }
}
