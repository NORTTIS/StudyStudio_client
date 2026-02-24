"use client";

import { Settings, Trash2, UserPlus, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect, useMemo, useState } from "react";
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

type ApiStudio = {
    id?: string;
    name?: string | null;
};

type ApiGroupCard = {
    id?: string;
    name?: string | null;
    description?: string | null;
    role?: string | null;
    studio?: ApiStudio | null;
    membersPreview?: ApiMemberPreview[] | null;
};

type ApiGroupListResponse = {
    status?: string;
    code?: string;
    message?: string;
    data?: {
        sections?: {
            favorites?: ApiGroupCard[] | null;
            studioGroups?: ApiGroupCard[] | null;
            independentGroups?: ApiGroupCard[] | null;
        } | null;
    } | null;
};

type AssignRoleResponseApiResponse = {
    status?: string | null;
    code?: string | null;
    message?: string | null;
    data?: {
        groupId?: string;
        groupName?: string | null;
        userId?: string;
        userName?: string | null;
        oldRole?: string | null;
        newRole?: string | null;
        updatedAt?: string;
    } | null;
};

type RemoveMemberResponseApiResponse = {
    status?: string | null;
    code?: string | null;
    message?: string | null;
    data?: unknown;
};

type Member = {
    id: string;
    name: string;
    email: string;
    initials: string;
    role: MemberRole;
};

const roleOptions: MemberRole[] = ["Owner", "Moderator", "Member", "Commenter", "Viewer"];

