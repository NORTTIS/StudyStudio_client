"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createStudioInviteLink, sendStudioInviteEmail } from "@/api/studio-invites";
import { toggleGroupArchive } from "@/api/groups";
import {
    approveStudioPendingMember,
    deleteStudio,
    getStudioMembers,
    getStudioPendingMembers,
    leaveStudio,
    removeStudioMember,
    rejectStudioPendingMember,
    toggleStudioArchive,
    toggleStudioMemberApproval,
    type StudioPendingMemberDto,
    type StudioMemberResponse,
    type StudioUI,
    updateStudio
} from "@/api/studios";
import type { components } from "@/api/types";
import { getUserProfile, type UserProfile } from "@/api/user-profile";
import { GroupBannerBackground } from "@/components/features/group/GroupBannerBackground";
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
import { BannerUpload } from "@/components/ui/banner-upload";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";
import { AliasInput } from "@/components/ui/alias-input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { hexToGradient } from "@/lib/utils";
import { LogOut, Power, Search } from "lucide-react";
import AIMaster from "./AIMaster";
import AnalyticMaster from "./analytic/AnalyticMaster";
import { MemberDetailModal } from "./MemberDetailModal";
import { MemberList } from "./MemberList";
import { QuickAssignModal } from "./QuickAssignModal";

type StudioResponse = components["schemas"]["StudioResponse"];
type GroupCardDto = components["schemas"]["GroupCardDto"];

const STUDIO_NAME_MAX_LENGTH = 30;
const STUDIO_DESCRIPTION_MAX_LENGTH = 200;

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
    isOpen?: boolean;
    isArchived?: boolean;
}

interface StudioDetailPageProps {
    initialStudio: StudioResponse | null;
    initialGroups: GroupCardDto[];
    bannerUrl?: string | null;
    colorHex?: string | null;
}

type StudioPendingApprovalItem = StudioPendingMemberDto & {
    id: string;
    fullName: string;
    colorHex?: string | null;
};

const studioMemberApprovalStorageKey = (studioId: string) => `studio:${studioId}:requires-member-approval`;
const studioAutoPausedGroupsStorageKey = (studioId: string) => `studio:${studioId}:auto-paused-group-ids`;

const readStudioMemberApprovalFallback = (studioId: string): boolean | null => {
    if (!studioId) return null;
    try {
        const raw = localStorage.getItem(studioMemberApprovalStorageKey(studioId));
        if (raw === null) return null;
        return raw === "1";
    } catch {
        return null;
    }
};

const writeStudioMemberApprovalFallback = (studioId: string, value: boolean) => {
    if (!studioId) return;
    try {
        localStorage.setItem(studioMemberApprovalStorageKey(studioId), value ? "1" : "0");
    } catch {
        // Ignore storage failure and keep API as source of truth.
    }
};

const readStudioAutoPausedGroups = (studioId: string): string[] => {
    if (!studioId) return [];

    try {
        const raw = localStorage.getItem(studioAutoPausedGroupsStorageKey(studioId));
        if (!raw) return [];

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        return parsed
            .map((id) => String(id || "").trim())
            .filter(Boolean);
    } catch {
        return [];
    }
};

