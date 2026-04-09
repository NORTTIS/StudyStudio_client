import type { components, paths } from "@/api/types";
import { getUserData } from "@/api/auth";
import { sanitizeErrorMessage } from "@/utils/error-message";
import type { GroupCardDto, GroupsPageData } from "./types";

type GetGroupsResponse =
    | paths["/api/group"]["get"]["responses"][200]["content"]["application/json"]
    | paths["/api/group"]["get"]["responses"][200]["content"]["text/json"]
    | paths["/api/group"]["get"]["responses"][200]["content"]["text/plain"];

type GroupListResponse = NonNullable<GetGroupsResponse["data"]>;
type GroupSections = NonNullable<GroupListResponse["sections"]>;
type SubscriptionInfo = NonNullable<GroupListResponse["subscription"]>;

type RequestDocumentUploadRequest = components["schemas"]["RequestDocumentUploadRequest"];
type DocumentItem = components["schemas"]["DocumentItem"];
type AIQuestionRequest = components["schemas"]["GroupAIRequest"];
type AIAnswerResponse = components["schemas"]["AIResponse"];

type RequestDocumentUploadResponseApi =
    | paths["/api/documents/request-upload"]["post"]["responses"][200]["content"]["application/json"]
    | paths["/api/documents/request-upload"]["post"]["responses"][200]["content"]["text/json"]
    | paths["/api/documents/request-upload"]["post"]["responses"][200]["content"]["text/plain"];

type GroupDocumentsResponseApi =
    | paths["/api/documents/group/{groupId}"]["get"]["responses"][200]["content"]["application/json"]
    | paths["/api/documents/group/{groupId}"]["get"]["responses"][200]["content"]["text/json"]
    | paths["/api/documents/group/{groupId}"]["get"]["responses"][200]["content"]["text/plain"];

type DocumentDownloadUrlResponseApi =
    | paths["/api/documents/{attachmentId}/download"]["get"]["responses"][200]["content"]["application/json"]
    | paths["/api/documents/{attachmentId}/download"]["get"]["responses"][200]["content"]["text/json"]
    | paths["/api/documents/{attachmentId}/download"]["get"]["responses"][200]["content"]["text/plain"];

type AIAskResponseApi =
    | paths["/api/ai/group/ask"]["post"]["responses"][200]["content"]["application/json"]
    | paths["/api/ai/group/ask"]["post"]["responses"][200]["content"]["text/json"]
    | paths["/api/ai/group/ask"]["post"]["responses"][200]["content"]["text/plain"];

type LeaveGroupResponseApi =
    | paths["/api/group/member/{groupId}/leave"]["delete"]["responses"][200]["content"]["application/json"]
    | paths["/api/group/member/{groupId}/leave"]["delete"]["responses"][200]["content"]["text/json"]
    | paths["/api/group/member/{groupId}/leave"]["delete"]["responses"][200]["content"]["text/plain"];

type AIAskStreamRequest = NonNullable<
    paths["/api/ai/group/ask/stream"]["post"]["requestBody"]
>["content"]["application/json"];

type PendingGroupCard = GroupCardDto & {
    isApproved?: boolean;
    membershipStatus?: string;
    status?: string;
    joinStatus?: string;
};

const pendingJoinStorageKey = "my-studio:pending-group-joins";
const canceledPendingJoinStorageKey = "my-studio:canceled-pending-joins";

// Event emitter for pending join changes
export const pendingJoinEvents = new EventTarget();
export const PENDING_JOIN_CHANGED_EVENT = "pending-join-changed";

export function readPendingJoinGroups(): PendingGroupCard[] {
    if (typeof window === "undefined") return [];

    try {
        const raw = window.localStorage.getItem(pendingJoinStorageKey);
        if (!raw) return [];

        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];

        return parsed.filter((item): item is PendingGroupCard => {
            if (!item || typeof item !== "object") return false;
            const candidate = item as PendingGroupCard & { id?: unknown };
            return typeof candidate.id === "string" && candidate.id.trim().length > 0;
        });
    } catch {
        return [];
    }
}

function writePendingJoinGroups(groups: PendingGroupCard[]) {
    if (typeof window === "undefined") return;

    try {
        window.localStorage.setItem(pendingJoinStorageKey, JSON.stringify(groups));
    } catch {
        // Ignore storage failures and keep the UI working.
    }
}

