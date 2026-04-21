"use client";

export function normalizeAvatarUrl(input?: string | null) {
    const raw = String(input ?? "").trim();
    if (!raw) return null;
    return raw.replace("localhost", "127.0.0.1");
}

export function resolveAvatarUrl(entity?: unknown): string | null {
    if (!entity || typeof entity !== "object") return null;

    const record = entity as Record<string, unknown>;
    const nestedUser =
        record.user && typeof record.user === "object" ? (record.user as Record<string, unknown>) : null;

    return (
        normalizeAvatarUrl(String(record.avatarUrl ?? "").trim()) ??
        normalizeAvatarUrl(String(record.avatar ?? "").trim()) ??
        normalizeAvatarUrl(String(record.profilePictureUrl ?? "").trim()) ??
        normalizeAvatarUrl(String(record.profileImageUrl ?? "").trim()) ??
        normalizeAvatarUrl(String(nestedUser?.avatarUrl ?? "").trim()) ??
        normalizeAvatarUrl(String(nestedUser?.avatar ?? "").trim()) ??
        normalizeAvatarUrl(String(nestedUser?.profilePictureUrl ?? "").trim()) ??
        normalizeAvatarUrl(String(nestedUser?.profileImageUrl ?? "").trim())
    );
}
