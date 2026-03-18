"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { CheckSquare2, Star, Users } from "lucide-react";
import type { Group } from "./types";
import { RolePill } from "./RolePill";

export function GroupCard({
    group,
    onToggleStar,
}: {
    group: Group;
    onToggleStar: () => Promise<void>;
}) {
    const router = useRouter();
    const locale = useLocale();

    const goBoard = () => {
        if (!group.id) return;
        router.push(`/${locale}/group/${String(group.id)}`);
    };

    const starred = !!group.isStarred;
    const visibleTasksCount = Number(group.tasksCount ?? 0);

    const title = group.title ?? "";
    const description = group.description ?? "";
    const createdByInitials = (group.createdByInitials ?? "").trim();

    const displayTitle =
        title.length > 30 ? `${title.slice(0, 30)}...` : title;

    const normalizedMemberInitials = Array.isArray(group.memberInitials)
        ? group.memberInitials
            .map((item) => String(item ?? "").trim())
            .filter(Boolean)
        : [];

    const uniqueMemberInitials = normalizedMemberInitials.filter(
        (item, index, arr) => arr.indexOf(item) === index
    );

    const memberInitialsToShow = uniqueMemberInitials.filter(
        (item) => item !== createdByInitials
    );

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
            className="cursor-pointer rounded-xl border border-[#E5E5E5] bg-white p-3 shadow-sm transition hover:bg-[#FAFAFA]"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    {group.tag && (
                        <p className="truncate text-xs text-[#6F6B99]">
                            {group.tag}
                        </p>
                    )}

                    <div
                        className={`${group.tag ? "mt-1" : ""} flex items-center gap-2`}
                    >
                        <h3 className="truncate font-semibold text-[#261E33]">
                            {displayTitle}
                        </h3>
                        <RolePill role={group.role} />
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
                    aria-label={starred ? "Bỏ yêu thích" : "Thêm yêu thích"}
                >
                    <Star
                        className={`h-4 w-4 transition ${starred
                            ? "text-yellow-500"
                            : "text-[#6F6B99] hover:text-[#261E33]"
                            }`}
                        fill={starred ? "currentColor" : "transparent"}
                    />
                </button>
            </div>

            <p className="mt-2 line-clamp-3 whitespace-pre-line break-words text-sm text-[#6F6B99]">
                {description}
            </p>

            <div className="mt-3 border-t border-[#E5E5E5] pt-2">
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-[#6F6B99]">
                        <span className="text-xs">Tạo bởi</span>
                        {createdByInitials && (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#F4F5FA] text-xs font-semibold text-[#261E33]">
                                {createdByInitials}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3 text-[#6F6B99]">
                        <span className="inline-flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{group.membersCount ?? 0} thành viên</span>
                        </span>

                        <span className="inline-flex items-center gap-1">
                            <CheckSquare2 className="h-4 w-4" />
                            <span>{visibleTasksCount} công việc</span>
                        </span>
                    </div>
                </div>

                {memberInitialsToShow.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                        {memberInitialsToShow.slice(0, 5).map((item, idx) => (
                            <span
                                key={`${item}-${idx}`}
                                className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[#F4F5FA] px-2 text-xs font-semibold text-[#261E33]"
                            >
                                {item}
                            </span>
                        ))}

                        {memberInitialsToShow.length > 5 && (
                            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[#F4F5FA] px-2 text-xs font-semibold text-[#261E33]">
                                +{memberInitialsToShow.length - 5}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}