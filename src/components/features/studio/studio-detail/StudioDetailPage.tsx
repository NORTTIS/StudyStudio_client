"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createStudioInviteLink, sendStudioInviteEmail } from "@/api/studio-invites";
import { deleteStudio, getStudioMembers, type StudioMemberResponse, type StudioUI, updateStudio } from "@/api/studios";
import type { components } from "@/api/types";
import { getUserProfile, type UserProfile } from "@/api/user-profile";
import { CreateGroupModal } from "@/components/features/group/create/CreateGroupModal";
import { mapRole } from "@/components/features/group/group.api";
import { RolePill } from "@/components/features/group/RolePill";
import { InviteMemberModal } from "@/components/features/group/setting/InviteMemberModal";
import type { GroupRole } from "@/components/features/group/types";
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
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { GroupPerformanceRadar } from "./GroupPerformanceRadar";
import { GroupProgressChart } from "./GroupProgressChart";
import { MemberDetailModal } from "./MemberDetailModal";
import { MemberList } from "./MemberList";
import { StudioDateRange } from "./StudioDateRange";
import { generateActivityHeatmap, mockGroupPerformance, mockGroupProgress, mockStudioDateRange } from "./types";

type StudioResponse = components["schemas"]["StudioResponse"];
type GroupCardDto = components["schemas"]["GroupCardDto"];

