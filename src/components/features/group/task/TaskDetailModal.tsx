"use client";

import { Loader2, MessageSquare, Paperclip, SendHorizontal, X } from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import * as React from "react";
import { createPortal } from "react-dom";
import type { components } from "@/api/types";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

type ApiResponse<T> = { status?: string; code?: string; message?: string; data?: T };

type UserDto = {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
};

type TaskItemResponse = {
    taskId?: string;
    taskTitle?: string | null;
    dueDate?: string;
    startDate?: string;
    position?: number;
    taskPriority?: number;
    taskSeverity?: number;
    taskDescription?: string | null;
    assignee?: UserDto | null;
    groupStatus?: { groupId?: string; statusId?: string; position?: number; statusName?: string | null } | null;
};

type TaskStatusDto = {
    position?: number;
    statusId?: string;
    statusName?: string | null;
    taskList?: TaskItemResponse[] | null;
};

type StatusOption = {
    statusId: string;
    statusName: string;
};

type GroupMemberDto = {
    userId?: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
};

type GroupMemberListResponse = {
    groupId?: string;
    groupName?: string | null;
    members?: GroupMemberDto[] | null;
    totalMembers?: number;
};

type UserProfileResponse = {
    userId?: string;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
};

type GroupDetailResponse = {
    groupId?: string;
    groupName?: string | null;
    taskStatuses?: TaskStatusDto[] | null;
};

export type TaskDetail = {
    id: string;
    title: string;
    description?: string | null;
    assigneeId?: string | null;
    assigneeName?: string | null;
    assigneeAvatarUrl?: string | null;
    statusId?: string | null;
    statusName?: string | null;
    priorityValue: number;
    priorityLabel: string;
    severityValue: number;
    severityLabel: string;
    startDateRaw?: string | null;
    dueDateRaw?: string | null;
    startDateFmt?: string | null;
    dueDateFmt?: string | null;
    raw?: unknown;
};

type TaskCommentDto = {
    commentId?: string;
    content?: string | null;
    createdAt?: string;
    updatedAt?: string | null;
    isDeleted?: boolean;
    user?: UserDto;
    userId?: string;
};

type TaskCommentListResponse = {
    taskId?: string;
    totalComments?: number;
    comments?: TaskCommentDto[] | null;
};

type UpdateTaskRequest = components["schemas"]["UpdateTaskRequest"];

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function getApiBase() {
    const raw = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    return String(raw).replace(/\/+$/, "");
}

/**
 * ✅ FIX: tránh /api/api
 * - Nếu env = http://localhost:8080  -> url = http://localhost:8080/api/...
 * - Nếu env = http://localhost:8080/api -> url = http://localhost:8080/api/...
 */
function apiUrl(path: string) {
    const base = getApiBase();
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    if (!base) return cleanPath;

    if (base.endsWith("/api")) return `${base}${cleanPath}`;
    return `${base}/api${cleanPath}`;
}

function getAccessTokenOrNull() {
    if (typeof window === "undefined") return null;
    const t = localStorage.getItem("accessToken");
    return t ? String(t) : null;
}

const readText = async (res: Response) => {
    try {
        return await res.text();
    } catch {
        return "";
    }
};

function parseMaybeJson(raw: string) {
    const text = (raw ?? "").toString().trim();
    if (!text) return { json: null as unknown, text: "" };
    try {
        const cleaned = text.replace(/^\uFEFF/, "");
        return { json: JSON.parse(cleaned), text };
    } catch {
        return { json: null as unknown, text };
    }
}

function getErrorMessage(e: unknown, fallback: string) {
    if (e instanceof Error && e.message.trim()) return e.message;
    return fallback;
}

function asObject(v: unknown): Record<string, unknown> | null {
    return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
}

const okByJsonStatus = (obj: unknown) => {
    const value = asObject(obj)?.status;
    const s = String(value ?? "").toLowerCase();
    return s === "" || s === "success" || s === "ok" || s === "true";
};

const extractApiMessage = (text: string, json: unknown) => {
    const msg = String(asObject(json)?.message ?? "").trim();
    if (msg) return msg;
    const t = (text ?? "").toString().trim();
    return t || "Đã xảy ra lỗi";
};

