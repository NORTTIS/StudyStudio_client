"use client";

import {
    type CollisionDetection,
    closestCenter,
    closestCorners,
    DndContext,
    type DragCancelEvent,
    type DragEndEvent,
    type DragOverEvent,
    DragOverlay,
    type DragStartEvent,
    type DroppableContainer,
    KeyboardSensor,
    PointerSensor,
    useDroppable,
    useSensor,
    useSensors
} from "@dnd-kit/core";
import {
    arrayMove,
    horizontalListSortingStrategy,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircle2, Clock3, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { createPortal } from "react-dom";
import { Container } from "@/components/common";
import TaskDetailModal from "@/components/features/group/task/TaskDetailModal";
import TaskFormModal, { type TaskFormOption, type TaskFormValues } from "@/components/features/group/task/TaskForm";

type ColumnId = string;

type Task = {
    id: string;
    title: string;
    statusDot?: "green" | "yellow" | "red";
    tagLeft?: string;
    tagRight?: string;
    due?: string;
    dueRaw?: string;
    start?: string;
    startRaw?: string;
    description?: string | null;
    assigneeName?: string | null;
    statusName?: string | null;
    priorityLabel?: string | null;
    severityLabel?: string | null;
    progress?: number;
};

type Column = {
    id: ColumnId;
    title: string;
    position: number;
};

type ApiResponse<T> = { status?: string; code?: string; message?: string; data?: T };

type TaskItemResponse = {
    taskId?: string;
    taskTitle?: string | null;
    dueDate?: string;
    startDate?: string;
    assignee?: {
        firstName?: string | null;
        lastName?: string | null;
        email?: string | null;
        avatarUrl?: string | null;
    } | null;
    position?: number;
    taskPriority?: number;
    taskSeverity?: number;
    progress?: number;
};

type TaskStatusDto = {
    position?: number;
    statusId?: string;
    statusName?: string | null;
    taskList?: TaskItemResponse[] | null;
};

type GroupDetailResponse = {
    groupId?: string;
    taskStatuses?: TaskStatusDto[] | null;
};

type GroupTaskStatusData = {
    groupId?: string;
    statusId?: string;
    statusName?: string | null;
    position?: number;
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

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function dotClass(statusDot?: Task["statusDot"]) {
    if (statusDot === "green") return "bg-emerald-500";
    if (statusDot === "yellow") return "bg-amber-500";
    if (statusDot === "red") return "bg-rose-500";
    return "bg-emerald-500";
}

function priorityToStatusDot(priority?: number): Task["statusDot"] {
    if (priority === 2) return "red";
    if (priority === 1) return "yellow";
    return "green";
}

function priorityLabelOf(priority?: number) {
    if (priority === 2) return "High";
    if (priority === 1) return "Medium";
    return "Low";
}

function severityLabelOf(severity?: number) {
    if (severity === 3) return "Critical";
    if (severity === 2) return "Major";
    if (severity === 1) return "Moderate";
    return "Minor";
}

function severityTone(label?: string | null) {
    const v = String(label ?? "").toLowerCase();
    if (v === "critical") return "border-rose-200 bg-rose-50 text-rose-700";
    if (v === "major") return "border-orange-200 bg-orange-50 text-orange-700";
    if (v === "moderate") return "border-amber-200 bg-amber-50 text-amber-700";
    return "border-sky-200 bg-sky-50 text-sky-700";
}

function isUuidLike(v: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function detectPositionBase(cols: Column[]) {
    if (!cols.length) return 0;
    const positions = cols.map((c) => (Number.isFinite(c.position) ? c.position : 0)).filter((x) => Number.isFinite(x));
    const min = positions.length ? Math.min(...positions) : 0;
    return min >= 1 ? 1 : 0;
}

function assignPositions(cols: Column[], base: 0 | 1) {
    return cols.map((c, idx) => ({ ...c, position: base === 1 ? idx + 1 : idx }));
}

function nextPositionForCreate(cols: Column[], base: 0 | 1) {
    if (!cols.length) return base === 1 ? 1 : 0;
    const max = cols.reduce((m, c) => {
        const p = Number.isFinite(c.position) ? c.position : -1;
        return Math.max(m, p);
    }, -1);
    const next = max + 1;
    return base === 1 ? Math.max(1, next) : Math.max(0, next);
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

function getApiBase() {
    const raw = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    return String(raw).replace(/\/+$/, "");
}

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

async function apiFetchJson<T>(input: RequestInfo, init: RequestInit): Promise<ApiResponse<T> | null> {
    const res = await fetch(input, init);
    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);

    if (!res.ok || (json && !okByJsonStatus(json))) {
        throw new Error(extractApiMessage(raw, json));
    }

    return (json ?? null) as ApiResponse<T> | null;
}

function formatDueCompact(input: string) {
    const s = String(input ?? "").trim();
    if (!s) return "";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;

    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = String(d.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
}

function formatAssigneeName(
    input?: {
        firstName?: string | null;
        lastName?: string | null;
        email?: string | null;
    } | null
) {
    const first = String(input?.firstName ?? "").trim();
    const last = String(input?.lastName ?? "").trim();
    const fullName = `${first} ${last}`.trim();
    if (fullName) return fullName;
    const email = String(input?.email ?? "").trim();
    return email || null;
}

function isOverdue(raw?: string) {
    if (!raw) return false;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return false;
    return d.getTime() < Date.now();
}

function isTaskDone(task?: Pick<Task, "progress"> | null) {
    return Number(task?.progress ?? 0) >= 100;
}

async function apiGetGroupDetail(groupId: string) {
    const apiBase = getApiBase();
    const accessToken = getAccessTokenOrNull();
    if (!apiBase) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");
    const url = apiUrl(`/group/${encodeURIComponent(groupId)}/detail`);

    return apiFetchJson<GroupDetailResponse>(url, {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        cache: "no-store"
    });
}

async function apiGetGroupMembers(groupId: string) {
    const apiBase = getApiBase();
    const accessToken = getAccessTokenOrNull();
    if (!apiBase) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");
    const url = apiUrl(`/group/${encodeURIComponent(groupId)}/members`);

    return apiFetchJson<GroupMemberListResponse>(url, {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        cache: "no-store"
    });
}

async function apiReorderGroupTaskStatus(args: {
    groupId: string;
    statusId: string;
    prevStatusId: string | null;
    nextStatusId: string | null;
}) {
    const apiBase = getApiBase();
    const accessToken = getAccessTokenOrNull();

    if (!apiBase) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");
    if (!(args.groupId && isUuidLike(args.groupId))) throw new Error("groupId không hợp lệ (không phải UUID).");

    const url = apiUrl(`/GroupTaskStatus/${encodeURIComponent(args.groupId)}/reorder`);

    await apiFetchJson<unknown>(url, {
        method: "PUT",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
            statusId: args.statusId,
            prevStatusId: args.prevStatusId,
            nextStatusId: args.nextStatusId
        })
    });

    return true;
}

async function apiReorderTask(args: {
    groupId: string;
    taskId: string;
    targetStatusId: string;
    prevTaskId: string | null;
    nextTaskId: string | null;
}) {
    const apiBase = getApiBase();
    const accessToken = getAccessTokenOrNull();

    if (!apiBase) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");
    if (!(args.groupId && isUuidLike(args.groupId))) throw new Error("groupId không hợp lệ (UUID).");
    if (!(args.taskId && isUuidLike(args.taskId))) throw new Error("taskId không hợp lệ (UUID).");
    if (!(args.targetStatusId && isUuidLike(args.targetStatusId))) {
        throw new Error("targetStatusId không hợp lệ (UUID).");
    }

    const url = apiUrl(`/Task/${encodeURIComponent(args.groupId)}/reorder`);

    const res = await fetch(url, {
        method: "PUT",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
            taskId: args.taskId,
            targetStatusId: args.targetStatusId,
            prevTaskId: args.prevTaskId,
            nextTaskId: args.nextTaskId
        })
    });

    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);
    const okJson = !json || okByJsonStatus(json);

    if (!(res.ok && okJson)) throw new Error(extractApiMessage(raw, json));
    return true;
}

async function apiCreateGroupTaskStatus(args: { groupId: string; statusName: string; position: number }) {
    const apiBase = getApiBase();
    const accessToken = getAccessTokenOrNull();
    if (!apiBase) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");
    if (!(args.groupId && isUuidLike(args.groupId))) throw new Error("groupId không hợp lệ (không phải UUID).");

    const url = apiUrl(`/GroupTaskStatus/${encodeURIComponent(args.groupId)}`);
    const payload = {
        statusName: String(args.statusName ?? "").trim(),
        position: Number.isFinite(args.position) ? Math.max(0, Math.trunc(args.position)) : 0
    };

    if (!payload.statusName) throw new Error("Vui lòng nhập tên trạng thái.");

    const res = await apiFetchJson<GroupTaskStatusData>(url, {
        method: "POST",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify(payload)
    });

    return (res ?? null) as ApiResponse<GroupTaskStatusData> | null;
}

function toIsoOrNull(input: unknown): string | null {
    if (input == null) return null;

    if (typeof input === "string") {
        const s = input.trim();
        if (!s) return null;
        if (s.toLowerCase() === "invalid date") return null;

        const d = new Date(s);
        if (Number.isNaN(d.getTime())) return null;

        return d.toISOString();
    }

    if (input instanceof Date) {
        if (Number.isNaN(input.getTime())) return null;
        return input.toISOString();
    }

    return null;
}