type CanceledPendingJoinMarker = {
    userId?: string;
};

type CanceledPendingJoinMap = Record<string, CanceledPendingJoinMarker>;

function readCanceledPendingJoinMap(): CanceledPendingJoinMap {
    if (typeof window === "undefined") return {};

    try {
        const raw = window.localStorage.getItem(canceledPendingJoinStorageKey);
        if (!raw) return {};

        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

        const entries: Array<readonly [string, CanceledPendingJoinMarker]> = [];

        for (const [groupId, value] of Object.entries(parsed)) {
            if (!groupId.trim()) continue;

            if (typeof value === "string") {
                const userId = value.trim();
                if (userId) {
                    entries.push([groupId, { userId }] as const);
                }
                continue;
            }

            if (!value || typeof value !== "object" || Array.isArray(value)) continue;

            const marker = value as CanceledPendingJoinMarker;
            const userId = String(marker.userId ?? "").trim();
            if (!userId) continue;

            entries.push([groupId, { userId }] as const);
        }

        return Object.fromEntries(entries);
    } catch {
        return {};
    }
}

function writeCanceledPendingJoinMap(map: CanceledPendingJoinMap) {
    if (typeof window === "undefined") return;

    try {
        window.localStorage.setItem(canceledPendingJoinStorageKey, JSON.stringify(map));
    } catch {
        // Ignore storage failures and keep the UI working.
    }
}

function getPendingGroupId(group: PendingGroupCard | Record<string, unknown>) {
    const candidate = group as { id?: unknown; groupId?: unknown; group_id?: unknown };
    return String(candidate.id ?? candidate.groupId ?? candidate.group_id ?? "").trim();
}

function normalizePendingJoinGroup(group: Record<string, unknown>): PendingGroupCard | null {
    const id = getPendingGroupId(group);
    if (!id) return null;

    const name = String(group.name ?? group.groupName ?? group.title ?? group.alias ?? id).trim();

    return {
        ...(group as PendingGroupCard),
        id,
        name,
        isApproved: false,
        membershipStatus: "pending",
        status: "pending"
    };
}

function getStorageValue(key: string) {
    if (typeof window === "undefined") return "";
    return String(window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key) ?? "").trim();
}

function getUserIdFromToken(token: string) {
    try {
        const payloadPart = token.split(".")[1];
        if (!payloadPart) return "";

        const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

        const json = decodeURIComponent(
            atob(padded)
                .split("")
                .map((char) => "%" + ("00" + char.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );

        const payload = JSON.parse(json) as Record<string, unknown>;
        const idFromToken = payload.userId || payload.accountId || payload.id || payload.uid || payload.sub;
        return idFromToken ? String(idFromToken).trim() : "";
    } catch {
        return "";
    }
}

export function getCurrentUserId() {
    if (typeof window === "undefined") return "";

    const userData = getUserData();
    const userDataId = String(userData?.id ?? "").trim();
    if (userDataId) return userDataId;

    // Fallback for cases where token exists but `setAuthTokens` has not populated userData yet.
    const userDataRaw = getStorageValue("userData");
    if (userDataRaw) {
        try {
            const parsed = JSON.parse(userDataRaw) as Record<string, unknown>;
            const parsedId = String(parsed.id ?? parsed.userId ?? parsed.accountId ?? parsed.uid ?? "").trim();
            if (parsedId) return parsedId;
        } catch {
            // Ignore malformed data and continue with token/id-key fallbacks.
        }
    }

    const keys = ["userId", "accountId", "id", "uid", "user_id", "account_id"];
    for (const key of keys) {
        const value = getStorageValue(key);
        if (value) return value;
    }

    const tokenKeys = ["accessToken", "access_token", "token", "jwt", "ss_access_token"];
    for (const key of tokenKeys) {
        const token = getStorageValue(key);
        if (!token) continue;
        const tokenUserId = getUserIdFromToken(token);
        if (tokenUserId) return tokenUserId;
    }

    return "";
}

export function markPendingJoinRequestCanceled(groupId: string, marker?: CanceledPendingJoinMarker) {
    const normalizedGroupId = String(groupId ?? "").trim();
    const userId = String(marker?.userId ?? getCurrentUserId()).trim();
    if (!normalizedGroupId || !userId) return;

    const next = {
        ...readCanceledPendingJoinMap(),
        [normalizedGroupId]: { userId }
    };

    writeCanceledPendingJoinMap(next);
    pendingJoinEvents.dispatchEvent(
        new CustomEvent(PENDING_JOIN_CHANGED_EVENT, {
            detail: { groupId: normalizedGroupId, marker: next[normalizedGroupId] }
        })
    );
}

export function clearPendingJoinRequestCanceled(groupId: string) {
    const normalizedGroupId = String(groupId ?? "").trim();
    if (!normalizedGroupId) return;

    const current = readCanceledPendingJoinMap();
    if (!(normalizedGroupId in current)) return;

    delete current[normalizedGroupId];
    writeCanceledPendingJoinMap(current);
}

export function isPendingJoinRequestCanceled(groupId: string, userId: string) {
    const normalizedGroupId = String(groupId ?? "").trim();
    const normalizedUserId = String(userId ?? "").trim();
    if (!normalizedGroupId || !normalizedUserId) return false;

    return readCanceledPendingJoinMap()[normalizedGroupId]?.userId === normalizedUserId;
}

export function isPendingJoinRequestCanceledByMember(
    groupId: string,
    member: { userId?: string | null }
) {
    const normalizedGroupId = String(groupId ?? "").trim();
    if (!normalizedGroupId) return false;

    const marker = readCanceledPendingJoinMap()[normalizedGroupId];
    if (!marker) return false;

    const memberUserId = String(member.userId ?? "").trim();
    return !!(marker.userId && memberUserId && marker.userId === memberUserId);
}

function toBooleanLike(value: unknown): boolean | null {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") {
        if (value === 1) return true;
        if (value === 0) return false;
    }
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true" || normalized === "1") return true;
        if (normalized === "false" || normalized === "0") return false;
    }
    return null;
}

