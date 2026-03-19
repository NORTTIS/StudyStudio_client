/**
 * Analytics API
 * Handles studio analytics and heatmap data
 */

import { apiGet } from "./api-client";
import type { components } from "./types";

// OpenAPI response wrapper types
export type GroupComparisonData = components["schemas"]["GroupComparisonData"];

// OpenAPI response wrapper type
export type StudioGroupHeatmapResponseApiResponse = components["schemas"]["StudioGroupHeatmapResponseApiResponse"];

// Internal payload types (convenience aliases)
export type StudioHeatmapData = components["schemas"]["StudioHeatmapData"];
export type StudioGroupActivityItem = components["schemas"]["StudioGroupActivityItem"];

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