async function apiCreateTask(args: {
    groupId: string;
    groupStatusId: string;
    taskName: string;
    assigneeId?: string | null;
    dueDate?: unknown;
    startDate?: unknown;
    dueDateSelected?: boolean;
    startDateSelected?: boolean;
}) {
    const apiBase = getApiBase();
    const accessToken = getAccessTokenOrNull();

    if (!apiBase) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");
    if (!(args.groupId && isUuidLike(args.groupId))) throw new Error("groupId không hợp lệ (không phải UUID).");
    if (!(args.groupStatusId && isUuidLike(args.groupStatusId))) {
        throw new Error("groupStatusId không hợp lệ (không phải UUID).");
    }

    const url = apiUrl("/Task");

    const payload: any = {
        groupId: args.groupId,
        groupStatusId: args.groupStatusId,
        taskName: String(args.taskName ?? "").trim()
    };

    if (args.assigneeId && isUuidLike(args.assigneeId)) payload.assignees = args.assigneeId;

    const dueIso = toIsoOrNull(args.dueDate);
    const startIso = toIsoOrNull(args.startDate);

    if (args.startDateSelected === true && startIso) payload.startDate = startIso;
    if (args.dueDateSelected === true && dueIso) payload.dueDate = dueIso;

    return apiFetchJson<TaskItemResponse>(url, {
        method: "POST",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify(payload)
    });
}

async function apiDeleteTask(args: { groupId: string; taskId: string }) {
    const apiBase = getApiBase();
    const token = getAccessTokenOrNull();

    if (!apiBase) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");
    if (!(args.groupId && isUuidLike(args.groupId))) throw new Error("groupId không hợp lệ (không phải UUID).");
    if (!(args.taskId && isUuidLike(args.taskId))) throw new Error("taskId không hợp lệ (không phải UUID).");

    const url = apiUrl(`/Task/${encodeURIComponent(args.groupId)}/${encodeURIComponent(args.taskId)}`);

    await apiFetchJson<unknown>(url, {
        method: "DELETE",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
    });

    return true;
}

async function apiRenameGroupTaskStatus(args: {
    groupId: string;
    statusId: string;
    statusName: string;
    position: number;
}) {
    const apiBase = getApiBase();
    const token = getAccessTokenOrNull();
    if (!apiBase) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");
    if (!(args.groupId && isUuidLike(args.groupId))) throw new Error("groupId không hợp lệ (không phải UUID).");
    if (!(args.statusId && isUuidLike(args.statusId))) throw new Error("statusId không hợp lệ (không phải UUID).");

    const url = apiUrl(`/GroupTaskStatus/${encodeURIComponent(args.groupId)}/${encodeURIComponent(args.statusId)}`);

    await apiFetchJson<unknown>(url, {
        method: "PUT",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
            position: Number.isFinite(args.position) ? Math.max(0, Math.trunc(args.position)) : 0,
            statusName: String(args.statusName ?? "").trim()
        })
    });

    return true;
}

async function apiDeleteGroupTaskStatus(args: { groupId: string; statusId: string }) {
    const apiBase = getApiBase();
    const token = getAccessTokenOrNull();
    if (!apiBase) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");
    if (!(args.groupId && isUuidLike(args.groupId))) throw new Error("groupId không hợp lệ (không phải UUID).");
    if (!(args.statusId && isUuidLike(args.statusId))) throw new Error("statusId không hợp lệ (không phải UUID).");

    const url = apiUrl(`/GroupTaskStatus/${encodeURIComponent(args.statusId)}/group/${encodeURIComponent(args.groupId)}`);

    await apiFetchJson<unknown>(url, {
        method: "DELETE",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
    });

    return true;
}

const DROP_PREFIX = "drop:";
const END_PREFIX = "drop-end:";

function findColumnOfTask(board: Record<ColumnId, Task[]>, columns: Column[], taskId: string): ColumnId | null {
    for (const col of columns) {
        if ((board[col.id] ?? []).some((t) => t.id === taskId)) return col.id;
    }
    return null;
}

function findTask(board: Record<ColumnId, Task[]>, columns: Column[], taskId: string): Task | null {
    for (const col of columns) {
        const t = (board[col.id] ?? []).find((x) => x.id === taskId);
        if (t) return t;
    }
    return null;
}

function applyTaskDrop(args: {
    board: Record<ColumnId, Task[]>;
    columns: Column[];
    activeTaskId: string;
    overRaw: string;
}) {
    const { board, columns, activeTaskId, overRaw } = args;

    const overIsEnd = overRaw.startsWith(END_PREFIX);
    const overKey = overRaw.startsWith(DROP_PREFIX)
        ? overRaw.replace(DROP_PREFIX, "")
        : overRaw.startsWith(END_PREFIX)
            ? overRaw.replace(END_PREFIX, "")
            : overRaw;

    const fromCol = findColumnOfTask(board, columns, activeTaskId);
    if (!fromCol) return null;

    let toCol: ColumnId | null = null;
    if (columns.some((c) => c.id === overKey)) toCol = overKey;
    else toCol = findColumnOfTask(board, columns, overKey) ?? null;
    if (!toCol) return null;

    const fromTasks = [...(board[fromCol] ?? [])];
    const toTasks = fromCol === toCol ? fromTasks : [...(board[toCol] ?? [])];

    const fromIndex = fromTasks.findIndex((t) => t.id === activeTaskId);
    if (fromIndex === -1) return null;

    const [moving] = fromTasks.splice(fromIndex, 1);

    if (fromCol === toCol) {
        if (overIsEnd) {
            fromTasks.push(moving);
        } else {
            const toIndex = fromTasks.findIndex((t) => t.id === overKey);
            if (toIndex === -1) fromTasks.unshift(moving);
            else fromTasks.splice(Math.max(0, toIndex), 0, moving);
        }

        const newIndex = fromTasks.findIndex((t) => t.id === activeTaskId);
        const prevTaskId = newIndex > 0 ? fromTasks[newIndex - 1].id : null;
        const nextTaskId = newIndex >= 0 && newIndex < fromTasks.length - 1 ? fromTasks[newIndex + 1].id : null;

        return { nextBoard: { ...board, [fromCol]: fromTasks }, fromCol, toCol, prevTaskId, nextTaskId };
    }

    if (overIsEnd) {
        toTasks.push(moving);
    } else {
        const idx = toTasks.findIndex((t) => t.id === overKey);
        if (idx !== -1) toTasks.splice(Math.max(0, idx), 0, moving);
        else toTasks.unshift(moving);
    }

    const newIndex = toTasks.findIndex((t) => t.id === activeTaskId);
    const prevTaskId = newIndex > 0 ? toTasks[newIndex - 1].id : null;
    const nextTaskId = newIndex >= 0 && newIndex < toTasks.length - 1 ? toTasks[newIndex + 1].id : null;

    return { nextBoard: { ...board, [fromCol]: fromTasks, [toCol]: toTasks }, fromCol, toCol, prevTaskId, nextTaskId };
}

function Pill({ children }: { children: React.ReactNode }) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5",
                "border border-zinc-200 bg-white",
                "font-semibold text-[10.5px] text-zinc-700"
            )}
        >
            {children}
        </span>
    );
}

function DonePill() {
    return (
        <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Done
        </span>
    );
}

function shouldShowProgress(task?: Pick<Task, "progress"> | null) {
    const p = Number(task?.progress ?? 0);
    return p > 0 && p < 100;
}

function ProgressPill({ progress }: { progress: number }) {
    return (
        <span className="inline-flex items-center rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">
            {progress}%
        </span>
    );
}

function DuePill({ due, overdue, done }: { due: string; overdue: boolean; done?: boolean }) {
    return (
        <div
            className={cn(
                "inline-flex min-w-0 max-w-full items-center gap-2 rounded-xl border px-3 py-2",
                done
                    ? "border-zinc-200 bg-zinc-100 text-zinc-500"
                    : overdue
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-zinc-200 bg-zinc-50 text-zinc-700"
            )}
        >
            <Clock3 className="h-4 w-4 shrink-0" />
            <div className="flex min-w-0 items-center gap-2">
                <div className="whitespace-nowrap text-xs font-semibold">{due}</div>
                {!done && overdue ? (
                    <span className="whitespace-nowrap rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                        Quá hạn
                    </span>
                ) : null}
            </div>
        </div>
    );
}

type ConfirmModalProps = {
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
};

function ConfirmModal({
    open,
    title,
    description,
    confirmLabel = "Xác nhận",
    cancelLabel = "Hủy",
    onConfirm,
    onCancel
}: ConfirmModalProps) {
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);

    React.useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onCancel();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onCancel]);

    if (!(open && mounted)) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            onPointerDown={(e) => {
                if (e.target === e.currentTarget) onCancel();
            }}
        >
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onPointerDown={(e) => e.stopPropagation()}>
                <h2 className="text-base font-bold text-zinc-900">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{description}</p>
                <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