function formatDisplayDate(input?: string | null) {
    const s = String(input ?? "").trim();
    if (!s) return "";
    // .NET default date -> treat as empty
    if (s.startsWith("0001-01-01")) return "";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function initials(u?: UserDto) {
    const fn = (u?.firstName ?? "").trim();
    const ln = (u?.lastName ?? "").trim();
    const a = fn ? fn[0] : "";
    const b = ln ? ln[0] : "";
    const out = (a + b).toUpperCase();
    return out || "U";
}

function fullName(u?: UserDto | null) {
    if (!u) return null;
    const s = `${(u.firstName ?? "").trim()} ${(u.lastName ?? "").trim()}`.trim();
    return s || null;
}

function priorityLabelOf(n?: number) {
    // Backend enum TaskPriority: Low=0, Medium=1, High=2
    if (n === 0) return "Low";
    if (n === 1) return "Medium";
    if (n === 2) return "High";
    return "Low";
}

function severityLabelOf(n?: number) {
    // Backend enum TaskSeverity: Minor=0, Moderate=1, Major=2, Critical=3
    if (n === 0) return "Minor";
    if (n === 1) return "Moderate";
    if (n === 2) return "Major";
    if (n === 3) return "Critical";
    return "Minor";
}

function normalizePriorityValue(n?: number) {
    if (n === 0 || n === 1 || n === 2) return n;
    return 0;
}

function normalizeSeverityValue(n?: number) {
    if (n === 0 || n === 1 || n === 2 || n === 3) return n;
    return 0;
}

function relativeTimeOf(input?: string | null) {
    const s = String(input ?? "").trim();
    if (!s) return "";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "";

    const diffMs = d.getTime() - Date.now();
    const absMs = Math.abs(diffMs);
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

    if (absMs < hour) return rtf.format(Math.round(diffMs / minute), "minute");
    if (absMs < day) return rtf.format(Math.round(diffMs / hour), "hour");
    return rtf.format(Math.round(diffMs / day), "day");
}

function priorityTone(label?: string | null) {
    const v = String(label ?? "").toLowerCase();
    if (v === "high") return "bg-rose-50 text-rose-600 border-rose-200";
    if (v === "medium") return "bg-amber-50 text-amber-700 border-amber-200";
    if (v === "low") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    return "bg-zinc-50 text-zinc-700 border-zinc-200";
}

function severityTone(label?: string | null) {
    const v = String(label ?? "").toLowerCase();
    if (v === "critical") return "bg-rose-100 text-rose-700 border-rose-300";
    if (v === "major") return "bg-orange-100 text-orange-700 border-orange-300";
    if (v === "moderate") return "bg-amber-50 text-amber-700 border-amber-200";
    if (v === "minor") return "bg-sky-50 text-sky-700 border-sky-200";
    return "bg-zinc-50 text-zinc-700 border-zinc-200";
}

const priorityItemClassName =
    "cursor-pointer rounded-xl px-3 py-2.5 text-sm text-zinc-900 outline-none data-highlighted:bg-zinc-100 hover:bg-zinc-100 focus:bg-zinc-100";
const modelSelectItemClassName =
    "cursor-pointer rounded-xl px-3 py-2 text-sm text-zinc-900 outline-none data-highlighted:bg-zinc-100 hover:bg-zinc-100 focus:bg-zinc-100";

function toDateInputValue(input?: string | null) {
    const s = String(input ?? "").trim();
    if (!s || s.startsWith("0001-01-01")) return "";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function safeAvatarUrl(input?: string | null) {
    const raw = String(input ?? "").trim();
    if (!raw) return "";
    return raw.replace("localhost", "127.0.0.1");
}

function buildInitials(name?: string | null) {
    const s = String(name ?? "").trim();
    if (!s) return "U";
    const parts = s.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? "";
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    return `${a}${b}`.toUpperCase() || "U";
}

function readParam(params: Record<string, string | string[] | undefined>, key: string) {
    const value = params[key];
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    return null;
}

function getGroupIdFromParams(params: Record<string, string | string[] | undefined>) {
    const direct = readParam(params, "groupId") || readParam(params, "id") || readParam(params, "slug") || null;
    if (direct) return direct;
    const firstKey = Object.keys(params).find((k) => {
        const value = params[k];
        return typeof value === "string" || (Array.isArray(value) && typeof value[0] === "string");
    });
    return firstKey ? readParam(params, firstKey) : null;
}

async function apiGetGroupDetail(groupId: string) {
    const token = getAccessTokenOrNull();
    const base = getApiBase();
    if (!base) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");

    const url = apiUrl(`/group/${encodeURIComponent(groupId)}/detail`);

    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        cache: "no-store"
    });

    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);

    if (!res.ok || (json && !okByJsonStatus(json))) {
        throw new Error(extractApiMessage(raw, json));
    }

    return (json ?? null) as ApiResponse<GroupDetailResponse> | null;
}

