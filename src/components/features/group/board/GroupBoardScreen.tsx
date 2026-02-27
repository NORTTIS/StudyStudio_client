"use client";

import * as React from "react";
import { Plus, MoreHorizontal, GripVertical, CircleDot } from "lucide-react";
import { Container } from "@/components/common";

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
    horizontalListSortingStrategy,
    sortableKeyboardCoordinates
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

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
};

const INITIAL_COLUMNS: Column[] = [
    { id: "todo", title: "Cần làm" },
    { id: "doing", title: "Đang thực hiện" },
    { id: "review", title: "Đang xem xét" },
    { id: "done", title: "Hoàn thành" }
];

const DROP_PREFIX = "drop:";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function dotClass(statusDot?: Task["statusDot"]) {
    if (statusDot === "green") return "bg-emerald-500";
    if (statusDot === "yellow") return "bg-amber-500";
    if (statusDot === "red") return "bg-rose-500";
    return "bg-emerald-500";
}

function uid(prefix = "id") {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function isDropId(id: string) {
    return id.startsWith(DROP_PREFIX);
}

function toDropId(columnId: ColumnId) {
    return `${DROP_PREFIX}${columnId}`;
}

function dropIdToColumnId(dropId: string): ColumnId {
    return dropId.replace(DROP_PREFIX, "");
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

function StaticTaskCard({ task }: { task: Task }) {
    return (
        <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
            <div className="flex items-start gap-2">
                <div className={cn("mt-1 h-2.5 w-2.5 rounded-full", dotClass(task.statusDot))} />
                <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-zinc-900">{task.title}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <Pill>{task.tagLeft ?? "BL"}</Pill>
                        <Pill>{task.tagRight ?? "YR"}</Pill>
                    </div>
                    {task.due ? <DuePill due={task.due} /> : null}
                    <div className="mt-2 text-[11px] text-zinc-500">Nhấn giữ để kéo thả</div>
                </div>
                <button type="button" className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100">
                    <MoreHorizontal className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

function TaskCard({ task, columnId }: { task: Task; columnId: ColumnId }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: task.id,
        data: { type: "task", columnId }
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.8 : 1
    };

    const stop = (e: React.SyntheticEvent) => e.stopPropagation();

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "group rounded-xl border bg-white p-3 shadow-sm",
                "border-zinc-200 hover:shadow-md hover:-translate-y-[1px] transition",
                "cursor-grab select-none active:cursor-grabbing"
            )}
        >
            <div className="flex items-start gap-2">
                <div className="mt-0.5 flex items-center gap-2">
                    <div className={cn("h-2.5 w-2.5 rounded-full", dotClass(task.statusDot))} />
                    <div className="grid h-7 w-7 place-items-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500 opacity-70 group-hover:opacity-100">
                        <GripVertical className="h-4 w-4" />
                    </div>
                </div>

                <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-zinc-900">{task.title}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <Pill>{task.tagLeft ?? "BL"}</Pill>
                        <Pill>{task.tagRight ?? "YR"}</Pill>
                    </div>
                    {task.due ? <DuePill due={task.due} /> : null}
                    <div className="mt-2 text-[11px] text-zinc-500">Nhấn giữ để kéo thả</div>
                </div>

                <button
                    type="button"
                    onPointerDownCapture={stop}
                    onClickCapture={stop}
                    className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100"
                    aria-label="Menu"
                >
                    <MoreHorizontal className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

type HeaderDragProps = Pick<ReturnType<typeof useSortable>, "attributes" | "listeners">;

function ColumnView({
    col,
    tasks,
    taskIds,
    onAddTask,
    dndEnabled,
    headerDragProps
}: {
    col: Column;
    tasks: Task[];
    taskIds: string[];
    onAddTask: (columnId: ColumnId) => void;
    dndEnabled: boolean;
    headerDragProps?: HeaderDragProps;
}) {
    const dropId = toDropId(col.id);
    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: dropId,
        data: { type: "column-drop", columnId: col.id }
    });

    const stop = (e: React.SyntheticEvent) => e.stopPropagation();

    return (
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div
                {...(headerDragProps?.attributes ?? {})}
                {...(headerDragProps?.listeners ?? {})}
                className={cn(
                    "sticky top-0 z-10 rounded-t-2xl border-b border-zinc-200 bg-white/90 backdrop-blur px-4 py-3",
                    headerDragProps ? "cursor-grab active:cursor-grabbing select-none" : ""
                )}
            >
                <div className="flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-zinc-900">{col.title}</p>
                        <p className="text-[11px] text-zinc-500">Kéo bảng để đổi vị trí</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 px-2 text-xs font-semibold text-zinc-700">
                            {tasks.length}
                        </span>
                        <button
                            type="button"
                            onPointerDownCapture={stop}
                            onClickCapture={stop}
                            className="grid h-9 w-9 place-items-center rounded-xl text-zinc-500 hover:bg-zinc-100"
                            aria-label="Menu"
                        >
                            <MoreHorizontal className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-4 py-4">
                <div
                    ref={setDroppableRef}
                    className={cn(
                        "rounded-2xl border border-dashed p-3 transition",
                        "border-zinc-200 bg-zinc-50",
                        isOver && "border-indigo-300 bg-indigo-50/60"
                    )}
                >
                    {dndEnabled ? (
                        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                            <div className="max-h-[68vh] space-y-3 overflow-y-auto pr-1">
                                {tasks.map((t) => (
                                    <TaskCard key={t.id} task={t} columnId={col.id} />
                                ))}
                                {tasks.length === 0 ? (
                                    <div className="rounded-xl border border-zinc-200 bg-white px-3 py-8 text-center text-sm text-zinc-500">
                                        Thả thẻ vào đây
                                    </div>
                                ) : null}
                            </div>
                        </SortableContext>
                    ) : (
                        <div className="max-h-[68vh] space-y-3 overflow-y-auto pr-1">
                            {tasks.map((t) => (
                                <StaticTaskCard key={t.id} task={t} />
                            ))}
                            {tasks.length === 0 ? (
                                <div className="rounded-xl border border-zinc-200 bg-white px-3 py-8 text-center text-sm text-zinc-500">
                                    Thả thẻ vào đây
                                </div>
                            ) : null}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => onAddTask(col.id)}
                        className={cn(
                            "mt-3 flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold",
                            "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-100 transition"
                        )}
                    >
                        <Plus className="h-4 w-4" />
                        Thêm công việc
                    </button>
                </div>
            </div>
        </div>
    );
}

function SortableColumn({
    col,
    tasks,
    taskIds,
    onAddTask,
    dndEnabled
}: {
    col: Column;
    tasks: Task[];
    taskIds: string[];
    onAddTask: (columnId: ColumnId) => void;
    dndEnabled: boolean;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
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
                onAddTask={onAddTask}
                dndEnabled={dndEnabled}
                headerDragProps={{ attributes, listeners }}
            />
        </div>
    );
}

function TaskOverlay({ task }: { task: Task }) {
    return (
        <div className="min-w-[320px] rounded-2xl border border-indigo-200 bg-white p-3 shadow-xl">
            <p className="text-sm font-semibold text-zinc-900">{task.title}</p>
            <div className="mt-2 flex flex-wrap gap-2">
                <Pill>{task.tagLeft ?? "BL"}</Pill>
                <Pill>{task.tagRight ?? "YR"}</Pill>
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
                    <p className="text-[11px] text-zinc-500">Đang di chuyển bảng…</p>
                </div>
                <div className="px-4 py-4">
                    <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-3">
                        {tasks.slice(0, 3).map((t) => (
                            <div key={t.id} className="mb-3 last:mb-0">
                                <StaticTaskCard task={t} />
                            </div>
                        ))}
                        {tasks.length === 0 ? (
                            <div className="rounded-xl border border-zinc-200 bg-white px-3 py-8 text-center text-sm text-zinc-500">
                                (Bảng trống)
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}

function filterDroppablesByType(droppables: DroppableContainer[], allow: Array<string>) {
    return droppables.filter((d) => {
        const t = d.data?.current?.type;
        return typeof t === "string" && allow.includes(t);
    });
}

export function GroupBoardScreen() {
    const [columns, setColumns] = React.useState<Column[]>(INITIAL_COLUMNS);

    const [board, setBoard] = React.useState<Record<ColumnId, Task[]>>({
        todo: [
            { id: "t1", title: "Thiết lập hệ thống thiết kế", statusDot: "green", tagLeft: "BL", tagRight: "YR", due: "20-11-2025" },
            { id: "t2", title: "Tạo UI màn Group Settings", statusDot: "yellow", tagLeft: "UI", tagRight: "SS", due: "28-11-2025" }
        ],
        doing: [
            { id: "t3", title: "Tích hợp API create group", statusDot: "green", tagLeft: "BE", tagRight: "API" },
            { id: "t4", title: "Sửa lỗi key warning", statusDot: "red", tagLeft: "FE", tagRight: "Fix" }
        ],
        review: [
            { id: "t5", title: "Review luồng invite member", statusDot: "yellow", tagLeft: "QA", tagRight: "Flow" },
            { id: "t6", title: "Kiểm tra phân quyền Owner/Moderator", statusDot: "green", tagLeft: "RBAC", tagRight: "Auth" }
        ],
        done: [
            { id: "t7", title: "Căn chỉnh tab bar", statusDot: "green", tagLeft: "UI", tagRight: "Done" },
            { id: "t8", title: "Hoàn thiện layout group list", statusDot: "green", tagLeft: "FE", tagRight: "Done" }
        ]
    });

    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);

    const [activeTaskId, setActiveTaskId] = React.useState<string | null>(null);
    const [activeColumnId, setActiveColumnId] = React.useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const activeTask = React.useMemo(() => {
        if (!activeTaskId) return null;
        return findTask(board, columns, activeTaskId);
    }, [activeTaskId, board, columns]);

    const activeColumn = React.useMemo(() => {
        if (!activeColumnId) return null;
        return columns.find((c) => c.id === activeColumnId) ?? null;
    }, [activeColumnId, columns]);

    const onAddTask = (columnId: ColumnId) => {
        const next: Task = {
            id: uid("task"),
            title: "Công việc mới",
            statusDot: "green",
            tagLeft: "BL",
            tagRight: "YR",
            due: ""
        };
        setBoard((prev) => ({ ...prev, [columnId]: [next, ...(prev[columnId] ?? [])] }));
    };

    const onAddColumn = () => {
        const title = window.prompt("Tên bảng mới?", "Bảng mới");
        if (!title) return;
        const id = uid("col");
        setColumns((prev) => [...prev, { id, title }]);
        setBoard((prev) => ({ ...prev, [id]: [] }));
    };

    const collisionDetection: CollisionDetection = React.useCallback((args) => {
        const activeType = args.active.data.current?.type;

        if (activeType === "column") {
            const onlyColumns = filterDroppablesByType(args.droppableContainers, ["column"]);
            return closestCenter({ ...args, droppableContainers: onlyColumns });
        }

        const allow = filterDroppablesByType(args.droppableContainers, ["task", "column-drop"]);
        return closestCorners({ ...args, droppableContainers: allow });
    }, []);

    const handleDragStart = (e: DragStartEvent) => {
        const type = e.active.data.current?.type;
        if (type === "task") setActiveTaskId(String(e.active.id));
        if (type === "column") setActiveColumnId(String(e.active.id));
    };

    /**
     * ✅ CRITICAL FIX:
     * - KHÔNG setState trong onDragOver
     * - Chỉ xử lý đổi cột / reorder trong onDragEnd
     */
    const handleDragEnd = (e: DragEndEvent) => {
        const activeType = e.active.data.current?.type;
        const overRaw = e.over?.id ? String(e.over.id) : null;

        // reset overlay ids
        setActiveTaskId(null);
        setActiveColumnId(null);

        if (!overRaw) return;

        if (activeType === "task") {
            const activeId = String(e.active.id);
            const overId = isDropId(overRaw) ? dropIdToColumnId(overRaw) : overRaw;

            const fromCol = findColumnOfTask(board, columns, activeId);
            if (!fromCol) return;

            // target column:
            let toCol: ColumnId | null = null;
            if (columns.some((c) => c.id === overId)) {
                toCol = overId;
            } else {
                toCol = findColumnOfTask(board, columns, overId) ?? null;
            }
            if (!toCol) return;

            setBoard((prev) => {
                const fromTasks = [...(prev[fromCol] ?? [])];
                const toTasks = [...(prev[toCol!] ?? [])];

                const fromIndex = fromTasks.findIndex((t) => t.id === activeId);
                if (fromIndex === -1) return prev;

                const [moving] = fromTasks.splice(fromIndex, 1);

                if (fromCol === toCol) {
                    // reorder in same column: only if dropped over a task
                    const toIndex = fromTasks.findIndex((t) => t.id === overId);
                    if (toIndex === -1) {
                        // drop on column itself -> put to top
                        fromTasks.unshift(moving);
                        return { ...prev, [fromCol]: fromTasks };
                    }
                    const reordered = arrayMove([moving, ...fromTasks], 0, toIndex); // safe reorder
                    return { ...prev, [fromCol]: reordered };
                }

                // move across columns
                const overIsTaskInTarget = toTasks.some((t) => t.id === overId);
                if (overIsTaskInTarget) {
                    const idx = toTasks.findIndex((t) => t.id === overId);
                    toTasks.splice(Math.max(0, idx), 0, moving);
                } else {
                    toTasks.unshift(moving);
                }

                return { ...prev, [fromCol]: fromTasks, [toCol!]: toTasks };
            });

            return;
        }

        if (activeType === "column") {
            const activeColId = String(e.active.id);
            let overColId = String(overRaw);

            if (isDropId(overColId)) overColId = dropIdToColumnId(overColId);

            // dropped on a task -> convert to that task's column
            if (!columns.some((c) => c.id === overColId)) {
                const maybeTaskCol = findColumnOfTask(board, columns, overColId);
                if (maybeTaskCol) overColId = maybeTaskCol;
            }

            if (!columns.some((c) => c.id === overColId)) return;
            if (activeColId === overColId) return;

            const oldIndex = columns.findIndex((c) => c.id === activeColId);
            const newIndex = columns.findIndex((c) => c.id === overColId);
            if (oldIndex === -1 || newIndex === -1) return;

            setColumns((prev) => arrayMove(prev, oldIndex, newIndex));
        }
    };

    // ✅ stable ids for SortableContext (avoid creating new arrays in render)
    const columnIds = React.useMemo(() => columns.map((c) => c.id), [columns]);

    const taskIdsByCol = React.useMemo(() => {
        const out: Record<string, string[]> = {};
        for (const col of columns) {
            out[col.id] = (board[col.id] ?? []).map((t) => t.id);
        }
        return out;
    }, [board, columns]);

    return (
        <div className="min-h-[calc(100vh-0px)] bg-zinc-50">
            <Container>
                {!mounted ? (
                    <div className="mt-5 flex items-start gap-5 overflow-x-auto pb-6">
                        {columns.map((col) => (
                            <div key={col.id} className="min-w-[320px] max-w-[320px] self-start">
                                <ColumnView
                                    col={col}
                                    tasks={board[col.id] ?? []}
                                    taskIds={taskIdsByCol[col.id] ?? []}
                                    onAddTask={onAddTask}
                                    dndEnabled={false}
                                />
                            </div>
                        ))}
                        <div className="min-w-[320px] max-w-[320px] self-start">
                            <button
                                type="button"
                                onClick={onAddColumn}
                                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-100"
                            >
                                + Tạo bảng
                            </button>
                        </div>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={collisionDetection}
                        onDragStart={handleDragStart}
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
                                        onAddTask={onAddTask}
                                        dndEnabled
                                    />
                                ))}

                                <div className="min-w-[320px] max-w-[320px] self-start">
                                    <button
                                        type="button"
                                        onClick={onAddColumn}
                                        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-100"
                                    >
                                        + Tạo bảng
                                    </button>
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