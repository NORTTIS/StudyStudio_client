/**
 * Mock data and types for Studio Analytics
 * This will be replaced with actual API calls when available
 */


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
