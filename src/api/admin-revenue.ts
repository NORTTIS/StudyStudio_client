import { apiGet, type ApiResponse } from "./api-client";

// Revenue Overview
export interface RevenueOverview {
    totalRevenue: number;
    monthlyRevenue: number;
    yearlyRevenue: number;
    revenueGrowth: number;
    activeSubscriptions: number;
    averageRevenuePerUser: number;
}

export async function getRevenueOverview(locale = "vi"): Promise<ApiResponse<RevenueOverview>> {
    return apiGet<RevenueOverview>("/admin/revenue/overview", locale);
}

// Revenue by Period
export interface RevenueByPeriod {
    period: string;
    revenue: number;
    subscriptions: number;
    newSubscriptions: number;
    cancelledSubscriptions: number;
}

export async function getRevenueByPeriod(
    startDate: string,
    endDate: string,
    locale = "vi"
): Promise<ApiResponse<RevenueByPeriod[]>> {
    return apiGet<RevenueByPeriod[]>(
        `/admin/revenue/by-period?startDate=${startDate}&endDate=${endDate}`,
        locale
    );
}

// Revenue by Plan
export interface RevenueByPlan {
    planId: string;
    planName: string;
    revenue: number;
    subscriptions: number;
    percentage: number;
}

export async function getRevenueByPlan(locale = "vi"): Promise<ApiResponse<RevenueByPlan[]>> {
    return apiGet<RevenueByPlan[]>("/admin/revenue/by-plan", locale);
}

// Revenue Trends
export interface RevenueTrend {
    date: string;
    revenue: number;
    subscriptions: number;
}

export async function getRevenueTrends(
    period: "week" | "month" | "year",
    locale = "vi"
): Promise<ApiResponse<RevenueTrend[]>> {
    return apiGet<RevenueTrend[]>(`/admin/revenue/trends?period=${period}`, locale);
}

// Top Plans
export interface TopPlan {
    planId: string;
    planName: string;
    revenue: number;
    subscriptions: number;
    growth: number;
}

export async function getTopPlans(limit = 5, locale = "vi"): Promise<ApiResponse<TopPlan[]>> {
    return apiGet<TopPlan[]>(`/admin/revenue/top-plans?limit=${limit}`, locale);
}

// Revenue Transactions
export interface RevenueTransaction {
    transactionId: string;
    userId: string;
    userName: string;
    planName: string;
    amount: number;
    status: string;
    createdAt: string;
}

export async function getRevenueTransactions(
    page = 1,
    pageSize = 20,
    locale = "vi"
): Promise<ApiResponse<{ transactions: RevenueTransaction[]; total: number }>> {
    return apiGet<{ transactions: RevenueTransaction[]; total: number }>(
        `/admin/revenue/transactions?page=${page}&pageSize=${pageSize}`,
        locale
    );
}

// MRR (Monthly Recurring Revenue)
export interface MRRData {
    currentMRR: number;
    previousMRR: number;
    growth: number;
    newMRR: number;
    expansionMRR: number;
    contractionMRR: number;
    churnedMRR: number;
}

export async function getMRR(locale = "vi"): Promise<ApiResponse<MRRData>> {
    return apiGet<MRRData>("/admin/revenue/mrr", locale);
}

// Export Revenue Data
export async function exportRevenueData(
    startDate: string,
    endDate: string,
    locale = "vi"
): Promise<ApiResponse<Blob>> {
    return apiGet<Blob>(
        `/admin/revenue/export?startDate=${startDate}&endDate=${endDate}`,
        locale
    );
}
