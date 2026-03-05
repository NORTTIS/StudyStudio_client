"use client";

import * as React from "react";
import { ChevronDown, MoreHorizontal, Plus, GripVertical, Pencil, Trash2, X, CircleDot } from "lucide-react";
import { useParams } from "next/navigation";
import { Container } from "@/components/common";
import { createPortal } from "react-dom";

import {
    DndContext,
    type DragEndEvent,
    type DragStartEvent,
    PointerSensor,
    KeyboardSensor,
    DragOverlay,
    closestCorners,
    closestCenter,
    useSensor,
    useSensors,
    useDroppable,
    type CollisionDetection,
    type DroppableContainer
} from "@dnd-kit/core";

import {
    SortableContext,
    useSortable,
    arrayMove,
    verticalListSortingStrategy,
    sortableKeyboardCoordinates
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

// ─── Types ───────────────────────────────────────────────────────────────────

type ColumnId = string;

type Task = {
    id: string;
    title: string;
    statusDot?: "green" | "yellow" | "red";
    tagLeft?: string;
    tagRight?: string;
    due?: string;
};

type Column = {
    id: ColumnId;
    title: string;
    position: number;
};

type ApiResponse<T> = { status?: string; code?: string; message?: string; data?: T };

type TaskStatusDto = {
    position?: number;
    statusId?: string;
    statusName?: string | null;
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

type TaskItemResponse = {
    taskId?: string;
    taskTitle?: string | null;
    dueDate?: string;
    startDate?: string;
    position?: number;
    taskPriority?: number;
    taskSeverity?: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function isUuidLike(v: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function dotClass(statusDot?: Task["statusDot"]) {
    if (statusDot === "green") return "bg-emerald-500";
    if (statusDot === "yellow") return "bg-amber-500";
    if (statusDot === "red") return "bg-rose-500";
    return "bg-emerald-500";
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
    const max = cols.reduce((m, c) => Math.max(m, Number.isFinite(c.position) ? c.position : -1), -1);
    return base === 1 ? Math.max(1, max + 1) : Math.max(0, max + 1);
}

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

function filterDroppablesByType(droppables: DroppableContainer[], allow: string[]) {
    return droppables.filter((d) => {
        const t = d.data?.current?.type;
        return typeof t === "string" && allow.includes(t);
    });
}

// ─── API helpers ─────────────────────────────────────────────────────────────

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
        return { json: JSON.parse(text.replace(/^\uFEFF/, "")), text };
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
    return msg || (text ?? "").toString().trim() || "Đã xảy ra lỗi";
};

function getApiBase() {
    return String(process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
}

function getAccessTokenOrNull() {
    if (typeof window === "undefined") return null;
    const t = localStorage.getItem("accessToken");
    return t ? String(t) : null;
}

async function apiGetGroupDetail(groupId: string) {
    const apiBase = getApiBase();
    const token = getAccessTokenOrNull();
    if (!apiBase) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");
    const res = await fetch(`${apiBase}/group/${encodeURIComponent(groupId)}/detail`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "text/plain, application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });
    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);
    if (!res.ok || (json && !okByJsonStatus(json))) throw new Error(extractApiMessage(raw, json));
    return (json ?? null) as ApiResponse<GroupDetailResponse> | null;
}

async function apiReorderGroupTaskStatus(args: {
    groupId: string;
    statusId: string;
    prevStatusId: string | null;
    nextStatusId: string | null;
}) {
    const apiBase = getApiBase();
    const token = getAccessTokenOrNull();
    if (!apiBase) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");
    if (!isUuidLike(args.groupId)) throw new Error("groupId không hợp lệ.");
    const res = await fetch(`${apiBase}/GroupTaskStatus/${encodeURIComponent(args.groupId)}/reorder`, {
        method: "PUT",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
            statusId: args.statusId,
            prevStatusId: args.prevStatusId,
            nextStatusId: args.nextStatusId
        })
    });
    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);
    if (!res.ok || !(json ? okByJsonStatus(json) : true)) throw new Error(extractApiMessage(raw, json));
    return true;
}

async function apiCreateGroupTaskStatus(args: { groupId: string; statusName: string; position: number }) {
    const apiBase = getApiBase();
    const token = getAccessTokenOrNull();
    if (!apiBase) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");
    if (!isUuidLike(args.groupId)) throw new Error("groupId không hợp lệ.");
    const payload = {
        statusName: String(args.statusName ?? "").trim(),
        position: Math.max(0, Math.trunc(args.position))
    };
    if (!payload.statusName) throw new Error("Vui lòng nhập tên trạng thái.");
    const res = await fetch(`${apiBase}/GroupTaskStatus/${encodeURIComponent(args.groupId)}`, {
        method: "POST",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
    });
    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);
    if (!res.ok || !(json ? okByJsonStatus(json) : true)) throw new Error(extractApiMessage(raw, json));
    return (json ?? raw) as ApiResponse<GroupTaskStatusData> | string;
}

