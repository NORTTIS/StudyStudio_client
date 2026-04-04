/**
 * Studios API
 * Handles studio/workspace operations
 */

import { apiDownload, apiFetch } from "./api-client";
import { getAccessToken, refreshAccessToken } from "./auth";
import type { components } from "./types";

const STUDIO_NAME_MAX_LENGTH = 30;
const STUDIO_DESCRIPTION_MAX_LENGTH = 200;

export type StudioMemberResponse = components["schemas"]["StudioMemberResponse"];
export type StudioPendingMemberDto = components["schemas"]["StudioPendingMemberDto"];
export type StudioPendingMemberListResponse = components["schemas"]["StudioPendingMemberListResponse"];
export type ApproveMemberResponse = components["schemas"]["ApproveMemberResponse"];
export type GroupInfoItem = components["schemas"]["GroupInfoItem"];
export type LeaveStudioResponse = components["schemas"]["LeaveStudioResponse"];
export type RemoveStudioMemberRequest = components["schemas"]["RemoveStudioMemberRequest"];
export type RemoveStudioMemberResponse = components["schemas"]["RemoveStudioMemberResponse"];
export type ToggleIsOpenRequest = components["schemas"]["ToggleIsOpenRequest"];
export type ToggleIsOpenResponse = components["schemas"]["ToggleIsOpenResponse"];
export type ToggleArchiveRequest = components["schemas"]["ToggleArchiveRequest"];
export type ArchiveStudioResponse = components["schemas"]["ArchiveStudioResponse"];
export type StudioGroupListResponse = components["schemas"]["StudioGroupListResponse"];
export type StudioGroupListResponseApiResponse = components["schemas"]["StudioGroupListResponseApiResponse"];

// Subscription info from /studio API response
export type StudioListSubscription = {
    studioCreated: number;
    studioLimit: number;
};

// Full response from /studio API
export type StudioListResponse = {
    studios: StudioUI[];
    subscription: StudioListSubscription;
};

export type Studio = {
    studioId: string;
    studioName: string;
    description: string;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
    groupCount: number;
    memberCount: number;
    completionProgress?: number; 
    studioRole?: 0 | 1; // 0 = Owner, 1 = Member
    startDate?: string | null;
    endDate?: string | null;
    avatarUrl?: string | null;
    colorHex?: string | null;
    bannerUrl?: string | null;
    tagline?: string | null;
    alias?: string | null;
    isOpen?: boolean | null;
    isArchived?: boolean | null;
    isApproved?: boolean | null;
};

// Map API response to UI format
export type StudioUI = {
    id: string;
    name: string;
    description: string;
    type: "personal" | "group";
    memberCount: number;
    groupCount: number;
    completionProgress: number; // Tiến độ hoàn thiện trung bình (%)
    createdAt: string;
    updatedAt: string;
    studioRole?: 0 | 1; // 0 = Owner, 1 = Member
    startDate?: string | null;
    endDate?: string | null;
    avatarUrl?: string | null;
    colorHex?: string | null;
    // Personalization fields
    bannerUrl?: string | null;
    tagline?: string | null;
    alias?: string | null;
    isOpen?: boolean | null;
    isArchived?: boolean | null;
    isApproved?: boolean | null;
    isPendingApproval?: boolean;
};

export type CreateStudioRequest = {
    name: string;
    description: string;
    type: "personal" | "group";
    startDate?: string | null;
    endDate?: string | null;
    avatarUrl?: string | null;
    colorHex?: string | null;
    // Personalization fields
    bannerUrl?: string | null;
    tagline?: string | null;
    alias?: string | null;
};

export type UpdateStudioRequest = {
    name?: string;
    description?: string;
    type?: "personal" | "group";
    startDate?: string | null;
    endDate?: string | null;
    avatarUrl?: string | null;
    colorHex?: string | null;
    // Personalization fields
    bannerUrl?: string | null;
    tagline?: string | null;
    alias?: string | null;
    requiresMemberApproval?: boolean;
    memberApprovalRequired?: boolean;
};

