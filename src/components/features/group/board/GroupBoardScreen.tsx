"use client";

import * as React from "react";
import { Plus, MoreHorizontal, GripVertical, CircleDot, Pencil, Trash2, X } from "lucide-react";
import { useParams } from "next/navigation";
import { Container } from "@/components/common";
import TaskFormModal, { type TaskFormValues, type TaskFormOption } from "@/components/features/group/task/TaskForm";

import {
    DndContext,
    type DragEndEvent,
    type DragStartEvent,
    type DragOverEvent,
    type DragCancelEvent,
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
    horizontalListSortingStrategy,
    sortableKeyboardCoordinates
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";
import { createPortal } from "react-dom";

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

/** ✅ Task item từ API */
type TaskItemResponse = {
    taskId?: string;
    taskTitle?: string | null;
    dueDate?: string;
    startDate?: string;
    position?: number;
    taskPriority?: number;
    taskSeverity?: number;
};

/** ✅ FIX: thêm taskList để lấy tasks từ /group/{groupId}/detail */
type TaskStatusDto = {
    position?: number;
    statusId?: string;
    statusName?: string | null;
    taskList?: TaskItemResponse[] | null; // ✅ quan trọng
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

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function dotClass(statusDot?: Task["statusDot"]) {
    if (statusDot === "green") return "bg-emerald-500";
    if (statusDot === "yellow") return "bg-amber-500";
    if (statusDot === "red") return "bg-rose-500";
    return "bg-emerald-500";
}

function isUuidLike(v: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function detectPositionBase(cols: Column[]) {
    if (!cols.length) return 0;
    const positions = cols
        .map((c) => (Number.isFinite(c.position) ? c.position : 0))
        .filter((x) => Number.isFinite(x));

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

function getAccessTokenOrNull() {
    if (typeof window === "undefined") return null;
    const t = localStorage.getItem("accessToken");
    return t ? String(t) : null;
}

async function apiGetGroupDetail(groupId: string) {
    const apiBase = getApiBase();
    const accessToken = getAccessTokenOrNull();
    if (!apiBase) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");

    const url = `${apiBase}/group/${encodeURIComponent(groupId)}/detail`;

    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        cache: "no-store"
    });

    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);

    if (!res.ok || (json && !okByJsonStatus(json))) {
        const msg = extractApiMessage(raw, json);
        const code = json?.code ? ` (${json.code})` : "";
        throw new Error(`${msg}${code}`);
    }

    return (json ?? null) as ApiResponse<GroupDetailResponse> | null;
}

async function apiReorderGroupTaskStatus(args: { groupId: string; statusId: string; prevStatusId: string | null; nextStatusId: string | null }) {
    const apiBase = getApiBase();
    const accessToken = getAccessTokenOrNull();

    if (!apiBase) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");
    if (!args.groupId || !isUuidLike(args.groupId)) throw new Error("groupId không hợp lệ (không phải UUID).");

    const url = `${apiBase}/GroupTaskStatus/${encodeURIComponent(args.groupId)}/reorder`;

    const res = await fetch(url, {
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

    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);
    const okJson = !json || okByJsonStatus(json);

    if (!res.ok || !okJson) throw new Error(extractApiMessage(raw, json));
    return true;
}

async function apiCreateGroupTaskStatus(args: { groupId: string; statusName: string; position: number }) {
    const apiBase = getApiBase();
    const accessToken = getAccessTokenOrNull();
    if (!apiBase) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");
    if (!args.groupId || !isUuidLike(args.groupId)) throw new Error("groupId không hợp lệ (không phải UUID).");

    const url = `${apiBase}/GroupTaskStatus/${encodeURIComponent(args.groupId)}`;
    const payload = {
        statusName: String(args.statusName ?? "").trim(),
        position: Number.isFinite(args.position) ? Math.max(0, Math.trunc(args.position)) : 0
    };

    if (!payload.statusName) throw new Error("Vui lòng nhập tên trạng thái.");

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify(payload)
    });

    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);
    const okJson = !json || okByJsonStatus(json);

    if (!res.ok || !okJson) throw new Error(extractApiMessage(raw, json));
    return (json ?? raw) as ApiResponse<GroupTaskStatusData> | string;
}

