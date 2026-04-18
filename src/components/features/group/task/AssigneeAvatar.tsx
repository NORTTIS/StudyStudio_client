"use client";

/**
 * Props cho component avatar người được assign
 */
type AssigneeAvatarProps = {
    avatarUrl?: string | null; // URL ảnh avatar (nếu có)
    name?: string | null; // Tên user
    initials?: string | null; // Initials truyền từ ngoài (nếu có)
    size?: number; // Kích thước avatar (px), mặc định 24
    unassigned?: boolean; // Trạng thái chưa được assign
    className?: string; // Class bổ sung
};

/**
 * Utility nối className, loại bỏ giá trị falsy
 */
function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

/**
 * Sinh initials từ tên user
 */
export function getAvatarInitials(name?: string | null, fallback = "U") {
    const value = String(name ?? "").trim();
    if (!value) return fallback;

    const parts = value.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";

    return `${first}${last}`.toUpperCase() || fallback;
}

/**
 * Component hiển thị avatar assignee
 * - Ưu tiên ảnh nếu có
 * - Fallback sang initials nếu không có ảnh
 */
export default function AssigneeAvatar({
    avatarUrl,
    name,
    initials,
    size = 24,
    unassigned = false,
    className
}: AssigneeAvatarProps) {
    // Normalize URL
    const imageUrl = String(avatarUrl ?? "").trim();

    // Label phục vụ accessibility
    const label =
        String(name ?? "").trim() ||
        (unassigned ? "Unassigned" : "Assignee");

    // Normalize initials từ props
    const normalizedInitials = String(initials ?? "")
        .trim()
        .toUpperCase();

    // Text fallback hiển thị
    const fallbackText = unassigned
        ? "U"
        : normalizedInitials || getAvatarInitials(name, "U");

    // Render ảnh nếu có
    if (imageUrl) {
        return (
            <img
                src={imageUrl}
                alt={label}
                className={cn(
                    "shrink-0 rounded-full object-cover",
                    className
                )}
                style={{ width: size, height: size }}
            />
        );
    }

    // Render fallback initials nếu không có ảnh
    return (
        <span
            aria-label={label}
            className={cn(
                "inline-flex shrink-0 items-center justify-center rounded-full font-bold",
                unassigned
                    ? "bg-zinc-200 text-zinc-700"
                    : "bg-emerald-500 text-white",
                className
            )}
            style={{ width: size, height: size }}>
            {fallbackText.slice(0, 2)}
        </span>
    );
}