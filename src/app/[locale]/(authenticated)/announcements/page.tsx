import { Suspense } from "react";
import { mapMergedAnnouncement } from "@/api/notifications";
import { serverFetchApi } from "@/api/server-client";
import type { components } from "@/api/types";
import ErrorDisplay from "@/components/common/ErrorDisplay";
import AnnouncementsClient from "@/components/features/announcements/AnnouncementsClient";

type AnnouncementResponse = components["schemas"]["AnnouncementResponse"];
type UserAnnouncementResponse = components["schemas"]["UserAnnouncementResponse"];

export default async function AnnouncementsPage() {
    const [announcementsResponse, userAnnouncementsResponse] = await Promise.all([
        serverFetchApi.GET<AnnouncementResponse[]>("/announcements"),
        serverFetchApi.GET<UserAnnouncementResponse[]>("/announcements/user")
    ]);

    if (announcementsResponse.status === "error" || !announcementsResponse.data) {
        console.error("[Announcements Page] Failed to load announcements:", announcementsResponse);
        return <ErrorDisplay message="Không thể tải thông báo" />;
    }

    const userAnnouncementMap = new Map<string, UserAnnouncementResponse>();
    for (const ua of userAnnouncementsResponse.data ?? []) {
        if (ua.announcementId) {
            userAnnouncementMap.set(ua.announcementId, ua);
        }
    }

    const initialAnnouncements = announcementsResponse.data
        .filter((a) => a.isActive !== false)
        .map((a) => {
            const ua = a.announcementId ? userAnnouncementMap.get(a.announcementId) : undefined;
            return mapMergedAnnouncement(a, ua);
        });

    return (
        <Suspense>
            <AnnouncementsClient initialAnnouncements={initialAnnouncements} />
        </Suspense>
    );
}
