/**
 * Studio Invites API
 * Handles studio invitation operations
 */

import { apiFetch } from "./api-client";
import type { components } from "./types";

// Type aliases from types.ts
export type CreateStudioInviteRequest = components["schemas"]["CreateStudioInviteRequest"];
export type CreateStudioInviteResponse = components["schemas"]["CreateStudioInviteResponse"];
export type SendStudioInviteEmailRequest = components["schemas"]["SendStudioInviteEmailRequest"];
export type AcceptStudioInviteRequest = components["schemas"]["AcceptStudioInviteRequest"];
export type AcceptStudioInviteResponse = components["schemas"]["AcceptStudioInviteResponse"];

/**
 * Create invite link for a studio
 */
export async function createStudioInviteLink(data: CreateStudioInviteRequest, locale = "vi") {
    return apiFetch<CreateStudioInviteResponse>("/studio-invite/create", {
        method: "POST",
        body: JSON.stringify(data),
        locale
    });
}

/**
 * Send invite email to a user for a studio
 */
export async function sendStudioInviteEmail(data: SendStudioInviteEmailRequest, locale = "vi") {
    return apiFetch<string>("/studio-invite/email", {
        method: "POST",
        body: JSON.stringify(data),
        locale
    });
}

/**
 * Accept a studio invite using token
 */
export async function acceptStudioInvite(data: AcceptStudioInviteRequest, locale = "vi") {
    return apiFetch<AcceptStudioInviteResponse>("/studio-invite/accept", {
        method: "POST",
        body: JSON.stringify(data),
        locale
    });
}