function getApprovedFlag(group: Record<string, unknown>) {
    return toBooleanLike(
        group.isApproved ?? group.approved ?? group.is_approved ?? group.is_approve
    );
}

function getIsMemberFlag(group: Record<string, unknown>) {
    return toBooleanLike(group.isMember ?? group.member ?? group.is_member);
}

function getMembershipStatus(group: Record<string, unknown>) {
    return String(group.membershipStatus ?? group.status ?? group.joinStatus ?? "")
        .trim()
        .toLowerCase();
}

function isPendingMembership(group: Record<string, unknown>) {
    const isMember = getIsMemberFlag(group);
    if (isMember === true) return false;

    const approved = getApprovedFlag(group);
    if (approved === false) return true;
    if (approved === true) return false;

    const status = getMembershipStatus(group);
    if (!status) return false;

    return ["pending", "waiting", "requested", "request", "awaiting", "invited"].some((value) => status.includes(value));
}

function isApprovedMembership(group: Record<string, unknown>) {
    const isMember = getIsMemberFlag(group);
    if (isMember === true) return true;
    if (isMember === false) return false;

    const approved = getApprovedFlag(group);
    if (approved === true) return true;
    if (approved === false) return false;

    const status = getMembershipStatus(group);
    if (!status) return false;

    return ["approved", "joined", "active", "member"].some((value) => status.includes(value));
}

export function savePendingJoinGroup(group: Record<string, unknown>) {
    const normalized = normalizePendingJoinGroup(group);
    if (!normalized) return null;

    const current = readPendingJoinGroups();
    const groupId = normalized.id ?? "";
    clearPendingJoinRequestCanceled(groupId);
    const next = [normalized, ...current.filter((item) => getPendingGroupId(item) !== groupId)];
    writePendingJoinGroups(next);
    return normalized;
}

export function removePendingJoinGroup(groupId: string) {
    const normalizedId = String(groupId ?? "").trim();
    if (!normalizedId || typeof window === "undefined") return;

    const next = readPendingJoinGroups().filter((item) => getPendingGroupId(item) !== normalizedId);
    writePendingJoinGroups(next);
    
    // Notify about the change
    pendingJoinEvents.dispatchEvent(new CustomEvent(PENDING_JOIN_CHANGED_EVENT, { detail: { groupId: normalizedId } }));
}

function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("accessToken") || localStorage.getItem("token") || localStorage.getItem("jwt") || null;
}

function getBaseUrl() {
    return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";
}

