/**
 * Analytics API
 * Handles studio analytics, group analytics, and heatmap data
 */

import { type ApiResponse, apiGet } from "./api-client";
import type { components } from "./types";

// === Studio-level types ===
export type StudioOverviewResponse = components["schemas"]["StudioOverviewResponse"];
export type StudioHeatmapData = components["schemas"]["StudioHeatmapData"];
export type StudioGroupData = components["schemas"]["StudioGroupData"];
export type StudioStatusBreakdown = components["schemas"]["StudioStatusBreakdown"];
export type StudioCompletionTrendResponse = components["schemas"]["StudioCompletionTrendResponse"];
export type StudioGroupTrendData = components["schemas"]["StudioGroupTrendData"];
export type StudioTrendPoint = components["schemas"]["StudioTrendPoint"];
export type StudioGroupActivityResponse = components["schemas"]["StudioGroupActivityResponse"];
export type StudioActivityRow = components["schemas"]["StudioActivityRow"];
export type StudioActivityItem = components["schemas"]["StudioActivityItem"];

// === Group-level types ===
export type GroupComparisonData = components["schemas"]["GroupComparisonData"];
export type MemberTaskBreakdownData = components["schemas"]["MemberTaskBreakdownData"];
export type DailyProgressPoint = components["schemas"]["DailyProgressPoint"];
export type MemberProgressTrendData = components["schemas"]["MemberProgressTrendData"];
export type MemberHeatmapData = components["schemas"]["MemberHeatmapData"];
export type DailyActivityPoint = components["schemas"]["DailyActivityPoint"];
export type MemberActivitySummary = components["schemas"]["MemberActivitySummary"];
export type MemberContributionData = components["schemas"]["MemberContributionData"];
export type GroupSummaryResponse = components["schemas"]["GroupSummaryResponse"];

// Backward compatibility alias
export type GroupAnalyticsResponse = GroupSummaryResponse;

// === Studio endpoints ===

/**
 * GET /api/analytics/studio/{studioId}/overview
 *
 * Returns studio overview with all groups summary (no date filter).
 * Used for Chart 1 & Chart 2.
 *
 * @param studioId - The studio UUID
 */
export async function getStudioOverview(studioId: string) {
    return apiGet<StudioOverviewResponse>(`/analytics/studio/${studioId}/overview`);
}

/**
 * GET /api/analytics/studio/{studioId}/completion-trend
 *
 * Returns completion trend per group WITH date filter.
 * Used for Chart 3.
 *
 * @param studioId - The studio UUID
 * @param options - startDate, endDate (YYYY-MM-DD), groupIds (comma-separated)
 */
export async function getStudioCompletionTrend(
    studioId: string,
    options?: {
        startDate?: string;
        endDate?: string;
        groupIds?: string[];
    }
) {
    const params = new URLSearchParams();
    if (options?.startDate) params.set("startDate", options.startDate);
    if (options?.endDate) params.set("endDate", options.endDate);
    if (options?.groupIds?.length) params.set("groupIds", options.groupIds.join(","));
    const query = params.toString();
    return apiGet<StudioCompletionTrendResponse>(
        `/analytics/studio/${studioId}/completion-trend${query ? `?${query}` : ""}`
    );
}

/**
 * GET /api/analytics/studio/{studioId}/group-activity
 *
 * Returns activity heatmap data per group WITH date filter.
 * ActivityLevel (0-4) is pre-calculated by backend with fixed thresholds.
 * Used for Chart 5.
 *
 * @param studioId - The studio UUID
 * @param options - startDate, endDate (YYYY-MM-DD)
 */
export async function getStudioGroupActivity(studioId: string, options?: { startDate?: string; endDate?: string }) {
    const params = new URLSearchParams();
    if (options?.startDate) params.set("startDate", options.startDate);
    if (options?.endDate) params.set("endDate", options.endDate);
    const query = params.toString();
    return apiGet<StudioGroupActivityResponse>(
        `/analytics/studio/${studioId}/group-activity${query ? `?${query}` : ""}`
    );
}

/**
 * GET /api/analytics/studio/{studioId}/groups
 *
 * Returns per-group progress snapshots for a studio (backward compat).
 *
 * @param studioId - The studio UUID
 * @param locale   - Language code (default "vi")
 */
export async function getStudioGroupAnalytics(studioId: string, locale = "vi") {
    return apiGet<GroupComparisonData[]>(`/analytics/studio/${studioId}/groups`, locale, false);
}

// === Group-level endpoints ===

/**
 * GET /api/analytics/group/{groupId}
 *
 * Returns analytics data for a specific group.
 *
 * @param groupId - The group UUID
 * @param options - startDate, endDate (YYYY-MM-DD), locale
 */
export async function getGroupAnalytics(
    groupId: string,
    options?: { startDate?: string; endDate?: string; locale?: string }
): Promise<ApiResponse<GroupAnalyticsResponse>> {
    const { startDate, endDate, locale = "vi" } = options ?? {};

    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const query = params.toString();

    return apiGet<GroupAnalyticsResponse>(`/analytics/group/${groupId}${query ? `?${query}` : ""}`, locale, false);
}

/**
 * GET /api/analytics/group/{groupId}/summary
 *
 * Returns group summary WITHOUT date filter (all time data).
 * Used for Chart 6 (member progress).
 *
 * @param groupId - The group UUID
 */
export async function getGroupSummary(groupId: string): Promise<ApiResponse<GroupSummaryResponse>> {
    return apiGet<GroupSummaryResponse>(`/analytics/group/${groupId}/summary`);
}

/**
 * GET /api/analytics/group/{groupId}/trend
 *
 * Returns member progress trend WITH date filter.
 * Used for Group Chart 3 (Line Chart).
 *
 * @param groupId - The group UUID
 * @param options - startDate, endDate (YYYY-MM-DD)
 */
export async function getGroupTrend(
    groupId: string,
    options?: { startDate?: string; endDate?: string }
): Promise<ApiResponse<MemberProgressTrendData[]>> {
    const params = new URLSearchParams();
    if (options?.startDate) params.set("startDate", options.startDate);
    if (options?.endDate) params.set("endDate", options.endDate);
    const query = params.toString();

    return apiGet<MemberProgressTrendData[]>(`/analytics/group/${groupId}/trend${query ? `?${query}` : ""}`);
}

/**
 * GET /api/analytics/group/{groupId}/heatmap
 *
 * Returns member heatmap data WITH date filter.
 * Used for Group Chart 5 (Member Heatmap).
 *
 * @param groupId - The group UUID
 * @param options - startDate, endDate (YYYY-MM-DD)
 */
export async function getGroupHeatmap(
    groupId: string,
    options?: { startDate?: string; endDate?: string }
): Promise<ApiResponse<MemberHeatmapData[]>> {
    const params = new URLSearchParams();
    if (options?.startDate) params.set("startDate", options.startDate);
    if (options?.endDate) params.set("endDate", options.endDate);
    const query = params.toString();

    return apiGet<MemberHeatmapData[]>(`/analytics/group/${groupId}/heatmap${query ? `?${query}` : ""}`);
}
