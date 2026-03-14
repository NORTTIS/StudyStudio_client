/**
 * Invites API
 * Handles group invitation operations
 */

import { apiFetch } from "./api-client";

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
};

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