function PortalDropdown({
    open,
    onClose,
    anchorRef,
    children
}: {
    open: boolean;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLElement>;
    children: React.ReactNode;
}) {
    const menuRef = React.useRef<HTMLDivElement | null>(null);
    const [mounted, setMounted] = React.useState(false);
    const [pos, setPos] = React.useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 208 });

    React.useEffect(() => setMounted(true), []);

    const syncPos = React.useCallback(() => {
        const a = anchorRef.current;
        if (!a) return;
        const r = a.getBoundingClientRect();
        const width = 208;
        const top = r.bottom + 8;
        const left = Math.max(8, r.right - width);
        setPos({ top, left, width });
    }, [anchorRef]);

    React.useEffect(() => {
        if (!open) return;
        syncPos();
        const onScroll = () => syncPos();
        const onResize = () => syncPos();
        window.addEventListener("scroll", onScroll, true);
        window.addEventListener("resize", onResize);
        return () => {
            window.removeEventListener("scroll", onScroll, true);
            window.removeEventListener("resize", onResize);
        };
    }, [open, syncPos]);

    React.useEffect(() => {
        if (!open) return;

        const onPointerDown = (e: PointerEvent) => {
            const a = anchorRef.current;
            const m = menuRef.current;
            const t = e.target as Node | null;
            if (!t) return;
            if (m && m.contains(t)) return;
            if (a && a.contains(t)) return;
            onClose();
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        window.addEventListener("pointerdown", onPointerDown, true);
        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("pointerdown", onPointerDown, true);
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [open, onClose, anchorRef]);

    if (!(open && mounted)) return null;

    return createPortal(
        <div
            ref={menuRef}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
            className="z-[9999] rounded-xl border border-zinc-200 bg-white p-1 shadow-lg"
        >
            {children}
        </div>,
        document.body
    );
}

function MenuItem({
    icon,
    label,
    danger,
    onClick
}: {
    icon: React.ReactNode;
    label: string;
    danger?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm",
                danger ? "text-orange-700 hover:bg-orange-50" : "text-zinc-700 hover:bg-zinc-100"
            )}
        >
            <span className="grid h-5 w-5 place-items-center">{icon}</span>
            <span className="font-medium">{label}</span>
        </button>
    );
}

function useAutosizeTextarea(ref: React.RefObject<HTMLTextAreaElement | null>, value: string) {
    React.useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.style.height = "0px";
        el.style.height = `${el.scrollHeight}px`;
    }, [ref, value]);
}

type TaskCardProps = {
    task: Task;
    columnId: ColumnId;
    isEditing: boolean;
    draftTitle: string;
    onDraftChange: (v: string) => void;
    onOpenDetail: () => void;
    onStartEdit: () => void;
    onCancelEdit: () => void;
    onCommitEdit: () => void;
    onDelete: () => void;
};