async function apiCreateTask(args: { groupId: string; groupStatusId: string; taskName: string }) {
    const apiBase = getApiBase();
    const accessToken = getAccessTokenOrNull();
    if (!apiBase) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");
    if (!args.groupId || !isUuidLike(args.groupId)) throw new Error("groupId không hợp lệ (không phải UUID).");
    if (!args.groupStatusId || !isUuidLike(args.groupStatusId)) throw new Error("groupStatusId không hợp lệ (không phải UUID).");

    const url = `${apiBase}/Task`;

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
            groupId: args.groupId,
            groupStatusId: args.groupStatusId,
            taskName: String(args.taskName ?? "").trim()
        })
    });

    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);
    const okJson = !json || okByJsonStatus(json);

    if (!res.ok || !okJson) throw new Error(extractApiMessage(raw, json));
    return (json ?? null) as ApiResponse<TaskItemResponse> | null;
}

async function apiRenameGroupTaskStatus(args: { groupId: string; statusId: string; statusName: string; position: number }) {
    const apiBase = getApiBase();
    const token = getAccessTokenOrNull();
    if (!apiBase) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");
    if (!args.groupId || !isUuidLike(args.groupId)) throw new Error("groupId không hợp lệ (không phải UUID).");
    if (!args.statusId || !isUuidLike(args.statusId)) throw new Error("statusId không hợp lệ (không phải UUID).");

    const url = `${apiBase}/GroupTaskStatus/${encodeURIComponent(args.groupId)}/${encodeURIComponent(args.statusId)}`;

    const res = await fetch(url, {
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

    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);
    const okJson = !json || okByJsonStatus(json);

    if (!res.ok || !okJson) throw new Error(extractApiMessage(raw, json));
    return true;
}

async function apiDeleteGroupTaskStatus(args: { groupId: string; statusId: string }) {
    const apiBase = getApiBase();
    const token = getAccessTokenOrNull();
    if (!apiBase) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");
    if (!args.groupId || !isUuidLike(args.groupId)) throw new Error("groupId không hợp lệ (không phải UUID).");
    if (!args.statusId || !isUuidLike(args.statusId)) throw new Error("statusId không hợp lệ (không phải UUID).");

    const url = `${apiBase}/GroupTaskStatus/${encodeURIComponent(args.statusId)}/group/${encodeURIComponent(args.groupId)}`;

    const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
    });

    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);
    const okJson = !json || okByJsonStatus(json);

    if (!res.ok || !okJson) throw new Error(extractApiMessage(raw, json));
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

function Pill({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-700">
            {children}
        </span>
    );
}