// Helper: convert ISO datetime string to YYYY-MM-DD for <input type="date">
function toDateInputValue(dateStr: string | null | undefined): string {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

// Helper function to map API Studio to UI Studio
function mapStudioToUI(studio: Studio): StudioUI {
    return {
        id: studio.studioId,
        name: studio.studioName,
        description: studio.description,
        type: "group", // API không có type, mặc định là group
        memberCount: studio.memberCount ?? 0,
        groupCount: studio.groupCount,
        completionProgress: studio.completionProgress || 0, // Tiến độ hoàn thiện từ API
        createdAt: studio.createdAt,
        updatedAt: studio.updatedAt,
        studioRole: studio.studioRole, // 0 = Owner, 1 = Member
        startDate: toDateInputValue(studio.startDate), // NEW — YYYY-MM-DD for <input type="date">
        endDate: toDateInputValue(studio.endDate), // NEW — YYYY-MM-DD for <input type="date">
        avatarUrl: studio.avatarUrl ?? null, // NEW
        colorHex: studio.colorHex ?? null, // NEW
        bannerUrl: studio.bannerUrl ?? null,
        tagline: studio.tagline ?? null,
        alias: studio.alias ?? null,
        isOpen: studio.isOpen ?? true,
        isArchived: studio.isArchived ?? false,
        isApproved: studio.isApproved ?? null,
        isPendingApproval: false
    };
}

/**
 * Get list of studios
 */
export async function getStudios(locale = "vi") {
    const result = await apiFetch<{ studios: Studio[]; subscription?: StudioListSubscription }>("/studio", {
        method: "GET",
        locale
    });

    // Map API response to UI format
    if (result.status === "success" && result.data) {
        const mappedStudios = result.data.studios.map(mapStudioToUI);
        return {
            ...result,
            data: {
                studios: mappedStudios,
                subscription: result.data.subscription || {
                    studioCreated: mappedStudios.length,
                    studioLimit: 3
                }
            } as StudioListResponse
        };
    }

    // biome-ignore lint/suspicious/noExplicitAny: returning untyped error response
    // biome-ignore lint/suspicious/noExplicitAny: returning untyped error response
    return result as any;
}

/**
 * Get studio by ID
 */
export async function getStudioById(id: string, locale = "vi") {
    const result = await apiFetch<Studio>(`/studio/${id}`, {
        method: "GET",
        locale
    });

    // Map API response to UI format
    if (result.status === "success" && result.data) {
        return {
            ...result,
            data: mapStudioToUI(result.data)
        };
    }

    // biome-ignore lint/suspicious/noExplicitAny: returning untyped error response
    return result as any;
}

/**
 * Create new studio
 */
export async function createStudio(data: CreateStudioRequest, locale = "vi") {
    // API only needs studioName and description
    // ownerId, createdAt, updatedAt are generated by backend
    const studioName = String(data.name ?? "").trim().slice(0, STUDIO_NAME_MAX_LENGTH);
    const description = String(data.description ?? "").trim().slice(0, STUDIO_DESCRIPTION_MAX_LENGTH);

    const result = await apiFetch<Studio>("/studio", {
        method: "POST",
        body: JSON.stringify({
            studioName,
            description,
            startDate: data.startDate ?? null,
            endDate: data.endDate ?? null,
            avatarUrl: data.avatarUrl ?? null, // NEW
            colorHex: data.colorHex ?? null // NEW
        }),
        locale
    });

    // Map API response to UI format
    if (result.status === "success" && result.data) {
        return {
            ...result,
            data: mapStudioToUI(result.data)
        };
    }

    // biome-ignore lint/suspicious/noExplicitAny: returning untyped error response
    return result as any;
}

/**
 * Update studio
 */
export async function updateStudio(id: string, data: UpdateStudioRequest, locale = "vi") {
    // API PUT needs id in body along with studioName and description
    const studioName = String(data.name ?? "").trim().slice(0, STUDIO_NAME_MAX_LENGTH);
    const description = String(data.description ?? "").trim().slice(0, STUDIO_DESCRIPTION_MAX_LENGTH);

    const result = await apiFetch<{ studioName: string; description: string; updatedAt: string }>("/studio", {
        method: "PUT",
        body: JSON.stringify({
            id: id,
            studioName,
            description,
            startDate: data.startDate ?? null,
            endDate: data.endDate ?? null,
            avatarUrl: data.avatarUrl ?? null,
            colorHex: data.colorHex ?? null,
            bannerUrl: data.bannerUrl ?? null,
            tagline: data.tagline ?? null,
            alias: data.alias ?? null,
            requiresMemberApproval: data.requiresMemberApproval,
            memberApprovalRequired: data.memberApprovalRequired
        }),
        locale
    });

    // biome-ignore lint/suspicious/noExplicitAny: returning untyped error response
    return result as any;
}

/**
 * Delete studio
 */
export async function deleteStudio(id: string, locale = "vi") {
    return apiFetch<null>(`/studio/${id}`, {
        method: "DELETE",
        locale
    });
}

/**
 * Leave studio
 */
export async function leaveStudio(studioId: string, locale = "vi") {
    return apiFetch<LeaveStudioResponse>(`/studio/${studioId}/leave`, {
        method: "DELETE",
        locale
    });
}

/**
 * Remove a member from studio only (does not remove from groups)
 */
export async function removeStudioMember(studioId: string, userId: string, locale = "vi") {
    const payload: RemoveStudioMemberRequest = { studioId, userId };

    return apiFetch<RemoveStudioMemberResponse>("/studio/remove", {
        method: "DELETE",
        body: JSON.stringify(payload),
        locale
    });
}

/**
 * Get studio members
 */
export async function getStudioMembers(studioId: string, locale = "vi") {
    return apiFetch<StudioMemberResponse[]>(`/studio/${studioId}/members`, {
        method: "GET",
        locale
    });
}

/**
 * Get pending studio members waiting for approval
 */
export async function getStudioPendingMembers(studioId: string, locale = "vi") {
    return apiFetch<StudioPendingMemberListResponse>(`/studio/${studioId}/pending`, {
        method: "GET",
        locale
    });
}

/**
 * Approve a pending studio member
 */
export async function approveStudioPendingMember(studioId: string, userId: string, locale = "vi") {
    return apiFetch<ApproveMemberResponse>(`/studio/${studioId}/approve`, {
        method: "POST",
        body: JSON.stringify({ userId }),
        locale
    });
}

/**
 * Reject/remove a pending studio member request
 */
export async function rejectStudioPendingMember(studioId: string, userId: string, locale = "vi") {
    const payload: RemoveStudioMemberRequest = { studioId, userId };

    return apiFetch<RemoveStudioMemberResponse>("/studio/remove", {
        method: "DELETE",
        body: JSON.stringify(payload),
        locale
    });
}

/**
 * Toggle studio member approval status
 * Backend endpoint currently reuses /studio/{studioId}/toggle-open
 */
export async function toggleStudioMemberApproval(studioId: string, enabled: boolean, locale = "vi") {
    // /toggle-open controls direct join behavior.
    // Member approval enabled => studio should not be open for direct join.
    const body: ToggleIsOpenRequest = { isOpen: !enabled };

    return apiFetch<ToggleIsOpenResponse>(`/studio/${studioId}/toggle-open`, {
        method: "PUT",
        body: JSON.stringify(body),
        locale
    });
}

export async function toggleStudioArchive(studioId: string, isArchived: boolean, locale = "vi") {
    const body: ToggleArchiveRequest = { isArchived };

    return apiFetch<ArchiveStudioResponse>(`/studio/${studioId}/archive`, {
        method: "PUT",
        body: JSON.stringify(body),
        locale
    });
}

// Batch assign types
export type BatchAssignResponse = components["schemas"]["BatchAssignResponse"];
export type BatchErrorRow = components["schemas"]["BatchErrorRow"];

// Build API URL helper
function buildStudioApiUrl(path: string) {
    const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
    return `${baseUrl}${path}`;
}

/**
 * Download CSV template for batch assign
 */
export async function downloadBatchAssignTemplate(studioId: string): Promise<Blob> {
    return apiDownload(buildStudioApiUrl(`/studio/${studioId}/members/batch-assign/template`));
}

/**
 * Upload batch-assign CSV file
 */
export async function uploadBatchAssignCsv(
    studioId: string,
    file: File,
    locale = "vi"
): Promise<components["schemas"]["BatchAssignResponseApiResponse"]> {
    const fullUrl = buildStudioApiUrl(`/studio/${studioId}/members/batch-assign`);
    const formData = new FormData();
    formData.append("file", file);

    const token = getAccessToken();
    let response = await fetch(fullUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
    });

    // 401: refresh token and retry once
    if (response.status === 401) {
        const refreshed = await refreshAccessToken(locale);
        if (refreshed) {
            response = await fetch(fullUrl, {
                method: "POST",
                headers: { Authorization: `Bearer ${refreshed.accessToken}` },
                body: formData
            });
        }
    }

    return response.json();
}

