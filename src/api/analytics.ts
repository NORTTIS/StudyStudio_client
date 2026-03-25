/**
 * Analytics API
 * Handles studio analytics, group analytics, and heatmap data
 */

import { type ApiResponse, apiGet } from "./api-client";
import type { components } from "./types";

// OpenAPI response wrapper types
export type GroupComparisonData = components["schemas"]["GroupComparisonData"];

// OpenAPI response wrapper type
export type StudioGroupHeatmapResponseApiResponse = components["schemas"]["StudioGroupHeatmapResponseApiResponse"];

// Internal payload types (convenience aliases)
export type StudioHeatmapData = components["schemas"]["StudioHeatmapData"];
export type StudioGroupActivityItem = components["schemas"]["StudioGroupActivityItem"];

// Group analytics types (only needed types)
// === NEW: GroupAnalyticPage enhanced types ===
export type MemberTaskBreakdownData = components["schemas"]["MemberTaskBreakdownData"];
export type DailyProgressPoint = components["schemas"]["DailyProgressPoint"];
export type MemberProgressTrendData = components["schemas"]["MemberProgressTrendData"];
export type MemberHeatmapData = components["schemas"]["MemberHeatmapData"];
export type DailyActivityPoint = components["schemas"]["DailyActivityPoint"];
export type MemberActivitySummary = components["schemas"]["MemberActivitySummary"];
export type MemberContributionData = components["schemas"]["MemberContributionData"];

// === NEW: Group Summary Response (no date filter) ===
export type GroupSummaryResponse = components["schemas"]["GroupSummaryResponse"];

// Backward compatibility alias
export type GroupAnalyticsResponse = GroupSummaryResponse;

/**
 * GET /api/analytics/studio/{studioId}/groups
 *
 * Returns per-group progress snapshots for a studio.
 *
 * @param studioId - The studio UUID
 * @param locale   - Language code (default "vi")
 */
export async function getStudioGroupAnalytics(studioId: string, locale = "vi") {
    return apiGet<GroupComparisonData[]>(`/analytics/studio/${studioId}/groups`, locale, false);
}

/**
 * GET /api/analytics/studio/{studioId}/heatmap
 *
 * Returns daily group activity heatmap data for a studio.
 *
 * @param studioId - The studio UUID
 * @param options  - Optional: startDate, endDate (YYYY-MM-DD), locale
 */
export async function getStudioGroupHeatmap(
    studioId: string,
    options?: { startDate?: string; endDate?: string; locale?: string }
) {
    const { startDate, endDate, locale = "vi" } = options ?? {};

    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const query = params.toString();

    return apiGet<StudioGroupHeatmapResponseApiResponse>(
        `/analytics/studio/${studioId}/heatmap${query ? `?${query}` : ""}`,
        locale,
        false
    );
}

/**
 * GET /api/analytics/group/{groupId}
 *
 * Returns analytics data for a specific group including:
 * - completion rate
 * - activity heatmap
 * - progress trend
 * - member contributions
 * - performance radar
 *
 * @param groupId - The group UUID
 * @param options - Optional: startDate, endDate (YYYY-MM-DD), locale
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

    return apiGet<GroupAnalyticsResponse>(
        `/analytics/group/${groupId}${query ? `?${query}` : ""}`,
        locale,
        false
    );
}

/**
 * GET /api/analytics/group/{groupId}/summary
 *
 * Returns group summary WITHOUT date filter (all time data).
 * Used for Chart 1, 2, 4, 6
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
 * Used for Chart 3 (Line Chart)
 *
 * @param groupId - The group UUID
 * @param options - Optional: startDate, endDate (YYYY-MM-DD)
 */
export async function getGroupTrend(
    groupId: string,
    options?: { startDate?: string; endDate?: string }
): Promise<ApiResponse<MemberProgressTrendData[]>> {
    const params = new URLSearchParams();
    if (options?.startDate) params.set("startDate", options.startDate);
    if (options?.endDate) params.set("endDate", options.endDate);
    const query = params.toString();

    return apiGet<MemberProgressTrendData[]>(
        `/analytics/group/${groupId}/trend${query ? `?${query}` : ""}`
    );
}

/**
 * GET /api/analytics/group/{groupId}/heatmap
 *
 * Returns member heatmap data WITH date filter.
 * Used for Chart 5 (Member Heatmap)
 *
 * @param groupId - The group UUID
 * @param options - Optional: startDate, endDate (YYYY-MM-DD)
 */
export async function getGroupHeatmap(
    groupId: string,
    options?: { startDate?: string; endDate?: string }
): Promise<ApiResponse<MemberHeatmapData[]>> {
    const params = new URLSearchParams();
    if (options?.startDate) params.set("startDate", options.startDate);
    if (options?.endDate) params.set("endDate", options.endDate);
    const query = params.toString();

    return apiGet<MemberHeatmapData[]>(
        `/analytics/group/${groupId}/heatmap${query ? `?${query}` : ""}`
    );
}