/**
 * - backend task.groupStatus can be null
 * - task is nested under a status column (TaskStatusDto.statusName)
 */
function findTaskInGroupDetail(detail: GroupDetailResponse | null | undefined, taskId: string) {
    const statuses = detail?.taskStatuses ?? [];
    for (const st of statuses) {
        const list = st?.taskList ?? [];
        const found = list.find((t) => String(t?.taskId ?? "") === taskId);
        if (found) return { task: found, statusName: st?.statusName ?? null, statusId: st?.statusId ?? null };
    }
    return null;
}

function mapTaskDetailFromTaskItem(
    task: TaskItemResponse,
    taskId: string,
    fallbackStatusName?: string | null,
    fallbackStatusId?: string | null
): TaskDetail {
    const title = String(task?.taskTitle ?? "").trim() || "Task";
    const description = task?.taskDescription ?? null;
    const assigneeName = fullName(task?.assignee) ?? null;

    const statusFromTask = String(task?.groupStatus?.statusName ?? "").trim();
    const statusFromColumn = String(fallbackStatusName ?? "").trim();
    const statusName = statusFromTask || statusFromColumn || null;
    const statusId = String(task?.groupStatus?.statusId ?? fallbackStatusId ?? "").trim() || null;

    const priorityValue = normalizePriorityValue(task?.taskPriority);
    const severityValue = normalizeSeverityValue(task?.taskSeverity);
    const priorityLabel = priorityLabelOf(priorityValue);
    const severityLabel = severityLabelOf(severityValue);

    const startDateRaw = task?.startDate ?? null;
    const dueDateRaw = task?.dueDate ?? null;

    const startFmt = startDateRaw ? formatDisplayDate(String(startDateRaw)) : "";
    const dueFmt = dueDateRaw ? formatDisplayDate(String(dueDateRaw)) : "";

    return {
        id: String(task?.taskId ?? taskId),
        title,
        description: description != null ? String(description) : null,
        assigneeId: task?.assignee?.id ?? null,
        assigneeName,
        assigneeAvatarUrl: task?.assignee?.avatarUrl ?? null,
        statusId,
        statusName,
        priorityValue,
        priorityLabel,
        severityValue,
        severityLabel,
        startDateRaw,
        dueDateRaw,
        startDateFmt: startFmt,
        dueDateFmt: dueFmt,
        raw: task
    };
}

function mapStatusOptions(detail: GroupDetailResponse | null | undefined): StatusOption[] {
    return (detail?.taskStatuses ?? [])
        .map((s) => {
            const statusId = String(s?.statusId ?? "").trim();
            const statusName = String(s?.statusName ?? "").trim();
            if (!statusId) return null;
            if (!statusName) return null;
            return { statusId, statusName };
        })
        .filter((s): s is StatusOption => s != null);
}

async function apiGetTaskDetailFromGroup(groupId: string, taskId: string) {
    const resp = await apiGetGroupDetail(groupId);
    const group = resp?.data ?? null;
    const hit = findTaskInGroupDetail(group, taskId);
    if (!hit) throw new Error("Không tìm thấy task trong group");
    return {
        task: mapTaskDetailFromTaskItem(hit.task, taskId, hit.statusName, hit.statusId),
        statusOptions: mapStatusOptions(group)
    };
}

