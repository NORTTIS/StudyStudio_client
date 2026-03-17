"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createStudio, deleteStudio, getStudios, type StudioListSubscription, type StudioUI, updateStudio } from "@/api/studios";
import { getUserProfile, type UserProfile } from "@/api/user-profile";
import { Container } from "@/components/common";
import { DeleteConfirmModal } from "@/components/features/master/DeleteConfirmModal";
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

// Gradient backgrounds for studio cards
const gradientBackgrounds = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
    "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
    "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
];

function getGradientBackground(name: string, index: number): string {
    // Generate a consistent gradient based on studio name
    const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return gradientBackgrounds[hash % gradientBackgrounds.length];
}

// Studio Card Component
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
    const firstLetter = studio.name.charAt(0).toUpperCase();
    const isOwner = studio.studioRole === 0;

    return (
        <button
            type="button"
            className="group cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white text-left transition-all hover:border-[#FF5F3D] hover:shadow-lg"
            onClick={onClick}>
            {/* Gradient Header */}
            <div
                className="relative h-24 p-5"
                style={{ background: gradient }}>
                {/* First Letter Avatar */}
                <div className="absolute bottom-[-24px] left-5 flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl font-bold text-gray-700 shadow-md">
                    {firstLetter}
                </div>
                {/* Role Badge */}
                <div className="absolute bottom-[-24px] right-5">
                    {studio.studioRole !== undefined && (
                        <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${
                                isOwner
                                    ? "bg-gradient-to-r from-orange-500 to-red-500"
                                    : "bg-gradient-to-r from-teal-500 to-cyan-500"
                            }`}>
                            {isOwner ? t("roles.owner") : t("roles.member")}
                        </span>
                    )}
                </div>
            </div>
            {/* Content */}
            <div className="mt-8 p-5 pt-4">
                <div className="mb-3 flex items-start justify-between">
                    <h3 className="font-semibold text-[#261E33] text-lg group-hover:text-[#FF5F3D]">
                        {studio.name}
                    </h3>
                    {canEdit && (
                        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit();
                                }}
                                className="rounded p-1 hover:bg-gray-100"
                                title="Edit">
                                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete();
                                }}
                                className="rounded p-1 hover:bg-gray-100"
                                title="Delete">
                                <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
                <p className="mb-4 line-clamp-2 text-[#6F6B99] text-sm">{studio.description}</p>
                <div className="flex items-center gap-4 border-gray-100 border-t pt-4 text-[#6F6B99] text-sm">
                    <div className="flex items-center gap-1.5">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <span>
                            {studio.groupCount} {t("groups")}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>
                            {studio.memberCount} {t("members")}
                        </span>
                    </div>
                </div>
            </div>
        </button>
    );
}

export default function MasterPageClient({ initialUserProfile, initialStudios, initialSubscription }: MasterPageClientProps) {
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
    const [selectedStudio, setSelectedStudio] = useState<StudioUI | null>(null);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");

    // Separate studios by role
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

    // Filtered studios based on search
    const { filteredOwnedStudios, filteredJoinedStudios } = useMemo(() => {
        if (!searchQuery.trim()) {
            return { filteredOwnedStudios: ownedStudios, filteredJoinedStudios: joinedStudios };
        }

        const query = searchQuery.toLowerCase();
        const filterFn = (studio: StudioUI) =>
            studio.name.toLowerCase().includes(query) || studio.description.toLowerCase().includes(query);

        return {
            filteredOwnedStudios: ownedStudios.filter(filterFn),
            filteredJoinedStudios: joinedStudios.filter(filterFn),
        };
    }, [searchQuery, ownedStudios, joinedStudios]);

    // Total studios count (owned only for limit) - use subscription data if available
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

    const handleCreateStudio = async (data: { name: string; description: string; type: string }) => {
        if (totalStudios >= studioLimit) {
            toast({
                description: t("modal.limitReached") || `Bạn đã đạt giới hạn ${studioLimit} studio`,
                variant: "destructive"
            });
            return;
        }

        try {
            const studioData = {
                name: data.name.trim(),
                description: data.description.trim(),
                type: data.type as "personal" | "group"
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

    const handleEditStudio = async (data: { name: string; description: string; type: string }) => {
        if (!selectedStudio) return;

        try {
            const result = await updateStudio(
                selectedStudio.id,
                {
                    name: data.name,
                    description: data.description,
                    type: data.type as "personal" | "group"
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

    // Render studio grid section
    const renderStudioSection = (
        title: string,
        studioList: StudioUI[],
        emptyMessage: string
    ) => {
        if (studioList.length === 0) return null;

        return (
            <div className="mb-8">
                <h2 className="mb-4 font-semibold text-xl text-[#261E33]">{title}</h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
    const hasNoResults = !hasOwnedStudios && !hasJoinedStudios;

    return (
        <div className="min-h-screen bg-[#F8F8F8] text-[#261E33]">
            <div className="flex min-h-screen">
                <DashboardSidebar />
                <main className="flex-1">
                    <Header userProfile={userProfile} />
                    <Container>
                        <div className="mb-8">
                            <h1 className="mb-2 font-bold text-3xl text-[#261E33]">{t("title")}</h1>
                            <p className="text-[#6F6B99]">{t("subtitle")}</p>
                        </div>
                        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="relative flex-1 sm:max-w-md">
                                <Input
                                    type="text"
                                    placeholder={t("searchPlaceholder")}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                                <svg
                                    className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400"
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
                            <Button onClick={handleOpenCreateModal} className="bg-[#FF5F3D] hover:bg-[#ff4620]">
                                {t("createButton")}
                            </Button>
                        </div>
                        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
                            <div className="mb-4 flex items-start gap-3">
                                <svg
                                    className="mt-0.5 h-5 w-5 shrink-0 text-blue-500"
                                    fill="currentColor"
                                    viewBox="0 0 20 20">
                                    <path
                                        fillRule="evenodd"
                                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <p className="text-[#6F6B99] text-sm">{t("infoBanner")}</p>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-[#261E33]">
                                        {totalStudios}/{studioLimit} {t("studiosUsed")}
                                    </span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                                    <div
                                        className="h-full bg-[#FF5F3D] transition-all duration-300"
                                        style={{ width: `${(totalStudios / studioLimit) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#FF5F3D]" />
                            </div>
                        ) : hasNoResults ? (
                            <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
                                <p className="text-[#6F6B99]">{searchQuery ? t("noSearchResults") : t("noStudios")}</p>
                            </div>
                        ) : (
                            <div>
                                {renderStudioSection(t("yourStudios"), filteredOwnedStudios, t("noStudios"))}
                                {renderStudioSection(t("joinedStudios"), filteredJoinedStudios, t("noStudios"))}
                            </div>
                        )}
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
        </div>
    );
}
