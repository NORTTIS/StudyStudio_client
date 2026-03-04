"use client";

import * as React from "react";
import { ChevronDown, MoreHorizontal, Plus } from "lucide-react";
import { Container } from "@/components/common";
import { useParams } from "next/navigation";

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
import type { components } from "@/api/types";

/** ===== API Types ===== */
type GroupDetailResponse = components["schemas"]["GroupDetailResponse"];
type TaskStatusDto = components["schemas"]["TaskStatusDto"];
type GroupTaskStatusRequest = components["schemas"]["GroupTaskStatusRequest"];
type GroupTaskStatusPositionRequest = components["schemas"]["GroupTaskStatusPositionRequest"];

/** ===== Types ===== */
type ColumnId = string;
type Priority = "Low" | "Medium" | "High";

type Task = {
    id: string;
    title: string;
    columnId: ColumnId;
    priority: Priority;
    labels?: string[];
    dueDate?: string;
    assignee?: { name: string; initials: string };
};

type Column = { id: ColumnId; title: string; position: number };

const DROP_PREFIX = "drop:";
const EMPTY_TASKS: Task[] = [];

const isDropId = (id: string) => id.startsWith(DROP_PREFIX);
const toDropId = (colId: ColumnId) => `${DROP_PREFIX}${colId}`;
const dropIdToColumnId = (dropId: string) => dropId.replace(DROP_PREFIX, "") as ColumnId;

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function uid(prefix = "id") {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function priorityVi(p: Priority) {
    if (p === "Low") return "Thấp";
    if (p === "Medium") return "Trung bình";
    return "Cao";
}

function priorityPillCls(p: Priority) {
    if (p === "Low") return "bg-[#FAFAFA] text-[#6F6B99] border-[#E5E5E5]";
    if (p === "Medium") return "bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]";
    return "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]";
}

function statusPillCls(_colId: ColumnId) {
    return "bg-[#FAFAFA] text-[#261E33] border-[#E5E5E5]";
}

function findColumnOfTask(board: Record<ColumnId, Task[]>, columns: Column[], taskId: string): ColumnId | null {
    for (const col of columns) {
        const list = board[col.id] ?? EMPTY_TASKS;
        if (list.some((t) => t.id === taskId)) return col.id;
    }
    return null;
}

function findTask(board: Record<ColumnId, Task[]>, columns: Column[], taskId: string): Task | null {
    for (const col of columns) {
        const t = (board[col.id] ?? EMPTY_TASKS).find((x) => x.id === taskId);
        if (t) return t;
    }
    return null;
}

function filterDroppablesByType(droppables: DroppableContainer[], allow: Array<string>) {
    return droppables.filter((d) => {
        const t = d.data?.current?.type;
        return typeof t === "string" && allow.includes(t);
    });
}

/** ===== UI bits ===== */
function Avatar({ initials }: { initials: string }) {
    return (
        <span className="grid h-8 w-8 place-items-center rounded-full border bg-white text-xs font-semibold text-[#261E33]">
            {initials}
        </span>
    );
}

function GripIcon() {
    return (
        <div className="grid h-10 w-10 place-items-center rounded-lg border bg-white text-[#6F6B99]">
            <div className="grid grid-cols-2 gap-1">
                <span className="h-1 w-1 rounded-full bg-[#6F6B99]" />
                <span className="h-1 w-1 rounded-full bg-[#6F6B99]" />
                <span className="h-1 w-1 rounded-full bg-[#6F6B99]" />
                <span className="h-1 w-1 rounded-full bg-[#6F6B99]" />
                <span className="h-1 w-1 rounded-full bg-[#6F6B99]" />
                <span className="h-1 w-1 rounded-full bg-[#6F6B99]" />
            </div>
        </div>
    );
}

/** ===== Drop zone inside section ===== */
function ColumnDropZone({ colId, children }: { colId: ColumnId; children: React.ReactNode }) {
    const dropId = toDropId(colId);
    const { setNodeRef, isOver } = useDroppable({
        id: dropId,
        data: { type: "column-drop", columnId: colId }
    });

    return (
        <div ref={setNodeRef} className={cn("relative", isOver && "bg-[#F6F5FF]")}>
            <div className={cn("pointer-events-none absolute inset-0", isOver ? "ring-2 ring-[#DDD9FF]" : "ring-0")} />
            {children}
        </div>
    );
}

/** ===== Sortable row ===== */
function SortableTaskRow({
    task,
    columnId,
    columnTitle
}: {
    task: Task;
    columnId: ColumnId;
    columnTitle: string;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: task.id,
        data: { type: "task", columnId }
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1
    };

    const stop = (e: React.SyntheticEvent) => e.stopPropagation();

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "grid grid-cols-12 items-center gap-3 px-4 py-4",
                "cursor-grab select-none active:cursor-grabbing",
                "hover:bg-[#FAFAFA] transition",
                isDragging && "bg-[#F6F5FF]"
            )}
        >
            <div className="col-span-5 min-w-0">
                <div className="flex items-start gap-3">
                    <GripIcon />
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-[#261E33]">{task.title}</p>
                            {(task.labels ?? []).slice(0, 3).map((lb) => (
                                <span key={lb} className="rounded-md border bg-white px-2 py-1 text-xs text-[#6F6B99]">
                                    {lb}
                                </span>
                            ))}
                        </div>

                        <div className="mt-2 flex items-center gap-2 text-xs text-[#6F6B99]">
                            {task.assignee ? (
                                <>
                                    <Avatar initials={task.assignee.initials} />
                                    <span className="font-medium">{task.assignee.name}</span>
                                </>
                            ) : (
                                <span className="text-[#A19FB8]">Chưa giao</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-span-2">
                <span className={cn("inline-flex items-center rounded-md border px-2 py-1 text-xs", statusPillCls(columnId))}>
                    {columnTitle}
                </span>
            </div>

            <div className="col-span-2">
                <span className={cn("inline-flex items-center rounded-md border px-2 py-1 text-xs", priorityPillCls(task.priority))}>
                    {priorityVi(task.priority)}
                </span>
            </div>

            <div className="col-span-2">
                {task.dueDate ? (
                    <span className="inline-flex items-center rounded-md border bg-white px-2 py-1 text-xs text-[#6F6B99]">
                        {task.dueDate}
                    </span>
                ) : (
                    <span className="text-xs text-[#A19FB8]">—</span>
                )}
            </div>

            <div className="col-span-1 flex justify-end">
                <button
                    type="button"
                    className="grid h-9 w-9 place-items-center rounded-md hover:bg-[#F6F5FF]"
                    aria-label="Menu"
                    onPointerDownCapture={stop}
                    onClickCapture={stop}
                >
                    <MoreHorizontal className="h-4 w-4 text-[#6F6B99]" />
                </button>
            </div>
        </div>
    );
}

/** ===== Section UI ===== */
type HeaderDragProps = Pick<ReturnType<typeof useSortable>, "attributes" | "listeners">;

function ListSection({
    title,
    count,
    onAdd,
    headerDragProps,
    children
}: {
    title: string;
    count: number;
    onAdd: () => void;
    headerDragProps?: HeaderDragProps;
    children: React.ReactNode;
}) {
    const [open, setOpen] = React.useState(true);

    return (
        <div className="overflow-hidden rounded-2xl border bg-white">
            <div
                className={cn(
                    "flex items-center justify-between px-4 py-3",
                    headerDragProps ? "cursor-grab select-none active:cursor-grabbing" : "cursor-pointer"
                )}
                onClick={() => setOpen((v) => !v)}
                {...(headerDragProps?.attributes ?? {})}
                {...(headerDragProps?.listeners ?? {})}
            >
                <div className="flex items-center gap-3">
                    <ChevronDown className={cn("h-4 w-4 transition-transform", open ? "rotate-0" : "-rotate-90")} />
                    <p className="text-sm font-semibold text-[#261E33]">{title}</p>
                    <span className="grid h-6 min-w-6 place-items-center rounded-md border bg-white px-2 text-xs font-medium text-[#6F6B99]">
                        {count}
                    </span>
                </div>

                <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-[#FAFAFA]"
                    onClick={(e) => {
                        e.stopPropagation();
                        onAdd();
                    }}
                >
                    <Plus className="h-4 w-4" />
                    Thêm
                </button>
            </div>

            <div className={cn("transition-all duration-300", open ? "max-h-[2000px] opacity-100" : "max-h-0 overflow-hidden opacity-0")}>
                <div className="grid grid-cols-12 gap-3 border-t border-b bg-white px-4 py-2 text-xs font-medium text-[#6F6B99]">
                    <div className="col-span-5">Công việc</div>
                    <div className="col-span-2">Trạng thái</div>
                    <div className="col-span-2">Độ ưu tiên</div>
                    <div className="col-span-2">Hạn hoàn thành</div>
                    <div className="col-span-1 text-right" />
                </div>

                {children}
            </div>
        </div>
    );
}

/** ===== Sortable wrapper for section ===== */
function SortableListSection({
    col,
    tasks,
    onAddTask,
    children
}: {
    col: Column;
    tasks: Task[];
    onAddTask: (colId: ColumnId) => void;
    children: React.ReactNode;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: col.id,
        data: { type: "column" }
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition: transition ?? "transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        opacity: isDragging ? 0.35 : 1
    };

    return (
        <div ref={setNodeRef} style={style}>
            <ListSection title={col.title} count={tasks.length} onAdd={() => onAddTask(col.id)} headerDragProps={{ attributes, listeners }}>
                {children}
            </ListSection>
        </div>
    );
}

/** ===== Overlays ===== */
function TaskOverlay({ task }: { task: Task }) {
    return (
        <div className="w-[560px] rounded-2xl border border-[#DDD9FF] bg-white px-4 py-3 shadow-xl">
            <p className="truncate text-sm font-semibold text-[#261E33]">{task.title}</p>
            <div className="mt-2 flex flex-wrap gap-2">
                {(task.labels ?? []).slice(0, 4).map((lb) => (
                    <span key={lb} className="rounded-md border bg-white px-2 py-1 text-xs text-[#6F6B99]">
                        {lb}
                    </span>
                ))}
                <span className={cn("rounded-md border px-2 py-1 text-xs", priorityPillCls(task.priority))}>{priorityVi(task.priority)}</span>
                {task.dueDate ? (
                    <span className="rounded-md border bg-white px-2 py-1 text-xs text-[#6F6B99]">{task.dueDate}</span>
                ) : null}
            </div>
        </div>
    );
}

function ColumnOverlay({ title, count }: { title: string; count: number }) {
    return (
        <div className="w-[720px] rounded-2xl border bg-white shadow-xl">
            <div className="px-4 py-3">
                <p className="text-sm font-semibold text-[#261E33]">{title}</p>
                <p className="mt-1 text-xs text-[#6F6B99]">Đang di chuyển bảng… ({count} công việc)</p>
            </div>
            <div className="border-t px-4 py-5">
                <div className="rounded-xl border border-dashed bg-white px-4 py-6 text-sm text-[#A19FB8]">Thả để đổi vị trí bảng</div>
            </div>
        </div>
    );
}

/** ===== API helpers (CALL NEXT PROXY: same-origin => no 401) ===== */
async function apiGetGroupDetail(groupId: string): Promise<GroupDetailResponse | null> {
    const url = `/api/group/${encodeURIComponent(groupId)}/detail`;

    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        cache: "no-store"
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`GET group detail failed: ${res.status} | url=${url} | body=${text}`);
    }

    const json = (await res.json()) as components["schemas"]["GroupDetailResponseApiResponse"];
    return json?.data ?? null;
}

