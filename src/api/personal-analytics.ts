import { apiGet } from "./api-client";
import type { components } from "./types";

export type UserDashboardData = components["schemas"]["UserDashboardResponse"];
export type ActivityHeatmapData = components["schemas"]["ActivityHeatmapData"];
export type DeadlinePerformanceData = components["schemas"]["DeadlinePerformanceData"];
export type TaskCompletionTrendData = components["schemas"]["TaskCompletionTrendData"];

export async function getPersonalDashboard() {
  return apiGet<components["schemas"]["UserDashboardResponseApiResponse"]>("/analytics/user/dashboard");
}

export async function getPersonalHeatmap() {
  return apiGet<components["schemas"]["ActivityHeatmapDataListApiResponse"]>("/analytics/user/heatmap");
}

export async function getDeadlinePerformance() {
  return apiGet<components["schemas"]["DeadlinePerformanceDataApiResponse"]>("/analytics/user/deadline-performance");
}

export async function getPersonalTrends() {
  return apiGet<components["schemas"]["TaskCompletionTrendDataListApiResponse"]>("/analytics/user/trends");
}
