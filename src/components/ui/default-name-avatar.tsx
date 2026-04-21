"use client";

import * as React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const AVATAR_TONES = [
    { backgroundColor: "#F97316", color: "#FFFFFF" },
    { backgroundColor: "#0EA5E9", color: "#FFFFFF" },
    { backgroundColor: "#22C55E", color: "#FFFFFF" },
    { backgroundColor: "#A855F7", color: "#FFFFFF" },
    { backgroundColor: "#EAB308", color: "#3F2A00" },
    { backgroundColor: "#EF4444", color: "#FFFFFF" }
] as const;

function normalizeLatinText(value: string) {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "D");
}

export function getDefaultAvatarInitial(name?: string | null) {
    const normalized = normalizeLatinText(String(name ?? "").trim());
    const firstAlphaNumeric = normalized.match(/[A-Za-z0-9]/)?.[0] ?? "U";
    return firstAlphaNumeric.toUpperCase();
}

export function getDefaultAvatarTone(seed?: string | null) {
    const source = String(seed ?? "").trim() || "default-avatar";
    let hash = 0;

    for (let index = 0; index < source.length; index += 1) {
        hash = (hash * 31 + source.charCodeAt(index)) | 0;
    }

    return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
}

type DefaultNameAvatarProps = {
    name?: string | null;
    seed?: string | null;
    className?: string;
    fallbackClassName?: string;
    size?: "sm" | "default" | "lg";
    style?: React.CSSProperties;
};

export function DefaultNameAvatar({
    name,
    seed,
    className,
    fallbackClassName,
    size = "default",
    style
}: DefaultNameAvatarProps) {
    const initial = React.useMemo(() => getDefaultAvatarInitial(name), [name]);
    const toneClassName = React.useMemo(
        () => getDefaultAvatarTone(seed || name || initial),
        [initial, name, seed]
    );

    return (
        <Avatar size={size} className={cn("shadow-sm", className)} style={style}>
            <AvatarFallback style={toneClassName} className={cn("font-semibold", fallbackClassName)}>
                {initial}
            </AvatarFallback>
        </Avatar>
    );
}
