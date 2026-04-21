"use client";

export type UserSnapshot = {
    id: string;
    name?: string | null;
    avatarUrl?: string | null;
};

const STORAGE_KEY = "userSnapshotCache:v1";

function isBrowser() {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStore(): Record<string, UserSnapshot> {
    if (!isBrowser()) return {};

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};

        const parsed = JSON.parse(raw) as Record<string, UserSnapshot> | null;
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function writeStore(store: Record<string, UserSnapshot>) {
    if (!isBrowser()) return;

    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
        // Ignore storage failures; cache is best-effort only.
    }
}

export function getCachedUserSnapshots() {
    return readStore();
}

export function upsertUserSnapshots(entries: UserSnapshot[]) {
    if (!entries.length) return;

    const store = readStore();

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

    writeStore(store);
}
