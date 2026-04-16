"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Power, Settings, Trash2, UserPlus, Users } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import type { components } from "@/api/types";

import { Container } from "@/components/common";
import { approvePendingMember, getPendingMembers } from "@/api/invites";
import { InviteMemberModal, type InviteRole } from "@/components/features/group/setting/InviteMemberModal";
import { ApproveMemberSection } from "@/components/features/group/setting/ApproveMemberSection";
import { getRoleIcon, getRoleColor } from "@/components/features/group/RoleUtils";
import { toggleGroupArchive, toggleGroupMemberApproval, updateGroupSettings } from "@/api/groups";
import { getStudioById } from "@/api/studios";
import {
    pendingJoinEvents,
    PENDING_JOIN_CHANGED_EVENT
} from "@/components/features/group/group.api";
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
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type MemberRole = "Owner" | "Moderator" | "Member" | "Commenter" | "Viewer";

type GroupDetailResponseApiResponse = components["schemas"]["GroupDetailResponseApiResponse"];
type GroupMemberListResponseApiResponse = components["schemas"]["GroupMemberListResponseApiResponse"];
type CreateInviteLinkResponseApiResponse = components["schemas"]["CreateInviteLinkResponseApiResponse"];
type StudioResponseApiResponse = components["schemas"]["StudioResponseApiResponse"];

type ApiMemberPreview = components["schemas"]["MemberPreviewDto"];
type ApiGroupMemberDto = components["schemas"]["GroupMemberDto"];
type ApiGroupDetail = components["schemas"]["GroupDetailResponse"];
type ApiGroupDetailWithPreview = ApiGroupDetail & { membersPreview?: ApiMemberPreview[] };
type TokenPayload = Record<string, unknown>;

type Member = {
    id: string;
    name: string;
    email: string;
    initials: string;
    role: MemberRole;
    avatarUrl?: string | null;
};

const roleOptions: Exclude<MemberRole, "Owner">[] = ["Moderator", "Member", "Commenter", "Viewer"];
const GROUP_UPDATED_EVENT = "group:updated";
const GROUP_NAME_MAX_LENGTH = 30;
const GROUP_DESCRIPTION_MAX_LENGTH = 200;
const groupArchiveStorageKey = (groupId: string) => `group:${groupId}:is-archived`;

const writeGroupArchiveOverride = (groupId: string, value: boolean) => {
    if (!groupId) return;
    try {
        localStorage.setItem(groupArchiveStorageKey(groupId), value ? "1" : "0");
    } catch {
        // Ignore storage failure and keep API as source of truth.
    }
};

const readGroupArchiveOverride = (groupId: string): boolean | null => {
    if (!groupId) return null;
    try {
        const raw = localStorage.getItem(groupArchiveStorageKey(groupId));
        if (raw === "1") return true;
        if (raw === "0") return false;
    } catch {
        // Ignore storage failures.
    }
    return null;
};

const isOwner = (role: MemberRole) => role === "Owner";

const toMemberRole = (r?: string | null): MemberRole => {
    const s = String(r ?? "")
        .trim()
        .replace(/^ROLE_/i, "")
        .replace(/^GROUP_/i, "")
        .replace(/^STUDIO_/i, "")
        .replace(/^TEAM_/i, "")
        .replace(/\s+/g, "")
        .toLowerCase();

    if (s === "owner") return "Owner";
    if (s === "moderator") return "Moderator";
    if (s === "member") return "Member";
    if (s === "commenter") return "Commenter";
    if (s === "viewer") return "Viewer";
    return "Member";
};

const safeInitials = (first: string, last: string) => {
    const f = first.trim();
    const l = last.trim();
    const i1 = f ? f[0] : "";
    const i2 = l ? l[0] : "";
    const out = `${i1}${i2}`.toUpperCase();
    return out || "U";
};

const getCurrentUserId = () => {
    const keys = ["userId", "accountId", "id", "uid", "user_id", "account_id"];
    for (const k of keys) {
        const v = localStorage.getItem(k);
        if (v) return String(v).trim();
    }

    const token = localStorage.getItem("accessToken");
    if (!token) return "";

    try {
        const payloadPart = token.split(".")[1];
        if (!payloadPart) return "";

        const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

        const json = decodeURIComponent(
            atob(padded)
                .split("")
                .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );

        const payload = JSON.parse(json) as TokenPayload;
        const idFromToken = payload.userId || payload.accountId || payload.id || payload.uid || payload.sub;
        return idFromToken ? String(idFromToken).trim() : "";
    } catch {
        return "";
    }
};

const readText = async (res: Response) => {
    try {
        return await res.text();
    } catch {
        return "";
    }
};

const parseJsonSafe = (text: string): unknown | null => {
    if (!text) return null;
    try {
        return JSON.parse(text) as unknown;
    } catch {
        return null;
    }
};

const okByJsonStatus = (obj: unknown) => {
    if (!obj || typeof obj !== "object") return true;
    const s = String((obj as { status?: unknown }).status ?? "").toLowerCase();
    return s === "" || s === "success" || s === "ok" || s === "true";
};

const ROLE_FORMATS = (role: string) => {
    const raw = String(role).trim();
    const upper = raw.toUpperCase();
    const roleUpper = `ROLE_${upper}`;
    return [raw, upper, roleUpper];
};

const normalizeInviteRoleForApi = (role: InviteRole) => {
    const normalized = String(role).trim().toLowerCase();

    if (normalized === "moderator") return "admin";
    if (normalized === "commenter") return "viewer";
    if (normalized === "viewer") return "viewer";
    return "member";
};

const normalizeErrorMessage = (value: string, fallback = "Đã xảy ra lỗi") => {
    const raw = String(value || "").trim();
    if (!raw) return fallback;

    const lowered = raw.toLowerCase();
    const isInviteLimitError =
        (lowered.includes("invite") || lowered.includes("lời mời"))
        && (lowered.includes("limit") || lowered.includes("quota") || lowered.includes("too many") || lowered.includes("maximum"));

    if (isInviteLimitError) {
        return "Bạn đã vượt quá giới hạn tạo lời mời. Vui lòng thử lại sau.";
    }

    const cleaned = raw
        .replace(/\[[^\]]+\]/g, " ")
        .replace(/\b(http\s*)?\d{3}\b/gi, " ")
        .replace(/\b(code|error\s*code|status)\s*[:=]\s*[^\s,;]+/gi, " ")
        .replace(/\s{2,}/g, " ")
        .trim();

    return cleaned || fallback;
};

const getApiBase = () => {
    const raw = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    const base = String(raw).replace(/\/+$/, "");
    return base.endsWith("/api") ? base : `${base}/api`;
};

