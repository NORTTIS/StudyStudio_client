"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Container } from "@/components/common";

import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
    PointerSensor,
    KeyboardSensor,
    DragOverlay,
    closestCorners,
    useSensor,
    useSensors
} from "@dnd-kit/core";
import {
    SortableContext,
    useSortable,
    arrayMove,
    verticalListSortingStrategy,
    sortableKeyboardCoordinates
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type ColumnId = "todo" | "doing" | "review" | "done";

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

const COLUMNS: Column[] = [
    { id: "todo", title: "Cần làm" },
    { id: "doing", title: "Đang thực hiện" },
    { id: "review", title: "Đang xem xét" },
    { id: "done", title: "Hoàn thành" }
];

function dotClass(statusDot?: Task["statusDot"]) {
    if (statusDot === "green") return "bg-[#22C55E]";
    if (statusDot === "yellow") return "bg-[#F59E0B]";
    if (statusDot === "red") return "bg-[#EF4444]";
    return "bg-[#22C55E]";
}

function uid(prefix = "t") {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function findColumnOfTask(board: Record<ColumnId, Task[]>, taskId: string): ColumnId | null {
    for (const col of COLUMNS) {
        if (board[col.id].some((t) => t.id === taskId)) return col.id;
    }
    return null;
}

function findTask(board: Record<ColumnId, Task[]>, taskId: string): Task | null {
    for (const col of COLUMNS) {
        const t = board[col.id].find((x) => x.id === taskId);
        if (t) return t;
    }
    return null;
}

/** ===================== Static (SSR-safe) Card ===================== */
function StaticTaskCard({ task }: { task: Task }) {
    return (
        <div className="rounded-lg border bg-white p-3 shadow-sm select-none">
            <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-[#261E33] text-sm">{task.title}</p>
                <button type="button" className="grid h-7 w-7 place-items-center rounded-md hover:bg-[#F6F5FF]">
                    <span className="text-[#6F6B99] text-lg leading-none">…</span>
                </button>
            </div>

            <div className="mt-2 flex items-center gap-2 text-[#6F6B99] text-xs">
                <span className={`h-2 w-2 rounded-full ${dotClass(task.statusDot)}`} />
                <span>{task.tagLeft ?? "BL"}</span>
                <span className="h-4 w-px bg-[#E5E5E5]" />
                <span>{task.tagRight ?? "YR"}</span>
            </div>

            {task.due ? (
                <div className="mt-2 rounded-md border bg-[#FAFAFA] px-2 py-1 text-[#6F6B99] text-xs">
                    Hạn hoàn thành: {task.due}
                </div>
            ) : null}

            <div className="mt-3 text-[#6F6B99] text-[11px]">Nhấn giữ để kéo thả</div>
        </div>
    );
}

/** ===================== DnD Card (Trello-like hold-to-drag) ===================== */
function TaskCard({ task, columnId }: { task: Task; columnId: ColumnId }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: task.id,
        data: { type: "task", columnId }
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.65 : 1
    };

    const stopDnd = (e: React.SyntheticEvent) => {
        // ✅ bấm "…" không kích hoạt drag
        e.stopPropagation();
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="rounded-lg border bg-white p-3 shadow-sm cursor-pointer select-none"
        >
            <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-[#261E33] text-sm">{task.title}</p>
                <button
                    type="button"
                    onPointerDownCapture={stopDnd}
                    onClickCapture={stopDnd}
                    className="grid h-7 w-7 place-items-center rounded-md hover:bg-[#F6F5FF]"
                    aria-label="Menu"
                >
                    <span className="text-[#6F6B99] text-lg leading-none">…</span>
                </button>
            </div>

            <div className="mt-2 flex items-center gap-2 text-[#6F6B99] text-xs">
                <span className={`h-2 w-2 rounded-full ${dotClass(task.statusDot)}`} />
                <span>{task.tagLeft ?? "BL"}</span>
                <span className="h-4 w-px bg-[#E5E5E5]" />
                <span>{task.tagRight ?? "YR"}</span>
            </div>

            {task.due ? (
                <div className="mt-2 rounded-md border bg-[#FAFAFA] px-2 py-1 text-[#6F6B99] text-xs">
                    Hạn hoàn thành: {task.due}
                </div>
            ) : null}

            <div className="mt-3 text-[#6F6B99] text-[11px]">Nhấn giữ để kéo thả</div>
        </div>
    );
}

function ColumnView({
    col,
    tasks,
    onAddTask,
    dndEnabled
}: {
    col: Column;
    tasks: Task[];
    onAddTask: (columnId: ColumnId) => void;
    dndEnabled: boolean;
}) {
    return (
        <div className="min-w-[280px] max-w-[280px] rounded-xl border bg-white">
            <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#261E33] text-sm">{col.title}</p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="grid h-6 min-w-6 place-items-center rounded-md border bg-[#FAFAFA] px-2 text-[#6F6B99] text-xs">
                        {tasks.length}
                    </span>
                    <button type="button" className="grid h-7 w-7 place-items-center rounded-md hover:bg-[#F6F5FF]">
                        <span className="text-[#6F6B99] text-lg leading-none">…</span>
                    </button>
                </div>
            </div>

            <div className="px-3 pb-3">
                <div className="rounded-lg border border-dashed bg-white p-2">
                    {dndEnabled ? (
                        <SortableContext id={col.id} items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-2">
                                {tasks.map((t) => (
                                    <TaskCard key={t.id} task={t} columnId={col.id} />
                                ))}
                            </div>
                        </SortableContext>
                    ) : (
                        <div className="space-y-2">
                            {tasks.map((t) => (
                                <StaticTaskCard key={t.id} task={t} />
                            ))}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => onAddTask(col.id)}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border bg-white py-2 text-[#261E33] text-sm hover:bg-[#FAFAFA]"
                    >
                        <Plus className="h-4 w-4" />
                        Thêm công việc
                    </button>
                </div>
            </div>
        </div>
    );
}

function OverlayCard({ task }: { task: Task }) {
    return (
        <div className="min-w-[260px] rounded-lg border bg-white p-3 shadow-md">
            <p className="font-medium text-[#261E33] text-sm">{task.title}</p>
            <div className="mt-2 flex items-center gap-2 text-[#6F6B99] text-xs">
                <span className={`h-2 w-2 rounded-full ${dotClass(task.statusDot)}`} />
                <span>{task.tagLeft ?? "BL"}</span>
                <span className="h-4 w-px bg-[#E5E5E5]" />
                <span>{task.tagRight ?? "YR"}</span>
            </div>
            {task.due ? (
                <div className="mt-2 rounded-md border bg-[#FAFAFA] px-2 py-1 text-[#6F6B99] text-xs">
                    Hạn hoàn thành: {task.due}
                </div>
            ) : null}
        </div>
    );
}

export function GroupBoardScreen() {
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

    /** ✅ Fix hydration mismatch: chỉ bật DnD sau mount */
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);

    const [activeTaskId, setActiveTaskId] = React.useState<string | null>(null);

    // ✅ Trello-like: giữ 200ms mới kéo
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const activeTask = React.useMemo(() => {
        if (!activeTaskId) return null;
        return findTask(board, activeTaskId);
    }, [activeTaskId, board]);

    const onAddTask = (columnId: ColumnId) => {
        const next: Task = {
            id: uid("task"),
            title: "Công việc mới",
            statusDot: "green",
            tagLeft: "BL",
            tagRight: "YR",
            due: ""
        };
        setBoard((prev) => ({ ...prev, [columnId]: [next, ...prev[columnId]] }));
    };

    const handleDragStart = (e: DragStartEvent) => {
        setActiveTaskId(String(e.active.id));
    };

    const handleDragOver = (e: DragOverEvent) => {
        const activeId = String(e.active.id);
        const overId = e.over?.id ? String(e.over.id) : null;
        if (!overId) return;

        const fromCol = findColumnOfTask(board, activeId);
        if (!fromCol) return;

        const overIsColumn = COLUMNS.some((c) => c.id === (overId as ColumnId));
        const toCol = overIsColumn ? (overId as ColumnId) : findColumnOfTask(board, overId);

        if (!toCol || fromCol === toCol) return;

        setBoard((prev) => {
            const fromTasks = [...prev[fromCol]];
            const toTasks = [...prev[toCol]];

            const fromIndex = fromTasks.findIndex((t) => t.id === activeId);
            if (fromIndex === -1) return prev;

            const [moving] = fromTasks.splice(fromIndex, 1);

            if (!overIsColumn) {
                const overIndex = toTasks.findIndex((t) => t.id === overId);
                if (overIndex >= 0) toTasks.splice(overIndex, 0, moving);
                else toTasks.push(moving);
            } else {
                toTasks.unshift(moving);
            }

            return { ...prev, [fromCol]: fromTasks, [toCol]: toTasks };
        });
    };

    const handleDragEnd = (e: DragEndEvent) => {
        const activeId = String(e.active.id);
        const overId = e.over?.id ? String(e.over.id) : null;
        setActiveTaskId(null);
        if (!overId) return;

        const fromCol = findColumnOfTask(board, activeId);
        if (!fromCol) return;

        const overIsColumn = COLUMNS.some((c) => c.id === (overId as ColumnId));
        const toCol = overIsColumn ? fromCol : findColumnOfTask(board, overId) ?? fromCol;

        // reorder trong cùng cột
        if (!overIsColumn && toCol === fromCol) {
            setBoard((prev) => {
                const tasks = [...prev[fromCol]];
                const oldIndex = tasks.findIndex((t) => t.id === activeId);
                const newIndex = tasks.findIndex((t) => t.id === overId);
                if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;
                return { ...prev, [fromCol]: arrayMove(tasks, oldIndex, newIndex) };
            });
        }
    };

    return (
        <div className="min-h-[calc(100vh-0px)] bg-[#FAFAFA]">
            <Container>
                {/* SSR + first client render: static => không mismatch */}
                {!mounted ? (
                    <div className="mt-4 flex gap-4 overflow-x-auto pb-4">
                        {COLUMNS.map((col) => (
                            <ColumnView key={col.id} col={col} tasks={board[col.id]} onAddTask={onAddTask} dndEnabled={false} />
                        ))}
                        <div className="min-w-[280px] max-w-[280px]">
                            <button
                                type="button"
                                className="w-full rounded-xl border bg-white px-4 py-3 text-left font-medium text-[#261E33] text-sm hover:bg-[#FAFAFA]"
                            >
                                Tạo cột mới +
                            </button>
                        </div>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCorners}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="mt-4 flex gap-4 overflow-x-auto pb-4">
                            {COLUMNS.map((col) => (
                                <ColumnView key={col.id} col={col} tasks={board[col.id]} onAddTask={onAddTask} dndEnabled />
                            ))}

                            <div className="min-w-[280px] max-w-[280px]">
                                <button
                                    type="button"
                                    className="w-full rounded-xl border bg-white px-4 py-3 text-left font-medium text-[#261E33] text-sm hover:bg-[#FAFAFA]"
                                >
                                    Tạo cột mới +
                                </button>
                            </div>
                        </div>

                        <DragOverlay>{activeTask ? <OverlayCard task={activeTask} /> : null}</DragOverlay>
                    </DndContext>
                )}
            </Container>
        </div>
    );
}