const toMemberRole = (r?: string | null): MemberRole => {
    if (r === "Owner" || r === "Moderator" || r === "Member" || r === "Commenter" || r === "Viewer") return r;
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

const GROUP_UPDATED_EVENT = "group:updated";
const isOwner = (role: MemberRole) => role === "Owner";

const getCurrentUserId = () => {
    const keys = ["userId", "accountId", "id", "uid"];
    for (const k of keys) {
        const v = localStorage.getItem(k);
        if (v) return v;
    }
    return "";
};

export function GroupSettingView() {
    const locale = useLocale();
    const router = useRouter();
    const sp = useSearchParams();
    const groupId = sp.get("id") || undefined;

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);

    const [groupName, setGroupName] = useState("");
    const [description, setDescription] = useState("");
    const [masterStudio, setMasterStudio] = useState("");
    const [members, setMembers] = useState<Member[]>([]);

    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState("");

    const [roleLoadingByUserId, setRoleLoadingByUserId] = useState<Record<string, boolean>>({});
    const [removeLoadingByUserId, setRemoveLoadingByUserId] = useState<Record<string, boolean>>({});

    const canDelete = useMemo(() => true, []);

    const getTokenOrFail = () => {
        const token = localStorage.getItem("accessToken") || "";
        if (!token) {
            setError("Missing access token");
            return null;
        }
        return token;
    };

    const loadGroup = async (id: string): Promise<boolean> => {
        setError("");

        const token = localStorage.getItem("accessToken") || "";
        if (!token) {
            setNotFound(true);
            setGroupName("");
            setDescription("");
            setMasterStudio("");
            setMembers([]);
            return false;
        }

        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";
        const res = await fetch(`${baseUrl}/group`, {
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`
            },
            cache: "no-store"
        });

        if (!res.ok) {
            setNotFound(true);
            setError(`Load group failed (${res.status})`);
            setGroupName("");
            setDescription("");
            setMasterStudio("");
            setMembers([]);
            return false;
        }

        const json = (await res.json()) as ApiGroupListResponse;

        const sections = json?.data?.sections ?? null;

        const favorites = sections?.favorites ?? [];
        const studioGroups = sections?.studioGroups ?? [];
        const independentGroups = sections?.independentGroups ?? [];

        const allGroups: ApiGroupCard[] = [...favorites, ...studioGroups, ...independentGroups];

        const found = allGroups.find((g) => (g?.id ?? "") === id);

        if (!found) {
            setNotFound(true);
            setGroupName("");
            setDescription("");
            setMasterStudio("");
            setMembers([]);
            return false;
        }

        setNotFound(false);
        setGroupName(found.name ?? "");
        setDescription(found.description ?? "");
        setMasterStudio(found.studio?.name ?? "");

        const currentUserId = getCurrentUserId();
        const myRole = toMemberRole(found.role);

        const mapped: Member[] = (found.membersPreview ?? []).map((m, idx) => {
            const first = (m.firstName ?? "").trim();
            const last = (m.lastName ?? "").trim();
            const uid = m.id ?? `${id}-${idx}`;

            return {
                id: uid,
                name: `${first} ${last}`.trim() || "Unknown",
                email: "",
                initials: safeInitials(first, last),
                role: currentUserId && uid === currentUserId ? myRole : "Member"
            };
        });

        setMembers(mapped);
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
                setError("Unexpected error while loading group");
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

            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";
            const res = await fetch(`${baseUrl}/group`, {
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

            if (!res.ok) {
                setError(`Save failed (${res.status})`);
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

        setError("");
        const token = getTokenOrFail();
        if (!token) return;

        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";
        const res = await fetch(`${baseUrl}/group/${groupId}`, {
            method: "DELETE",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`
            }
        });

        if (!res.ok) {
            setError(`Delete failed (${res.status})`);
            return;
        }

        router.push(`/${locale}/group`);
    };

    const assignRoleApi = async (userId: string, role: MemberRole) => {
        if (!groupId) return false;

        const token = getTokenOrFail();
        if (!token) return false;

        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";
        const res = await fetch(`${baseUrl}/group/member/assign-role`, {
            method: "PUT",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                groupId,
                userId,
                role
            })
        });

        if (!res.ok) {
            setError(`Assign role failed (${res.status})`);
            return false;
        }

        const json = (await res.json()) as AssignRoleResponseApiResponse;

        if (json?.status && json.status.toLowerCase() !== "success") {
            setError(json.message || "Assign role failed");
            return false;
        }

        return true;
    };

    const removeMemberApi = async (userId: string) => {
        if (!groupId) return false;

        const token = getTokenOrFail();
        if (!token) return false;

        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";
        const res = await fetch(`${baseUrl}/group/member/remove`, {
            method: "DELETE",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                groupId,
                userId
            })
        });

        if (!res.ok) {
            setError(`Remove member failed (${res.status})`);
            return false;
        }

        const json = (await res.json()) as RemoveMemberResponseApiResponse;

        if (json?.status && json.status.toLowerCase() !== "success") {
            setError(json.message || "Remove member failed");
            return false;
        }

        return true;
    };

    const onChangeRole = async (userId: string, role: MemberRole) => {
        const current = members.find((x) => x.id === userId);
        if (!current) return;
        if (isOwner(current.role)) return;
        if (role === "Owner") return;

        setError("");
        setRoleLoadingByUserId((p) => ({ ...p, [userId]: true }));

        try {
            const ok = await assignRoleApi(userId, role);
            if (!ok) return;

            setMembers((prev) => prev.map((m) => (m.id === userId ? { ...m, role } : m)));

            if (groupId) await loadGroup(groupId);
        } finally {
            setRoleLoadingByUserId((p) => ({ ...p, [userId]: false }));
        }
    };

    const onRemoveMember = async (userId: string) => {
        const current = members.find((x) => x.id === userId);
        if (!current) return;
        if (isOwner(current.role)) return;

        setError("");
        setRemoveLoadingByUserId((p) => ({ ...p, [userId]: true }));

        try {
            const ok = await removeMemberApi(userId);
            if (!ok) return;

            setMembers((prev) => prev.filter((m) => m.id !== userId));

            if (groupId) await loadGroup(groupId);
        } finally {
            setRemoveLoadingByUserId((p) => ({ ...p, [userId]: false }));
        }
    };

    if (loading) {
        return <div className="p-6 text-gray-500 text-sm">Loading...</div>;
    }

    if (!groupId) {
        return <div className="p-6 text-gray-500 text-sm">Missing group id. Open a group card to enter this page.</div>;
    }

    if (notFound) {
        return (
            <div className="p-6 text-gray-500 text-sm">
                Group not found or you are not authorized.
                {error ? <div className="mt-2 text-red-600 text-xs">{error}</div> : null}
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="mx-auto w-full max-w-5xl px-6 py-6">
                <div className="space-y-6">
                    {error ? (
                        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
                    ) : null}

                    <section className="rounded-md border bg-white">
                        <div className="flex items-start justify-between border-b px-5 py-4">
                            <div className="flex items-start gap-3">
                                <Settings className="h-4 w-4 text-gray-700" />
                                <div>
                                    <h2 className="font-semibold text-gray-900 text-sm">General Settings</h2>
                                    <p className="text-gray-500 text-xs">Manage basic information for this group studio</p>
                                </div>
                            </div>

                            <Button
                                onClick={handleEditSave}
                                className="h-9 rounded-sm bg-orange-600 px-4 font-semibold text-white text-xs hover:bg-orange-700">
                                {isEditing ? "Save Changes" : "Edit"}
                            </Button>
                        </div>

                        <div className="px-5 py-5">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="font-semibold text-gray-700 text-xs">
                                        Group Name <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        disabled={!isEditing}
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                        className="mt-2 h-9 rounded-sm focus-visible:border-orange-500 focus-visible:ring-orange-500"
                                    />
                                </div>

                                <div>
                                    <label className="font-semibold text-gray-700 text-xs">Description</label>
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

                    <section className="rounded-md border bg-white">
                        <div className="flex items-start justify-between border-b px-5 py-4">
                            <div className="flex items-start gap-3">
                                <Users className="h-4 w-4 text-gray-700" />
                                <div>
                                    <h2 className="font-semibold text-gray-900 text-sm">Members</h2>
                                    <p className="text-gray-500 text-xs">Manage team members and their roles</p>
                                </div>
                            </div>

                            <Button className="h-9 rounded-sm bg-orange-600 px-4 font-semibold text-white text-xs hover:bg-orange-700">
                                <UserPlus className="mr-2 h-4 w-4" />
                                Add Member
                            </Button>
                        </div>

                        <div className="px-5 py-4">
                            <div className="divide-y rounded-md border">
                                {members.map((m) => {
                                    const roleBusy = !!roleLoadingByUserId[m.id];
                                    const removeBusy = !!removeLoadingByUserId[m.id];
                                    const disabledAll = roleBusy || removeBusy;

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
                                                <span className="inline-flex h-8 items-center rounded-sm border bg-white px-3 font-semibold text-gray-700 text-xs">
                                                    {m.role}
                                                </span>

                                                {isOwner(m.role) ? null : (
                                                    <>
                                                        <Select
                                                            value={m.role}
                                                            disabled={disabledAll}
                                                            onValueChange={(v) => onChangeRole(m.id, v as MemberRole)}>
                                                            <SelectTrigger className="h-8 w-[140px] rounded-sm">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {roleOptions.map((r) => (
                                                                    <SelectItem key={r} value={r} disabled={r === "Owner"}>
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
                                                            onClick={() => onRemoveMember(m.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {members.length === 0 ? (
                                    <div className="px-4 py-6 text-gray-500 text-sm">No members preview.</div>
                                ) : null}
                            </div>
                        </div>
                    </section>

                    <section className="rounded-md border border-red-200 bg-white">
                        <div className="border-red-200 border-b px-5 py-4">
                            <h2 className="font-semibold text-red-600 text-sm">Danger Zone</h2>
                            <p className="text-red-500 text-xs">Irreversible actions for this studio</p>
                        </div>

                        <div className="px-5 py-4">
                            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <div className="font-semibold text-red-600 text-sm">Delete Studio</div>
                                        <div className="text-red-500 text-xs">Permanently delete this studio and all its data</div>
                                    </div>

                                    <Button
                                        onClick={handleDelete}
                                        disabled={!canDelete}
                                        className="h-8 rounded-sm bg-red-600 px-4 font-semibold text-white text-xs hover:bg-red-700">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
