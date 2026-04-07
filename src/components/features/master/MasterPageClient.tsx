"use client";

import { Archive, ChevronDown, FolderKanban, LogOut, Users2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    createStudio,
    deleteStudio,
    getStudioById,
    getStudios,
    leaveStudio,
    toggleStudioArchive,
    type StudioListSubscription,
    type StudioUI,
    updateStudio
} from "@/api/studios";
import { getUserProfile, type UserProfile } from "@/api/user-profile";
import { Container } from "@/components/common";
import { DeleteConfirmModal } from "@/components/features/master/DeleteConfirmModal";
import { RolePill } from "@/components/features/group/RolePill";
import { StudioLimitModal } from "@/components/features/master/StudioLimitModal";
import { StudioModal } from "@/components/features/master/StudioModal";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { mockStudios } from "@/mocks/studios-data";
import {
    consumeRejectedStudioJoinRequest,
    getPendingStudioJoinRequests,
    removePendingStudioJoinRequest
} from "@/utils/studio-pending";

interface MasterPageClientProps {
    initialUserProfile: UserProfile | null;
    initialStudios: StudioUI[];
    initialSubscription: StudioListSubscription | null;
}

function hexToRgba(hex: string, opacity: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(255, 95, 61, ${opacity})`;
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function getColorGradient(colorHex: string | null | undefined): string {
    if (!colorHex) {
        return "linear-gradient(135deg, #FF5F3D 0%, #FF7A59 100%)";
    }
    const baseColor = colorHex.startsWith("#") ? colorHex : `#${colorHex}`;
    const darkerColor = hexToRgba(baseColor, 0.72);
    return `linear-gradient(135deg, ${baseColor} 0%, ${darkerColor} 100%)`;
}

function getHoverShadow(colorHex: string | null | undefined): string {
    if (!colorHex) {
        return "0 30px 70px rgba(255, 95, 61, 0.16)";
    }
    const baseColor = colorHex.startsWith("#") ? colorHex : `#${colorHex}`;
    return `0 30px 70px ${hexToRgba(baseColor, 0.16)}`;
}

function getFocusRing(colorHex: string | null | undefined): string {
    if (!colorHex) {
        return "#FF5F3D";
    }
    return colorHex.startsWith("#") ? colorHex : `#${colorHex}`;
}

