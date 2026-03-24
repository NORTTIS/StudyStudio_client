"use client";

import { CheckSquare2, Star, Users, Users2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { mapRole } from "./group.api";
import { RolePill } from "./RolePill";
import type { GroupCardDto } from "./types";

export function GroupCard({ group, onToggleStar }: { group: GroupCardDto; onToggleStar: () => Promise<void> }) {
    const router = useRouter();
    const locale = useLocale();

    const goBoard = () => {
        if (!group.id) return;
        router.push(`/${locale}/group/${String(group.id)}`);
    };

    const starred = !!group.isFavorite;
    const visibleTasksCount = Number(group.taskCount ?? 0);

    const title = group.name ?? "";
    const description = group.description ?? "";

    // Compute createdBy initials
    const createdByInitials = (() => {
        const f = (group.createdBy?.firstName || "").trim();
        const l = (group.createdBy?.lastName || "").trim();
        const a = f ? f[0].toUpperCase() : "";
        const b = l ? l[0].toUpperCase() : "";
        return `${a}${b}`.trim() || "U";
    })();

    const displayTitle = title.length > 30 ? `${title.slice(0, 30)}...` : title;

    // Member initials and avatars from membersPreview
    const membersPreview = group.membersPreview || [];
    const memberInitialsToShow = membersPreview
        .map((u) => {
            const f = (u.firstName || "").trim();
            const l = (u.lastName || "").trim();
            return `${f ? f[0].toUpperCase() : ""}${l ? l[0].toUpperCase() : ""}`;
        })
        .filter((item) => item !== "" && item !== createdByInitials)
        .filter((item, index, arr) => arr.indexOf(item) === index);

    // Avatar URLs - filter out empty/null and limit to 5
    const memberAvatarsToShow = membersPreview
        .map((u) => u.avatarUrl)
        .filter((url): url is string => !!url)
        .slice(0, 5);

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={goBoard}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    goBoard();
                }
            }}
            className="cursor-pointer rounded-xl border border-[#E5E5E5] bg-white p-3 shadow-sm transition hover:bg-[#FAFAFA]">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    {group.studio?.name && <p className="truncate text-[#6F6B99] text-xs">{group.studio.name}</p>}

                    <div className={`${group.studio?.name ? "mt-1" : ""} flex items-center gap-2`}>
                        {/* Avatar */}
                        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#F4F5FA] ring-1 ring-[#E5E5E5]">
                            {group.avatarUrl ? (
                                <Image
                                    src={group.avatarUrl}
                                    alt={displayTitle}
                                    fill
                                    className="object-cover"
                                    sizes="32px"
                                />
                            ) : group.iconEmoji ? (
                                <span className="text-base leading-none">{group.iconEmoji}</span>
                            ) : (
                                <Users2 className="h-4 w-4 text-[#6F6B99]" />
                            )}
                        </div>

                        <h3 className="truncate font-semibold text-[#261E33]">{displayTitle}</h3>
                        <RolePill role={mapRole(group.role)} />
                    </div>
                </div>

                <button
                    type="button"
                    onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        await onToggleStar();
                    }}
                    className="rounded-md p-1 transition hover:bg-[#F4F5FA] active:scale-95"
                    aria-label={starred ? "Bỏ yêu thích" : "Thêm yêu thích"}>
                    <Star
                        className={`h-4 w-4 transition ${
                            starred ? "text-yellow-500" : "text-[#6F6B99] hover:text-[#261E33]"
                        }`}
                        fill={starred ? "currentColor" : "transparent"}
                    />
                </button>
            </div>

            <p className="mt-2 line-clamp-3 whitespace-pre-line break-words text-[#6F6B99] text-sm">{description}</p>

            <div className="mt-3 border-[#E5E5E5] border-t pt-2">
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-[#6F6B99]">
                        <span className="text-xs">Tạo bởi</span>
                        {group.createdBy?.avatarUrl ? (
                            <div className="relative h-6 w-6 overflow-hidden rounded-full ring-1 ring-[#E5E5E5]">
                                <Image
                                    src={group.createdBy.avatarUrl}
                                    alt={createdByInitials}
                                    fill
                                    className="object-cover"
                                    sizes="24px"
                                />
                            </div>
                        ) : createdByInitials ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#F4F5FA] font-semibold text-[#261E33] text-xs">
                                {createdByInitials}
                            </span>
                        ) : null}
                    </div>

                    <div className="flex items-center gap-3 text-[#6F6B99]">
                        <span className="inline-flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{group.memberCount ?? 0} thành viên</span>
                        </span>

                        <span className="inline-flex items-center gap-1">
                            <CheckSquare2 className="h-4 w-4" />
                            <span>{visibleTasksCount} công việc</span>
                        </span>
                    </div>
                </div>

                {memberAvatarsToShow.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                        {memberAvatarsToShow.map((avatarUrl, idx) => (
                            <div
                                key={avatarUrl || `avatar-${idx}`}
                                className="relative h-7 w-7 overflow-hidden rounded-full ring-2 ring-white">
                                <Image
                                    src={avatarUrl}
                                    alt={`Member ${idx + 1}`}
                                    fill
                                    className="object-cover"
                                    sizes="28px"
                                />
                            </div>
                        ))}

                        {memberAvatarsToShow.length < memberInitialsToShow.length && (
                            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[#F4F5FA] px-2 font-semibold text-[#261E33] text-xs">
                                +{memberInitialsToShow.length - memberAvatarsToShow.length}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
