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

// Group analytics types
export type GroupAnalyticsResponse = components["schemas"]["GroupAnalyticsResponse"];
export type GroupProgressData = components["schemas"]["GroupProgressData"];
export type GroupActivityHeatmapData = components["schemas"]["GroupActivityHeatmapData"];
export type MemberContributionData = components["schemas"]["MemberContributionData"];

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