function FloatingOrb({ className }: { className: string }) {
    return (
        <motion.div
            className={`pointer-events-none absolute rounded-full blur-3xl ${className}`}
            animate={{ y: [0, -18, 0], x: [0, 10, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
    );
}

function StudioBoardSection({
    sectionKey,
    title,
    count,
    icon: Icon,
    children,
    collapsed,
    onToggle
}: {
    sectionKey: string;
    title: string;
    count: number;
    icon: React.ElementType;
    children: React.ReactNode;
    collapsed: boolean;
    onToggle: (sectionKey: string) => void;
}) {
    const sectionStyle = sectionKey.includes("archived")
        ? {
            shell: "bg-[linear-gradient(135deg,rgba(255,245,245,0.98),rgba(255,255,255,0.96)_40%,rgba(254,236,236,0.94)_100%)]",
            leftGlow: "bg-rose-200/30",
            rightGlow: "bg-red-200/22",
            header: "bg-[linear-gradient(90deg,rgba(255,231,231,0.95),rgba(255,244,244,0.92),rgba(254,232,232,0.88))]",
            icon: "bg-[linear-gradient(135deg,#FB7185_0%,#EF4444_55%,#DC2626_100%)] ring-rose-100/80"
        }
        : sectionKey.includes("joined")
            ? {
                shell: "bg-[linear-gradient(135deg,rgba(239,246,255,0.98),rgba(255,255,255,0.96)_40%,rgba(238,242,255,0.94)_100%)]",
                leftGlow: "bg-sky-200/30",
                rightGlow: "bg-indigo-200/22",
                header: "bg-[linear-gradient(90deg,rgba(224,242,254,0.95),rgba(239,246,255,0.92),rgba(238,242,255,0.88))]",
                icon: "bg-[linear-gradient(135deg,#38BDF8_0%,#3B82F6_55%,#4F46E5_100%)] ring-sky-100/80"
            }
            : {
                shell: "bg-[linear-gradient(135deg,rgba(255,247,238,0.98),rgba(255,255,255,0.96)_38%,rgba(250,245,255,0.94)_100%)]",
                leftGlow: "bg-orange-200/30",
                rightGlow: "bg-violet-200/22",
                header: "bg-[linear-gradient(90deg,rgba(255,241,226,0.95),rgba(255,248,242,0.92),rgba(244,237,255,0.88))]",
                icon: "bg-[linear-gradient(135deg,#FB923C_0%,#F97316_55%,#EA580C_100%)] ring-orange-100/80"
            };

    return (
        <motion.section
            initial={{ opacity: 0, y: 18, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className={`relative isolate overflow-hidden rounded-[34px] border border-white/80 ${sectionStyle.shell} shadow-[0_24px_72px_rgba(15,23,42,0.08)] backdrop-blur-2xl`}>
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.48),rgba(255,255,255,0.14))]" />
            <div className={`pointer-events-none absolute -left-10 top-8 h-32 w-32 rounded-full blur-3xl ${sectionStyle.leftGlow}`} />
            <div className={`pointer-events-none absolute -right-12 top-0 h-40 w-40 rounded-full blur-3xl ${sectionStyle.rightGlow}`} />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/95" />

            <div className={`relative border-white/70 border-b ${sectionStyle.header} px-5 py-4 md:px-6`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3.5">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-[18px] text-white shadow-[0_12px_28px_rgba(15,23,42,0.18)] ring-4 ${sectionStyle.icon}`}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2.5">
                                <h2 className="truncate font-semibold text-[#261F32] text-[16px] md:text-[18px]">
                                    {title}
                                </h2>
                                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-white/80 bg-white/80 px-2 font-bold text-[#7C6A5A] text-[11px] shadow-sm">
                                    {count}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => onToggle(sectionKey)}
                        className={`inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-4 py-2 text-[#796B60] text-[13px] shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition hover:bg-white ${sectionKey.includes("archived") ? "hover:text-red-600" : sectionKey.includes("joined") ? "hover:text-blue-600" : "hover:text-[#EA580C]"}`}>
                        <span>{collapsed ? "Mở rộng" : "Thu gọn"}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${collapsed ? "-rotate-90" : "rotate-0"}`} />
                    </button>
                </div>
            </div>

            {!collapsed ? <div className="relative px-5 py-5 md:px-6">{children}</div> : null}
        </motion.section>
    );
}

interface StudioCardProps {
    studio: StudioUI;
    onClick: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onToggleArchive?: () => void;
    onLeave?: () => void;
    onCancelPendingRequest?: () => void;
    pendingCancelLoading?: boolean;
    isLeavingLoading?: boolean;
    isArchiveUpdating?: boolean;
    canEdit: boolean;
}

function StudioCard({
    studio,
    onClick,
    onEdit,
    onDelete,
    onToggleArchive,
    onLeave,
    onCancelPendingRequest,
    pendingCancelLoading = false,
    isLeavingLoading = false,
    isArchiveUpdating = false,
    canEdit
}: StudioCardProps) {
    const t = useTranslations("MasterPage");
    const locale = useLocale();
    const gradient = getColorGradient(studio.colorHex);
    const hoverShadow = getHoverShadow(studio.colorHex);
    const focusRing = getFocusRing(studio.colorHex);
    const isOwner = studio.studioRole === 0;
    const isMember = studio.studioRole === 1;
    const isPendingApproval = !isOwner && !!studio.isPendingApproval;
    const isStudioArchived = studio.isArchived === true;
    const isStudioActive = !isStudioArchived;
    const canShowOwnerActions = canEdit;
    const isInactiveForViewer = !isOwner && isStudioArchived;
    const inactiveMutedClass = isInactiveForViewer ? "opacity-60" : "";
    const [isHovered, setIsHovered] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const cardShadow = isHovered || isFocused ? hoverShadow : "0 20px 60px rgba(15,23,42,0.06)";
    const borderColor = isHovered ? `${studio.colorHex || "#FF5F3D"}35` : "rgba(255,255,255,0.72)";
    return (
        <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -7 }}
            role="button"
            tabIndex={0}
            className={`group relative overflow-hidden rounded-[30px] border bg-white/82 text-left backdrop-blur-2xl transition-all duration-300 ${isPendingApproval || isInactiveForViewer ? "cursor-not-allowed" : "cursor-pointer"}`}
            style={
                {
                    boxShadow: cardShadow,
                    borderColor,
                    outline: isFocused ? `2px solid ${focusRing}` : "none"
                } as React.CSSProperties
            }
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onClick();
                }
            }}>
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.24),rgba(255,255,255,0.04))]" />

            <div
                className={`relative h-36 overflow-visible px-5 pt-5 ${inactiveMutedClass}`}
                style={{
                    background: studio.bannerUrl ? `url(${studio.bannerUrl}) center/cover no-repeat` : gradient
                }}>
                {studio.bannerUrl && <div className="absolute inset-0 bg-black/10" />}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.36),transparent_36%)]" />
                <div className="absolute inset-x-0 top-0 h-px bg-white/40" />
                <motion.div
                    className="absolute right-[-24px] top-[-20px] h-28 w-28 rounded-full bg-white/15 blur-2xl"
                    animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                />

                <div className="relative flex items-start justify-between gap-3">
                    <div className="flex flex-col items-start gap-2">
                        <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 font-semibold text-[11px] shadow-sm ${
                                isStudioActive
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-red-100 text-red-700"
                            }`}>
                            {isStudioActive ? (locale === "vi" ? "Hoạt động" : "Active") : (locale === "vi" ? "Lưu trữ" : "Archived")}
                        </span>
                    </div>

                    <div className="flex items-start gap-2">
                        {studio.studioRole !== undefined && (
                            <motion.div whileHover={{ scale: 1.04 }}>
                                <RolePill role={isOwner ? "owner" : "member"} />
                            </motion.div>
                        )}

                        {false ? (
                            <div className="flex items-center gap-2">
                                <motion.button
                                    whileHover={{ y: -2, scale: 1.04 }}
                                    whileTap={{ scale: 0.96 }}
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit();
                                    }}
                                    className="rounded-xl border border-white/20 bg-white/15 p-2 text-white shadow-sm backdrop-blur transition hover:bg-white/25"
                                    title="Chỉnh sửa">
                                    <svg
                                        className="h-4 w-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                        />
                                    </svg>
                                </motion.button>

                                <motion.button
                                    whileHover={{ y: -2, scale: 1.04 }}
                                    whileTap={{ scale: 0.96 }}
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete();
                                    }}
                                    className="rounded-xl border border-red-200/60 bg-white/15 p-2 text-red-100 shadow-sm backdrop-blur transition hover:bg-red-500/20"
                                    title="Xóa studio">
                                    <svg
                                        className="h-4 w-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                        />
                                    </svg>
                                </motion.button>
                            </div>
                        ) : null}

                    </div>
                </div>

                <motion.div
                    whileHover={{ rotate: -2, scale: 1.04 }}
                    className="absolute bottom-[-24px] left-5 z-10 overflow-hidden rounded-[20px] border border-white/85 bg-white shadow-[0_14px_28px_rgba(15,23,42,0.14)]">
                    {studio.avatarUrl ? (
                        <img src={studio.avatarUrl} alt={studio.name} className="h-16 w-16 object-cover" />
                    ) : (
                        <div className="flex h-16 w-16 items-center justify-center text-[28px] font-bold text-[#261E33]">
                            {studio.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                </motion.div>
            </div>

            <div className={`mt-10 p-5 pt-4 ${inactiveMutedClass}`}>
                <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-[19px] font-semibold text-[#261E33] transition duration-300 group-hover:text-[#FF5F3D]">
                                {studio.name}
                            </h3>
                        </div>
                        {studio.tagline ? <p className="mt-1 italic text-[#9B8CA8] text-xs">{studio.tagline}</p> : null}
                        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-[#6F6B99]">{studio.description}</p>
                    </div>

                    {canShowOwnerActions ? (
                        <motion.div
                            initial={false}
                            animate={{ opacity: isHovered ? 1 : 0.55, y: isHovered ? 0 : 2 }}
                            className="flex shrink-0 gap-2 transition-all duration-200">
                            <motion.button
                                whileHover={{ y: -2, scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleArchive?.();
                                }}
                                disabled={isArchiveUpdating}
                                className={`rounded-xl border p-2 shadow-sm transition disabled:opacity-50 ${
                                    isStudioArchived
                                        ? "border-emerald-100 bg-white/95 hover:bg-emerald-50"
                                        : "border-amber-100 bg-white/95 hover:bg-amber-50"
                                }`}
                                title={isStudioArchived ? "Mở lại studio" : "Lưu trữ studio"}>
                                <Archive className={`h-4 w-4 ${isStudioArchived ? "text-emerald-600" : "text-amber-600"}`} />
                            </motion.button>

                            {!isStudioArchived ? (
                                <>
                                    <motion.button
                                        whileHover={{ y: -2, scale: 1.04 }}
                                        whileTap={{ scale: 0.96 }}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit();
                                        }}
                                        className="rounded-xl border border-gray-200 bg-white/95 p-2 shadow-sm transition hover:bg-gray-50"
                                        title="Chỉnh sửa">
                                        <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </motion.button>

                                    <motion.button
                                        whileHover={{ y: -2, scale: 1.04 }}
                                        whileTap={{ scale: 0.96 }}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete();
                                        }}
                                        className="rounded-xl border border-red-100 bg-white/95 p-2 shadow-sm transition hover:bg-red-50"
                                        title="Xóa studio">
                                        <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </motion.button>
                                </>
                            ) : null}
                        </motion.div>
                    ) : isMember && !isPendingApproval ? (
                        <motion.div
                            initial={false}
                            animate={{ opacity: isHovered ? 1 : 0.55, y: isHovered ? 0 : 2 }}
                            className="flex shrink-0 gap-2 transition-all duration-200">
                            <motion.button
                                whileHover={{ y: -2, scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onLeave?.();
                                }}
                                disabled={isLeavingLoading}
                                className="rounded-xl border border-red-100 bg-white/95 p-2 shadow-sm transition hover:bg-red-50 disabled:opacity-50"
                                title={t("leaveStudio")}
                                aria-label={t("leaveStudio")}>
                                <LogOut className="h-4 w-4 text-red-500" />
                            </motion.button>
                        </motion.div>
                    ) : null}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                    <motion.div
                        whileHover={{ y: -2 }}
                        className="rounded-[20px] border border-[#F1EBE6] bg-[linear-gradient(180deg,#FFFFFF_0%,#FBFAF8_100%)] px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 text-xs text-[#6F6B99]">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                                />
                            </svg>
                            <span>{t("groups")}</span>
                        </div>
                        <p className="mt-2 text-xl font-semibold text-[#261E33]">{studio.groupCount}</p>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -2 }}
                        className="rounded-[20px] border border-[#F1EBE6] bg-[linear-gradient(180deg,#FFFFFF_0%,#FBFAF8_100%)] px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 text-xs text-[#6F6B99]">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                            </svg>
                            <span>{t("members")}</span>
                        </div>
                        <p className="mt-2 text-xl font-semibold text-[#261E33]">{studio.memberCount}</p>
                    </motion.div>
                </div>

                {isPendingApproval ? (
                    <div className="mt-4 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2.5">
                        <p className="text-[12px] text-amber-700">{t("pendingJoinNotice")}</p>
                        <Button
                            type="button"
                            className="h-8 rounded-lg bg-amber-600 px-3 text-xs text-white hover:bg-amber-700"
                            onClick={(e) => {
                                e.stopPropagation();
                                onCancelPendingRequest?.();
                            }}
                            disabled={pendingCancelLoading}>
                            {pendingCancelLoading ? t("pendingStudioCanceling") : t("pendingStudioCancel")}
                        </Button>
                    </div>
                ) : null}
            </div>
        </motion.div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[34px] border border-white/80 bg-white/82 p-16 text-center shadow-sm backdrop-blur">
            <motion.div
                className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[linear-gradient(135deg,#FFF1EC_0%,#F5F0FF_100%)]"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}>
                <svg className="h-9 w-9 text-[#9B8CA8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.7}
                        d="M3 7h18M6 7V6a2 2 0 012-2h8a2 2 0 012 2v1m-1 0v11a2 2 0 01-2 2H8a2 2 0 01-2-2V7"
                    />
                </svg>
            </motion.div>
            <p className="text-[15px] text-[#6F6B99]">{message}</p>
        </motion.div>
    );
}

