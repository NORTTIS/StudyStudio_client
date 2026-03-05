"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X, Paperclip, SendHorizontal, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";

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
    groupStatus?: { groupId?: string; position?: number; statusName?: string | null } | null;
};

type TaskStatusDto = {
    position?: number;
    statusId?: string;
    statusName?: string | null;
    taskList?: TaskItemResponse[] | null;
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
    assigneeName?: string | null;
    statusName?: string | null;
    priorityLabel?: string | null;
    startDateFmt?: string | null;
    dueDateFmt?: string | null;
    raw?: any;
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
    if (!text) return { json: null as any, text: "" };
    try {
        const cleaned = text.replace(/^\uFEFF/, "");
        return { json: JSON.parse(cleaned), text };
    } catch {
        return { json: null as any, text };
    }
}

const okByJsonStatus = (obj: any) => {
    const s = String(obj?.status ?? "").toLowerCase();
    return s === "" || s === "success" || s === "ok" || s === "true";
};

const extractApiMessage = (text: string, json: any) => {
    const msg = (json?.message ?? "").toString().trim();
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
    // Treat 0 / undefined as "no priority"
    if (!n || n === 0) return null;
    if (n === 1) return "Low";
    if (n === 2) return "Medium";
    if (n === 3) return "High";
    if (n === 4) return "Critical";
    if (typeof n === "number") return String(n);
    return null;
}

function getGroupIdFromParams(params: Record<string, any>) {
    const direct =
        (typeof params?.groupId === "string" && params.groupId) ||
        (typeof params?.id === "string" && params.id) ||
        (typeof params?.slug === "string" && params.slug) ||
        null;
    if (direct) return direct;
    const firstKey = Object.keys(params ?? {}).find((k) => typeof params?.[k] === "string");
    const v = firstKey ? params[firstKey] : null;
    return typeof v === "string" ? v : null;
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
        if (found) return { task: found, statusName: st?.statusName ?? null };
    }
    return null;
}

function mapTaskDetailFromTaskItem(task: TaskItemResponse, taskId: string, fallbackStatusName?: string | null): TaskDetail {
    const title = String(task?.taskTitle ?? "").trim() || "Task";
    const description = task?.taskDescription ?? null;
    const assigneeName = fullName(task?.assignee) ?? null;

    const statusFromTask = String(task?.groupStatus?.statusName ?? "").trim();
    const statusFromColumn = String(fallbackStatusName ?? "").trim();
    const statusName = statusFromTask || statusFromColumn || null;

    const priorityLabel = priorityLabelOf(task?.taskPriority);

    const startDateRaw = task?.startDate ?? null;
    const dueDateRaw = task?.dueDate ?? null;

    const startFmt = startDateRaw ? formatDisplayDate(String(startDateRaw)) : "";
    const dueFmt = dueDateRaw ? formatDisplayDate(String(dueDateRaw)) : "";

    return {
        id: String(task?.taskId ?? taskId),
        title,
        description: description != null ? String(description) : null,
        assigneeName,
        statusName,
        priorityLabel: priorityLabel != null ? String(priorityLabel) : null,
        startDateFmt: startFmt,
        dueDateFmt: dueFmt,
        raw: task
    };
}