// Random assign types
export type RandomAssignRequest = components["schemas"]["RandomAssignRequest"];
export type RandomAssignResponseApiResponse = components["schemas"]["RandomAssignResponseApiResponse"];

/**
 * Randomly assign studio members to groups
 */
export async function randomAssignMembers(
    studioId: string,
    body: RandomAssignRequest,
    locale = "vi"
): Promise<RandomAssignResponseApiResponse> {
    const fullUrl = buildStudioApiUrl(`/studio/${studioId}/groups/random-assign`);

    const token = getAccessToken();
    let response = await fetch(fullUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept-Language": locale,
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
    });

    // 401: refresh token and retry once
    if (response.status === 401) {
        const refreshed = await refreshAccessToken(locale);
        if (refreshed) {
            response = await fetch(fullUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept-Language": locale,
                    Authorization: `Bearer ${refreshed.accessToken}`
                },
                body: JSON.stringify(body)
            });
        }
    }

    return response.json();
}

/**
 * Get studio groups (with membersPreview)
 */
export async function getStudioGroups(
    studioId: string,
    locale = "vi"
): Promise<StudioGroupListResponseApiResponse> {
    const fullUrl = buildStudioApiUrl(`/studio/${studioId}/groups`);

    const token = getAccessToken();
    let response = await fetch(fullUrl, {
        method: "GET",
        cache: "no-store",
        headers: {
            "Accept-Language": locale,
            Authorization: `Bearer ${token}`
        }
    });

    // 401: refresh token and retry once
    if (response.status === 401) {
        const refreshed = await refreshAccessToken(locale);
        if (refreshed) {
            response = await fetch(fullUrl, {
                method: "GET",
                cache: "no-store",
                headers: {
                    "Accept-Language": locale,
                    Authorization: `Bearer ${refreshed.accessToken}`
                }
            });
        }
    }

    return response.json();
}