function LoadingState() {
    return (
        <div className="flex items-center justify-center py-24">
            <div className="relative">
                <div className="h-14 w-14 rounded-full border-4 border-[#F1E8E3]" />
                <div className="absolute inset-0 h-14 w-14 animate-spin rounded-full border-4 border-transparent border-t-[#FF5F3D] border-r-[#FF7A59]" />
            </div>
        </div>
    );
}

function buildPendingStudioCard(
    request: { studioId: string; studioName?: string; requestedAt: string },
    locale: string
): StudioUI {
    return {
        id: request.studioId,
        name: request.studioName || (locale === "vi" ? "Studio chờ duyệt" : "Pending studio"),
        description: locale === "vi" ? "Yêu cầu tham gia đang chờ phê duyệt" : "Membership request pending approval",
        type: "group",
        memberCount: 0,
        groupCount: 0,
        completionProgress: 0,
        createdAt: request.requestedAt,
        updatedAt: request.requestedAt,
        studioRole: 1,
        avatarUrl: null,
        colorHex: null,
        bannerUrl: null,
        tagline: null,
        alias: null,
        isOpen: true,
        isApproved: false,
        isMember: false,
        isPendingApproval: true
    };
}

function shouldDropPendingStudio(code?: string | null, message?: string | null) {
    const normalizedCode = String(code || "").trim().toLowerCase();
    const normalizedMessage = String(message || "").trim().toLowerCase();

    const codeLooksMissing =
        normalizedCode === "404"
        || normalizedCode === "not_found"
        || normalizedCode === "studio_not_found"
        || normalizedCode === "invalid_studio"
        || normalizedCode.includes("not_found")
        || normalizedCode.includes("studio_not_found");

    const messageLooksMissing =
        normalizedMessage.includes("studio")
        && (
            normalizedMessage.includes("kh")
            || normalizedMessage.includes("not found")
            || normalizedMessage.includes("does not exist")
            || normalizedMessage.includes("no longer exists")
            || normalizedMessage.includes("ton tai")
            || normalizedMessage.includes("tồn tại")
        );

    return codeLooksMissing || messageLooksMissing;
}

