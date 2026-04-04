export interface PendingStudioJoinRequest {
    studioId: string;
    studioName?: string;
    requestedAt: string;
}

const STORAGE_KEY = "studio:pending-join-requests";

function canUseStorage() {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getPendingStudioJoinRequests(): PendingStudioJoinRequest[] {
    if (!canUseStorage()) return [];

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];

        const parsed = JSON.parse(raw) as PendingStudioJoinRequest[];
        if (!Array.isArray(parsed)) return [];

        return parsed
            .map((item) => ({
                studioId: String(item?.studioId ?? "").trim(),
                studioName: String(item?.studioName ?? "").trim() || undefined,
                requestedAt: String(item?.requestedAt ?? "").trim() || new Date().toISOString()
            }))
            .filter((item) => !!item.studioId);
    } catch {
        return [];
    }
}

function setPendingStudioJoinRequests(items: PendingStudioJoinRequest[]) {
    if (!canUseStorage()) return;

    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
        // Ignore storage write failures.
    }
}

export function upsertPendingStudioJoinRequest(studioId: string, studioName?: string) {
    const normalizedStudioId = String(studioId ?? "").trim();
    if (!normalizedStudioId) return;

    const existing = getPendingStudioJoinRequests();
    const withoutSame = existing.filter((item) => item.studioId !== normalizedStudioId);

    withoutSame.push({
        studioId: normalizedStudioId,
        studioName: String(studioName ?? "").trim() || undefined,
        requestedAt: new Date().toISOString()
    });

    setPendingStudioJoinRequests(withoutSame);
}

export function removePendingStudioJoinRequest(studioId: string) {
    const normalizedStudioId = String(studioId ?? "").trim();
    if (!normalizedStudioId) return;

    const filtered = getPendingStudioJoinRequests().filter((item) => item.studioId !== normalizedStudioId);
    setPendingStudioJoinRequests(filtered);
}

export function isPendingStudioJoinRequest(studioId: string) {
    const normalizedStudioId = String(studioId ?? "").trim();
    if (!normalizedStudioId) return false;

    return getPendingStudioJoinRequests().some((item) => item.studioId === normalizedStudioId);
}
