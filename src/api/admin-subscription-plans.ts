import { apiGet, apiPut } from "./api-client";

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
export async function updateSubscriptionPlan(
    plan: Partial<AdminSubscriptionPlan> | Record<string, unknown>,
    locale: string
): Promise<ApiResponse<AdminSubscriptionPlan>> {
    try {
        // Wrap the plan data in a "request" object as expected by the backend
        const requestBody = { request: plan };
        console.log("Dữ liệu gửi đến API:", JSON.stringify(requestBody, null, 2));

        const response = await apiPut<AdminSubscriptionPlan>("/admin/subscription-plans", requestBody, locale);
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