function toInitials(firstName?: string | null, lastName?: string | null) {
    const f = (firstName || "").trim();
    const l = (lastName || "").trim();
    const a = f ? f[0].toUpperCase() : "";
    const b = l ? l[0].toUpperCase() : "";
    const res = `${a}${b}`.trim();
    return res || "U";
}

export function mapRole(role?: string | null): "owner" | "moderator" | "member" | "commenter" | "viewer" {
    const r = (role || "").toLowerCase().trim();
    if (r.includes("owner")) return "owner";
    if (r.includes("moderator")) return "moderator";
    if (r.includes("member")) return "member";
    if (r.includes("commenter")) return "commenter";
    if (r.includes("viewer")) return "viewer";
    if (r === "admin") return "owner";
    return "member";
}

export async function fetchGroupsPageData(): Promise<GroupsPageData> {
    const baseUrl = getBaseUrl();
    const token = getToken();

    const res = await fetch(`${baseUrl}/group`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        cache: "no-store"
    });

    if (!res.ok) {
        throw new Error(
            res.status === 401 ? "Unauthorized: thiếu token hoặc token hết hạn" : `Request failed: ${res.status}`
        );
    }

    const json = (await res.json()) as GetGroupsResponse;

    const data = json.data;
    const subscription = data?.subscription as SubscriptionInfo | undefined;
    const sections = data?.sections as GroupSections | undefined;

    const dedupeById = (groups: GroupCardDto[]) => {
        const seen = new Set<string>();
        return groups.filter((group) => {
            const groupId = getPendingGroupId(group as Record<string, unknown>);
            if (!groupId || seen.has(groupId)) return false;
            seen.add(groupId);
            return true;
        });
    };

    const hasStudio = (group: GroupCardDto) => {
        const candidate = group as unknown as {
            studio?: { id?: string | null } | null;
            studioId?: string | null;
        };

        const studioId = String(candidate.studio?.id ?? candidate.studioId ?? "").trim();
        return !!studioId;
    };

    const favorites = dedupeById(((sections?.favorites || []) as GroupCardDto[]).filter(Boolean));
    const managedBase = dedupeById(((sections?.studioGroups || []) as GroupCardDto[]).filter(Boolean));
    const independentBase = dedupeById(((sections?.independentGroups || []) as GroupCardDto[]).filter(Boolean));
    const archived = dedupeById(((sections?.archivedGroups || []) as GroupCardDto[]).filter(Boolean));

    const isArchivedGroup = (group: GroupCardDto) => {
        const candidate = group as Record<string, unknown>;
        return toBooleanLike(candidate.isArchived) === true;
    };

    const inactive = dedupeById([
        ...archived,
        ...managedBase.filter(isArchivedGroup),
        ...independentBase.filter(isArchivedGroup)
    ]);

    // Keep active groups in their original sections and show paused groups in a dedicated section.
    const managed = dedupeById(managedBase.filter((group) => !isArchivedGroup(group)));
    const independent = dedupeById(independentBase.filter((group) => !isArchivedGroup(group)));
    const pendingJoined = readPendingJoinGroups();
    const activeGroups = [...favorites, ...managed, ...independent];
    const allGroups = [...activeGroups, ...inactive];
    const groupsById = new Map(
        allGroups
            .map((group) => [getPendingGroupId(group as Record<string, unknown>), group] as const)
            .filter(([groupId]) => !!groupId)
    );

    // Backend is source of truth: clear stale local pending when API already knows the group
    // and no longer marks it as waiting approval.
    for (const localPending of pendingJoined) {
        const groupId = getPendingGroupId(localPending);
        if (!groupId) continue;
        const apiGroup = groupsById.get(groupId);
        if (!apiGroup) continue;
        if (isApprovedMembership(apiGroup as Record<string, unknown>)) {
            removePendingJoinGroup(groupId);
        }
    }

    const pendingFromGroups = activeGroups
        .filter((group) => isPendingMembership(group as Record<string, unknown>))
        .map((group) => {
            const normalized = normalizePendingJoinGroup(group as Record<string, unknown>);
            return normalized ?? null;
        })
        .filter((group): group is PendingGroupCard => !!group);

    const pendingFallbackFromLocal = pendingJoined.filter((localPending) => {
        const groupId = getPendingGroupId(localPending);
        if (!groupId) return false;

        const apiGroup = groupsById.get(groupId);
        if (!apiGroup) {
            // Backend no longer returns this group for current user (e.g. rejected request),
            // so drop stale local pending entry.
            removePendingJoinGroup(groupId);
            return false;
        }

        const apiRecord = apiGroup as Record<string, unknown>;
        if (isApprovedMembership(apiRecord)) return false;
        if (isPendingMembership(apiRecord)) return false;

        // BE did not provide explicit approval state yet, keep local pending fallback.
        return true;
    });

    const blockedPendingIds = new Set([
        ...pendingFromGroups.map((group) => getPendingGroupId(group)),
        ...pendingFallbackFromLocal.map((group) => getPendingGroupId(group))
    ]);

    const pending = [
        ...pendingFromGroups,
        ...pendingFallbackFromLocal
    ].filter((group, index, array) => {
        const groupId = getPendingGroupId(group);
        if (!groupId) return false;
        return array.findIndex((item) => getPendingGroupId(item) === groupId) === index;
    });

    const joined = activeGroups.filter((g) => {
        const role = mapRole(g.role);
        const groupId = getPendingGroupId(g as Record<string, unknown>);
        const membershipApproved = isApprovedMembership(g as Record<string, unknown>);
        return role !== "owner" && membershipApproved && !blockedPendingIds.has(groupId);
    });

    return {
        usage: {
            current: subscription?.groupCreated ?? 0,
            max: subscription?.groupLimit ?? 0
        },
        favorites,
        managed,
        independent,
        inactive,
        pending,
        joined
    };
}