async function apiCreateTask(args: { groupId: string; groupStatusId: string; taskName: string }) {
    const apiBase = getApiBase();
    const token = getAccessTokenOrNull();
    if (!apiBase) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");
    if (!isUuidLike(args.groupId)) throw new Error("groupId không hợp lệ.");
    if (!isUuidLike(args.groupStatusId)) throw new Error("groupStatusId không hợp lệ.");
    const res = await fetch(`${apiBase}/Task`, {
        method: "POST",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
            groupId: args.groupId,
            groupStatusId: args.groupStatusId,
            taskName: String(args.taskName ?? "").trim()
        })
    });
    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);
    if (!res.ok || !(json ? okByJsonStatus(json) : true)) throw new Error(extractApiMessage(raw, json));
    return (json ?? null) as ApiResponse<TaskItemResponse> | null;
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
    if (!isUuidLike(args.groupId)) throw new Error("groupId không hợp lệ.");
    if (!isUuidLike(args.statusId)) throw new Error("statusId không hợp lệ.");
    const res = await fetch(
        `${apiBase}/GroupTaskStatus/${encodeURIComponent(args.groupId)}/${encodeURIComponent(args.statusId)}`,
        {
            method: "PUT",
            credentials: "include",
            headers: {
                Accept: "text/plain, application/json",
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
                position: Math.max(0, Math.trunc(args.position)),
                statusName: String(args.statusName ?? "").trim()
            })
        }
    );
    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);
    if (!res.ok || !(json ? okByJsonStatus(json) : true)) throw new Error(extractApiMessage(raw, json));
    return true;
}

async function apiDeleteGroupTaskStatus(args: { groupId: string; statusId: string }) {
    const apiBase = getApiBase();
    const token = getAccessTokenOrNull();
    if (!apiBase) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");
    if (!isUuidLike(args.groupId)) throw new Error("groupId không hợp lệ.");
    if (!isUuidLike(args.statusId)) throw new Error("statusId không hợp lệ.");
    const res = await fetch(
        `${apiBase}/GroupTaskStatus/${encodeURIComponent(args.statusId)}/group/${encodeURIComponent(args.groupId)}`,
        {
            method: "DELETE",
            credentials: "include",
            headers: { Accept: "text/plain, application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        }
    );
    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);
    if (!res.ok || !(json ? okByJsonStatus(json) : true)) throw new Error(extractApiMessage(raw, json));
    return true;
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────

function ConfirmModal({
    open,
    title,
    description,
    confirmLabel = "Xác nhận",
    cancelLabel = "Hủy",
    onConfirm,
    onCancel
}: {
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);
    React.useEffect(() => {
        if (!open) return;
        const fn = (e: KeyboardEvent) => {
            if (e.key === "Escape") onCancel();
        };
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, [open, onCancel]);

    if (!open || !mounted) return null;
    return createPortal(
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            onPointerDown={(e) => {
                if (e.target === e.currentTarget) onCancel();
            }}>
            <div
                className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
                onPointerDown={(e) => e.stopPropagation()}>
                <h2 className="text-base font-bold text-zinc-900">{title}</h2>
                <p className="mt-2 text-sm text-zinc-600 leading-relaxed">{description}</p>
                <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 transition">
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition">
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

// ─── PortalDropdown ───────────────────────────────────────────────────────────

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
    const [pos, setPos] = React.useState({ top: 0, left: 0, width: 208 });
    React.useEffect(() => setMounted(true), []);

    const syncPos = React.useCallback(() => {
        const a = anchorRef.current;
        if (!a) return;
        const r = a.getBoundingClientRect();
        const width = 208;
        setPos({ top: r.bottom + 8, left: Math.max(8, r.right - width), width });
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
        const onPD = (e: PointerEvent) => {
            const t = e.target as Node | null;
            if (!t) return;
            if (menuRef.current?.contains(t)) return;
            if (anchorRef.current?.contains(t)) return;
            onClose();
        };
        const onKD = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("pointerdown", onPD, true);
        window.addEventListener("keydown", onKD);
        return () => {
            window.removeEventListener("pointerdown", onPD, true);
            window.removeEventListener("keydown", onKD);
        };
    }, [open, onClose, anchorRef]);

    if (!open || !mounted) return null;
    return createPortal(
        <div
            ref={menuRef}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
            className="z-[9999] rounded-xl border border-zinc-200 bg-white p-1 shadow-lg">
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
                danger ? "text-rose-600 hover:bg-rose-50" : "text-zinc-700 hover:bg-zinc-100"
            )}>
            <span className="grid h-5 w-5 place-items-center">{icon}</span>
            <span className="font-medium">{label}</span>
        </button>
    );
}

// ─── AddTaskInline ────────────────────────────────────────────────────────────

function AddTaskInline({ disabled, onSubmit }: { disabled: boolean; onSubmit: (title: string) => Promise<void> }) {
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
        const trimmed = title.trim();
        if (!trimmed) {
            setError("Vui lòng nhập tên công việc.");
            inputRef.current?.focus();
            return;
        }
        try {
            setError(null);
            await onSubmit(trimmed);
            close();
        } catch (e: any) {
            setError(e?.message ?? "Tạo công việc thất bại");
            inputRef.current?.focus();
        }
    };

    if (!open)
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                disabled={disabled}
                className={cn(
                    "flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 transition border-t border-zinc-100",
                    disabled && "opacity-60 pointer-events-none"
                )}>
                <Plus className="h-4 w-4" /> Thêm công việc
            </button>
        );

    return (
        <div className="border-t border-zinc-100 px-4 py-3">
            <div className="flex items-center gap-2">
                <input
                    ref={inputRef}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            void submit();
                        }
                        if (e.key === "Escape") {
                            e.preventDefault();
                            close();
                        }
                    }}
                    disabled={disabled}
                    placeholder="Nhập tên công việc..."
                    className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                />
                <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={disabled}
                    className={cn(
                        "rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition",
                        disabled && "opacity-60 pointer-events-none"
                    )}>
                    Lưu
                </button>
                <button
                    type="button"
                    onClick={close}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100">
                    <X className="h-4 w-4" />
                </button>
            </div>
            {error ? <div className="mt-1 text-xs font-medium text-rose-600">{error}</div> : null}
        </div>
    );
}

