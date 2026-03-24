import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Convert an ISO date-time string to a human-readable relative time label.
 * e.g. "2024-01-01T10:00:00Z" → "2h ago", "3d ago", "1mo ago"
 */
export function formatRelativeTime(isoDateTime: string): string {
    if (!isoDateTime) return "N/A";

    const date = new Date(isoDateTime);
    if (Number.isNaN(date.getTime())) return "N/A";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffSecs < 60) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    if (diffMonths < 12) return `${diffMonths}mo ago`;
    return `${Math.floor(diffMonths / 12)}y ago`;
}

/**
 * Generate a two-stop 135-degree linear gradient from a single hex color.
 * The second stop is darkened to 60% of the original luminance.
 * e.g. "#FF5F3D" → "linear-gradient(135deg, #FF5F3D, #992400)"
 */
export function hexToGradient(hex: string): string {
    const clean = hex.replace("#", "");
    if (!/^[0-9A-Fa-f]{6}$/.test(clean)) {
        // Fallback to brand primary if invalid
        return "linear-gradient(135deg, #FF5F3D, #992400)";
    }

    const r = Number.parseInt(clean.slice(0, 2), 16);
    const g = Number.parseInt(clean.slice(2, 4), 16);
    const b = Number.parseInt(clean.slice(4, 6), 16);

    const dark = (c: number) =>
        Math.max(0, Math.round(c * 0.6))
            .toString(16)
            .padStart(2, "0");

    return `linear-gradient(135deg, #${clean}, #${dark(r)}${dark(g)}${dark(b)})`;
}