async function apiFetch(path: string, method: "POST" | "DELETE", body: unknown) {
    const baseUrl = getBaseUrl();
    const token = getToken();

    const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body),
        cache: "no-store"
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
            res.status === 401
                ? "Unauthorized: thiếu token hoặc token hết hạn"
                : text || `Request failed: ${res.status}`
        );
    }

    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return res.json();
    return null;
}

export async function addFavourite(groupId: string) {
    return apiFetch("/favourite/add", "POST", { groupId });
}

export async function removeFavourite(groupId: string) {
    return apiFetch("/favourite/remove", "DELETE", { groupId });
}

export async function leaveGroup(groupId: string) {
    const baseUrl = getBaseUrl();
    const token = getToken();

    // Best-effort cleanup: leaving a group should not keep stale favourite state
    // if the user joins the same group again later.
    try {
        await removeFavourite(groupId);
    } catch {
        // Ignore remove-favourite failure so the leave action can still proceed.
    }

    const res = await fetch(`${baseUrl}/group/member/${encodeURIComponent(groupId)}/leave`, {
        method: "DELETE",
        headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        cache: "no-store"
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
            res.status === 401
                ? "Unauthorized: thiếu token hoặc token hết hạn"
                : text || `Request failed: ${res.status}`
        );
    }

    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return null;

    return (await res.json()) as LeaveGroupResponseApi;
}

export async function requestDocumentUpload(payload: RequestDocumentUploadRequest) {
    const baseUrl = getBaseUrl();
    const token = getToken();

    const res = await fetch(`${baseUrl}/documents/request-upload`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload),
        cache: "no-store"
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed: ${res.status}`);
    }

    const json = (await res.json()) as RequestDocumentUploadResponseApi;
    if (!(json.data?.attachmentId && json.data?.uploadUrl)) {
        throw new Error(json.message || "Invalid upload response");
    }

    return json.data;
}

export async function completeDocumentUpload(attachmentId: string) {
    const baseUrl = getBaseUrl();
    const token = getToken();

    const res = await fetch(`${baseUrl}/documents/${attachmentId}/complete`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        cache: "no-store"
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed: ${res.status}`);
    }
}

export async function fetchGroupDocuments(groupId: string): Promise<DocumentItem[]> {
    const baseUrl = getBaseUrl();
    const token = getToken();

    const res = await fetch(`${baseUrl}/documents/group/${groupId}`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        cache: "no-store"
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed: ${res.status}`);
    }

    const json = (await res.json()) as GroupDocumentsResponseApi;
    return (json.data?.documents || []).filter((item): item is DocumentItem => !!item);
}

export async function deleteGroupDocument(attachmentId: string) {
    const baseUrl = getBaseUrl();
    const token = getToken();

    const res = await fetch(`${baseUrl}/documents/${attachmentId}`, {
        method: "DELETE",
        headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        cache: "no-store"
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed: ${res.status}`);
    }
}

