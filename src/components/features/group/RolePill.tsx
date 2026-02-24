import type { GroupRole } from "./types";

const roleText: Record<GroupRole, string> = {
    owner: "Chủ sở hữu",
    moderator: "Điều phối viên",
    member: "Thành viên"
};

export function RolePill({ role }: { role: GroupRole }) {
    const cls =
        role === "owner"
            ? "border-orange-500/60 text-orange-600"
            : role === "moderator"
                ? "border-slate-300 text-slate-600"
                : "border-slate-300 text-slate-600";

    return (
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${cls}`}>
            {roleText[role]}
        </span>
    );
}