// Transformed group type for UI display
interface TransformedGroup {
    id: string;
    name: string;
    code: string;
    members: number;
    tasks: number;
    progress: number;
    description: string;
    membersPreview: GroupCardDto["membersPreview"];
    role: GroupRole;
}

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
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"groups" | "analytics" | "settings">("groups");
    const [_analyticsSubTab, _setAnalyticsSubTab] = useState<
        "progress" | "activity" | "group-progress" | "performance"
    >("progress");

    // Check if current user is studio owner
    const isStudioOwner = initialStudio?.studioRole === 0;

    // Inline editing state
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editLoading, setEditLoading] = useState(false);

    // Convert server data to UI format
    const studio: StudioUI | null = useMemo(() => {
        if (!initialStudio) return null;
        return {
            id: initialStudio.studioId || "",
            name: initialStudio.studioName || "",
            description: initialStudio.description || "",
            type: "group",
            memberCount: 0,
            groupCount: initialStudio.groupCount || 0,
            completionProgress: 0,
            createdAt: initialStudio.createdAt || "",
            updatedAt: initialStudio.updatedAt || ""
        };
    }, [initialStudio]);

    // Transform groups to the format expected by UI
    const groups: TransformedGroup[] = useMemo(() => {
        return initialGroups.map((group) => ({
            id: group.id || "",
            name: group.name || "",
            code: "",
            members: group.memberCount || 0,
            tasks: group.taskCount || 0,
            progress: 0,
            description: group.description || "",
            membersPreview: group.membersPreview || [],
            role: mapRole(group.role)
        }));
    }, [initialGroups]);

    // Filter groups based on search query
    const filteredGroups = groups.filter(
        (group) =>
            (group.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
            (group.description?.toLowerCase() || "").includes(searchQuery.toLowerCase())
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

    // Redirect to "groups" tab if user doesn't have owner permissions but is on analytics or settings tab
    useEffect(() => {
        if (!isStudioOwner && (activeTab === "analytics" || activeTab === "settings")) {
            setActiveTab("groups");
        }
    }, [isStudioOwner, activeTab]);

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

    // Initialize edit values when studio is loaded
    useEffect(() => {
        if (studio) {
            setEditName(studio.name);
            setEditDescription(studio.description);
        }
    }, [studio]);

    const handleStartEdit = () => {
        if (studio) {
            setEditName(studio.name);
            setEditDescription(studio.description);
        }
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        if (studio) {
            setEditName(studio.name);
            setEditDescription(studio.description);
        }
        setIsEditing(false);
    };

    const handleSaveEdit = async () => {
        if (!studio) return;

        setEditLoading(true);
        try {
            const result = await updateStudio(
                studio.id,
                {
                    name: editName,
                    description: editDescription,
                    type: "group"
                },
                locale
            );

            if (result.status === "success") {
                toast({ description: t("modal.editSuccess"), variant: "success" });
                setIsEditing(false);
                router.refresh();
            } else {
                toast({ description: t("modal.editError"), variant: "destructive" });
            }
        } catch (error) {
            console.error("Update studio failed:", error);
            toast({ description: t("modal.editError"), variant: "destructive" });
        } finally {
            setEditLoading(false);
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
                        {/* Back button + Studio Info */}
                        <div className="mb-6">
                            <div className="flex items-start gap-4">
                                <button
                                    type="button"
                                    onClick={() => router.push(`/${locale}/master`)}
                                    className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#6F6B99] shadow-sm transition-all hover:bg-orange-50 hover:text-orange-600">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15 19l-7-7 7-7"
                                        />
                                    </svg>
                                </button>

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-red-500 shadow-lg shadow-orange-500/30">
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
                                        <div>
                                            <h1 className="truncate font-bold text-[#261E33] text-xl">{studio.name}</h1>
                                            <p className="mt-0.5 text-[#6F6B99] text-sm">
                                                {studio.description || "Chưa có mô tả"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="mb-6 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 rounded-xl border border-orange-100/50 bg-white/80 p-1.5 shadow-lg shadow-orange-900/5 backdrop-blur-xl">
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
                                {isStudioOwner && (
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
                                )}
                                {isStudioOwner && (
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("settings")}
                                        className={`flex items-center gap-2 rounded-lg px-5 py-2.5 font-medium text-sm transition-all duration-300 ${
                                            activeTab === "settings"
                                                ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/30"
                                                : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                                        }`}>
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
                                        Cài đặt
                                    </button>
                                )}
                            </div>
                            {/* Search and Add Group */}
                            <div className="flex flex-1 items-center justify-between gap-4">
                                <div className="relative flex-1">
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
                                                                <RolePill role={group.role} />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Description */}
                                                    <p className="mt-3 line-clamp-2 text-[#FF5722] text-sm">
                                                        {group.description || "Chưa có mô tả cho nhóm này"}
                                                    </p>

                                                    {/* Subject tag */}

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
                                                                (_, i) => {
                                                                    const member = group.membersPreview?.[i];
                                                                    return (
                                                                        <div
                                                                            key={`${group.id}-avatar-${i}`}
                                                                            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white font-medium text-[9px] text-white ${
                                                                                member?.avatarUrl
                                                                                    ? ""
                                                                                    : i % 4 === 0
                                                                                      ? "bg-gradient-to-br from-orange-400 to-red-500"
                                                                                      : i % 4 === 1
                                                                                        ? "bg-gradient-to-br from-blue-400 to-indigo-500"
                                                                                        : i % 4 === 2
                                                                                          ? "bg-gradient-to-br from-teal-400 to-cyan-500"
                                                                                          : "bg-gradient-to-br from-pink-400 to-rose-500"
                                                                            }`}>
                                                                            {member?.avatarUrl ? (
                                                                                <img
                                                                                    src={member.avatarUrl}
                                                                                    alt={member.firstName || "Member"}
                                                                                    className="h-full w-full rounded-full object-cover"
                                                                                />
                                                                            ) : (
                                                                                String.fromCharCode(65 + i)
                                                                            )}
                                                                        </div>
                                                                    );
                                                                }
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

                        {/* Tab 3: Settings */}
                        {activeTab === "settings" && (
                            <div className="space-y-6">
                                {/* Section 1: Cài đặt chung */}
                                <section className="rounded-2xl border bg-white shadow-sm">
                                    <div className="flex items-start justify-between border-b px-6 py-5">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100">
                                                <svg
                                                    className="h-4 w-4 text-gray-700"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24">
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
                                            </div>
                                            <div>
                                                <h2 className="font-bold text-gray-900 text-sm">Cài đặt chung</h2>
                                                <p className="mt-0.5 text-gray-500 text-xs">
                                                    Quản lý thông tin cơ bản của Studio
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {isEditing ? (
                                                <Button
                                                    variant="outline"
                                                    onClick={handleCancelEdit}
                                                    className="h-10 rounded-xl border-gray-300 px-4 font-semibold text-gray-700 text-sm hover:bg-gray-100">
                                                    Hủy
                                                </Button>
                                            ) : null}
                                            <Button
                                                onClick={isEditing ? handleSaveEdit : handleStartEdit}
                                                disabled={editLoading}
                                                className="h-10 rounded-xl bg-orange-600 px-4 font-semibold text-sm text-white hover:bg-orange-700 disabled:opacity-50">
                                                {editLoading ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Chỉnh sửa"}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="px-6 py-6">
                                        <div className="grid grid-cols-1 gap-5">
                                            <div>
                                                <label
                                                    htmlFor="studio-name-input"
                                                    className="font-semibold text-gray-700 text-xs">
                                                    Tên Studio <span className="text-red-500">*</span>
                                                </label>
                                                <Input
                                                    id="studio-name-input"
                                                    disabled={!isEditing}
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="mt-2 h-10 rounded-xl border-gray-200 focus-visible:border-orange-500 focus-visible:ring-orange-500 disabled:opacity-70"
                                                />
                                            </div>

                                            <div>
                                                <label
                                                    htmlFor="studio-description-input"
                                                    className="font-semibold text-gray-700 text-xs">
                                                    Mô tả
                                                </label>
                                                <Textarea
                                                    id="studio-description-input"
                                                    disabled={!isEditing}
                                                    value={editDescription}
                                                    onChange={(e) => setEditDescription(e.target.value)}
                                                    className="mt-2 min-h-24 rounded-xl border-gray-200 pb-7 focus-visible:border-orange-500 focus-visible:ring-orange-500 disabled:opacity-70"
                                                    placeholder="Nhập mô tả cho Studio..."
                                                />
                                            </div>

                                            <div>
                                                <label
                                                    htmlFor="studio-created-date"
                                                    className="font-semibold text-gray-700 text-xs">
                                                    Ngày tạo
                                                </label>
                                                <Input
                                                    id="studio-created-date"
                                                    value={
                                                        studio.createdAt
                                                            ? new Date(studio.createdAt).toLocaleDateString("vi-VN", {
                                                                  day: "numeric",
                                                                  month: "long",
                                                                  year: "numeric"
                                                              })
                                                            : "—"
                                                    }
                                                    readOnly
                                                    tabIndex={-1}
                                                    aria-readonly="true"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onFocus={(e) => e.currentTarget.blur()}
                                                    className="mt-2 h-10 cursor-default rounded-xl border-gray-200 bg-gray-50 text-gray-900 focus-visible:ring-0"
                                                />
                                            </div>

                                            <div>
                                                <label
                                                    htmlFor="studio-group-count"
                                                    className="font-semibold text-gray-700 text-xs">
                                                    Số nhóm
                                                </label>
                                                <Input
                                                    id="studio-group-count"
                                                    value={studio.groupCount}
                                                    readOnly
                                                    tabIndex={-1}
                                                    aria-readonly="true"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onFocus={(e) => e.currentTarget.blur()}
                                                    className="mt-2 h-10 cursor-default rounded-xl border-gray-200 bg-gray-50 text-gray-900 focus-visible:ring-0"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Section 2: Vùng nguy hiểm */}
                                <section className="rounded-2xl border border-red-200 bg-white shadow-sm">
                                    <div className="border-red-200 border-b px-6 py-5">
                                        <h2 className="font-bold text-red-700 text-sm">Vùng nguy hiểm</h2>
                                    </div>

                                    <div className="px-6 py-6">
                                        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                                <div>
                                                    <div className="font-bold text-red-700 text-sm">Xóa Studio</div>
                                                    <div className="mt-1 text-red-600 text-xs">
                                                        Xóa Studio khỏi danh sách của bạn. Studio sẽ bị ẩn và không thể
                                                        truy cập được, nhưng dữ liệu sẽ vẫn được giữ lại trong trường
                                                        hợp bạn muốn khôi phục sau này.
                                                    </div>
                                                </div>

                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button className="h-10 rounded-xl bg-red-600 px-5 font-semibold text-sm text-white hover:bg-red-700">
                                                            <svg
                                                                className="mr-2 h-4 w-4"
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
                                                            Xóa Studio
                                                        </Button>
                                                    </AlertDialogTrigger>

                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>
                                                                Bạn chắc chắn muốn xóa Studio này?
                                                            </AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Hành động này có thể hoàn tác. Studio và toàn bộ dữ liệu
                                                                sẽ bị ẩn.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>

                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                className="bg-red-600 hover:bg-red-700"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    handleDeleteStudio();
                                                                }}>
                                                                Xác nhận xóa
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}
                    </div>
                </main>
            </div>

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
                defaultStudioId={studio?.id}
                variant="studio"
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