// ─── AddColumnInline ──────────────────────────────────────────────────────────

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
        const trimmed = title.trim();
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

    if (!open)
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex w-full items-center gap-2 rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition">
                <Plus className="h-4 w-4" /> Tạo mới trạng thái
            </button>
        );

    return (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <input
                ref={inputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        void submit();
                    }
                    if (e.key === "Escape") {
                        e.preventDefault();
                        close();
                    }
                }}
                disabled={isSubmitting}
                placeholder="Nhập tên trạng thái..."
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
            />
            {error ? <div className="mt-2 text-xs font-medium text-rose-600">{error}</div> : null}
            <div className="mt-3 flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={isSubmitting}
                    className={cn(
                        "rounded-xl px-3 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition",
                        isSubmitting && "opacity-60 pointer-events-none"
                    )}>
                    Thêm trạng thái
                </button>
                <button
                    type="button"
                    onClick={close}
                    disabled={isSubmitting}
                    className={cn(
                        "grid h-9 w-9 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 transition",
                        isSubmitting && "opacity-60 pointer-events-none"
                    )}>
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

// ─── SortableTaskRow ──────────────────────────────────────────────────────────

function SortableTaskRow({
    task,
    columnId,
    onStartEdit,
    onDelete
}: {
    task: Task;
    columnId: ColumnId;
    onStartEdit: () => void;
    onDelete: () => void;
}) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
        id: task.id,
        data: { type: "task", columnId }
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.25 : 1
    };

    const [openMenu, setOpenMenu] = React.useState(false);
    const btnRef = React.useRef<HTMLButtonElement | null>(null);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="group grid grid-cols-12 items-center gap-3 border-t border-zinc-100 px-4 py-3 hover:bg-zinc-50 transition">
            {/* Drag + dot + title */}
            <div className="col-span-6 flex items-center gap-3 min-w-0">
                <div className={cn("h-2 w-2 shrink-0 rounded-full", dotClass(task.statusDot))} />
                <div
                    ref={setActivatorNodeRef}
                    {...attributes}
                    {...listeners}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-400 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing select-none transition">
                    <GripVertical className="h-4 w-4" />
                </div>
                <span className="truncate text-sm font-medium text-zinc-900">{task.title}</span>
            </div>

            {/* Tags */}
            <div className="col-span-3 flex flex-wrap gap-1">
                {task.tagLeft ? (
                    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                        {task.tagLeft}
                    </span>
                ) : null}
                {task.tagRight ? (
                    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                        {task.tagRight}
                    </span>
                ) : null}
            </div>

            {/* Due */}
            <div className="col-span-2">
                {task.due ? (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-600">
                        <CircleDot className="h-3 w-3" /> {task.due}
                    </span>
                ) : (
                    <span className="text-xs text-zinc-400">—</span>
                )}
            </div>

            {/* Menu */}
            <div className="col-span-1 flex justify-end">
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
                    className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100 opacity-0 group-hover:opacity-100 transition"
                    aria-label="Menu">
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
    );
}