const writeStudioAutoPausedGroups = (studioId: string, groupIds: string[]) => {
    if (!studioId) return;

    try {
        const normalized = Array.from(new Set(groupIds.map((id) => String(id || "").trim()).filter(Boolean)));

        if (normalized.length === 0) {
            localStorage.removeItem(studioAutoPausedGroupsStorageKey(studioId));
            return;
        }

        localStorage.setItem(studioAutoPausedGroupsStorageKey(studioId), JSON.stringify(normalized));
    } catch {
        // Ignore localStorage failure and keep API as source of truth.
    }
};

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
    children,
    disabled = false
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    disabled?: boolean;
}) {
    return (
        <motion.button
            type="button"
            onClick={() => {
                if (disabled) return;
                onClick();
            }}
            disabled={disabled}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-300 ${disabled
                ? "cursor-not-allowed opacity-50"
                : ""
                } ${active
                    ? "bg-[linear-gradient(135deg,#E6492D_0%,#FF5A36_55%,#FF6B45_100%)] text-white shadow-[0_16px_32px_rgba(230,73,45,0.28)]"
                    : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                }`}>
            {children}
        </motion.button>
    );
}

function EmptyBlock({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[28px] border border-white/80 bg-white/82 p-14 text-center shadow-sm backdrop-blur">
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

export default function StudioDetailPage({ initialStudio, initialGroups, bannerUrl, colorHex }: StudioDetailPageProps) {
    const params = useParams();
    const router = useRouter();
    const t = useTranslations("MasterPage");
    const groupT = useTranslations("GroupsPage");
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
    const [groupSearchQuery, setGroupSearchQuery] = useState("");
    const [panelView, setPanelView] = useState<"members" | "approvals">("members");
    const [pendingApprovals, setPendingApprovals] = useState<StudioPendingApprovalItem[]>([]);
    const [pendingApprovalsLoading, setPendingApprovalsLoading] = useState(false);
    const [pendingApprovalsError, setPendingApprovalsError] = useState("");
    const [approvalActionByUserId, setApprovalActionByUserId] = useState<Record<string, "approve" | "reject" | null>>({});
    const [removingMemberUserId, setRemovingMemberUserId] = useState<string | null>(null);
    const [memberPendingRemoval, setMemberPendingRemoval] = useState<StudioMemberResponse | null>(null);
    const [requiresMemberApproval, setRequiresMemberApproval] = useState(false);
    const [isUpdatingMemberApproval, setIsUpdatingMemberApproval] = useState(false);
    const [isStudioArchived, setIsStudioArchived] = useState(Boolean(initialStudio?.isArchived ?? false));
    const [isUpdatingStudioArchive, setIsUpdatingStudioArchive] = useState(false);
    const [groupArchiveStateById, setGroupArchiveStateById] = useState<Record<string, boolean>>(() => {
        return initialGroups.reduce<Record<string, boolean>>((acc, group) => {
            const groupId = String(group.id || "").trim();
            if (!groupId) return acc;

            acc[groupId] = Boolean((group as GroupCardDto & { isArchived?: boolean | null }).isArchived ?? false);
            return acc;
        }, {});
    });
    const isStudioOwner = initialStudio?.studioRole === 0;
    const canLeaveStudio = initialStudio?.studioRole === 1;

    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editStartDate, setEditStartDate] = useState("");
    const [editEndDate, setEditEndDate] = useState("");
    const [editLoading, setEditLoading] = useState(false);
    const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null);
    const [editColorHex, setEditColorHex] = useState("#FF5F3D");
    const [editBannerUrl, setEditBannerUrl] = useState<string | null>(null);
    const [editTagline, setEditTagline] = useState("");
    const [editAlias, setEditAlias] = useState("");
    const [isLeavingStudio, setIsLeavingStudio] = useState(false);

    const clampStudioName = useCallback((value: string) => value.slice(0, STUDIO_NAME_MAX_LENGTH), []);
    const clampStudioDescription = useCallback((value: string) => value.slice(0, STUDIO_DESCRIPTION_MAX_LENGTH), []);

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
            colorHex: initialStudio.colorHex ?? null,
            bannerUrl: initialStudio.bannerUrl ?? null,
            tagline: initialStudio.tagline ?? null,
            alias: initialStudio.alias ?? null,
            isOpen: initialStudio.isOpen ?? true,
            isArchived: initialStudio.isArchived ?? false
        };
    }, [initialStudio]);

    useEffect(() => {
        setIsStudioArchived(Boolean(initialStudio?.isArchived ?? false));
    }, [initialStudio?.isArchived]);

    useEffect(() => {
        setGroupArchiveStateById(
            initialGroups.reduce<Record<string, boolean>>((acc, group) => {
                const groupId = String(group.id || "").trim();
                if (!groupId) return acc;

                acc[groupId] = Boolean((group as GroupCardDto & { isArchived?: boolean | null }).isArchived ?? false);
                return acc;
            }, {})
        );
    }, [initialGroups]);

    const groups: TransformedGroup[] = useMemo(() => {
        return initialGroups.map((group) => {
            const groupId = String(group.id || "").trim();
            const fallbackArchived = Boolean((group as GroupCardDto & { isArchived?: boolean | null }).isArchived ?? false);
            const isArchived = groupId in groupArchiveStateById ? groupArchiveStateById[groupId] : fallbackArchived;

            return {
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
                iconEmoji: group.iconEmoji ?? null,
                isOpen: group.isOpen ?? true,
                isArchived
            };
        });
    }, [groupArchiveStateById, initialGroups]);

    const filteredGroups = useMemo(() => {
        const query = groupSearchQuery.trim().toLowerCase();
        if (!query) return groups;

        return groups.filter((group) => {
            return [group.name, group.description, group.code]
                .join(" ")
                .toLowerCase()
                .includes(query);
        });
    }, [groupSearchQuery, groups]);

    const quickAssignEligibleGroups = useMemo(() => {
        return initialGroups
            .filter((group) => {
                const groupId = String(group.id || "").trim();
                const fallbackArchived = Boolean((group as GroupCardDto & { isArchived?: boolean | null }).isArchived ?? false);
                const isArchived = groupId in groupArchiveStateById ? groupArchiveStateById[groupId] : fallbackArchived;
                return !isArchived;
            })
            .map((group) => ({
                id: group.id || "",
                name: group.name || "",
                memberCount: group.memberCount ?? 0
            }))
            .filter((group) => !!group.id);
    }, [groupArchiveStateById, initialGroups]);

    const syncGroupArchiveWithStudio = useCallback(async (nextIsArchived: boolean) => {
        if (!studioId) return;

        if (nextIsArchived) {
            const groupIdsToPause = initialGroups
                .map((group) => String(group.id || "").trim())
                .filter((groupId) => {
                    if (!groupId) return false;

                    const fallbackArchived = Boolean(
                        (initialGroups.find((group) => String(group.id || "").trim() === groupId) as GroupCardDto & { isArchived?: boolean | null } | undefined)
                            ?.isArchived ?? false
                    );
                    const isArchived = groupId in groupArchiveStateById ? groupArchiveStateById[groupId] : fallbackArchived;
                    return !isArchived;
                });

            if (groupIdsToPause.length === 0) {
                writeStudioAutoPausedGroups(studioId, []);
                return;
            }

            const settled = await Promise.allSettled(
                groupIdsToPause.map(async (groupId) => {
                    const result = await toggleGroupArchive(groupId, true, locale);
                    if (result.status !== "success") {
                        throw new Error(result.message || "Failed to pause group");
                    }
                    return groupId;
                })
            );

            const successGroupIds: string[] = [];
            let failedCount = 0;

            settled.forEach((item) => {
                if (item.status === "fulfilled") {
                    successGroupIds.push(item.value);
                    return;
                }
                failedCount += 1;
            });

            if (successGroupIds.length > 0) {
                setGroupArchiveStateById((prev) => {
                    const next = { ...prev };
                    successGroupIds.forEach((groupId) => {
                        next[groupId] = true;
                    });
                    return next;
                });

                writeStudioAutoPausedGroups(studioId, successGroupIds);
            }

            if (failedCount > 0) {
                toast({
                    description:
                        locale === "vi"
                            ? `Có ${failedCount} nhóm chưa dừng hoạt động theo studio.`
                            : `${failedCount} groups could not be paused with the studio.`,
                    variant: "destructive"
                });
            }

            return;
        }

        const autoPausedGroupIds = readStudioAutoPausedGroups(studioId);
        if (autoPausedGroupIds.length === 0) return;

        const settled = await Promise.allSettled(
            autoPausedGroupIds.map(async (groupId) => {
                const result = await toggleGroupArchive(groupId, false, locale);
                if (result.status !== "success") {
                    throw new Error(result.message || "Failed to reactivate group");
                }
                return groupId;
            })
        );

        const successGroupIds: string[] = [];
        const failedGroupIds: string[] = [];

        settled.forEach((item, index) => {
            const groupId = autoPausedGroupIds[index] ?? "";
            if (!groupId) return;

            if (item.status === "fulfilled") {
                successGroupIds.push(groupId);
                return;
            }

            failedGroupIds.push(groupId);
        });

        if (successGroupIds.length > 0) {
            setGroupArchiveStateById((prev) => {
                const next = { ...prev };
                successGroupIds.forEach((groupId) => {
                    next[groupId] = false;
                });
                return next;
            });
        }

        writeStudioAutoPausedGroups(studioId, failedGroupIds);

        if (failedGroupIds.length > 0) {
            toast({
                description:
                    locale === "vi"
                        ? `Có ${failedGroupIds.length} nhóm chưa mở lại hoạt động.`
                        : `${failedGroupIds.length} groups could not be reactivated.`,
                variant: "destructive"
            });
        }
    }, [groupArchiveStateById, initialGroups, locale, studioId, toast]);

    useEffect(() => {
        const source = initialStudio as (StudioResponse & {
            requiresMemberApproval?: boolean | null;
            memberApprovalRequired?: boolean | null;
        }) | null;

        const fromApi = source?.requiresMemberApproval ?? source?.memberApprovalRequired;
        const fromStorage = readStudioMemberApprovalFallback(studioId);
        const resolved = typeof fromApi === "boolean" ? fromApi : (fromStorage ?? false);

        setRequiresMemberApproval(resolved);
    }, [initialStudio, studioId]);

    const mapPendingApproval = useCallback((member: StudioPendingMemberDto): StudioPendingApprovalItem => {
        const firstName = String(member.firstName ?? "").trim();
        const lastName = String(member.lastName ?? "").trim();
        const fullName = `${firstName} ${lastName}`.trim() || String(member.email || "Unknown");

        return {
            ...member,
            id: String(member.userId || ""),
            fullName,
            colorHex: null
        };
    }, []);

    const loadPendingApprovals = useCallback(async () => {
        if (!studioId || !isStudioOwner) {
            setPendingApprovals([]);
            setPendingApprovalsError("");
            return;
        }

        setPendingApprovalsLoading(true);
        setPendingApprovalsError("");

        try {
            const response = await getStudioPendingMembers(studioId, locale);

            if (response.status === "success" && response.data) {
                const items = (response.data.pendingMembers || [])
                    .map(mapPendingApproval)
                    .filter((item) => item.id);
                setPendingApprovals(items);
                return;
            }

            setPendingApprovals([]);
            setPendingApprovalsError(
                response.message
                || (locale === "vi" ? "Không tải được danh sách chờ duyệt" : "Failed to load pending members")
            );
        } catch (error) {
            console.error("Load studio pending members failed:", error);
            setPendingApprovals([]);
            setPendingApprovalsError(
                locale === "vi" ? "Không tải được danh sách chờ duyệt" : "Failed to load pending members"
            );
        } finally {
            setPendingApprovalsLoading(false);
        }
    }, [isStudioOwner, locale, mapPendingApproval, studioId]);

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

            await loadPendingApprovals();
        } catch (error) {
            console.error("Load data failed:", error);
            toast({ description: t("loadError"), variant: "destructive" });
        } finally {
            setMembersLoading(false);
        }
    }, [loadPendingApprovals, locale, studioId, t, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (!isStudioOwner && (activeTab === "analytics" || activeTab === "settings")) {
            setActiveTab("groups");
        }
    }, [isStudioOwner, activeTab]);

    useEffect(() => {
        if (!isStudioArchived) return;

        if (isStudioOwner && activeTab !== "settings" && activeTab !== "groups") {
            setActiveTab("settings");
            return;
        }

        if (!isStudioOwner) {
            router.replace(`/${locale}/master`);
        }
    }, [activeTab, isStudioArchived, isStudioOwner, locale, router]);

    useEffect(() => {
        if (!isStudioArchived) return;

        setIsInviteModalOpen(false);
        setIsQuickAssignOpen(false);
        setSelectedMember(null);
        setMemberPendingRemoval(null);
    }, [isStudioArchived]);

    useEffect(() => {
        if (!studio || isEditing) return;

        setEditName(clampStudioName(studio.name));
        setEditDescription(clampStudioDescription(studio.description));
        setEditStartDate(studio.startDate ? formatDateForInput(studio.startDate) : "");
        setEditEndDate(studio.endDate ? formatDateForInput(studio.endDate) : "");
        setEditAvatarUrl(studio.avatarUrl ?? null);
        setEditColorHex(studio.colorHex ?? "#FF5F3D");
        setEditBannerUrl(studio.bannerUrl ?? null);
        setEditTagline(studio.tagline ?? "");
        setEditAlias(studio.alias ?? "");
    }, [clampStudioDescription, clampStudioName, studio, isEditing, formatDateForInput]);

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

    const handleLeaveStudio = async () => {
        if (!studio || isLeavingStudio || !canLeaveStudio) return;

        setIsLeavingStudio(true);
        try {
            const result = await leaveStudio(studio.id, locale);

            if (result.status === "success") {
                toast({ description: t("detail.leave.success"), variant: "success" });
                router.push(`/${locale}/master`);
                return;
            }

            toast({ description: t("detail.leave.error"), variant: "destructive" });
        } catch (error) {
            console.error("Leave studio failed:", error);
            toast({ description: t("detail.leave.error"), variant: "destructive" });
        } finally {
            setIsLeavingStudio(false);
        }
    };

    const handleStartEdit = () => {
        if (isStudioArchived) return;

        if (studio) {
            setEditName(clampStudioName(studio.name));
            setEditDescription(clampStudioDescription(studio.description));
            setEditStartDate(studio.startDate ? formatDateForInput(studio.startDate) : "");
            setEditEndDate(studio.endDate ? formatDateForInput(studio.endDate) : "");
            setEditAvatarUrl(studio.avatarUrl ?? null);
            setEditColorHex(studio.colorHex ?? "#FF5F3D");
            setEditBannerUrl(studio.bannerUrl ?? null);
            setEditTagline(studio.tagline ?? "");
            setEditAlias(studio.alias ?? "");
        }
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        if (studio) {
            setEditName(clampStudioName(studio.name));
            setEditDescription(clampStudioDescription(studio.description));
            setEditStartDate(studio.startDate ? formatDateForInput(studio.startDate) : "");
            setEditEndDate(studio.endDate ? formatDateForInput(studio.endDate) : "");
            setEditAvatarUrl(studio.avatarUrl ?? null);
            setEditColorHex(studio.colorHex ?? "#FF5F3D");
            setEditBannerUrl(studio.bannerUrl ?? null);
            setEditTagline(studio.tagline ?? "");
            setEditAlias(studio.alias ?? "");
        }
        setIsEditing(false);
    };

    const handleApprovePendingMember = async (userId: string) => {
        if (!studioId || !isStudioOwner) return;

        setApprovalActionByUserId((prev) => ({ ...prev, [userId]: "approve" }));
        setPendingApprovalsError("");

        try {
            const response = await approveStudioPendingMember(studioId, userId, locale);
            if (response.status !== "success") {
                setPendingApprovalsError(
                    response.message
                    || (locale === "vi" ? "Phê duyệt thành viên thất bại" : "Failed to approve member")
                );
                return;
            }

            setPendingApprovals((prev) => prev.filter((item) => item.id !== userId));
            await loadPendingApprovals();
        } catch (error) {
            console.error("Approve studio pending member failed:", error);
            setPendingApprovalsError(
                locale === "vi" ? "Phê duyệt thành viên thất bại" : "Failed to approve member"
            );
        } finally {
            setApprovalActionByUserId((prev) => ({ ...prev, [userId]: null }));
        }
    };

    const handleRejectPendingMember = async (userId: string) => {
        if (!studioId || !isStudioOwner) return;

        setApprovalActionByUserId((prev) => ({ ...prev, [userId]: "reject" }));
        setPendingApprovalsError("");

        try {
            await rejectStudioPendingMember(studioId, userId, locale);
            setPendingApprovals((prev) => prev.filter((item) => item.id !== userId));
            await loadPendingApprovals();
        } catch (error) {
            console.error("Reject studio pending member failed:", error);
            setPendingApprovalsError(
                locale === "vi" ? "Từ chối yêu cầu thất bại" : "Failed to reject request"
            );
        } finally {
            setApprovalActionByUserId((prev) => ({ ...prev, [userId]: null }));
        }
    };

    const handleMemberApprovalToggle = async (checked: boolean) => {
        if (!studio || !isStudioOwner || isUpdatingMemberApproval || isEditing) return;

        const previous = requiresMemberApproval;
        setRequiresMemberApproval(checked);
        setIsUpdatingMemberApproval(true);
        setPendingApprovalsError("");

        try {
            const result = await toggleStudioMemberApproval(studio.id, checked, locale);

            if (result.status !== "success") {
                setRequiresMemberApproval(previous);
                setPendingApprovalsError(
                    result.message
                    || (locale === "vi" ? "Không thể cập nhật cài đặt duyệt thành viên" : "Failed to update approval setting")
                );
                return;
            }

            writeStudioMemberApprovalFallback(studio.id, checked);
        } catch (error) {
            console.error("Update studio member approval failed:", error);
            setRequiresMemberApproval(previous);
            setPendingApprovalsError(
                locale === "vi" ? "Không thể cập nhật cài đặt duyệt thành viên" : "Failed to update approval setting"
            );
        } finally {
            setIsUpdatingMemberApproval(false);
        }
    };

    const handleStudioArchiveToggle = async (nextIsActive: boolean) => {
        if (!studio || !isStudioOwner || isUpdatingStudioArchive) return;

        const nextIsArchived = !nextIsActive;
        const previous = isStudioArchived;

        setIsStudioArchived(nextIsArchived);
        setIsUpdatingStudioArchive(true);

        try {
            const result = await toggleStudioArchive(studio.id, nextIsArchived, locale);
            if (result.status !== "success") {
                setIsStudioArchived(previous);
                toast({
                    description:
                        result.message
                        || (locale === "vi" ? "Không thể cập nhật trạng thái hoạt động của studio" : "Failed to update studio activity status"),
                    variant: "destructive"
                });
                return;
            }

            if (nextIsArchived && activeTab !== "settings" && activeTab !== "groups") {
                setActiveTab("settings");
            }

            await syncGroupArchiveWithStudio(nextIsArchived);

            if (nextIsArchived) {
                setIsEditing(false);
            }
        } catch (error) {
            console.error("Update studio archive status failed:", error);
            setIsStudioArchived(previous);
            toast({
                description:
                    locale === "vi" ? "Không thể cập nhật trạng thái hoạt động của studio" : "Failed to update studio activity status",
                variant: "destructive"
            });
        } finally {
            setIsUpdatingStudioArchive(false);
        }
    };

    const handleMainTabChange = useCallback((nextTab: "groups" | "ai" | "analytics" | "settings") => {
        if (isStudioArchived && nextTab !== "settings" && nextTab !== "groups") {
            setActiveTab("settings");
            return;
        }

        setActiveTab(nextTab);
    }, [isStudioArchived]);

    const handleRemoveMemberFromStudio = async (member: StudioMemberResponse) => {
        if (!studioId || !isStudioOwner) return;

        const userId = String(member.userId || "").trim();
        if (!userId || userId === initialStudio?.ownerId) return;

        setRemovingMemberUserId(userId);
        try {
            const result = await removeStudioMember(studioId, userId, locale);

            if (result.status !== "success") {
                toast({
                    description: result.message || (locale === "vi" ? "Không thể xóa thành viên khỏi studio" : "Failed to remove member from studio"),
                    variant: "destructive"
                });
                return;
            }

            const membersResult = await getStudioMembers(studioId, locale);
            if (membersResult.status === "success" && membersResult.data) {
                setMembers(membersResult.data);
            } else {
                setMembers((prev) => prev.filter((item) => item.userId !== userId));
            }

            setSelectedMember((prev) => (prev?.userId === userId ? null : prev));
            setMemberPendingRemoval((prev) => (prev?.userId === userId ? null : prev));
        } catch (error) {
            console.error("Remove studio member failed:", error);
            toast({
                description: t("detail.removeMember.error"),
                variant: "destructive"
            });
        } finally {
            setRemovingMemberUserId(null);
        }
    };

    const handleSaveEdit = async () => {
        if (!studio) return;

        const normalizedName = clampStudioName(editName.trim());
        const normalizedDescription = clampStudioDescription(editDescription.trim());

        if (!normalizedName) {
            toast({ description: t("modal.nameRequired") || t("modal.name") || "Studio name is required", variant: "destructive" });
            return;
        }

        if (editStartDate && editEndDate && editStartDate > editEndDate) {
            toast({ description: t("detail.validation.dateRangeError"), variant: "destructive" });
            return;
        }

        setEditLoading(true);
        try {
            const result = await updateStudio(
                studio.id,
                {
                    name: normalizedName,
                    description: normalizedDescription,
                    type: "group",
                    startDate: editStartDate || null,
                    endDate: editEndDate || null,
                    avatarUrl: editAvatarUrl,
                    colorHex: editColorHex,
                    bannerUrl: editBannerUrl,
                    tagline: editTagline || null,
                    alias: editAlias || null,
                    requiresMemberApproval,
                    memberApprovalRequired: requiresMemberApproval
                },
                locale
            );

            if (result.status === "success") {
                writeStudioMemberApprovalFallback(studio.id, requiresMemberApproval);
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

    const normalizeStudioInviteRole = (role: string) => String(role).trim().toLowerCase() || "member";

    if (membersLoading) {
        return (
            <div className="h-screen overflow-hidden bg-[linear-gradient(180deg,#FAFAFB_0%,#F7F8FA_100%)]">
                <div className="flex h-full">
                    <DashboardSidebar />
                    <main className="h-screen flex-1 overflow-y-auto overflow-x-hidden">
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
            <div className="h-screen overflow-hidden bg-[linear-gradient(180deg,#FAFAFB_0%,#F7F8FA_100%)]">
                <div className="flex h-full">
                    <DashboardSidebar />
                    <main className="h-screen flex-1 overflow-y-auto overflow-x-hidden">
                        <Header userProfile={userProfile} />
                        <div className="flex items-center justify-center py-24">
                            <EmptyBlock
                                title={t("detail.studioNotFound")}
                                subtitle={t("detail.studioNotFoundSubtitle")}
                            />
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen overflow-hidden bg-[linear-gradient(180deg,#FAFAFB_0%,#F7F8FA_100%)] text-[#261E33]">
            <div className="flex h-full">
                <DashboardSidebar />

                {/* Relative container — banner only covers content area, not sidebar */}
                <div className="relative flex-1 overflow-hidden">
                    {/* Banner — scoped to content area only */}
                    {bannerUrl && (
                        <div className="pointer-events-none absolute inset-0 z-0">
                            <GroupBannerBackground bannerUrl={bannerUrl} colorHex={colorHex ?? null} />
                        </div>
                    )}

                    <main className="relative z-10 flex h-full flex-col overflow-y-auto overflow-x-hidden">

                        <Header userProfile={userProfile} />

                        <div className="px-6 py-6">
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="relative mb-6 overflow-hidden rounded-[36px] border border-white/70 bg-white/72 px-6 py-7 shadow-[0_28px_90px_rgba(15,23,42,0.06)] backdrop-blur-2xl">
                                {/* Gradient fallback */}
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,190,140,0.20),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(196,181,253,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.68),rgba(255,248,242,0.56))]" />

                                <div className="relative z-10">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-4">
                                            <motion.button
                                                whileHover={{ x: -2 }}
                                                whileTap={{ scale: 0.96 }}
                                                type="button"
                                                onClick={() => router.push(`/${locale}/master`)}
                                                className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/90 text-[#6F6B99] shadow-sm transition-all hover:bg-orange-50 hover:text-orange-600">
                                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M15 19l-7-7 7-7"
                                                    />
                                                </svg>
                                            </motion.button>
                                            <motion.div
                                                whileHover={{ rotate: -2, scale: 1.04 }}
                                                className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/80 shadow-[0_16px_30px_rgba(255,95,61,0.18)]">
                                                {studio.avatarUrl ? (
                                                    <img
                                                        src={studio.avatarUrl}
                                                        alt={studio.name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div
                                                        className="flex h-full w-full items-center justify-center text-white"
                                                        style={{
                                                            background: hexToGradient(studio.colorHex ?? "#FF5F3D")
                                                        }}>
                                                        <svg
                                                            className="h-6 w-6"
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
                                                )}
                                            </motion.div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                                                        <h1 className="truncate text-2xl font-bold text-[#261E33] sm:text-[30px]">
                                                            {studio.name}
                                                        </h1>

                                                        {studio.alias?.trim() ? (
                                                            <span
                                                                className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
                                                                style={{
                                                                    backgroundColor: `${studio.colorHex ?? "#FF5F3D"}18`,
                                                                    borderColor: `${studio.colorHex ?? "#FF5F3D"}40`,
                                                                    color: studio.colorHex ?? "#FF5F3D"
                                                                }}>
                                                                {studio.alias}
                                                            </span>
                                                        ) : null}

                                                        <RolePill role={isStudioOwner ? "owner" : "member"} />
                                                    </div>

                                                    {canLeaveStudio && (
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-red-200 bg-red-50 p-0 text-red-600 shadow-sm transition-colors duration-200 hover:border-red-200 hover:bg-red-100 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-200"
                                                                    aria-label={t("detail.leave.button")}
                                                                    title={t("detail.leave.button")}
                                                                    disabled={isLeavingStudio}>
                                                                    <LogOut className="h-4 w-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>

                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>
                                                                        {t("detail.leave.confirmTitle")}
                                                                    </AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        {t("detail.leave.confirmDescription")}
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>

                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>{t("deleteModal.cancel")}</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        className="bg-red-600 hover:bg-red-700"
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            handleLeaveStudio();
                                                                        }}>
                                                                        {t("detail.leave.confirmButton")}
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    )}
                                                </div>

                                                {studio.tagline?.trim() ? (
                                                    <p className="mt-1 italic text-[#9B8CA8] text-sm">
                                                        {studio.tagline}
                                                    </p>
                                                ) : null}

                                                {studio.description?.trim() ? (
                                                    <p className="mt-1 max-w-3xl text-sm leading-7 text-[#6F6B99]">
                                                        {studio.description}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.06 }}
                                className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                                <div className="flex w-full flex-wrap items-center gap-2 rounded-2xl border border-orange-100/50 bg-white/80 p-2 shadow-lg shadow-orange-900/5 backdrop-blur-xl xl:w-auto">
                                    <TabButton
                                        active={activeTab === "groups"}
                                        onClick={() => handleMainTabChange("groups")}
                                    >
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

                                    <TabButton
                                        active={activeTab === "ai"}
                                        onClick={() => handleMainTabChange("ai")}
                                        disabled={isStudioArchived}
                                    >
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
                                        <TabButton
                                            active={activeTab === "analytics"}
                                            onClick={() => handleMainTabChange("analytics")}
                                            disabled={isStudioArchived}
                                        >
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
                                        <TabButton
                                            active={activeTab === "settings"}
                                            onClick={() => handleMainTabChange("settings")}>
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826-3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                                />
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                                />
                                            </svg>
                                            {t("detail.tabs.settings")}
                                        </TabButton>
                                    )}
                                </div>

                                <div className="flex w-full flex-col gap-3 xl:w-auto xl:flex-row xl:items-center xl:justify-end">
                                    {activeTab === "groups" && (
                                        <div className="relative w-full xl:w-[260px] xl:flex-none">
                                            <div className="pointer-events-none absolute inset-y-0 left-4 z-10 flex items-center text-slate-500">
                                                <Search className="h-4 w-4" />
                                            </div>
                                            <Input
                                                value={groupSearchQuery}
                                                onChange={(e) => setGroupSearchQuery(e.target.value)}
                                                placeholder={groupT("searchGroups")}
                                                className="h-12 rounded-[20px] border border-slate-200/80 bg-slate-50/80 pl-12 pr-11 text-[#261E33] shadow-[0_10px_22px_rgba(15,23,42,0.04)] backdrop-blur focus-visible:border-orange-400 focus-visible:ring-orange-400"
                                            />
                                            {groupSearchQuery ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setGroupSearchQuery("")}
                                                    className="absolute inset-y-0 right-4 flex items-center text-slate-500 hover:text-slate-700">
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M6 18L18 6M6 6l12 12"
                                                        />
                                                    </svg>
                                                </button>
                                            ) : null}
                                        </div>
                                    )}

                                    {isStudioOwner && (
                                        <div className="flex w-full justify-end xl:w-auto">
                                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                                <Button
                                                    type="button"
                                                    disabled={isStudioArchived}
                                                    className="h-12 rounded-[20px] bg-[linear-gradient(135deg,#E6492D_0%,#FF5A36_55%,#FF6B45_100%)] px-6 font-semibold text-white shadow-[0_18px_36px_rgba(230,73,45,0.34)] transition-all duration-200 hover:brightness-110 hover:shadow-[0_22px_40px_rgba(230,73,45,0.42)] active:scale-[0.98]"
                                                    onClick={() => {
                                                        setIsCreateGroupModalOpen(true);
                                                    }}>
                                                    <svg
                                                        className="mr-2 h-4 w-4"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24">
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M12 4v16m8-8H4"
                                                        />
                                                    </svg>
                                                    {t("detail.addGroupButton")}
                                                </Button>
                                            </motion.div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            <AnimatePresence mode="wait">
                                {activeTab === "groups" && (
                                    <motion.div
                                        key="groups"
                                        initial={{ opacity: 0, y: 14 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                                        <div className="min-w-0 lg:col-span-8">
                                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                                {filteredGroups.length > 0 ? (
                                                    filteredGroups.map((group) => (
                                                        <motion.div
                                                            key={group.id}
                                                            layout
                                                            initial={{ opacity: 0, y: 16, scale: 0.98 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            whileHover={{ y: -6 }}
                                                            transition={{ duration: 0.24 }}>
                                                            {(() => {
                                                                const isGroupArchived = Boolean(group.isArchived);
                                                                const isGroupOpen = group.isOpen !== false;
                                                                const isGroupActive = !isGroupArchived && isGroupOpen;
                                                                return (
                                                                    <Link
                                                                        href={`/${locale}/group/${group.id}`}
                                                                        className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-white/80 bg-white/88 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur transition-all duration-300 hover:border-orange-200 hover:shadow-[0_22px_50px_rgba(255,95,61,0.12)]">
                                                                        <div className="flex items-center gap-3">
                                                                            <motion.div
                                                                                whileHover={{ rotate: -3, scale: 1.04 }}
                                                                                className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-sm">
                                                                                {group.iconEmoji ? (
                                                                                    <div
                                                                                        className="flex h-full w-full items-center justify-center text-xl"
                                                                                        style={{
                                                                                            background: hexToGradient(
                                                                                                group.colorHex ?? "#FF5F3D"
                                                                                            )
                                                                                        }}>
                                                                                        {group.iconEmoji}
                                                                                    </div>
                                                                                ) : (
                                                                                    <div
                                                                                        className="flex h-full w-full items-center justify-center text-white"
                                                                                        style={{
                                                                                            background: hexToGradient(
                                                                                                group.colorHex ?? "#FF5F3D"
                                                                                            )
                                                                                        }}>
                                                                                        <svg
                                                                                            className="h-5 w-5"
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
                                                                                )}
                                                                            </motion.div>

                                                                            <div className="min-w-0 flex-1">
                                                                                <div className="flex min-w-0 flex-nowrap items-center gap-2">
                                                                                    <h3 className="truncate text-base font-semibold text-slate-800 transition group-hover:text-[#FF5F3D]">
                                                                                        {group.name}
                                                                                    </h3>
                                                                                    <span
                                                                                        aria-label={isGroupActive ? "active" : "inactive"}
                                                                                        title={isGroupActive ? (locale === "vi" ? "Đang hoạt động" : "Active") : (locale === "vi" ? "Đang dừng" : "Paused")}
                                                                                        className="relative inline-flex h-2.5 w-2.5 shrink-0 items-center justify-center"
                                                                                    >
                                                                                        <span
                                                                                            aria-hidden="true"
                                                                                            className={`absolute inset-0 rounded-full animate-ping motion-reduce:animate-none ${isGroupActive
                                                                                                ? "bg-emerald-400/60"
                                                                                                : "bg-red-500/75"}`}
                                                                                        />
                                                                                        <span
                                                                                            className={`relative h-2.5 w-2.5 rounded-full ${isGroupActive
                                                                                                ? "bg-emerald-500"
                                                                                                : "bg-red-600"}`}
                                                                                            style={{
                                                                                                boxShadow: isGroupActive
                                                                                                    ? "0 0 0 4px rgba(16, 185, 129, 0.14), 0 0 10px rgba(16, 185, 129, 0.28)"
                                                                                                    : "0 0 0 4px rgba(220, 38, 38, 0.26), 0 0 12px rgba(220, 38, 38, 0.42)"
                                                                                            }}
                                                                                        />
                                                                                    </span>
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
                                                                                    <svg
                                                                                        className="h-4 w-4"
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
                                                                                    <span>{t("members")}</span>
                                                                                </div>
                                                                                <p className="mt-2 text-lg font-semibold text-[#261E33]">
                                                                                    {group.members}
                                                                                </p>
                                                                            </div>

                                                                            <div className="rounded-[18px] border border-[#F1EBE6] bg-[linear-gradient(180deg,#FFFFFF_0%,#FBFAF8_100%)] px-4 py-3 shadow-sm">
                                                                                <div className="flex items-center gap-2 text-xs text-[#6F6B99]">
                                                                                    <svg
                                                                                        className="h-4 w-4"
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
                                                                                    <span>{t("detail.tasks")}</span>
                                                                                </div>
                                                                                <p className="mt-2 text-lg font-semibold text-[#261E33]">
                                                                                    {group.tasks}
                                                                                </p>
                                                                            </div>
                                                                        </div>

                                                                        <div className="mt-5 flex justify-end">
                                                                            <div className="flex -space-x-1.5">
                                                                                {Array.from({
                                                                                    length: Math.min(group.members, 4)
                                                                                }).map((_, i) => {
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
                                                                                                }`}>
                                                                                            {member?.avatarUrl ? (
                                                                                                <img
                                                                                                    src={member.avatarUrl}
                                                                                                    alt={
                                                                                                        member.firstName ||
                                                                                                        t(
                                                                                                            "detail.memberAltFallback"
                                                                                                        )
                                                                                                    }
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
                                                                );
                                                            })()}
                                                        </motion.div>
                                                    ))
                                                ) : (
                                                    <div className="col-span-2">
                                                        <EmptyBlock
                                                            title={t("noGroups")}
                                                            subtitle={groupSearchQuery ? t("detail.noGroupsSubtitle") : t("detail.noGroupsSubtitle")}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {isStudioOwner && (
                                            <div className="flex min-w-0 justify-end lg:col-span-4">
                                                <aside className="h-fit w-full shrink-0 overflow-hidden rounded-[30px] border border-white/80 bg-white/88 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur">
                                                    <div className="items-center justify-between border-b border-[#F3F0F7] px-4 py-4">
                                                        <div className="min-w-0">
                                                            <h3 className="truncate text-base font-semibold text-slate-800">
                                                                {t("detail.panel.title")}
                                                            </h3>
                                                            <p className="mt-0.5 text-xs text-slate-500">
                                                                {t("detail.panel.subtitle")}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <motion.div
                                                        key="expanded-panel"
                                                        initial={{ opacity: 0, x: 8 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        className="space-y-6 px-5 py-5">
                                                        {isStudioArchived ? (
                                                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700 text-xs">
                                                                {locale === "vi"
                                                                    ? "Studio đang dừng hoạt động, khu vực Chi tiết Studio tạm thời bị khóa."
                                                                    : "Studio is paused, the Studio Details panel is temporarily locked."}
                                                            </div>
                                                        ) : null}

                                                        <section className="min-w-0">
                                                            <div className="mb-4 flex items-center gap-2 border-b border-[#F3F0F7]">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (isStudioArchived) return;
                                                                        setPanelView("members");
                                                                    }}
                                                                    disabled={isStudioArchived}
                                                                    className={`px-3 py-2.5 text-sm font-semibold transition-all ${panelView === "members"
                                                                        ? "border-b-2 border-orange-600 text-orange-600"
                                                                        : "text-slate-500 hover:text-slate-700"
                                                                        }`}>
                                                                    {t("detail.panel.memberListTitle")}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (isStudioArchived) return;
                                                                        setPanelView("approvals");
                                                                    }}
                                                                    disabled={isStudioArchived}
                                                                    className={`px-3 py-2.5 text-sm font-semibold transition-all ${panelView === "approvals"
                                                                        ? "border-b-2 border-orange-600 text-orange-600"
                                                                        : "text-slate-500 hover:text-slate-700"
                                                                        }`}>
                                                                    Phê duyệt
                                                                </button>
                                                            </div>

                                                            {panelView === "members" && (
                                                                <>
                                                                    <div className="min-w-0">
                                                                        <MemberList
                                                                            members={members}
                                                                            studioOwnerId={initialStudio?.ownerId}
                                                                            groups={initialGroups.map((group) => ({
                                                                                id: group.id || "",
                                                                                name: group.name || ""
                                                                            }))}
                                                                            onInviteClick={() => setIsInviteModalOpen(true)}
                                                                            onQuickAssignClick={() =>
                                                                                setIsQuickAssignOpen(true)
                                                                            }
                                                                            canManageMembers={isStudioOwner}
                                                                            disabled={isStudioArchived}
                                                                            removingMemberUserId={removingMemberUserId}
                                                                            onRemoveMember={(member) => {
                                                                                setMemberPendingRemoval(member);
                                                                            }}
                                                                            onMemberClick={(member) =>
                                                                                setSelectedMember(member)
                                                                            }
                                                                        />
                                                                    </div>
                                                                </>
                                                            )}

                                                            {panelView === "approvals" && (
                                                                <div className="space-y-3">
                                                                    <div className="mb-1 flex items-center justify-between rounded-2xl border border-orange-200 bg-orange-50/60 px-3 py-3">
                                                                        <div>
                                                                            <p className="font-semibold text-orange-800 text-xs">
                                                                                {locale === "vi" ? "Yêu cầu duyệt thành viên" : "Require member approval"}
                                                                            </p>
                                                                            <p className="mt-0.5 text-[11px] text-orange-700/80">
                                                                                {locale === "vi"
                                                                                    ? "Bật để thành viên vào studio ở trạng thái chờ duyệt"
                                                                                    : "Enable to put invited members into pending approval"}
                                                                            </p>
                                                                        </div>
                                                                        <Switch
                                                                            checked={requiresMemberApproval}
                                                                            onCheckedChange={(checked) => {
                                                                                void handleMemberApprovalToggle(checked);
                                                                            }}
                                                                            disabled={!isStudioOwner || isUpdatingMemberApproval || isEditing || isStudioArchived}
                                                                            className="data-[state=checked]:bg-orange-600 data-[state=unchecked]:bg-slate-300"
                                                                        />
                                                                    </div>

                                                                    {pendingApprovalsLoading ? (
                                                                        <div className="rounded-2xl border border-gray-100 bg-white p-4 py-6 text-center shadow-sm">
                                                                            <p className="text-slate-600 text-sm">
                                                                                {locale === "vi" ? "Đang tải danh sách chờ duyệt..." : "Loading pending approvals..."}
                                                                            </p>
                                                                        </div>
                                                                    ) : pendingApprovals.length === 0 ? (
                                                                        <div className="rounded-2xl border border-gray-100 bg-white p-4 py-6 text-center shadow-sm">
                                                                            <p className="text-slate-600 text-sm">
                                                                                Chưa có yêu cầu phê duyệt nào
                                                                            </p>
                                                                            <p className="mt-1 text-slate-400 text-xs">
                                                                                Những yêu cầu mới sẽ hiển thị tại đây
                                                                            </p>
                                                                        </div>
                                                                    ) : (
                                                                        pendingApprovals.map((item) => {
                                                                            const action = approvalActionByUserId[item.id] || null;
                                                                            const isApproving = action === "approve";
                                                                            const isRejecting = action === "reject";
                                                                            const isBusy = isApproving || isRejecting;
                                                                            return (
                                                                                <div
                                                                                    key={item.id}
                                                                                    className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                                                                                    <div className="flex items-start gap-3 mb-3">
                                                                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white text-xs font-semibold" style={{
                                                                                            background: hexToGradient(item.colorHex ?? "#FF5F3D")
                                                                                        }}>
                                                                                            {item.fullName.charAt(0)}
                                                                                        </div>
                                                                                        <div className="min-w-0 flex-1">
                                                                                            <p className="font-semibold text-gray-900 text-sm truncate">{item.fullName}</p>
                                                                                            <p className="text-gray-500 text-xs truncate">{item.email}</p>
                                                                                            <div className="mt-1 inline-block rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-600">
                                                                                                Member
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex gap-2">
                                                                                        <Button
                                                                                            type="button"
                                                                                            disabled={isBusy || isStudioArchived}
                                                                                            onClick={() => void handleApprovePendingMember(item.id)}
                                                                                            className="h-8 flex-1 rounded-lg bg-orange-600 px-3 text-xs font-medium text-white hover:bg-orange-700">
                                                                                            {isApproving ? "Đang duyệt..." : "Phê duyệt"}
                                                                                        </Button>
                                                                                        <Button
                                                                                            type="button"
                                                                                            variant="outline"
                                                                                            disabled={isBusy || isStudioArchived}
                                                                                            onClick={() => void handleRejectPendingMember(item.id)}
                                                                                            className="h-8 flex-1 rounded-lg border-red-200 px-3 text-xs font-medium text-red-600 hover:bg-red-50">
                                                                                            {isRejecting ? "Đang từ chối..." : "Từ chối"}
                                                                                        </Button>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })
                                                                    )}

                                                                    {pendingApprovalsError ? (
                                                                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-xs">
                                                                            {pendingApprovalsError}
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            )}
                                                        </section>

                                                        <section className="border-t border-[#F3F0F7] pt-5">
                                                            <div className="mb-3 flex items-center gap-3">
                                                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F8F5FF] text-violet-600">
                                                                    <svg
                                                                        className="h-4 w-4"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        viewBox="0 0 24 24">
                                                                        <path
                                                                            strokeLinecap="round"
                                                                            strokeLinejoin="round"
                                                                            strokeWidth={2}
                                                                            d="M9 17v-6m4 6V7m4 10v-3M5 21h14"
                                                                        />
                                                                    </svg>
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-sm font-semibold text-slate-800">
                                                                        {t("detail.panel.quickStatsTitle")}
                                                                    </h4>
                                                                    <p className="text-xs text-slate-500">
                                                                        {t("detail.panel.quickStatsSubtitle")}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-3">
                                                                <div className="flex items-center justify-between rounded-[18px] border border-[#F1EBE6] bg-[linear-gradient(180deg,#FFFFFF_0%,#FBFAF8_100%)] px-4 py-3 text-sm shadow-sm">
                                                                    <span className="text-slate-500">
                                                                        {t("groups")}
                                                                    </span>
                                                                    <span className="font-semibold text-slate-800">
                                                                        {groups.length}
                                                                    </span>
                                                                </div>

                                                                <div className="flex items-center justify-between rounded-[18px] border border-[#F1EBE6] bg-[linear-gradient(180deg,#FFFFFF_0%,#FBFAF8_100%)] px-4 py-3 text-sm shadow-sm">
                                                                    <span className="text-slate-500">
                                                                        {t("members")}
                                                                    </span>
                                                                    <span className="font-semibold text-slate-800">
                                                                        {members.length}
                                                                    </span>
                                                                </div>

                                                                <div className="flex items-center justify-between rounded-[18px] border border-[#F1EBE6] bg-[linear-gradient(180deg,#FFFFFF_0%,#FBFAF8_100%)] px-4 py-3 text-sm shadow-sm">
                                                                    <span className="text-slate-500">
                                                                        {t("detail.panel.created")}
                                                                    </span>
                                                                    <span className="font-semibold text-slate-800">
                                                                        {studio.createdAt
                                                                            ? new Date(
                                                                                studio.createdAt
                                                                            ).toLocaleDateString(
                                                                                locale === "vi" ? "vi-VN" : "en-US",
                                                                                {
                                                                                    month: "numeric",
                                                                                    day: "numeric",
                                                                                    year: "numeric"
                                                                                }
                                                                            )
                                                                            : t("detail.notAvailable")}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </section>
                                                    </motion.div>
                                                </aside>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {activeTab === "analytics" && (
                                    <motion.div
                                        key="analytics"
                                        initial={{ opacity: 0, y: 14 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}>
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
                                        exit={{ opacity: 0, y: -8 }}>
                                        <AIMaster studioId={studioId} />
                                    </motion.div>
                                )}

                                {activeTab === "settings" && (
                                    <motion.div
                                        key="settings"
                                        initial={{ opacity: 0, y: 14 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        className="space-y-6">

                                        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur">
                                            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
                                                        <svg
                                                            className="h-4 w-4 text-gray-700"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24">
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826-3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
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
                                                        <h2 className="text-sm font-bold text-gray-900">
                                                            {t("detail.settings.title")}
                                                        </h2>
                                                        <p className="mt-0.5 text-xs text-gray-500">
                                                            {t("detail.settings.subtitle")}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {isEditing ? (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={handleCancelEdit}
                                                            className="h-10 rounded-xl border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-100">
                                                            {t("modal.cancel")}
                                                        </Button>
                                                    ) : null}

                                                    <Button
                                                        type="button"
                                                        onClick={isEditing ? handleSaveEdit : handleStartEdit}
                                                        disabled={editLoading || isStudioArchived}
                                                        className="h-10 rounded-xl bg-[linear-gradient(135deg,#E6492D_0%,#FF5A36_55%,#FF6B45_100%)] px-4 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(230,73,45,0.24)] hover:brightness-110 disabled:opacity-50">
                                                        {editLoading
                                                            ? t("detail.settings.saving")
                                                            : isEditing
                                                                ? t("detail.settings.saveChanges")
                                                                : t("detail.settings.edit")}
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="px-6 py-6">
                                                {/* Avatar + Color row */}
                                                <div className="mb-6 flex items-center gap-4">
                                                    <div className="flex flex-col gap-1">
                                                        <AvatarUpload
                                                            entityType="studio"
                                                            entityId={studio.id}
                                                            avatarUrl={isEditing ? editAvatarUrl : studio.avatarUrl}
                                                            colorHex={editColorHex}
                                                            onUploadSuccess={(url) => setEditAvatarUrl(url)}
                                                            onError={(msg) =>
                                                                toast({ description: msg, variant: "destructive" })
                                                            }
                                                            disabled={!isEditing}
                                                        />
                                                        <div className="rounded-[24px] border border-[#F1EDF7] bg-[#FCFBFE] p-4 shadow-sm">
                                                            <ColorPicker
                                                                label={t("detail.settings.primaryColor")}
                                                                value={
                                                                    isEditing ? editColorHex : (studio.colorHex ?? "#FF5F3D")
                                                                }
                                                                onChange={isEditing ? setEditColorHex : undefined}
                                                                disabled={!isEditing}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-1 flex-col gap-4">
                                                        <AliasInput
                                                            value={editAlias}
                                                            onChange={isEditing ? setEditAlias : undefined}
                                                            disabled={!isEditing}
                                                            label={t("detail.settings.aliasLabel") ?? "Biệt danh"}
                                                            placeholder={t("detail.settings.aliasPlaceholder") ?? "VD: THPT Hoang Dieu"}
                                                            colorHex={editColorHex}
                                                        />

                                                        <div>
                                                            <label
                                                                htmlFor="studio-tagline-input"
                                                                className="text-xs font-semibold text-gray-700">
                                                                {t("detail.settings.taglineLabel") ?? "Slogan"}
                                                            </label>
                                                            <Input
                                                                id="studio-tagline-input"
                                                                disabled={!isEditing}
                                                                value={editTagline}
                                                                onChange={(e) => setEditTagline(e.target.value.slice(0, 50))}
                                                                maxLength={50}
                                                                placeholder={t("detail.settings.taglinePlaceholder") ?? "VD: Học là thích - Yêu là nhớ"}
                                                                className="mt-2 h-11 rounded-2xl border-gray-200 bg-white shadow-sm focus-visible:border-orange-500 focus-visible:ring-orange-500 disabled:opacity-70"
                                                            />
                                                            <p className="mt-1 text-right text-gray-400 text-xs">{editTagline.length}/50</p>
                                                        </div>
                                                    </div>

                                                    {/* Banner thumbnail strip */}
                                                    <div className="overflow-hidden rounded-[28px] border border-white/80 bg-white/88 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur">
                                                        <p className="mb-2 text-xs font-semibold text-gray-700">
                                                            {t("detail.settings.bannerLabel") ?? "Ảnh bìa"}
                                                        </p>
                                                        <BannerUpload
                                                            entityType="studio"
                                                            entityId={studio.id}
                                                            bannerUrl={isEditing ? editBannerUrl : studio.bannerUrl}
                                                            colorHex={editColorHex}
                                                            onUploadSuccess={(url) => setEditBannerUrl(url)}
                                                            onDeleteSuccess={() => setEditBannerUrl(null)}
                                                            onError={(msg) =>
                                                                toast({ description: msg, variant: "destructive" })
                                                            }
                                                            disabled={!isEditing}
                                                        />
                                                    </div>

                                                </div>

                                                <div className="grid grid-cols-1 gap-5">
                                                    <div>
                                                        <label
                                                            htmlFor="studio-name-input"
                                                            className="text-xs font-semibold text-gray-700">
                                                            {t("modal.name")} <span className="text-red-500">*</span>
                                                        </label>
                                                        <Input
                                                            id="studio-name-input"
                                                            disabled={!isEditing}
                                                            value={editName}
                                                            onChange={(e) => setEditName(clampStudioName(e.target.value))}
                                                            className="mt-2 h-11 rounded-2xl border-gray-200 bg-white shadow-sm focus-visible:border-orange-500 focus-visible:ring-orange-500 disabled:opacity-70"
                                                            maxLength={STUDIO_NAME_MAX_LENGTH}
                                                        />
                                                        <div className="mt-1 text-right text-[11px] text-gray-500">
                                                            {editName.length}/{STUDIO_NAME_MAX_LENGTH}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label
                                                            htmlFor="studio-description-input"
                                                            className="text-xs font-semibold text-gray-700">
                                                            {t("modal.description")}
                                                        </label>
                                                        <Textarea
                                                            id="studio-description-input"
                                                            disabled={!isEditing}
                                                            value={editDescription}
                                                            onChange={(e) => setEditDescription(clampStudioDescription(e.target.value))}
                                                            className="mt-2 min-h-28 rounded-2xl border-gray-200 bg-white shadow-sm focus-visible:border-orange-500 focus-visible:ring-orange-500 disabled:opacity-70"
                                                            placeholder={t("modal.descriptionPlaceholder")}
                                                            maxLength={STUDIO_DESCRIPTION_MAX_LENGTH}
                                                        />
                                                        <div className="mt-1 text-right text-[11px] text-gray-500">
                                                            {editDescription.length}/{STUDIO_DESCRIPTION_MAX_LENGTH}
                                                        </div>
                                                    </div>



                                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                        <div>
                                                            <label
                                                                htmlFor="studio-start-date"
                                                                className="text-xs font-semibold text-gray-700">
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
                                                            <label
                                                                htmlFor="studio-end-date"
                                                                className="text-xs font-semibold text-gray-700">
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
                                                            <label
                                                                htmlFor="studio-created-date"
                                                                className="text-xs font-semibold text-gray-700">
                                                                {t("detail.settings.createdDate")}
                                                            </label>
                                                            <Input
                                                                id="studio-created-date"
                                                                value={
                                                                    studio.createdAt
                                                                        ? new Date(studio.createdAt).toLocaleDateString(
                                                                            locale === "vi" ? "vi-VN" : "en-US",
                                                                            {
                                                                                day: "numeric",
                                                                                month: "long",
                                                                                year: "numeric"
                                                                            }
                                                                        )
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
                                                            <label
                                                                htmlFor="studio-group-count"
                                                                className="text-xs font-semibold text-gray-700">
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
                                                <h2 className="text-sm font-bold text-red-700">
                                                    {t("detail.danger.title")}
                                                </h2>
                                            </div>

                                            <div className="px-6 py-6">
                                                <div className={`mb-4 rounded-[24px] border p-5 transition-all duration-300 ${isStudioArchived
                                                    ? "border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50"
                                                    : "border-emerald-200 bg-gradient-to-r from-emerald-50 to-lime-50"}`}>
                                                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                                        <div className="flex items-start gap-3">
                                                            <div
                                                                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 ${isStudioArchived
                                                                    ? "bg-amber-100 text-amber-700"
                                                                    : "bg-emerald-100 text-emerald-700"} ${isUpdatingStudioArchive ? "animate-pulse" : ""}`}>
                                                                <Power className="h-4 w-4" />
                                                            </div>
                                                            <div>
                                                                <div className={`text-sm font-bold ${isStudioArchived ? "text-amber-700" : "text-emerald-700"}`}>
                                                                    {locale === "vi" ? "Trạng thái hoạt động của studio" : "Studio activity status"}
                                                                </div>
                                                                <div className="mt-1 text-xs text-gray-600">
                                                                    {isStudioArchived
                                                                        ? (locale === "vi"
                                                                            ? "Studio đang dừng hoạt động. Chỉ nên dùng tab cài đặt để mở lại."
                                                                            : "Studio is paused. Use the settings tab to reopen it.")
                                                                        : (locale === "vi"
                                                                            ? "Studio đang hoạt động bình thường."
                                                                            : "Studio is currently active.")}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            <span
                                                                className={`inline-flex items-center rounded-full px-2.5 py-1 font-semibold text-xs transition-all duration-300 ${isStudioArchived
                                                                    ? "bg-amber-100 text-amber-700"
                                                                    : "bg-gray-100 text-gray-500"}`}>
                                                                {locale === "vi" ? "Đang dừng" : "Paused"}
                                                            </span>
                                                            <Switch
                                                                checked={!isStudioArchived}
                                                                onCheckedChange={(checked) => {
                                                                    void handleStudioArchiveToggle(checked);
                                                                }}
                                                                disabled={!isStudioOwner || isUpdatingStudioArchive}
                                                                className="transition-all duration-300 data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-amber-500"
                                                            />
                                                            <span
                                                                className={`inline-flex items-center rounded-full px-2.5 py-1 font-semibold text-xs transition-all duration-300 ${!isStudioArchived
                                                                    ? "bg-emerald-100 text-emerald-700"
                                                                    : "bg-gray-100 text-gray-500"}`}>
                                                                {locale === "vi" ? "Đang hoạt động" : "Active"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="rounded-[24px] border border-red-200 bg-red-50 p-5">
                                                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                                        <div>
                                                            <div className="text-sm font-bold text-red-700">
                                                                {t("deleteModal.title")}
                                                            </div>
                                                            <div className="mt-1 text-xs leading-6 text-red-600">
                                                                {t("detail.danger.deleteDescription")}
                                                            </div>
                                                        </div>

                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button
                                                                    type="button"
                                                                    disabled={isStudioArchived}
                                                                    className="h-11 rounded-2xl bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700">
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
                                                                    {t("deleteModal.title")}
                                                                </Button>
                                                            </AlertDialogTrigger>

                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>
                                                                        {t("detail.danger.confirmTitle")}
                                                                    </AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        {t("detail.danger.confirmDescription")}
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>

                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>
                                                                        {t("deleteModal.cancel")}
                                                                    </AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        className="bg-red-600 hover:bg-red-700"
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            handleDeleteStudio();
                                                                        }}>
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
            </div>

            <InviteMemberModal
                open={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                groupName={studio?.name || t("group")}
                variant="studio"
                canManage={true}
                onCreateLink={async ({ role }) => {
                    const result = await createStudioInviteLink(
                        { studioId: studio?.id, role: normalizeStudioInviteRole(role) },
                        locale
                    );
                    if (result.status === "success" && result.data?.inviteUrl) {
                        return result.data.inviteUrl;
                    }
                    throw new Error(t("detail.invite.createLinkError"));
                }}
                onSendInvite={async ({ email, role }) => {
                    await sendStudioInviteEmail(
                        { studioId: studio?.id, role: normalizeStudioInviteRole(role), email },
                        locale
                    );
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
                groups={quickAssignEligibleGroups}
                studioOwnerId={initialStudio?.ownerId}
                members={members}
                onSuccess={() => {
                    loadData();
                }}
            />

            <AlertDialog
                open={!!memberPendingRemoval}
                onOpenChange={(open) => {
                    if (!open && !removingMemberUserId) {
                        setMemberPendingRemoval(null);
                    }
                }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("detail.removeMember.confirmTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("detail.removeMember.confirmDescription", {
                                name: memberPendingRemoval?.userName || memberPendingRemoval?.email || t("detail.memberAltFallback")
                            })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={!!removingMemberUserId}>{t("deleteModal.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={!!removingMemberUserId || !memberPendingRemoval}
                            className="bg-red-600 hover:bg-red-700"
                            onClick={(e) => {
                                e.preventDefault();
                                if (!memberPendingRemoval) return;
                                void handleRemoveMemberFromStudio(memberPendingRemoval);
                            }}>
                            {removingMemberUserId ? (locale === "vi" ? "Đang xóa..." : "Removing...") : t("detail.removeMember.confirmButton")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <MemberDetailModal
                member={selectedMember}
                studioOwnerId={initialStudio?.ownerId}
                isOpen={!!selectedMember}
                onClose={() => setSelectedMember(null)}
            />
        </div>
    );
}
