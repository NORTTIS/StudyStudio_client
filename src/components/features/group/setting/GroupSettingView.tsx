"use client";

import { Settings, Trash2, UserPlus, Users } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect, useMemo, useState } from "react";
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

type ApiMemberPreview = {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
};

type ApiGroupMembersResponse = {
    status?: string | null;
    code?: string | null;
    message?: string | null;
    data?: {
        groupId?: string;
        groupName?: string | null;
        members?:
        | {
            userId?: string;
            firstName?: string | null;
            lastName?: string | null;
            email?: string | null;
            avatarUrl?: string | null;
            role?: string | null;
            joinedAt?: string;
        }[]
        | null;
        totalMembers?: number;
    } | null;
};

type GroupDetail = {
    groupId?: string;
    groupName?: string | null;
    description?: string | null;
    studioName?: string | null;
    userRole?: string | null;
    membersPreview?: ApiMemberPreview[] | null;
};

type GroupDetailResponse = {
    status?: string | null;
    code?: string | null;
    message?: string | null;
    data?: GroupDetail | null;
};

type CreateInviteLinkResponseApiResponse = {
    status?: string | null;
    code?: string | null;
    message?: string | null;
    data?: {
        inviteUrl?: string | null;
        token?: string | null;
        role?: string | null;
        createdAt?: string;
        expiresAt?: string;
    } | null;
};

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
    const raw = String(role).trim(); // "Moderator"
    const upper = raw.toUpperCase(); // "MODERATOR"
    const roleUpper = `ROLE_${upper}`; // "ROLE_MODERATOR"
    return [raw, upper, roleUpper];
};

