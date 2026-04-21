"use client";

export type UserSnapshot = {
    id: string;
    name?: string | null;
    avatarUrl?: string | null;
};

const STORAGE_KEY_PREFIX = "userSnapshotCache:v1";

function isBrowser() {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeScope(scope?: string | null) {
    return String(scope ?? "").trim() || "global";
}

function getStorageKey(scope?: string | null) {
    return `${STORAGE_KEY_PREFIX}:${normalizeScope(scope)}`;
}

function readStore(scope?: string | null): Record<string, UserSnapshot> {
    if (!isBrowser()) return {};

    try {
        const raw = window.localStorage.getItem(getStorageKey(scope));
        if (!raw) return {};

        const parsed = JSON.parse(raw) as Record<string, UserSnapshot> | null;
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function writeStore(store: Record<string, UserSnapshot>, scope?: string | null) {
    if (!isBrowser()) return;

    try {
        window.localStorage.setItem(getStorageKey(scope), JSON.stringify(store));
    } catch {
        // Ignore storage failures; cache is best-effort only.
    }
}

export function clearUserSnapshotCache(scope?: string | null) {
    if (!isBrowser()) return;

    try {
        window.localStorage.removeItem(getStorageKey(scope));
    } catch {
        // Ignore storage failures; cache is best-effort only.
    }
}

export function clearAllUserSnapshotCaches() {
    if (!isBrowser()) return;

    try {
        const keysToRemove: string[] = [];

        for (let i = 0; i < window.localStorage.length; i += 1) {
            const key = window.localStorage.key(i);
            if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
                keysToRemove.push(key);
            }
        }

        for (const key of keysToRemove) {
            window.localStorage.removeItem(key);
        }
    } catch {
        // Ignore storage failures; cache is best-effort only.
    }
}

export function getCachedUserSnapshots(scope?: string | null) {
    return readStore(scope);
}

export function upsertUserSnapshots(entries: UserSnapshot[], scope?: string | null) {
    if (!entries.length) return;

    const store = readStore(scope);

    for (const entry of entries) {
        const id = String(entry.id ?? "").trim();
        if (!id) continue;

        const existing = store[id];
        const nextName = String(entry.name ?? "").trim() || existing?.name || null;
        const nextAvatarUrl = String(entry.avatarUrl ?? "").trim() || existing?.avatarUrl || null;

        store[id] = {
            id,
            name: nextName,
            avatarUrl: nextAvatarUrl
        };
    }

    writeStore(store, scope);
}