const extractTokenFromInviteUrl = (inviteUrl: string) => {
    const raw = String(inviteUrl || "").trim();
    if (!raw) return "";

    try {
        const parsed = new URL(raw, typeof window !== "undefined" ? window.location.origin : "http://localhost");
        const tokenFromQuery = String(parsed.searchParams.get("token") ?? "").trim();
        if (tokenFromQuery) return tokenFromQuery;

        const pathMatch = parsed.pathname.match(/\/(?:invite|studio-invite)\/([^/?#]+)/i);
        if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]);
    } catch {
        const queryMatch = raw.match(/[?&]token=([^&#]+)/i);
        if (queryMatch?.[1]) return decodeURIComponent(queryMatch[1]);

        const pathMatch = raw.match(/\/(?:invite|studio-invite)\/([^/?#]+)/i);
        if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]);
    }

    return "";
};

const memberApprovalStorageKey = (groupId: string) => `group:${groupId}:requires-member-approval`;

const readMemberApprovalFallback = (groupId: string): boolean | null => {
    try {
        const raw = localStorage.getItem(memberApprovalStorageKey(groupId));
        if (raw === null) return null;
        return raw === "1";
    } catch {
        return null;
    }
};

const writeMemberApprovalFallback = (groupId: string, value: boolean) => {
    try {
        localStorage.setItem(memberApprovalStorageKey(groupId), value ? "1" : "0");
    } catch {
        // Ignore storage failures (private mode/quota) and keep UI flow working.
    }
};

export function GroupSettingView() {
    const locale = useLocale();
    const router = useRouter();
    const t = useTranslations("GroupSettingView");

    const sp = useSearchParams();
    const params = useParams<{ groupId?: string }>();

    const groupIdFromQuery = sp.get("id") || undefined;
    const groupIdFromParams = params?.groupId ? String(params.groupId) : undefined;
    const groupId = groupIdFromParams || groupIdFromQuery;
    const fromStudioId = String(sp.get("fromStudioId") ?? "").trim();

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);

    const [groupName, setGroupName] = useState("");
    const [description, setDescription] = useState("");
    const [masterStudio, setMasterStudio] = useState("");
    const [initialSettings, setInitialSettings] = useState({ groupName: "", description: "" });

    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [colorHex, setColorHex] = useState("#FF5F3D");
    const [iconEmoji, setIconEmoji] = useState("");
    const [bannerUrl, setBannerUrl] = useState<string | null>(null);
    const [tagline, setTagline] = useState("");
    const [alias, setAlias] = useState("");
    const [initialAvatarUrl, setInitialAvatarUrl] = useState<string | null>(null);
    const [initialColorHex, setInitialColorHex] = useState("#FF5F3D");
    const [initialIconEmoji, setInitialIconEmoji] = useState("");
    const [initialBannerUrl, setInitialBannerUrl] = useState<string | null>(null);
    const [initialTagline, setInitialTagline] = useState("");
    const [initialAlias, setInitialAlias] = useState("");

    const [isTemplate, setIsTemplate] = useState(false);
    const [initialIsTemplate, setInitialIsTemplate] = useState(false);

    const [requiresMemberApproval, setRequiresMemberApproval] = useState(false);
    const [initialRequiresMemberApproval, setInitialRequiresMemberApproval] = useState(false);
    const [allowMemberUpdateProgress, setAllowMemberUpdateProgress] = useState(false);
    const [initialAllowMemberUpdateProgress, setInitialAllowMemberUpdateProgress] = useState(false);
    const [isArchived, setIsArchived] = useState(false);
    const [isParentStudioArchived, setIsParentStudioArchived] = useState(false);
    const [isUpdatingArchive, setIsUpdatingArchive] = useState(false);

    const [members, setMembers] = useState<Member[]>([]);
    const [myRoleInGroup, setMyRoleInGroup] = useState<MemberRole>("Member");

    const [notFound, setNotFound] = useState(false);

    const [generalError, setGeneralError] = useState("");
    const [membersError, setMembersError] = useState("");
    const [dangerError, setDangerError] = useState("");
    const [statusError, setStatusError] = useState("");

    const [roleLoadingByUserId, setRoleLoadingByUserId] = useState<Record<string, boolean>>({});
    const [removeLoadingByUserId, setRemoveLoadingByUserId] = useState<Record<string, boolean>>({});

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [inviteOpen, setInviteOpen] = useState(false);

    const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
    const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string>("");

    const isGroupPaused = isArchived || isParentStudioArchived;
    const canToggleArchive = myRoleInGroup === "Owner" && !isParentStudioArchived;
    const canEditDetails = myRoleInGroup === "Owner" && !isGroupPaused;
    const canManageMembers = (myRoleInGroup === "Owner" || myRoleInGroup === "Moderator") && !isGroupPaused;
    const canDelete = useMemo(() => myRoleInGroup === "Owner" && !isGroupPaused, [myRoleInGroup, isGroupPaused]);
    const canViewSettings = myRoleInGroup === "Owner" || myRoleInGroup === "Moderator";

    const apiBase = getApiBase();

    const groupSettingSchema = useMemo(
        () =>
            z.object({
                groupName: z
                    .string()
                    .trim()
                    .min(1, t("validation.groupNameRequired"))
                    .max(GROUP_NAME_MAX_LENGTH, t("validation.groupNameMax")),
                description: z.string().max(GROUP_DESCRIPTION_MAX_LENGTH, t("validation.descriptionMax"))
            }),
        [t]
    );

    const currentModeratorId = useMemo(() => {
        const mod = members.find((m) => m.role === "Moderator");
        return mod?.id ? String(mod.id) : null;
    }, [members]);

    const getRoleOptionsForMember = (memberId: string): Exclude<MemberRole, "Owner">[] => {
        if (currentModeratorId && String(memberId) !== String(currentModeratorId)) {
            return roleOptions.filter((r) => r !== "Moderator");
        }
        return roleOptions;
    };

    const getRoleLabel = (role: MemberRole) => {
        const key = role.toLowerCase();
        return t(`members.roleLabels.${key}`);
    };

    const extractApiMessage = (text: string, json: unknown) => {
        const msg =
            json && typeof json === "object" ? String((json as { message?: unknown }).message ?? "").trim() : "";
        if (msg) return normalizeErrorMessage(msg);
        const rawText = (text ?? "").toString().trim();
        return normalizeErrorMessage(rawText);
    };

    const resetLoadedGroupState = () => {
        setGroupName("");
        setDescription("");
        setMasterStudio("");
        setInitialSettings({ groupName: "", description: "" });
        setMembers([]);
        setAvatarUrl(null);
        setColorHex("#FF5F3D");
        setIconEmoji("");
        setBannerUrl(null);
        setTagline("");
        setAlias("");
        setInitialAvatarUrl(null);
        setInitialColorHex("#FF5F3D");
        setInitialIconEmoji("");
        setInitialBannerUrl(null);
        setInitialTagline("");
        setInitialAlias("");
        setIsTemplate(false);
        setInitialIsTemplate(false);
        setRequiresMemberApproval(false);
        setInitialRequiresMemberApproval(false);
        setAllowMemberUpdateProgress(false);
        setInitialAllowMemberUpdateProgress(false);
        setIsArchived(false);
        setIsParentStudioArchived(false);
    };

    const getTokenOrFail = () => {
        const token = localStorage.getItem("accessToken") || "";
        if (!token) {
            setGeneralError(t("errors.missingToken"));
            return null;
        }
        return token;
    };

    const fetchGroupMembers = async (gid: string, token: string) => {
        const res = await fetch(`${apiBase}/group/${gid}/members`, {
            headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
            cache: "no-store"
        });

        const text = await readText(res);
        if (!res.ok) throw new Error(normalizeErrorMessage(text, t("errors.loadMembersFailed")));

        const json = parseJsonSafe(text);
        return (json ?? {}) as GroupMemberListResponseApiResponse;
    };

    const mapMembersFromMembersApi = (json: GroupMemberListResponseApiResponse): Member[] => {
        const apiMembers = json?.data?.members ?? [];
        return (apiMembers || []).map((m: ApiGroupMemberDto, idx: number) => {
            const first = (m.firstName ?? "").trim();
            const last = (m.lastName ?? "").trim();
            const uid = m.userId ?? `${idx}`;
            const role = toMemberRole(m.role);
            const avatarUrl =
                String(m.avatarUrl ?? "")
                    .trim()
                    .replace("localhost", "127.0.0.1") || null;

            return {
                id: String(uid),
                name: `${first} ${last}`.trim() || "Không rõ",
                email: (m.email ?? "").trim(),
                initials: safeInitials(first, last),
                role,
                avatarUrl
            };
        });
    };

    const loadGroup = async (id: string): Promise<boolean> => {
        setGeneralError("");
        setMembersError("");
        setDangerError("");
        setStatusError("");

        const token = localStorage.getItem("accessToken") || "";
        if (!token) {
            setNotFound(true);
            resetLoadedGroupState();
            setMyRoleInGroup("Member");
            return false;
        }

        const detailRes = await fetch(`${apiBase}/group/${id}/detail`, {
            headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
            cache: "no-store"
        });

        const text = await readText(detailRes);
        const detailJson = parseJsonSafe(text);

        if (!detailRes.ok) {
            setNotFound(true);
            setGeneralError(extractApiMessage(text, detailJson));
            resetLoadedGroupState();
            setMyRoleInGroup("Member");
            return false;
        }

        const parsed = (detailJson as GroupDetailResponseApiResponse) || {};
        const data: ApiGroupDetail | undefined = parsed?.data ?? undefined;

        if (!data?.groupId) {
            setNotFound(true);
            resetLoadedGroupState();
            setMyRoleInGroup("Member");
            setGeneralError(t("errors.loadGroupFailed"));
            return false;
        }

        const roleFromDetail = toMemberRole(data.userRole);
        setMyRoleInGroup(roleFromDetail);
        setNotFound(false);

        if (roleFromDetail !== "Owner" && roleFromDetail !== "Moderator") {
            // Chỉ xác nhận quyền hiện tại rồi dừng, không nạp thêm settings/members cho người không đủ quyền.
            resetLoadedGroupState();
            return true;
        }

        setGroupName(data.groupName ?? "");
        setDescription(data.description ?? "");
        setInitialSettings({ groupName: data.groupName ?? "", description: data.description ?? "" });
        setMasterStudio(data.studioName ?? "");
        setAvatarUrl(data.avatarUrl ?? null);
        setColorHex(data.colorHex ?? "#FF5F3D");
        setIconEmoji(data.iconEmoji ?? "");
        setBannerUrl(data.bannerUrl ?? null);
        setTagline(data.tagline ?? "");
        setAlias(data.alias ?? "");
        setInitialAvatarUrl(data.avatarUrl ?? null);
        setInitialColorHex(data.colorHex ?? "#FF5F3D");
        setInitialIconEmoji(data.iconEmoji ?? "");
        setInitialBannerUrl(data.bannerUrl ?? null);
        setInitialTagline(data.tagline ?? "");
        setInitialAlias(data.alias ?? "");

        const templateValue =
            (data as Record<string, unknown>).isTemplate ??
            (data as Record<string, unknown>).template ??
            (data as Record<string, unknown>).isTemplateGroup ??
            false;
        const templateBool = Boolean(templateValue);
        setIsTemplate(templateBool);
        setInitialIsTemplate(templateBool);

        const archivedOverride = readGroupArchiveOverride(id);
        const archivedBool = archivedOverride ?? Boolean((data as Record<string, unknown>).isArchived ?? false);
        setIsArchived(archivedBool);

        const parentStudioId = String(data.studioId ?? "").trim();
        if (parentStudioId) {
            try {
                const studioResult = await getStudioById(parentStudioId, locale);
                if (studioResult.status === "success" && studioResult.data) {
                    setIsParentStudioArchived(Boolean(studioResult.data.isArchived ?? false));
                } else {
                    setIsParentStudioArchived(false);
                }
            } catch {
                setIsParentStudioArchived(false);
            }
        } else {
            setIsParentStudioArchived(false);
        }

        const requiresApprovalValue =
            (data as Record<string, unknown>).requiresMemberApproval ??
            (data as Record<string, unknown>).memberApprovalRequired ??
            readMemberApprovalFallback(id) ??
            false;
        const requiresApprovalBool = Boolean(requiresApprovalValue);
        setRequiresMemberApproval(requiresApprovalBool);
        setInitialRequiresMemberApproval(requiresApprovalBool);

        const allowProgressValue =
            (data as Record<string, unknown>).allowMemberUpdateProgress ?? false;
        setAllowMemberUpdateProgress(Boolean(allowProgressValue));
        setInitialAllowMemberUpdateProgress(Boolean(allowProgressValue));

        try {
            const membersJson = await fetchGroupMembers(id, token);
            const mapped = mapMembersFromMembersApi(membersJson);
            setMembers(mapped);

            const meId = getCurrentUserId();
            const me = mapped.find((x) => String(x.id).trim() === String(meId).trim());
            if (me?.role) setMyRoleInGroup(me.role);
        } catch {
            const currentUid = getCurrentUserId();
            const preview: ApiMemberPreview[] = (data as ApiGroupDetailWithPreview | undefined)?.membersPreview ?? [];
            const mapped: Member[] = (preview || []).map((m, idx) => {
                const first = (m.firstName ?? "").trim();
                const last = (m.lastName ?? "").trim();
                const previewMember = m as ApiMemberPreview & { id?: string | number; userId?: string | number };
                const uid = previewMember.id ?? previewMember.userId ?? `${id}-${idx}`;
                const isMe = String(uid).trim() === String(currentUid).trim();

                return {
                    id: String(uid),
                    name: `${first} ${last}`.trim() || "Không rõ",
                    email: "",
                    initials: safeInitials(first, last),
                    role: isMe ? roleFromDetail : "Member"
                };
            });
            setMembers(mapped);

            const me = mapped.find((x) => String(x.id).trim() === String(currentUid).trim());
            if (me?.role) setMyRoleInGroup(me.role);
        }

        return true;
    };

    // biome-ignore lint/correctness/useExhaustiveDependencies: loadGroup is intentionally omitted to prevent refetch loop.
    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                setLoading(true);

                if (!groupId) {
                    if (!alive) return;
                    setLoading(false);
                    return;
                }

                await loadGroup(groupId);

                if (!alive) return;
                setLoading(false);
            } catch {
                if (!alive) return;
                setNotFound(true);
                setGeneralError(t("loading.error"));
                setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [groupId, t]);

    useEffect(() => {
        setCurrentUserId(getCurrentUserId());
    }, []);

    // Listen for pending member approval changes and reload members
    useEffect(() => {
        const handleMembersChanged = (event: Event) => {
            const customEvent = event as CustomEvent<{ groupId?: string; userId?: string }>;
            const changedGroupId = String(customEvent.detail?.groupId ?? "").trim();

            if (changedGroupId && groupId && changedGroupId === groupId) {
                const token = localStorage.getItem("accessToken");
                if (token) {
                    fetchGroupMembers(groupId, token)
                        .then((membersJson) => {
                            const mapped = mapMembersFromMembersApi(membersJson);
                            setMembers(mapped);
                        })
                        .catch((err) => {
                            console.error("[GroupSettingView] Failed to reload members after approval:", err);
                        });
                }
            }
        };

        pendingJoinEvents.addEventListener(PENDING_JOIN_CHANGED_EVENT, handleMembersChanged);

        return () => {
            pendingJoinEvents.removeEventListener(PENDING_JOIN_CHANGED_EVENT, handleMembersChanged);
        };
    }, [groupId]);

    const handleEditSave = async () => {
        if (!groupId) return;
        if (!canEditDetails) return;

        if (isEditing) {
            setGeneralError("");
            const validation = groupSettingSchema.safeParse({ groupName, description });
            if (!validation.success) {
                setGeneralError(validation.error.issues[0]?.message || "Dữ liệu không hợp lệ");
                return;
            }

            const res = await updateGroupSettings(
                {
                    groupId,
                    groupName: validation.data.groupName,
                    description: validation.data.description,
                    avatarUrl: avatarUrl,
                    colorHex: colorHex,
                    iconEmoji: iconEmoji || null,
                    isTemplate: isTemplate,
                    isOpen: !requiresMemberApproval,
                    requiresMemberApproval,
                    memberApprovalRequired: requiresMemberApproval,
                    allowMemberUpdateProgress,
                    bannerUrl: bannerUrl,
                    tagline: tagline || null,
                    alias: alias || null
                },
                locale
            );

            if (res.status !== "success" || !res.data) {
                setGeneralError(res.message || t("errors.loadGroupFailed"));
                return;
            }

            writeMemberApprovalFallback(groupId, requiresMemberApproval);

            window.dispatchEvent(
                new CustomEvent(GROUP_UPDATED_EVENT, {
                    detail: {
                        id: groupId,
                        name: validation.data.groupName,
                        description: validation.data.description,
                        studioName: masterStudio,
                        requiresMemberApproval,
                        allowMemberUpdateProgress
                    }
                })
            );

            setInitialSettings({ groupName: validation.data.groupName, description: validation.data.description });
            setInitialAvatarUrl(avatarUrl);
            setInitialColorHex(colorHex);
            setInitialIconEmoji(iconEmoji);
            setInitialBannerUrl(bannerUrl);
            setInitialTagline(tagline);
            setInitialAlias(alias);
            setInitialIsTemplate(isTemplate);
            setInitialRequiresMemberApproval(requiresMemberApproval);
            setInitialAllowMemberUpdateProgress(allowMemberUpdateProgress);

            await loadGroup(groupId);

            setIsEditing(false);
            return;
        }

        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setGroupName(initialSettings.groupName);
        setDescription(initialSettings.description);
        setAvatarUrl(initialAvatarUrl);
        setColorHex(initialColorHex);
        setIconEmoji(initialIconEmoji);
        setBannerUrl(initialBannerUrl);
        setTagline(initialTagline);
        setAlias(initialAlias);
        setIsTemplate(initialIsTemplate);
        setRequiresMemberApproval(initialRequiresMemberApproval);
        setAllowMemberUpdateProgress(initialAllowMemberUpdateProgress);
        setGeneralError("");
        setIsEditing(false);
    };

    const handleArchiveToggle = async (checked: boolean) => {
        if (!groupId || !canToggleArchive || isUpdatingArchive) return;

        const previous = isArchived;
        setStatusError("");
        setIsArchived(checked);
        setIsUpdatingArchive(true);

        try {
            const res = await toggleGroupArchive(groupId, checked, locale);

            if (res.status !== "success") {
                setIsArchived(previous);
                setStatusError(res.message || t("errors.loadGroupFailed"));
                return;
            }

            if (checked && isEditing) {
                setIsEditing(false);
            }

            writeGroupArchiveOverride(groupId, checked);

            window.dispatchEvent(
                new CustomEvent(GROUP_UPDATED_EVENT, {
                    detail: {
                        id: groupId,
                        isArchived: checked
                    }
                })
            );

            await loadGroup(groupId);
        } catch {
            setIsArchived(previous);
            setStatusError(t("errors.loadGroupFailed"));
        } finally {
            setIsUpdatingArchive(false);
        }
    };

    const handleRequiresMemberApprovalChange = async (checked: boolean) => {
        if (!groupId || myRoleInGroup !== "Owner" || isGroupPaused) return;

        const previous = requiresMemberApproval;
        setGeneralError("");
        setRequiresMemberApproval(checked);

        try {
            const res = await toggleGroupMemberApproval(groupId, checked, locale);

            if (res.status !== "success") {
                setRequiresMemberApproval(previous);
                setGeneralError(res.message || t("errors.loadGroupFailed"));
                return;
            }

            setInitialRequiresMemberApproval(checked);
            writeMemberApprovalFallback(groupId, checked);
            window.dispatchEvent(
                new CustomEvent(GROUP_UPDATED_EVENT, {
                    detail: {
                        id: groupId,
                        requiresMemberApproval: checked
                    }
                })
            );

            if (!checked) {
                const pendingResponse = await getPendingMembers(groupId, locale);
                const pendingMembers = pendingResponse?.data?.pendingMembers ?? [];
                const pendingUserIds = pendingMembers
                    .map((member) => String(member.userId ?? "").trim())
                    .filter(Boolean);

                if (pendingUserIds.length > 0) {
                    const approvalResults = await Promise.allSettled(
                        pendingUserIds.map((userId) => approvePendingMember(groupId, userId, locale))
                    );

                    const failedApprovals = approvalResults.filter((result) => {
                        if (result.status !== "fulfilled") return true;
                        return result.value?.status !== "success";
                    });

                    pendingJoinEvents.dispatchEvent(
                        new CustomEvent(PENDING_JOIN_CHANGED_EVENT, {
                            detail: { groupId }
                        })
                    );

                    if (failedApprovals.length > 0) {
                        setGeneralError(
                            locale === "vi"
                                ? "Đã tắt phê duyệt thành viên nhưng một số yêu cầu chờ chưa được chấp nhận tự động."
                                : "Member approval was disabled, but some pending requests could not be auto-approved."
                        );
                    }
                }
            }

            await loadGroup(groupId);
        } catch {
            setRequiresMemberApproval(previous);
            setGeneralError(t("errors.loadGroupFailed"));
        }
    };

    const handleDelete = async () => {
        if (!groupId) return;
        if (!canDelete) return;

        setDangerError("");
        const token = getTokenOrFail();
        if (!token) return;

        setDeleteLoading(true);

        try {
            const res = await fetch(`${apiBase}/group/${groupId}`, {
                method: "DELETE",
                headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
            });

            const text = await readText(res);
            const json = parseJsonSafe(text);

            if (!res.ok || (json && !okByJsonStatus(json))) {
                setDangerError(extractApiMessage(text, json));
                return;
            }

            setDeleteOpen(false);
            router.push(`/${locale}/group`);
        } finally {
            setDeleteLoading(false);
        }
    };

    const assignRoleApi = async (userId: string, role: Exclude<MemberRole, "Owner">) => {
        if (!groupId) return false;

        const token = getTokenOrFail();
        if (!token) return false;

        setMembersError("");

        for (const apiRole of ROLE_FORMATS(role)) {
            const res = await fetch(`${apiBase}/group/member/assign-role`, {
                method: "PUT",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ groupId, userId, role: apiRole })
            });

            const text = await readText(res);
            const json = parseJsonSafe(text);

            if (res.ok && (!json || okByJsonStatus(json))) return true;

            setMembersError(extractApiMessage(text, json));
        }

        return false;
    };

    const removeMemberApi = async (userId: string) => {
        if (!groupId) return false;

        const token = getTokenOrFail();
        if (!token) return false;

        setMembersError("");

        {
            const res = await fetch(`${apiBase}/group/member/remove`, {
                method: "DELETE",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ groupId, userId })
            });

            const text = await readText(res);
            const json = parseJsonSafe(text);

            if (res.ok && (!json || okByJsonStatus(json))) return true;
            setMembersError(extractApiMessage(text, json));
        }

        {
            const url = `${apiBase}/group/member/remove?groupId=${encodeURIComponent(groupId)}&userId=${encodeURIComponent(
                userId
            )}`;
            const res = await fetch(url, {
                method: "DELETE",
                headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
            });

            const text = await readText(res);
            const json = parseJsonSafe(text);

            if (res.ok && (!json || okByJsonStatus(json))) return true;
            setMembersError(extractApiMessage(text, json));
        }

        return false;
    };

    const inviteMemberApi = async (email: string, role: InviteRole) => {
        if (!groupId) return false;

        const token = getTokenOrFail();
        if (!token) return false;

        setMembersError("");

        if (role === "Moderator" && hasModerator) {
            setMembersError(t("members.oneModeratorError"));
            return false;
        }

        const apiRole = normalizeInviteRoleForApi(role);
        const requestBody: Record<string, unknown> = {
            groupId,
            email,
            role: apiRole
        };

        if (requiresMemberApproval) {
            requestBody.requiresMemberApproval = true;
            requestBody.memberApprovalRequired = true;
            requestBody.isApproved = false;
            requestBody.pendingApproval = true;
        }

        const res = await fetch(`${apiBase}/invite/email`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(requestBody)
        });

        const text = await readText(res);
        const json = parseJsonSafe(text);

        if (res.ok && (!json || okByJsonStatus(json))) return true;

        setMembersError(extractApiMessage(text, json));
        return false;
    };

    const createInviteLinkApi = async (role: InviteRole): Promise<string | null> => {
        if (!groupId) return null;

        const token = getTokenOrFail();
        if (!token) return null;

        setMembersError("");

        if (role === "Moderator" && hasModerator) {
            setMembersError(t("members.oneModeratorError"));
            return null;
        }

        const apiRole = normalizeInviteRoleForApi(role);
        const requestBody: Record<string, unknown> = {
            groupId,
            role: apiRole
        };

        if (requiresMemberApproval) {
            requestBody.requiresMemberApproval = true;
            requestBody.memberApprovalRequired = true;
            requestBody.isApproved = false;
            requestBody.pendingApproval = true;
        }

        const res = await fetch(`${apiBase}/invite/create`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(requestBody)
        });

        const text = await readText(res);
        const json = parseJsonSafe(text);

        if (res.ok) {
            const inviteResponse = (json && typeof json === "object" ? (json as CreateInviteLinkResponseApiResponse) : null) ?? null;
            const inviteData = inviteResponse?.data ?? null;
            const tokenFromApi = String(inviteData?.token ?? (json as Record<string, unknown> | null)?.token ?? "").trim();
            const inviteUrlFromApi = String(inviteData?.inviteUrl ?? (json as Record<string, unknown> | null)?.inviteUrl ?? text.trim()).trim();

            const token = tokenFromApi || extractTokenFromInviteUrl(inviteUrlFromApi);

            if (token) {
                const origin = typeof window !== "undefined" ? window.location.origin : "";
                const pendingQuery = requiresMemberApproval ? "?pa=1" : "";
                return `${origin}/${locale}/invite/${encodeURIComponent(token)}${pendingQuery}`;
            }

            if (inviteUrlFromApi) {
                if (!requiresMemberApproval) return inviteUrlFromApi;
                const separator = inviteUrlFromApi.includes("?") ? "&" : "?";
                return `${inviteUrlFromApi}${separator}pa=1`;
            }
            setMembersError("Thiếu inviteUrl");
            return null;
        }

        setMembersError(extractApiMessage(text, json));
        return null;
    };

    const onChangeRole = async (userId: string, role: Exclude<MemberRole, "Owner">) => {
        if (!canManageMembers) return;

        if (myRoleInGroup === "Moderator" && String(userId).trim() === String(currentUserId).trim()) {
            setMembersError("Moderator không thể tự thay đổi vai trò của chính mình");
            return;
        }

        if (role === "Moderator" && currentModeratorId && String(userId) !== String(currentModeratorId)) {
            setMembersError(t("members.oneModeratorError"));
            return;
        }

        const current = members.find((x) => x.id === userId);
        if (!current) return;
        if (isOwner(current.role)) return;

        setMembersError("");
        setRoleLoadingByUserId((p) => ({ ...p, [userId]: true }));

        try {
            setMembers((prev) => prev.map((m) => (m.id === userId ? { ...m, role } : m)));

            const ok = await assignRoleApi(userId, role);
            if (!ok) {
                setMembers((prev) => prev.map((m) => (m.id === userId ? { ...m, role: current.role } : m)));
                return;
            }

            const token = localStorage.getItem("accessToken") || "";
            if (groupId && token) {
                try {
                    const membersJson = await fetchGroupMembers(groupId, token);
                    const mapped = mapMembersFromMembersApi(membersJson);
                    setMembers(mapped);

                    const meId = getCurrentUserId();
                    const me = mapped.find((x) => String(x.id).trim() === String(meId).trim());
                    if (me?.role) setMyRoleInGroup(me.role);
                } catch {
                    await loadGroup(groupId);
                }
            }
        } finally {
            setRoleLoadingByUserId((p) => ({ ...p, [userId]: false }));
        }
    };

    const openRemoveConfirm = (userId: string) => {
        const current = members.find((x) => x.id === userId);
        if (!current) return;
        if (isOwner(current.role)) return;
        if (myRoleInGroup === "Moderator" && String(userId).trim() === String(currentUserId).trim()) {
            setMembersError("Moderator không thể tự xóa chính mình khỏi nhóm");
            return;
        }

        setRemoveTarget({ id: userId, name: current.name });
        setRemoveConfirmOpen(true);
    };

    const confirmRemoveMember = async () => {
        if (!removeTarget) return;
        const userId = removeTarget.id;

        if (myRoleInGroup === "Moderator" && String(userId).trim() === String(currentUserId).trim()) {
            setMembersError("Moderator không thể tự xóa chính mình khỏi nhóm");
            return;
        }

        setMembersError("");
        setRemoveLoadingByUserId((p) => ({ ...p, [userId]: true }));

        try {
            const ok = await removeMemberApi(userId);
            if (!ok) return;

            setMembers((prev) => prev.filter((m) => m.id !== userId));

            const token = localStorage.getItem("accessToken") || "";
            if (groupId && token) {
                try {
                    const membersJson = await fetchGroupMembers(groupId, token);
                    const mapped = mapMembersFromMembersApi(membersJson);
                    setMembers(mapped);

                    const meId = getCurrentUserId();
                    const me = mapped.find((x) => String(x.id).trim() === String(meId).trim());
                    if (me?.role) setMyRoleInGroup(me.role);
                } catch {
                    await loadGroup(groupId);
                }
            }

            setRemoveConfirmOpen(false);
            setRemoveTarget(null);
        } finally {
            setRemoveLoadingByUserId((p) => ({ ...p, [userId]: false }));
        }
    };

    if (loading) {
        return <div className="p-6 text-gray-500 text-sm">{t("loading.loading")}</div>;
    }

    if (!groupId) {
        return <div className="p-6 text-gray-500 text-sm">{t("loading.noGroupId")}</div>;
    }

    if (notFound) {
        return (
            <div className="p-6 text-gray-500 text-sm">
                {t("loading.notFound")}
                {generalError ? <div className="mt-2 text-red-600 text-xs">{generalError}</div> : null}
            </div>
        );
    }

    if (!canViewSettings) {
        const groupHref = fromStudioId
            ? `/${locale}/group/${groupId}?fromStudioId=${encodeURIComponent(fromStudioId)}`
            : `/${locale}/group/${groupId}`;

        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
                <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-xl">
                    <div className="mb-6 flex items-center justify-center gap-3">
                        <svg width="48" height="48" viewBox="0 0 64 64">
                            <path d="M32 6L2 20L32 34L62 20L32 6Z" fill="#F97316" />
                            <path d="M12 26V38C12 45 20 50 32 50C44 50 52 45 52 38V26L32 36L12 26Z" fill="#FB923C" />
                        </svg>
                        <span className="text-3xl font-bold leading-tight text-orange-500">
                            Study <br /> Studio
                        </span>
                    </div>

                    <h1 className="mb-2 font-bold text-2xl text-[#261E33]">{t("unauthorized.title")}</h1>
                    <p className="mb-6 text-sm text-muted-foreground">{t("unauthorized.description")}</p>

                    <Button
                        className="w-full bg-orange-600 text-white hover:bg-orange-700"
                        onClick={() => router.push(groupHref)}>
                        {t("unauthorized.backToGroup")}
                    </Button>
                </div>
            </div>
        );
    }

    const removeBusy = removeTarget ? !!removeLoadingByUserId[removeTarget.id] : false;
    const hasModerator = members.some((m) => m.role === "Moderator");

    return (
        <div className="min-h-screen w-full px-8 py-6 bg-transparent">
            <Container className="rounded-2xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
                <div className="space-y-6 pb-10">



                    <section className="rounded-2xl border bg-white shadow-sm">
                        <div className="flex items-start justify-between border-b px-6 py-5">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100">
                                    <Settings className="h-4 w-4 text-gray-700" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-gray-900 text-sm">{t("general.title")}</h2>
                                    <p className="mt-0.5 text-gray-500 text-xs">{t("general.subtitle")}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {isEditing ? (
                                    <Button
                                        variant="outline"
                                        onClick={handleCancelEdit}
                                        className="h-10 rounded-xl border-gray-300 px-4 font-semibold text-gray-700 text-sm hover:bg-gray-100">
                                        {t("general.cancelButton")}
                                    </Button>
                                ) : null}
                                <Button
                                    onClick={handleEditSave}
                                    disabled={!canEditDetails}
                                    className="h-10 rounded-xl bg-orange-600 px-4 font-semibold text-sm text-white hover:bg-orange-700">
                                    {isEditing ? t("general.saveButton") : t("general.editButton")}
                                </Button>
                            </div>
                        </div>

                        <div className="px-6 py-6">

                            <div className="mb-6 flex items-end gap-6">
                                {/* Identity strip */}
                                <div className="grid w-full grid-cols-1 gap-5 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
                                    {/* Banner thumbnail */}


                                    {/* Avatar + Color/Emoji */}
                                    <div className="rounded-2xl border border-gray-100 bg-[#FCFCFD] p-4">
                                        <div className="flex flex-col gap-4">
                                            <div className="flex justify-center">
                                                <AvatarUpload
                                                    entityType="group"
                                                    entityId={groupId ?? ""}
                                                    avatarUrl={isEditing ? avatarUrl : initialAvatarUrl}
                                                    colorHex={isEditing ? colorHex : initialColorHex}
                                                    iconEmoji={isEditing ? iconEmoji : initialIconEmoji}
                                                    onUploadSuccess={(url) => setAvatarUrl(url)}
                                                    onError={(msg) => setGeneralError(msg)}
                                                    disabled={!isEditing}
                                                    size={96}
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                                            <ColorPicker
                                                label={t("groupInfo.colorLabel")}
                                                value={isEditing ? colorHex : initialColorHex}
                                                onChange={isEditing ? setColorHex : undefined}
                                                disabled={!isEditing}
                                            />
                                            <EmojiPicker
                                                label={t("groupInfo.iconLabel")}
                                                value={isEditing ? iconEmoji : initialIconEmoji}
                                                onChange={isEditing ? setIconEmoji : undefined}
                                                disabled={!isEditing}
                                            />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-full">
                                        <p className="mb-2 text-xs font-semibold text-gray-700">
                                            {t("groupInfo.bannerLabel") || "Ảnh bìa"}
                                        </p>
                                        <BannerUpload
                                            entityType="group"
                                            entityId={groupId ?? ""}
                                            bannerUrl={isEditing ? bannerUrl : initialBannerUrl}
                                            colorHex={isEditing ? colorHex : initialColorHex}
                                            onUploadSuccess={(url) => setBannerUrl(url)}
                                            onDeleteSuccess={() => setBannerUrl(null)}
                                            onError={(msg) => setGeneralError(msg)}
                                            disabled={!isEditing}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-5">
                                <div>
                                    <label htmlFor="group-name-input" className="font-semibold text-gray-700 text-xs">
                                        {t("groupInfo.nameLabel")} <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        id="group-name-input"
                                        disabled={!isEditing}
                                        value={groupName}
                                        maxLength={GROUP_NAME_MAX_LENGTH}
                                        onChange={(e) => {
                                            setGroupName(e.target.value);
                                            if (generalError) setGeneralError("");
                                        }}
                                        className="mt-2 h-10 rounded-xl border-gray-200 focus-visible:border-orange-500 focus-visible:ring-orange-500 disabled:opacity-70"
                                    />
                                    <div className="mt-1 text-right text-gray-500 text-xs">
                                        {groupName.length}/{GROUP_NAME_MAX_LENGTH}
                                    </div>
                                </div>

                                <div className="relative">
                                    <label
                                        htmlFor="group-description-input"
                                        className="font-semibold text-gray-700 text-xs">
                                        {t("groupInfo.descriptionLabel")}
                                    </label>
                                    <Textarea
                                        id="group-description-input"
                                        disabled={!isEditing}
                                        value={description}
                                        maxLength={GROUP_DESCRIPTION_MAX_LENGTH}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const lineBreakCount = (value.match(/\n/g) || []).length;

                                            if (lineBreakCount <= 2) {
                                                setDescription(value);
                                                if (generalError) setGeneralError("");
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                const lineBreakCount = (description.match(/\n/g) || []).length;
                                                if (lineBreakCount >= 2) {
                                                    e.preventDefault();
                                                }
                                            }
                                        }}
                                        onPaste={(e) => {
                                            const pastedText = e.clipboardData.getData("text");
                                            const currentLineBreakCount = (description.match(/\n/g) || []).length;
                                            const pastedLineBreakCount = (pastedText.match(/\n/g) || []).length;

                                            if (currentLineBreakCount + pastedLineBreakCount > 2) {
                                                e.preventDefault();

                                                const allowedBreaks = 2 - currentLineBreakCount;
                                                const lines = pastedText.split("\n").slice(0, allowedBreaks + 1);
                                                const trimmedText = lines.join("\n");

                                                const textarea = e.currentTarget;
                                                const start = textarea.selectionStart;
                                                const end = textarea.selectionEnd;

                                                const newValue =
                                                    description.slice(0, start) + trimmedText + description.slice(end);
                                                setDescription(newValue);
                                                if (generalError) setGeneralError("");
                                            }
                                        }}
                                        className="mt-2 min-h-25 rounded-xl border-gray-200 pb-7 focus-visible:border-orange-500 focus-visible:ring-orange-500 disabled:opacity-70"
                                    />
                                    <span className="pointer-events-none absolute right-3 bottom-3 text-gray-500 text-xs">
                                        {description.length}/{GROUP_DESCRIPTION_MAX_LENGTH}
                                    </span>
                                </div>

                                {masterStudio ? (
                                    <div>
                                        <label
                                            htmlFor="master-studio-input"
                                            className="font-semibold text-gray-700 text-xs">
                                            {t("groupInfo.masterStudioLabel")}
                                        </label>
                                        <Input
                                            id="master-studio-input"
                                            value={masterStudio}
                                            readOnly
                                            tabIndex={-1}
                                            aria-readonly="true"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onFocus={(e) => e.currentTarget.blur()}
                                            className="mt-2 h-10 cursor-default rounded-xl border-gray-200 bg-gray-50 text-gray-900 focus-visible:ring-0"
                                        />
                                    </div>
                                ) : null}

                                {/* Alias */}
                                <div>
                                    <label
                                        htmlFor="group-alias-input"
                                        className="font-semibold text-gray-700 text-xs">
                                        {t("groupInfo.aliasLabel") || "Biệt danh"}
                                    </label>
                                    <Input
                                        id="group-alias-input"
                                        disabled={!isEditing}
                                        value={isEditing ? alias : initialAlias}
                                        onChange={(e) => {
                                            setAlias(e.target.value);
                                            if (generalError) setGeneralError("");
                                        }}
                                        maxLength={50}
                                        placeholder={t("groupInfo.aliasPlaceholder") || "VD: THPT Hoang Dieu"}
                                        className="mt-2 h-10 rounded-xl border-gray-200 focus-visible:border-orange-500 focus-visible:ring-orange-500 disabled:opacity-70"
                                    />
                                    {alias.length > 0 && isEditing && (
                                        <div className="mt-1.5">
                                            <span className="inline-flex items-center rounded-full border border-orange-300 bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                                                {alias}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Tagline */}
                                <div>
                                    <label
                                        htmlFor="group-tagline-input"
                                        className="font-semibold text-gray-700 text-xs">
                                        {t("groupInfo.taglineLabel") || "Slogan"}
                                    </label>
                                    <Input
                                        id="group-tagline-input"
                                        disabled={!isEditing}
                                        value={isEditing ? tagline : initialTagline}
                                        onChange={(e) => {
                                            setTagline(e.target.value);
                                            if (generalError) setGeneralError("");
                                        }}
                                        maxLength={200}
                                        placeholder={t("groupInfo.taglinePlaceholder") || "Nhập slogan ngắn gọn"}
                                        className="mt-2 h-10 rounded-xl border-gray-200 focus-visible:border-orange-500 focus-visible:ring-orange-500 disabled:opacity-70"
                                    />
                                </div>

                                <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                                    <div>
                                        <div className="font-semibold text-gray-700 text-xs">{t("template.label")}</div>
                                        <div className="mt-0.5 text-gray-500 text-xs">{t("template.description")}</div>
                                    </div>
                                    <Switch
                                        checked={isTemplate}
                                        onCheckedChange={(checked) => {
                                            if (!isEditing) return;
                                            setIsTemplate(checked);
                                        }}
                                        disabled={!isEditing}
                                        className="data-[state=checked]:bg-orange-600 data-[state=unchecked]:bg-gray-300"
                                    />
                                </div>

                                <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                                    <div>
                                        <div className="font-semibold text-gray-700 text-xs">{t("allowMemberUpdateProgress.label")}</div>
                                        <div className="mt-0.5 text-gray-500 text-xs">{t("allowMemberUpdateProgress.description")}</div>
                                    </div>
                                    <Switch
                                        checked={allowMemberUpdateProgress}
                                        onCheckedChange={(checked) => {
                                            if (!isEditing) return;
                                            setAllowMemberUpdateProgress(checked);
                                        }}
                                        disabled={!isEditing}
                                        className="data-[state=checked]:bg-orange-600 data-[state=unchecked]:bg-gray-300"
                                    />
                                </div>

                            </div>

                            {generalError ? (
                                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-xs">
                                    {generalError}
                                </div>
                            ) : null}
                        </div>
                    </section>

                    <section className="rounded-2xl border bg-white shadow-sm">
                        <div className="flex items-start justify-between border-b px-6 py-5">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100">
                                    <Users className="h-4 w-4 text-gray-700" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-gray-900 text-sm">{t("members.title")}</h2>
                                    <p className="mt-0.5 text-gray-500 text-xs">{t("members.subtitle")}</p>
                                </div>
                            </div>

                            <Button
                                disabled={!canManageMembers}
                                onClick={() => setInviteOpen(true)}
                                className="h-10 rounded-xl bg-orange-600 px-4 font-semibold text-sm text-white hover:bg-orange-700 disabled:opacity-50">
                                <UserPlus className="mr-2 h-4 w-4" />
                                {t("members.addButton")}
                            </Button>
                        </div>

                        <div className="px-6 py-6">
                            <div className="hidden grid-cols-12 gap-3 rounded-xl border bg-gray-50 px-4 py-3 font-semibold text-gray-600 text-xs md:grid">
                                <div className="col-span-6">{t("members.tableHeaders.member")}</div>
                                <div className="col-span-3 flex justify-center">{t("members.tableHeaders.role")}</div>
                                <div className="col-span-3 flex justify-center">{t("members.tableHeaders.action")}</div>
                            </div>

                            <div className="mt-3 divide-y rounded-2xl border">
                                {members.map((m) => {
                                    const roleBusy = !!roleLoadingByUserId[m.id];
                                    const removingThis = !!removeLoadingByUserId[m.id];
                                    const isSelf = String(m.id).trim() === String(currentUserId).trim();
                                    const isModeratorSelf = myRoleInGroup === "Moderator" && isSelf;
                                    const disabledAll = roleBusy || removingThis || !canManageMembers || isModeratorSelf;
                                    const roleColor = getRoleColor(m.role);
                                    const roleLabel = getRoleLabel(m.role);

                                    return (
                                        <div
                                            key={m.id}
                                            className="grid grid-cols-1 gap-3 px-4 py-4 transition-colors hover:bg-gray-50 md:grid-cols-12 md:items-center">
                                            <div className="md:col-span-6">
                                                <div className="flex items-center gap-3">
                                                    {m.avatarUrl ? (
                                                        <Image
                                                            src={m.avatarUrl}
                                                            alt={m.name}
                                                            width={40}
                                                            height={40}
                                                            unoptimized
                                                            className="h-10 w-10 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 font-bold text-gray-700 text-sm">
                                                            {m.initials}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <div className="truncate font-semibold text-gray-900 text-sm">
                                                            {m.name}
                                                        </div>
                                                        {m.email ? (
                                                            <div className="truncate text-gray-500 text-xs">
                                                                {m.email}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-center gap-3 md:col-span-3">
                                                {isOwner(m.role) || isModeratorSelf ? (
                                                    <div
                                                        className={`inline-flex h-10 w-42.5 items-center justify-center gap-2 rounded-xl border px-3 font-semibold text-sm ${roleColor.border} ${roleColor.bg} ${roleColor.text}`}>
                                                        {getRoleIcon(m.role)}
                                                        <span>{roleLabel}</span>
                                                    </div>
                                                ) : (
                                                    <Select
                                                        value={m.role}
                                                        disabled={disabledAll}
                                                        onValueChange={(v) =>
                                                            onChangeRole(m.id, v as Exclude<MemberRole, "Owner">)
                                                        }>
                                                        <SelectTrigger className="h-10 w-42.5 justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 font-semibold text-gray-900 text-sm shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 data-[state=open]:ring-2 data-[state=open]:ring-orange-500">
                                                            <SelectValue
                                                                placeholder={t("members.selectPlaceholder")}
                                                                className="text-left"
                                                            />
                                                        </SelectTrigger>

                                                        <SelectContent
                                                            position="popper"
                                                            side="bottom"
                                                            align="center"
                                                            sideOffset={8}
                                                            avoidCollisions
                                                            className="z-999999 min-w-55 rounded-2xl border border-gray-200 bg-white p-1 shadow-xl">
                                                            {getRoleOptionsForMember(m.id).map((r) => (
                                                                <SelectItem
                                                                    key={r}
                                                                    value={r}
                                                                    className="relative cursor-pointer rounded-xl px-3 py-2.5 text-gray-900 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100 data-highlighted:bg-gray-100 data-[state=checked]:font-bold">
                                                                    <div className="flex items-center gap-2">
                                                                        {getRoleIcon(r)}
                                                                        <span>{getRoleLabel(r)}</span>
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-center gap-2 md:col-span-3">
                                                {!isOwner(m.role) && !isModeratorSelf ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled={disabledAll}
                                                        className="h-10 w-10 rounded-xl text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:hover:bg-transparent"
                                                        onClick={() => openRemoveConfirm(m.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    <div className="h-10 w-10" />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {members.length === 0 ? (
                                    <div className="px-4 py-10 text-center text-gray-500 text-sm">
                                        {t("members.emptyState")}
                                    </div>
                                ) : null}
                            </div>

                            {membersError ? (
                                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-xs">
                                    {membersError}
                                </div>
                            ) : null}
                        </div>
                    </section>

                    <ApproveMemberSection
                        groupId={groupId}
                        canManage={canManageMembers}
                        showMemberApprovalToggle={myRoleInGroup === "Owner"}
                        requiresMemberApproval={requiresMemberApproval}
                        canEditMemberApproval={myRoleInGroup === "Owner"}
                        onRequiresMemberApprovalChange={handleRequiresMemberApprovalChange}
                    />

                    {myRoleInGroup === "Owner" ? (
                        <>
                            <section
                                className={`rounded-2xl border bg-white shadow-sm transition-colors duration-300 ${isGroupPaused ? "border-amber-200" : "border-emerald-200"}`}>
                                <div
                                    className={`border-b px-6 py-5 transition-colors duration-300 ${isGroupPaused ? "border-amber-200" : "border-emerald-200"}`}>
                                    <h2
                                        className={`font-bold text-sm transition-colors duration-300 ${isGroupPaused ? "text-amber-700" : "text-emerald-700"}`}>
                                        {locale === "vi" ? "Lưu trữ" : "Archive"}
                                    </h2>
                                </div>

                                <div className="px-6 py-6">
                                    <motion.div
                                        layout
                                        initial={false}
                                        animate={{
                                            scale: isGroupPaused ? 1.01 : 1,
                                            boxShadow: isGroupPaused
                                                ? "0 16px 34px rgba(245, 158, 11, 0.14)"
                                                : "0 16px 34px rgba(16, 185, 129, 0.12)"
                                        }}
                                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                                        className={`rounded-2xl border p-5 transition-all duration-300 ${isGroupPaused
                                            ? "border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50"
                                            : "border-emerald-200 bg-gradient-to-r from-emerald-50 to-lime-50"}`}>
                                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                            <div className="flex items-start gap-3">
                                                <motion.div
                                                    animate={{
                                                        scale: isUpdatingArchive ? [1, 1.06, 1] : 1,
                                                        rotate: isGroupPaused ? -3 : 0
                                                    }}
                                                    transition={{
                                                        duration: isUpdatingArchive ? 1 : 0.24,
                                                        repeat: isUpdatingArchive ? Infinity : 0,
                                                        ease: "easeInOut"
                                                    }}
                                                    className={`inline-flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 ${isGroupPaused
                                                        ? "bg-amber-100 text-amber-700"
                                                        : "bg-emerald-100 text-emerald-700"} ${isUpdatingArchive ? "animate-pulse" : ""}`}>
                                                    <Power className="h-4 w-4" />
                                                </motion.div>
                                                <div>
                                                    <AnimatePresence mode="wait" initial={false}>
                                                        <motion.div
                                                            key={isGroupPaused ? "group-archived" : "group-active"}
                                                            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                                                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                                            exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                                                            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                                                        >
                                                            <div
                                                                className={`font-bold text-sm transition-colors duration-300 ${isGroupPaused
                                                                    ? "text-amber-700"
                                                                    : "text-emerald-700"}`}>
                                                                {t("access.title")}
                                                            </div>
                                                            <div className="mt-1 text-xs text-gray-600">
                                                                {isGroupPaused
                                                                    ? t("access.inactiveDescription")
                                                                    : t("access.activeDescription")}
                                                            </div>
                                                        </motion.div>
                                                    </AnimatePresence>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <motion.span
                                                    key={`archive-inactive-${isGroupPaused ? "on" : "off"}`}
                                                    initial={{ opacity: 0, y: 6, scale: 0.92 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    transition={{ duration: 0.22, ease: "easeOut" }}
                                                    className={`inline-flex items-center rounded-full px-2.5 py-1 font-semibold text-xs transition-all duration-300 ${isGroupPaused
                                                        ? "bg-amber-100 text-amber-700"
                                                        : "bg-gray-100 text-gray-500"}`}>
                                                    {t("access.inactiveLabel")}
                                                </motion.span>
                                                <motion.div
                                                    animate={{ rotate: isGroupPaused ? -2 : 0, scale: isGroupPaused ? 1 : 1.03 }}
                                                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                                                >
                                                    <Switch
                                                        checked={!isGroupPaused}
                                                        onCheckedChange={(checked) => {
                                                            void handleArchiveToggle(!checked);
                                                        }}
                                                        disabled={!canToggleArchive || isUpdatingArchive || isParentStudioArchived}
                                                        className="transition-all duration-300 data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-amber-500"
                                                    />
                                                </motion.div>
                                                <motion.span
                                                    key={`archive-active-${!isGroupPaused ? "on" : "off"}`}
                                                    initial={{ opacity: 0, y: 6, scale: 0.92 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    transition={{ duration: 0.22, ease: "easeOut" }}
                                                    className={`inline-flex items-center rounded-full px-2.5 py-1 font-semibold text-xs transition-all duration-300 ${!isGroupPaused
                                                        ? "bg-emerald-100 text-emerald-700"
                                                        : "bg-gray-100 text-gray-500"}`}>
                                                    {t("access.activeLabel")}
                                                </motion.span>
                                            </div>
                                        </div>

                                        {statusError ? (
                                            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-xs">
                                                {statusError}
                                            </div>
                                        ) : null}

                                        {isParentStudioArchived ? (
                                            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700 text-xs">
                                                {locale === "vi"
                                                    ? "Studio đang dừng hoạt động nên nhóm này không thể tự mở lại."
                                                    : "This group cannot be reactivated while its parent studio is paused."}
                                            </div>
                                        ) : null}
                                    </motion.div>
                                </div>
                            </section>

                            <section className="rounded-2xl border border-red-200 bg-white shadow-sm">
                                <div className="border-red-200 border-b px-6 py-5">
                                    <h2 className="font-bold text-red-700 text-sm">{t("dangerZone.title")}</h2>
                                    <p className="mt-0.5 text-red-600 text-xs">{t("dangerZone.subtitle")}</p>
                                </div>

                                <div className="px-6 py-6">
                                    <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <div className="font-bold text-red-700 text-sm">
                                                    {t("dangerZone.deleteGroup.label")}
                                                </div>
                                                <div className="mt-1 text-red-600 text-xs">
                                                    {t("dangerZone.deleteGroup.description")}
                                                </div>
                                            </div>

                                            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        disabled={!canDelete}
                                                        className="h-10 rounded-xl bg-red-600 px-5 font-semibold text-sm text-white hover:bg-red-700 disabled:opacity-50">
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        {t("dangerZone.deleteGroup.button")}
                                                    </Button>
                                                </AlertDialogTrigger>

                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>
                                                            {t("dangerZone.deleteGroup.confirmTitle")}
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            {t("dangerZone.deleteGroup.confirmDescription")}
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>

                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel disabled={deleteLoading}>
                                                            {t("removeMember.cancelButton")}
                                                        </AlertDialogCancel>
                                                        <AlertDialogAction
                                                            disabled={deleteLoading || !canDelete}
                                                            className="bg-red-600 hover:bg-red-700"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                void handleDelete();
                                                            }}>
                                                            {deleteLoading
                                                                ? t("dangerZone.deleteGroup.deleting")
                                                                : t("dangerZone.deleteGroup.confirmButton")}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>

                                    {dangerError ? (
                                        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-xs">
                                            {dangerError}
                                        </div>
                                    ) : null}
                                </div>
                            </section>
                        </>
                    ) : null}
                </div>
            </Container>

            <InviteMemberModal
                open={inviteOpen}
                onClose={() => setInviteOpen(false)}
                groupName={groupName || "Group"}
                canManage={canManageMembers}
                hasModerator={hasModerator}
                onCreateLink={async ({ role }) => {
                    setMembersError("");
                    const url = await createInviteLinkApi(role);
                    if (!url) throw new Error("Create link failed");
                    return url;
                }}
                onSendInvite={async ({ email, role }) => {
                    setMembersError("");
                    const ok = await inviteMemberApi(email, role);
                    if (!ok) return;
                    if (groupId) await loadGroup(groupId);
                }}
            />

            <AlertDialog
                open={removeConfirmOpen}
                onOpenChange={(v) => {
                    setRemoveConfirmOpen(v);
                    if (!v) setRemoveTarget(null);
                }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("removeMember.confirmTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("removeMember.confirmDescription", {
                                name: removeTarget?.name || "member"
                            })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={removeBusy}>{t("removeMember.cancelButton")}</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            disabled={removeBusy}
                            onClick={(e) => {
                                e.preventDefault();
                                void confirmRemoveMember();
                            }}>
                            {removeBusy ? t("removeMember.deleting") : t("removeMember.confirmButton")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
