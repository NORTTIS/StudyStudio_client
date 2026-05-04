import { type ApiResponse, apiGet } from "./api-client";

// Helper function to calculate date range based on period
function calculateDateRange(period: string): { startDate: string; endDate: string } {
    const today = new Date();

    let start = new Date(today);
    let end = new Date(today);

    switch (period) {
        case "day": // Hôm nay
            // start = today, end = today
            break;

        case "week": // Tuần này (Thứ Hai - Chủ Nhật)
            const dayOfWeek = today.getDay();
            // getDay(): 0=CN, 1=T2, ..., 6=T7
            const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            start.setDate(diff);
            // end = Chủ Nhật của tuần này
            end = new Date(start);
            end.setDate(start.getDate() + 6);
            break;

        case "month": // Tháng này (1 đến cuối tháng)
            start.setDate(1);
            // end = ngày cuối tháng
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;

        case "year": // Năm này (1/1 đến 31/12)
            start = new Date(today.getFullYear(), 0, 1);
            end = new Date(today.getFullYear(), 11, 31);
            break;

        default:
            // default: tháng này
            start.setDate(1);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }

    // Format as YYYY-MM-DD
    const formatDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    return {
        startDate: formatDate(start),
        endDate: formatDate(end)
    };
}

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

export async function getHourlyActivity(period?: string, locale = "vi", startDate?: string, endDate?: string): Promise<ApiResponse<HourlyActivityData>> {
    let url = "/admin/statistics/hourly-activity";
    const params = new URLSearchParams();
    
    if (startDate && endDate) {
        params.append("StartDate", startDate);
        params.append("EndDate", endDate);
    } else if (period) {
        const { startDate: calcStart, endDate: calcEnd } = calculateDateRange(period);
        params.append("StartDate", calcStart);
        params.append("EndDate", calcEnd);
    }
    
    if (params.toString()) {
        url += `?${params.toString()}`;
    }
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

export async function getReportStatus(period?: string, locale = "vi", startDate?: string, endDate?: string): Promise<ApiResponse<ReportStatusData>> {
    let url = "/admin/statistics/report-status";
    const params = new URLSearchParams();
    
    if (startDate && endDate) {
        params.append("StartDate", startDate);
        params.append("EndDate", endDate);
    } else if (period) {
        const { startDate: calcStart, endDate: calcEnd } = calculateDateRange(period);
        params.append("StartDate", calcStart);
        params.append("EndDate", calcEnd);
    }
    
    params.append("Period", "monthly");
    
    if (params.toString()) {
        url += `?${params.toString()}`;
    }
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

export async function getUserDistribution(period?: string, locale = "vi", startDate?: string, endDate?: string): Promise<ApiResponse<UserDistributionData>> {
    let url = "/admin/statistics/user-distribution";
    const params = new URLSearchParams();
    
    if (startDate && endDate) {
        params.append("StartDate", startDate);
        params.append("EndDate", endDate);
    } else if (period) {
        const { startDate: calcStart, endDate: calcEnd } = calculateDateRange(period);
        params.append("StartDate", calcStart);
        params.append("EndDate", calcEnd);
    }
    
    if (params.toString()) {
        url += `?${params.toString()}`;
    }
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
    locale = "vi",
    startDate?: string,
    endDate?: string
): Promise<ApiResponse<SubscriptionDistributionData>> {
    let url = "/admin/statistics/subscription-distribution";
    const params = new URLSearchParams();

    if (startDate && endDate) {
        params.append("StartDate", startDate);
        params.append("EndDate", endDate);
    } else if (period) {
        const { startDate: calcStart, endDate: calcEnd } = calculateDateRange(period);
        params.append("StartDate", calcStart);
        params.append("EndDate", calcEnd);
    }

    if (params.toString()) {
        url += `?${params.toString()}`;
    }
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