function TaskCard({
    task,
    columnId,
    isEditing,
    draftTitle,
    onDraftChange,
    onOpenDetail,
    onStartEdit,
    onCancelEdit,
    onCommitEdit,
    onDelete
}: TaskCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: task.id,
        data: { type: "task", columnId }
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
        touchAction: "none"
    };

    const [openMenu, setOpenMenu] = React.useState(false);
    const btnRef = React.useRef<HTMLButtonElement | null>(null);

    const taRef = React.useRef<HTMLTextAreaElement | null>(null);
    useAutosizeTextarea(taRef, draftTitle);

    const clickingActionRef = React.useRef(false);
    const done = isTaskDone(task);
    const showProgress = shouldShowProgress(task);

    React.useEffect(() => {
        if (isEditing) {
            setTimeout(() => {
                taRef.current?.focus();
                taRef.current?.setSelectionRange(draftTitle.length, draftTitle.length);
            }, 0);
        }
    }, [isEditing, draftTitle.length]);

    const safeCommit = React.useCallback(() => {
        if (!draftTitle.trim()) {
            onCancelEdit();
            return;
        }
        onCommitEdit();
    }, [draftTitle, onCommitEdit, onCancelEdit]);

    const overdue = task.dueRaw ? isOverdue(task.dueRaw) : false;

    const handleOpenDetail = React.useCallback(() => {
        if (isEditing) return;
        onOpenDetail();
    }, [isEditing, onOpenDetail]);

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={(e) => {
                if (isEditing) return;
                e.preventDefault();
                handleOpenDetail();
            }}
            onKeyDown={(e) => {
                if (isEditing) return;
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleOpenDetail();
                }
            }}
            className={cn(
                "group relative w-full select-none rounded-xl p-3",
                "cursor-grab border border-black/5 shadow-[0_1px_1px_rgba(9,30,66,0.08),0_0_0_1px_rgba(9,30,66,0.04)]",
                "transition focus-within:ring-2 focus-within:ring-blue-200/60 active:cursor-grabbing",
                done
                    ? "bg-zinc-50 hover:bg-zinc-100/90 hover:shadow-[0_2px_6px_rgba(9,30,66,0.10),0_0_0_1px_rgba(9,30,66,0.04)]"
                    : "bg-white hover:bg-white hover:shadow-[0_4px_8px_rgba(9,30,66,0.16),0_0_0_1px_rgba(9,30,66,0.04)]"
            )}
        >
            <div className="flex items-start gap-3">
                <div className="pt-1">
                    <div className={cn("h-2.5 w-2.5 rounded-full", dotClass(task.statusDot))} />
                </div>

                <div className="min-w-0 flex-1">
                    {!isEditing ? (
                        <>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <p
                                        className={cn(
                                            "line-clamp-3 pr-2 text-sm font-semibold leading-5",
                                            done ? "text-zinc-500 line-through" : "text-zinc-900"
                                        )}
                                    >
                                        {task.title}
                                    </p>
                                </div>

                                <div
                                    className="relative shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                    onPointerDown={(e) => e.stopPropagation()}
                                >
                                    <button
                                        ref={btnRef}
                                        type="button"
                                        onPointerDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setOpenMenu((v) => !v);
                                        }}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                        }}
                                        className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100"
                                        aria-label="Menu"
                                    >
                                        <MoreHorizontal className="h-4 w-4" />
                                    </button>

                                    <PortalDropdown open={openMenu} onClose={() => setOpenMenu(false)} anchorRef={btnRef as any}>
                                        <MenuItem
                                            icon={<Pencil className="h-4 w-4" />}
                                            label="Chỉnh sửa tên"
                                            onClick={() => {
                                                setOpenMenu(false);
                                                onStartEdit();
                                            }}
                                        />
                                        <MenuItem
                                            icon={<Trash2 className="h-4 w-4" />}
                                            label="Xóa"
                                            danger
                                            onClick={() => {
                                                setOpenMenu(false);
                                                onDelete();
                                            }}
                                        />
                                    </PortalDropdown>
                                </div>
                            </div>

                            <p className={cn("mt-2 truncate text-xs", done ? "text-zinc-400" : "text-zinc-500")}>
                                Người thực hiện: {task.assigneeName || "Chưa gán"}
                            </p>
                        </>
                    ) : (
                        <div
                            className="space-y-2"
                            onPointerDownCapture={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <textarea
                                ref={taRef}
                                value={draftTitle}
                                onChange={(e) => onDraftChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        safeCommit();
                                    }
                                    if (e.key === "Escape") {
                                        e.preventDefault();
                                        onCancelEdit();
                                    }
                                }}
                                onBlur={() => {
                                    setTimeout(() => {
                                        if (clickingActionRef.current) {
                                            clickingActionRef.current = false;
                                            return;
                                        }
                                        safeCommit();
                                    }, 0);
                                }}
                                rows={1}
                                className={cn(
                                    "w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2",
                                    "select-text text-sm font-semibold text-zinc-900 outline-none",
                                    "focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                                )}
                            />

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onPointerDown={() => (clickingActionRef.current = true)}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        safeCommit();
                                    }}
                                    className="rounded-lg bg-[#f54a00] px-3 py-2 text-sm font-semibold text-white hover:bg-[#f54a00]/70"
                                >
                                    Lưu
                                </button>

                                <button
                                    type="button"
                                    onPointerDown={() => (clickingActionRef.current = true)}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onCancelEdit();
                                    }}
                                    className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                                    aria-label="Hủy"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {task.due || task.severityLabel || done || showProgress ? (
                        <div className="mt-3 space-y-2">
                            {task.due ? <DuePill due={task.due} overdue={overdue} done={done} /> : null}

                            {task.severityLabel || done || showProgress ? (
                                <div className="flex flex-wrap items-center gap-2">
                                    {task.severityLabel ? (
                                        <span
                                            className={cn(
                                                "inline-flex shrink-0 items-center rounded-xl border px-3 py-2 text-xs font-semibold",
                                                done ? "border-zinc-200 bg-zinc-100 text-zinc-500" : severityTone(task.severityLabel)
                                            )}
                                        >
                                            {task.severityLabel}
                                        </span>
                                    ) : null}

                                    {showProgress ? <ProgressPill progress={Number(task.progress ?? 0)} /> : null}

                                    {done ? <DonePill /> : null}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function GhostTaskCard({ task }: { task: Task }) {
    const done = isTaskDone(task);
    const showProgress = shouldShowProgress(task);
    const overdue = task.dueRaw ? isOverdue(task.dueRaw) : false;

    return (
        <div className={cn("rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/70 p-3")}>
            <div className="flex items-start gap-3">
                <div className={cn("mt-1 h-2.5 w-2.5 rounded-full", dotClass(task.statusDot))} />
                <div className="min-w-0 flex-1">
                    <p className={cn("line-clamp-3 text-sm font-semibold leading-5", done ? "text-zinc-500 line-through" : "text-zinc-800")}>
                        {task.title}
                    </p>

                    {task.due || task.severityLabel || done || showProgress ? (
                        <div className="mt-3 space-y-2">
                            {task.due ? <DuePill due={task.due} overdue={overdue} done={done} /> : null}

                            {task.severityLabel || done || showProgress ? (
                                <div className="flex flex-wrap items-center gap-2">
                                    {task.severityLabel ? (
                                        <span
                                            className={cn(
                                                "inline-flex shrink-0 items-center rounded-xl border px-3 py-2 text-xs font-semibold",
                                                done ? "border-zinc-200 bg-zinc-100 text-zinc-500" : severityTone(task.severityLabel)
                                            )}
                                        >
                                            {task.severityLabel}
                                        </span>
                                    ) : null}

                                    {showProgress ? <ProgressPill progress={Number(task.progress ?? 0)} /> : null}

                                    {done ? <DonePill /> : null}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

type HeaderDragProps = Pick<ReturnType<typeof useSortable>, "attributes" | "listeners"> & {
    setActivatorNodeRef?: (node: HTMLElement | null) => void;
};

function filterDroppablesByType(droppables: DroppableContainer[], allow: Array<string>) {
    return droppables.filter((d) => {
        const t = d.data?.current?.type;
        return typeof t === "string" && allow.includes(t);
    });
}

function AddColumnInline({
    isSubmitting,
    onSubmit
}: {
    isSubmitting: boolean;
    onSubmit: (title: string) => Promise<void>;
}) {
    const [open, setOpen] = React.useState(false);
    const [title, setTitle] = React.useState("");
    const [error, setError] = React.useState<string | null>(null);
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
        if (open) {
            setError(null);
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [open]);

    const close = () => {
        setOpen(false);
        setTitle("");
        setError(null);
    };

    const submit = async () => {
        const trimmed = title.trim().slice(0, 25);

        if (!trimmed) {
            setError("Vui lòng nhập tên trạng thái.");
            inputRef.current?.focus();
            return;
        }

        try {
            setError(null);
            await onSubmit(trimmed);
            close();
        } catch (e: any) {
            setError(e?.message ?? "Tạo trạng thái thất bại");
            inputRef.current?.focus();
        }
    };

    const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            void submit();
        }
        if (e.key === "Escape") {
            e.preventDefault();
            close();
        }
    };

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={cn(
                    "w-full rounded-xl bg-[#f54a00] px-4 py-3 text-left text-sm font-semibold text-white shadow-sm",
                    "transition hover:bg-[#f54a00]/80"
                )}
            >
                + Tạo trạng thái
            </button>
        );
    }

    return (
        <div className="rounded-xl bg-white p-3 shadow-sm">
            <input
                ref={inputRef}
                value={title}
                maxLength={25}
                onChange={(e) => setTitle(e.target.value.slice(0, 25))}
                onKeyDown={onKeyDown}
                disabled={isSubmitting}
                placeholder="Nhập tên trạng thái..."
                className={cn(
                    "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none",
                    "focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200",
                    "select-text"
                )}
            />

            <div className="mt-1 text-right text-[11px] text-zinc-500">
                {title.length}/25
            </div>

            {error ? <div className="mt-2 text-xs font-medium text-rose-600">{error}</div> : null}

            <div className="mt-3 flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={isSubmitting}
                    className={cn(
                        "rounded-xl px-3 py-2 text-sm font-semibold text-white",
                        "bg-[#f54a00] transition hover:bg-[#f54a00]/80",
                        isSubmitting && "pointer-events-none opacity-60"
                    )}
                >
                    Thêm trạng thái
                </button>

                <button
                    type="button"
                    onClick={close}
                    disabled={isSubmitting}
                    className={cn(
                        "grid h-9 w-9 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-700",
                        "transition hover:bg-zinc-100",
                        isSubmitting && "pointer-events-none opacity-60"
                    )}
                >
                    ✕
                </button>
            </div>
        </div>
    );
}

function AddTaskButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold",
                "bg-[#f54a00] text-white",
                "transition hover:bg-[#f54a00]/80",
                disabled && "pointer-events-none opacity-60"
            )}
        >
            <Plus className="h-4 w-4" />
            Thêm công việc
        </button>
    );
}

function ColumnView({
    col,
    tasks,
    taskIds,
    onOpenCreateTask,
    onOpenTaskDetail,
    dndEnabled,
    headerDragProps,
    ghost,
    creatingTask,
    onRenameColumnInline,
    onDeleteColumn,
    taskEditState,
    onTaskStartEdit,
    onTaskCancelEdit,
    onTaskDraftChange,
    onTaskCommitEdit,
    onDeleteTask,
    isColumnEditing,
    columnDraft,
    columnError,
    onColumnDraftChange,
    onColumnCommit,
    onColumnCancel
}: {
    col: Column;
    tasks: Task[];
    taskIds: string[];
    onOpenCreateTask: (columnId: ColumnId) => void;
    onOpenTaskDetail: (taskId: string) => void;
    dndEnabled: boolean;
    headerDragProps?: HeaderDragProps;
    ghost?: { task: Task; toCol: ColumnId; index: number } | null;
    creatingTask: boolean;
    onRenameColumnInline: (columnId: ColumnId) => void;
    onDeleteColumn: (columnId: ColumnId) => void;
    taskEditState: { taskId: string | null; columnId: string | null; draft: string };
    onTaskStartEdit: (taskId: string, columnId: ColumnId, currentTitle: string) => void;
    onTaskCancelEdit: () => void;
    onTaskDraftChange: (v: string) => void;
    onTaskCommitEdit: () => void;
    onDeleteTask: (taskId: string, columnId: ColumnId) => void;
    isColumnEditing: boolean;
    columnDraft: string;
    columnError: string | null;
    onColumnDraftChange: (v: string) => void;
    onColumnCommit: () => void;
    onColumnCancel: () => void;
}) {
    const dropId = `${DROP_PREFIX}${col.id}`;
    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: dropId,
        data: { type: "column-drop", columnId: col.id }
    });

    const endDropId = `${END_PREFIX}${col.id}`;
    const { setNodeRef: setEndRef, isOver: isOverEnd } = useDroppable({
        id: endDropId,
        data: { type: "column-end", columnId: col.id }
    });

    const shouldShowGhost = !!ghost && ghost.toCol === col.id;

    type RenderItem = { kind: "task"; task: Task } | { kind: "ghost"; key: string };

    const rendered = React.useMemo<RenderItem[]>(() => {
        const base: RenderItem[] = tasks.map((t) => ({ kind: "task", task: t }));
        if (!(shouldShowGhost && ghost)) return base;
        const idx = Math.max(0, Math.min(ghost.index, base.length));
        const next = [...base];
        next.splice(idx, 0, { kind: "ghost", key: `ghost_${ghost.task.id}` });
        return next;
    }, [tasks, shouldShowGhost, ghost]);

    const [openColMenu, setOpenColMenu] = React.useState(false);
    const colMenuBtnRef = React.useRef<HTMLButtonElement | null>(null);

    const colInputRef = React.useRef<HTMLInputElement | null>(null);
    React.useEffect(() => {
        if (isColumnEditing) setTimeout(() => colInputRef.current?.focus(), 0);
    }, [isColumnEditing]);

    return (
        <div className="rounded-xl bg-[#f1f2f4]">
            <div
                ref={(node) => headerDragProps?.setActivatorNodeRef?.(node as any)}
                {...(headerDragProps?.attributes ?? {})}
                {...(headerDragProps?.listeners ?? {})}
                style={{ touchAction: "none" }}
                className={cn(
                    "sticky top-0 z-10 rounded-t-xl bg-[#f1f2f4] px-3 pt-3 pb-2",
                    "cursor-grab select-none active:cursor-grabbing"
                )}
            >
                <div className="flex items-center gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                        <div className="min-w-0 flex-1">
                            {!isColumnEditing ? (
                                <p className="truncate text-sm font-bold text-zinc-900">{col.title}</p>
                            ) : (
                                <div className="space-y-1">
                                    <input
                                        ref={colInputRef}
                                        value={columnDraft}
                                        maxLength={25}
                                        onChange={(e) => {
                                            const value = e.target.value.slice(0, 25);
                                            onColumnDraftChange(value);
                                        }}
                                        onPointerDownCapture={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                onColumnCommit();
                                            }

                                            if (e.key === "Escape") {
                                                e.preventDefault();
                                                onColumnCancel();
                                            }
                                        }}
                                        onBlur={() => {
                                            setTimeout(() => onColumnCommit(), 0);
                                        }}
                                        className={cn(
                                            "h-9 w-full min-w-0 rounded-lg border bg-white px-3 text-sm font-bold text-zinc-900 outline-none",
                                            columnError
                                                ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                                                : "border-zinc-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200",
                                            "select-text"
                                        )}
                                        style={{ maxWidth: 220 }}
                                    />
                                    <div className="flex justify-end text-[11px] text-zinc-500">{columnDraft.length}/25</div>

                                    {columnError ? (
                                        <div className="text-[11px] font-medium text-rose-600">{columnError}</div>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-xs font-semibold text-zinc-700">
                            {tasks.length}
                        </span>

                        <div className="relative">
                            <button
                                ref={colMenuBtnRef}
                                type="button"
                                onPointerDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setOpenColMenu((v) => !v);
                                }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                                className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-black/5"
                                aria-label="Column menu"
                            >
                                <MoreHorizontal className="h-5 w-5" />
                            </button>

                            <PortalDropdown
                                open={openColMenu}
                                onClose={() => setOpenColMenu(false)}
                                anchorRef={colMenuBtnRef as any}
                            >
                                <MenuItem
                                    icon={<Pencil className="h-4 w-4" />}
                                    label="Chỉnh sửa tên trạng thái"
                                    onClick={() => {
                                        setOpenColMenu(false);
                                        onRenameColumnInline(col.id);
                                    }}
                                />
                                <MenuItem
                                    icon={<Trash2 className="h-4 w-4" />}
                                    label="Xóa trạng thái"
                                    danger
                                    onClick={() => {
                                        setOpenColMenu(false);
                                        onDeleteColumn(col.id);
                                    }}
                                />
                            </PortalDropdown>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-2 pb-2">
                <div
                    ref={setDroppableRef}
                    className={cn("rounded-b-xl bg-[#f1f2f4] transition", isOver && "bg-[#e9f2ff]")}
                >
                    {dndEnabled ? (
                        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                            <div className="relative max-h-[68vh] space-y-2 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
                                {rendered.map((item) => {
                                    if (item.kind === "ghost") return <GhostTaskCard key={item.key} task={ghost!.task} />;

                                    const isEditingThis = taskEditState.taskId === item.task.id && taskEditState.columnId === col.id;

                                    return (
                                        <TaskCard
                                            key={item.task.id}
                                            task={item.task}
                                            columnId={col.id}
                                            isEditing={isEditingThis}
                                            draftTitle={isEditingThis ? taskEditState.draft : item.task.title}
                                            onDraftChange={onTaskDraftChange}
                                            onOpenDetail={() => onOpenTaskDetail(item.task.id)}
                                            onStartEdit={() => onTaskStartEdit(item.task.id, col.id, item.task.title)}
                                            onCancelEdit={onTaskCancelEdit}
                                            onCommitEdit={onTaskCommitEdit}
                                            onDelete={() => onDeleteTask(item.task.id, col.id)}
                                        />
                                    );
                                })}

                                {tasks.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-3 py-8 text-center">
                                        <div className="text-sm font-semibold text-zinc-700">Chưa có công việc</div>
                                        <div className="mt-1 text-xs text-zinc-500">Bấm “Thêm công việc” để tạo mới</div>
                                    </div>
                                ) : null}

                                <div
                                    ref={setEndRef}
                                    className={cn(
                                        "absolute right-0 bottom-0 left-0 h-12 rounded-xl border border-dashed transition",
                                        isOverEnd ? "border-blue-300 bg-blue-50/60" : "border-transparent"
                                    )}
                                />
                            </div>
                        </SortableContext>
                    ) : (
                        <div className="max-h-[68vh] space-y-2 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
                            {tasks.map((t) => {
                                const isEditingThis = taskEditState.taskId === t.id && taskEditState.columnId === col.id;
                                return (
                                    <TaskCard
                                        key={t.id}
                                        task={t}
                                        columnId={col.id}
                                        isEditing={isEditingThis}
                                        draftTitle={isEditingThis ? taskEditState.draft : t.title}
                                        onDraftChange={onTaskDraftChange}
                                        onOpenDetail={() => onOpenTaskDetail(t.id)}
                                        onStartEdit={() => onTaskStartEdit(t.id, col.id, t.title)}
                                        onCancelEdit={onTaskCancelEdit}
                                        onCommitEdit={onTaskCommitEdit}
                                        onDelete={() => onDeleteTask(t.id, col.id)}
                                    />
                                );
                            })}
                            {tasks.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-3 py-8 text-center">
                                    <div className="text-sm font-semibold text-zinc-700">Chưa có công việc</div>
                                    <div className="mt-1 text-xs text-zinc-500">Bấm “Thêm công việc” để tạo mới</div>
                                </div>
                            ) : null}
                        </div>
                    )}

                    <AddTaskButton disabled={creatingTask} onClick={() => onOpenCreateTask(col.id)} />
                </div>
            </div>
        </div>
    );
}