function isPendingStudioAccessDenied(code?: string | null, message?: string | null) {
    const normalizedCode = String(code || "").trim().toLowerCase();
    const normalizedMessage = String(message || "").trim().toLowerCase();

    return (
        normalizedCode === "auth003"
        || normalizedCode === "forbidden"
        || normalizedMessage.includes("không có quyền truy cập")
        || normalizedMessage.includes("khong co quyen truy cap")
        || normalizedMessage.includes("access denied")
        || normalizedMessage.includes("forbidden")
    );
}

export default function MasterPageClient({
    initialUserProfile,
    initialStudios,
    initialSubscription
}: MasterPageClientProps) {
    const t = useTranslations("MasterPage");
    const locale = useLocale();
    const router = useRouter();
    const { toast } = useToast();

    const [userProfile, setUserProfile] = useState<UserProfile | null>(initialUserProfile);
    const [studios, setStudios] = useState<StudioUI[]>(initialStudios);
    const [subscriptionInfo, setSubscriptionInfo] = useState<StudioListSubscription | null>(initialSubscription);
    const [searchQuery, setSearchQuery] = useState("");
    const [studioFilter, setStudioFilter] = useState<"all" | "owned" | "joined" | "archived">("all");
    const [isLoading, setIsLoading] = useState(false);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
    const [isCancelingPendingStudio, setIsCancelingPendingStudio] = useState(false);
    const [leavingStudioId, setLeavingStudioId] = useState<string | null>(null);
    const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
    const [inactiveStudioTarget, setInactiveStudioTarget] = useState<StudioUI | null>(null);
    const [selectedStudio, setSelectedStudio] = useState<StudioUI | null>(null);
    const [leaveTargetStudio, setLeaveTargetStudio] = useState<StudioUI | null>(null);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
        "all-owned": true,
        "all-joined": true,
        "all-archived": true,
        owned: true,
        joined: true,
        archived: true
    });
    const [updatingArchiveStudioId, setUpdatingArchiveStudioId] = useState<string | null>(null);
    const isLoadingRef = useRef(false);
    const hasPendingReloadRef = useRef(false);
    const userProfileRef = useRef<UserProfile | null>(initialUserProfile);
    const lastLoadStartedAtRef = useRef(0);

    useEffect(() => {
        userProfileRef.current = userProfile;
    }, [userProfile]);

    const { ownedStudios, joinedStudios } = useMemo(() => {
        const owned: StudioUI[] = [];
        const joined: StudioUI[] = [];

        studios.forEach((studio) => {
            if (studio.studioRole === 0 && !studio.isArchived) {
                owned.push(studio);
            } else if (!studio.isArchived) {
                joined.push(studio);
            }
        });

        return { ownedStudios: owned, joinedStudios: joined };
    }, [studios]);

    const filteredStudios = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return studios.filter((studio) => {
            if (studioFilter === "owned" && studio.studioRole !== 0) return false;
            if (studioFilter === "joined" && studio.studioRole === 0) return false;
            if (studioFilter === "archived" && !studio.isArchived) return false;

            if (!query) return true;

            return [studio.name, studio.description, studio.alias, studio.tagline]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(query);
        });
    }, [searchQuery, studioFilter, studios]);

    const studioLimit = subscriptionInfo?.studioLimit ?? 3;
    const studioCreated = subscriptionInfo?.studioCreated ?? studios.length;
    const totalStudios = studioCreated;

    const resolveSyntheticPendingStudios = useCallback(
        async (
            requests: { studioId: string; studioName?: string; requestedAt: string }[],
            existingStudioIds: Set<string>
        ) => {
            const results = await Promise.all(
                requests
                    .filter((request) => !existingStudioIds.has(request.studioId))
                    .map(async (request) => {
                        try {
                            const result = await getStudioById(request.studioId, locale);

                            if (result.status === "success") {
                                if (result.data?.isMember === true) {
                                    removePendingStudioJoinRequest(request.studioId);
                                    return null;
                                }

                                return buildPendingStudioCard(request, locale);
                            }

                            if (shouldDropPendingStudio(result.code, result.message)) {
                                removePendingStudioJoinRequest(request.studioId);
                                return null;
                            }

                            if (isPendingStudioAccessDenied(result.code, result.message)) {
                                return buildPendingStudioCard(request, locale);
                            }

                            return buildPendingStudioCard(request, locale);
                        } catch {
                            return buildPendingStudioCard(request, locale);
                        }
                    })
            );

            return results.filter((item): item is StudioUI => !!item);
        },
        [locale]
    );

    const loadData = useCallback(async (options?: { force?: boolean }) => {
        const forceReload = options?.force === true;
        const now = Date.now();
        const elapsedSinceLastStart = now - lastLoadStartedAtRef.current;

        if (!forceReload && elapsedSinceLastStart < 3000) {
            return;
        }

        if (isLoadingRef.current) {
            if (forceReload) {
                hasPendingReloadRef.current = true;
            }
            return;
        }

        isLoadingRef.current = true;
        lastLoadStartedAtRef.current = now;
        hasPendingReloadRef.current = false;
        setIsLoading(true);
        try {
            // Only fetch user profile if not already loaded from initial props
            let resolvedProfile = userProfileRef.current;
            if (!resolvedProfile && initialUserProfile) {
                resolvedProfile = initialUserProfile;
                userProfileRef.current = initialUserProfile;
                setUserProfile(initialUserProfile);
            }

            const studiosResult = await getStudios(locale);

            if (studiosResult.status === "success" && studiosResult.data) {
                const approvedStudios = studiosResult.data.studios.map((studio: StudioUI) => {
                    const isPendingApproval = studio.studioRole === 1 && studio.isMember !== true;

                    if (!isPendingApproval) {
                        removePendingStudioJoinRequest(studio.id);
                    }

                    return {
                        ...studio,
                        isPendingApproval
                    };
                });

                const visibleStudios = approvedStudios.filter(
                    (studio: StudioUI) => studio.studioRole === 0 || studio.isMember === true || studio.isPendingApproval
                );

                // Only resolve pending studios if there are any and we have a profile
                if (visibleStudios.length > 0 && resolvedProfile) {
                    const normalizedUserId = String(resolvedProfile?.userId || "").trim();
                    const normalizedEmail = String(resolvedProfile?.email || "").trim().toLowerCase();
                    const pendingRequests = getPendingStudioJoinRequests().filter((request) => {
                        const wasRejected = consumeRejectedStudioJoinRequest(
                            request.studioId,
                            normalizedUserId || undefined,
                            normalizedEmail || undefined,
                            request.requestedAt
                        );

                        if (wasRejected) {
                            removePendingStudioJoinRequest(request.studioId);
                            return false;
                        }

                        return true;
                    });

                    const existingStudioIds = new Set<string>(visibleStudios.map((studio: StudioUI) => studio.id));
                    const syntheticPendingStudios = await resolveSyntheticPendingStudios(pendingRequests, existingStudioIds);

                    setStudios([...visibleStudios, ...syntheticPendingStudios]);
                } else {
                    setStudios(visibleStudios);
                }

                setSubscriptionInfo(studiosResult.data.subscription);
            } else {
                const existingStudioIds = new Set<string>(mockStudios.map((studio: StudioUI) => studio.id));
                const syntheticPendingStudios: StudioUI[] = [];
                setStudios([...mockStudios, ...syntheticPendingStudios]);
            }
        } catch (error) {
            console.error("Load data failed, using mock data:", error);
            const existingStudioIds = new Set<string>(mockStudios.map((studio: StudioUI) => studio.id));
            const syntheticPendingStudios: StudioUI[] = [];
            setStudios([...mockStudios, ...syntheticPendingStudios]);
        } finally {
            isLoadingRef.current = false;
            setIsLoading(false);

            if (hasPendingReloadRef.current) {
                hasPendingReloadRef.current = false;
                void loadData({ force: true });
            }
        }
    }, [locale, resolveSyntheticPendingStudios, initialUserProfile]);

    useEffect(() => {
        void loadData({ force: true });
    }, [loadData]);

    const handleCreateStudio = async (data: {
        name: string;
        description: string;
        type: string;
        startDate?: string | null;
        endDate?: string | null;
        colorHex?: string | null;
    }) => {
        if (totalStudios >= studioLimit) {
            setIsLimitModalOpen(true);
            return;
        }

        try {
            const studioData = {
                name: data.name.trim(),
                description: data.description.trim(),
                type: data.type as "personal" | "group",
                startDate: data.startDate ?? null,
                endDate: data.endDate ?? null,
                colorHex: data.colorHex ?? null
            };

            const result = await createStudio(studioData, locale);

            if (result.status === "success") {
                toast({ description: t("modal.createSuccess"), variant: "success" });
                setIsCreateModalOpen(false);
                void loadData({ force: true });
            } else {
                toast({
                    description: result.message || t("modal.createError"),
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Create studio failed:", error);
            toast({ description: t("modal.createError"), variant: "destructive" });
        }
    };

    const handleEditStudio = async (data: {
        name: string;
        description: string;
        type: string;
        startDate?: string | null;
        endDate?: string | null;
        colorHex?: string | null;
        avatarUrl?: string | null;
        bannerUrl?: string | null;
        tagline?: string | null;
        alias?: string | null;
    }) => {
        if (!selectedStudio) return;

        try {
            const result = await updateStudio(
                selectedStudio.id,
                {
                    name: data.name,
                    description: data.description,
                    type: data.type as "personal" | "group",
                    startDate: data.startDate ?? null,
                    endDate: data.endDate ?? null,
                    colorHex: data.colorHex ?? null,
                    avatarUrl: data.avatarUrl ?? null,
                    bannerUrl: data.bannerUrl ?? null,
                    tagline: data.tagline ?? null,
                    alias: data.alias ?? null
                },
                locale
            );

            if (result.status === "success") {
                setIsCreateModalOpen(false);
                setSelectedStudio(null);
                void loadData({ force: true });
            } else {
                toast({
                    description: result.message || t("modal.editError"),
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Update studio failed:", error);
            toast({ description: t("modal.editError"), variant: "destructive" });
        }
    };

    const handleDeleteStudio = async () => {
        if (!selectedStudio) return;

        try {
            const result = await deleteStudio(selectedStudio.id, locale);

            if (result.status === "success") {
                toast({ description: t("deleteModal.success"), variant: "success" });
                setIsDeleteModalOpen(false);
                setSelectedStudio(null);
                void loadData({ force: true });
            } else {
                toast({
                    description: result.message || t("deleteModal.error"),
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Delete studio failed:", error);
            toast({ description: t("deleteModal.error"), variant: "destructive" });
        }
    };

    const handleStudioClick = async (studio: StudioUI) => {
        const isOwner = studio.studioRole === 0;

        if (studio.isPendingApproval && !isOwner) {
            return;
        }

        if (!isOwner && studio.isArchived) {
            setInactiveStudioTarget(studio);
            return;
        }

        router.push(`/${locale}/master/${studio.id}`);
    };

    const handleOpenCreateModal = () => {
        setModalMode("create");
        setSelectedStudio(null);
        setIsCreateModalOpen(true);
    };

    const handleOpenEditModal = (studio: StudioUI) => {
        setModalMode("edit");
        setSelectedStudio(studio);
        setIsCreateModalOpen(true);
    };

    const handleOpenDeleteModal = (studio: StudioUI) => {
        setSelectedStudio(studio);
        setIsDeleteModalOpen(true);
    };

    const handleCancelPendingStudio = async (studio: StudioUI) => {
        if (!studio.id || isCancelingPendingStudio) return;

        setIsCancelingPendingStudio(true);
        try {
            const result = await leaveStudio(studio.id, locale);

            if (result.status !== "success") {
                if (shouldDropPendingStudio(result.code, result.message)) {
                    removePendingStudioJoinRequest(studio.id);
                    setStudios((prev) => prev.filter((item) => item.id !== studio.id));
                    return;
                }

                toast({
                    description: result.message || t("pendingStudioCancelError"),
                    variant: "destructive"
                });
                return;
            }

            removePendingStudioJoinRequest(studio.id);
            setStudios((prev) => prev.filter((item) => item.id !== studio.id));
            await loadData({ force: true });
        } catch {
            toast({ description: t("pendingStudioCancelError"), variant: "destructive" });
        } finally {
            setIsCancelingPendingStudio(false);
        }
    };

    const handleOpenLeaveDialog = (studio: StudioUI) => {
        setLeaveTargetStudio(studio);
        setIsLeaveDialogOpen(true);
    };

    const handleLeaveStudio = async () => {
        if (!leaveTargetStudio?.id || leavingStudioId) return;

        setLeavingStudioId(leaveTargetStudio.id);
        try {
            const result = await leaveStudio(leaveTargetStudio.id, locale);

            if (result.status !== "success") {
                return;
            }

            setIsLeaveDialogOpen(false);
            setLeaveTargetStudio(null);
            await loadData({ force: true });
        } catch {
            // Silent fail: leave action intentionally has no toast per UX request.
        } finally {
            setLeavingStudioId(null);
        }
    };

    const handleToggleArchiveStudio = async (studio: StudioUI) => {
        if (!studio.id || updatingArchiveStudioId) return;

        const nextIsArchived = !studio.isArchived;
        setUpdatingArchiveStudioId(studio.id);

        try {
            const result = await toggleStudioArchive(studio.id, nextIsArchived, locale);

            if (result.status !== "success") {
                toast({
                    description: result.message || (nextIsArchived ? "Lưu trữ studio thất bại" : "Mở lại studio thất bại"),
                    variant: "destructive"
                });
                return;
            }

            await loadData({ force: true });
        } catch (error) {
            console.error("Toggle studio archive failed:", error);
            toast({
                description: nextIsArchived ? "Lưu trữ studio thất bại" : "Mở lại studio thất bại",
                variant: "destructive"
            });
        } finally {
            setUpdatingArchiveStudioId(null);
        }
    };

    const toggleSection = useCallback((sectionKey: string) => {
        setCollapsedSections((prev) => ({
            ...prev,
            [sectionKey]: !prev[sectionKey]
        }));
    }, []);

    const renderStudioSection = (sectionKey: string, title: string, studioList: StudioUI[]) => {
        if (studioList.length === 0) return null;

        const sectionIcon =
            sectionKey.includes("archived") ? Archive : sectionKey.includes("joined") ? Users2 : FolderKanban;

        return (
            <div className="mb-10">
                <StudioBoardSection
                    sectionKey={sectionKey}
                    title={title}
                    count={studioList.length}
                    icon={sectionIcon}
                    collapsed={!!collapsedSections[sectionKey]}
                    onToggle={toggleSection}>
                    <motion.div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
                        <AnimatePresence initial={false}>
                            {studioList.map((studio) => (
                                <StudioCard
                                    key={studio.id}
                                    studio={studio}
                                    onClick={() => handleStudioClick(studio)}
                                    onEdit={() => handleOpenEditModal(studio)}
                                    onDelete={() => handleOpenDeleteModal(studio)}
                                    onToggleArchive={() => {
                                        void handleToggleArchiveStudio(studio);
                                    }}
                                    onLeave={() => {
                                        handleOpenLeaveDialog(studio);
                                    }}
                                    onCancelPendingRequest={() => {
                                        void handleCancelPendingStudio(studio);
                                    }}
                                    pendingCancelLoading={isCancelingPendingStudio && studio.isPendingApproval}
                                    isLeavingLoading={leavingStudioId === studio.id}
                                    isArchiveUpdating={updatingArchiveStudioId === studio.id}
                                    canEdit={studio.studioRole === 0}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                </StudioBoardSection>
            </div>
        );
    };

    const hasNoResults = filteredStudios.length === 0;
    const managedStudiosForAll = useMemo(
        () => filteredStudios.filter((studio) => studio.studioRole === 0 && !studio.isArchived),
        [filteredStudios]
    );
    const archivedStudiosForAll = useMemo(
        () => filteredStudios.filter((studio) => studio.isArchived),
        [filteredStudios]
    );
    const joinedStudiosForAll = useMemo(
        () => filteredStudios.filter((studio) => studio.studioRole !== 0 && !studio.isArchived),
        [filteredStudios]
    );

    return (
        <div className="h-screen overflow-hidden bg-white text-[#261E33]">
            <div className="flex h-full">
                <DashboardSidebar />

                <main className="relative h-screen flex-1 overflow-y-auto overflow-x-hidden bg-white">
                    <FloatingOrb className="left-[-120px] top-[-40px] h-72 w-72 bg-orange-200/25" />
                    <FloatingOrb className="right-[-100px] top-[12%] h-80 w-80 bg-violet-200/20" />
                    <Header userProfile={userProfile} />

                    <Container>
                        <div className="py-6">
                            <motion.div
                                initial={{ opacity: 0, y: 18 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35 }}
                                className="relative mb-6 overflow-hidden rounded-[38px] border border-white/70 bg-white/72 px-6 py-7 shadow-[0_28px_90px_rgba(15,23,42,0.06)] backdrop-blur-2xl sm:px-8 sm:py-8">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,190,140,0.20),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(196,181,253,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.68),rgba(255,248,242,0.56))]" />
                                <div className="absolute inset-x-0 top-0 h-px bg-white/90" />

                                <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                                    <div className="max-w-3xl">
                                        <motion.div
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.05 }}
                                            className="inline-flex items-center gap-2 rounded-full border border-orange-100/80 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700 shadow-sm">
                                            {t("detail.workspaceBadge")}
                                        </motion.div>

                                        <motion.h1
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.08 }}
                                            className="mt-4 bg-[linear-gradient(135deg,#261E33_0%,#7C3AED_55%,#FF5F3D_100%)] bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-[40px]">
                                            {t("title")}
                                        </motion.h1>

                                        <motion.p
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.12 }}
                                            className="mt-3 max-w-2xl text-[15px] leading-7 text-[#6F6B99]">
                                            {t("subtitle")}
                                        </motion.p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:min-w-[520px]">
                                        <motion.div
                                            whileHover={{ y: -3 }}
                                            className="rounded-[24px] border border-white/80 bg-white/84 p-4 shadow-sm">
                                            <p className="text-xs text-[#8B7768]">{t("yourStudios")}</p>
                                            <p className="mt-2 text-[28px] font-semibold text-[#261E33]">
                                                {ownedStudios.length}
                                            </p>
                                        </motion.div>

                                        <motion.div
                                            whileHover={{ y: -3 }}
                                            className="rounded-[24px] border border-white/80 bg-white/84 p-4 shadow-sm">
                                            <p className="text-xs text-[#8B7768]">{t("joinedStudios")}</p>
                                            <p className="mt-2 text-[28px] font-semibold text-[#261E33]">
                                                {joinedStudios.length}
                                            </p>
                                        </motion.div>

                                        <motion.div
                                            whileHover={{ y: -3 }}
                                            className="rounded-[24px] border border-orange-200/80 bg-[linear-gradient(180deg,rgba(255,247,241,0.98),rgba(255,236,224,0.92))] p-4 shadow-sm">
                                            <div>
                                                <p className="text-xs text-[#8B7768]">{t("studiosUsed")}</p>
                                                <p className="mt-2 text-[28px] font-semibold text-[#261E33]">
                                                    {totalStudios}/{studioLimit}
                                                </p>
                                            </div>
                                        </motion.div>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.08, duration: 0.35 }}
                                className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex flex-1 flex-col gap-3 xl:flex-row xl:items-center xl:gap-4">
                                    <div className="relative w-full rounded-[22px] border border-slate-200/80 bg-slate-50/80 xl:max-w-[360px]">
                                        <Input
                                            type="text"
                                            placeholder={t("searchPlaceholder")}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="h-14 rounded-[22px] border-transparent bg-transparent pl-12 pr-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] backdrop-blur transition-all duration-200 focus:scale-[1.01] focus:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
                                        />
                                        <svg
                                            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                            />
                                        </svg>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 xl:flex-1">
                                        {[
                                            { value: "all" as const, label: t("filters.all") },
                                            { value: "owned" as const, label: t("filters.owned") },
                                            { value: "joined" as const, label: t("filters.joined") },
                                            { value: "archived" as const, label: t("filters.archived") }
                                        ].map((item) => (
                                            <button
                                                key={item.value}
                                                type="button"
                                                onClick={() => setStudioFilter(item.value)}
                                                className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all ${
                                                    studioFilter === item.value
                                                        ? "bg-[linear-gradient(135deg,#E6492D_0%,#FF5A36_55%,#FF6B45_100%)] text-white shadow-[0_12px_28px_rgba(230,73,45,0.24)]"
                                                        : "border border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                                                }`}>
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                    <Button
                                        onClick={handleOpenCreateModal}
                                        className="h-14 rounded-[22px] bg-[linear-gradient(135deg,#D93F21_0%,#F24E2E_55%,#FF603A_100%)] px-6 font-semibold text-white shadow-[0_18px_36px_rgba(217,63,33,0.38)] transition-all duration-200 hover:scale-[1.02] hover:brightness-110 hover:shadow-[0_24px_44px_rgba(217,63,33,0.46)] active:scale-[0.98]">
                                        {t("createButton")}
                                    </Button>
                                </motion.div>
                            </motion.div>

                            <AnimatePresence mode="wait">
                                {isLoading ? (
                                    <motion.div
                                        key="loading"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}>
                                        <LoadingState />
                                    </motion.div>
                                ) : hasNoResults ? (
                                    <motion.div
                                        key="empty"
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}>
                                        <EmptyState message={searchQuery ? t("noSearchResults") : t("noStudios")} />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="content"
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}>
                                        {studioFilter === "all" ? (
                                            <div className="space-y-8">
                                                {renderStudioSection("all-owned", t("yourStudios"), managedStudiosForAll)}
                                                {renderStudioSection("all-joined", t("joinedStudios"), joinedStudiosForAll)}
                                                {renderStudioSection("all-archived", t("archivedStudios"), archivedStudiosForAll)}
                                            </div>
                                        ) : studioFilter === "owned" ? (
                                            renderStudioSection("owned", t("yourStudios"), filteredStudios)
                                        ) : studioFilter === "joined" ? (
                                            renderStudioSection("joined", t("joinedStudios"), filteredStudios)
                                        ) : (
                                            renderStudioSection("archived", t("archivedStudios"), filteredStudios)
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </Container>
                </main>
            </div>

            <StudioModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={modalMode === "create" ? handleCreateStudio : handleEditStudio}
                studio={selectedStudio}
                mode={modalMode}
                existingStudios={studios}
            />

            <DeleteConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteStudio}
                studioName={selectedStudio?.name || ""}
            />

            <StudioLimitModal
                isOpen={isLimitModalOpen}
                onClose={() => setIsLimitModalOpen(false)}
                studioLimit={studioLimit}
            />

            <AlertDialog
                open={isLeaveDialogOpen}
                onOpenChange={(open) => {
                    setIsLeaveDialogOpen(open);
                    if (!open && !leavingStudioId) {
                        setLeaveTargetStudio(null);
                    }
                }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("leaveStudioTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("leaveStudioDescription", {
                                studioName: leaveTargetStudio?.name || ""
                            })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={!!leavingStudioId}>
                            {t("leaveStudioCancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-[#D93F21] text-white hover:bg-[#BC341B] focus-visible:ring-[#D93F21]/30"
                            disabled={!!leavingStudioId}
                            onClick={(e) => {
                                e.preventDefault();
                                void handleLeaveStudio();
                            }}>
                            {t("leaveStudioConfirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={!!inactiveStudioTarget}
                onOpenChange={(open) => {
                    if (!open) setInactiveStudioTarget(null);
                }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("inactiveStudioTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("inactiveStudioDescription", {
                                studioName: inactiveStudioTarget?.name || ""
                            })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                setInactiveStudioTarget(null);
                            }}>
                            {t("inactiveStudioOk")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    );
}
