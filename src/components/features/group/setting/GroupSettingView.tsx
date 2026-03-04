"use client";

import { Settings, Trash2, UserPlus, Users } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import type { components } from "@/api/types";
import { Container } from "@/components/common";
import { InviteMemberModal, type InviteRole } from "@/components/features/group/setting/InviteMemberModal";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type MemberRole = "Owner" | "Moderator" | "Member" | "Commenter" | "Viewer";

/** ✅ OpenAPI types */
type GroupDetailResponseApiResponse = components["schemas"]["GroupDetailResponseApiResponse"];
type GroupMemberListResponseApiResponse = components["schemas"]["GroupMemberListResponseApiResponse"];
type CreateInviteLinkResponseApiResponse = components["schemas"]["CreateInviteLinkResponseApiResponse"];
type ObjectApiResponse = components["schemas"]["ObjectApiResponse"];

type ApiMemberPreview = components["schemas"]["MemberPreviewDto"];
type ApiGroupMemberDto = components["schemas"]["GroupMemberDto"];
type ApiGroupDetail = components["schemas"]["GroupDetailResponse"];

type Member = {
    id: string;
    name: string;
    email: string;
    initials: string;
    role: MemberRole;
};

const roleOptions: Exclude<MemberRole, "Owner">[] = ["Moderator", "Member", "Commenter", "Viewer"];
const GROUP_UPDATED_EVENT = "group:updated";
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

        const payload = JSON.parse(json) as Record<string, any>;
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

const okByJsonStatus = (obj: any) => {
    const s = String(obj?.status ?? "").toLowerCase();
    return s === "" || s === "success" || s === "ok" || s === "true";
};

const ROLE_FORMATS = (role: string) => {
    const raw = String(role).trim();
    const upper = raw.toUpperCase();
    const roleUpper = `ROLE_${upper}`;
    return [raw, upper, roleUpper];
};

const getApiBase = () => {
    const raw = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    const base = String(raw).replace(/\/+$/, "");
    return base.endsWith("/api") ? base : `${base}/api`;
};

