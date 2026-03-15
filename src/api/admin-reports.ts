import { apiGet, apiPut } from "./api-client";

export interface AdminReportSummary {
    totalReport: number;
    totalOpen: number;
    totalInProgress: number;
    totalResolved: number;
}

export interface AdminReport {
    reportId: string;
    type: number; // 0, 1, 2, 3
    email: string;
    title: string;
    content: string;
    status: number; // 0=OPEN, 1=IN_PROGRESS, 2=RESOLVED, 3=CLOSED
    priority: number; // 0=LOW, 1=MEDIUM, 2=HIGH, 3=URGENT
    adminNote: string | null;
    createdAt: string;
    updatedAt: string;
    userId: string;
    planStatus: number; // 0=Free, 1=Premium
}

export interface AdminReportsResponse {
    summary: AdminReportSummary;
    reportList: AdminReport[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
}

export interface ApiResponse<T> {
    status: string;
    code: string;
    message: string;
    data: T | null;
}

export interface AdminReportsParams {
    searchTerm?: string;
    type?: number; // 0, 1, 2, 3
    status?: number; // 0, 1, 2, 3
    pageNumber?: number;
    pageSize?: number;
}

export interface UpdateReportRequest {
    reportId: string;
    status: number;
    priority: number;
    adminNote: string;
}

/**
 * Get admin reports with pagination and filters
 */
export async function getAdminReports(
    params: AdminReportsParams,
    locale: string
): Promise<ApiResponse<AdminReportsResponse>> {
    try {
        // Build query parameters
        const queryParams = new URLSearchParams();

        if (params.searchTerm) {
            queryParams.append("SearchTerm", params.searchTerm);
        }
        if (params.type !== undefined) {
            queryParams.append("Type", params.type.toString());
        }
        if (params.status !== undefined) {
            queryParams.append("Status", params.status.toString());
        }
        if (params.pageNumber !== undefined) {
            queryParams.append("PageNumber", params.pageNumber.toString());
        }
        if (params.pageSize !== undefined) {
            queryParams.append("PageSize", params.pageSize.toString());
        }

        const endpoint = `/admin/reports${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
        console.log("Gọi API reports:", endpoint);

        const response = await apiGet<AdminReportsResponse>(endpoint, locale);
        console.log("Phản hồi API reports:", response);

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
            message: response.message || "Không thể tải dữ liệu báo cáo",
            data: null
        };
    } catch (error: unknown) {
        console.error("Lỗi khi gọi API admin reports:", error);
        return {
            status: "error",
            code: "FETCH_ERROR",
            message: error instanceof Error ? error.message : "Có lỗi không xác định xảy ra",
            data: null
        };
    }
}

/**
 * Update admin report
 */
export async function updateAdminReport(
    request: UpdateReportRequest,
    locale: string
): Promise<ApiResponse<AdminReport>> {
    try {
        // Wrap request in "request" object if needed by backend
        const response = await apiPut<AdminReport>("/admin/reports", request, locale);

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
            message: response.message || "Cập nhật báo cáo thất bại",
            data: null
        };
    } catch (error: unknown) {
        console.error("Lỗi khi cập nhật báo cáo admin:", error);
        return {
            status: "error",
            code: "UPDATE_ERROR",
            message: error instanceof Error ? error.message : "Có lỗi không xác định xảy ra",
            data: null
        };
    }
}

// Helper functions for mapping enums
export const REPORT_TYPES = {
    0: "Bug Report",
    1: "Feature Request",
    2: "Account Issue",
    3: "Other"
} as const;

export const REPORT_STATUSES = {
    0: "Open",
    1: "In Progress",
    2: "Resolved",
    3: "Closed"
} as const;

export const REPORT_PRIORITIES = {
    0: "Low",
    1: "Medium",
    2: "High",
    3: "Urgent"
} as const;

export function getReportTypeLabel(type: number): string {
    return REPORT_TYPES[type as keyof typeof REPORT_TYPES] || "Unknown";
}

export function getReportStatusLabel(status: number): string {
    return REPORT_STATUSES[status as keyof typeof REPORT_STATUSES] || "Unknown";
}

export function getReportPriorityLabel(priority: number): string {
    return REPORT_PRIORITIES[priority as keyof typeof REPORT_PRIORITIES] || "Unknown";
}

export function getReportStatusColor(status: number): string {
    switch (status) {
        case 0:
            return "bg-yellow-100 text-yellow-700"; // Open
        case 1:
            return "bg-blue-100 text-blue-700"; // In Progress
        case 2:
            return "bg-green-100 text-green-700"; // Resolved
        case 3:
            return "bg-gray-100 text-gray-700"; // Closed
        default:
            return "bg-gray-100 text-gray-700";
    }
}

export function getReportPriorityColor(priority: number): string {
    switch (priority) {
        case 0:
            return "bg-gray-100 text-gray-700"; // Low
        case 1:
            return "bg-yellow-100 text-yellow-700"; // Medium
        case 2:
            return "bg-orange-100 text-orange-700"; // High
        case 3:
            return "bg-red-100 text-red-700"; // Urgent
        default:
            return "bg-gray-100 text-gray-700";
    }
}

export function getPlanStatusLabel(planStatus: number): string {
    switch (planStatus) {
        case 0:
            return "Free";
        case 1:
            return "Premium";
        default:
            return "Unknown";
    }
}

export function getPlanStatusColor(planStatus: number): string {
    switch (planStatus) {
        case 0:
            return "bg-gray-100 text-gray-600"; // Free
        case 1:
            return "bg-purple-100 text-purple-700"; // Premium
        default:
            return "bg-gray-100 text-gray-600";
    }
}
