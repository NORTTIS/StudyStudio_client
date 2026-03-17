import { type ApiResponse, apiGet } from "./api-client";

// Hourly Activity
export interface HourlyActivityData {
    startDate: string;
    endDate: string;
    data: {
        hour: number;
        dayOfWeek: number;
        dayName: string;
        userCount: number;
    }[];
}

export async function getHourlyActivity(period?: string, locale = "vi"): Promise<ApiResponse<HourlyActivityData>> {
    const url = period ? `/admin/statistics/hourly-activity?period=${period}` : "/admin/statistics/hourly-activity";
    return apiGet<HourlyActivityData>(url, locale);
}

// Report Status Distribution
export interface ReportStatusData {
    startDate: string;
    endDate: string;
    periodType: string;
    data: {
        date: string;
        period: string;
        pending: number;
        processing: number;
        resolved: number;
        rejected: number;
    }[];
    totalReports: number;
}

export async function getReportStatus(period?: string, locale = "vi"): Promise<ApiResponse<ReportStatusData>> {
    const url = period ? `/admin/statistics/report-status?period=${period}` : "/admin/statistics/report-status";
    return apiGet<ReportStatusData>(url, locale);
}

// User Distribution
export interface UserDistributionData {
    startDate: string;
    endDate: string;
    totalUsers: number;
    distribution: {
        status: string;
        count: number;
        percentage: number;
    }[];
}

export async function getUserDistribution(period?: string, locale = "vi"): Promise<ApiResponse<UserDistributionData>> {
    const url = period ? `/admin/statistics/user-distribution?period=${period}` : "/admin/statistics/user-distribution";
    return apiGet<UserDistributionData>(url, locale);
}

// Subscription Distribution
export interface SubscriptionDistributionData {
    startDate: string;
    endDate: string;
    totalSubscriptions: number;
    distribution: {
        planType: string;
        count: number;
        percentage: number;
        totalRevenue: number;
    }[];
}

export async function getSubscriptionDistribution(
    period?: string,
    locale = "vi"
): Promise<ApiResponse<SubscriptionDistributionData>> {
    const url = period
        ? `/admin/statistics/subscription-distribution?period=${period}`
        : "/admin/statistics/subscription-distribution";
    return apiGet<SubscriptionDistributionData>(url, locale);
}

// Recent Activity
export interface RecentActivitiesData {
    startDate: string;
    endDate: string;
    activities: {
        id: number;
        type: string;
        title: string;
        message: string;
        count: number;
        timestamp: string;
    }[];
}

export async function getRecentActivity(limit = 10, locale = "vi"): Promise<ApiResponse<RecentActivitiesData>> {
    return apiGet<RecentActivitiesData>(`/admin/statistics/recent-activity?limit=${limit}`, locale);
}

// Top Active Groups
export interface TopActiveGroupsData {
    startDate: string;
    endDate: string;
    groups: {
        groupId: string;
        groupName: string;
        memberCount: number;
        totalTasks: number;
        completedTasks: number;
        completionRate: number;
        lastActivityAt: string;
    }[];
}

export async function getTopActiveGroups(limit = 10, locale = "vi"): Promise<ApiResponse<TopActiveGroupsData>> {
    return apiGet<TopActiveGroupsData>(`/admin/statistics/top-active-groups?limit=${limit}`, locale);
}

// Dashboard Overview Stats
export interface DashboardStats {
    totalUsers: number;
    activeUsers: number;
    totalGroups: number;
    totalTasks: number;
    completedTasks: number;
    totalRevenue: number;
    monthlyRevenue: number;
    activeSubscriptions: number;
    userGrowth: number;
    revenueGrowth: number;
}

export async function getDashboardStats(locale = "vi"): Promise<ApiResponse<DashboardStats>> {
    return apiGet<DashboardStats>("/admin/statistics/dashboard", locale);
}