// ─── EditTaskInline (overlay edit inside list) ────────────────────────────────

function EditTaskRow({
    task,
    draft,
    onDraftChange,
    onCommit,
    onCancel
}: {
    task: Task;
    draft: string;
    onDraftChange: (v: string) => void;
    onCommit: () => void;
    onCancel: () => void;
}) {
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    React.useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 0);
    }, []);

    return (
        <div className="grid grid-cols-12 items-center gap-3 border-t border-zinc-100 bg-indigo-50/40 px-4 py-3">
            <div className="col-span-6 flex items-center gap-3 min-w-0">
                <div className={cn("h-2 w-2 shrink-0 rounded-full", dotClass(task.statusDot))} />
                <div className="w-7 shrink-0" />
                <input
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => onDraftChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            onCommit();
                        }
                        if (e.key === "Escape") {
                            e.preventDefault();
                            onCancel();
                        }
                    }}
                    className="flex-1 min-w-0 rounded-lg border border-indigo-300 bg-white px-2 py-1 text-sm font-medium text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-200"
                />
            </div>
            <div className="col-span-6 flex items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={onCommit}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">
                    Lưu
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="grid h-7 w-7 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100">
                    <X className="h-3.5 w-3.5" />
                </button>
                <span className="text-[11px] text-zinc-400">Enter lưu • Esc huỷ</span>
            </div>
        </div>
    );
}

// ─── ColumnDropZone ───────────────────────────────────────────────────────────

function ColumnDropZone({
    colId,
    isOver,
    setNodeRef,
    children
}: {
    colId: ColumnId;
    isOver: boolean;
    setNodeRef: (node: HTMLElement | null) => void;
    children: React.ReactNode;
}) {
    return (
        <div ref={setNodeRef} className={cn("transition", isOver && "bg-indigo-50/50")}>
            {children}
        </div>
    );
}

// ─── SortableSection ──────────────────────────────────────────────────────────

