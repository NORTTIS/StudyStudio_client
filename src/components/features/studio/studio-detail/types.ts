/**
 * Mock data and types for Studio Analytics
 * This will be replaced with actual API calls when available
 */

import type { StudioHeatmapData, GroupComparisonData } from "@/api/analytics";
import type { components } from "@/api/types";
import { formatRelativeTime } from "@/lib/utils";

export type { StudioHeatmapData };

// ActivityHeatmap-compatible format (same as GroupHeatmapComparisonData)
export type GroupHeatmapComparisonData = components["schemas"]["StudioHeatmapData"];

/**
 * Transform API `/analytics/studio/{studioId}/groups` response
 * → `GroupProgress[]` consumed by GroupProgressChart
 */
export function transformGroupComparisonToProgress(data: GroupComparisonData[]): GroupProgress[] {
    return data.map((g) => ({
        groupId: g.groupId ?? "",
        groupName: g.groupName ?? "",
        groupColor: (g as any).groupColor ?? undefined,
        completedTasks: g.completedTasks ?? 0,
        totalTasks: g.totalTasks ?? 0,
        progress: Math.round((g.completionRate ?? 0) * 100),
        isOverdue: (g.overdueTasksCount ?? 0) > 0,
        lastActivity: g.lastActivityDateTime ? formatRelativeTime(g.lastActivityDateTime) : "N/A",
        overdueCount: g.overdueTasksCount ?? 0
    }));
}

/**
 * Transform API `/analytics/studio/{studioId}/heatmap` response
 * → `GroupHeatmapComparisonData[]` consumed by ActivityHeatmap
 */
export function transformStudioHeatmapToComparison(
    groupHeatmap: StudioHeatmapData[] | null | undefined
): GroupHeatmapComparisonData[] {
    if (!groupHeatmap) return [];
    return groupHeatmap.map((item) => ({
        date: item.date,
        groups: (item.groups ?? []).map((g) => ({
            groupId: g.groupId,
            groupName: g.groupName,
            activityCount: g.activityCount,
            // StudioGroupActivityItem doesn't have commentsCount / messagesCount
            commentsCount: undefined,
            messagesCount: undefined,
            tasksCompleted: g.tasksCompleted
        }))
    }));
}

export interface StudioMember {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    groupName: string;
    role: "owner" | "admin" | "member";
    joinedAt: string;
}

export interface GroupProgress {
    groupId: string;
    groupName: string;
    groupColor?: string; // hex color, e.g. "#f97316"
    completedTasks: number;
    totalTasks: number;
    progress: number; // percentage
    isOverdue: boolean;
    lastActivity: string;
    overdueCount: number;
}

export interface GroupPerformance {
    groupId: string;
    groupName: string;
    completedTasks: number;
    discussionMessages: number;
    collaboration: number; // collaboration score
    averageScore: number;
}

// Mock members data
export const mockStudioMembers: StudioMember[] = [
    {
        id: "1",
        name: "Nguyễn Văn A",
        email: "nguyenvana@example.com",
        groupName: "Group A",
        role: "owner",
        joinedAt: "2024-01-15T10:00:00Z"
    },
    {
        id: "2",
        name: "Trần Thị B",
        email: "tranthib@example.com",
        groupName: "Group A",
        role: "member",
        joinedAt: "2024-01-20T14:30:00Z"
    },
    {
        id: "3",
        name: "Lê Văn C",
        email: "levanc@example.com",
        groupName: "Group B",
        role: "admin",
        joinedAt: "2024-02-01T09:00:00Z"
    },
    {
        id: "4",
        name: "Phạm Thị D",
        email: "phamthid@example.com",
        groupName: "Group B",
        role: "member",
        joinedAt: "2024-02-05T11:15:00Z"
    },
    {
        id: "5",
        name: "Hoàng Văn E",
        email: "hoangvane@example.com",
        groupName: "Group C",
        role: "member",
        joinedAt: "2024-02-10T16:00:00Z"
    }
];

// Mock group progress data
export const mockGroupProgress: GroupProgress[] = [
    {
        groupId: "1",
        groupName: "Group A",
        completedTasks: 8,
        totalTasks: 10,
        progress: 80,
        isOverdue: false,
        lastActivity: "2h ago",
        overdueCount: 1
    },
    {
        groupId: "2",
        groupName: "Group B",
        completedTasks: 5,
        totalTasks: 12,
        progress: 41.67,
        isOverdue: true,
        lastActivity: "1d ago",
        overdueCount: 3
    },
    {
        groupId: "3",
        groupName: "Group C",
        completedTasks: 10,
        totalTasks: 10,
        progress: 100,
        isOverdue: false,
        lastActivity: "30m ago",
        overdueCount: 0
    },
    {
        groupId: "4",
        groupName: "Group D",
        completedTasks: 3,
        totalTasks: 8,
        progress: 37.5,
        isOverdue: true,
        lastActivity: "3d ago",
        overdueCount: 2
    }
];

// Mock group performance data for radar chart
export const mockGroupPerformance: GroupPerformance[] = [
    {
        groupId: "1",
        groupName: "Group A",
        completedTasks: 85,
        discussionMessages: 70,
        collaboration: 90,
        averageScore: 81.67
    },
    {
        groupId: "2",
        groupName: "Group B",
        completedTasks: 50,
        discussionMessages: 40,
        collaboration: 60,
        averageScore: 50
    },
    {
        groupId: "3",
        groupName: "Group C",
        completedTasks: 95,
        discussionMessages: 85,
        collaboration: 80,
        averageScore: 86.67
    },
    {
        groupId: "4",
        groupName: "Group D",
        completedTasks: 35,
        discussionMessages: 55,
        collaboration: 45,
        averageScore: 45
    }
];

// Calculate if a group is behind schedule based on studio date range
export function calculateScheduleStatus(
    groupProgress: GroupProgress,
    studioStartDate: string,
    studioDueDate: string
): {
    status: "on-track" | "at-risk" | "behind";
    message: string;
} {
    const now = new Date();
    const start = new Date(studioStartDate);
    const due = new Date(studioDueDate);

    const totalDuration = due.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();

    // Only calculate if studio hasn't started yet or is in progress
    if (elapsed <= 0) {
        return { status: "on-track", message: "Chưa bắt đầu" };
    }

    // Expected progress = elapsed / totalDuration * 100 (cap at 100% when overdue)
    // If actual progress < expected, group is behind
    const expectedProgress = Math.min((elapsed / totalDuration) * 100, 100);
    const actualProgress = groupProgress.progress;

    // Allow some buffer: -10% grace for "on-track"
    const difference = actualProgress - expectedProgress;

    if (difference >= -10) {
        return { status: "on-track", message: "Đúng tiến độ" };
    }
    if (difference >= -25) {
        return { status: "at-risk", message: "Cần chú ý" };
    }
    return { status: "behind", message: "Chậm tiến độ" };
}

// Get studio date range (mock)
export const mockStudioDateRange = {
    startDate: "2024-01-01",
    dueDate: "2024-03-31"
};
