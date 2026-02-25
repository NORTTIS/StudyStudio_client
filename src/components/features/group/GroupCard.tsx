"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { CheckSquare2, Star, Users } from "lucide-react";
import type { Group } from "./types";
import { RolePill } from "./RolePill";

export function GroupCard({ group, onToggleStar }: { group: Group; onToggleStar: () => Promise<void> }) {
  const router = useRouter();
  const locale = useLocale();

  const goBoard = () => {
    if (!group.id) return;
    router.push(`/${locale}/group/${String(group.id)}`);
  };

  const starred = !!group.isStarred;

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
      className="cursor-pointer rounded-xl border border-[#E5E5E5] bg-white p-4 shadow-sm transition hover:bg-[#FAFAFA]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {group.tag && <p className="truncate text-xs text-[#6F6B99]">{group.tag}</p>}

          <div className={`${group.tag ? "mt-1" : ""} flex items-center gap-2`}>
            <h3 className="truncate font-semibold text-[#261E33]">{group.title}</h3>
            <RolePill role={group.role} />
          </div>
        </div>

        {/* ⭐ Star button */}
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
            className={`h-4 w-4 transition ${starred ? "text-yellow-500" : "text-[#6F6B99] hover:text-[#261E33]"}`}
            fill={starred ? "currentColor" : "transparent"}
          />
        </button>
      </div>

      {/* Description */}
      <p className="mt-3 line-clamp-2 text-sm text-[#6F6B99]">{group.description}</p>

      {/* Footer */}
      <div className="mt-4 border-t border-[#E5E5E5] pt-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-[#6F6B99]">
            <span className="text-xs">Tạo bởi</span>
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#F4F5FA] text-xs font-semibold text-[#261E33]">
              {group.createdByInitials}
            </span>
          </div>

          <div className="flex items-center gap-4 text-[#6F6B99]">
            <span className="inline-flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span className="text-sm">{group.membersCount} thành viên</span>
            </span>

            <span className="inline-flex items-center gap-1">
              <CheckSquare2 className="h-4 w-4" />
              <span className="text-sm">{group.tasksCount} công việc</span>
            </span>
          </div>
        </div>

        {/* 👥 Member initials */}
        <div className="mt-3 flex items-center gap-2">
          {group.memberInitials.slice(0, 5).map((it, idx) => (
            <span
              key={`${it}-${idx}`} // ✅ FIX duplicate key
              className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[#F4F5FA] px-2 text-xs font-semibold text-[#261E33]">
              {it}
            </span>
          ))}

          {group.memberInitials.length > 5 && (
            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[#F4F5FA] px-2 text-xs font-semibold text-[#261E33]">
              +{group.memberInitials.length - 5}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
