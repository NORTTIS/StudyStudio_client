"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { createStudio, deleteStudio, getStudios, type StudioUI, updateStudio } from "@/api/studios";
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

export default function MasterPage() {
    const t = useTranslations("MasterPage");
    const locale = useLocale();
    const router = useRouter();
    const { toast } = useToast();

    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [studios, setStudios] = useState<StudioUI[]>([]);
    const [filteredStudios, setFilteredStudios] = useState<StudioUI[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedStudio, setSelectedStudio] = useState<StudioUI | null>(null);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const profileResult = await getUserProfile(locale);
            if (profileResult.status === "success" && profileResult.data) {
                setUserProfile(profileResult.data);
            }

            const studiosResult = await getStudios(locale);
            if (studiosResult.status === "success" && studiosResult.data) {
                // API trả về array trực tiếp
                const studiosArray = Array.isArray(studiosResult.data) ? studiosResult.data : [];
                setStudios(studiosArray);
                setFilteredStudios(studiosArray);
            } else {
                console.log("Using mock studios data");
                setStudios(mockStudios);
                setFilteredStudios(mockStudios);
            }
        } catch (error) {
            console.error("Load data failed, using mock data:", error);
            setStudios(mockStudios);
            setFilteredStudios(mockStudios);
        } finally {
            setIsLoading(false);
        }
    }, [locale]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Filter studios based on search query
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredStudios(studios);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = studios.filter(
                (studio) =>
                    studio.name.toLowerCase().includes(query) || studio.description.toLowerCase().includes(query)
            );
            setFilteredStudios(filtered);
        }
    }, [searchQuery, studios]);

    const handleCreateStudio = async (data: { name: string; description: string; type: string }) => {
        // Check if reached limit
        if (studios.length >= 3) {
            toast({
                description: t("modal.limitReached") || "Bạn đã đạt giới hạn 3 studio",
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
                // Show error message from API
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
                loadData(); // Reload data from API
            } else {
                // Fallback to local update if API fails
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
                loadData(); // Reload data from API
            } else {
                // Fallback to local delete if API fails
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
        // Navigate to detail page instead of opening modal
        router.push(`/${locale}/master/${studio.id}`);
    };

    const handleOpenCreateModal = () => {
        setModalMode("create");
        setSelectedStudio(null);
        setIsCreateModalOpen(true);
    };

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
                                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500"
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
                                        {studios.length}/3 {t("studiosUsed")}
                                    </span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                                    <div
                                        className="h-full bg-[#FF5F3D] transition-all duration-300"
                                        style={{ width: `${(studios.length / 3) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#FF5F3D]" />
                            </div>
                        ) : filteredStudios.length === 0 ? (
                            <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
                                <p className="text-[#6F6B99]">{searchQuery ? t("noSearchResults") : t("noStudios")}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {filteredStudios.map((studio) => (
                                    <div
                                        key={studio.id}
                                        className="group cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:border-[#FF5F3D] hover:shadow-lg"
                                        onClick={() => handleStudioClick(studio)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                handleStudioClick(studio);
                                            }
                                        }}
                                        role="button"
                                        tabIndex={0}>
                                        <div className="p-5">
                                            <div className="mb-3 flex items-start justify-between">
                                                <h3 className="font-semibold text-[#261E33] text-lg group-hover:text-[#FF5F3D]">
                                                    {studio.name}
                                                </h3>
                                            </div>
                                            <p className="mb-4 line-clamp-2 text-[#6F6B99] text-sm">
                                                {studio.description}
                                            </p>
                                            <div className="flex items-center gap-4 border-gray-100 border-t pt-4 text-[#6F6B99] text-sm">
                                                <div className="flex items-center gap-1.5">
                                                    <svg
                                                        className="h-4 w-4"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24">
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                                                        />
                                                    </svg>
                                                    <span>
                                                        {studio.groupCount} {t("groups")}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <svg
                                                        className="h-4 w-4"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24">
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                                        />
                                                    </svg>
                                                    <span>
                                                        {studio.memberCount} {t("members")}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
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
