/**
 * Invites API
 * Handles group invitation operations and member approval workflow
 */

import { apiFetch } from "./api-client";
import type { components } from "./types";

export type InviteRole = "member" | "admin" | "viewer";

export type CreateInviteRequest = {
    groupId: string;
    role: string;
};

export type CreateInviteResponse = {
    inviteUrl: string;
    token: string;
    role: string;
    expiresAt: string;
    createdAt: string;
};

export type SendInviteEmailRequest = {
    groupId: string;
    role: string;
    email: string;
};

export type AcceptInviteRequest = {
    token: string;
};

export type AcceptInviteResponse = {
    groupId: string;
    groupName: string;
    role: string;
    joinedAt: string;
    isPending?: boolean;
};

// Pending member types from API
export type PendingMemberDto = components["schemas"]["PendingMemberDto"];
export type PendingMemberListResponse = components["schemas"]["PendingMemberListResponse"];
export type ApproveMemberResponse = components["schemas"]["ApproveMemberResponse"];
export type RemoveMemberRequest = components["schemas"]["RemoveMemberRequest"];
export type RemoveMemberResponse = components["schemas"]["RemoveMemberResponse"];
export type LeaveGroupResponse = components["schemas"]["LeaveGroupResponse"];

/**
 * Create invite link for a group
 */
export async function createInviteLink(data: CreateInviteRequest, locale = "vi") {
    return apiFetch<CreateInviteResponse>("/invite/create", {
        method: "POST",
        body: JSON.stringify(data),
        locale
    });
}

/**
 * Send invite email to a user
 */
export async function sendInviteEmail(data: SendInviteEmailRequest, locale = "vi") {
    return apiFetch<string>("/invite/email", {
        method: "POST",
        body: JSON.stringify(data),
        locale
    });
}

/**
 * Accept an invite using token
 */
export async function acceptInvite(data: AcceptInviteRequest, locale = "vi") {
    return apiFetch<AcceptInviteResponse>("/invite/accept", {
        method: "POST",
        body: JSON.stringify(data),
        locale
    });
}

/**
 * Get pending members for a group (requires approval)
 */
export async function getPendingMembers(groupId: string, locale = "vi") {
    return apiFetch<PendingMemberListResponse>(`/group/${groupId}/pending`, {
        method: "GET",
        locale
    });
}

/**
 * Approve a pending member
 */
export async function approvePendingMember(groupId: string, userId: string, locale = "vi") {
    return apiFetch<ApproveMemberResponse>(`/group/${groupId}/approve`, {
        method: "POST",
        body: JSON.stringify({ userId }),
        locale
    });
}

/**
 * Reject/remove a pending member request or remove an existing group member
 */
export async function rejectPendingMember(groupId: string, userId: string, locale = "vi") {
    const payload: RemoveMemberRequest = { groupId, userId };

    return apiFetch<RemoveMemberResponse>("/group/member/remove", {
        method: "DELETE",
        body: JSON.stringify(payload),
        locale
    });
}

/**
 * Leave group (for joined member) or cancel own pending join request
 */
export async function cancelPendingJoinRequest(groupId: string, locale = "vi", _userId?: string) {
    return apiFetch<LeaveGroupResponse>(`/group/member/${groupId}/leave`, {
        method: "DELETE",
        locale
    });
}
