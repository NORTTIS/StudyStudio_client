/**
 * Admin Revenue API
 * API endpoints for admin revenue reporting and analytics
 */

import { apiFetch } from "./api-client";
import type { components } from "./types";

// Data types (inside response)
export type RevenueOverviewData = components["schemas"]["RevenueOverviewResponse"];
export type RevenueDataPoint = components["schemas"]["RevenueDataPoint"];
export type RevenueByPeriodData = components["schemas"]["RevenueByPeriodResponse"];
export type PlanRevenueSummary = components["schemas"]["PlanRevenueSummary"];
export type RevenueByPlanData = components["schemas"]["RevenueByPlanResponse"];
export type TrendData = components["schemas"]["TrendData"];
export type RevenueTrendsData = components["schemas"]["RevenueTrendsResponse"];
export type TopPlanItem = components["schemas"]["TopPlanItem"];
export type TopPlansData = components["schemas"]["TopPlansResponse"];
export type TransactionDetail = components["schemas"]["TransactionDetail"];
export type RevenueTransactionsData = components["schemas"]["RevenueTransactionsResponse"];
export type MRRMonthData = components["schemas"]["MRRMonthData"];
export type MRRBreakdownData = components["schemas"]["MRRBreakdownResponse"];

// Full API Response types from types.ts
export type RevenueOverviewApiResponse = components["schemas"]["RevenueOverviewResponseApiResponse"];
export type RevenueByPeriodApiResponse = components["schemas"]["RevenueByPeriodResponseApiResponse"];
export type RevenueByPlanApiResponse = components["schemas"]["RevenueByPlanResponseApiResponse"];
export type RevenueTrendsApiResponse = components["schemas"]["RevenueTrendsResponseApiResponse"];
export type TopPlansApiResponse = components["schemas"]["TopPlansResponseApiResponse"];
export type RevenueTransactionsApiResponse = components["schemas"]["RevenueTransactionsResponseApiResponse"];
export type MRRBreakdownApiResponse = components["schemas"]["MRRBreakdownResponseApiResponse"];

/**
 * Get revenue overview - overall revenue metrics and KPIs
 * GET /api/admin/revenue/overview
 */
export async function getRevenueOverview(): Promise<RevenueOverviewApiResponse> {
    return apiFetch<RevenueOverviewApiResponse>("/api/admin/revenue/overview") as Promise<RevenueOverviewApiResponse>;
}

/**
 * Get revenue breakdown by time period (daily, weekly, monthly, yearly)
 * GET /api/admin/revenue/by-period
 */
export async function getRevenueByPeriod(params: {
    startDate: string;
    endDate: string;
    period?: "daily" | "weekly" | "monthly" | "yearly";
    planId?: string;
}): Promise<RevenueByPeriodApiResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append("StartDate", params.startDate);
    queryParams.append("EndDate", params.endDate);
    if (params.period) {
        queryParams.append("Period", params.period);
    }
    if (params.planId) {
        queryParams.append("PlanId", params.planId);
    }

    return apiFetch<RevenueByPeriodApiResponse>(
        `/admin/revenue/by-period?${queryParams.toString()}`
    ) as Promise<RevenueByPeriodApiResponse>;
}

/**
 * Get revenue breakdown by subscription plan
 * GET /api/admin/revenue/by-plan
 */
export async function getRevenueByPlan(params?: {
    startDate?: string;
    endDate?: string;
}): Promise<RevenueByPlanApiResponse> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) {
        queryParams.append("StartDate", params.startDate);
    }
    if (params?.endDate) {
        queryParams.append("EndDate", params.endDate);
    }

    const queryString = queryParams.toString();
    return apiFetch<RevenueByPlanApiResponse>(
        queryString ? `/api/admin/revenue/by-plan?${queryString}` : "/admin/revenue/by-plan"
    ) as Promise<RevenueByPlanApiResponse>;
}

/**
 * Get revenue trends with optional comparison
 * GET /api/admin/revenue/trends
 */
