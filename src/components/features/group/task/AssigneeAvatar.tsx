"use client";

import { DefaultNameAvatar } from "@/components/ui/default-name-avatar";

type AssigneeAvatarProps = {
    avatarUrl?: string | null;
    name?: string | null;
    initials?: string | null;
    seed?: string | null;
    size?: number;
    unassigned?: boolean;
    className?: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export function getAvatarInitials(name?: string | null, fallback = "U") {
    const value = String(name ?? "").trim();
    if (!value) return fallback;

    const parts = value.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";

    return `${first}${last}`.toUpperCase() || fallback;
}

export default function AssigneeAvatar({
    avatarUrl,
    name,
    initials,
    seed,
    size = 24,
    unassigned = false,
    className
}: AssigneeAvatarProps) {
    const imageUrl = String(avatarUrl ?? "").trim();
    const label = String(name ?? "").trim() || (unassigned ? "Unassigned" : "Assignee");
    const normalizedInitials = String(initials ?? "").trim().toUpperCase();
    const fallbackText = unassigned ? "U" : normalizedInitials || getAvatarInitials(name, "U");

    if (imageUrl) {
        return (
            <img
                src={imageUrl}
                alt={label}
                className={cn("shrink-0 rounded-full object-cover", className)}
                style={{ width: size, height: size }}
            />
        );
    }

    if (!unassigned) {
        return (
            <DefaultNameAvatar
                name={name || fallbackText}
                seed={seed || name || fallbackText}
                className={cn("shrink-0", className)}
                fallbackClassName="font-bold"
                style={{ width: size, height: size }}
            />
        );
    }

    return (
        <span
            aria-label={label}
            className={cn(
                "inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-200 font-bold text-zinc-700",
                className
            )}
            style={{ width: size, height: size }}>
            {fallbackText.slice(0, 1)}
        </span>
    );
}
