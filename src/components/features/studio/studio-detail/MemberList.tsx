"use client";

import type { StudioMemberResponse } from "@/api/studios";

interface MemberListProps {
    members: StudioMemberResponse[];
    studioOwnerId?: string;
    onInviteClick?: () => void;
    onMemberClick?: (member: StudioMemberResponse) => void;
}

export function MemberList({ members, studioOwnerId, onInviteClick, onMemberClick }: MemberListProps) {
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

    const getRoleLabel = (role: number | null | undefined) => {
        // StudioRole: 0 = owner, 1 = member
        switch (role) {
            case 0:
                return "Owner";
            case 1:
                return "Member";
            default:
                return "Member";
        }
    };

    const getRoleBorderStyle = (role: number | null | undefined) => {
        switch (role) {
            case 0:
                return "border border-slate-300 text-slate-700";
            case 1:
                return "border border-slate-200 text-slate-500";
            default:
                return "border border-slate-200 text-slate-500";
        }
    };

    const getGroupRoleLabel = (role: number | null | undefined) => {
        // GroupRole: 0=Owner, 1=Moderator, 2=Member, 3=Commenter, 4=Viewer
        switch (role) {
            case 0:
                return "Owner";
            case 1:
                return "Mod";
            case 2:
                return "Member";
            case 3:
                return "Commenter";
            case 4:
                return "Viewer";
            default:
                return "Member";
        }
    };

    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-base text-slate-800">Danh sách thành viên</h3>
                <button
                    type="button"
                    onClick={onInviteClick}
                    className="rounded-lg border border-[#FF5722] px-3 py-1.5 font-medium text-[#FF5722] text-xs transition-colors hover:bg-[#FF5722] hover:text-white">
                    + Mời
                </button>
            </div>

            {sortedMembers.length > 0 ? (
                <div className="space-y-1">
                    {sortedMembers.map((member, index) => (
                        <div
                            key={member.userId}
                            onClick={() => onMemberClick?.(member)}
                            className="flex cursor-pointer items-center justify-between rounded-xl px-2 py-2.5 transition-colors hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                                <div
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-semibold text-white text-xs ${
                                        index % 4 === 0
                                            ? "bg-gradient-to-br from-orange-400 to-red-500"
                                            : index % 4 === 1
                                              ? "bg-gradient-to-br from-pink-400 to-rose-500"
                                              : index % 4 === 2
                                                ? "bg-gradient-to-br from-blue-400 to-indigo-500"
                                                : "bg-gradient-to-br from-teal-400 to-cyan-500"
                                    }`}>
                                    {getInitials(member.userName)}
                                </div>
                                <div>
                                    <p className="font-medium text-slate-800 text-sm">{member.userName}</p>
                                    <p className="text-slate-400 text-xs">{member.email}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                {/* Only show Studio Owner badge for studio owner */}
                                {member.userId === studioOwnerId && (
                                    <span className="rounded-full px-2.5 py-0.5 font-medium text-xs border border-slate-300 text-slate-700">
                                        Chủ sở hữu
                                    </span>
                                )}
                                {member.groupInfo && member.groupInfo.length > 0 && (
                                    <div className="flex flex-wrap justify-end gap-1">
                                        {member.groupInfo.slice(0, 2).map((group) => (
                                            <span
                                                key={group.groupId}
                                                className="max-w-[100px] truncate rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                                                {group.groupName?.slice(0, 20)}-{getGroupRoleLabel(group.groupRole)}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-8 text-center">
                    <p className="text-slate-400 text-sm">Chưa có thành viên nào</p>
                </div>
            )}
        </div>
    );
}
