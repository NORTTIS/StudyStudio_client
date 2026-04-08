export const ANNOUNCEMENT_DELETED_EVENT = "study-studio:announcement-deleted";

export type AnnouncementDeletedDetail = {
    announcementId?: string;
    userAnnouncementId?: string;
};

export function dispatchAnnouncementDeleted(detail: AnnouncementDeletedDetail) {
    if (typeof window === "undefined") return;

    window.dispatchEvent(new CustomEvent<AnnouncementDeletedDetail>(ANNOUNCEMENT_DELETED_EVENT, { detail }));
}

