/**
 * Groups API
 * Handles group settings updates and group-level mutations
 */

import { apiFetch } from "./api-client";
import type { components } from "./types";

export type UpdateGroupRequest = components["schemas"]["UpdateGroupRequest"] & {
    requiresMemberApproval?: boolean;
    memberApprovalRequired?: boolean;
};

export type UpdateGroupResponse = components["schemas"]["UpdateGroupResponse"];
export type ToggleIsOpenRequest = components["schemas"]["ToggleIsOpenRequest"];
export type ToggleIsOpenResponse = components["schemas"]["ToggleIsOpenResponse"];
export type ToggleArchiveRequest = components["schemas"]["ToggleArchiveRequest"];
export type ArchiveGroupResponse = components["schemas"]["ArchiveGroupResponse"];

export async function updateGroupSettings(data: UpdateGroupRequest, locale = "vi") {
    return apiFetch<UpdateGroupResponse>("/group", {
        method: "PUT",
        body: JSON.stringify(data),
        locale
    });
}

export async function toggleGroupMemberApproval(groupId: string, enabled: boolean, locale = "vi") {
    // /toggle-open controls whether members can join directly.
    // Member approval enabled => group is not open for direct join.
    const body: ToggleIsOpenRequest = { isOpen: !enabled };

    return apiFetch<ToggleIsOpenResponse>(`/group/${groupId}/toggle-open`, {
        method: "PUT",
        body: JSON.stringify(body),
        locale
    });
}

export async function toggleGroupArchive(groupId: string, isArchived: boolean, locale = "vi") {
    const body: ToggleArchiveRequest = { isArchived };

    return apiFetch<ArchiveGroupResponse>(`/group/${groupId}/archive`, {
        method: "PUT",
        body: JSON.stringify(body),
        locale
    });
}
