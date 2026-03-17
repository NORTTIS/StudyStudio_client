import { type ApiResponse, apiDownload, apiGet } from "./api-client";

// Revenue Overview
export interface RevenueOverview {
    totalRevenue: number;
    monthlyRevenue: number;
    yearlyRevenue: number;
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    successRate: number;
    activeSubscriptions: number;
    arpu: number;
    mrr: number;
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
    period?: "day" | "week" | "month" | "year",
    startDate?: string,
    endDate?: string,
    locale = "vi"
): Promise<ApiResponse<RevenueByPeriod[]>> {
    let url = "/admin/revenue/by-period";
    const params = new URLSearchParams();
    if (period) params.append("Period", period);
    if (startDate) params.append("StartDate", startDate);
    if (endDate) params.append("EndDate", endDate);
    if (params.toString()) {
        url += `?${params.toString()}`;
    }
    return apiGet<RevenueByPeriod[]>(url, locale);
}

// Revenue by Plan
export interface RevenueByPlan {
    planId: string;
    planName: string;
    revenue: number;
    subscriptions: number;
    percentage: number;
}

export async function getRevenueByPlan(
    startDate?: string,
    endDate?: string,
    locale = "vi"
): Promise<ApiResponse<RevenueByPlan[]>> {
    let url = "/admin/revenue/by-plan";
    const params = new URLSearchParams();
    if (startDate) params.append("StartDate", startDate);
    if (endDate) params.append("EndDate", endDate);
    if (params.toString()) {
        url += `?${params.toString()}`;
    }
    return apiGet<RevenueByPlan[]>(url, locale);
}

// Revenue Trends
export interface RevenueTrendsData {
    currentPeriod: {
        period: string;
        startDate: string;
        endDate: string;
        totalRevenue: number;
        transactionCount: number;
        newCustomers: number;
        churnedCustomers: number;
        averageOrderValue: number;
    };
    previousPeriod: any | null;
    growthRate: number;
    trendDirection: string;
}

export async function getRevenueTrends(
    period: "week" | "month" | "year",
    locale = "vi"
): Promise<ApiResponse<RevenueTrendsData>> {
    return apiGet<RevenueTrendsData>(`/admin/revenue/trends?period=${period}`, locale);
}

// Top Plans
export interface TopPlan {
    planId: string;
    planName: string;
    revenue: number;
    subscriptions: number;
    growth: number;
}

export async function getTopPlans(
    limit = 5,
    startDate?: string,
    endDate?: string,
    locale = "vi"
): Promise<ApiResponse<TopPlan[]>> {
    let url = `/admin/revenue/top-plans?limit=${limit}`;
    const params = new URLSearchParams();
    if (startDate) params.append("StartDate", startDate);
    if (endDate) params.append("EndDate", endDate);
    if (params.toString()) {
        url += `&${params.toString()}`;
    }
    return apiGet<TopPlan[]>(url, locale);
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
    reportType: string,
    startDate: string,
    endDate: string,
    period: string,
    includeCharts: boolean,
    locale = "vi"
): Promise<Blob> {
    const params = new URLSearchParams();
    if (reportType) params.append("ReportType", reportType);
    if (startDate) params.append("StartDate", startDate);
    if (endDate) params.append("EndDate", endDate);
    if (period) params.append("Period", period);
    params.append("IncludeCharts", String(includeCharts));

    return apiDownload(`/admin/revenue/export?${params.toString()}`, locale);
}
