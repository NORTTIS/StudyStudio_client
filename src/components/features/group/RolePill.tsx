import type { GroupRole } from "./types";

const roleText: Record<GroupRole, string> = {
    owner: "Chủ sở hữu",
    moderator: "Điều phối viên",
    member: "Thành viên",
    commenter: "Người bình luận",
    viewer: "Người xem"
};

export function RolePill({ role }: { role: GroupRole }) {
    const cls =
        role === "owner"
            ? "border-orange-500/60 text-orange-600 bg-orange-50"
            : role === "moderator"
                ? "border-blue-500/60 text-blue-600 bg-blue-50"
                : role === "member"
                    ? "border-purple-500/60 text-purple-600 bg-purple-50"
                    : role === "commenter"
                        ? "border-green-500/60 text-green-600 bg-green-50"
                        : role === "viewer"
                            ? "border-gray-400/60 text-gray-500 bg-gray-100"
                            : "border-slate-300 text-slate-600 bg-slate-50";

    return (
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 font-medium text-xs ${cls}`}>
            {roleText[role]}
        </span>
    );
}
