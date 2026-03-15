"use client";

import { type StudioMember } from "./types";

interface MemberListProps {
    members: StudioMember[];
    onInviteClick?: () => void;
}

export function MemberList({ members, onInviteClick }: MemberListProps) {
    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case "owner":
                return "Owner";
            case "admin":
                return "Mod";
            default:
                return "Member";
        }
    };

    const getRoleBorderStyle = (role: string) => {
        switch (role) {
            case "owner":
                return "border border-slate-300 text-slate-700";
            case "admin":
                return "border border-slate-300 text-slate-700";
            default:
                return "border border-slate-200 text-slate-500";
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

            {members.length > 0 ? (
                <div className="space-y-1">
                    {members.map((member, index) => (
                        <div
                            key={member.id}
                            className="flex items-center justify-between rounded-xl px-2 py-2.5 transition-colors hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                                {member.avatar ? (
                                    <img
                                        src={member.avatar}
                                        alt={member.name}
                                        className="h-9 w-9 rounded-full object-cover"
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
                                        {getInitials(member.name)}
                                    </div>
                                )}
                                <div>
                                    <p className="font-medium text-slate-800 text-sm">{member.name}</p>
                                    <p className="text-slate-400 text-xs">{member.email}</p>
                                </div>
                            </div>
                            <span
                                className={`rounded-full px-2.5 py-0.5 font-medium text-xs ${getRoleBorderStyle(member.role)}`}>
                                {getRoleLabel(member.role)}
                            </span>
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
