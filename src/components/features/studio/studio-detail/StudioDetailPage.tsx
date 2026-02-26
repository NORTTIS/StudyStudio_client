"use client";

import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type { components } from "@/api/types";
import { deleteStudio, updateStudio, type StudioUI } from "@/api/studios";
import { getUserProfile, type UserProfile } from "@/api/user-profile";
import { DeleteConfirmModal } from "@/components/features/master/DeleteConfirmModal";
import { InviteMemberModal } from "@/components/features/master/InviteMemberModal";
import { StudioModal } from "@/components/features/master/StudioModal";
import { CreateGroupModal } from "@/components/features/group/create/CreateGroupModal";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";

type StudioResponse = components["schemas"]["StudioResponse"];
type GroupCardDto = components["schemas"]["GroupCardDto"];

interface StudioDetailPageProps {
    initialStudio: StudioResponse | null;
    initialGroups: GroupCardDto[];
}

export default function StudioDetailPage({ initialStudio, initialGroups }: StudioDetailPageProps) {
    const params = useParams();
    const router = useRouter();
    const t = useTranslations("MasterPage");
    const locale = useLocale();
    const { toast } = useToast();

    const studioId = params.studioId as string;
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState<string>("");
    const [selectedGroupName, setSelectedGroupName] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");

    // Convert server data to UI format
    const studio: StudioUI | null = initialStudio ? {
        id: initialStudio.studioId || "",
        name: initialStudio.studioName || "",
        description: initialStudio.description || "",
        type: "group", // Default type
        memberCount: 0, // Not provided by API
        groupCount: initialStudio.groupCount || 0,
        completionProgress: 0, // Calculate later if needed
        createdAt: initialStudio.createdAt || "",
        updatedAt: initialStudio.updatedAt || ""
    } : null;

    // Transform groups to the format expected by UI
    const groups = initialGroups.map((group) => ({
        id: group.id || "",
        name: group.name || "",
        code: "", // Not provided by API, could extract from name
        members: group.memberCount || 0,
        tasks: group.taskCount || 0,
        progress: 0, // Could be calculated from task completion if available
        description: group.description || ""
    }));

    // Filter groups based on search query
    const filteredGroups = groups.filter(
        (group) =>
            group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            group.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            group.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const profileResult = await getUserProfile(locale);
            if (profileResult.status === "success" && profileResult.data) {
                setUserProfile(profileResult.data);
            }
        } catch (error) {
            console.error("Load data failed:", error);
            toast({ description: t("loadError"), variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [locale, toast, t]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleEditStudio = async (data: { name: string; description: string; type: string }) => {
        if (!studio) return;

        try {
            const result = await updateStudio(studio.id, {
                name: data.name,
                description: data.description,
                type: data.type as "personal" | "group"
            }, locale);

            if (result.status === "success") {
                toast({ description: t("modal.editSuccess"), variant: "success" });
                setIsEditModalOpen(false);
                // Refresh page to show updated data
                router.refresh();
            } else {
                toast({ description: t("modal.editError"), variant: "destructive" });
            }
        } catch (error) {
            console.error("Update studio failed:", error);
            toast({ description: t("modal.editError"), variant: "destructive" });
        }
    };

    const handleDeleteStudio = async () => {
        if (!studio) return;

        try {
            const result = await deleteStudio(studio.id, locale);

            if (result.status === "success") {
                toast({ description: t("deleteModal.success"), variant: "success" });
                router.push(`/${locale}/master`);
            } else {
                toast({ description: t("deleteModal.error"), variant: "destructive" });
            }
        } catch (error) {
            console.error("Delete studio failed:", error);
            toast({ description: t("deleteModal.error"), variant: "destructive" });
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#F8F8F8]">
                <div className="flex min-h-screen">
                    <DashboardSidebar />
                    <main className="flex-1">
                        <Header userProfile={userProfile} />
                        <div className="flex items-center justify-center py-20">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#FF5F3D]" />
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    if (!studio) {
        return (
            <div className="min-h-screen bg-[#F8F8F8]">
                <div className="flex min-h-screen">
                    <DashboardSidebar />
                    <main className="flex-1">
                        <Header userProfile={userProfile} />
                        <div className="flex items-center justify-center py-20">
                            <p className="text-center text-[#6F6B99]">Studio không tồn tại</p>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8F8F8]">
            <div className="flex min-h-screen">
                <DashboardSidebar />
                <main className="flex-1">
                    <Header userProfile={userProfile} />
                    <div className="px-6 py-6">
                        {/* Back button + Studio name + Badge */}
                        <div className="mb-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => router.push(`/${locale}/master`)}
                                    className="text-[#6F6B99] transition-colors hover:text-[#261E33]">
                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15 19l-7-7 7-7"
                                        />
                                    </svg>
                                </button>
                                <div className="flex items-center gap-2">
                                    <svg
                                        className="h-5 w-5 text-[#6F6B99]"
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
                                    <h1 className="font-semibold text-[#261E33] text-lg">{studio.name}</h1>

                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditModalOpen(true)}
                                        className="rounded-lg p-2 text-[#6F6B99] transition-colors hover:bg-gray-100">
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                            />
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                            />
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsDeleteModalOpen(true)}
                                        className="rounded-lg p-2 text-[#6F6B99] transition-colors hover:bg-red-50 hover:text-red-600">
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            </div>


                        </div>
                        {/* Search and Add Group */}
                        <div className="mb-6 flex items-center justify-between gap-4">
                            <div className="relative max-w-md flex-1">
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm studio, nhóm, vấn đề..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 text-sm focus:border-[#FF5F3D] focus:outline-none focus:ring-2 focus:ring-[#FF5F3D]/20"
                                />
                                <svg
                                    className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
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
                                className="bg-[#FF5F3D] hover:bg-[#ff4620]"
                                onClick={() => setIsCreateGroupModalOpen(true)}
                            >
                                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 4v16m8-8H4"
                                    />
                                </svg>
                                Thêm nhóm
                            </Button>
                        </div>

                        {/* Studio Info */}
                        <div className="mb-6 rounded-lg bg-gray-50 p-4">
                            <p className="mb-2 text-[#261E33] text-sm">
                                <span className="font-semibold">{filteredGroups.length}/5</span> không gian nhóm đang
                                được sử dụng.
                            </p>
                            <p className="text-[#6F6B99] text-sm">
                                Tiến độ hoàn thiện công việc trung bình:{" "}
                                <span className="font-semibold text-[#261E33]">
                                    {(studio.completionProgress).toFixed(2)}%
                                </span>
                            </p>
                        </div>

                        {/* Groups Grid */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredGroups.length > 0 ? (
                                filteredGroups.map((group) => (
                                    <Link
                                        href={`/${locale}/group/${group.id}`}
                                        key={group.id}
                                        className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-[#FF5F3D] hover:shadow-md">

                                        {/* Group name */}
                                        <div className="mb-2 flex items-center gap-2">
                                            <svg
                                                className="h-4 w-4 text-gray-400"
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
                                            <h3 className="font-semibold text-[#261E33] text-sm">
                                                {group.name}
                                            </h3>
                                        </div>

                                        {/* Description */}
                                        <p className="mb-3 text-[#6F6B99] text-xs leading-relaxed">
                                            {group.description}
                                        </p>

                                        {/* Members */}
                                        <div className="mb-3 flex items-center gap-3">
                                            <div className="flex items-center gap-1 text-[#6F6B99] text-xs">
                                                <svg
                                                    className="h-3.5 w-3.5"
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
                                                <span>{group.members} thành viên</span>
                                            </div>
                                            <div className="flex -space-x-1.5">
                                                {Array.from({ length: Math.min(group.members, 4) }).map((_, i) => (
                                                    <div
                                                        key={`${group.id}-member-${i}`}
                                                        className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#FF5F3D] font-medium text-[10px] text-white">
                                                        {String.fromCharCode(65 + i)}
                                                    </div>
                                                ))}
                                            </div>
                                            <span className="text-[#6F6B99] text-xs">{group.tasks} công việc</span>
                                        </div>

                                        {/* Progress */}
                                        <div className="flex items-center gap-2">
                                            <svg
                                                className="h-3.5 w-3.5 text-gray-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                                                />
                                            </svg>
                                            <span className="text-[#6F6B99] text-xs">Tiến độ: {group.progress}%</span>
                                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                                                <div
                                                    className="h-full bg-[#FF5F3D]"
                                                    style={{ width: `${group.progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="col-span-full rounded-lg border border-gray-200 bg-white p-12 text-center">
                                    <p className="text-[#6F6B99]">
                                        {searchQuery ? "Không tìm thấy kết quả" : "Chưa có nhóm nào"}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            <StudioModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSubmit={handleEditStudio}
                studio={studio}
                mode="edit"
            />

            <DeleteConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteStudio}
                studioName={studio?.name || ""}
            />

            <InviteMemberModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                groupId={selectedGroupId}
                groupName={selectedGroupName}
            />

            <CreateGroupModal
                open={isCreateGroupModalOpen}
                onClose={() => setIsCreateGroupModalOpen(false)}
                currentGroupCount={groups.length}
                maxGroups={5}
                defaultStudioId={studio?.id}
                onCreate={async () => {
                    // Refresh the page to show the new group
                    router.refresh();
                    toast({
                        description: "Nhóm đã được tạo thành công!",
                        variant: "success"
                    });
                }}
            />
        </div>
    );
}
