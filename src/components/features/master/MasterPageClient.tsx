"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
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

const gradientBackgrounds = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
    "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
    "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)"
];

function getGradientBackground(name: string, _index: number): string {
    const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return gradientBackgrounds[hash % gradientBackgrounds.length];
}

function getStudioDisplayLetter(name: string): string {
    const trimmed = name.trim();

    if (!trimmed) return "S";

    const firstChar = trimmed.charAt(0).toUpperCase();

    return firstChar
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace("Đ", "D");
}

function FloatingOrb({ className }: { className: string }) {
    return <div className={`pointer-events-none absolute rounded-full blur-3xl ${className}`} />;
}

interface StudioCardProps {
    studio: StudioUI;
    index: number;
    onClick: () => void;
    onEdit: () => void;
    onDelete: () => void;
    canEdit: boolean;
}

function StudioCard({ studio, index, onClick, onEdit, onDelete, canEdit }: StudioCardProps) {
    const t = useTranslations("MasterPage");
    const gradient = getGradientBackground(studio.name, index);
    const firstLetter = getStudioDisplayLetter(studio.name);
    const isOwner = studio.studioRole === 0;

    return (
        <div
            role="button"
            tabIndex={0}
            className="group relative cursor-pointer overflow-hidden rounded-[30px] border border-white/70 bg-white/82 text-left shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1.5 hover:border-[#FF5F3D]/35 hover:shadow-[0_30px_70px_rgba(255,95,61,0.16)] focus:outline-none focus:ring-2 focus:ring-[#FF5F3D]"
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onClick();
                }
            }}
        >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.24),rgba(255,255,255,0.04))]" />

            <div
                className="relative h-32 overflow-visible px-5 pt-5"
                style={{ background: gradient }}
            >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.36),transparent_36%)]" />
                <div className="absolute inset-x-0 top-0 h-px bg-white/40" />
                <div className="absolute right-[-24px] top-[-20px] h-28 w-28 rounded-full bg-white/15 blur-2xl" />

                <div className="relative flex items-start justify-between gap-3">
                    <div className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/95 backdrop-blur">
                        Studio
                    </div>

                    {studio.studioRole !== undefined && (
                        <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white shadow-sm ${isOwner
                                ? "bg-gradient-to-r from-orange-500 to-red-500"
                                : "bg-gradient-to-r from-teal-500 to-cyan-500"
                                }`}
                        >
                            {isOwner ? t("roles.owner") : t("roles.member")}
                        </span>
                    )}
                </div>

                <div className="absolute bottom-[-24px] left-5 z-10 flex h-16 w-16 items-center justify-center rounded-[20px] border border-white/85 bg-white text-[28px] font-bold text-[#261E33] shadow-[0_14px_28px_rgba(15,23,42,0.14)]">
                    {firstLetter}
                </div>
            </div>

            <div className="mt-10 p-5 pt-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="truncate text-[19px] font-semibold text-[#261E33] transition group-hover:text-[#FF5F3D]">
                            {studio.name}
                        </h3>
                        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-[#6F6B99]">
                            {studio.description}
                        </p>
                    </div>

                    {canEdit && (
                        <div className="flex shrink-0 gap-2 opacity-0 transition-all duration-200 group-hover:opacity-100">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit();
                                }}
                                className="rounded-xl border border-gray-200 bg-white/95 p-2 shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-50"
                                title="Edit"
                            >
                                <svg
                                    className="h-4 w-4 text-gray-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                </svg>
                            </button>

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete();
                                }}
                                className="rounded-xl border border-red-100 bg-white/95 p-2 shadow-sm transition hover:-translate-y-0.5 hover:bg-red-50"
                                title="Delete"
                            >
                                <svg
                                    className="h-4 w-4 text-red-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-[20px] border border-[#F1EBE6] bg-[linear-gradient(180deg,#FFFFFF_0%,#FBFAF8_100%)] px-4 py-3 shadow-sm">
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
                    </div>

                    <div className="rounded-[20px] border border-[#F1EBE6] bg-[linear-gradient(180deg,#FFFFFF_0%,#FBFAF8_100%)] px-4 py-3 shadow-sm">
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
                    </div>
                </div>
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
    const usagePercent = Math.min(100, (totalStudios / studioLimit) * 100);

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
                endDate: data.endDate ?? null
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
                    endDate: data.endDate ?? null
                },
                locale
            );

            if (result.status === "success") {
                toast({ description: t("modal.editSuccess"), variant: "success" });
                setIsCreateModalOpen(false);
                setSelectedStudio(null);
                loadData();
            } else {
                const updatedStudios = studios.map((s) =>
                    s.id === selectedStudio.id
                        ? {
                            ...s,
                            name: data.name,
                            description: data.description,
                            type: data.type as "personal" | "group",
                            updatedAt: new Date().toISOString()
                        }
                        : s
                );
                setStudios(updatedStudios);
                toast({ description: t("modal.editSuccess"), variant: "success" });
                setIsCreateModalOpen(false);
                setSelectedStudio(null);
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
                const updatedStudios = studios.filter((s) => s.id !== selectedStudio.id);
                setStudios(updatedStudios);
                toast({ description: t("deleteModal.success"), variant: "success" });
                setIsDeleteModalOpen(false);
                setSelectedStudio(null);
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
                <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <h2 className="font-semibold text-[#261E33] text-[22px]">{title}</h2>
                        <span className="rounded-full border border-[#ECE7E2] bg-white px-3 py-1 text-[#6F6B99] text-sm shadow-sm">
                            {studioList.length}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-3">
                    {studioList.map((studio, index) => (
                        <StudioCard
                            key={studio.id}
                            studio={studio}
                            index={index}
                            onClick={() => handleStudioClick(studio)}
                            onEdit={() => handleOpenEditModal(studio)}
                            onDelete={() => handleOpenDeleteModal(studio)}
                            canEdit={studio.studioRole === 0}
                        />
                    ))}
                </div>
            </div>
        );
    };

    const hasOwnedStudios = filteredOwnedStudios.length > 0;
    const hasJoinedStudios = filteredJoinedStudios.length > 0;
    const hasNoResults = !(hasOwnedStudios || hasJoinedStudios);

    return (
        <div className="min-h-screen bg-[linear-gradient(180deg,#FAFAFB_0%,#F7F8FA_100%)] text-[#261E33]">
            <div className="flex min-h-screen">
                <DashboardSidebar />
                <main className="relative flex-1 overflow-hidden">
                    <FloatingOrb className="left-[-120px] top-[-40px] h-72 w-72 bg-orange-200/25" />
                    <FloatingOrb className="right-[-100px] top-[12%] h-80 w-80 bg-violet-200/20" />
                    <FloatingOrb className="bottom-[-120px] left-[15%] h-80 w-80 bg-sky-200/15" />

                    <Header userProfile={userProfile} />

                    <Container>
                        <div className="py-6">
                            <div className="mb-6 relative overflow-hidden rounded-[38px] border border-white/70 bg-white/72 px-6 py-7 shadow-[0_28px_90px_rgba(15,23,42,0.06)] backdrop-blur-2xl sm:px-8 sm:py-8">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,190,140,0.20),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(196,181,253,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.68),rgba(255,248,242,0.56))]" />
                                <div className="absolute inset-x-0 top-0 h-px bg-white/90" />

                                <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                                    <div className="max-w-3xl">
                                        <div className="inline-flex items-center gap-2 rounded-full border border-orange-100/80 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700 shadow-sm">
                                            Studio workspace
                                        </div>
                                        <h1 className="mt-4 bg-[linear-gradient(135deg,#261E33_0%,#7C3AED_55%,#FF5F3D_100%)] bg-clip-text font-bold text-3xl tracking-tight text-transparent sm:text-[40px]">
                                            {t("title")}
                                        </h1>
                                        <p className="mt-3 max-w-2xl text-[#6F6B99] text-[15px] leading-7">
                                            {t("subtitle")}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:min-w-[480px]">
                                        <div className="rounded-[24px] border border-white/80 bg-white/84 p-4 shadow-sm">
                                            <p className="text-[#8B7768] text-xs">{t("yourStudios")}</p>
                                            <p className="mt-2 font-semibold text-[#261E33] text-[28px]">
                                                {ownedStudios.length}
                                            </p>
                                        </div>
                                        <div className="rounded-[24px] border border-white/80 bg-white/84 p-4 shadow-sm">
                                            <p className="text-[#8B7768] text-xs">{t("joinedStudios")}</p>
                                            <p className="mt-2 font-semibold text-[#261E33] text-[28px]">
                                                {joinedStudios.length}
                                            </p>
                                        </div>
                                        <div className="rounded-[24px] border border-orange-200/80 bg-[linear-gradient(180deg,rgba(255,247,241,0.98),rgba(255,236,224,0.92))] p-4 shadow-sm">
                                            <p className="text-[#8B7768] text-xs">{t("studiosUsed")}</p>
                                            <p className="mt-2 font-semibold text-[#261E33] text-[28px]">
                                                {totalStudios}/{studioLimit}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="relative flex-1 lg:max-w-lg">
                                    <Input
                                        type="text"
                                        placeholder={t("searchPlaceholder")}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="h-13 rounded-[22px] border-white/80 bg-white/82 pl-12 shadow-[0_12px_28px_rgba(15,23,42,0.04)] backdrop-blur"
                                    />
                                    <svg
                                        className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
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

                                <Button
                                    onClick={handleOpenCreateModal}
                                    className="h-13 rounded-[22px] bg-[linear-gradient(135deg,#FF5F3D_0%,#FF7A59_100%)] px-6 text-white shadow-[0_16px_32px_rgba(255,95,61,0.24)] transition hover:brightness-105">
                                    {t("createButton")}
                                </Button>
                            </div>

                            <div className="mb-8 rounded-[30px] border border-white/80 bg-white/82 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur-xl">
                                <div className="mb-4 flex items-start gap-3">
                                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
                                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path
                                                fillRule="evenodd"
                                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </div>
                                    <p className="text-[#6F6B99] text-sm leading-6">{t("infoBanner")}</p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium text-[#261E33]">
                                            {totalStudios}/{studioLimit} {t("studiosUsed")}
                                        </span>
                                        <span className="rounded-full bg-[#F7F4F1] px-2.5 py-1 text-[#6F6B99] text-xs">
                                            {Math.round(usagePercent)}%
                                        </span>
                                    </div>

                                    <div className="h-3 w-full overflow-hidden rounded-full bg-[#EEE9E4]">
                                        <div
                                            className="h-full rounded-full bg-[linear-gradient(90deg,#FF5F3D_0%,#FF8C66_100%)] transition-all duration-300"
                                            style={{ width: `${usagePercent}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {isLoading ? (
                                <div className="flex items-center justify-center py-24">
                                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#FF5F3D]" />
                                </div>
                            ) : hasNoResults ? (
                                <div className="rounded-[30px] border border-white/80 bg-white/82 p-16 text-center shadow-sm backdrop-blur">
                                    <p className="text-[#6F6B99] text-[15px]">
                                        {searchQuery ? t("noSearchResults") : t("noStudios")}
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    {renderStudioSection(t("yourStudios"), filteredOwnedStudios)}
                                    {renderStudioSection(t("joinedStudios"), filteredJoinedStudios)}
                                </div>
                            )}
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