export async function getDocumentDownloadUrl(attachmentId: string, expirationMinutes?: number) {
    const baseUrl = getBaseUrl();
    const token = getToken();
    const query =
        typeof expirationMinutes === "number" ? `?expirationMinutes=${encodeURIComponent(expirationMinutes)}` : "";

    const res = await fetch(`${baseUrl}/documents/${attachmentId}/download${query}`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        cache: "no-store"
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed: ${res.status}`);
    }

    const json = (await res.json()) as DocumentDownloadUrlResponseApi;
    if (!json.data?.downloadUrl) {
        throw new Error(json.message || "Missing download url");
    }

    return json.data.downloadUrl;
}

export function toOptionalNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return null;
}

function extractRemainingRequests(json: AIAskResponseApi, headers: Headers): number | null {
    const candidates: unknown[] = [
        (json as { data?: { remainingRequests?: unknown } }).data?.remainingRequests,
        (json as { data?: { requestRemaining?: unknown } }).data?.requestRemaining,
        (json as { data?: { remainingRequestCount?: unknown } }).data?.remainingRequestCount,
        (json as { remainingRequests?: unknown }).remainingRequests,
        (json as { requestRemaining?: unknown }).requestRemaining,
        headers.get("x-requests-remaining"),
        headers.get("x-request-remaining"),
        headers.get("x-ai-requests-remaining")
    ];

    for (const candidate of candidates) {
        const n = toOptionalNumber(candidate);
        if (n != null) return n;
    }

    return null;
}

function extractRemainingRequestsFromHeaders(headers: Headers): number | null {
    const candidates: unknown[] = [
        headers.get("x-requests-remaining"),
        headers.get("x-request-remaining"),
        headers.get("x-ai-requests-remaining")
    ];

    for (const candidate of candidates) {
        const n = toOptionalNumber(candidate);
        if (n != null) return n;
    }

    return null;
}

async function extractApiErrorMessage(res: Response): Promise<string> {
    const text = await res.text().catch(() => "");
    if (!text) return "Đã xảy ra lỗi";

    try {
        const parsed = JSON.parse(text) as { message?: unknown };
        if (typeof parsed.message === "string" && parsed.message.trim()) {
            return sanitizeErrorMessage(parsed.message, "Đã xảy ra lỗi");
        }
    } catch {}

    return sanitizeErrorMessage(text, "Đã xảy ra lỗi");
}

function parseSseChunk(data: string): string {
    const trimmed = data.trim();
    if (!trimmed || trimmed === "[DONE]") return "";

    try {
        const parsed = JSON.parse(trimmed) as {
            type?: string;
            content?: unknown;
            message?: unknown;
        };

        switch (parsed.type) {
            case "chunk":
                return typeof parsed.content === "string" ? parsed.content : "";
            case "metadata":
                return "";
            case "done":
                return "";
            case "error":
                throw new Error(
                    sanitizeErrorMessage(
                        typeof parsed.message === "string" ? parsed.message : "AI error",
                        "Đã xảy ra lỗi"
                    )
                );
            default:
                return "";
        }
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        return data;
    }
}

type ParsedSseBlock = {
    chunk: string;
    done: boolean;
    metadata?: {
        remainingRequests: number | null;
        dailyLimit: number | null;
    };
};

export function parseSseBlock(
    block: string,
    options?: {
        onMetadata?: (metadata: { remainingRequests: number | null; dailyLimit: number | null }) => void;
    }
): ParsedSseBlock {
    if (!block.trim()) return { chunk: "", done: false };

    const dataLines = block
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart());

    const raw = dataLines.length === 0 ? block : dataLines.join("\n");
    const trimmed = raw.trim();
    if (!trimmed) return { chunk: "", done: false };
    if (trimmed === "[DONE]") return { chunk: "", done: true };

    try {
        const parsed = JSON.parse(trimmed) as {
            type?: unknown;
            message?: unknown;
            remainingRequests?: unknown;
            dailyLimit?: unknown;
        };

        if (parsed.type === "done") return { chunk: "", done: true };
        if (parsed.type === "error") {
            throw new Error(
                sanitizeErrorMessage(
                    typeof parsed.message === "string" ? parsed.message : "AI error",
                    "Đã xảy ra lỗi"
                )
            );
        }

        // Xử lý metadata event - extract remainingRequests và dailyLimit
        if (parsed.type === "metadata") {
            const remainingRequests = toOptionalNumber(parsed.remainingRequests);
            const dailyLimit = toOptionalNumber(parsed.dailyLimit);

            if (remainingRequests !== null || dailyLimit !== null) {
                const metadata = { remainingRequests, dailyLimit };
                options?.onMetadata?.(metadata);
                return { chunk: "", done: false, metadata };
            }
        }

        // No type field — treat as raw data, not a structured SSE event
        if (parsed.type === undefined || parsed.type === null) {
            return { chunk: "", done: false };
        }

        return { chunk: parseSseChunk(raw), done: false };
    } catch (error) {
        if (error instanceof Error) throw error;
    }

    // Fallback for non-JSON content
    return { chunk: parseSseChunk(raw), done: false };
}

export type AskGroupAiResult = {
    answer: AIAnswerResponse;
    remainingRequests: number | null;
    dailyLimit: number | null;
};

export async function askGroupAi(payload: AIQuestionRequest): Promise<AskGroupAiResult> {
    const baseUrl = getBaseUrl();
    const token = getToken();

    const res = await fetch(`${baseUrl}/ai/group/ask`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload),
        cache: "no-store"
    });

    if (!res.ok) {
        throw new Error(await extractApiErrorMessage(res));
    }

    const json = (await res.json()) as AIAskResponseApi;
    if (!json.data) {
        throw new Error(json.message || "Empty AI response");
    }

    return {
        answer: json.data,
        remainingRequests: extractRemainingRequests(json, res.headers),
        dailyLimit: toOptionalNumber((json as { data?: { dailyLimit?: unknown } }).data?.dailyLimit)
    };
}

export async function askGroupAiStream(
    payload: AIAskStreamRequest,
    options?: {
        signal?: AbortSignal;
        onChunk?: (fullText: string, delta: string) => void;
        onMetadata?: (metadata: { remainingRequests: number | null; dailyLimit: number | null }) => void;
    }
): Promise<AskGroupAiResult> {
    const baseUrl = getBaseUrl();
    const token = getToken();

    const headers: Record<string, string> = {
        Accept: "text/event-stream, application/json",
        "Content-Type": "application/json"
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${baseUrl}/ai/group/ask/stream`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: options?.signal
    });

    if (!res.ok) {
        throw new Error(await extractApiErrorMessage(res));
    }

    const body = res.body;
    if (!body) {
        throw new Error("Empty AI response");
    }

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let answer = "";
    let doneByEvent = false;
    let remainingRequests: number | null = null;
    let dailyLimit: number | null = null;

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() || "";

        for (const block of blocks) {
            const parsed = parseSseBlock(block, {
                onMetadata: (metadata) => {
                    if (metadata.remainingRequests !== null) {
                        remainingRequests = metadata.remainingRequests;
                    }
                    if (metadata.dailyLimit !== null) {
                        dailyLimit = metadata.dailyLimit;
                    }
                    options?.onMetadata?.(metadata);
                }
            });
            if (parsed.chunk) {
                answer += parsed.chunk;
                options?.onChunk?.(answer, parsed.chunk);
            }
            if (parsed.done) {
                doneByEvent = true;
                break;
            }
        }

        if (doneByEvent) break;
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
        const parsed = parseSseBlock(buffer, {
            onMetadata: (metadata) => {
                if (metadata.remainingRequests !== null) {
                    remainingRequests = metadata.remainingRequests;
                }
                if (metadata.dailyLimit !== null) {
                    dailyLimit = metadata.dailyLimit;
                }
                options?.onMetadata?.(metadata);
            }
        });
        if (parsed.chunk) {
            answer += parsed.chunk;
            options?.onChunk?.(answer, parsed.chunk);
        }
    }

    const finalAnswer = answer.trim();
    if (!finalAnswer) {
        throw new Error("Empty AI response");
    }

    return {
        answer: {
            answer: finalAnswer
        },
        remainingRequests: remainingRequests ?? extractRemainingRequestsFromHeaders(res.headers),
        dailyLimit
    };
}