export function GroupSettingView() {
    const locale = useLocale();
    const router = useRouter();

    const sp = useSearchParams();
    const params = useParams<{ groupId?: string }>();

    const groupIdFromQuery = sp.get("id") || undefined;
    const groupIdFromParams = params?.groupId ? String(params.groupId) : undefined;
    const groupId = groupIdFromParams || groupIdFromQuery;

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);

    const [groupName, setGroupName] = useState("");
    const [description, setDescription] = useState("");
    const [masterStudio, setMasterStudio] = useState("");

    const [members, setMembers] = useState<Member[]>([]);
    const [myRoleInGroup, setMyRoleInGroup] = useState<MemberRole>("Member");

    const [notFound, setNotFound] = useState(false);

    const [generalError, setGeneralError] = useState("");
    const [membersError, setMembersError] = useState("");
    const [dangerError, setDangerError] = useState("");

    const [roleLoadingByUserId, setRoleLoadingByUserId] = useState<Record<string, boolean>>({});
    const [removeLoadingByUserId, setRemoveLoadingByUserId] = useState<Record<string, boolean>>({});

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [inviteOpen, setInviteOpen] = useState(false);

    const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
    const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);

    const canManageMembers = myRoleInGroup === "Owner" || myRoleInGroup === "Moderator";
    const canDelete = useMemo(() => myRoleInGroup === "Owner", [myRoleInGroup]);

    const apiBase = getApiBase();

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

    const extractApiMessage = (text: string, json: any) => {
        const msg = (json?.message ?? "").toString().trim();
        if (msg) return msg;
        const t = (text ?? "").toString().trim();
        return t || "Đã xảy ra lỗi";
    };

    const getTokenOrFail = () => {
        const token = localStorage.getItem("accessToken") || "";
        if (!token) {
            setGeneralError("Thiếu access token");
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
        if (!res.ok) throw new Error(text || `Tải members thất bại (${res.status})`);

        let json: any = null;
        try {
            json = text ? JSON.parse(text) : null;
        } catch { }
        return (json ?? {}) as GroupMemberListResponseApiResponse;
    };

    const mapMembersFromMembersApi = (json: GroupMemberListResponseApiResponse): Member[] => {
        const apiMembers = json?.data?.members ?? [];
        return (apiMembers || []).map((m: ApiGroupMemberDto, idx: number) => {
            const first = (m.firstName ?? "").trim();
            const last = (m.lastName ?? "").trim();
            const uid = m.userId ?? `${idx}`;
            const role = toMemberRole(m.role);

            return {
                id: String(uid),
                name: `${first} ${last}`.trim() || "Không rõ",
                email: (m.email ?? "").trim(),
                initials: safeInitials(first, last),
                role
            };
        });
    };

    const loadGroup = async (id: string): Promise<boolean> => {
        setGeneralError("");
        setMembersError("");
        setDangerError("");

        const token = localStorage.getItem("accessToken") || "";
        if (!token) {
            setNotFound(true);
            setGroupName("");
            setDescription("");
            setMasterStudio("");
            setMembers([]);
            setMyRoleInGroup("Member");
            return false;
        }

        const detailRes = await fetch(`${apiBase}/group/${id}/detail`, {
            headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
            cache: "no-store"
        });

        const text = await readText(detailRes);
        let detailJson: any = null;
        try {
            detailJson = text ? JSON.parse(text) : null;
        } catch { }

        if (!detailRes.ok) {
            setNotFound(true);
            setGeneralError(extractApiMessage(text, detailJson));
            setGroupName("");
            setDescription("");
            setMasterStudio("");
            setMembers([]);
            setMyRoleInGroup("Member");
            return false;
        }

        const parsed = (detailJson as GroupDetailResponseApiResponse) || {};
        const data: ApiGroupDetail | undefined = parsed?.data ?? undefined;

        if (!data?.groupId) {
            setNotFound(true);
            setGeneralError("Tải nhóm thất bại");
            return false;
        }

        setNotFound(false);
        setGroupName(data.groupName ?? "");
        setDescription(data.description ?? "");
        setMasterStudio(data.studioName ?? "");

        const roleFromDetail = toMemberRole(data.userRole);
        setMyRoleInGroup(roleFromDetail);

        try {
            const membersJson = await fetchGroupMembers(id, token);
            const mapped = mapMembersFromMembersApi(membersJson);
            setMembers(mapped);

            const meId = getCurrentUserId();
            const me = mapped.find((x) => String(x.id).trim() === String(meId).trim());
            if (me?.role) setMyRoleInGroup(me.role);
        } catch {
            // fallback: dùng membersPreview (nếu backend không cho members)
            const currentUserId = getCurrentUserId();
            const preview: ApiMemberPreview[] = (data as any)?.membersPreview ?? [];
            const mapped: Member[] = (preview || []).map((m, idx) => {
                const first = (m.firstName ?? "").trim();
                const last = (m.lastName ?? "").trim();
                const uid = (m as any)?.id ?? `${id}-${idx}`;
                const isMe = String(uid).trim() === String(currentUserId).trim();

                return {
                    id: String(uid),
                    name: `${first} ${last}`.trim() || "Không rõ",
                    email: "",
                    initials: safeInitials(first, last),
                    role: isMe ? roleFromDetail : "Member"
                };
            });
            setMembers(mapped);

            const me = mapped.find((x) => String(x.id).trim() === String(currentUserId).trim());
            if (me?.role) setMyRoleInGroup(me.role);
        }

        return true;
    };

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
                setGeneralError("Có lỗi bất ngờ khi tải nhóm");
                setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [groupId]);

    const handleEditSave = async () => {
        if (!groupId) return;

        if (isEditing) {
            setGeneralError("");
            const token = getTokenOrFail();
            if (!token) return;

            const res = await fetch(`${apiBase}/group`, {
                method: "PUT",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ groupId, groupName, description })
            });

            const text = await readText(res);
            let json: any = null;
            try {
                json = text ? JSON.parse(text) : null;
            } catch { }

            if (!res.ok || (json && !okByJsonStatus(json))) {
                setGeneralError(extractApiMessage(text, json));
                return;
            }

            window.dispatchEvent(
                new CustomEvent(GROUP_UPDATED_EVENT, {
                    detail: { id: groupId, name: groupName, description, studioName: masterStudio }
                })
            );

            setIsEditing(false);
            return;
        }

        setIsEditing(true);
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
            let json: any = null;
            try {
                json = text ? JSON.parse(text) : null;
            } catch { }

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
            let json: any = null;
            try {
                json = text ? JSON.parse(text) : null;
            } catch { }

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

        // 1) body
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
            let json: any = null;
            try {
                json = text ? JSON.parse(text) : null;
            } catch { }

            if (res.ok && (!json || okByJsonStatus(json))) return true;
            setMembersError(extractApiMessage(text, json));
        }

        // 2) query fallback
        {
            const url = `${apiBase}/group/member/remove?groupId=${encodeURIComponent(groupId)}&userId=${encodeURIComponent(
                userId
            )}`;
            const res = await fetch(url, {
                method: "DELETE",
                headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
            });

            const text = await readText(res);
            let json: any = null;
            try {
                json = text ? JSON.parse(text) : null;
            } catch { }

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

        for (const apiRole of ROLE_FORMATS(role)) {
            const res = await fetch(`${apiBase}/invite/email`, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ groupId, email, role: apiRole })
            });

            const text = await readText(res);
            let json: any = null;
            try {
                json = text ? JSON.parse(text) : null;
            } catch { }

            if (res.ok && (!json || okByJsonStatus(json))) return true;

            setMembersError(extractApiMessage(text, json));
        }

        return false;
    };

    const createInviteLinkApi = async (role: InviteRole): Promise<string | null> => {
        if (!groupId) return null;

        const token = getTokenOrFail();
        if (!token) return null;

        setMembersError("");

        for (const apiRole of ROLE_FORMATS(role)) {
            const res = await fetch(`${apiBase}/invite/create`, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ groupId, role: apiRole })
            });

            const text = await readText(res);
            let json: any = null;
            try {
                json = text ? JSON.parse(text) : null;
            } catch { }

            if (res.ok && json && okByJsonStatus(json)) {
                const url = String((json as CreateInviteLinkResponseApiResponse)?.data?.inviteUrl ?? "").trim();
                if (url) return url;
                setMembersError("Thiếu inviteUrl");
                return null;
            }

            setMembersError(extractApiMessage(text, json));
        }

        return null;
    };

    const onChangeRole = async (userId: string, role: Exclude<MemberRole, "Owner">) => {
        if (!canManageMembers) return;

        if (role === "Moderator" && currentModeratorId && String(userId) !== String(currentModeratorId)) {
            setMembersError("Nhóm chỉ được có 1 Moderator. Hãy đổi Moderator hiện tại sang vai trò khác trước.");
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

        setRemoveTarget({ id: userId, name: current.name });
        setRemoveConfirmOpen(true);
    };

    const confirmRemoveMember = async () => {
        if (!removeTarget) return;
        const userId = removeTarget.id;

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
        return <div className="p-6 text-gray-500 text-sm">Đang tải...</div>;
    }

    if (!groupId) {
        return <div className="p-6 text-gray-500 text-sm">Thiếu id nhóm. Hãy mở một group để vào trang này.</div>;
    }

    if (notFound) {
        return (
            <div className="p-6 text-gray-500 text-sm">
                Không tìm thấy nhóm hoặc bạn không có quyền truy cập.
                {generalError ? <div className="mt-2 text-red-600 text-xs">{generalError}</div> : null}
            </div>
        );
    }

    const removeBusy = removeTarget ? !!removeLoadingByUserId[removeTarget.id] : false;
    const hasModerator = members.some((m) => m.role === "Moderator");

    return (
        <div className="w-full">
            <Container>
                <div className="space-y-6 pb-10">
                    <section className="rounded-2xl border bg-white shadow-sm">
                        <div className="flex items-start justify-between border-b px-6 py-5">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100">
                                    <Settings className="h-4 w-4 text-gray-700" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-gray-900">Cài đặt chung</h2>
                                    <p className="mt-0.5 text-xs text-gray-500">Quản lý thông tin cơ bản của nhóm</p>
                                </div>
                            </div>

                            <Button
                                onClick={handleEditSave}
                                className="h-10 rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700"
                            >
                                {isEditing ? "Lưu thay đổi" : "Chỉnh sửa"}
                            </Button>
                        </div>

                        <div className="px-6 py-6">
                            <div className="grid grid-cols-1 gap-5">
                                <div>
                                    <label className="text-xs font-semibold text-gray-700">
                                        Tên nhóm <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        disabled={!isEditing}
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                        className="mt-2 h-10 rounded-xl border-gray-200 focus-visible:border-orange-500 focus-visible:ring-orange-500 disabled:opacity-70"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-700">Mô tả</label>
                                    <Textarea
                                        disabled={!isEditing}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="mt-2 min-h-[100px] rounded-xl border-gray-200 focus-visible:border-orange-500 focus-visible:ring-orange-500 disabled:opacity-70"
                                    />
                                </div>

                                {masterStudio ? (
                                    <div>
                                        <label className="text-xs font-semibold text-gray-700">Master Studio</label>
                                        <Input
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
                            </div>

                            {generalError ? (
                                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
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
                                    <h2 className="text-sm font-bold text-gray-900">Thành viên</h2>
                                    <p className="mt-0.5 text-xs text-gray-500">Quản lý thành viên và vai trò</p>
                                </div>
                            </div>

                            <Button
                                disabled={!canManageMembers}
                                onClick={() => setInviteOpen(true)}
                                className="h-10 rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
                            >
                                <UserPlus className="mr-2 h-4 w-4" />
                                Thêm thành viên
                            </Button>
                        </div>

                        <div className="px-6 py-6">
                            <div className="hidden md:grid grid-cols-12 gap-3 rounded-xl border bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-600">
                                <div className="col-span-6">Thành viên</div>
                                <div className="col-span-3 flex justify-center">Vai trò</div>
                                <div className="col-span-3 flex justify-center">Thao tác</div>
                            </div>

                            <div className="mt-3 divide-y rounded-2xl border">
                                {members.map((m) => {
                                    const roleBusy = !!roleLoadingByUserId[m.id];
                                    const removingThis = !!removeLoadingByUserId[m.id];
                                    const disabledAll = roleBusy || removingThis || !canManageMembers;

                                    return (
                                        <div
                                            key={m.id}
                                            className="grid grid-cols-1 gap-3 px-4 py-4 transition-colors hover:bg-gray-50/80 md:grid-cols-12 md:items-center"
                                        >
                                            <div className="md:col-span-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-700">
                                                        {m.initials}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="truncate text-sm font-semibold text-gray-900">{m.name}</div>
                                                        {m.email ? <div className="truncate text-xs text-gray-500">{m.email}</div> : null}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-center gap-3 md:col-span-3">
                                                {isOwner(m.role) ? (
                                                    <div className="inline-flex h-10 w-[170px] items-center justify-center rounded-xl border bg-gray-50 px-3 text-sm font-semibold text-gray-800">
                                                        Owner
                                                    </div>
                                                ) : (
                                                    <Select
                                                        value={m.role}
                                                        disabled={disabledAll}
                                                        onValueChange={(v) => onChangeRole(m.id, v as Exclude<MemberRole, "Owner">)}
                                                    >
                                                        <SelectTrigger
                                                            className="
                                                                h-10 w-[170px]
                                                                justify-between
                                                                rounded-xl border border-gray-200 bg-white
                                                                px-3 text-sm font-semibold text-gray-900
                                                                shadow-sm
                                                                hover:bg-gray-50
                                                                focus:outline-none focus:ring-2 focus:ring-orange-500
                                                                data-[state=open]:ring-2 data-[state=open]:ring-orange-500
                                                                disabled:opacity-50
                                                            "
                                                        >
                                                            <SelectValue placeholder="Chọn role" className="text-left" />
                                                        </SelectTrigger>

                                                        <SelectContent
                                                            position="popper"
                                                            side="bottom"
                                                            align="center"
                                                            sideOffset={8}
                                                            avoidCollisions
                                                            className="z-[999999] min-w-[220px] rounded-2xl border border-gray-200 bg-white p-1 shadow-xl"
                                                        >
                                                            {getRoleOptionsForMember(m.id).map((r) => (
                                                                <SelectItem
                                                                    key={r}
                                                                    value={r}
                                                                    className="
                                                                        relative
                                                                        rounded-xl px-3 py-2.5
                                                                        text-sm text-gray-900
                                                                        cursor-pointer
                                                                        outline-none
                                                                        hover:bg-gray-100
                                                                        focus:bg-gray-100
                                                                        data-[highlighted]:bg-gray-100
                                                                        data-[state=checked]:font-bold
                                                                    "
                                                                >
                                                                    {r}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-center gap-2 md:col-span-3">
                                                {!isOwner(m.role) ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled={disabledAll}
                                                        className="h-10 w-10 rounded-xl text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:hover:bg-transparent"
                                                        onClick={() => openRemoveConfirm(m.id)}
                                                    >
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
                                    <div className="px-4 py-10 text-center text-sm text-gray-500">
                                        Chưa có thành viên để hiển thị.
                                    </div>
                                ) : null}
                            </div>

                            {membersError ? (
                                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                                    {membersError}
                                </div>
                            ) : null}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-red-200 bg-white shadow-sm">
                        <div className="border-b border-red-200 px-6 py-5">
                            <h2 className="text-sm font-bold text-red-700">Vùng nguy hiểm</h2>
                            <p className="mt-0.5 text-xs text-red-600">Các thao tác không thể hoàn tác</p>
                        </div>

                        <div className="px-6 py-6">
                            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <div className="text-sm font-bold text-red-700">Xóa nhóm</div>
                                        <div className="mt-1 text-xs text-red-600">Xóa vĩnh viễn nhóm và toàn bộ dữ liệu liên quan.</div>
                                    </div>

                                    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                disabled={!canDelete}
                                                className="h-10 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Xóa nhóm
                                            </Button>
                                        </AlertDialogTrigger>

                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Bạn chắc chắn muốn xóa nhóm này?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Hành động này không thể hoàn tác. Nhóm và toàn bộ dữ liệu sẽ bị xóa vĩnh viễn.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>

                                            <AlertDialogFooter>
                                                <AlertDialogCancel disabled={deleteLoading}>Hủy</AlertDialogCancel>
                                                <AlertDialogAction
                                                    disabled={deleteLoading || !canDelete}
                                                    className="bg-red-600 hover:bg-red-700"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        void handleDelete();
                                                    }}
                                                >
                                                    {deleteLoading ? "Đang xóa..." : "Xác nhận xóa"}
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>

                                {!canDelete ? (
                                    <div className="mt-4 text-xs text-red-700">
                                        Chỉ <b>Owner</b> mới có quyền xóa nhóm.
                                    </div>
                                ) : null}
                            </div>

                            {dangerError ? (
                                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                                    {dangerError}
                                </div>
                            ) : null}
                        </div>
                    </section>
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
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa thành viên</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc chắn muốn xóa{" "}
                            <span className="font-semibold text-gray-900">{removeTarget?.name || "thành viên này"}</span> khỏi nhóm
                            không? Hành động này không thể hoàn tác.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={removeBusy}>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            disabled={removeBusy}
                            onClick={(e) => {
                                e.preventDefault();
                                void confirmRemoveMember();
                            }}
                        >
                            {removeBusy ? "Đang xóa..." : "Xóa thành viên"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}