/** normalize base URL to always end with exactly 1 "/api" */
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
    const [error, setError] = useState("");

    const [roleLoadingByUserId, setRoleLoadingByUserId] = useState<Record<string, boolean>>({});
    const [removeLoadingByUserId, setRemoveLoadingByUserId] = useState<Record<string, boolean>>({});

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [inviteOpen, setInviteOpen] = useState(false);

    const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
    const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);

    const canManageMembers = myRoleInGroup === "Owner" || myRoleInGroup === "Moderator";
    const canDelete = useMemo(() => myRoleInGroup === "Owner", [myRoleInGroup]);

    const getTokenOrFail = () => {
        const token = localStorage.getItem("accessToken") || "";
        if (!token) {
            setError("Thiếu access token");
            return null;
        }
        return token;
    };

    const apiBase = getApiBase();

    const fetchGroupMembers = async (gid: string, token: string) => {
        const res = await fetch(`${apiBase}/group/${gid}/members`, {
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`
            },
            cache: "no-store"
        });

        const text = await readText(res);
        if (!res.ok) throw new Error(text || `Tải members thất bại (${res.status})`);

        let json: any = null;
        try {
            json = text ? JSON.parse(text) : null;
        } catch { }
        return (json ?? {}) as ApiGroupMembersResponse;
    };

    const mapMembersFromMembersApi = (json: ApiGroupMembersResponse): Member[] => {
        const apiMembers = json?.data?.members ?? [];
        return apiMembers.map((m, idx) => {
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

    /** Load group from /group/{id}/detail */
    const loadGroup = async (id: string): Promise<boolean> => {
        setError("");

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
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`
            },
            cache: "no-store"
        });

        const text = await readText(detailRes);
        let detailJson: any = null;
        try {
            detailJson = text ? JSON.parse(text) : null;
        } catch { }

        if (!detailRes.ok) {
            const msg = detailJson?.message || text || `Tải nhóm thất bại (${detailRes.status})`;
            setNotFound(true);
            setError(msg);
            setGroupName("");
            setDescription("");
            setMasterStudio("");
            setMembers([]);
            setMyRoleInGroup("Member");
            return false;
        }

        const parsed = (detailJson as GroupDetailResponse) || {};
        const data = parsed?.data ?? null;

        if (!data?.groupId) {
            setNotFound(true);
            setError("Tải nhóm thất bại: thiếu dữ liệu group");
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
        } catch (e) {
            console.error(e);

            const currentUserId = getCurrentUserId();
            const preview = data.membersPreview ?? [];
            const mapped: Member[] = preview.map((m, idx) => {
                const first = (m.firstName ?? "").trim();
                const last = (m.lastName ?? "").trim();
                const uid = m.id ?? `${id}-${idx}`;
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

            const me = mapped.find((x) => String(x.id).trim() === String(x.id).trim());
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
            } catch (e) {
                console.error(e);
                if (!alive) return;
                setNotFound(true);
                setError("Có lỗi bất ngờ khi tải nhóm");
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
            setError("");
            const token = getTokenOrFail();
            if (!token) return;

            const res = await fetch(`${apiBase}/group`, {
                method: "PUT",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    groupId,
                    groupName,
                    description
                })
            });

            const text = await readText(res);
            let json: any = null;
            try {
                json = text ? JSON.parse(text) : null;
            } catch { }

            if (!res.ok || (json && !okByJsonStatus(json))) {
                const msg = json?.message || text || `Lưu thất bại (${res.status})`;
                setError(msg);
                return;
            }

            window.dispatchEvent(
                new CustomEvent(GROUP_UPDATED_EVENT, {
                    detail: {
                        id: groupId,
                        name: groupName,
                        description,
                        studioName: masterStudio
                    }
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

        setError("");
        const token = getTokenOrFail();
        if (!token) return;

        setDeleteLoading(true);

        try {
            const res = await fetch(`${apiBase}/group/${groupId}`, {
                method: "DELETE",
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`
                }
            });

            const text = await readText(res);
            let json: any = null;
            try {
                json = text ? JSON.parse(text) : null;
            } catch { }

            if (!res.ok || (json && !okByJsonStatus(json))) {
                const msg = json?.message || text || `Xóa thất bại (${res.status})`;
                setError(msg);
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

        setError("");

        for (const apiRole of ROLE_FORMATS(role)) {
            const res = await fetch(`${apiBase}/group/member/assign-role`, {
                method: "PUT",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    groupId,
                    userId,
                    role: apiRole
                })
            });

            const text = await readText(res);
            let json: any = null;
            try {
                json = text ? JSON.parse(text) : null;
            } catch { }

            if (res.ok && (!json || okByJsonStatus(json))) return true;

            const msg = json?.message || text || `Cập nhật vai trò thất bại (${res.status})`;
            setError(`[assign-role ${res.status}] ${msg} (sent role="${apiRole}")`);
        }

        return false;
    };

    const removeMemberApi = async (userId: string) => {
        if (!groupId) return false;

        const token = getTokenOrFail();
        if (!token) return false;

        setError("");

        // 1) DELETE body
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

            const msg = json?.message || text || `Xóa thành viên thất bại (${res.status})`;
            setError(`[remove(body) ${res.status}] ${msg}`);
        }

        // 2) DELETE query
        {
            const url = `${apiBase}/group/member/remove?groupId=${encodeURIComponent(
                groupId
            )}&userId=${encodeURIComponent(userId)}`;
            const res = await fetch(url, {
                method: "DELETE",
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`
                }
            });

            const text = await readText(res);
            let json: any = null;
            try {
                json = text ? JSON.parse(text) : null;
            } catch { }

            if (res.ok && (!json || okByJsonStatus(json))) return true;

            const msg = json?.message || text || `Xóa thành viên thất bại (${res.status})`;
            setError(`[remove(query) ${res.status}] ${msg}`);
        }

        return false;
    };

    const inviteMemberApi = async (email: string, role: InviteRole) => {
        if (!groupId) return false;

        const token = getTokenOrFail();
        if (!token) return false;

        setError("");

        for (const apiRole of ROLE_FORMATS(role)) {
            const res = await fetch(`${apiBase}/invite/email`, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    groupId,
                    email,
                    role: apiRole
                })
            });

            const text = await readText(res);
            let json: any = null;
            try {
                json = text ? JSON.parse(text) : null;
            } catch { }

            if (res.ok && (!json || okByJsonStatus(json))) return true;

            const msg = json?.message || text || `Mời thành viên thất bại (${res.status})`;
            setError(`[invite/email ${res.status}] ${msg} (sent role="${apiRole}")`);
        }

        return false;
    };

    const createInviteLinkApi = async (role: InviteRole): Promise<string | null> => {
        if (!groupId) return null;

        const token = getTokenOrFail();
        if (!token) return null;

        setError("");

        for (const apiRole of ROLE_FORMATS(role)) {
            const res = await fetch(`${apiBase}/invite/create`, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    groupId,
                    role: apiRole
                })
            });

            const text = await readText(res);
            let json: any = null;
            try {
                json = text ? JSON.parse(text) : null;
            } catch { }

            if (res.ok && json && okByJsonStatus(json)) {
                const url = String((json as CreateInviteLinkResponseApiResponse)?.data?.inviteUrl ?? "").trim();
                if (url) return url;
                setError(`[invite/create] thiếu inviteUrl (sent role="${apiRole}")`);
                return null;
            }

            const msg = json?.message || text || `Tạo link thất bại (${res.status})`;
            setError(`[invite/create ${res.status}] ${msg} (sent role="${apiRole}")`);
        }

        return null;
    };

    const onChangeRole = async (userId: string, role: Exclude<MemberRole, "Owner">) => {
        if (!canManageMembers) return;

        const current = members.find((x) => x.id === userId);
        if (!current) return;
        if (isOwner(current.role)) return;

        setError("");
        setRoleLoadingByUserId((p) => ({ ...p, [userId]: true }));

        try {
            // optimistic
            setMembers((prev) => prev.map((m) => (m.id === userId ? { ...m, role } : m)));

            const ok = await assignRoleApi(userId, role);
            if (!ok) {
                setMembers((prev) => prev.map((m) => (m.id === userId ? { ...m, role: current.role } : m)));
                return;
            }

            // reload members
            const token = localStorage.getItem("accessToken") || "";
            if (groupId && token) {
                try {
                    const membersJson = await fetchGroupMembers(groupId, token);
                    const mapped = mapMembersFromMembersApi(membersJson);
                    setMembers(mapped);

                    const meId = getCurrentUserId();
                    const me = mapped.find((x) => String(x.id).trim() === String(meId).trim());
                    if (me?.role) setMyRoleInGroup(me.role);
                } catch (e) {
                    console.error(e);
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

        setError("");
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
                } catch (e) {
                    console.error(e);
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
                {error ? <div className="mt-2 text-red-600 text-xs">{error}</div> : null}
            </div>
        );
    }

    const removeBusy = removeTarget ? !!removeLoadingByUserId[removeTarget.id] : false;

    return (
        <div className="w-full">
            <Container>
                <div className="space-y-6">
                    {error ? (
                        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
                    ) : null}

                    {/* GENERAL */}
                    <section className="rounded-md border bg-white">
                        <div className="flex items-start justify-between border-b px-5 py-4">
                            <div className="flex items-start gap-3">
                                <Settings className="h-4 w-4 text-gray-700" />
                                <div>
                                    <h2 className="font-semibold text-gray-900 text-sm">Cài đặt chung</h2>
                                    <p className="text-gray-500 text-xs">Quản lý thông tin cơ bản của nhóm</p>
                                </div>
                            </div>

                            <Button
                                onClick={handleEditSave}
                                className="h-9 rounded-sm bg-orange-600 px-4 font-semibold text-white text-xs hover:bg-orange-700">
                                {isEditing ? "Lưu thay đổi" : "Chỉnh sửa"}
                            </Button>
                        </div>

                        <div className="px-5 py-5">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="font-semibold text-gray-700 text-xs">
                                        Tên nhóm <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        disabled={!isEditing}
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                        className="mt-2 h-9 rounded-sm focus-visible:border-orange-500 focus-visible:ring-orange-500"
                                    />
                                </div>

                                <div>
                                    <label className="font-semibold text-gray-700 text-xs">Mô tả</label>
                                    <Textarea
                                        disabled={!isEditing}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="mt-2 min-h-[80px] rounded-sm focus-visible:border-orange-500 focus-visible:ring-orange-500"
                                    />
                                </div>

                                {masterStudio ? (
                                    <div>
                                        <label className="font-semibold text-gray-700 text-xs">Master Studio</label>
                                        <Input
                                            value={masterStudio}
                                            readOnly
                                            tabIndex={-1}
                                            aria-readonly="true"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onFocus={(e) => e.currentTarget.blur()}
                                            className="mt-2 h-9 cursor-default rounded-sm bg-white text-gray-900 focus-visible:border-gray-200 focus-visible:ring-0"
                                        />
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </section>

                    {/* MEMBERS */}
                    <section className="rounded-md border bg-white">
                        <div className="flex items-start justify-between border-b px-5 py-4">
                            <div className="flex items-start gap-3">
                                <Users className="h-4 w-4 text-gray-700" />
                                <div>
                                    <h2 className="font-semibold text-gray-900 text-sm">Thành viên</h2>
                                    <p className="text-gray-500 text-xs">Quản lý thành viên và vai trò</p>
                                </div>
                            </div>

                            <Button
                                disabled={!canManageMembers}
                                onClick={() => setInviteOpen(true)}
                                className="h-9 rounded-sm bg-orange-600 px-4 font-semibold text-white text-xs hover:bg-orange-700 disabled:opacity-50">
                                <UserPlus className="mr-2 h-4 w-4" />
                                Thêm thành viên
                            </Button>
                        </div>

                        <div className="px-5 py-4">
                            <div className="divide-y rounded-md border">
                                {members.map((m) => {
                                    const roleBusy = !!roleLoadingByUserId[m.id];
                                    const removingThis = !!removeLoadingByUserId[m.id];
                                    const disabledAll = roleBusy || removingThis || !canManageMembers;

                                    return (
                                        <div key={m.id} className="flex items-center justify-between gap-4 px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 font-semibold text-gray-700 text-xs">
                                                    {m.initials}
                                                </div>

                                                <div>
                                                    <div className="font-semibold text-gray-900 text-sm">{m.name}</div>
                                                    {m.email ? <div className="text-gray-500 text-xs">{m.email}</div> : null}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {isOwner(m.role) ? (
                                                    <div
                                                        className="flex h-8 w-[140px] items-center justify-center rounded-sm border bg-gray-50 px-3 font-semibold text-gray-800 text-xs"
                                                        aria-label="Owner role (read only)"
                                                        title="Owner">
                                                        Owner
                                                    </div>
                                                ) : (
                                                    <>
                                                        {/* ✅ FIX: text gần icon ▼ hơn */}
                                                        <Select
                                                            value={m.role}
                                                            disabled={disabledAll}
                                                            onValueChange={(v) => onChangeRole(m.id, v as Exclude<MemberRole, "Owner">)}>
                                                            <SelectTrigger className="h-8 w-fit min-w-0 gap-1 px-2 pr-1">
                                                                <SelectValue className="text-left" />
                                                            </SelectTrigger>

                                                            <SelectContent>
                                                                {roleOptions.map((r) => (
                                                                    <SelectItem key={r} value={r}>
                                                                        {r}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            disabled={disabledAll}
                                                            className="h-8 w-8 rounded-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:hover:bg-transparent"
                                                            onClick={() => openRemoveConfirm(m.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {members.length === 0 ? (
                                    <div className="px-4 py-6 text-gray-500 text-sm">Chưa có thành viên để hiển thị.</div>
                                ) : null}
                            </div>
                        </div>
                    </section>

                    {/* DANGER */}
                    <section className="rounded-md border border-red-200 bg-white">
                        <div className="border-red-200 border-b px-5 py-4">
                            <h2 className="font-semibold text-red-600 text-sm">Vùng nguy hiểm</h2>
                            <p className="text-red-500 text-xs">Các thao tác không thể hoàn tác</p>
                        </div>

                        <div className="px-5 py-4">
                            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <div className="font-semibold text-red-600 text-sm">Xóa nhóm</div>
                                        <div className="text-red-500 text-xs">Xóa vĩnh viễn nhóm và toàn bộ dữ liệu liên quan</div>
                                    </div>

                                    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                disabled={!canDelete}
                                                className="h-8 rounded-sm bg-red-600 px-4 font-semibold text-white text-xs hover:bg-red-700 disabled:opacity-50">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Xóa
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
                                                        handleDelete();
                                                    }}>
                                                    {deleteLoading ? "Đang xóa..." : "Xác nhận xóa"}
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </Container>

            <InviteMemberModal
                open={inviteOpen}
                onClose={() => setInviteOpen(false)}
                groupName={groupName || "Group"}
                canManage={canManageMembers}
                onCreateLink={async ({ role }) => {
                    setError("");
                    const url = await createInviteLinkApi(role);
                    if (!url) throw new Error("Create link failed");
                    return url;
                }}
                onSendInvite={async ({ email, role }) => {
                    setError("");
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
                                confirmRemoveMember();
                            }}>
                            {removeBusy ? "Đang xóa..." : "Xóa thành viên"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
