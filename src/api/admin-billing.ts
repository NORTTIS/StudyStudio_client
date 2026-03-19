import { apiGet } from "./api-client";

export interface AdminBillingHistoryItem {
    paymentId: string;
    orderCode: number;
    paymentStatus: number; // 0=PENDING, 1=SUCCESS, 2=CANCELLED, 3=FAILED
    amount: number;
    paymentMethod: string;
    createdAt: string;
    paidAt: string | null;
    userId: string;
    userEmail: string;
    userName: string;
    planId: string;
    planName: string;
}

export interface AdminBillingHistoryResponse {
    items: AdminBillingHistoryItem[];
    pageNumber: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
}

export interface ApiResponse<T> {
    status: string;
    code: string;
    message: string;
    data: T | null;
}

export interface AdminBillingHistoryParams {
    searchTerm?: string;
    paymentStatus?: number; // 0, 1, 2, 3
    startDate?: string;
    endDate?: string;
    pageNumber?: number;
    pageSize?: number;
}

/**
 * Get admin billing history with pagination and filters
 */
export async function getAdminBillingHistory(
    params: AdminBillingHistoryParams,
    locale: string
): Promise<ApiResponse<AdminBillingHistoryResponse>> {
    try {
        // Build query parameters
        const queryParams = new URLSearchParams();

        if (params.searchTerm) {
            queryParams.append("SearchTerm", params.searchTerm);
        }
        if (params.paymentStatus !== undefined) {
            queryParams.append("PaymentStatus", params.paymentStatus.toString());
        }
        if (params.startDate) {
            queryParams.append("StartDate", params.startDate);
        }
        if (params.endDate) {
            queryParams.append("EndDate", params.endDate);
        }
        if (params.pageNumber !== undefined) {
            queryParams.append("PageNumber", params.pageNumber.toString());
        }
        if (params.pageSize !== undefined) {
            queryParams.append("PageSize", params.pageSize.toString());
        }

        const endpoint = `/admin/billing/history${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
        const response = await apiGet<AdminBillingHistoryResponse>(endpoint, locale);

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
        console.error("Failed to get admin billing history:", error);
        return {
            status: "error",
            code: "FETCH_ERROR",
            message: error instanceof Error ? error.message : "Unknown error occurred",
            data: {
                items: [],
                pageNumber: 1,
                pageSize: 10,
                totalCount: 0,
                totalPages: 0
            }
        };
    }
}