async function apiGetGroupMembers(groupId: string) {
    const token = getAccessTokenOrNull();
    const base = getApiBase();
    if (!base) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");

    const url = apiUrl(`/group/${encodeURIComponent(groupId)}/members`);

    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        cache: "no-store"
    });

    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);

    if (!res.ok || (json && !okByJsonStatus(json))) {
        throw new Error(extractApiMessage(raw, json));
    }

    return (json ?? null) as ApiResponse<GroupMemberListResponse> | null;
}

async function apiGetMyProfile() {
    const token = getAccessTokenOrNull();
    const base = getApiBase();
    if (!base) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");

    const url = apiUrl("/user-profile");

    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        cache: "no-store"
    });

    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);

    if (!res.ok || (json && !okByJsonStatus(json))) {
        throw new Error(extractApiMessage(raw, json));
    }

    return (json ?? null) as ApiResponse<UserProfileResponse> | null;
}

async function apiGetTaskComments(taskId: string) {
    const token = getAccessTokenOrNull();
    const base = getApiBase();
    if (!base) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");

    const url = apiUrl(`/task-comments/${encodeURIComponent(taskId)}?limit=50&offset=0`);

    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        cache: "no-store"
    });

    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);

    if (!res.ok || (json && !okByJsonStatus(json))) {
        throw new Error(extractApiMessage(raw, json));
    }

    return (json ?? null) as ApiResponse<TaskCommentListResponse> | null;
}

function toApiDateTimeOrNull(input: string) {
    const s = String(input ?? "").trim();
    if (!s) return null;
    return `${s}T00:00:00`;
}

async function apiUpdateTask(args: {
    groupId: string;
    taskId: string;
    payload: UpdateTaskRequest;
}) {
    const token = getAccessTokenOrNull();
    const base = getApiBase();
    if (!base) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");

    const url = apiUrl(`/Task/${encodeURIComponent(args.groupId)}/${encodeURIComponent(args.taskId)}`);

    const res = await fetch(url, {
        method: "PUT",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(args.payload)
    });

    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);

    if (!res.ok || (json && !okByJsonStatus(json))) {
        throw new Error(extractApiMessage(raw, json));
    }

    return json;
}

