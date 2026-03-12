export interface Notification {
    id: string;
    title: string;
    description: string;
    type: "system" | "warning" | "info" | "success";
    date: string;
    read: boolean;
    link?: string;
}

/**
 * Mock notifications for now since we removed user announcements
 */
export async function fetchNotifications(_locale = "vi"): Promise<Notification[]> {
    // Return empty array since we removed user announcements
    return [];
}

/**
 * Mock function - no longer functional since we removed user announcements
 */
export async function markNotificationAsRead(_notificationId: string, _locale = "vi"): Promise<void> {
    // No-op since we removed user announcements
    return;
}

/**
 * Mock function - no longer functional since we removed user announcements
 */
export async function markAllNotificationsAsRead(_locale = "vi"): Promise<void> {
    // No-op since we removed user announcements
    return;
}