function SortableSection({
    col,
    tasks,
    taskIds,
    groupId,
    creatingTask,
    onCreateTask,
    onRename,
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
    groupId: string;
    creatingTask: boolean;
    onCreateTask: (colId: ColumnId, title: string) => Promise<void>;
    onRename: (colId: ColumnId) => void;
    onDeleteColumn: (colId: ColumnId) => void;
    taskEditState: { taskId: string | null; columnId: string | null; draft: string };
    onTaskStartEdit: (taskId: string, columnId: ColumnId, title: string) => void;
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
        attributes,
        listeners,
        setNodeRef: setSortableRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: col.id,
        data: { type: "column" }
    });

    const dropId = `drop:${col.id}`;
    const { setNodeRef: setDropRef, isOver } = useDroppable({
        id: dropId,
        data: { type: "column-drop", columnId: col.id }
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition: transition ?? "transform 180ms cubic-bezier(0.2,0.8,0.2,1)",
        opacity: isDragging ? 0.3 : 1
    };

    const [open, setOpen] = React.useState(true);
    const [openColMenu, setOpenColMenu] = React.useState(false);
    const colMenuBtnRef = React.useRef<HTMLButtonElement | null>(null);
    const colInputRef = React.useRef<HTMLInputElement | null>(null);
    React.useEffect(() => {
        if (isColumnEditing) setTimeout(() => colInputRef.current?.focus(), 0);
    }, [isColumnEditing]);

    return (
        <div
            ref={setSortableRef}
            style={style}
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex flex-1 items-center gap-3 min-w-0">
                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        className="shrink-0 text-zinc-400 hover:text-zinc-600 transition">
                        <ChevronDown className={cn("h-4 w-4 transition-transform", open ? "rotate-0" : "-rotate-90")} />
                    </button>

                    <div
                        ref={setActivatorNodeRef}
                        {...attributes}
                        {...listeners}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-500 opacity-70 hover:opacity-100 cursor-grab active:cursor-grabbing select-none">
                        <GripVertical className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                        {!isColumnEditing ? (
                            <button type="button" onClick={() => onRename(col.id)} className="w-full text-left">
                                <p className="truncate text-sm font-bold text-zinc-900 hover:underline">{col.title}</p>
                            </button>
                        ) : (
                            <div className="space-y-0.5">
                                <input
                                    ref={colInputRef}
                                    value={columnDraft}
                                    onChange={(e) => onColumnDraftChange(e.target.value)}
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
                                    onBlur={() => setTimeout(() => onColumnCommit(), 0)}
                                    className={cn(
                                        "h-8 w-full rounded-lg border bg-white px-2 text-sm font-bold text-zinc-900 outline-none",
                                        columnError
                                            ? "border-rose-300 focus:ring-2 focus:ring-rose-100"
                                            : "border-zinc-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200",
                                        "select-text"
                                    )}
                                    style={{ maxWidth: 220 }}
                                />
                                {columnError ? <div className="text-[11px] text-rose-600">{columnError}</div> : null}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 px-2 text-xs font-semibold text-zinc-600">
                        {tasks.length}
                    </span>
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
                        className="grid h-8 w-8 place-items-center rounded-xl text-zinc-500 hover:bg-zinc-100"
                        aria-label="Column menu">
                        <MoreHorizontal className="h-4 w-4" />
                    </button>
                    <PortalDropdown
                        open={openColMenu}
                        onClose={() => setOpenColMenu(false)}
                        anchorRef={colMenuBtnRef as any}>
                        <MenuItem
                            icon={<Pencil className="h-4 w-4" />}
                            label="Chỉnh sửa"
                            onClick={() => {
                                setOpenColMenu(false);
                                onRename(col.id);
                            }}
                        />
                        <MenuItem
                            icon={<Trash2 className="h-4 w-4" />}
                            label="Xóa"
                            danger
                            onClick={() => {
                                setOpenColMenu(false);
                                onDeleteColumn(col.id);
                            }}
                        />
                    </PortalDropdown>
                </div>
            </div>

            {/* Body */}
            {open && (
                <>
                    {/* Column header row */}
                    <div className="grid grid-cols-12 gap-3 border-t border-zinc-100 bg-zinc-50 px-4 py-2 text-xs font-medium text-zinc-500">
                        <div className="col-span-6">Công việc</div>
                        <div className="col-span-3">Nhãn</div>
                        <div className="col-span-2">Hạn hoàn thành</div>
                        <div className="col-span-1" />
                    </div>

                    <ColumnDropZone colId={col.id} isOver={isOver} setNodeRef={setDropRef}>
                        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                            {tasks.map((task) => {
                                const isEditing = taskEditState.taskId === task.id && taskEditState.columnId === col.id;
                                if (isEditing) {
                                    return (
                                        <EditTaskRow
                                            key={task.id}
                                            task={task}
                                            draft={taskEditState.draft}
                                            onDraftChange={onTaskDraftChange}
                                            onCommit={onTaskCommitEdit}
                                            onCancel={onTaskCancelEdit}
                                        />
                                    );
                                }
                                return (
                                    <SortableTaskRow
                                        key={task.id}
                                        task={task}
                                        columnId={col.id}
                                        onStartEdit={() => onTaskStartEdit(task.id, col.id, task.title)}
                                        onDelete={() => onDeleteTask(task.id, col.id)}
                                    />
                                );
                            })}
                            {tasks.length === 0 && (
                                <div className="px-4 py-8 text-center text-sm text-zinc-400 border-t border-zinc-100">
                                    Chưa có công việc. Thêm mới bên dưới.
                                </div>
                            )}
                        </SortableContext>
                    </ColumnDropZone>

                    <AddTaskInline disabled={creatingTask} onSubmit={(title) => onCreateTask(col.id, title)} />
                </>
            )}
        </div>
    );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function GroupListScreen() {
    const params = useParams<{ groupId: string }>();
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

    const [editingColumn, setEditingColumn] = React.useState<{
        id: string | null;
        draft: string;
        error: string | null;
    }>({ id: null, draft: "", error: null });
    const [editingTask, setEditingTask] = React.useState<{
        taskId: string | null;
        columnId: string | null;
        draft: string;
    }>({ taskId: null, columnId: null, draft: "" });
    const [confirmModal, setConfirmModal] = React.useState<{
        open: boolean;
        columnId: ColumnId | null;
        columnTitle: string;
    }>({ open: false, columnId: null, columnTitle: "" });

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const syncColumnsFromDetail = React.useCallback((detail: GroupDetailResponse | undefined) => {
        const statuses = (detail?.taskStatuses ?? [])
            .filter((s) => typeof s?.statusId === "string" && !!s.statusId)
            .map((s) => ({
                id: String(s.statusId),
                title: String(s.statusName ?? ""),
                position: Number.isFinite(s.position) ? (s.position as number) : 0
            }))
            .sort((a, b) => a.position - b.position);
        setColumns(statuses);
        setBoard((prev) => {
            const next: Record<string, Task[]> = {};
            for (const c of statuses) next[c.id] = prev[c.id] ?? [];
            return next;
        });
    }, []);

    const refresh = React.useCallback(async () => {
        if (!groupId) {
            setLoading(false);
            setLoadError("Thiếu groupId trong route.");
            return;
        }
        if (!isUuidLike(groupId)) {
            setLoading(false);
            setLoadError("groupId không hợp lệ.");
            return;
        }
        if (!getApiBase()) {
            setLoading(false);
            setLoadError("Thiếu NEXT_PUBLIC_API_BASE_URL.");
            return;
        }
        setLoading(true);
        setLoadError(null);
        try {
            const detail = await apiGetGroupDetail(groupId);
            syncColumnsFromDetail(detail?.data);
        } catch (e: any) {
            setLoadError(e?.message ?? "Không tải được dữ liệu.");
        } finally {
            setLoading(false);
        }
    }, [groupId, syncColumnsFromDetail]);

    React.useEffect(() => {
        void refresh();
    }, [refresh]);

    const activeTask = React.useMemo(
        () => (activeTaskId ? findTask(board, columns, activeTaskId) : null),
        [activeTaskId, board, columns]
    );
    const activeColumn = React.useMemo(
        () => (activeColumnId ? (columns.find((c) => c.id === activeColumnId) ?? null) : null),
        [activeColumnId, columns]
    );

    // ── Column CRUD ──────────────────────────────────────────────────────────
    const submitAddColumn = async (title: string) => {
        if (!groupId || !isUuidLike(groupId)) throw new Error("groupId không hợp lệ.");
        if (columns.some((c) => c.title.trim().toLowerCase() === title.trim().toLowerCase()))
            throw new Error("Tên trạng thái đã tồn tại.");
        const base = detectPositionBase(columns) as 0 | 1;
        setCreatingColumn(true);
        try {
            await apiCreateGroupTaskStatus({
                groupId,
                statusName: title,
                position: nextPositionForCreate(columns, base)
            });
            await refresh();
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
            setEditingColumn((p) => ({ ...p, error: "Tên trạng thái đã tồn tại." }));
            return;
        }
        const prevTitle = col.title;
        setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, title: next } : c)));
        try {
            await apiRenameGroupTaskStatus({ groupId, statusId: id, statusName: next, position: col.position });
            cancelEditColumn();
            await refresh();
        } catch (e: any) {
            setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, title: prevTitle } : c)));
            setEditingColumn((p) => ({ ...p, error: e?.message ?? "Đã xảy ra lỗi" }));
        }
    };

    const onDeleteColumn = (columnId: ColumnId) => {
        const col = columns.find((c) => c.id === columnId);
        if (!col) return;
        setConfirmModal({ open: true, columnId, columnTitle: col.title });
    };

    const handleConfirmDeleteColumn = async () => {
        const columnId = confirmModal.columnId;
        setConfirmModal({ open: false, columnId: null, columnTitle: "" });
        if (!columnId || !groupId) return;
        const prevCols = columns;
        const prevBoard = board;
        const base = detectPositionBase(columns) as 0 | 1;
        setColumns(
            assignPositions(
                columns.filter((c) => c.id !== columnId),
                base
            )
        );
        setBoard((prev) => {
            const next = { ...prev };
            delete next[columnId];
            return next;
        });
        try {
            await apiDeleteGroupTaskStatus({ groupId, statusId: columnId });
            await refresh();
        } catch (e: any) {
            setColumns(prevCols);
            setBoard(prevBoard);
            alert(e?.message ?? "Đã xảy ra lỗi");
        }
    };

    // ── Task CRUD ────────────────────────────────────────────────────────────
    const onCreateTask = async (columnId: ColumnId, title: string) => {
        if (!groupId || !isUuidLike(groupId)) throw new Error("groupId không hợp lệ.");
        if (!isUuidLike(columnId)) throw new Error("columnId không hợp lệ.");
        setCreatingTask(true);
        try {
            const created = await apiCreateTask({ groupId, groupStatusId: columnId, taskName: title });
            const id = created?.data?.taskId ? String(created.data.taskId) : `task_${Date.now().toString(16)}`;
            const next: Task = {
                id,
                title: created?.data?.taskTitle ?? title,
                statusDot: "green",
                tagLeft: "TASK",
                tagRight: "SS",
                due: created?.data?.dueDate ?? ""
            };
            setBoard((prev) => ({ ...prev, [columnId]: [next, ...(prev[columnId] ?? [])] }));
        } finally {
            setCreatingTask(false);
        }
    };

    const onTaskStartEdit = (taskId: string, columnId: ColumnId, title: string) =>
        setEditingTask({ taskId, columnId, draft: title });
    const onTaskCancelEdit = () => setEditingTask({ taskId: null, columnId: null, draft: "" });
    const onTaskCommitEdit = () => {
        const { taskId, columnId, draft } = editingTask;
        if (!taskId || !columnId) return;
        const next = draft.trim();
        if (!next) {
            onTaskCancelEdit();
            return;
        }
        setBoard((prev) => ({
            ...prev,
            [columnId]: (prev[columnId] ?? []).map((t) => (t.id === taskId ? { ...t, title: next } : t))
        }));
        onTaskCancelEdit();
    };
    const onDeleteTask = (taskId: string, columnId: ColumnId) => {
        setBoard((prev) => ({ ...prev, [columnId]: (prev[columnId] ?? []).filter((t) => t.id !== taskId) }));
        if (editingTask.taskId === taskId) onTaskCancelEdit();
    };

    // ── DnD ─────────────────────────────────────────────────────────────────
    const collisionDetection: CollisionDetection = React.useCallback((args) => {
        const activeType = args.active.data.current?.type;
        if (activeType === "column")
            return closestCenter({
                ...args,
                droppableContainers: filterDroppablesByType(args.droppableContainers, ["column"])
            });
        return closestCorners({
            ...args,
            droppableContainers: filterDroppablesByType(args.droppableContainers, ["task", "column-drop"])
        });
    }, []);

    const handleDragStart = (e: DragStartEvent) => {
        const type = e.active.data.current?.type;
        if (type === "task") setActiveTaskId(String(e.active.id));
        if (type === "column") setActiveColumnId(String(e.active.id));
    };

    const handleDragEnd = (e: DragEndEvent) => {
        const activeType = e.active.data.current?.type;
        const overRaw = e.over?.id ? String(e.over.id) : null;
        setActiveTaskId(null);
        setActiveColumnId(null);
        if (!overRaw) return;

        if (activeType === "task") {
            const activeId = String(e.active.id);
            const overKey = overRaw.startsWith("drop:") ? overRaw.replace("drop:", "") : overRaw;
            const fromCol = findColumnOfTask(board, columns, activeId);
            if (!fromCol) return;
            let toCol: ColumnId | null = columns.some((c) => c.id === overKey)
                ? overKey
                : findColumnOfTask(board, columns, overKey);
            if (!toCol) return;

            setBoard((prev) => {
                const fromTasks = [...(prev[fromCol] ?? [])];
                const toTasks = fromCol === toCol ? fromTasks : [...(prev[toCol!] ?? [])];
                const fromIdx = fromTasks.findIndex((t) => t.id === activeId);
                if (fromIdx === -1) return prev;
                if (fromCol === toCol) {
                    const toIdx = fromTasks.findIndex((t) => t.id === overKey);
                    if (toIdx === -1 || fromIdx === toIdx) return prev;
                    return { ...prev, [fromCol]: arrayMove(fromTasks, fromIdx, toIdx) };
                }
                const [moving] = fromTasks.splice(fromIdx, 1);
                const overIsTask = toTasks.some((t) => t.id === overKey);
                if (overIsTask) {
                    const idx = toTasks.findIndex((t) => t.id === overKey);
                    toTasks.splice(Math.max(0, idx), 0, moving);
                } else toTasks.unshift(moving);
                return { ...prev, [fromCol]: fromTasks, [toCol!]: toTasks };
            });
            return;
        }

        if (activeType === "column") {
            if (!groupId) return;
            const activeColId = String(e.active.id);
            let overColId = overRaw.startsWith("drop:") ? overRaw.replace("drop:", "") : overRaw;
            if (!columns.some((c) => c.id === overColId)) {
                const m = findColumnOfTask(board, columns, overColId);
                if (m) overColId = m;
            }
            if (!columns.some((c) => c.id === overColId) || activeColId === overColId) return;
            const oldIndex = columns.findIndex((c) => c.id === activeColId);
            const newIndex = columns.findIndex((c) => c.id === overColId);
            if (oldIndex === -1 || newIndex === -1) return;
            const prevCols = columns;
            const nextCols = arrayMove(columns, oldIndex, newIndex);
            setColumns(nextCols);
            void (async () => {
                try {
                    await apiReorderGroupTaskStatus({
                        groupId,
                        statusId: activeColId,
                        prevStatusId: newIndex > 0 ? nextCols[newIndex - 1].id : null,
                        nextStatusId: newIndex < nextCols.length - 1 ? nextCols[newIndex + 1].id : null
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

    const onColumnDraftChange = (v: string) => {
        setEditingColumn((p) => {
            const trimmed = v.trim();
            if (!trimmed) return { ...p, draft: v, error: "Vui lòng nhập tên trạng thái." };
            const dup = columns.some((c) => c.id !== p.id && c.title.trim().toLowerCase() === trimmed.toLowerCase());
            return { ...p, draft: v, error: dup ? "Tên trạng thái đã tồn tại." : null };
        });
    };

    // ── Render ───────────────────────────────────────────────────────────────

    if (loading)
        return (
            <div className="min-h-screen bg-zinc-50">
                <Container>
                    <div className="mt-6 rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-sm text-zinc-700">
                        Đang tải dữ liệu…
                    </div>
                </Container>
            </div>
        );

    if (loadError)
        return (
            <div className="min-h-screen bg-zinc-50">
                <Container>
                    <div className="mt-6 rounded-2xl border border-rose-200 bg-white px-4 py-4 text-sm text-rose-700">
                        {loadError}
                    </div>
                    <div className="mt-3">
                        <button
                            type="button"
                            onClick={() => void refresh()}
                            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100">
                            Tải lại
                        </button>
                    </div>
                </Container>
            </div>
        );

    const sectionProps = (col: Column) => ({
        col,
        tasks: board[col.id] ?? [],
        taskIds: taskIdsByCol[col.id] ?? [],
        groupId,
        creatingTask,
        onCreateTask,
        onRename: startEditColumn,
        onDeleteColumn,
        taskEditState: editingTask,
        onTaskStartEdit,
        onTaskCancelEdit,
        onTaskDraftChange: (v: string) => setEditingTask((p) => ({ ...p, draft: v })),
        onTaskCommitEdit,
        onDeleteTask,
        isColumnEditing: editingColumn.id === col.id,
        columnDraft: editingColumn.id === col.id ? editingColumn.draft : "",
        columnError: editingColumn.id === col.id ? editingColumn.error : null,
        onColumnDraftChange,
        onColumnCommit: () => void commitEditColumn(),
        onColumnCancel: cancelEditColumn
    });

    return (
        <div className="min-h-screen bg-zinc-50">
            <ConfirmModal
                open={confirmModal.open}
                title="Xác nhận xóa trạng thái"
                description={`Bạn có chắc chắn muốn xóa trạng thái "${confirmModal.columnTitle}" không? Hành động này không thể hoàn tác.`}
                confirmLabel="Xóa trạng thái"
                cancelLabel="Hủy"
                onConfirm={() => void handleConfirmDeleteColumn()}
                onCancel={() => setConfirmModal({ open: false, columnId: null, columnTitle: "" })}
            />

            <Container>
                {!mounted ? (
                    // SSR fallback — no dnd hooks
                    <div className="mt-5 flex flex-col gap-4 pb-6">
                        {columns.map((col) => (
                            <SortableSection key={col.id} {...sectionProps(col)} />
                        ))}
                        <AddColumnInline isSubmitting={creatingColumn} onSubmit={submitAddColumn} />
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={collisionDetection}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}>
                        <SortableContext items={columnIds} strategy={verticalListSortingStrategy}>
                            <div className="mt-5 flex flex-col gap-4 pb-6">
                                {columns.map((col) => (
                                    <SortableSection key={col.id} {...sectionProps(col)} />
                                ))}
                                <AddColumnInline isSubmitting={creatingColumn} onSubmit={submitAddColumn} />
                            </div>
                        </SortableContext>

                        <DragOverlay>
                            {activeTask ? (
                                <div className="rounded-xl border border-indigo-200 bg-white px-4 py-3 shadow-xl text-sm font-medium text-zinc-900">
                                    {activeTask.title}
                                </div>
                            ) : activeColumn ? (
                                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-xl opacity-90">
                                    <p className="text-sm font-bold text-zinc-900">{activeColumn.title}</p>
                                    <p className="text-xs text-zinc-500">Đang di chuyển trạng thái…</p>
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                )}
            </Container>
        </div>
    );
}