async function apiGetTaskDetailFromGroup(groupId: string, taskId: string) {
    const resp = await apiGetGroupDetail(groupId);
    const group = resp?.data ?? null;
    const hit = findTaskInGroupDetail(group, taskId);
    if (!hit) throw new Error("Không tìm thấy task trong group");
    return mapTaskDetailFromTaskItem(hit.task, taskId, hit.statusName);
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

export default function TaskDetailModal(props: {
    open: boolean;
    onClose: () => void;
    taskId: string | null;
    onDelete?: (taskId: string) => void;
}) {
    const { open, onClose, taskId, onDelete } = props;
    const params = useParams() as any;
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
        if (!open || !taskId) return;

        let alive = true;

        (async () => {
            setLoadingDetail(true);
            setDetailError(null);
            try {
                if (!groupId) throw new Error("Thiếu groupId từ route");
                const mapped = await apiGetTaskDetailFromGroup(groupId, taskId);
                if (!alive) return;
                setTask(mapped);
            } catch (e: any) {
                if (!alive) return;
                setDetailError(e?.message ?? "Không tải được task detail");
                setTask(null);
            } finally {
                if (alive) setLoadingDetail(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [open, taskId, groupId]);

    React.useEffect(() => {
        if (!open || !taskId) return;

        let alive = true;

        (async () => {
            setLoadingComments(true);
            setCommentError(null);
            try {
                const resp = await apiGetTaskComments(taskId);
                const list = (resp?.data?.comments ?? []) as TaskCommentDto[];
                if (!alive) return;
                setComments((list ?? []).filter((c) => !c?.isDeleted));
            } catch (e: any) {
                if (!alive) return;
                setCommentError(e?.message ?? "Không tải được comments");
                setComments([]);
            } finally {
                if (alive) setLoadingComments(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [open, taskId]);

    if (!open || !mounted) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            onPointerDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className={cn("w-full max-w-3xl rounded-2xl bg-white shadow-2xl", "border border-zinc-200 overflow-hidden")}
                onPointerDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            {task?.statusName ?? "—"}
                        </span>
                        <h2 className="min-w-0 truncate text-xl font-extrabold text-zinc-900">
                            {loadingDetail ? "Loading…" : task?.title ?? "Task"}
                        </h2>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            className="text-sm font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-60"
                            disabled={!taskId}
                            onClick={() => taskId && onDelete?.(taskId)}
                        >
                            Delete Task
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="px-6 py-5">
                    {detailError ? (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                            {detailError}
                        </div>
                    ) : null}

                    {loadingDetail ? (
                        <div className="mt-4 flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Đang tải…
                        </div>
                    ) : null}

                    <div className="grid grid-cols-3 gap-6 mt-4">
                        <div>
                            <div className="text-xs font-semibold text-zinc-500">Assignee</div>
                            <div className="mt-2 flex items-center gap-3">
                                <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-emerald-700 font-extrabold">
                                    {task?.assigneeName ? task.assigneeName.trim().slice(0, 1).toUpperCase() : "—"}
                                </div>
                                <div className="text-sm font-semibold text-zinc-900">{task?.assigneeName ?? "Chưa gán"}</div>
                            </div>
                        </div>

                        <div>
                            <div className="text-xs font-semibold text-zinc-500">Status</div>
                            <div className="mt-2 text-base font-semibold text-zinc-900">{task?.statusName ?? "—"}</div>
                        </div>

                        <div>
                            <div className="text-xs font-semibold text-zinc-500">Priority</div>
                            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-sm font-bold text-rose-700">
                                <span className="h-2 w-2 rounded-full bg-rose-500" />
                                {task?.priorityLabel ?? "—"}
                            </div>
                        </div>

                        <div>
                            <div className="text-xs font-semibold text-zinc-500">Start Date</div>
                            <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-zinc-900">
                                <span className="inline-block h-5 w-5 rounded bg-zinc-100" />
                                {task?.startDateFmt ?? ""}
                            </div>
                        </div>

                        <div>
                            <div className="text-xs font-semibold text-zinc-500">Due Date</div>
                            <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-zinc-900">
                                <span className="inline-block h-5 w-5 rounded bg-zinc-100" />
                                {task?.dueDateFmt ?? ""}
                            </div>
                        </div>

                        <div />
                    </div>

                    <div className="mt-6">
                        <div className="text-xs font-semibold text-zinc-500">Description</div>
                        <div className="mt-2 rounded-2xl border border-zinc-200 bg-white p-4 min-h-[110px] text-sm text-zinc-800">
                            {task?.description?.trim() ? task.description : <span className="text-zinc-400">(No description)</span>}
                        </div>
                    </div>

                    <div className="mt-6 border-t border-zinc-200 pt-5">
                        <div className="flex items-center gap-2">
                            <div className="text-sm font-extrabold text-zinc-900">Comments</div>
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-bold text-zinc-700">
                                {loadingComments ? "…" : comments.length}
                            </span>
                        </div>

                        {commentError ? (
                            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
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
                                    const name = `${(u?.firstName ?? "").trim()} ${(u?.lastName ?? "").trim()}`.trim() || "User";
                                    const when = c.createdAt ? formatDisplayDate(c.createdAt) : "";
                                    return (
                                        <div key={c.commentId ?? `${c.userId ?? "u"}-${c.createdAt ?? "t"}`} className="flex items-start gap-3">
                                            <div className="grid h-10 w-10 place-items-center rounded-full bg-indigo-100 text-indigo-700 font-extrabold">
                                                {initials(u)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-baseline gap-3">
                                                    <div className="font-extrabold text-zinc-900">{name}</div>
                                                    <div className="text-xs text-zinc-500">{when}</div>
                                                </div>
                                                <div className="mt-1 text-sm text-zinc-800 whitespace-pre-wrap">{c.content ?? ""}</div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="mt-5 flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-emerald-700 font-extrabold">
                                M
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2">
                                    <input
                                        value={commentDraft}
                                        onChange={(e) => setCommentDraft(e.target.value)}
                                        placeholder="Write a comment..."
                                        className="w-full bg-transparent outline-none text-sm"
                                    />
                                    <button
                                        type="button"
                                        className="grid h-9 w-9 place-items-center rounded-xl text-zinc-600 hover:bg-zinc-100"
                                        aria-label="Attach"
                                    >
                                        <Paperclip className="h-5 w-5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSendComment}
                                        className="grid h-9 w-9 place-items-center rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-60"
                                        aria-label="Send"
                                        disabled={!commentDraft.trim()}
                                    >
                                        <SendHorizontal className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
                            >
                                Edit
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}