export default function TaskDetailModal(props: {
    open: boolean;
    onClose: () => void;
    taskId: string | null;
    onDelete?: (taskId: string) => void;
}) {
    const { open, onClose, taskId } = props;
    const params = useParams<Record<string, string | string[] | undefined>>();
    const groupId = React.useMemo(() => getGroupIdFromParams(params ?? {}), [params]);

    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);

    const [loadingDetail, setLoadingDetail] = React.useState(false);
    const [detailError, setDetailError] = React.useState<string | null>(null);
    const [task, setTask] = React.useState<TaskDetail | null>(null);

    const [loadingComments, setLoadingComments] = React.useState(false);
    const [comments, setComments] = React.useState<TaskCommentDto[]>([]);
    const [commentError, setCommentError] = React.useState<string | null>(null);
    const [commentDraft, setCommentDraft] = React.useState("");

    const [statusOptions, setStatusOptions] = React.useState<StatusOption[]>([]);
    const [members, setMembers] = React.useState<GroupMemberDto[]>([]);
    const [membersError, setMembersError] = React.useState<string | null>(null);
    const [myAvatarUrl, setMyAvatarUrl] = React.useState("");

    const [assigneeId, setAssigneeId] = React.useState("");
    const [statusId, setStatusId] = React.useState("");
    const [taskName, setTaskName] = React.useState("");
    const [priority, setPriority] = React.useState("");
    const [severity, setSeverity] = React.useState("");
    const [startDate, setStartDate] = React.useState("");
    const [dueDate, setDueDate] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [saving, setSaving] = React.useState(false);
    const [saveError, setSaveError] = React.useState<string | null>(null);

    const handleSendComment = () => {
        // TODO: call create comment API when backend available
        setCommentDraft("");
    };

    React.useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    React.useEffect(() => {
        if (!open) return;
        if (!taskId) return;

        let alive = true;

        (async () => {
            setLoadingDetail(true);
            setDetailError(null);
            try {
                if (!groupId) throw new Error("Thiếu groupId từ route");
                const result = await apiGetTaskDetailFromGroup(groupId, taskId);
                if (!alive) return;
                setTask(result.task);
                setStatusOptions(result.statusOptions);
            } catch (e: unknown) {
                if (!alive) return;
                setDetailError(getErrorMessage(e, "Không tải được task detail"));
                setTask(null);
                setStatusOptions([]);
            } finally {
                if (alive) setLoadingDetail(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [open, taskId, groupId]);

    React.useEffect(() => {
        if (!open) return;
        if (!taskId) return;

        let alive = true;

        (async () => {
            setLoadingComments(true);
            setCommentError(null);
            try {
                const resp = await apiGetTaskComments(taskId);
                const list = (resp?.data?.comments ?? []) as TaskCommentDto[];
                if (!alive) return;
                setComments((list ?? []).filter((c) => !c?.isDeleted));
            } catch (e: unknown) {
                if (!alive) return;
                setCommentError(getErrorMessage(e, "Không tải được comments"));
                setComments([]);
            } finally {
                if (alive) setLoadingComments(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [open, taskId]);

    React.useEffect(() => {
        if (!open) return;
        if (!groupId) return;

        let alive = true;

        (async () => {
            setMembersError(null);
            try {
                const resp = await apiGetGroupMembers(groupId);
                const list = resp?.data?.members ?? [];
                if (!alive) return;
                setMembers((list ?? []).filter((m) => !!String(m?.userId ?? "").trim()));
            } catch (e: unknown) {
                if (!alive) return;
                setMembersError(getErrorMessage(e, "Không tải được danh sách thành viên"));
                setMembers([]);
            }
        })();

        return () => {
            alive = false;
        };
    }, [open, groupId]);

    React.useEffect(() => {
        if (!open) return;

        let alive = true;

        (async () => {
            try {
                const resp = await apiGetMyProfile();
                if (!alive) return;
                setMyAvatarUrl(safeAvatarUrl(resp?.data?.avatarUrl ?? ""));
            } catch {
                if (!alive) return;
                setMyAvatarUrl("");
            }
        })();

        return () => {
            alive = false;
        };
    }, [open]);

    React.useEffect(() => {
        setTaskName(task?.title ?? "");
        setAssigneeId(task?.assigneeId ?? "");
        setStatusId(task?.statusId ?? "");
        setPriority(String(normalizePriorityValue(task?.priorityValue)));
        setSeverity(String(normalizeSeverityValue(task?.severityValue)));
        setStartDate(toDateInputValue(task?.startDateRaw));
        setDueDate(toDateInputValue(task?.dueDateRaw));
        setDescription(task?.description ?? "");
        setSaveError(null);
    }, [task]);

    const assigneeOptions = React.useMemo(
        () =>
            members.map((m) => {
                const name = `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim();
                return {
                    userId: String(m.userId ?? ""),
                    label: name || m.email || "Unnamed",
                    avatarUrl: safeAvatarUrl(m.avatarUrl)
                };
            }),
        [members]
    );

    const selectedAssignee = React.useMemo(
        () => assigneeOptions.find((m) => m.userId === assigneeId) ?? null,
        [assigneeOptions, assigneeId]
    );

    const selectedAssigneeDisplay = React.useMemo(() => {
        if (selectedAssignee) return selectedAssignee;
        if (task?.assigneeId && task.assigneeName) {
            return {
                userId: task.assigneeId,
                label: task.assigneeName,
                avatarUrl: safeAvatarUrl(task.assigneeAvatarUrl)
            };
        }
        return { userId: "", label: "Unassigned", avatarUrl: "" };
    }, [selectedAssignee, task?.assigneeAvatarUrl, task?.assigneeId, task?.assigneeName]);

    const selectedStatusName = React.useMemo(() => {
        const hit = statusOptions.find((s) => s.statusId === statusId);
        return hit?.statusName ?? task?.statusName ?? "—";
    }, [statusId, statusOptions, task?.statusName]);

    const selectedPriorityValue = React.useMemo(() => normalizePriorityValue(Number(priority)), [priority]);

    const selectedPriorityLabel = React.useMemo(
        () => priorityLabelOf(selectedPriorityValue),
        [selectedPriorityValue]
    );

    const selectedSeverityValue = React.useMemo(() => normalizeSeverityValue(Number(severity)), [severity]);

    const selectedSeverityLabel = React.useMemo(
        () => severityLabelOf(selectedSeverityValue),
        [selectedSeverityValue]
    );

    const handleSave = async () => {
        setSaveError(null);
        const taskNameTrimmed = taskName.trim();

        if (!taskNameTrimmed) {
            setSaveError("Tên task là bắt buộc.");
            return;
        }

        if (startDate && dueDate && startDate > dueDate) {
            setSaveError("Start Date phải nhỏ hơn hoặc bằng Due Date.");
            return;
        }

        if (groupId == null || taskId == null) {
            setSaveError("Thiếu groupId hoặc taskId.");
            return;
        }

        try {
            setSaving(true);
            await apiUpdateTask({
                groupId,
                taskId,
                payload: {
                    taskName: taskNameTrimmed,
                    taskDescription: description.trim() || null,
                    assigneeId: assigneeId || null,
                    groupStatusId: statusId || null,
                    startDate: toApiDateTimeOrNull(startDate),
                    dueDate: toApiDateTimeOrNull(dueDate),
                    taskPriority: selectedPriorityValue,
                    taskSeverity: selectedSeverityValue
                }
            });
        } catch (e: unknown) {
            setSaveError(getErrorMessage(e, "Không cập nhật được task"));
            setSaving(false);
            return;
        }

        setTask((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                title: taskNameTrimmed,
                assigneeId: assigneeId || null,
                assigneeName: selectedAssignee?.label ?? null,
                assigneeAvatarUrl: selectedAssignee?.avatarUrl ?? null,
                statusId: statusId || null,
                statusName: selectedStatusName,
                priorityValue: selectedPriorityValue,
                priorityLabel: selectedPriorityLabel,
                severityValue: selectedSeverityValue,
                severityLabel: selectedSeverityLabel,
                startDateRaw: startDate || null,
                dueDateRaw: dueDate || null,
                startDateFmt: startDate ? formatDisplayDate(startDate) : "",
                dueDateFmt: dueDate ? formatDisplayDate(dueDate) : "",
                description: description.trim() || null
            };
        });
        setSaving(false);
        onClose();
    };

    if (!open) return null;
    if (!mounted) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-10000 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            onPointerDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}>
            <div
                className={cn(
                    "w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
                )}
                onPointerDown={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between border-zinc-200 border-b px-7 py-5">
                    <div className="min-w-0">
                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700 text-sm">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            {selectedStatusName}
                        </span>
                        {loadingDetail ? (
                            <h2 className="mt-3 min-w-0 truncate font-extrabold text-[34px] text-zinc-900 leading-none">
                                Loading...
                            </h2>
                        ) : (
                            <input
                                value={taskName}
                                onChange={(e) => setTaskName(e.target.value)}
                                placeholder="Task name"
                                className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 font-extrabold text-[28px] text-zinc-900 leading-none outline-none"
                            />
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"
                        aria-label="Close">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="px-7 py-5">
                    {detailError ? (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 font-semibold text-rose-700 text-sm">
                            {detailError}
                        </div>
                    ) : null}

                    {loadingDetail ? (
                        <div className="mt-4 flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Đang tải…
                        </div>
                    ) : null}

                    {membersError ? (
                        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 font-semibold text-rose-700 text-sm">
                            {membersError}
                        </div>
                    ) : null}

                    {saveError ? (
                        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 font-semibold text-rose-700 text-sm">
                            {saveError}
                        </div>
                    ) : null}

                    <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-3">
                        <div>
                            <div className="font-semibold text-sm text-zinc-600">Assignee</div>
                            <Select
                                value={assigneeId || "unassigned"}
                                onValueChange={(v) => setAssigneeId(v === "unassigned" ? "" : v)}>
                                <SelectTrigger className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 px-3 font-medium text-sm text-zinc-800">
                                    <div className="flex min-w-0 items-center gap-2">
                                        {selectedAssigneeDisplay.avatarUrl ? (
                                            <Image
                                                src={selectedAssigneeDisplay.avatarUrl}
                                                alt={selectedAssigneeDisplay.label}
                                                width={24}
                                                height={24}
                                                unoptimized
                                                className="h-6 w-6 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 font-bold text-[11px] text-white">
                                                {buildInitials(selectedAssigneeDisplay.label)}
                                            </div>
                                        )}
                                        <span className="truncate">{selectedAssigneeDisplay.label}</span>
                                    </div>
                                </SelectTrigger>

                                <SelectContent
                                    position="popper"
                                    side="bottom"
                                    align="start"
                                    sideOffset={8}
                                    avoidCollisions
                                    className="z-10010 min-w-54 rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl">
                                    <SelectItem value="unassigned" className={modelSelectItemClassName}>
                                        Unassigned
                                    </SelectItem>
                                    {assigneeOptions.map((m) => (
                                        <SelectItem key={m.userId} value={m.userId} className={modelSelectItemClassName}>
                                            {m.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <div className="font-semibold text-sm text-zinc-600">Status</div>
                            <Select value={statusId || "no-status"} onValueChange={(v) => setStatusId(v === "no-status" ? "" : v)}>
                                <SelectTrigger className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 px-3 font-medium text-sm text-zinc-800">
                                    <span className="truncate">{selectedStatusName}</span>
                                </SelectTrigger>

                                <SelectContent
                                    position="popper"
                                    side="bottom"
                                    align="start"
                                    sideOffset={8}
                                    avoidCollisions
                                    className="z-10010 min-w-54 rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl">
                                    <SelectItem value="no-status" className={modelSelectItemClassName}>
                                        No status
                                    </SelectItem>
                                    {statusOptions.map((s) => (
                                        <SelectItem key={s.statusId} value={s.statusId} className={modelSelectItemClassName}>
                                            {s.statusName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <div className="font-semibold text-sm text-zinc-600">Priority</div>
                            <Select value={String(selectedPriorityValue)} onValueChange={setPriority}>
                                <SelectTrigger className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border px-3 font-semibold text-sm text-zinc-800">
                                    <span
                                        className={cn(
                                            "inline-flex items-center gap-2 rounded-full px-2 py-1",
                                            priorityTone(selectedPriorityLabel)
                                        )}>
                                        <span className="h-2 w-2 rounded-full bg-current" />
                                        {selectedPriorityLabel}
                                    </span>
                                </SelectTrigger>

                                <SelectContent
                                    position="popper"
                                    side="bottom"
                                    align="end"
                                    sideOffset={8}
                                    avoidCollisions
                                    className="z-10010 min-w-42 rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl">
                                    <SelectItem value="0" className={priorityItemClassName}>
                                        Low
                                    </SelectItem>
                                    <SelectItem value="1" className={priorityItemClassName}>
                                        Medium
                                    </SelectItem>
                                    <SelectItem value="2" className={priorityItemClassName}>
                                        High
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>



                        <div>
                            <div className="font-semibold text-sm text-zinc-600">Start Date</div>
                            <div className="mt-2 flex h-11 items-center justify-between rounded-xl border border-zinc-200 px-3 text-sm text-zinc-700">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-transparent outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="font-semibold text-sm text-zinc-600">Due Date</div>
                            <div className="mt-2 flex h-11 items-center justify-between rounded-xl border border-zinc-200 px-3 text-sm text-zinc-700">
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="w-full bg-transparent outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <div className="font-semibold text-sm text-zinc-600">Severity</div>
                            <Select value={String(selectedSeverityValue)} onValueChange={setSeverity}>
                                <SelectTrigger className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border px-3 font-semibold text-sm text-zinc-800">
                                    <span
                                        className={cn(
                                            "inline-flex items-center gap-2 rounded-full px-2 py-1",
                                            severityTone(selectedSeverityLabel)
                                        )}>
                                        <span className="h-2 w-2 rounded-full bg-current" />
                                        {selectedSeverityLabel}
                                    </span>
                                </SelectTrigger>

                                <SelectContent
                                    position="popper"
                                    side="bottom"
                                    align="end"
                                    sideOffset={8}
                                    avoidCollisions
                                    className="z-10010 min-w-42 rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl">
                                    <SelectItem value="0" className={priorityItemClassName}>
                                        Minor
                                    </SelectItem>
                                    <SelectItem value="1" className={priorityItemClassName}>
                                        Moderate
                                    </SelectItem>
                                    <SelectItem value="2" className={priorityItemClassName}>
                                        Major
                                    </SelectItem>
                                    <SelectItem value="3" className={priorityItemClassName}>
                                        Critical
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="mt-6">
                        <div className="font-semibold text-sm text-zinc-600">Description</div>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="(No description)"
                            className="mt-2 min-h-30 w-full rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800 outline-none"
                        />
                    </div>

                    <div className="mt-6 border-zinc-200 border-t pt-5">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-zinc-700" />
                            <div className="font-extrabold text-2xl text-zinc-900">Comments</div>
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-bold text-xs text-zinc-600">
                                {loadingComments ? "…" : comments.length}
                            </span>
                        </div>

                        {commentError ? (
                            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 font-semibold text-rose-700 text-sm">
                                {commentError}
                            </div>
                        ) : null}

                        <div className="mt-4 space-y-4">
                            {loadingComments ? (
                                <div className="text-sm text-zinc-600">(Đang tải comments…)</div>
                            ) : comments.length === 0 ? (
                                <div className="text-sm text-zinc-500">(Chưa có comment)</div>
                            ) : (
                                comments.map((c) => {
                                    const u = c.user;
                                    const name =
                                        `${(u?.firstName ?? "").trim()} ${(u?.lastName ?? "").trim()}`.trim() || "User";
                                    const when = c.createdAt ? relativeTimeOf(c.createdAt) : "";
                                    return (
                                        <div
                                            key={c.commentId ?? `${c.userId ?? "u"}-${c.createdAt ?? "t"}`}
                                            className="flex items-start gap-3">
                                            {safeAvatarUrl(u?.avatarUrl) ? (
                                                <Image
                                                    src={safeAvatarUrl(u?.avatarUrl)}
                                                    alt={name}
                                                    width={36}
                                                    height={36}
                                                    unoptimized
                                                    className="h-9 w-9 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="grid h-9 w-9 place-items-center rounded-full bg-indigo-500 font-extrabold text-white text-xs">
                                                    {initials(u)}
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-baseline gap-4">
                                                    <div className="font-bold text-zinc-900">{name}</div>
                                                    <div className="text-sm text-zinc-400">{when}</div>
                                                </div>
                                                <div className="mt-1 whitespace-pre-wrap text-base text-zinc-800">
                                                    {c.content ?? ""}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="mt-5 flex items-center gap-3">
                            {myAvatarUrl ? (
                                <Image
                                    src={myAvatarUrl}
                                    alt="Me"
                                    width={36}
                                    height={36}
                                    unoptimized
                                    className="h-9 w-9 rounded-full object-cover"
                                />
                            ) : (
                                <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500 font-bold text-sm text-white">
                                    D
                                </div>
                            )}

                            <div className="flex-1 rounded-xl border border-zinc-200 px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        value={commentDraft}
                                        onChange={(e) => setCommentDraft(e.target.value)}
                                        placeholder="Write a comment..."
                                        className="w-full bg-transparent text-sm outline-none"
                                    />
                                    <button
                                        type="button"
                                        className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100"
                                        aria-label="Attach">
                                        <Paperclip className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSendComment}
                                        className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-60"
                                        aria-label="Send"
                                        disabled={!commentDraft.trim()}>
                                        <SendHorizontal className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-zinc-200 border-t bg-zinc-50 px-7 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-11 rounded-xl border border-zinc-300 bg-white px-8 font-semibold text-sm text-zinc-700 hover:bg-zinc-100">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            void handleSave();
                        }}
                        disabled={saving}
                        className="h-11 rounded-xl bg-zinc-900 px-8 font-semibold text-sm text-white hover:bg-zinc-800 disabled:opacity-60">
                        {saving ? "Saving..." : "Save change"}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
