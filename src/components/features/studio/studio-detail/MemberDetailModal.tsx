"use client";

import { useTranslations } from "next-intl";
import type { StudioMemberResponse } from "@/api/studios";

interface MemberDetailModalProps {
    member: StudioMemberResponse | null;
    studioOwnerId?: string;
    isOpen: boolean;
    onClose: () => void;
}

export function MemberDetailModal({ member, studioOwnerId, isOpen, onClose }: MemberDetailModalProps) {
    const t = useTranslations("MemberDetailModal");

    if (!(isOpen && member)) return null;

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
                return t("studioRole.owner");
            case 1:
                return t("studioRole.member");
            default:
                return t("studioRole.member");
        }
    };

    const getRoleBadgeStyle = (role: number | null | undefined) => {
        // StudioRole: 0 = owner, 1 = member
        switch (role) {
            case 0:
                return "bg-gradient-to-r from-orange-500 to-red-600 text-white";
            case 1:
                return "bg-slate-100 text-slate-600";
            default:
                return "bg-slate-100 text-slate-600";
        }
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="font-bold text-[#261E33] text-xl">{t("title")}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* Avatar and basic info */}
                <div className="mb-6 flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-red-500 font-bold text-white text-xl">
                        {getInitials(member.userName)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold text-lg text-slate-800">{member.userName}</h3>
                        <p className="truncate text-slate-500 text-sm">{member.email}</p>
                        {member.userId === studioOwnerId ? (
                            <span className="mt-2 inline-block rounded-full bg-gradient-to-r from-orange-500 to-red-600 px-3 py-1 font-medium text-white text-xs">
                                {t("studioRole.owner")}
                            </span>
                        ) : (
                            <span
                                className={`mt-2 inline-block rounded-full px-3 py-1 font-medium text-xs ${getRoleBadgeStyle(member.studioRole)}`}>
                                {getRoleLabel(member.studioRole)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Group info */}
                <div className="border-slate-100 border-t pt-4">
                    <h4 className="mb-3 font-medium text-slate-700 text-sm">{t("joinedGroups")}</h4>
                    {member.groupInfo && member.groupInfo.length > 0 ? (
                        <div className="space-y-2">
                            {member.groupInfo.map((group) => (
                                <div
                                    key={group.groupId}
                                    className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                                            <svg
                                                className="h-4 w-4 text-slate-500"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                                                />
                                            </svg>
                                        </div>
                                        <span className="font-medium text-slate-700 text-sm">{group.groupName}</span>
                                    </div>
                                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-600 text-xs">
                                        {getGroupRoleLabel(group.groupRole)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-400 text-sm">{t("noJoinedGroups")}</p>
                    )}
                </div>

                {/* Actions */}
                <div className="mt-6 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg bg-slate-100 px-4 py-2 font-medium text-slate-700 text-sm transition-colors hover:bg-slate-200">
                        {t("close")}
                    </button>
                </div>
            </div>
        </div>
    );
}
