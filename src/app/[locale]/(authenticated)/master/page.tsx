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

    const handleCreateStudio = async (data: { name: string; description: string; type: string }) => {
        try {
            const studioData = {
                name: data.name,
                description: data.description,
                type: data.type as "personal" | "group"
            };
            const result = await createStudio(studioData, locale);
            if (result.status === "success") {
                toast({ title: t("modal.createSuccess") });
                setIsCreateModalOpen(false);
                loadData();
            } else {
                const newStudio: StudioUI = {
                    id: `STUDIO-${Date.now()}`,
                    name: data.name,
                    description: data.description,
                    type: data.type as "personal" | "group",
                    memberCount: 1,
                    videoCount: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                setStudios([...studios, newStudio]);
                toast({ title: t("modal.createSuccess") });
                setIsCreateModalOpen(false);
            }
        } catch (error) {
            console.error("Create studio failed:", error);
            toast({ title: t("error"), description: t("modal.createError"), variant: "destructive" });
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
                toast({ title: t("modal.editSuccess") });
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
                toast({ title: t("modal.editSuccess") });
                setIsCreateModalOpen(false);
                setSelectedStudio(null);
            }
        } catch (error) {
            console.error("Update studio failed:", error);
            toast({ title: t("error"), description: t("modal.editError"), variant: "destructive" });
        }
    };

    const handleDeleteStudio = async () => {
        if (!selectedStudio) return;

        try {
            const result = await deleteStudio(selectedStudio.id, locale);

            if (result.status === "success") {
                toast({ title: t("deleteModal.success") });
                setIsDeleteModalOpen(false);
                setSelectedStudio(null);
                loadData(); // Reload data from API
            } else {
                // Fallback to local delete if API fails
                const updatedStudios = studios.filter((s) => s.id !== selectedStudio.id);
                setStudios(updatedStudios);
                toast({ title: t("deleteModal.success") });
                setIsDeleteModalOpen(false);
                setSelectedStudio(null);
            }
        } catch (error) {
            console.error("Delete studio failed:", error);
            toast({ title: t("error"), description: t("deleteModal.error"), variant: "destructive" });
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

    const getStudioIcon = (type: string) => (type === "personal" ? "🔷" : "🔶");

    return (
        <div className="min-h-screen bg-[#F8F8F8] text-[#261E33]">
            <div className="flex min-h-screen">
                <DashboardSidebar />
                <main >
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
                        <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
                            <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <p className="text-blue-700 text-sm">{t("infoBanner")}</p>
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
                                        onClick={() => handleStudioClick(studio)}>
                                        <div className="flex items-start gap-3 border-gray-100 border-b p-4">
                                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 text-2xl">
                                                {getStudioIcon(studio.type)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="mb-1 flex items-center gap-2">
                                                    <h3 className="truncate font-semibold text-[#261E33] group-hover:text-[#FF5F3D]">
                                                        {studio.name}
                                                    </h3>
                                                    <span className="flex-shrink-0 rounded-full bg-[#FF5F3D] px-2 py-0.5 text-white text-xs">
                                                        {studio.type === "personal" ? t("personal") : t("group")}
                                                    </span>
                                                </div>
                                                <p className="line-clamp-2 text-[#6F6B99] text-sm">{studio.description}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between p-4">
                                            <div className="flex items-center gap-4 text-[#6F6B99] text-sm">
                                                <div className="flex items-center gap-1">
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                                <div className="flex items-center gap-1">
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                                        />
                                                    </svg>
                                                    <span>
                                                        {studio.videoCount} {t("videos")}
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
