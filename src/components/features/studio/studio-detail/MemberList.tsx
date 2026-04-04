"use client";

import { useTranslations } from "next-intl";
import type { StudioMemberResponse } from "@/api/studios";
import { GroupRoleBadge } from "@/components/features/group/GroupRoleBadge";
import type { GroupRole } from "@/components/features/group/types";

interface GroupBasic {
    id: string;
    name: string;
}

interface MemberListProps {
    members: StudioMemberResponse[];
    studioOwnerId?: string;
    groups?: GroupBasic[];
    onInviteClick?: () => void;
    onQuickAssignClick?: () => void;
    onMemberClick?: (member: StudioMemberResponse) => void;
    canManageMembers?: boolean;
    onRemoveMember?: (member: StudioMemberResponse) => void;
    removingMemberUserId?: string | null;
    disabled?: boolean;
}

export function MemberList({
    members,
    studioOwnerId,
    groups,
    onInviteClick,
    onQuickAssignClick,
    onMemberClick,
    canManageMembers = false,
    onRemoveMember,
    removingMemberUserId = null,
    disabled = false
}: MemberListProps) {
    const t = useTranslations("MemberList");

    // Sort members: Studio Owner first, then by group role (Moderator -> Member -> Commenter -> Viewer)
    const sortedMembers = [...members].sort((a, b) => {
        // Check if user is studio owner
        const aIsOwner = a.userId === studioOwnerId;
        const bIsOwner = b.userId === studioOwnerId;

        if (aIsOwner && !bIsOwner) return -1;
        if (!aIsOwner && bIsOwner) return 1;

        // Get highest group role (lower number = higher priority)
        const getHighestGroupRole = (member: StudioMemberResponse) => {
            if (!member.groupInfo || member.groupInfo.length === 0) return 4; // Default to lowest
            return Math.min(...member.groupInfo.map((g) => g.groupRole ?? 4));
        };

        const aGroupRole = getHighestGroupRole(a);
        const bGroupRole = getHighestGroupRole(b);

        return aGroupRole - bGroupRole;
    });
    const getInitials = (name: string | null | undefined) => {
        if (!name) return "?";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const getGroupRoleLabel = (role: number | null | undefined) => {
        // GroupRole: 0=Owner, 1=Moderator, 2=Member, 3=Commenter, 4=Viewer
        switch (role) {
            case 0:
                return t("groupRole.owner");
            case 1:
                return t("groupRole.moderator");
            case 2:
                return t("groupRole.member");
            case 3:
                return t("groupRole.commenter");
            case 4:
                return t("groupRole.viewer");
            default:
                return t("groupRole.member");
        }
    };

    const toGroupRole = (role: number | null | undefined): GroupRole => {
        switch (role) {
            case 0: return "owner";
            case 1: return "moderator";
            case 2: return "member";
            case 3: return "commenter";
            case 4: return "viewer";
            default: return "member";
        }
    };

    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-base text-slate-800">{t("title")}</h3>
                <div className="flex gap-2">
                    {groups && groups.length > 0 && (
                        <button
                            type="button"
                            onClick={onQuickAssignClick}
                            disabled={disabled}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-600 text-xs transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50">
                            {t("quickAssign")}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onInviteClick}
                        disabled={disabled}
                        className="rounded-lg border border-[#FF5722] px-3 py-1.5 font-medium text-[#FF5722] text-xs transition-colors hover:bg-[#FF5722] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-[#FF5722]">
                        + {t("invite")}
                    </button>
                </div>
            </div>

            {sortedMembers.length > 0 ? (
                <div className="space-y-1">
                    {sortedMembers.map((member, index) => (
                        <div
                            key={member.userId}
                            onClick={() => {
                                if (disabled) return;
                                onMemberClick?.(member);
                            }}
                            className={`flex items-center justify-between rounded-xl px-2 py-2.5 transition-all duration-200 ${disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-gray-50"}`}>
                            <div className="flex items-center gap-3">
                                {member.avatarUrl ? (
                                    <img
                                        src={member.avatarUrl}
                                        alt={member.userName || t("avatarFallback")}
                                        className="h-9 w-9 shrink-0 rounded-full object-cover"
                                    />
                                ) : (
                                    <div
                                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-semibold text-white text-xs ${index % 4 === 0
                                            ? "bg-gradient-to-br from-orange-400 to-red-500"
                                            : index % 4 === 1
                                                ? "bg-gradient-to-br from-pink-400 to-rose-500"
                                                : index % 4 === 2
                                                    ? "bg-gradient-to-br from-blue-400 to-indigo-500"
                                                    : "bg-gradient-to-br from-teal-400 to-cyan-500"
                                            }`}>
                                        {getInitials(member.userName)}
                                    </div>
                                )}
                                <div>
                                    <p className="font-medium text-slate-800 text-sm">{member.userName}</p>
                                    <p className="text-slate-400 text-xs">{member.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {canManageMembers && member.userId !== studioOwnerId && onRemoveMember && (
                                    <button
                                        type="button"
                                        disabled={disabled || removingMemberUserId === member.userId}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveMember(member);
                                        }}
                                        className="rounded-lg border border-red-200 px-2.5 py-1 font-medium text-red-600 text-xs transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60">
                                        {removingMemberUserId === member.userId ? t("removing") : t("remove")}
                                    </button>
                                )}

                                {member.userId === studioOwnerId && (
                                    <span className="whitespace-nowrap rounded-full border border-slate-300 px-2.5 py-0.5 font-medium text-slate-700 text-xs transition-all duration-300">
                                        {t("owner")}
                                    </span>
                                )}
                            </div>

                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-8 text-center">
                    <p className="text-slate-400 text-sm">{t("empty")}</p>
                </div>
            )}
        </div>
    );
}