export async function getRevenueTrends(params: {
    period?: "last7days" | "last30days" | "last90days" | "last12months" | "custom";
    startDate?: string;
    endDate?: string;
    comparison?: boolean;
}): Promise<RevenueTrendsApiResponse> {
    const queryParams = new URLSearchParams();

    if (params.period) {
        queryParams.append("Period", params.period);
    }
    if (params.startDate) {
        queryParams.append("StartDate", params.startDate);
    }
    if (params.endDate) {
        queryParams.append("EndDate", params.endDate);
    }
    if (params.comparison !== undefined) {
        queryParams.append("Comparison", params.comparison.toString());
    }

    return apiFetch<RevenueTrendsApiResponse>(
        `/admin/revenue/trends?${queryParams.toString()}`
    ) as Promise<RevenueTrendsApiResponse>;
}

/**
 * Get top performing subscription plans
 * GET /api/admin/revenue/top-plans
 */
export async function getTopPlans(params?: {
    limit?: number;
    startDate?: string;
    endDate?: string;
    sortBy?: "revenue" | "subscriptions" | "growth";
}): Promise<TopPlansApiResponse> {
    const queryParams = new URLSearchParams();

    if (params?.limit) {
        queryParams.append("Limit", params.limit.toString());
    }
    if (params?.startDate) {
        queryParams.append("StartDate", params.startDate);
    }
    if (params?.endDate) {
        queryParams.append("EndDate", params.endDate);
    }
    if (params?.sortBy) {
        queryParams.append("SortBy", params.sortBy);
    }

    const queryString = queryParams.toString();
    return apiFetch<TopPlansApiResponse>(
        queryString ? `/api/admin/revenue/top-plans?${queryString}` : "/admin/revenue/top-plans"
    ) as Promise<TopPlansApiResponse>;
}

/**
 * Get paginated list of revenue transactions
 * GET /api/admin/revenue/transactions
 */
export async function getRevenueTransactions(params: {
    pageNumber?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
    planId?: string;
    paymentStatus?: "PENDING" | "SUCCESS" | "CANCELLED" | "FAILED";
    searchTerm?: string;
}): Promise<RevenueTransactionsApiResponse> {
    const queryParams = new URLSearchParams();

    if (params.pageNumber) {
        queryParams.append("PageNumber", params.pageNumber.toString());
    }
    if (params.pageSize) {
        queryParams.append("PageSize", params.pageSize.toString());
    }
    if (params.startDate) {
        queryParams.append("StartDate", params.startDate);
    }
    if (params.endDate) {
        queryParams.append("EndDate", params.endDate);
    }
    if (params.planId) {
        queryParams.append("PlanId", params.planId);
    }
    if (params.paymentStatus) {
        queryParams.append("PaymentStatus", params.paymentStatus);
    }
    if (params.searchTerm) {
        queryParams.append("SearchTerm", params.searchTerm);
    }

    return apiFetch<RevenueTransactionsApiResponse>(
        `/admin/revenue/transactions?${queryParams.toString()}`
    ) as Promise<RevenueTransactionsApiResponse>;
}

/**
 * Get Monthly Recurring Revenue breakdown
 * GET /api/admin/revenue/mrr
 */
export async function getMRRBreakdown(year?: number): Promise<MRRBreakdownApiResponse> {
    const queryString = year ? `?Year=${year}` : "";
    return apiFetch<MRRBreakdownApiResponse>(`/admin/revenue/mrr${queryString}`) as Promise<MRRBreakdownApiResponse>;
}

/**
 * Export revenue report to Excel
 * GET /api/admin/revenue/export
 */
export async function exportRevenueReport(params?: {
    reportType?: "overview" | "by-period" | "by-plan" | "transactions";
    startDate?: string;
    endDate?: string;
    period?: "daily" | "weekly" | "monthly" | "yearly";
    includeCharts?: boolean;
}): Promise<Blob> {
    const queryParams = new URLSearchParams();

    if (params?.reportType) {
        queryParams.append("ReportType", params.reportType);
    }
    if (params?.startDate) {
        queryParams.append("StartDate", params.startDate);
    }
    if (params?.endDate) {
        queryParams.append("EndDate", params.endDate);
    }
    if (params?.period) {
        queryParams.append("Period", params.period);
    }
    if (params?.includeCharts !== undefined) {
        queryParams.append("IncludeCharts", params.includeCharts.toString());
    }

    const response = await fetch(`/admin/revenue/export?${queryParams.toString()}`, {
        headers: {
            Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("accessToken") : ""}`
        }
    });

    return response.blob();
}
