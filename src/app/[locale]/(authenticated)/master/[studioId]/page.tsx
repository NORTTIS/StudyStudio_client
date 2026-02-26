"use client";

import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { deleteStudio, getStudioById, type StudioUI } from "@/api/studios";
import { getUserProfile, type UserProfile } from "@/api/user-profile";
import { DeleteConfirmModal } from "@/components/features/master/DeleteConfirmModal";
import { InviteMemberModal } from "@/components/features/master/InviteMemberModal";
import { StudioModal } from "@/components/features/master/StudioModal";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function StudioDetailPage() {
    const params = useParams();
    const router = useRouter();
    const t = useTranslations("MasterPage");
    const locale = useLocale();
    const { toast } = useToast();

    const studioId = params.studioId as string;
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [studio, setStudio] = useState<StudioUI | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState<string>("");
    const [selectedGroupName, setSelectedGroupName] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");

    // Mock groups data - replace with real API later
    const mockGroups = [
        {
            id: "1",
            name: "Software Requirement",
            code: "SWR",
            members: 4,
            tasks: 4,
            progress: 52,
            description: "Nhóm phụ trách phân tích yêu cầu và quản lý phần mềm"
        },
        {
            id: "2",
            name: "Software Design",
            code: "SWD",
            members: 5,
            tasks: 10,
            progress: 10,
            description: "Nhóm phụ trách thiết kế giao diện và UX/UI"
        },
        {
            id: "3",
            name: "Software Testing",
            code: "SWT",
            members: 6,
            tasks: 8,
            progress: 50,
            description: "Nhóm phụ trách kiểm thử và đảm bảo chất lượng"
        }
    ];

    // Filter groups based on search query
    const filteredGroups = mockGroups.filter(
        (group) =>
            group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            group.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            group.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const loadData = async () => {
        setIsLoading(true);
        try {
            const profileResult = await getUserProfile(locale);
            if (profileResult.status === "success" && profileResult.data) {
                setUserProfile(profileResult.data);
            }

            const studioResult = await getStudioById(studioId, locale);
            if (studioResult.status === "success" && studioResult.data) {
                setStudio(studioResult.data);
            }
        } catch (error) {
            console.error("Load data failed:", error);
            toast({ description: t("loadError"), variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadData]);

    const handleEditStudio = async (_data: { name: string; description: string; type: string }) => {
        toast({ description: t("modal.editSuccess"), variant: "success" });
        setIsEditModalOpen(false);
        loadData();
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
                                    <span className="rounded bg-[#FF5F3D] px-2 py-0.5 text-white text-xs">
                                        Đang hoạt động
                                    </span>
                                </div>
                            </div>

                            {/* Right: Actions */}
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-2"
                                    onClick={() => {
                                        // For now, use first group as example
                                        if (filteredGroups.length > 0) {
                                            setSelectedGroupId(filteredGroups[0].id);
                                            setSelectedGroupName(filteredGroups[0].name);
                                            setIsInviteModalOpen(true);
                                        } else {
                                            toast({
                                                description: "Vui lòng tạo nhóm trước khi mời thành viên",
                                                variant: "destructive"
                                            });
                                        }
                                    }}>
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                                        />
                                    </svg>
                                    Mời thành viên
                                </Button>
                                <button
                                    type="button"
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
                            <Button className="bg-[#FF5F3D] hover:bg-[#ff4620]">
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
                                    {(studio.completionProgress || 37.34).toFixed(2)}%
                                </span>
                            </p>
                        </div>

                        {/* Groups Grid */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredGroups.length > 0 ? (
                                filteredGroups.map((group) => (
                                    <div
                                        key={group.id}
                                        className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-[#FF5F3D] hover:shadow-md">
                                        {/* Badge */}
                                        <div className="mb-3">
                                            <span className="rounded bg-[#FF5F3D] px-2 py-0.5 text-white text-xs">
                                                Đang hoạt động
                                            </span>
                                        </div>

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
                                                {group.name} - {group.code}
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
                                    </div>
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
        </div>
    );
}
