"use client";

import { CheckSquare2, MoreVertical, Star, Users, Users2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cancelPendingJoinRequest } from "@/api/invites";
import { hexToGradient } from "@/lib/utils";
import { mapRole } from "./group.api";
import { RolePill } from "./RolePill";
import type { GroupCardDto } from "./types";

function toBooleanLike(value: unknown): boolean | null {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") {
        if (value === 1) return true;
        if (value === 0) return false;
    }
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true" || normalized === "1") return true;
        if (normalized === "false" || normalized === "0") return false;
    }
    return null;
}

export function GroupCard({
    group,
    onToggleStar,
    onLeaveGroup,
    onCancelPending,
    view = "grid"
}: {
    group: GroupCardDto;
    onToggleStar: () => Promise<void>;
    onLeaveGroup: () => Promise<void>;
    onCancelPending?: () => Promise<void>;
    view?: "grid" | "list";
}) {
    const t = useTranslations("GroupCard");
    const locale = useLocale();
    const router = useRouter();
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [showInactiveDialog, setShowInactiveDialog] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [isCanceling, setIsCanceling] = useState(false);
    const groupRole = mapRole(group.role);
    const isOwner = groupRole === "owner";
    const isArchived = toBooleanLike((group as Record<string, unknown>).isArchived) === true;
    // Status dot is meant to represent Active vs Archived (per UI copy),
    // not whether the group/studio is temporarily paused/closed.
    const isDotActive = !isArchived;
    const localizedStatusLabel = isArchived ? t("statusArchived") : t("statusActive");
    const isInactiveForViewer = !isOwner && isArchived;
    const rawStatus = String(
        (group as Record<string, unknown>).membershipStatus ??
        (group as Record<string, unknown>).status ??
        (group as Record<string, unknown>).joinStatus ??
        ""
    )
        .trim()
        .toLowerCase();
    const isApprovedRaw = toBooleanLike(
        (group as Record<string, unknown>).isApproved ?? (group as Record<string, unknown>).approved
    );
    const isMemberRaw = toBooleanLike(
        (group as Record<string, unknown>).isMember ?? (group as Record<string, unknown>).member
    );
    const isPendingApproval =
        isMemberRaw !== true
        && (
            isApprovedRaw === false ||
            rawStatus === "pending" ||
            rawStatus === "waiting_approval" ||
            rawStatus === "awaiting_approval" ||
            rawStatus === "requested"
        );
    const inactiveMutedClass = isInactiveForViewer ? "opacity-60" : "";

    const goBoard = () => {
        if (!group.id) return;
        router.push(`/${locale}/group/${String(group.id)}`);
    };

    const handleOpenGroup = () => {
        if (!group.id) return;

        if (isInactiveForViewer) {
            setShowInactiveDialog(true);
            return;
        }

        if (isPendingApproval && !isOwner) {
            return;
        }

        goBoard();
    };

    const handleConfirmLeave = async () => {
        try {
            setIsLeaving(true);
            await onLeaveGroup();
            setShowLeaveDialog(false);
        } finally {
            setIsLeaving(false);
        }
    };

    const handleCancelPending = async () => {
        try {
            setIsCanceling(true);
            await (onCancelPending?.() ?? cancelPendingJoinRequest(group.id || ""));
            setShowCancelDialog(false);
        } finally {
            setIsCanceling(false);
        }
    };

    const starred = !!group.isFavorite;
    const visibleTasksCount = Number(group.taskCount ?? 0);
    const title = group.name ?? "";
    const description = group.description ?? "";

    const createdByInitials = (() => {
        const f = (group.createdBy?.firstName || "").trim();
        const l = (group.createdBy?.lastName || "").trim();
        const a = f ? f[0].toUpperCase() : "";
        const b = l ? l[0].toUpperCase() : "";
        return `${a}${b}`.trim() || "U";
    })();

    const displayTitle = title.length > 30 ? `${title.slice(0, 30)}...` : title;

    const membersPreview = group.membersPreview || [];
    const memberInitialsToShow = membersPreview
        .map((u) => {
            const f = (u.firstName || "").trim();
            const l = (u.lastName || "").trim();
            return `${f ? f[0].toUpperCase() : ""}${l ? l[0].toUpperCase() : ""}`;
        })
        .filter((item) => item !== "" && item !== createdByInitials)
        .filter((item, index, arr) => arr.indexOf(item) === index);

    const memberAvatarsToShow = membersPreview
        .map((u) => u.avatarUrl)
        .filter((url): url is string => !!url)
        .slice(0, 5);

    return (
        <div
            role="button"
            tabIndex={0}
            aria-disabled={(isPendingApproval && !isOwner) || isInactiveForViewer}
            onClick={handleOpenGroup}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleOpenGroup();
                }
            }}
            className={`group/card overflow-hidden rounded-xl border border-[#E5E5E5] bg-white shadow-sm transition ${isInactiveForViewer
                ? "cursor-not-allowed bg-[#FCFCFC]"
                : isPendingApproval && !isOwner
                  ? "cursor-default"
                  : "cursor-pointer hover:bg-[#FAFAFA]"}`}>
            {group.bannerUrl ? (
                <div className={`relative h-16 w-full overflow-hidden bg-[#F4F5FA] ${inactiveMutedClass}`}>
                    <img
                        src={group.bannerUrl}
                        alt=""
                        className="h-full w-full object-cover"
                    />
                </div>
            ) : (
                <div
                    className={`h-16 w-full ${inactiveMutedClass}`}
                    style={{
                        background: hexToGradient(
                            typeof group.colorHex === "string" ? group.colorHex : "#FF5F3D"
                        )
                    }}
                />
            )}

            <div className="p-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative -mt-8 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-2 ring-white">
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

                            <span
                                aria-label={localizedStatusLabel}
                                title={localizedStatusLabel}
                                className="relative inline-flex h-2.5 w-2.5 shrink-0 items-center justify-center">
                                <span
                                    aria-hidden="true"
                                    className={`absolute inset-0 rounded-full ${isDotActive ? "bg-emerald-500/65" : "bg-red-500/75"} animate-ping motion-reduce:animate-none`}
                                />
                                <span
                                    aria-hidden="true"
                                    className={`relative h-2.5 w-2.5 rounded-full transition-transform duration-300 group-hover/card:scale-110 ${isDotActive ? "bg-emerald-500" : "bg-red-600"}`}
                                    style={{
                                        boxShadow: isDotActive
                                            ? "0 0 0 3px rgba(16, 185, 129, 0.22), 0 0 10px rgba(16, 185, 129, 0.35)"
                                            : "0 0 0 3px rgba(220, 38, 38, 0.28), 0 0 12px rgba(220, 38, 38, 0.42)"
                                    }}
                                />
                            </span>

                            <h3 className={`truncate font-semibold text-[#261E33] ${inactiveMutedClass}`}>{displayTitle}</h3>

                            {group.alias ? (
                                <span
                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${inactiveMutedClass}`}
                                    style={{
                                        backgroundColor: `${group.colorHex ?? "#FF5F3D"}18`,
                                        borderColor: `${group.colorHex ?? "#FF5F3D"}40`,
                                        color: group.colorHex ?? "#FF5F3D"
                                    }}>
                                    {group.alias}
                                </span>
                            ) : null}

                            {isPendingApproval ? (
                                <span className={`inline-flex items-center rounded-full border border-orange-300 bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 ${inactiveMutedClass}`}>
                                    {t("awaitingApproval")}
                                </span>
                            ) : null}

                            <span className={inactiveMutedClass}>
                                <RolePill role={groupRole} />
                            </span>

                            {group.studio?.name ? (
                                <span className={`inline-flex shrink-0 items-center rounded-md border border-purple-500/60 bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-600 ${inactiveMutedClass}`}>
                                    {group.studio.name}
                                </span>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                await onToggleStar();
                            }}
                            disabled={isInactiveForViewer}
                            className={`rounded-md p-1 transition hover:bg-[#F4F5FA] active:scale-95 ${inactiveMutedClass}`}
                            aria-label={starred ? t("removeFavorite") : t("addFavorite")}>
                            <Star
                                className={`h-4 w-4 transition ${starred ? "text-yellow-500" : "text-[#6F6B99] hover:text-yellow-500"}`}
                                fill={starred ? "currentColor" : "transparent"}
                            />
                        </button>

                        {!isOwner ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                        }}
                                        className={`rounded-md p-1 transition hover:bg-[#F4F5FA] active:scale-95 ${inactiveMutedClass}`}
                                        aria-label={t("menuLabel")}>
                                        <MoreVertical className="h-4 w-4 text-[#6F6B99] hover:text-[#261E33]" />
                                    </button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent
                                    align="end"
                                    className="z-50 w-48 rounded-md border border-gray-200 bg-white shadow-lg"
                                    onClick={(e) => e.stopPropagation()}>
                                    {isPendingApproval ? (
                                        <DropdownMenuItem
                                            className="text-red-600 focus:bg-red-50 focus:text-red-700"
                                            onSelect={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setShowCancelDialog(true);
                                            }}>
                                            {t("cancelRequest")}
                                        </DropdownMenuItem>
                                    ) : (
                                        <DropdownMenuItem
                                            className="text-red-600 focus:bg-red-50 focus:text-red-700"
                                            onSelect={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setShowLeaveDialog(true);
                                            }}>
                                            {t("leaveGroup")}
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : null}
                    </div>
                </div>

                {group.tagline ? (
                    <p className={`mt-1 line-clamp-1 text-xs italic text-[#9B8CA8] ${inactiveMutedClass}`}>
                        {group.tagline}
                    </p>
                ) : null}
            </div>

            <div className="px-3 pb-3">
                <p className={`mt-2 line-clamp-3 whitespace-pre-line break-words text-sm text-[#6F6B99] ${inactiveMutedClass}`}>
                    {description}
                </p>

                <div className={`mt-3 border-t border-[#E5E5E5] pt-2 ${inactiveMutedClass}`}>
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-[#6F6B99]">
                            <span className="text-xs">{t("createdBy")}</span>
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
                            ) : (
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#F4F5FA] text-xs font-semibold text-[#261E33]">
                                    {createdByInitials}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3 text-[#6F6B99]">
                            <span className="inline-flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                <span>
                                    {group.memberCount ?? 0} {t("members")}
                                </span>
                            </span>

                            <span className="inline-flex items-center gap-1">
                                <CheckSquare2 className="h-4 w-4" />
                                <span>
                                    {visibleTasksCount} {t("tasks")}
                                </span>
                            </span>
                        </div>
                    </div>

                    {memberAvatarsToShow.length > 0 ? (
                        <div className="mt-2 flex items-center">
                            {memberAvatarsToShow.map((avatarUrl, idx) => (
                                <div
                                    key={avatarUrl || `avatar-${idx}`}
                                    className={`relative h-7 w-7 overflow-hidden rounded-full ring-2 ring-white ${idx === 0 ? "" : "-ml-1"}`}>
                                    <Image
                                        src={avatarUrl}
                                        alt={`Member ${idx + 1}`}
                                        fill
                                        className="object-cover"
                                        sizes="28px"
                                    />
                                </div>
                            ))}

                            {memberAvatarsToShow.length < memberInitialsToShow.length ? (
                                <span className="-ml-1 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[#F4F5FA] px-2 text-xs font-semibold text-[#261E33] ring-2 ring-white">
                                    +{memberInitialsToShow.length - memberAvatarsToShow.length}
                                </span>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>

            <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("leaveConfirmTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("leaveConfirmDescription", { groupName: group.name ?? "" })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-3">
                        <AlertDialogCancel
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowLeaveDialog(false);
                            }}>
                            {t("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                void handleConfirmLeave();
                            }}
                            disabled={isLeaving}
                            className="bg-red-600 hover:bg-red-700">
                            {isLeaving ? t("leaving") : t("confirmLeave")}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showInactiveDialog} onOpenChange={setShowInactiveDialog}>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("inactiveGroupTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("inactiveGroupDescription")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-3">
                        <AlertDialogAction
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowInactiveDialog(false);
                            }}>
                            {t("inactiveGroupOk")}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("cancelRequestTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("cancelRequestDescription", { groupName: group.name ?? "" })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-3">
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                void handleCancelPending();
                            }}
                            disabled={isCanceling}
                            className="bg-red-600 hover:bg-red-700">
                            {isCanceling ? t("canceling") : t("confirmCancel")}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