async function apiCreateStatus(groupId: string, body: GroupTaskStatusRequest) {
    const url = `/api/GroupTaskStatus/${encodeURIComponent(groupId)}`;

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`POST status failed: ${res.status} | url=${url} | body=${text}`);
    }

    return res.json();
}

async function apiReorderStatuses(groupId: string, body: GroupTaskStatusPositionRequest[]) {
    const url = `/api/GroupTaskStatus/${encodeURIComponent(groupId)}`;

    const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`PUT reorder failed: ${res.status} | url=${url} | body=${text}`);
    }

    return res.json();
}

function mapStatusesToColumns(statuses: TaskStatusDto[] | null | undefined): Column[] {
    return (statuses ?? [])
        .filter((s) => !!s?.statusId)
        .map((s) => ({
            id: String(s.statusId),
            title: s.statusName ?? "Untitled",
            position: typeof s.position === "number" ? s.position : 0
        }))
        .sort((a, b) => a.position - b.position);
}

/** ===== MAIN ===== */
export function GroupListScreen() {
    const params = useParams();
    const groupId = String((params as any)?.groupId ?? "");

    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);

    const [columns, setColumns] = React.useState<Column[]>([]);
    const [board, setBoard] = React.useState<Record<ColumnId, Task[]>>({});

    const [activeTaskId, setActiveTaskId] = React.useState<string | null>(null);
    const [activeColumnId, setActiveColumnId] = React.useState<ColumnId | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    React.useEffect(() => {
        if (!groupId) return;

        let alive = true;

        (async () => {
            try {
                const detail = await apiGetGroupDetail(groupId);
                const cols = mapStatusesToColumns(detail?.taskStatuses);

                if (!alive) return;

                setColumns(cols);
                setBoard((prev) => {
                    const next = { ...prev };
                    for (const c of cols) if (!next[c.id]) next[c.id] = [];
                    for (const k of Object.keys(next)) if (!cols.some((c) => c.id === k)) delete next[k];
                    return next;
                });
            } catch (err) {
                console.error(err);
                setColumns([]);
                setBoard({});
            }
        })();

        return () => {
            alive = false;
        };
    }, [groupId]);

    const activeTask = React.useMemo(() => {
        if (!activeTaskId) return null;
        return findTask(board, columns, activeTaskId);
    }, [activeTaskId, board, columns]);

    const activeColumn = React.useMemo(() => {
        if (!activeColumnId) return null;
        const col = columns.find((c) => c.id === activeColumnId);
        if (!col) return null;
        return { title: col.title, count: (board[col.id] ?? EMPTY_TASKS).length };
    }, [activeColumnId, columns, board]);

    const collisionDetection: CollisionDetection = React.useCallback((args) => {
        const activeType = args.active.data.current?.type;

        if (activeType === "column") {
            const onlyColumns = filterDroppablesByType(args.droppableContainers, ["column"]);
            return closestCenter({ ...args, droppableContainers: onlyColumns });
        }

        const allow = filterDroppablesByType(args.droppableContainers, ["task", "column-drop"]);
        return closestCorners({ ...args, droppableContainers: allow });
    }, []);

    const onAddTask = (columnId: ColumnId) => {
        const next: Task = {
            id: uid("task"),
            title: "Công việc mới",
            columnId,
            priority: "Medium",
            labels: ["BL"],
            dueDate: "",
            assignee: undefined
        };
        setBoard((prev) => ({ ...prev, [columnId]: [next, ...(prev[columnId] ?? EMPTY_TASKS)] }));
    };

    const onAddColumn = async () => {
        if (!groupId) return;

        const title = window.prompt("Tên bảng mới?", "Bảng mới");
        if (!title) return;

        try {
            const body: GroupTaskStatusRequest = {
                statusName: title,
                position: columns.length
            };

            await apiCreateStatus(groupId, body);

            const detail = await apiGetGroupDetail(groupId);
            const cols = mapStatusesToColumns(detail?.taskStatuses);

            setColumns(cols);
            setBoard((prev) => {
                const next = { ...prev };
                for (const c of cols) if (!next[c.id]) next[c.id] = [];
                for (const k of Object.keys(next)) if (!cols.some((c) => c.id === k)) delete next[k];
                return next;
            });
        } catch (err) {
            console.error(err);
            alert("Tạo bảng thất bại. Check console/network.");
        }
    };

    const handleDragStart = (e: DragStartEvent) => {
        const type = e.active.data.current?.type;
        if (type === "task") setActiveTaskId(String(e.active.id));
        if (type === "column") setActiveColumnId(String(e.active.id) as ColumnId);
    };

    const persistColumnOrder = React.useCallback(
        async (nextColumns: Column[]) => {
            if (!groupId) return;
            try {
                const payload: GroupTaskStatusPositionRequest[] = nextColumns.map((c, idx) => ({
                    statusId: c.id,
                    position: idx
                }));
                await apiReorderStatuses(groupId, payload);
            } catch (err) {
                console.error(err);
            }
        },
        [groupId]
    );

    const handleDragEnd = (e: DragEndEvent) => {
        const { active, over } = e;

        const activeType = active.data.current?.type;
        const overId = over?.id ? String(over.id) : null;

        setActiveTaskId(null);
        setActiveColumnId(null);

        if (!overId) return;

        if (activeType === "task") {
            const activeId = String(active.id);

            const fromCol = findColumnOfTask(board, columns, activeId);
            if (!fromCol) return;

            let toCol: ColumnId | null = null;

            if (isDropId(overId)) {
                toCol = dropIdToColumnId(overId);
            } else if (columns.some((c) => c.id === overId)) {
                toCol = overId as ColumnId;
            } else {
                toCol = findColumnOfTask(board, columns, overId) ?? null;
            }

            if (!toCol) return;

            if (fromCol === toCol) {
                setBoard((prev) => {
                    const tasks = [...(prev[fromCol] ?? EMPTY_TASKS)];
                    const oldIndex = tasks.findIndex((t) => t.id === activeId);
                    const newIndex = tasks.findIndex((t) => t.id === overId);
                    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;
                    return { ...prev, [fromCol]: arrayMove(tasks, oldIndex, newIndex) };
                });
            } else {
                setBoard((prev) => {
                    const fromTasks = [...(prev[fromCol] ?? EMPTY_TASKS)];
                    const toTasks = [...(prev[toCol!] ?? EMPTY_TASKS)];

                    const oldIndex = fromTasks.findIndex((t) => t.id === activeId);
                    if (oldIndex === -1) return prev;

                    const [moving] = fromTasks.splice(oldIndex, 1);
                    const moved = { ...moving, columnId: toCol! };

                    const overIsTaskInTo = toTasks.some((t) => t.id === overId);
                    if (overIsTaskInTo) {
                        const idx = toTasks.findIndex((t) => t.id === overId);
                        toTasks.splice(Math.max(0, idx), 0, moved);
                    } else {
                        toTasks.unshift(moved);
                    }

                    return { ...prev, [fromCol]: fromTasks, [toCol!]: toTasks };
                });
            }

            return;
        }

        if (activeType === "column") {
            const activeColId = String(active.id) as ColumnId;
            let overColId = overId as ColumnId;

            if (isDropId(overColId)) overColId = dropIdToColumnId(overColId);

            if (!columns.some((c) => c.id === overColId)) {
                const maybe = findColumnOfTask(board, columns, overColId);
                if (maybe) overColId = maybe;
            }

            if (!columns.some((c) => c.id === overColId)) return;
            if (activeColId === overColId) return;

            const oldIndex = columns.findIndex((c) => c.id === activeColId);
            const newIndex = columns.findIndex((c) => c.id === overColId);
            if (oldIndex === -1 || newIndex === -1) return;

            const nextCols = arrayMove(columns, oldIndex, newIndex).map((c, idx) => ({ ...c, position: idx }));
            setColumns(nextCols);
            void persistColumnOrder(nextCols);
        }
    };

    const columnIds = React.useMemo(() => columns.map((c) => c.id), [columns]);

    const taskIdsByCol = React.useMemo(() => {
        const out: Record<string, string[]> = {};
        for (const col of columns) {
            out[col.id] = (board[col.id] ?? EMPTY_TASKS).map((t) => t.id);
        }
        return out;
    }, [board, columns]);

    if (!mounted) {
        return (
            <div className="bg-[#FAFAFA]">
                <Container>
                    <div className="py-6" />
                </Container>
            </div>
        );
    }

    return (
        <div className="bg-[#FAFAFA]">
            <Container>
                <div className="flex items-center justify-end">
                    <button
                        type="button"
                        onClick={onAddColumn}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium text-[#261E33] hover:bg-[#FAFAFA]"
                    >
                        <Plus className="h-4 w-4" />
                        Tạo mới +
                    </button>
                </div>

                <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <SortableContext items={columnIds} strategy={verticalListSortingStrategy}>
                        <div className="mt-5 grid gap-4">
                            {columns.map((col) => {
                                const tasks = board[col.id] ?? EMPTY_TASKS;

                                return (
                                    <SortableListSection key={col.id} col={col} tasks={tasks} onAddTask={onAddTask}>
                                        <ColumnDropZone colId={col.id}>
                                            {tasks.length ? (
                                                <SortableContext items={taskIdsByCol[col.id] ?? []} strategy={verticalListSortingStrategy}>
                                                    <div className="divide-y">
                                                        {tasks.map((t) => (
                                                            <SortableTaskRow key={t.id} task={t} columnId={col.id} columnTitle={col.title} />
                                                        ))}
                                                    </div>
                                                </SortableContext>
                                            ) : (
                                                <div className="px-4 py-10 text-center">
                                                    <p className="text-sm font-medium text-[#261E33]">Chưa có công việc</p>
                                                    <p className="mt-1 text-sm text-[#6F6B99]">Kéo thả công việc vào đây.</p>
                                                </div>
                                            )}
                                        </ColumnDropZone>
                                    </SortableListSection>
                                );
                            })}
                        </div>
                    </SortableContext>

                    <DragOverlay>
                        {activeTask ? <TaskOverlay task={activeTask} /> : activeColumn ? <ColumnOverlay title={activeColumn.title} count={activeColumn.count} /> : null}
                    </DragOverlay>
                </DndContext>
            </Container>
        </div>
    );
}