"use client";

import { useTranslations } from "next-intl";
import type { GroupRole } from "./types";

type Translator = ReturnType<typeof useTranslations>;

const ROLE_LABELS: Record<GroupRole, string> = {
    owner: "Owner",
    moderator: "Moderator",
    member: "Member",
    commenter: "Commenter",
    viewer: "Viewer"
};

interface RolePillProps {
    role: GroupRole;
    t?: Translator;
}

export function RolePill({ role, t }: RolePillProps) {
    const tRole = useTranslations("GroupStudioHeader.roles");
    const normalizedRole = String(role).trim().toLowerCase() as GroupRole;

    const cls =
        normalizedRole === "owner"
            ? "border-orange-500/60 text-orange-600 bg-orange-50"
            : normalizedRole === "moderator"
                ? "border-blue-500/60 text-blue-600 bg-blue-50"
                : normalizedRole === "member"
                    ? "border-purple-500/60 text-purple-600 bg-purple-50"
                    : normalizedRole === "commenter"
                        ? "border-green-500/60 text-green-600 bg-green-50"
                        : normalizedRole === "viewer"
                            ? "border-gray-400/60 text-gray-500 bg-gray-100"
                            : "border-slate-300 text-slate-600 bg-slate-50";

    const label = t
        ? t("GroupStudioHeader.roles." + normalizedRole, { defaultValue: ROLE_LABELS[normalizedRole] })
        : tRole(normalizedRole, { defaultValue: ROLE_LABELS[normalizedRole] });

    return (
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 font-medium text-xs ${cls}`}>
            {label}
        </span>
    );
}