function DuePill({ due }: { due: string }) {
    return (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-600">
            <CircleDot className="h-3.5 w-3.5" />
            Hạn: {due}
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

function ConfirmModal({ open, title, description, confirmLabel = "Xác nhận", cancelLabel = "Hủy", onConfirm, onCancel }: ConfirmModalProps) {
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

    if (!open || !mounted) return null;

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
                <p className="mt-2 text-sm text-zinc-600 leading-relaxed">{description}</p>

                <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 transition"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition"
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

    if (!open || !mounted) return null;

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

function MenuItem({ icon, label, danger, onClick }: { icon: React.ReactNode; label: string; danger?: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm",
                danger ? "text-rose-600 hover:bg-rose-50" : "text-zinc-700 hover:bg-zinc-100"
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

function TaskCard({
    task,
    columnId,
    isEditing,
    draftTitle,
    onDraftChange,
    onStartEdit,
    onCancelEdit,
    onCommitEdit,
    onDelete
}: {
    task: Task;
    columnId: ColumnId;
    isEditing: boolean;
    draftTitle: string;
    onDraftChange: (v: string) => void;
    onStartEdit: () => void;
    onCancelEdit: () => void;
    onCommitEdit: () => void;
    onDelete: () => void;
}) {
    const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({
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

    const taRef = React.useRef<HTMLTextAreaElement | null>(null);
    useAutosizeTextarea(taRef, draftTitle);

    const clickingActionRef = React.useRef(false);

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

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group rounded-2xl border bg-white p-3",
                "border-zinc-200/80 shadow-sm",
                "hover:shadow-md hover:-translate-y-[1px] transition",
                "focus-within:ring-2 focus-within:ring-indigo-200/60"
            )}
        >
            <div className="flex items-start gap-2">
                <div className="mt-0.5 flex items-center gap-2">
                    <div className={cn("h-2.5 w-2.5 rounded-full", dotClass(task.statusDot))} />
                    <div
                        ref={setActivatorNodeRef}
                        {...attributes}
                        {...listeners}
                        className={cn(
                            "grid h-7 w-7 place-items-center rounded-xl",
                            "border border-zinc-200/70 bg-white",
                            "text-zinc-500 opacity-80 group-hover:opacity-100",
                            "hover:bg-zinc-50 transition",
                            "cursor-grab active:cursor-grabbing select-none"
                        )}
                        title="Kéo để di chuyển"
                    >
                        <GripVertical className="h-4 w-4" />
                    </div>
                </div>

                <div className="min-w-0 flex-1">
                    {!isEditing ? (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onStartEdit();
                            }}
                            className="w-full text-left"
                        >
                            <p className="line-clamp-2 text-sm font-semibold text-zinc-900 hover:underline">{task.title}</p>
                        </button>
                    ) : (
                        <div className="space-y-2" onPointerDownCapture={(e) => e.stopPropagation()}>
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
                                    "w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 outline-none",
                                    "focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200",
                                    "select-text"
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
                                    className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
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

                                <span className="text-[11px] text-zinc-500">Enter để lưu • Shift+Enter xuống dòng • Esc để huỷ</span>
                            </div>
                        </div>
                    )}

                    <div className="mt-2 flex flex-wrap gap-2">
                        <Pill>{task.tagLeft ?? "TASK"}</Pill>
                        <Pill>{task.tagRight ?? "SS"}</Pill>
                    </div>
                    {task.due ? <DuePill due={task.due} /> : null}
                </div>

                <div className="relative">
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
                        className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100"
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
        </div>
    );
}

function GhostTaskCard({ task }: { task: Task }) {
    return (
        <div className="rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/60 p-3 shadow-sm">
            <div className="flex items-start gap-2">
                <div className={cn("mt-1 h-2.5 w-2.5 rounded-full", dotClass(task.statusDot))} />
                <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-zinc-800">{task.title}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <Pill>{task.tagLeft ?? "TASK"}</Pill>
                        <Pill>{task.tagRight ?? "SS"}</Pill>
                    </div>
                    {task.due ? <DuePill due={task.due} /> : null}
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

function AddColumnInline({ isSubmitting, onSubmit }: { isSubmitting: boolean; onSubmit: (title: string) => Promise<void> }) {
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
                    "w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-100",
                    "transition"
                )}
            >
                + Tạo trạng thái
            </button>
        );
    }

    return (
        <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
            <input
                ref={inputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={isSubmitting}
                placeholder="Nhập tên trạng thái..."
                className={cn(
                    "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none",
                    "focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200",
                    "select-text"
                )}
            />

            {error ? <div className="mt-2 text-xs font-medium text-rose-600">{error}</div> : null}

            <div className="mt-3 flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={isSubmitting}
                    className={cn(
                        "rounded-xl px-3 py-2 text-sm font-semibold text-white",
                        "bg-indigo-600 hover:bg-indigo-700 transition",
                        isSubmitting && "opacity-60 pointer-events-none"
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
                        "hover:bg-zinc-100 transition",
                        isSubmitting && "opacity-60 pointer-events-none"
                    )}
                    aria-label="Hủy"
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
                "mt-3 flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold",
                "border-zinc-200/70 bg-white text-zinc-900",
                "hover:bg-zinc-50 hover:shadow-sm transition",
                disabled && "opacity-60 pointer-events-none"
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
        if (!shouldShowGhost || !ghost) return base;
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
        <div className={cn("rounded-2xl border border-zinc-200/80 bg-white shadow-sm", "hover:shadow-md transition-shadow")}>
            <div
                className={cn(
                    "sticky top-0 z-10 rounded-t-2xl",
                    "border-b border-zinc-200/70",
                    "bg-white/80 backdrop-blur-xl",
                    "px-4 py-3"
                )}
            >
                <div className="flex items-center gap-3">
                    <div className="min-w-0 flex flex-1 items-center gap-2">
                        <div
                            ref={(node) => headerDragProps?.setActivatorNodeRef?.(node as any)}
                            {...(headerDragProps?.attributes ?? {})}
                            {...(headerDragProps?.listeners ?? {})}
                            className={cn(
                                "grid h-8 w-8 shrink-0 place-items-center rounded-xl",
                                "border border-zinc-200/70 bg-white",
                                "text-zinc-500",
                                "shadow-[0_1px_0_rgba(0,0,0,0.02)]",
                                "hover:bg-zinc-50 hover:shadow-sm transition",
                                "cursor-grab active:cursor-grabbing select-none"
                            )}
                        >
                            <GripVertical className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                            {!isColumnEditing ? (
                                <button type="button" onClick={() => onRenameColumnInline(col.id)} className="w-full text-left">
                                    <p className="truncate text-sm font-bold text-zinc-900 hover:underline">{col.title}</p>
                                </button>
                            ) : (
                                <div className="space-y-1">
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
                                            "h-9 w-full min-w-0 rounded-lg border bg-white px-3 text-sm font-bold text-zinc-900 outline-none",
                                            columnError
                                                ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                                                : "border-zinc-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200",
                                            "select-text"
                                        )}
                                        style={{ maxWidth: 220 }}
                                    />
                                    {columnError ? <div className="text-[11px] font-medium text-rose-600">{columnError}</div> : null}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <span
                            className={cn(
                                "inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2",
                                "border border-zinc-200/70 bg-white",
                                "text-xs font-semibold text-zinc-700",
                                "shadow-[0_1px_0_rgba(0,0,0,0.03)]"
                            )}
                        >
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
                                className="grid h-9 w-9 place-items-center rounded-xl text-zinc-500 hover:bg-zinc-100"
                                aria-label="Column menu"
                            >
                                <MoreHorizontal className="h-5 w-5" />
                            </button>

                            <PortalDropdown open={openColMenu} onClose={() => setOpenColMenu(false)} anchorRef={colMenuBtnRef as any}>
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

            <div className="px-4 py-4">
                <div
                    ref={setDroppableRef}
                    className={cn(
                        "rounded-2xl border p-3 transition",
                        "border-zinc-200/70 bg-gradient-to-b from-zinc-50 to-white",
                        isOver && "border-indigo-300 bg-indigo-50/60"
                    )}
                >
                    {dndEnabled ? (
                        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                            <div className={cn("relative max-h-[68vh] space-y-3 overflow-y-auto pr-1")}>
                                {rendered.map((item) => {
                                    if (item.kind === "ghost") return <GhostTaskCard key={item.key} task={ghost!.task} />;

                                    const isEditing = taskEditState.taskId === item.task.id && taskEditState.columnId === col.id;

                                    return (
                                        <TaskCard
                                            key={item.task.id}
                                            task={item.task}
                                            columnId={col.id}
                                            isEditing={isEditing}
                                            draftTitle={isEditing ? taskEditState.draft : item.task.title}
                                            onDraftChange={onTaskDraftChange}
                                            onStartEdit={() => onTaskStartEdit(item.task.id, col.id, item.task.title)}
                                            onCancelEdit={onTaskCancelEdit}
                                            onCommitEdit={onTaskCommitEdit}
                                            onDelete={() => onDeleteTask(item.task.id, col.id)}
                                        />
                                    );
                                })}

                                {tasks.length === 0 ? (
                                    <div className={cn("rounded-xl border border-zinc-200/70 bg-white", "px-3 py-10 text-center")}>
                                        <div className="text-sm font-semibold text-zinc-700">Chưa có công việc</div>
                                        <div className="mt-1 text-xs text-zinc-500">Bấm “Thêm công việc” để tạo mới</div>
                                    </div>
                                ) : null}

                                <div
                                    ref={setEndRef}
                                    className={cn(
                                        "absolute left-0 right-0 bottom-0 h-12 rounded-xl border border-dashed transition",
                                        isOverEnd ? "border-indigo-300 bg-indigo-50/60" : "border-transparent"
                                    )}
                                />
                            </div>
                        </SortableContext>
                    ) : (
                        <div className="max-h-[68vh] space-y-3 overflow-y-auto pr-1">
                            {tasks.map((t) => {
                                const isEditing = taskEditState.taskId === t.id && taskEditState.columnId === col.id;
                                return (
                                    <TaskCard
                                        key={t.id}
                                        task={t}
                                        columnId={col.id}
                                        isEditing={isEditing}
                                        draftTitle={isEditing ? taskEditState.draft : t.title}
                                        onDraftChange={onTaskDraftChange}
                                        onStartEdit={() => onTaskStartEdit(t.id, col.id, t.title)}
                                        onCancelEdit={onTaskCancelEdit}
                                        onCommitEdit={onTaskCommitEdit}
                                        onDelete={() => onDeleteTask(t.id, col.id)}
                                    />
                                );
                            })}
                            {tasks.length === 0 ? (
                                <div className={cn("rounded-xl border border-zinc-200/70 bg-white", "px-3 py-10 text-center")}>
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
        <div ref={setNodeRef} style={style} className="min-w-[320px] max-w-[320px] self-start">
            <ColumnView
                col={col}
                tasks={tasks}
                taskIds={taskIds}
                onOpenCreateTask={onOpenCreateTask}
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
    return (
        <div className="min-w-[320px] rounded-2xl border border-indigo-200 bg-white p-3 shadow-xl">
            <p className="text-sm font-semibold text-zinc-900">{task.title}</p>
            <div className="mt-2 flex flex-wrap gap-2">
                <Pill>{task.tagLeft ?? "TASK"}</Pill>
                <Pill>{task.tagRight ?? "SS"}</Pill>
            </div>
            {task.due ? <DuePill due={task.due} /> : null}
        </div>
    );
}

function ColumnOverlay({ col, tasks }: { col: Column; tasks: Task[] }) {
    return (
        <div className="min-w-[320px] max-w-[320px]">
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-xl">
                <div className="rounded-t-2xl border-b border-zinc-200 bg-white px-4 py-3">
                    <p className="truncate text-sm font-bold text-zinc-900">{col.title}</p>
                    <p className="text-[11px] text-zinc-500">Đang di chuyển trạng thái…</p>
                </div>
                <div className="px-4 py-4">
                    <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-3">
                        {tasks.slice(0, 3).map((t) => (
                            <div key={t.id} className="mb-3 last:mb-0">
                                <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
                                    <p className="text-sm font-semibold text-zinc-900">{t.title}</p>
                                </div>
                            </div>
                        ))}
                        {tasks.length === 0 ? (
                            <div className="rounded-xl border border-zinc-200 bg-white px-3 py-8 text-center text-sm text-zinc-500">(Trạng thái trống)</div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function GroupBoardScreen() {
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
    const [overId, setOverId] = React.useState<string | null>(null);

    const [editingColumn, setEditingColumn] = React.useState<{ id: string | null; draft: string; error: string | null }>({
        id: null,
        draft: "",
        error: null
    });

    const [editingTask, setEditingTask] = React.useState<{ taskId: string | null; columnId: string | null; draft: string }>({
        taskId: null,
        columnId: null,
        draft: ""
    });

    const [confirmModal, setConfirmModal] = React.useState<{ open: boolean; columnId: ColumnId | null; columnTitle: string }>({
        open: false,
        columnId: null,
        columnTitle: ""
    });

    const [taskFormOpen, setTaskFormOpen] = React.useState(false);
    const [taskFormColumnId, setTaskFormColumnId] = React.useState<ColumnId | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    /** ✅ FIX: sync cả columns + tasks từ detail */
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
            nextBoard[s.id] = apiTasks.map((t) => ({
                id: String(t.taskId ?? `task_${Math.random().toString(16).slice(2)}`),
                title: String(t.taskTitle ?? ""),
                statusDot: "green",
                tagLeft: "TASK",
                tagRight: "SS",
                due: t.dueDate ? String(t.dueDate) : ""
            }));
        }
        setBoard(nextBoard);
    }, []);

    const refresh = React.useCallback(async () => {
        if (!groupId) {
            setLoading(false);
            setLoadError("Thiếu groupId trong route.");
            return;
        }
        if (!isUuidLike(groupId)) {
            setLoading(false);
            setLoadError("groupId trong route không hợp lệ (không phải UUID).");
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
            setLoadError(e?.message ?? "Không tải được dữ liệu group.");
        } finally {
            setLoading(false);
        }
    }, [groupId, syncColumnsFromDetail]);

    React.useEffect(() => {
        void refresh();
    }, [refresh]);

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
            setEditingColumn((p) => ({ ...p, error: "Tên trạng thái đã tồn tại. Hãy nhập tên khác." }));
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
        const nextCols = assignPositions(columns.filter((c) => c.id !== columnId), base);

        setColumns(nextCols);
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

    const handleCancelDeleteColumn = () => setConfirmModal({ open: false, columnId: null, columnTitle: "" });

    const onTaskStartEdit = (taskId: string, columnId: ColumnId, currentTitle: string) => {
        setEditingTask({ taskId, columnId, draft: currentTitle });
    };

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
        const ok = window.confirm("Xóa công việc này?");
        if (!ok) return;

        setBoard((prev) => ({
            ...prev,
            [columnId]: (prev[columnId] ?? []).filter((t) => t.id !== taskId)
        }));
        if (editingTask.taskId === taskId && editingTask.columnId === columnId) onTaskCancelEdit();
    };

    const openCreateTask = (columnId: ColumnId) => {
        setTaskFormColumnId(columnId);
        setTaskFormOpen(true);
    };

    const closeCreateTask = () => {
        setTaskFormOpen(false);
        setTaskFormColumnId(null);
    };

    /** ✅ FIX: create xong refresh để lấy data persisted */
    const handleSubmitCreateTask = async (values: TaskFormValues) => {
        if (!groupId) throw new Error("Thiếu groupId.");
        if (!isUuidLike(groupId)) throw new Error("groupId route không hợp lệ (không phải UUID).");
        const columnId = taskFormColumnId ?? values.statusId ?? null;
        if (!columnId) throw new Error("Thiếu trạng thái.");
        if (!isUuidLike(columnId)) throw new Error("Sai columnId.");

        setCreatingTask(true);
        try {
            await apiCreateTask({ groupId, groupStatusId: columnId, taskName: values.title });
            await refresh(); // ✅ quan trọng: reload từ server để không mất khi F5
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

        const allow = filterDroppablesByType(args.droppableContainers, ["task", "column-drop", "column-end"]);
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
            const activeId = String(e.active.id);
            const overIsEnd = overRaw.startsWith(END_PREFIX);
            const overKey = overRaw.startsWith(DROP_PREFIX)
                ? overRaw.replace(DROP_PREFIX, "")
                : overRaw.startsWith(END_PREFIX)
                    ? overRaw.replace(END_PREFIX, "")
                    : overRaw;

            const fromCol = findColumnOfTask(board, columns, activeId);
            if (!fromCol) return;

            let toCol: ColumnId | null = null;
            if (columns.some((c) => c.id === overKey)) toCol = overKey;
            else toCol = findColumnOfTask(board, columns, overKey) ?? null;

            if (!toCol) return;

            setBoard((prev) => {
                const fromTasks = [...(prev[fromCol] ?? [])];
                const toTasks = [...(prev[toCol!] ?? [])];

                const fromIndex = fromTasks.findIndex((t) => t.id === activeId);
                if (fromIndex === -1) return prev;

                const [moving] = fromTasks.splice(fromIndex, 1);

                if (fromCol === toCol) {
                    if (overIsEnd) {
                        fromTasks.push(moving);
                        return { ...prev, [fromCol]: fromTasks };
                    }

                    const toIndex = fromTasks.findIndex((t) => t.id === overKey);
                    if (toIndex === -1) {
                        fromTasks.unshift(moving);
                        return { ...prev, [fromCol]: fromTasks };
                    }

                    const oldIdx = fromTasks.findIndex((t) => t.id === moving.id);
                    const reordered = arrayMove(fromTasks, oldIdx, toIndex);
                    return { ...prev, [fromCol]: reordered };
                }

                if (overIsEnd) {
                    toTasks.push(moving);
                } else {
                    const idx = toTasks.findIndex((t) => t.id === overKey);
                    if (idx !== -1) toTasks.splice(Math.max(0, idx), 0, moving);
                    else toTasks.unshift(moving);
                }

                return { ...prev, [fromCol]: fromTasks, [toCol!]: toTasks };
            });

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
                    await apiReorderGroupTaskStatus({ groupId, statusId: activeColId, prevStatusId, nextStatusId });
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

    const statusesOptions = React.useMemo<TaskFormOption[]>(() => columns.map((c) => ({ value: c.id, label: c.title })), [columns]);
    const membersOptions = React.useMemo<TaskFormOption[]>(() => [], []);

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-0px)] bg-gradient-to-b from-zinc-50 via-zinc-50 to-white">
                <Container>
                    <div className="mt-6 rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-sm text-zinc-700">Đang tải board…</div>
                </Container>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="min-h-[calc(100vh-0px)] bg-gradient-to-b from-zinc-50 via-zinc-50 to-white">
                <Container>
                    <div className="mt-6 rounded-2xl border border-rose-200 bg-white px-4 py-4 text-sm text-rose-700">{loadError}</div>
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
            const dup = columns.some((c) => c.id !== p.id && c.title.trim().toLowerCase() === trimmed.toLowerCase());
            return { ...p, draft: v, error: dup ? "Tên trạng thái đã tồn tại. Hãy nhập tên khác." : null };
        });
    };

    return (
        <div className="min-h-[calc(100vh-0px)] bg-gradient-to-b from-zinc-50 via-zinc-50 to-white">
            <TaskFormModal
                open={taskFormOpen}
                onClose={closeCreateTask}
                onSubmit={handleSubmitCreateTask}
                members={membersOptions}
                statuses={statusesOptions}
                defaultStatusId={taskFormColumnId}
            />

            <ConfirmModal
                open={confirmModal.open}
                title="Xác nhận xóa trạng thái"
                description={`Bạn có chắc chắn muốn xóa trạng thái "${confirmModal.columnTitle}" không? Hành động này không thể hoàn tác.`}
                confirmLabel="Xóa trạng thái"
                cancelLabel="Hủy"
                onConfirm={() => void handleConfirmDeleteColumn()}
                onCancel={handleCancelDeleteColumn}
            />

            <Container>
                {!mounted ? (
                    <div className="mt-5 flex items-start gap-5 overflow-x-auto pb-6">
                        {columns.map((col) => (
                            <ColumnView
                                key={col.id}
                                col={col}
                                tasks={board[col.id] ?? []}
                                taskIds={taskIdsByCol[col.id] ?? []}
                                onOpenCreateTask={openCreateTask}
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

                        <div className="min-w-[320px] max-w-[320px] self-start">
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
                            <div className="mt-5 flex items-start gap-5 overflow-x-auto pb-6">
                                {columns.map((col) => (
                                    <SortableColumn
                                        key={col.id}
                                        col={col}
                                        tasks={board[col.id] ?? []}
                                        taskIds={taskIdsByCol[col.id] ?? []}
                                        onOpenCreateTask={openCreateTask}
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

                                <div className="min-w-[320px] max-w-[320px] self-start">
                                    <AddColumnInline isSubmitting={creatingColumn} onSubmit={submitAddColumn} />
                                </div>
                            </div>
                        </SortableContext>

                        <DragOverlay>
                            {activeTask ? <TaskOverlay task={activeTask} /> : activeColumn ? <ColumnOverlay col={activeColumn} tasks={board[activeColumn.id] ?? []} /> : null}
                        </DragOverlay>
                    </DndContext>
                )}
            </Container>
        </div>
    );
}