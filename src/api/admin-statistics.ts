import { apiGet, type ApiResponse } from "./api-client";

// Hourly Activity
export interface HourlyActivity {
    hour: number;
    activeUsers: number;
    tasksCreated: number;
    groupsCreated: number;
}

export async function getHourlyActivity(
    date?: string,
    locale = "vi"
): Promise<ApiResponse<HourlyActivity[]>> {
    const url = date ? `/admin/statistics/hourly-activity?date=${date}` : "/admin/statistics/hourly-activity";
    return apiGet<HourlyActivity[]>(url, locale);
}

// Report Status Distribution
export interface ReportStatusDistribution {
    status: string;
    count: number;
    percentage: number;
}

export async function getReportStatus(locale = "vi"): Promise<ApiResponse<ReportStatusDistribution[]>> {
    return apiGet<ReportStatusDistribution[]>("/admin/statistics/report-status", locale);
}

// User Distribution
export interface UserDistribution {
    category: string;
    count: number;
    percentage: number;
}

export async function getUserDistribution(locale = "vi"): Promise<ApiResponse<UserDistribution[]>> {
    return apiGet<UserDistribution[]>("/admin/statistics/user-distribution", locale);
}

// Subscription Distribution
export interface SubscriptionDistribution {
    planName: string;
    count: number;
    percentage: number;
    revenue: number;
}

export async function getSubscriptionDistribution(
    locale = "vi"
): Promise<ApiResponse<SubscriptionDistribution[]>> {
    return apiGet<SubscriptionDistribution[]>("/admin/statistics/subscription-distribution", locale);
}

// Recent Activity
export interface RecentActivity {
    id: string;
    type: "user_registered" | "subscription_created" | "group_created" | "task_completed" | "report_submitted";
    userId: string;
    userName: string;
    description: string;
    createdAt: string;
}

export async function getRecentActivity(
    limit = 10,
    locale = "vi"
): Promise<ApiResponse<RecentActivity[]>> {
    return apiGet<RecentActivity[]>(`/admin/statistics/recent-activity?limit=${limit}`, locale);
}

// Top Active Groups
export interface TopActiveGroup {
    groupId: string;
    groupName: string;
    memberCount: number;
    taskCount: number;
    completedTaskCount: number;
    activityScore: number;
}

export async function getTopActiveGroups(
    limit = 10,
    locale = "vi"
): Promise<ApiResponse<TopActiveGroup[]>> {
    return apiGet<TopActiveGroup[]>(`/admin/statistics/top-active-groups?limit=${limit}`, locale);
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
