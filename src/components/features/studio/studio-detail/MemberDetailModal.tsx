"use client";

import { useTranslations } from "next-intl";
import type { StudioMemberResponse } from "@/api/studios";
import { RolePill } from "@/components/features/group/RolePill";
import type { GroupRole } from "@/components/features/group/types";

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

    const toGroupRole = (role: number | null | undefined): GroupRole => {
        switch (role) {
            case 0:
                return "owner";
            case 1:
                return "moderator";
            case 2:
                return "member";
            case 3:
                return "commenter";
            case 4:
                return "viewer";
            default:
                return "member";
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
                        <div className="mt-2">
                            <RolePill role={member.userId === studioOwnerId ? "owner" : "member"} />
                        </div>
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
                                    <RolePill role={toGroupRole(group.groupRole)} />
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
