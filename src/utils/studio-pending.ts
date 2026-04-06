export interface PendingStudioJoinRequest {
    studioId: string;
    studioName?: string;
    requestedAt: string;
}

const STORAGE_KEY = "studio:pending-join-requests";
const REJECTED_STORAGE_KEY = "studio:rejected-join-requests";
const REJECTED_REQUEST_TTL_MS = 1000 * 60 * 60 * 24 * 14;

export interface RejectedStudioJoinRequest {
    studioId: string;
    userId?: string;
    email?: string;
    rejectedAt: string;
}

function canUseStorage() {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function parseIsoTimeMs(value?: string | null) {
    const raw = String(value ?? "").trim();
    if (!raw) return null;

    const parsed = Date.parse(raw);
    if (Number.isNaN(parsed)) return null;

    return parsed;
}

function pruneRejectedStudioJoinRequests(items: RejectedStudioJoinRequest[]) {
    const now = Date.now();

    return items.filter((item) => {
        const rejectedAtMs = parseIsoTimeMs(item.rejectedAt);
        if (rejectedAtMs === null) return false;

        return now - rejectedAtMs <= REJECTED_REQUEST_TTL_MS;
    });
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

function getRejectedStudioJoinRequests(): RejectedStudioJoinRequest[] {
    if (!canUseStorage()) return [];

    try {
        const raw = window.localStorage.getItem(REJECTED_STORAGE_KEY);
        if (!raw) return [];

        const parsed = JSON.parse(raw) as RejectedStudioJoinRequest[];
        if (!Array.isArray(parsed)) return [];

        const normalized = pruneRejectedStudioJoinRequests(parsed
            .map((item) => ({
                studioId: String(item?.studioId ?? "").trim(),
                userId: String(item?.userId ?? "").trim() || undefined,
                email: String(item?.email ?? "").trim().toLowerCase() || undefined,
                rejectedAt: String(item?.rejectedAt ?? "").trim() || new Date().toISOString()
            }))
            .filter((item) => !!item.studioId && (!!item.userId || !!item.email)));

        if (normalized.length !== parsed.length) {
            setRejectedStudioJoinRequests(normalized);
        }

        return normalized;
    } catch {
        return [];
    }
}

function setRejectedStudioJoinRequests(items: RejectedStudioJoinRequest[]) {
    if (!canUseStorage()) return;

    try {
        window.localStorage.setItem(REJECTED_STORAGE_KEY, JSON.stringify(items));
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

export function writeRejectedStudioJoinRequest(studioId: string, userId?: string, email?: string) {
    const normalizedStudioId = String(studioId ?? "").trim();
    const normalizedUserId = String(userId ?? "").trim();
    const normalizedEmail = String(email ?? "").trim().toLowerCase();

    if (!normalizedStudioId || (!normalizedUserId && !normalizedEmail)) return;

    const existing = getRejectedStudioJoinRequests();
    const filtered = existing.filter((item) => {
        if (item.studioId !== normalizedStudioId) return true;
        if (normalizedUserId && item.userId === normalizedUserId) return false;
        if (normalizedEmail && item.email === normalizedEmail) return false;
        return true;
    });

    filtered.push({
        studioId: normalizedStudioId,
        userId: normalizedUserId || undefined,
        email: normalizedEmail || undefined,
        rejectedAt: new Date().toISOString()
    });

    setRejectedStudioJoinRequests(filtered);
}

export function markRejectedStudioJoinRequest(studioId: string, userId?: string, email?: string) {
    writeRejectedStudioJoinRequest(studioId, userId, email);
}

export function consumeRejectedStudioJoinRequest(studioId: string, userId?: string, email?: string, requestedAt?: string) {
    const normalizedStudioId = String(studioId ?? "").trim();
    const normalizedUserId = String(userId ?? "").trim();
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const requestTimeMs = parseIsoTimeMs(requestedAt);

    if (!normalizedStudioId || (!normalizedUserId && !normalizedEmail)) return false;

    const existing = getRejectedStudioJoinRequests();
    let consumed = false;

    const filtered = existing.filter((item) => {
        if (item.studioId !== normalizedStudioId) return true;

        const matchesUserId = normalizedUserId && item.userId === normalizedUserId;
        const matchesEmail = normalizedEmail && item.email === normalizedEmail;
        const rejectedAtMs = parseIsoTimeMs(item.rejectedAt);
        const isCurrentRequestOrNewer = requestTimeMs === null || rejectedAtMs === null || rejectedAtMs >= requestTimeMs;

        if ((matchesUserId || matchesEmail) && isCurrentRequestOrNewer) {
            consumed = true;
            return false;
        }

        return true;
    });

    if (consumed) {
        setRejectedStudioJoinRequests(filtered);
    }

    return consumed;
}

export function isPendingStudioJoinRequest(studioId: string) {
    const normalizedStudioId = String(studioId ?? "").trim();
    if (!normalizedStudioId) return false;

    return getPendingStudioJoinRequests().some((item) => item.studioId === normalizedStudioId);
}
