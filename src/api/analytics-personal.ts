/**
 * Personal Analytics API
 * Handles all 9 personal analytics endpoints from /api/analytics/user/*
 */

import { apiFetch } from "./api-client";
import type { components } from "./types";

// ── Type aliases from OpenAPI schemas ────────────────────────────────
export type UserKpiSummaryResponse = components["schemas"]["UserKpiSummaryResponse"];
export type UserTaskStatusResponse = components["schemas"]["UserTaskStatusResponse"];
export type UserGroupRankingsResponse = components["schemas"]["UserGroupRankingsResponse"];
export type UserProductivityTrendResponse = components["schemas"]["UserProductivityTrendResponse"];
export type UserPriorityDistributionResponse = components["schemas"]["UserPriorityDistributionResponse"];
export type UserUrgencyDistributionResponse = components["schemas"]["UserUrgencyDistributionResponse"];
export type UserBenchmarkResponse = components["schemas"]["UserBenchmarkResponse"];
export type UserRiskAlertsResponse = components["schemas"]["UserRiskAlertsResponse"];

// ── API functions ────────────────────────────────────────────────────

/**
 * GET /api/analytics/user/{userId}/kpi-summary
 * KPI summary: total tasks, completed, overdue, completion rate, avg time
 */
export async function getUserKpiSummary(userId: string, locale = "vi") {
    return apiFetch<UserKpiSummaryResponse>(`/analytics/user/${userId}/kpi-summary`, {
        method: "GET",
        locale
    });
}

/**
 * GET /api/analytics/user/{userId}/task-status
 * Task status donut: Hoàn thành, Đang làm, Chưa bắt đầu, Quá hạn
 */
export async function getUserTaskStatus(userId: string, locale = "vi") {
    return apiFetch<UserTaskStatusResponse>(`/analytics/user/${userId}/task-status`, {
        method: "GET",
        locale
    });
}

/**
 * GET /api/analytics/user/{userId}/group-rankings
 * Cross-studio group rankings sorted by score
 */
export async function getUserGroupRankings(userId: string, locale = "vi") {
    return apiFetch<UserGroupRankingsResponse>(`/analytics/user/${userId}/group-rankings`, {
        method: "GET",
        locale
    });
}

/**
 * GET /api/analytics/user/{userId}/productivity-trend?period={period}
 * 30-day productivity trend (area chart)
 */
export async function getUserProductivityTrend(userId: string, period = 30, locale = "vi") {
    return apiFetch<UserProductivityTrendResponse>(`/analytics/user/${userId}/productivity-trend?period=${period}`, {
        method: "GET",
        locale
    });
}


/**
 * GET /api/analytics/user/{userId}/priority-distribution
 * Task distribution by priority: Cao, Trung bình, Thấp
 */
export async function getUserPriorityDistribution(userId: string, locale = "vi") {
    return apiFetch<UserPriorityDistributionResponse>(`/analytics/user/${userId}/priority-distribution`, {
        method: "GET",
        locale
    });
}

/**
 * GET /api/analytics/user/{userId}/urgency-distribution
 * Task distribution by urgency: Khẩn cấp, Cao, Trung bình, Thấp
 */
export async function getUserUrgencyDistribution(userId: string, locale = "vi") {
    return apiFetch<UserUrgencyDistributionResponse>(`/analytics/user/${userId}/urgency-distribution`, {
        method: "GET",
        locale
    });
}

/**
 * GET /api/analytics/user/{userId}/benchmark?weeks={weeks}&groupId={groupId}
 * Weekly performance benchmark (user vs group avg)
 */
export async function getUserBenchmark(userId: string, weeks = 7, groupId?: string, locale = "vi") {
    const params = new URLSearchParams({ weeks: String(weeks) });
    if (groupId) params.set("groupId", groupId);
    return apiFetch<UserBenchmarkResponse>(`/analytics/user/${userId}/benchmark?${params}`, { method: "GET", locale });
}

/**
 * GET /api/analytics/user/{userId}/risk-alerts?limit={limit}
 * Risk alerts: overdue, due soon, stuck tasks
 */
export async function getUserRiskAlerts(userId: string, limit = 10, locale = "vi") {
    return apiFetch<UserRiskAlertsResponse>(`/analytics/user/${userId}/risk-alerts?limit=${limit}`, {
        method: "GET",
        locale
    });
}
