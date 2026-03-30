"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
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
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { hexToGradient } from "@/lib/utils";
import AIMaster from "./AIMaster";
import AnalyticMaster from "./analytic/AnalyticMaster";
import { MemberDetailModal } from "./MemberDetailModal";
import { MemberList } from "./MemberList";
import { QuickAssignModal } from "./QuickAssignModal";

type StudioResponse = components["schemas"]["StudioResponse"];
type GroupCardDto = components["schemas"]["GroupCardDto"];

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
    colorHex?: string | null;
    iconEmoji?: string | null;
}

interface StudioDetailPageProps {
    initialStudio: StudioResponse | null;
    initialGroups: GroupCardDto[];
}

function FloatingOrb({ className }: { className: string }) {
    return (
        <motion.div
            className={`pointer-events-none absolute rounded-full blur-3xl ${className}`}
            animate={{ y: [0, -16, 0], x: [0, 8, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
    );
}

function TabButton({
    active,
    onClick,
    children
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <motion.button
            type="button"
            onClick={onClick}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-300 ${active
                ? "bg-[linear-gradient(135deg,#E6492D_0%,#FF5A36_55%,#FF6B45_100%)] text-white shadow-[0_16px_32px_rgba(230,73,45,0.28)]"
                : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                }`}
        >
            {children}
        </motion.button>
    );
}

function EmptyBlock({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[28px] border border-white/80 bg-white/82 p-14 text-center shadow-sm backdrop-blur"
        >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#FFF1EC_0%,#F5F0FF_100%)]">
                <svg className="h-7 w-7 text-[#9B8CA8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M3 7h18M6 7V6a2 2 0 012-2h8a2 2 0 012 2v1m-1 0v11a2 2 0 01-2 2H8a2 2 0 01-2-2V7"
                    />
                </svg>
            </div>
            <p className="text-sm font-medium text-slate-600">{title}</p>
            <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </motion.div>
    );
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
    const [isQuickAssignOpen, setIsQuickAssignOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"groups" | "ai" | "analytics" | "settings">("groups");
    const isStudioOwner = initialStudio?.studioRole === 0;

    const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editStartDate, setEditStartDate] = useState("");
    const [editEndDate, setEditEndDate] = useState("");
    const [editLoading, setEditLoading] = useState(false);
    const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null);
    const [editColorHex, setEditColorHex] = useState("#FF5F3D");

    const formatDateForInput = useCallback((iso: string) => {
        if (!iso) return "";
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) return "";
        return date.toISOString().split("T")[0];
    }, []);

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
            updatedAt: initialStudio.updatedAt || "",
            startDate: initialStudio.startDate,
            endDate: initialStudio.endDate,
            avatarUrl: initialStudio.avatarUrl ?? null,
            colorHex: initialStudio.colorHex ?? null
        };
    }, [initialStudio]);

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
            role: mapRole(group.role),
            colorHex: group.colorHex ?? null,
            iconEmoji: group.iconEmoji ?? null
        }));
    }, [initialGroups]);

    const loadData = useCallback(async () => {
        setMembersLoading(true);
        try {
            const profileResult = await getUserProfile(locale);
            if (profileResult.status === "success" && profileResult.data) {
                setUserProfile(profileResult.data);
            }

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
    }, [locale, studioId, t, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (!isStudioOwner && (activeTab === "analytics" || activeTab === "settings")) {
            setActiveTab("groups");
        }
    }, [isStudioOwner, activeTab]);

    useEffect(() => {
        if (!studio || isEditing) return;

        setEditName(studio.name);
        setEditDescription(studio.description);
        setEditStartDate(studio.startDate ? formatDateForInput(studio.startDate) : "");
        setEditEndDate(studio.endDate ? formatDateForInput(studio.endDate) : "");
        setEditAvatarUrl(studio.avatarUrl ?? null);
        setEditColorHex(studio.colorHex ?? "#FF5F3D");
    }, [studio, isEditing, formatDateForInput]);

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

    const handleStartEdit = () => {
        if (studio) {
            setEditName(studio.name);
            setEditDescription(studio.description);
            setEditStartDate(studio.startDate ? formatDateForInput(studio.startDate) : "");
            setEditEndDate(studio.endDate ? formatDateForInput(studio.endDate) : "");
            setEditAvatarUrl(studio.avatarUrl ?? null);
            setEditColorHex(studio.colorHex ?? "#FF5F3D");
        }
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        if (studio) {
            setEditName(studio.name);
            setEditDescription(studio.description);
            setEditStartDate(studio.startDate ? formatDateForInput(studio.startDate) : "");
            setEditEndDate(studio.endDate ? formatDateForInput(studio.endDate) : "");
            setEditAvatarUrl(studio.avatarUrl ?? null);
            setEditColorHex(studio.colorHex ?? "#FF5F3D");
        }
        setIsEditing(false);
    };

    const handleSaveEdit = async () => {
        if (!studio) return;

        if (editStartDate && editEndDate && editStartDate > editEndDate) {
            toast({ description: t("detail.validation.dateRangeError"), variant: "destructive" });
            return;
        }

        setEditLoading(true);
        try {
            const result = await updateStudio(
                studio.id,
                {
                    name: editName,
                    description: editDescription,
                    type: "group",
                    startDate: editStartDate || null,
                    endDate: editEndDate || null,
                    avatarUrl: editAvatarUrl,
                    colorHex: editColorHex
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
            <div className="min-h-screen bg-[linear-gradient(180deg,#FAFAFB_0%,#F7F8FA_100%)]">
                <div className="flex min-h-screen">
                    <DashboardSidebar />
                    <main className="flex-1">
                        <Header userProfile={userProfile} />
                        <div className="flex items-center justify-center py-24">
                            <div className="relative">
                                <div className="h-14 w-14 rounded-full border-4 border-[#F1E8E3]" />
                                <div className="absolute inset-0 h-14 w-14 animate-spin rounded-full border-4 border-transparent border-t-[#FF5F3D] border-r-[#FF7A59]" />
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    if (!studio) {
        return (
            <div className="min-h-screen bg-[linear-gradient(180deg,#FAFAFB_0%,#F7F8FA_100%)]">
                <div className="flex min-h-screen">
                    <DashboardSidebar />
                    <main className="flex-1">
                        <Header userProfile={userProfile} />
                        <div className="flex items-center justify-center py-24">
                            <EmptyBlock title={t("detail.studioNotFound")} subtitle={t("detail.studioNotFoundSubtitle")} />
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[linear-gradient(180deg,#FAFAFB_0%,#F7F8FA_100%)] text-[#261E33]">
            <div className="flex min-h-screen">
                <DashboardSidebar />

                <main className="relative flex-1 overflow-hidden">
                    <FloatingOrb className="left-[-120px] top-[-40px] h-72 w-72 bg-orange-200/25" />
                    <FloatingOrb className="right-[-100px] top-[12%] h-80 w-80 bg-violet-200/20" />
                    <FloatingOrb className="bottom-[-120px] left-[15%] h-80 w-80 bg-sky-200/15" />

                    <Header userProfile={userProfile} />

                    <div className="px-6 py-6">
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative mb-6 overflow-hidden rounded-[36px] border border-white/70 bg-white/72 px-6 py-7 shadow-[0_28px_90px_rgba(15,23,42,0.06)] backdrop-blur-2xl"
                        >
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,190,140,0.20),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(196,181,253,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.68),rgba(255,248,242,0.56))]" />
                            <div className="absolute inset-x-0 top-0 h-px bg-white/90" />

                            <div className="relative">
                                <div className="mb-5 flex items-start gap-4">
                                    <motion.button
                                        whileHover={{ x: -2 }}
                                        whileTap={{ scale: 0.96 }}
                                        type="button"
                                        onClick={() => router.push(`/${locale}/master`)}
                                        className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/90 text-[#6F6B99] shadow-sm transition-all hover:bg-orange-50 hover:text-orange-600"
                                    >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </motion.button>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-4">
                                            <motion.div
                                                whileHover={{ rotate: -2, scale: 1.04 }}
                                                className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/80 shadow-[0_16px_30px_rgba(255,95,61,0.18)]"
                                            >
                                                {studio.avatarUrl ? (
                                                    <img src={studio.avatarUrl} alt={studio.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div
                                                        className="flex h-full w-full items-center justify-center text-white"
                                                        style={{ background: hexToGradient(studio.colorHex ?? "#FF5F3D") }}
                                                    >
                                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                                                            />
                                                        </svg>
                                                    </div>
                                                )}
                                            </motion.div>

                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <h1 className="truncate text-2xl font-bold text-[#261E33] sm:text-[30px]">
                                                        {studio.name}
                                                    </h1>
                                                    <span className="rounded-full border border-orange-100/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700 shadow-sm">
                                                        {t("detail.workspaceBadge")}
                                                    </span>
                                                </div>

                                                {studio.description?.trim() ? (
                                                    <p className="mt-2 max-w-3xl text-sm leading-7 text-[#6F6B99]">
                                                        {studio.description}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.06 }}
                            className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"
                        >
                            <div className="flex w-full flex-wrap items-center gap-2 rounded-2xl border border-orange-100/50 bg-white/80 p-2 shadow-lg shadow-orange-900/5 backdrop-blur-xl xl:w-auto">
                                <TabButton active={activeTab === "groups"} onClick={() => setActiveTab("groups")}>
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                        />
                                    </svg>
                                    {t("detail.tabs.groups")}
                                </TabButton>

                                <TabButton active={activeTab === "ai"} onClick={() => setActiveTab("ai")}>
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9.75 3v2.25m4.5-2.25v2.25M4.5 9.75H3m18 0h-1.5M6.364 6.364l-1.06-1.06m13.392 13.392-1.06-1.06M12 7.5a4.5 4.5 0 00-4.5 4.5v1.25a2.25 2.25 0 01-.659 1.591L6 15.682V18h12v-2.318l-.841-.841A2.25 2.25 0 0116.5 13.25V12A4.5 4.5 0 0012 7.5zM9.75 21h4.5"
                                        />
                                    </svg>
                                    {t("detail.tabs.ai")}
                                </TabButton>

                                {isStudioOwner && (
                                    <TabButton active={activeTab === "analytics"} onClick={() => setActiveTab("analytics")}>
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                            />
                                        </svg>
                                        {t("detail.tabs.analytics")}
                                    </TabButton>
                                )}

                                {isStudioOwner && (
                                    <TabButton active={activeTab === "settings"} onClick={() => setActiveTab("settings")}>
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826-3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                            />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        {t("detail.tabs.settings")}
                                    </TabButton>
                                )}
                            </div>

                            <div className="flex w-full justify-end xl:w-auto">
                                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                    <Button
                                        type="button"
                                        className="h-14 rounded-[22px] bg-[linear-gradient(135deg,#E6492D_0%,#FF5A36_55%,#FF6B45_100%)] px-6 font-semibold text-white shadow-[0_18px_36px_rgba(230,73,45,0.34)] transition-all duration-200 hover:brightness-110 hover:shadow-[0_22px_40px_rgba(230,73,45,0.42)] active:scale-[0.98]"
                                        onClick={() => setIsCreateGroupModalOpen(true)}
                                    >
                                        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        {t("detail.addGroupButton")}
                                    </Button>
                                </motion.div>
                            </div>
                        </motion.div>

                        <AnimatePresence mode="wait">
                            {activeTab === "groups" && (
                                <motion.div
                                    key="groups"
                                    initial={{ opacity: 0, y: 14 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className="grid grid-cols-1 gap-6 lg:grid-cols-12"
                                >
                                    <div className="min-w-0 lg:col-span-8">
                                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                            {groups.length > 0 ? (
                                                groups.map((group) => (
                                                    <motion.div
                                                        key={group.id}
                                                        layout
                                                        initial={{ opacity: 0, y: 16, scale: 0.98 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        whileHover={{ y: -6 }}
                                                        transition={{ duration: 0.24 }}
                                                    >
                                                        <Link
                                                            href={`/${locale}/group/${group.id}`}
                                                            className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-white/80 bg-white/88 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur transition-all duration-300 hover:border-orange-200 hover:shadow-[0_22px_50px_rgba(255,95,61,0.12)]"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <motion.div
                                                                    whileHover={{ rotate: -3, scale: 1.04 }}
                                                                    className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-sm"
                                                                >
                                                                    {group.iconEmoji ? (
                                                                        <div
                                                                            className="flex h-full w-full items-center justify-center text-xl"
                                                                            style={{ background: hexToGradient(group.colorHex ?? "#FF5F3D") }}
                                                                        >
                                                                            {group.iconEmoji}
                                                                        </div>
                                                                    ) : (
                                                                        <div
                                                                            className="flex h-full w-full items-center justify-center text-white"
                                                                            style={{ background: hexToGradient(group.colorHex ?? "#FF5F3D") }}
                                                                        >
                                                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path
                                                                                    strokeLinecap="round"
                                                                                    strokeLinejoin="round"
                                                                                    strokeWidth={2}
                                                                                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                                                                                />
                                                                            </svg>
                                                                        </div>
                                                                    )}
                                                                </motion.div>

                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex min-w-0 flex-nowrap items-center gap-2">
                                                                        <h3 className="truncate text-base font-semibold text-slate-800 transition group-hover:text-[#FF5F3D]">
                                                                            {group.name}
                                                                        </h3>
                                                                        <div className="shrink-0">
                                                                            <RolePill role={group.role} />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {group.description?.trim() ? (
                                                                <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#6F6B99]">
                                                                    {group.description}
                                                                </p>
                                                            ) : null}

                                                            <div className="mt-5 grid grid-cols-2 gap-3">
                                                                <div className="rounded-[18px] border border-[#F1EBE6] bg-[linear-gradient(180deg,#FFFFFF_0%,#FBFAF8_100%)] px-4 py-3 shadow-sm">
                                                                    <div className="flex items-center gap-2 text-xs text-[#6F6B99]">
                                                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                                strokeWidth={2}
                                                                                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                                                                            />
                                                                        </svg>
                                                                        <span>{t("members")}</span>
                                                                    </div>
                                                                    <p className="mt-2 text-lg font-semibold text-[#261E33]">{group.members}</p>
                                                                </div>

                                                                <div className="rounded-[18px] border border-[#F1EBE6] bg-[linear-gradient(180deg,#FFFFFF_0%,#FBFAF8_100%)] px-4 py-3 shadow-sm">
                                                                    <div className="flex items-center gap-2 text-xs text-[#6F6B99]">
                                                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                                strokeWidth={2}
                                                                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                                                                            />
                                                                        </svg>
                                                                        <span>{t("detail.tasks")}</span>
                                                                    </div>
                                                                    <p className="mt-2 text-lg font-semibold text-[#261E33]">{group.tasks}</p>
                                                                </div>
                                                            </div>

                                                            <div className="mt-5 flex justify-end">
                                                                <div className="flex -space-x-1.5">
                                                                    {Array.from({ length: Math.min(group.members, 4) }).map((_, i) => {
                                                                        const member = group.membersPreview?.[i];
                                                                        return (
                                                                            <div
                                                                                key={`${group.id}-avatar-${i}`}
                                                                                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[9px] font-medium text-white shadow-sm ${member?.avatarUrl
                                                                                    ? ""
                                                                                    : i % 4 === 0
                                                                                        ? "bg-gradient-to-br from-orange-400 to-red-500"
                                                                                        : i % 4 === 1
                                                                                            ? "bg-gradient-to-br from-blue-400 to-indigo-500"
                                                                                            : i % 4 === 2
                                                                                                ? "bg-gradient-to-br from-teal-400 to-cyan-500"
                                                                                                : "bg-gradient-to-br from-pink-400 to-rose-500"
                                                                                    }`}
                                                                            >
                                                                                {member?.avatarUrl ? (
                                                                                    <img
                                                                                        src={member.avatarUrl}
                                                                                        alt={member.firstName || t("detail.memberAltFallback")}
                                                                                        className="h-full w-full rounded-full object-cover"
                                                                                    />
                                                                                ) : (
                                                                                    String.fromCharCode(65 + i)
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    {group.members > 4 && (
                                                                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[9px] font-medium text-slate-600">
                                                                            +{group.members - 4}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    </motion.div>
                                                ))
                                            ) : (
                                                <div className="col-span-2">
                                                    <EmptyBlock title={t("noGroups")} subtitle={t("detail.noGroupsSubtitle")} />
                                                </div>
                                            )
                                            }
                                        </div>
                                    </div>

                                    <div className="flex min-w-0 justify-end lg:col-span-4">
                                        <motion.aside
                                            animate={{
                                                width: isRightPanelCollapsed ? 96 : 380
                                            }}
                                            transition={{ duration: 0.28, ease: "easeInOut" }}
                                            className="h-fit max-w-full shrink-0 overflow-hidden rounded-[30px] border border-white/80 bg-white/88 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur"
                                        >
                                            <div
                                                className={`flex border-b border-[#F3F0F7] px-4 py-4 ${isRightPanelCollapsed ? "justify-center" : "items-center justify-between"
                                                    }`}
                                            >
                                                {!isRightPanelCollapsed ? (
                                                    <div className="min-w-0">
                                                        <h3 className="truncate text-base font-semibold text-slate-800">{t("detail.panel.title")}</h3>
                                                        <p className="mt-0.5 text-xs text-slate-500">{t("detail.panel.subtitle")}</p>
                                                    </div>
                                                ) : null}

                                                <button
                                                    type="button"
                                                    onClick={() => setIsRightPanelCollapsed((prev) => !prev)}
                                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/90 text-[#6F6B99] shadow-sm transition-all hover:bg-orange-50 hover:text-orange-600"
                                                    title={isRightPanelCollapsed ? t("detail.panel.expand") : t("detail.panel.collapse")}
                                                >
                                                    <motion.svg
                                                        animate={{ rotate: isRightPanelCollapsed ? 0 : 180 }}
                                                        transition={{ duration: 0.22 }}
                                                        className="h-5 w-5"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                    </motion.svg>
                                                </button>
                                            </div>

                                            <AnimatePresence mode="wait" initial={false}>
                                                {isRightPanelCollapsed ? (
                                                    <motion.div
                                                        key="collapsed-panel"
                                                        initial={{ opacity: 0, scale: 0.96 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.96 }}
                                                        className="flex flex-col items-center gap-4 px-3 py-5"
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsInviteModalOpen(true)}
                                                            className="group flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 text-orange-600 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-orange-100 hover:shadow-md"
                                                            title={t("members")}
                                                        >
                                                            <svg
                                                                className="h-5 w-5 transition-transform group-hover:scale-110"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                                                />
                                                            </svg>
                                                        </button>

                                                        {isStudioOwner && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setActiveTab("analytics")}
                                                                className={`group flex h-14 w-14 items-center justify-center rounded-2xl border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${(activeTab as "groups" | "ai" | "analytics" | "settings") === "analytics"
                                                                    ? "border-violet-200 bg-violet-100 text-violet-700"
                                                                    : "border-violet-100 bg-violet-50 text-violet-600 hover:bg-violet-100"
                                                                    }`}
                                                                title={t("detail.tabs.analytics")}
                                                            >
                                                                <svg
                                                                    className="h-5 w-5 transition-transform group-hover:scale-110"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={2}
                                                                        d="M9 17v-6m4 6V7m4 10v-3M5 21h14"
                                                                    />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </motion.div>
                                                ) : (
                                                    <motion.div
                                                        key="expanded-panel"
                                                        initial={{ opacity: 0, x: 8 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -8 }}
                                                        className="space-y-6 px-5 py-5"
                                                    >
                                                        <section className="min-w-0">
                                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                                <h4 className="text-sm font-semibold text-slate-800">{t("detail.panel.memberListTitle")}</h4>
                                                                <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-600">
                                                                    {members.length}
                                                                </span>
                                                            </div>

                                                            <div className="min-w-0">
                                                                <MemberList
                                                                    members={members}
                                                                    studioOwnerId={initialStudio?.ownerId}
                                                                    groups={initialGroups.map((g) => ({ id: g.id || "", name: g.name || "" }))}
                                                                    onInviteClick={() => setIsInviteModalOpen(true)}
                                                                    onQuickAssignClick={() => setIsQuickAssignOpen(true)}
                                                                    onMemberClick={(member) => setSelectedMember(member)}
                                                                />
                                                            </div>
                                                        </section>

                                                        <section className="border-t border-[#F3F0F7] pt-5">
                                                            <div className="mb-3 flex items-center gap-3">
                                                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F8F5FF] text-violet-600">
                                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path
                                                                            strokeLinecap="round"
                                                                            strokeLinejoin="round"
                                                                            strokeWidth={2}
                                                                            d="M9 17v-6m4 6V7m4 10v-3M5 21h14"
                                                                        />
                                                                    </svg>
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-sm font-semibold text-slate-800">{t("detail.panel.quickStatsTitle")}</h4>
                                                                    <p className="text-xs text-slate-500">{t("detail.panel.quickStatsSubtitle")}</p>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-3">
                                                                <div className="flex items-center justify-between rounded-[18px] border border-[#F1EBE6] bg-[linear-gradient(180deg,#FFFFFF_0%,#FBFAF8_100%)] px-4 py-3 text-sm shadow-sm">
                                                                    <span className="text-slate-500">{t("groups")}</span>
                                                                    <span className="font-semibold text-slate-800">{groups.length}</span>
                                                                </div>

                                                                <div className="flex items-center justify-between rounded-[18px] border border-[#F1EBE6] bg-[linear-gradient(180deg,#FFFFFF_0%,#FBFAF8_100%)] px-4 py-3 text-sm shadow-sm">
                                                                    <span className="text-slate-500">{t("members")}</span>
                                                                    <span className="font-semibold text-slate-800">{members.length}</span>
                                                                </div>

                                                                <div className="flex items-center justify-between rounded-[18px] border border-[#F1EBE6] bg-[linear-gradient(180deg,#FFFFFF_0%,#FBFAF8_100%)] px-4 py-3 text-sm shadow-sm">
                                                                    <span className="text-slate-500">{t("detail.panel.created")}</span>
                                                                    <span className="font-semibold text-slate-800">
                                                                        {studio.createdAt
                                                                            ? new Date(studio.createdAt).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
                                                                                month: "numeric",
                                                                                day: "numeric",
                                                                                year: "numeric"
                                                                            })
                                                                            : t("detail.notAvailable")}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </section>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.aside>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === "analytics" && (
                                <motion.div
                                    key="analytics"
                                    initial={{ opacity: 0, y: 14 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                >
                                    <AnalyticMaster
                                        studioRole={initialStudio?.studioRole}
                                        maxStorageMb={userProfile?.subscriptionPlan?.maxStorageMb}
                                    />
                                </motion.div>
                            )}

                            {activeTab === "ai" && (
                                <motion.div
                                    key="ai"
                                    initial={{ opacity: 0, y: 14 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                >
                                    <AIMaster studioId={studioId} />
                                </motion.div>
                            )}

                            {activeTab === "settings" && (
                                <motion.div
                                    key="settings"
                                    initial={{ opacity: 0, y: 14 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className="space-y-6"
                                >
                                    <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/88 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur">
                                        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
                                                    <svg className="h-4 w-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826-3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                                        />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h2 className="text-sm font-bold text-gray-900">{t("detail.settings.title")}</h2>
                                                    <p className="mt-0.5 text-xs text-gray-500">{t("detail.settings.subtitle")}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {isEditing ? (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={handleCancelEdit}
                                                        className="h-10 rounded-xl border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                                                    >
                                                        {t("modal.cancel")}
                                                    </Button>
                                                ) : null}

                                                <Button
                                                    type="button"
                                                    onClick={isEditing ? handleSaveEdit : handleStartEdit}
                                                    disabled={editLoading}
                                                    className="h-10 rounded-xl bg-[linear-gradient(135deg,#E6492D_0%,#FF5A36_55%,#FF6B45_100%)] px-4 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(230,73,45,0.24)] hover:brightness-110 disabled:opacity-50"
                                                >
                                                    {editLoading ? t("detail.settings.saving") : isEditing ? t("detail.settings.saveChanges") : t("detail.settings.edit")}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="px-6 py-6">
                                            <div className="mb-6 flex flex-col gap-6 lg:flex-row lg:items-end">
                                                <AvatarUpload
                                                    entityType="studio"
                                                    entityId={studio.id}
                                                    avatarUrl={isEditing ? editAvatarUrl : studio.avatarUrl}
                                                    colorHex={editColorHex}
                                                    onUploadSuccess={(url) => setEditAvatarUrl(url)}
                                                    onError={(msg) => toast({ description: msg, variant: "destructive" })}
                                                    disabled={!isEditing}
                                                />
                                                <div className="flex-1 rounded-[24px] border border-[#F1EDF7] bg-[#FCFBFE] p-4 shadow-sm">
                                                    <ColorPicker
                                                        label={t("detail.settings.primaryColor")}
                                                        value={isEditing ? editColorHex : studio.colorHex ?? "#FF5F3D"}
                                                        onChange={isEditing ? setEditColorHex : undefined}
                                                        disabled={!isEditing}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-5">
                                                <div>
                                                    <label htmlFor="studio-name-input" className="text-xs font-semibold text-gray-700">
                                                        {t("modal.name")} <span className="text-red-500">*</span>
                                                    </label>
                                                    <Input
                                                        id="studio-name-input"
                                                        disabled={!isEditing}
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        className="mt-2 h-11 rounded-2xl border-gray-200 bg-white shadow-sm focus-visible:border-orange-500 focus-visible:ring-orange-500 disabled:opacity-70"
                                                    />
                                                </div>

                                                <div>
                                                    <label htmlFor="studio-description-input" className="text-xs font-semibold text-gray-700">
                                                        {t("modal.description")}
                                                    </label>
                                                    <Textarea
                                                        id="studio-description-input"
                                                        disabled={!isEditing}
                                                        value={editDescription}
                                                        onChange={(e) => setEditDescription(e.target.value)}
                                                        className="mt-2 min-h-28 rounded-2xl border-gray-200 bg-white shadow-sm focus-visible:border-orange-500 focus-visible:ring-orange-500 disabled:opacity-70"
                                                        placeholder={t("modal.descriptionPlaceholder")}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                    <div>
                                                        <label htmlFor="studio-start-date" className="text-xs font-semibold text-gray-700">
                                                            {t("detail.settings.startDate")}
                                                        </label>
                                                        {isEditing ? (
                                                            <Input
                                                                id="studio-start-date"
                                                                type="date"
                                                                value={editStartDate}
                                                                onChange={(e) => setEditStartDate(e.target.value)}
                                                                className="mt-2 h-11 rounded-2xl border-gray-200 bg-white shadow-sm focus-visible:border-orange-500 focus-visible:ring-orange-500"
                                                            />
                                                        ) : (
                                                            <Input
                                                                id="studio-start-date"
                                                                value={editStartDate || t("detail.notAvailable")}
                                                                readOnly
                                                                tabIndex={-1}
                                                                aria-readonly="true"
                                                                onMouseDown={(e) => e.preventDefault()}
                                                                onFocus={(e) => e.currentTarget.blur()}
                                                                className="mt-2 h-11 cursor-default rounded-2xl border-gray-200 bg-gray-50 text-gray-900 focus-visible:ring-0"
                                                            />
                                                        )}
                                                    </div>

                                                    <div>
                                                        <label htmlFor="studio-end-date" className="text-xs font-semibold text-gray-700">
                                                            {t("detail.settings.endDate")}
                                                        </label>
                                                        {isEditing ? (
                                                            <Input
                                                                id="studio-end-date"
                                                                type="date"
                                                                value={editEndDate}
                                                                onChange={(e) => setEditEndDate(e.target.value)}
                                                                className="mt-2 h-11 rounded-2xl border-gray-200 bg-white shadow-sm focus-visible:border-orange-500 focus-visible:ring-orange-500"
                                                            />
                                                        ) : (
                                                            <Input
                                                                id="studio-end-date"
                                                                value={editEndDate || t("detail.notAvailable")}
                                                                readOnly
                                                                tabIndex={-1}
                                                                aria-readonly="true"
                                                                onMouseDown={(e) => e.preventDefault()}
                                                                onFocus={(e) => e.currentTarget.blur()}
                                                                className="mt-2 h-11 cursor-default rounded-2xl border-gray-200 bg-gray-50 text-gray-900 focus-visible:ring-0"
                                                            />
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                    <div>
                                                        <label htmlFor="studio-created-date" className="text-xs font-semibold text-gray-700">
                                                            {t("detail.settings.createdDate")}
                                                        </label>
                                                        <Input
                                                            id="studio-created-date"
                                                            value={
                                                                studio.createdAt
                                                                    ? new Date(studio.createdAt).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
                                                                        day: "numeric",
                                                                        month: "long",
                                                                        year: "numeric"
                                                                    })
                                                                    : t("detail.notAvailable")
                                                            }
                                                            readOnly
                                                            tabIndex={-1}
                                                            aria-readonly="true"
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onFocus={(e) => e.currentTarget.blur()}
                                                            className="mt-2 h-11 cursor-default rounded-2xl border-gray-200 bg-gray-50 text-gray-900 focus-visible:ring-0"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label htmlFor="studio-group-count" className="text-xs font-semibold text-gray-700">
                                                            {t("detail.settings.groupCount")}
                                                        </label>
                                                        <Input
                                                            id="studio-group-count"
                                                            value={studio.groupCount}
                                                            readOnly
                                                            tabIndex={-1}
                                                            aria-readonly="true"
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onFocus={(e) => e.currentTarget.blur()}
                                                            className="mt-2 h-11 cursor-default rounded-2xl border-gray-200 bg-gray-50 text-gray-900 focus-visible:ring-0"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="overflow-hidden rounded-[28px] border border-red-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                                        <div className="border-b border-red-200 px-6 py-5">
                                            <h2 className="text-sm font-bold text-red-700">{t("detail.danger.title")}</h2>
                                        </div>

                                        <div className="px-6 py-6">
                                            <div className="rounded-[24px] border border-red-200 bg-red-50 p-5">
                                                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                                    <div>
                                                        <div className="text-sm font-bold text-red-700">{t("deleteModal.title")}</div>
                                                        <div className="mt-1 text-xs leading-6 text-red-600">
                                                            {t("detail.danger.deleteDescription")}
                                                        </div>
                                                    </div>

                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                type="button"
                                                                className="h-11 rounded-2xl bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700"
                                                            >
                                                                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={2}
                                                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                    />
                                                                </svg>
                                                                {t("deleteModal.title")}
                                                            </Button>
                                                        </AlertDialogTrigger>

                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>{t("detail.danger.confirmTitle")}</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    {t("detail.danger.confirmDescription")}
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>

                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>{t("deleteModal.cancel")}</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    className="bg-red-600 hover:bg-red-700"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        handleDeleteStudio();
                                                                    }}
                                                                >
                                                                    {t("detail.danger.confirmDelete")}
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </main>
            </div>

            <InviteMemberModal
                open={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                groupName={studio?.name || t("group")}
                variant="studio"
                canManage={true}
                onCreateLink={async ({ role }) => {
                    const result = await createStudioInviteLink({ studioId: studio?.id, role: role as string }, locale);
                    if (result.status === "success" && result.data?.inviteUrl) {
                        return result.data.inviteUrl;
                    }
                    throw new Error(t("detail.invite.createLinkError"));
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
                    router.refresh();
                    toast({
                        description: t("detail.groupCreatedSuccess"),
                        variant: "success"
                    });
                }}
            />

            <QuickAssignModal
                open={isQuickAssignOpen}
                onClose={() => setIsQuickAssignOpen(false)}
                studioId={studioId}
                groups={initialGroups.map((g) => ({
                    id: g.id || "",
                    name: g.name || "",
                    memberCount: g.memberCount ?? 0
                }))}
                studioOwnerId={initialStudio?.ownerId}
                members={members}
                onSuccess={() => {
                    loadData();
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