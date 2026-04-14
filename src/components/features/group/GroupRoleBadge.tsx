"use client";

import { useTranslations } from "next-intl";
import type { GroupRole } from "./types";

interface GroupRoleBadgeProps {
    groupName: string;
    role: GroupRole;
    alias?: string | null;
    maxNameLen?: number;
}

const ROLE_COLOR: Record<Exclude<GroupRole, null>, { border: string; text: string; bg: string }> = {
    owner:     { border: "border-orange-500/60", text: "text-orange-600",   bg: "bg-orange-50" },
    moderator: { border: "border-blue-500/60",    text: "text-blue-600",     bg: "bg-blue-50" },
    member:    { border: "border-purple-500/60",  text: "text-purple-600",   bg: "bg-purple-50" },
    commenter: { border: "border-green-500/60",  text: "text-green-600",    bg: "bg-green-50" },
    viewer:    { border: "border-gray-400/60",   text: "text-gray-500",     bg: "bg-gray-100" }
};

const ROLE_KEY: Record<Exclude<GroupRole, null>, string> = {
    owner: "owner",
    moderator: "moderator",
    member: "member",
    commenter: "commenter",
    viewer: "viewer"
};

export function GroupRoleBadge({ groupName, role, alias, maxNameLen = 10 }: GroupRoleBadgeProps) {
    const t = useTranslations("GroupStudioHeader.roles");

    // Guard: default to 'member' if role is null
    const safeRole = role ?? "member";

    // Use alias if available, otherwise truncate groupName
    const displayName =
        alias?.trim()
            ? alias.trim()
            : groupName.length > maxNameLen
                ? groupName.slice(0, maxNameLen)
                : groupName;

    const roleLabel = t(ROLE_KEY[safeRole], { defaultValue: safeRole });
    const colors = ROLE_COLOR[safeRole];

    return (
        <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 font-medium text-xs ${colors.border} ${colors.text} ${colors.bg}`}
            title={`${groupName} — ${roleLabel}`}
        >
            {displayName}-{roleLabel}
        </span>
    );
}