function SortableColumn(props: {
    col: Column;
    tasks: Task[];
    taskIds: string[];
    onOpenCreateTask: (columnId: ColumnId) => void;
    onOpenTaskDetail: (taskId: string) => void;
    dndEnabled: boolean;
    ghost?: { task: Task; toCol: ColumnId; index: number } | null;
    creatingTask: boolean;
    onRenameColumnInline: (columnId: ColumnId) => void;
    onDeleteColumn: (columnId: ColumnId) => void;
    taskEditState: { taskId: string | null; columnId: string | null; draft: string };
    onTaskStartEdit: (taskId: string, columnId: ColumnId, currentTitle: string) => void;
    onTaskCancelEdit: () => void;
    onTaskDraftChange: (v: string) => void;
    onTaskCommitEdit: () => void;
    onDeleteTask: (taskId: string, columnId: ColumnId) => void;
    isColumnEditing: boolean;
    columnDraft: string;
    columnError: string | null;
    onColumnDraftChange: (v: string) => void;
    onColumnCommit: () => void;
    onColumnCancel: () => void;
}) {
    const {
        col,
        tasks,
        taskIds,
        onOpenCreateTask,
        onOpenTaskDetail,
        dndEnabled,
        ghost,
        creatingTask,
        onRenameColumnInline,
        onDeleteColumn,
        taskEditState,
        onTaskStartEdit,
        onTaskCancelEdit,
        onTaskDraftChange,
        onTaskCommitEdit,
        onDeleteTask,
        isColumnEditing,
        columnDraft,
        columnError,
        onColumnDraftChange,
        onColumnCommit,
        onColumnCancel
    } = props;

    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
        id: col.id,
        data: { type: "column" }
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition: transition ?? "transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        willChange: "transform",
        touchAction: "none",
        opacity: isDragging ? 0.25 : 1
    };

    return (
        <div ref={setNodeRef} style={style} className="min-w-[300px] max-w-[300px] self-start">
            <ColumnView
                col={col}
                tasks={tasks}
                taskIds={taskIds}
                onOpenCreateTask={onOpenCreateTask}
                onOpenTaskDetail={onOpenTaskDetail}
                dndEnabled={dndEnabled}
                headerDragProps={{ attributes, listeners, setActivatorNodeRef }}
                ghost={ghost}
                creatingTask={creatingTask}
                onRenameColumnInline={onRenameColumnInline}
                onDeleteColumn={onDeleteColumn}
                taskEditState={taskEditState}
                onTaskStartEdit={onTaskStartEdit}
                onTaskCancelEdit={onTaskCancelEdit}
                onTaskDraftChange={onTaskDraftChange}
                onTaskCommitEdit={onTaskCommitEdit}
                onDeleteTask={onDeleteTask}
                isColumnEditing={isColumnEditing}
                columnDraft={columnDraft}
                columnError={columnError}
                onColumnDraftChange={onColumnDraftChange}
                onColumnCommit={onColumnCommit}
                onColumnCancel={onColumnCancel}
            />
        </div>
    );
}

