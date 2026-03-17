"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { deleteStudio, getStudioMembers, type StudioUI, type StudioMemberResponse, updateStudio } from "@/api/studios";
import type { components } from "@/api/types";
import { getUserProfile, type UserProfile } from "@/api/user-profile";
import { CreateGroupModal } from "@/components/features/group/create/CreateGroupModal";
import { DeleteConfirmModal } from "@/components/features/master/DeleteConfirmModal";
import { InviteMemberModal, type InviteRole } from "@/components/features/group/setting/InviteMemberModal";
import { StudioModal } from "@/components/features/master/StudioModal";
import { createStudioInviteLink, sendStudioInviteEmail } from "@/api/studio-invites";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { GroupPerformanceRadar } from "./GroupPerformanceRadar";
import { GroupProgressChart } from "./GroupProgressChart";
import { MemberList } from "./MemberList";
import { MemberDetailModal } from "./MemberDetailModal";
import { StudioDateRange } from "./StudioDateRange";
import { generateActivityHeatmap, mockGroupPerformance, mockGroupProgress, mockStudioDateRange } from "./types";

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
    const [members, setMembers] = useState<StudioMemberResponse[]>([]);
    const [membersLoading, setMembersLoading] = useState(true);
    const [selectedMember, setSelectedMember] = useState<StudioMemberResponse | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"groups" | "analytics">("groups");
    const [analyticsSubTab, setAnalyticsSubTab] = useState<"progress" | "activity" | "group-progress" | "performance">(
        "progress"
    );

    // Convert server data to UI format
    const studio: StudioUI | null = initialStudio
        ? {
              id: initialStudio.studioId || "",
              name: initialStudio.studioName || "",
              description: initialStudio.description || "",
              type: "group", // Default type
              memberCount: 0, // Not provided by API
              groupCount: initialStudio.groupCount || 0,
              completionProgress: 0, // Calculate later if needed
              createdAt: initialStudio.createdAt || "",
              updatedAt: initialStudio.updatedAt || ""
          }
        : null;

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
        setMembersLoading(true);
        try {
            const profileResult = await getUserProfile(locale);
            if (profileResult.status === "success" && profileResult.data) {
                setUserProfile(profileResult.data);
            }

            // Fetch studio members
            if (studioId) {
                const membersResult = await getStudioMembers(studioId, locale);
                if (membersResult.status === "success" && membersResult.data) {
                    setMembers(membersResult.data);
                }
            }
        } catch (error) {
            console.error("Load data failed:", error);
            toast({ description: t("loadError"), variant: "destructive" });
        } finally {
            setMembersLoading(false);
        }
    }, [locale, toast, t, studioId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleEditStudio = async (data: { name: string; description: string; type: string }) => {
        if (!studio) return;

        try {
            const result = await updateStudio(
                studio.id,
                {
                    name: data.name,
                    description: data.description,
                    type: data.type as "personal" | "group"
                },
                locale
            );

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

    if (membersLoading) {
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
                        <div className="mb-6 flex flex-col justify-between">
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
                            <p className="ml-10 text-gray-500">{studio.description}</p>
                        </div>
                        {/* Search and Add Group */}
                        <div className="mb-6 flex items-center justify-between gap-4">
                            <div className="relative max-w-md flex-1">
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm nhóm ..."
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
                                onClick={() => setIsCreateGroupModalOpen(true)}>
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

                        {/* Tabs Navigation */}
                        <div className="mb-6">
                            <div className="flex w-fit items-center gap-2 rounded-xl border border-orange-100/50 bg-white/80 p-1.5 shadow-lg shadow-orange-900/5 backdrop-blur-xl">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("groups")}
                                    className={`flex items-center gap-2 rounded-lg px-5 py-2.5 font-medium text-sm transition-all duration-300 ${
                                        activeTab === "groups"
                                            ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/30"
                                            : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                                    }`}>
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                        />
                                    </svg>
                                    Nhóm
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("analytics")}
                                    className={`flex items-center gap-2 rounded-lg px-5 py-2.5 font-medium text-sm transition-all duration-300 ${
                                        activeTab === "analytics"
                                            ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/30"
                                            : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                                    }`}>
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                        />
                                    </svg>
                                    Phân tích
                                </button>
                            </div>
                        </div>

                        {/* Tab Content */}
                        {activeTab === "groups" && (
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                                {/* Left Column: Groups 2-col grid */}
                                <div className="lg:col-span-8">
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        {filteredGroups.length > 0 ? (
                                            filteredGroups.map((group, index) => (
                                                <Link
                                                    href={`/${locale}/group/${group.id}`}
                                                    key={group.id}
                                                    className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
                                                    {/* Card header: icon + name + badge */}
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                                                                index % 4 === 0
                                                                    ? "bg-gradient-to-br from-orange-400 to-red-500"
                                                                    : index % 4 === 1
                                                                      ? "bg-gradient-to-br from-blue-400 to-indigo-500"
                                                                      : index % 4 === 2
                                                                        ? "bg-gradient-to-br from-teal-400 to-cyan-500"
                                                                        : "bg-gradient-to-br from-purple-400 to-violet-500"
                                                            }`}>
                                                            <svg
                                                                className="h-5 w-5 text-white"
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
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="truncate font-semibold text-slate-800 text-sm">
                                                                    {group.name}
                                                                </h3>
                                                                <span
                                                                    className={`shrink-0 rounded-full px-2 py-0.5 font-medium text-[11px] ${
                                                                        index % 3 === 0
                                                                            ? "bg-orange-100 text-orange-700"
                                                                            : index % 3 === 1
                                                                              ? "bg-slate-800 text-white"
                                                                              : "bg-slate-100 text-slate-600"
                                                                    }`}>
                                                                    {index % 3 === 0
                                                                        ? "owner"
                                                                        : index % 3 === 1
                                                                          ? "moderator"
                                                                          : "member"}
                                                                </span>
                                                            </div>
                                                            <p className="text-slate-400 text-xs">
                                                                {group.name
                                                                    .split(" ")
                                                                    .map((w) => w[0])
                                                                    .join("")
                                                                    .toUpperCase()
                                                                    .slice(0, 4)}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Description */}
                                                    <p className="mt-3 line-clamp-2 text-[#FF5722] text-sm">
                                                        {group.description || "Chưa có mô tả cho nhóm này"}
                                                    </p>

                                                    {/* Subject tag */}
                                                    <div className="mt-3">
                                                        <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-slate-600 text-xs">
                                                            <svg
                                                                className="h-3 w-3 text-slate-400"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24">
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                                                />
                                                            </svg>
                                                            SEP490-G62
                                                        </span>
                                                    </div>

                                                    {/* Stats + Avatars */}
                                                    <div className="mt-4 flex items-center justify-between">
                                                        <div className="flex items-center gap-3 text-slate-500 text-xs">
                                                            <span className="inline-flex items-center gap-1">
                                                                <svg
                                                                    className="h-3.5 w-3.5"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    viewBox="0 0 24 24">
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={2}
                                                                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                                                                    />
                                                                </svg>
                                                                {group.members} members
                                                            </span>
                                                            <span className="inline-flex items-center gap-1">
                                                                <svg
                                                                    className="h-3.5 w-3.5"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    viewBox="0 0 24 24">
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={2}
                                                                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                                                                    />
                                                                </svg>
                                                                {group.tasks} tasks
                                                            </span>
                                                        </div>
                                                        <div className="flex -space-x-1.5">
                                                            {Array.from({ length: Math.min(group.members, 4) }).map(
                                                                (_, i) => (
                                                                    <div
                                                                        key={`${group.id}-avatar-${i}`}
                                                                        className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white font-medium text-[9px] text-white ${
                                                                            i % 4 === 0
                                                                                ? "bg-gradient-to-br from-orange-400 to-red-500"
                                                                                : i % 4 === 1
                                                                                  ? "bg-gradient-to-br from-blue-400 to-indigo-500"
                                                                                  : i % 4 === 2
                                                                                    ? "bg-gradient-to-br from-teal-400 to-cyan-500"
                                                                                    : "bg-gradient-to-br from-pink-400 to-rose-500"
                                                                        }`}>
                                                                        {String.fromCharCode(65 + i)}
                                                                    </div>
                                                                )
                                                            )}
                                                            {group.members > 4 && (
                                                                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-200 font-medium text-[9px] text-slate-600">
                                                                    +{group.members - 4}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))
                                        ) : (
                                            <div className="col-span-2 rounded-2xl border-2 border-slate-200 border-dashed bg-white/50 p-16 text-center">
                                                <p className="font-medium text-slate-500 text-sm">
                                                    {searchQuery ? "Không tìm thấy kết quả" : "Chưa có nhóm nào"}
                                                </p>
                                                <p className="mt-1 text-slate-400 text-xs">
                                                    {searchQuery
                                                        ? "Thử tìm kiếm với từ khóa khác"
                                                        : "Tạo nhóm đầu tiên để bắt đầu"}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Column: Members + Quick Stats */}
                                <div className="flex flex-col gap-4 lg:col-span-4">
                                    <MemberList
                                        members={members}
                                        studioOwnerId={initialStudio?.ownerId}
                                        onInviteClick={() => setIsInviteModalOpen(true)}
                                        onMemberClick={(member) => setSelectedMember(member)}
                                    />
                                    {/* Quick Stats */}
                                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                                        <h3 className="mb-4 font-semibold text-base text-slate-800">Quick Stats</h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-500">Groups</span>
                                                <span className="font-semibold text-slate-800">{groups.length}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-500">Members</span>
                                                <span className="font-semibold text-slate-800">{members.length}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-500">Created</span>
                                                <span className="font-semibold text-slate-800">
                                                    {studio.createdAt
                                                        ? new Date(studio.createdAt).toLocaleDateString("en-US", {
                                                              month: "numeric",
                                                              day: "numeric",
                                                              year: "numeric"
                                                          })
                                                        : "—"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab 2: Analytics - Show all 4 charts */}
                        {activeTab === "analytics" && (
                            <div className="space-y-6">
                                {/* Row 1: StudioDateRange + Activity Heatmap */}
                                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                    <StudioDateRange
                                        startDate={mockStudioDateRange.startDate}
                                        dueDate={mockStudioDateRange.dueDate}
                                    />
                                    <ActivityHeatmap data={generateActivityHeatmap()} />
                                </div>
                                {/* Row 2: Group Progress + Performance Radar */}
                                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                    <GroupProgressChart
                                        groups={mockGroupProgress}
                                        studioStartDate={mockStudioDateRange.startDate}
                                        studioDueDate={mockStudioDateRange.dueDate}
                                    />
                                    <GroupPerformanceRadar data={mockGroupPerformance} />
                                </div>
                            </div>
                        )}
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
                open={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                groupName={studio?.name || "Studio"}
                variant="studio"
                canManage={true}
                onCreateLink={async ({ role }) => {
                    const result = await createStudioInviteLink({ studioId: studio?.id, role: role as string }, locale);
                    if (result.status === "success" && result.data?.inviteUrl) {
                        return result.data.inviteUrl;
                    }
                    throw new Error("Failed to create invite link");
                }}
                onSendInvite={async ({ email, role }) => {
                    await sendStudioInviteEmail({ studioId: studio?.id, role: role as string, email }, locale);
                }}
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

            <MemberDetailModal
                member={selectedMember}
                studioOwnerId={initialStudio?.ownerId}
                isOpen={!!selectedMember}
                onClose={() => setSelectedMember(null)}
            />
        </div>
    );
}
