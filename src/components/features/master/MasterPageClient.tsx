"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    createStudio,
    deleteStudio,
    getStudios,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { mockStudios } from "@/mocks/studios-data";

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

function SectionHeader({ title, count }: { title: string; count: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.35 }}
            className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
                <h2 className="text-[22px] font-semibold text-[#261E33]">{title}</h2>
                <span className="rounded-full border border-[#ECE7E2] bg-white px-3 py-1 text-sm text-[#6F6B99] shadow-sm">
                    {count}
                </span>
            </div>
        </motion.div>
    );
}

interface StudioCardProps {
    studio: StudioUI;
    onClick: () => void;
    onEdit: () => void;
    onDelete: () => void;
    canEdit: boolean;
}

function StudioCard({ studio, onClick, onEdit, onDelete, canEdit }: StudioCardProps) {
    const t = useTranslations("MasterPage");
    const gradient = getColorGradient(studio.colorHex);
    const hoverShadow = getHoverShadow(studio.colorHex);
    const focusRing = getFocusRing(studio.colorHex);
    const isOwner = studio.studioRole === 0;
    const [isHovered, setIsHovered] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const cardShadow = isHovered || isFocused ? hoverShadow : "0 20px 60px rgba(15,23,42,0.06)";
    const borderColor = isHovered ? `${studio.colorHex || "#FF5F3D"}35` : "rgba(255,255,255,0.72)";

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -7 }}
            role="button"
            tabIndex={0}
            className="group relative cursor-pointer overflow-hidden rounded-[30px] border bg-white/82 text-left backdrop-blur-2xl transition-all duration-300"
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
                className="relative h-36 overflow-visible px-5 pt-5"
                style={{
                    background: studio.bannerUrl
                        ? `url(${studio.bannerUrl}) center/cover no-repeat`
                        : gradient
                }}
            >
                {studio.bannerUrl && <div className="absolute inset-0 bg-black/10" />}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.36),transparent_36%)]" />
                <div className="absolute inset-x-0 top-0 h-px bg-white/40" />
                <motion.div
                    className="absolute right-[-24px] top-[-20px] h-28 w-28 rounded-full bg-white/15 blur-2xl"
                    animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                />

                <div className="relative flex items-start justify-between gap-3">
                     {studio.alias ? (
                                <span
                                    className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
                                    style={{
                                        backgroundColor: `white`,
                                        borderColor: `${studio.colorHex ?? "#FF5F3D"}40`,
                                        color: studio.colorHex ?? "#FF5F3D"
                                    }}>
                                    {studio.alias}
                                </span>
                            ) : (<div className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/95 backdrop-blur">
                        Studio
                    </div>)}
                    

                    {studio.studioRole !== undefined && (
                        <motion.div whileHover={{ scale: 1.04 }}>
                            <RolePill role={isOwner ? "owner" : "member"} />
                        </motion.div>
                    )}
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

            <div className="mt-10 p-5 pt-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-[19px] font-semibold text-[#261E33] transition duration-300 group-hover:text-[#FF5F3D]">
                                {studio.name}
                            </h3>
                        </div>
                        {studio.tagline ? (
                            <p className="mt-1 italic text-[#9B8CA8] text-xs">{studio.tagline}</p>
                        ) : null}
                        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-[#6F6B99]">{studio.description}</p>
                    </div>

                    {canEdit && (
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
                                    onEdit();
                                }}
                                className="rounded-xl border border-gray-200 bg-white/95 p-2 shadow-sm transition hover:bg-gray-50"
                                title="Edit">
                                <svg
                                    className="h-4 w-4 text-gray-500"
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
                                className="rounded-xl border border-red-100 bg-white/95 p-2 shadow-sm transition hover:bg-red-50"
                                title="Delete">
                                <svg
                                    className="h-4 w-4 text-red-500"
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
                        </motion.div>
                    )}
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
    const [isLoading, setIsLoading] = useState(false);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
    const [selectedStudio, setSelectedStudio] = useState<StudioUI | null>(null);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");

    const { ownedStudios, joinedStudios } = useMemo(() => {
        const owned: StudioUI[] = [];
        const joined: StudioUI[] = [];

        studios.forEach((studio) => {
            if (studio.studioRole === 0) {
                owned.push(studio);
            } else {
                joined.push(studio);
            }
        });

        return { ownedStudios: owned, joinedStudios: joined };
    }, [studios]);

    const { filteredOwnedStudios, filteredJoinedStudios } = useMemo(() => {
        if (!searchQuery.trim()) {
            return { filteredOwnedStudios: ownedStudios, filteredJoinedStudios: joinedStudios };
        }

        const query = searchQuery.toLowerCase();
        const filterFn = (studio: StudioUI) =>
            studio.name.toLowerCase().includes(query) || studio.description.toLowerCase().includes(query);

        return {
            filteredOwnedStudios: ownedStudios.filter(filterFn),
            filteredJoinedStudios: joinedStudios.filter(filterFn)
        };
    }, [searchQuery, ownedStudios, joinedStudios]);

    const studioLimit = subscriptionInfo?.studioLimit ?? 3;
    const studioCreated = subscriptionInfo?.studioCreated ?? studios.length;
    const totalStudios = studioCreated;

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const profileResult = await getUserProfile(locale);
            if (profileResult.status === "success" && profileResult.data) {
                setUserProfile(profileResult.data);
            }

            const studiosResult = await getStudios(locale);
            if (studiosResult.status === "success" && studiosResult.data) {
                setStudios(studiosResult.data.studios);
                setSubscriptionInfo(studiosResult.data.subscription);
            } else {
                setStudios(mockStudios);
            }
        } catch (error) {
            console.error("Load data failed, using mock data:", error);
            setStudios(mockStudios);
        } finally {
            setIsLoading(false);
        }
    }, [locale]);

    useEffect(() => {
        loadData();
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
                loadData();
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
                loadData();
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
                loadData();
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

    const renderStudioSection = (title: string, studioList: StudioUI[]) => {
        if (studioList.length === 0) return null;

        return (
            <div className="mb-10">
                <SectionHeader title={title} count={studioList.length} />

                <motion.div layout className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-3">
                    <AnimatePresence>
                        {studioList.map((studio) => (
                            <StudioCard
                                key={studio.id}
                                studio={studio}
                                onClick={() => handleStudioClick(studio)}
                                onEdit={() => handleOpenEditModal(studio)}
                                onDelete={() => handleOpenDeleteModal(studio)}
                                canEdit={studio.studioRole === 0}
                            />
                        ))}
                    </AnimatePresence>
                </motion.div>
            </div>
        );
    };

    const hasOwnedStudios = filteredOwnedStudios.length > 0;
    const hasJoinedStudios = filteredJoinedStudios.length > 0;
    const hasNoResults = !(hasOwnedStudios || hasJoinedStudios);

    return (
        <div className="h-screen overflow-hidden bg-[linear-gradient(180deg,#FAFAFB_0%,#F7F8FA_100%)] text-[#261E33]">
            <div className="flex h-full">
                <DashboardSidebar />

                <main className="relative h-screen flex-1 overflow-y-auto overflow-x-hidden">
                    <FloatingOrb className="left-[-120px] top-[-40px] h-72 w-72 bg-orange-200/25" />
                    <FloatingOrb className="right-[-100px] top-[12%] h-80 w-80 bg-violet-200/20" />
                    <FloatingOrb className="bottom-[-120px] left-[15%] h-80 w-80 bg-sky-200/15" />

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
                                <div className="relative flex-1 rounded-[22px] border border-slate-200/80 bg-slate-50/80 lg:max-w-xl">
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
                                        {renderStudioSection(t("yourStudios"), filteredOwnedStudios)}
                                        {renderStudioSection(t("joinedStudios"), filteredJoinedStudios)}
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
        </div>
    );
}