function TaskOverlay({ task }: { task: Task }) {
    const overdue = task.dueRaw ? isOverdue(task.dueRaw) : false;
    const done = isTaskDone(task);
    const showProgress = shouldShowProgress(task);

    return (
        <div className="min-w-[300px] rounded-xl border border-black/5 bg-white p-4 shadow-xl">
            <p className={cn("text-sm font-semibold leading-5", done ? "text-zinc-500 line-through" : "text-zinc-900")}>
                {task.title}
            </p>

            <div className="mt-2">
                <Pill>Người thực hiện: {task.assigneeName || "Chưa gán"}</Pill>
            </div>

            {task.due || task.severityLabel || done || showProgress ? (
                <div className="mt-3 space-y-2">
                    {task.due ? <DuePill due={task.due} overdue={overdue} done={done} /> : null}

                    {task.severityLabel || done || showProgress ? (
                        <div className="flex flex-wrap items-center gap-2">
                            {task.severityLabel ? (
                                <span
                                    className={cn(
                                        "inline-flex shrink-0 items-center rounded-xl border px-3 py-2 text-xs font-semibold",
                                        done ? "border-zinc-200 bg-zinc-100 text-zinc-500" : severityTone(task.severityLabel)
                                    )}
                                >
                                    {task.severityLabel}
                                </span>
                            ) : null}

                            {showProgress ? <ProgressPill progress={Number(task.progress ?? 0)} /> : null}

                            {done ? <DonePill /> : null}
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

function ColumnOverlay({ col, tasks }: { col: Column; tasks: Task[] }) {
    return (
        <div className="min-w-[300px] max-w-[300px]">
            <div className="rounded-xl bg-[#f1f2f4] shadow-xl">
                <div className="rounded-t-xl bg-[#f1f2f4] px-3 pt-3 pb-2">
                    <p className="truncate text-sm font-bold text-zinc-900">{col.title}</p>
                    <p className="text-[11px] text-zinc-500">Đang di chuyển trạng thái…</p>
                </div>
                <div className="px-2 pb-2">
                    <div className="rounded-b-xl bg-[#f1f2f4]">
                        {tasks.slice(0, 3).map((t) => (
                            <div key={t.id} className="mb-2 last:mb-0">
                                <div className="rounded-xl border border-black/5 bg-white p-3 shadow-sm">
                                    <p className={cn("text-sm font-semibold", isTaskDone(t) ? "text-zinc-500 line-through" : "text-zinc-900")}>
                                        {t.title}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {tasks.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-3 py-8 text-center text-sm text-zinc-500">
                                (Trạng thái trống)
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function GroupBoardScreen({ canDelete = false }: { canDelete?: boolean }) {
    const params = useParams<{ groupId: string }>();
    const router = useRouter();
    const searchParams = useSearchParams();
    const groupId = params?.groupId ? String(params.groupId) : "";

    const [columns, setColumns] = React.useState<Column[]>([]);
    const [board, setBoard] = React.useState<Record<ColumnId, Task[]>>({});

    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);

    const [loading, setLoading] = React.useState(true);
    const [loadError, setLoadError] = React.useState<string | null>(null);

    const [creatingColumn, setCreatingColumn] = React.useState(false);
    const [creatingTask, setCreatingTask] = React.useState(false);

    const [activeTaskId, setActiveTaskId] = React.useState<string | null>(null);
    const [activeColumnId, setActiveColumnId] = React.useState<string | null>(null);
    const [overId, setOverId] = React.useState<string | null>(null);

    const [editingColumn, setEditingColumn] = React.useState<{
        id: string | null;
        draft: string;
        error: string | null;
    }>({
        id: null,
        draft: "",
        error: null
    });

    const [editingTask, setEditingTask] = React.useState<{
        taskId: string | null;
        columnId: string | null;
        draft: string;
    }>({
        taskId: null,
        columnId: null,
        draft: ""
    });

    const [confirmModal, setConfirmModal] = React.useState<{
        open: boolean;
        columnId: ColumnId | null;
        columnTitle: string;
    }>({
        open: false,
        columnId: null,
        columnTitle: ""
    });

    const [confirmDeleteTask, setConfirmDeleteTask] = React.useState<{
        open: boolean;
        taskId: string | null;
        columnId: string | null;
        taskTitle: string;
    }>({
        open: false,
        taskId: null,
        columnId: null,
        taskTitle: ""
    });

    const closePermissionModal = () =>
        setPermissionModal({
            open: false,
            title: "",
            message: ""
        });

    const openNoPermissionModal = (message: string) =>
        setPermissionModal({
            open: true,
            title: "Không có thẩm quyền",
            message
        });

    const [permissionModal, setPermissionModal] = React.useState<{
        open: boolean;
        title: string;
        message: string;
    }>({
        open: false,
        title: "",
        message: ""
    });

    const [taskFormOpen, setTaskFormOpen] = React.useState(false);
    const [taskFormColumnId, setTaskFormColumnId] = React.useState<ColumnId | null>(null);

    const [detailOpen, setDetailOpen] = React.useState(false);
    const [detailTaskId, setDetailTaskId] = React.useState<string | null>(null);

    const [membersOptions, setMembersOptions] = React.useState<TaskFormOption[]>([]);
    const topScrollRef = React.useRef<HTMLDivElement | null>(null);
    const boardScrollRef = React.useRef<HTMLDivElement | null>(null);
    const syncSourceRef = React.useRef<"top" | "board" | null>(null);
    const [topScrollbarWidth, setTopScrollbarWidth] = React.useState(0);
    const [showTopScrollbar, setShowTopScrollbar] = React.useState(false);

    const autoOpenedTaskRef = React.useRef<string | null>(null);

    const syncTopScrollbarWidth = React.useCallback(() => {
        const boardEl = boardScrollRef.current;
        const topEl = topScrollRef.current;

        if (!boardEl) {
            setTopScrollbarWidth(0);
            setShowTopScrollbar(false);
            return;
        }

        const scrollWidth = boardEl.scrollWidth;
        const clientWidth = boardEl.clientWidth;

        setTopScrollbarWidth(scrollWidth);
        setShowTopScrollbar(scrollWidth > clientWidth + 1);

        if (topEl && Math.abs(topEl.scrollLeft - boardEl.scrollLeft) > 1) {
            topEl.scrollLeft = boardEl.scrollLeft;
        }
    }, []);

    React.useEffect(() => {
        if (!mounted || loading) return;

        const boardEl = boardScrollRef.current;
        const frame = window.requestAnimationFrame(() => syncTopScrollbarWidth());
        const onResize = () => syncTopScrollbarWidth();

        window.addEventListener("resize", onResize);

        let observer: ResizeObserver | null = null;
        if (boardEl && typeof ResizeObserver !== "undefined") {
            observer = new ResizeObserver(() => syncTopScrollbarWidth());
            observer.observe(boardEl);
        }

        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener("resize", onResize);
            observer?.disconnect();
        };
    }, [mounted, loading, syncTopScrollbarWidth]);

    const handleTopScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
        const boardEl = boardScrollRef.current;
        if (!boardEl) return;

        if (syncSourceRef.current === "board") {
            syncSourceRef.current = null;
            return;
        }

        syncSourceRef.current = "top";
        boardEl.scrollLeft = e.currentTarget.scrollLeft;
    };

    const handleBoardScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
        const topEl = topScrollRef.current;
        if (!topEl) return;

        if (syncSourceRef.current === "top") {
            syncSourceRef.current = null;
            return;
        }

        syncSourceRef.current = "board";
        topEl.scrollLeft = e.currentTarget.scrollLeft;
    };

    const openTaskDetail = (taskId: string) => {
        setDetailTaskId(taskId);
        setDetailOpen(true);
    };

    const closeTaskDetail = () => {
        setDetailOpen(false);
        setDetailTaskId(null);
    };

    const handleDeleteFromDetail = async (taskId: string) => {
        if (!canDelete) {
            openNoPermissionModal("Bạn không có thẩm quyền xóa công việc này");
            return;
        }

        setDetailOpen(false);
        setDetailTaskId(null);

        try {
            await apiDeleteTask({ groupId, taskId });
            await refreshSilently();
        } catch (e: any) {
            openNoPermissionModal("Bạn không có thẩm quyền xóa công việc này");
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { delay: 200, tolerance: 5 }
        }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const syncColumnsFromDetail = React.useCallback((detail: GroupDetailResponse | undefined) => {
        const statuses = (detail?.taskStatuses ?? [])
            .filter((s) => typeof s?.statusId === "string" && !!s.statusId && typeof s?.statusName === "string")
            .map((s) => ({
                id: String(s.statusId),
                title: String(s.statusName ?? ""),
                position: typeof s.position === "number" && Number.isFinite(s.position) ? s.position : 0,
                taskList: s.taskList ?? []
            }))
            .sort((a, b) => a.position - b.position);

        setColumns(statuses.map(({ id, title, position }) => ({ id, title, position })));

        const nextBoard: Record<string, Task[]> = {};
        for (const s of statuses) {
            const apiTasks = (s.taskList ?? []).slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
            nextBoard[s.id] = apiTasks.map((t) => {
                const dueRaw = t.dueDate ? String(t.dueDate) : "";
                const startRaw = t.startDate ? String(t.startDate) : "";
                const assigneeName = formatAssigneeName(t.assignee);

                const dueFmt = dueRaw ? formatDueCompact(dueRaw) : "";
                const startFmt = startRaw ? formatDueCompact(startRaw) : "";

                const base: Task = {
                    id: String(t.taskId ?? `task_${Math.random().toString(16).slice(2)}`),
                    title: String(t.taskTitle ?? ""),
                    statusDot: priorityToStatusDot(t.taskPriority),
                    assigneeName,
                    priorityLabel: priorityLabelOf(t.taskPriority),
                    severityLabel: severityLabelOf(t.taskSeverity),
                    progress: Number.isFinite(t.progress as number) ? Number(t.progress) : 0
                };

                if (startFmt) base.start = startFmt;
                if (startRaw) base.startRaw = startRaw;

                if (dueFmt) base.due = dueFmt;
                if (dueRaw) base.dueRaw = dueRaw;

                return base;
            });
        }

        setBoard(nextBoard);
    }, []);

    const fetchBoardData = React.useCallback(async () => {
        if (!groupId) throw new Error("Thiếu groupId trong route.");
        if (!isUuidLike(groupId)) throw new Error("groupId trong route không hợp lệ (không phải UUID).");
        if (!getApiBase()) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");

        const [detail, members] = await Promise.all([
            apiGetGroupDetail(groupId),
            apiGetGroupMembers(groupId)
        ]);

        syncColumnsFromDetail(detail?.data);

        const list = members?.data?.members ?? [];
        setMembersOptions(
            list
                .filter((m) => typeof m?.userId === "string" && !!m.userId)
                .map((m) => {
                    const name = `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim();
                    return {
                        value: String(m.userId),
                        label: name || m.email || "Unnamed",
                        avatarUrl: m.avatarUrl ?? null
                    };
                })
        );
    }, [groupId, syncColumnsFromDetail]);

    const refresh = React.useCallback(async () => {
        setLoading(true);
        setLoadError(null);

        try {
            await fetchBoardData();
        } catch (e: any) {
            setLoadError(e?.message ?? "Không tải được dữ liệu group.");
            setMembersOptions([]);
        } finally {
            setLoading(false);
        }
    }, [fetchBoardData]);

    const refreshSilently = React.useCallback(async () => {
        try {
            await fetchBoardData();
            setLoadError(null);
        } catch (e: any) {
            console.error("refreshSilently error:", e);
        }
    }, [fetchBoardData]);

    React.useEffect(() => {
        void refresh();
    }, [refresh]);

    React.useEffect(() => {
        if (loading) return;

        const taskId = searchParams.get("taskId");
        const openTaskDetail = searchParams.get("openTaskDetail");

        if (!taskId || openTaskDetail !== "1") return;
        if (autoOpenedTaskRef.current === taskId) return;

        let found = false;
        for (const col of columns) {
            if ((board[col.id] ?? []).some((t) => t.id === taskId)) {
                found = true;
                break;
            }
        }

        if (!found) return;

        autoOpenedTaskRef.current = taskId;
        setDetailTaskId(taskId);
        setDetailOpen(true);

        router.replace(`/group/${groupId}`, { scroll: false });
    }, [loading, searchParams, columns, board, router, groupId]);

    const activeTask = React.useMemo(() => {
        if (!activeTaskId) return null;
        return findTask(board, columns, activeTaskId);
    }, [activeTaskId, board, columns]);

    const activeColumn = React.useMemo(() => {
        if (!activeColumnId) return null;
        return columns.find((c) => c.id === activeColumnId) ?? null;
    }, [activeColumnId, columns]);

    const ghost = React.useMemo(() => {
        if (!activeTaskId) return null;
        if (!overId) return null;

        const task = findTask(board, columns, activeTaskId);
        if (!task) return null;

        const overKey = overId.startsWith(DROP_PREFIX)
            ? overId.replace(DROP_PREFIX, "")
            : overId.startsWith(END_PREFIX)
                ? overId.replace(END_PREFIX, "")
                : overId;

        let toCol: ColumnId | null = null;
        if (columns.some((c) => c.id === overKey)) toCol = overKey;
        else toCol = findColumnOfTask(board, columns, overKey) ?? null;

        if (!toCol) return null;

        const toTasks = board[toCol] ?? [];
        if (overId.startsWith(END_PREFIX)) return { task, toCol, index: toTasks.length };

        const idx = toTasks.findIndex((t) => t.id === overKey);
        const index = idx !== -1 ? idx : 0;
        return { task, toCol, index };
    }, [activeTaskId, overId, board, columns]);

    const submitAddColumn = async (title: string) => {
        if (!groupId) throw new Error("Thiếu groupId.");
        if (!isUuidLike(groupId)) throw new Error("groupId route không hợp lệ (không phải UUID).");

        const existed = columns.some((c) => c.title.trim().toLowerCase() === title.trim().toLowerCase());
        if (existed) throw new Error("Tên trạng thái đã tồn tại. Hãy nhập tên khác.");

        const base = detectPositionBase(columns) as 0 | 1;
        const positionToSend = nextPositionForCreate(columns, base);

        setCreatingColumn(true);
        try {
            await apiCreateGroupTaskStatus({ groupId, statusName: title, position: positionToSend });
            await refreshSilently();
        } finally {
            setCreatingColumn(false);
        }
    };

    const startEditColumn = (columnId: ColumnId) => {
        const col = columns.find((c) => c.id === columnId);
        if (!col) return;
        setEditingColumn({ id: columnId, draft: col.title, error: null });
    };

    const cancelEditColumn = () => setEditingColumn({ id: null, draft: "", error: null });

    const commitEditColumn = async () => {
        if (!groupId) return;
        const id = editingColumn.id;
        if (!id) return;

        const col = columns.find((c) => c.id === id);
        if (!col) return;

        const next = editingColumn.draft.trim();
        if (!next) {
            setEditingColumn((p) => ({ ...p, error: "Vui lòng nhập tên trạng thái." }));
            return;
        }

        if (columns.some((c) => c.id !== id && c.title.trim().toLowerCase() === next.toLowerCase())) {
            setEditingColumn((p) => ({ ...p, error: "Tên trạng thái đã tồn tại. Hãy nhập tên khác." }));
            return;
        }

        const prevTitle = col.title;
        setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, title: next } : c)));

        try {
            await apiRenameGroupTaskStatus({
                groupId,
                statusId: id,
                statusName: next,
                position: col.position
            });
            cancelEditColumn();
            await refreshSilently();
        } catch (e: any) {
            setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, title: prevTitle } : c)));
            setEditingColumn((p) => ({ ...p, error: e?.message ?? "Đã xảy ra lỗi" }));
        }
    };

    const onDeleteColumn = (columnId: ColumnId) => {
        if (!canDelete) {
            openNoPermissionModal("Bạn không có thẩm quyền xóa trạng thái này");
            return;
        }

        const col = columns.find((c) => c.id === columnId);
        if (!col) return;

        setConfirmModal({
            open: true,
            columnId,
            columnTitle: col.title
        });
    };

    const handleConfirmDeleteColumn = async () => {
        const columnId = confirmModal.columnId;
        setConfirmModal({ open: false, columnId: null, columnTitle: "" });
        if (!(columnId && groupId)) return;

        const prevCols = columns;
        const prevBoard = board;

        const base = detectPositionBase(columns) as 0 | 1;
        const nextCols = assignPositions(
            columns.filter((c) => c.id !== columnId),
            base
        );

        setColumns(nextCols);
        setBoard((prev) => {
            const next = { ...prev };
            delete next[columnId];
            return next;
        });

        try {
            await apiDeleteGroupTaskStatus({ groupId, statusId: columnId });
            await refreshSilently();
        } catch (e: any) {
            setColumns(prevCols);
            setBoard(prevBoard);

            setPermissionModal({
                open: true,
                title: "Không có thẩm quyền",
                message: "Bạn không có thẩm quyền xóa trạng thái này"
            });
        }
    };

    const handleCancelDeleteColumn = () =>
        setConfirmModal({ open: false, columnId: null, columnTitle: "" });

    const onTaskStartEdit = (taskId: string, columnId: ColumnId, currentTitle: string) => {
        setEditingTask({ taskId, columnId, draft: currentTitle });
    };

    const onTaskCancelEdit = () =>
        setEditingTask({ taskId: null, columnId: null, draft: "" });

    const onTaskCommitEdit = () => {
        const { taskId, columnId, draft } = editingTask;
        if (!(taskId && columnId)) return;

        const next = draft.trim();
        if (!next) {
            onTaskCancelEdit();
            return;
        }

        setBoard((prev) => ({
            ...prev,
            [columnId]: (prev[columnId] ?? []).map((t) =>
                t.id === taskId ? { ...t, title: next } : t
            )
        }));

        onTaskCancelEdit();
    };

    const onDeleteTask = (taskId: string, columnId: ColumnId) => {
        if (!canDelete) {
            openNoPermissionModal("Bạn không có thẩm quyền xóa công việc này");
            return;
        }

        const t = (board[columnId] ?? []).find((x) => x.id === taskId);

        setConfirmDeleteTask({
            open: true,
            taskId,
            columnId,
            taskTitle: t?.title ?? ""
        });
    };

    const handleCancelDeleteTask = () =>
        setConfirmDeleteTask({ open: false, taskId: null, columnId: null, taskTitle: "" });

    const handleConfirmDeleteTask = async () => {
        const taskId = confirmDeleteTask.taskId;
        const columnId = confirmDeleteTask.columnId;

        setConfirmDeleteTask({ open: false, taskId: null, columnId: null, taskTitle: "" });

        if (!(taskId && columnId)) return;

        const prevBoard = board;

        setBoard((prev) => ({
            ...prev,
            [columnId]: (prev[columnId] ?? []).filter((t) => t.id !== taskId)
        }));

        if (editingTask.taskId === taskId && editingTask.columnId === columnId) {
            onTaskCancelEdit();
        }

        try {
            await apiDeleteTask({ groupId, taskId });
            await refreshSilently();
        } catch (e: any) {
            setBoard(prevBoard);

            setPermissionModal({
                open: true,
                title: "Không có thẩm quyền",
                message: "Bạn không có thẩm quyền xóa công việc này"
            });
        }
    };

    const openCreateTask = (columnId: ColumnId) => {
        setTaskFormColumnId(columnId);
        setTaskFormOpen(true);
    };

    const closeCreateTask = () => {
        setTaskFormOpen(false);
        setTaskFormColumnId(null);
    };

    const handleSubmitCreateTask = async (values: TaskFormValues) => {
        if (!groupId) throw new Error("Thiếu groupId.");
        if (!isUuidLike(groupId)) throw new Error("groupId route không hợp lệ (không phải UUID).");

        const columnId = (values as any).statusId ?? taskFormColumnId ?? null;
        if (!columnId) throw new Error("Thiếu trạng thái.");
        if (!isUuidLike(columnId)) throw new Error("Sai columnId.");

        const rawDue = (values as any).dueDate ?? (values as any).due ?? null;
        const rawStart = (values as any).startDate ?? (values as any).start ?? null;

        const dueSelected = rawDue != null && String(rawDue).trim() !== "";
        const startSelected = rawStart != null && String(rawStart).trim() !== "";

        const assigneeId =
            (values as any).assigneeId ??
            (values as any).assignees ??
            (values as any).assignee ??
            null;

        setCreatingTask(true);
        try {
            await apiCreateTask({
                groupId,
                groupStatusId: columnId,
                taskName: (values as any).title ?? (values as any).taskName ?? "",
                assigneeId: assigneeId ? String(assigneeId) : null,
                dueDate: rawDue,
                startDate: rawStart,
                dueDateSelected: dueSelected,
                startDateSelected: startSelected
            });

            await refreshSilently();
            closeCreateTask();
        } finally {
            setCreatingTask(false);
        }
    };

    const collisionDetection: CollisionDetection = React.useCallback((args) => {
        const activeType = args.active.data.current?.type;

        if (activeType === "column") {
            const onlyColumns = filterDroppablesByType(args.droppableContainers, ["column"]);
            return closestCenter({ ...args, droppableContainers: onlyColumns });
        }

        const allow = filterDroppablesByType(args.droppableContainers, [
            "task",
            "column-drop",
            "column-end"
        ]);
        return closestCorners({ ...args, droppableContainers: allow });
    }, []);

    const handleDragStart = (e: DragStartEvent) => {
        setOverId(null);
        const type = e.active.data.current?.type;
        if (type === "task") setActiveTaskId(String(e.active.id));
        if (type === "column") setActiveColumnId(String(e.active.id));
    };

    const handleDragOver = (e: DragOverEvent) => {
        const next = e.over?.id ? String(e.over.id) : null;
        setOverId(next);
    };

    const handleDragCancel = (_e: DragCancelEvent) => {
        setActiveTaskId(null);
        setActiveColumnId(null);
        setOverId(null);
    };

    const handleDragEnd = (e: DragEndEvent) => {
        const activeType = e.active.data.current?.type;
        const overRaw = e.over?.id ? String(e.over.id) : null;

        setActiveTaskId(null);
        setActiveColumnId(null);
        setOverId(null);

        if (!overRaw) return;

        if (activeType === "task") {
            if (!(groupId && isUuidLike(groupId))) return;

            const activeId = String(e.active.id);
            const prevBoard = board;

            const dropped = applyTaskDrop({
                board,
                columns,
                activeTaskId: activeId,
                overRaw
            });
            if (!dropped) return;

            setBoard(dropped.nextBoard);

            void (async () => {
                try {
                    await apiReorderTask({
                        groupId,
                        taskId: activeId,
                        targetStatusId: dropped.toCol,
                        prevTaskId: dropped.prevTaskId,
                        nextTaskId: dropped.nextTaskId
                    });
                } catch {
                    setBoard(prevBoard);
                }
            })();

            return;
        }

        if (activeType === "column") {
            if (!groupId) return;

            const activeColId = String(e.active.id);
            let overColId = String(overRaw);

            if (overColId.startsWith(DROP_PREFIX)) overColId = overColId.replace(DROP_PREFIX, "");
            if (overColId.startsWith(END_PREFIX)) overColId = overColId.replace(END_PREFIX, "");

            if (!columns.some((c) => c.id === overColId)) {
                const maybeTaskCol = findColumnOfTask(board, columns, overColId);
                if (maybeTaskCol) overColId = maybeTaskCol;
            }

            if (!columns.some((c) => c.id === overColId)) return;
            if (activeColId === overColId) return;

            const oldIndex = columns.findIndex((c) => c.id === activeColId);
            const newIndex = columns.findIndex((c) => c.id === overColId);
            if (oldIndex === -1 || newIndex === -1) return;

            const prevCols = columns;
            const nextCols = arrayMove(columns, oldIndex, newIndex);

            setColumns(nextCols);

            const prevStatusId = newIndex > 0 ? nextCols[newIndex - 1].id : null;
            const nextStatusId = newIndex < nextCols.length - 1 ? nextCols[newIndex + 1].id : null;

            void (async () => {
                try {
                    await apiReorderGroupTaskStatus({
                        groupId,
                        statusId: activeColId,
                        prevStatusId,
                        nextStatusId
                    });
                } catch {
                    setColumns(prevCols);
                }
            })();
        }
    };

    const columnIds = React.useMemo(() => columns.map((c) => c.id), [columns]);

    const taskIdsByCol = React.useMemo(() => {
        const out: Record<string, string[]> = {};
        for (const col of columns) out[col.id] = (board[col.id] ?? []).map((t) => t.id);
        return out;
    }, [board, columns]);

    const statusesOptions = React.useMemo<TaskFormOption[]>(
        () => columns.map((c) => ({ value: c.id, label: c.title })),
        [columns]
    );

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-0px)] bg-[#fafbfc]">
                <Container>
                    <div className="mt-6 rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-sm text-zinc-700">
                        Đang tải board…
                    </div>
                </Container>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="min-h-[calc(100vh-0px)] bg-[#fafbfc]">
                <Container>
                    <div className="mt-6 rounded-2xl border border-rose-200 bg-white px-4 py-4 text-sm text-rose-700">
                        {loadError}
                    </div>
                    <div className="mt-3">
                        <button
                            type="button"
                            onClick={() => void refresh()}
                            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
                        >
                            Tải lại
                        </button>
                    </div>
                </Container>
            </div>
        );
    }

    const onColumnDraftChange = (v: string) => {
        setEditingColumn((p) => {
            const trimmed = v.trim();
            if (!trimmed) return { ...p, draft: v, error: "Vui lòng nhập tên trạng thái." };
            const dup = columns.some(
                (c) => c.id !== p.id && c.title.trim().toLowerCase() === trimmed.toLowerCase()
            );
            return {
                ...p,
                draft: v,
                error: dup ? "Tên trạng thái đã tồn tại. Hãy nhập tên khác." : null
            };
        });
    };

    return (
        <div className="min-h-[calc(100vh-0px)] bg-[#fafbfc]">
            <TaskFormModal
                open={taskFormOpen}
                onClose={closeCreateTask}
                onSubmit={handleSubmitCreateTask}
                members={membersOptions}
                statuses={statusesOptions}
                defaultStatusId={taskFormColumnId}
            />

            <TaskDetailModal
                open={detailOpen}
                onClose={closeTaskDetail}
                taskId={detailTaskId}
                onDelete={handleDeleteFromDetail}
                onSaved={refreshSilently}
            />

            <ConfirmModal
                open={confirmModal.open}
                title="Xác nhận xóa trạng thái"
                description={`Bạn có chắc chắn muốn xóa trạng thái "${confirmModal.columnTitle}" không?`}
                confirmLabel="Xóa trạng thái"
                cancelLabel="Hủy"
                onConfirm={() => void handleConfirmDeleteColumn()}
                onCancel={handleCancelDeleteColumn}
            />

            <ConfirmModal
                open={confirmDeleteTask.open}
                title="Xác nhận xóa công việc"
                description={`Bạn có chắc chắn muốn xóa công việc "${confirmDeleteTask.taskTitle}" không?`}
                confirmLabel="Xóa công việc"
                cancelLabel="Hủy"
                onConfirm={() => void handleConfirmDeleteTask()}
                onCancel={handleCancelDeleteTask}
            />

            <ConfirmModal
                open={permissionModal.open}
                title={permissionModal.title || "Không có thẩm quyền"}
                description={permissionModal.message}
                confirmLabel="Đóng"
                cancelLabel="Đóng"
                onConfirm={closePermissionModal}
                onCancel={closePermissionModal}
            />

            <Container>
                {showTopScrollbar ? (
                    <div
                        ref={topScrollRef}
                        onScroll={handleTopScroll}
                        className="board-top-scrollbar mt-5 mb-2 overflow-x-auto overflow-y-hidden"
                    >
                        <div style={{ width: topScrollbarWidth, height: 1 }} />
                    </div>
                ) : (
                    <div className="mt-5" />
                )}

                {!mounted ? (
                    <div
                        ref={boardScrollRef}
                        onScroll={handleBoardScroll}
                        className="scrollbar-hide flex items-start gap-4 overflow-x-auto pb-6"
                    >
                        {columns.map((col) => (
                            <ColumnView
                                key={col.id}
                                col={col}
                                tasks={board[col.id] ?? []}
                                taskIds={taskIdsByCol[col.id] ?? []}
                                onOpenCreateTask={openCreateTask}
                                onOpenTaskDetail={openTaskDetail}
                                dndEnabled={false}
                                headerDragProps={undefined}
                                ghost={null}
                                creatingTask={creatingTask}
                                onRenameColumnInline={startEditColumn}
                                onDeleteColumn={onDeleteColumn}
                                taskEditState={editingTask}
                                onTaskStartEdit={onTaskStartEdit}
                                onTaskCancelEdit={onTaskCancelEdit}
                                onTaskDraftChange={(v) => setEditingTask((p) => ({ ...p, draft: v }))}
                                onTaskCommitEdit={onTaskCommitEdit}
                                onDeleteTask={onDeleteTask}
                                isColumnEditing={editingColumn.id === col.id}
                                columnDraft={editingColumn.id === col.id ? editingColumn.draft : ""}
                                columnError={editingColumn.id === col.id ? editingColumn.error : null}
                                onColumnDraftChange={onColumnDraftChange}
                                onColumnCommit={() => void commitEditColumn()}
                                onColumnCancel={cancelEditColumn}
                            />
                        ))}

                        <div className="min-w-[300px] max-w-[300px] self-start">
                            <AddColumnInline isSubmitting={creatingColumn} onSubmit={submitAddColumn} />
                        </div>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={collisionDetection}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragCancel={handleDragCancel}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
                            <div
                                ref={boardScrollRef}
                                onScroll={handleBoardScroll}
                                className="scrollbar-hide flex items-start gap-4 overflow-x-auto pb-6"
                            >
                                {columns.map((col) => (
                                    <SortableColumn
                                        key={col.id}
                                        col={col}
                                        tasks={board[col.id] ?? []}
                                        taskIds={taskIdsByCol[col.id] ?? []}
                                        onOpenCreateTask={openCreateTask}
                                        onOpenTaskDetail={openTaskDetail}
                                        dndEnabled
                                        ghost={ghost}
                                        creatingTask={creatingTask}
                                        onRenameColumnInline={startEditColumn}
                                        onDeleteColumn={onDeleteColumn}
                                        taskEditState={editingTask}
                                        onTaskStartEdit={onTaskStartEdit}
                                        onTaskCancelEdit={onTaskCancelEdit}
                                        onTaskDraftChange={(v) => setEditingTask((p) => ({ ...p, draft: v }))}
                                        onTaskCommitEdit={onTaskCommitEdit}
                                        onDeleteTask={onDeleteTask}
                                        isColumnEditing={editingColumn.id === col.id}
                                        columnDraft={editingColumn.id === col.id ? editingColumn.draft : ""}
                                        columnError={editingColumn.id === col.id ? editingColumn.error : null}
                                        onColumnDraftChange={onColumnDraftChange}
                                        onColumnCommit={() => void commitEditColumn()}
                                        onColumnCancel={cancelEditColumn}
                                    />
                                ))}

                                <div className="min-w-[300px] max-w-[300px] self-start">
                                    <AddColumnInline isSubmitting={creatingColumn} onSubmit={submitAddColumn} />
                                </div>
                            </div>
                        </SortableContext>

                        <DragOverlay>
                            {activeTask ? (
                                <TaskOverlay task={activeTask} />
                            ) : activeColumn ? (
                                <ColumnOverlay col={activeColumn} tasks={board[activeColumn.id] ?? []} />
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                )}
            </Container>
        </div>
    );
}