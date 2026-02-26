"use client";

import { ChevronDown, MoreHorizontal, Plus } from "lucide-react";
import React, { useMemo, useState } from "react";
import { Container } from "@/components/common";

type TaskStatus = "To Do" | "In progress" | "Done";
type Priority = "Low" | "Medium" | "High";

type Task = {
    id: string;
    title: string;
    status: TaskStatus;
    priority: Priority;
    labels?: string[];
    dueDate?: string;
    assignee?: { name: string; initials: string };
};

const statusLabelVi: Record<TaskStatus, string> = {
    "To Do": "Cần làm",
    "In progress": "Đang thực hiện",
    Done: "Hoàn thành"
};

const priorityLabelVi: Record<Priority, string> = {
    Low: "Thấp",
    Medium: "Trung bình",
    High: "Cao"
};

function StatusPill({ status }: { status: TaskStatus }) {
    const cls = useMemo(() => {
        switch (status) {
            case "To Do":
                return "bg-[#FAFAFA] text-[#261E33] border-[#E5E5E5]";
            case "In progress":
                return "bg-[#F6F5FF] text-[#3B2CC8] border-[#DDD9FF]";
            case "Done":
                return "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]";
            default:
                return "bg-[#FAFAFA] text-[#261E33] border-[#E5E5E5]";
        }
    }, [status]);

    return (
        <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs ${cls}`}>
            {statusLabelVi[status]}
        </span>
    );
}

function PriorityPill({ priority }: { priority: Priority }) {
    const cls = useMemo(() => {
        switch (priority) {
            case "Low":
                return "bg-[#FAFAFA] text-[#6F6B99] border-[#E5E5E5]";
            case "Medium":
                return "bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]";
            case "High":
                return "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]";
            default:
                return "bg-[#FAFAFA] text-[#6F6B99] border-[#E5E5E5]";
        }
    }, [priority]);

    return (
        <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs ${cls}`}>
            {priorityLabelVi[priority]}
        </span>
    );
}

function Avatar({ initials }: { initials: string }) {
    return (
        <span className="grid h-7 w-7 place-items-center rounded-full border bg-white font-semibold text-[#261E33] text-xs">
            {initials}
        </span>
    );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
    const [open, setOpen] = useState(true);

    return (
        <div className="overflow-hidden rounded-xl border bg-white">
            <div
                className="flex cursor-pointer items-center justify-between bg-[#FAFAFA] px-4 py-3"
                onClick={() => setOpen((v) => !v)}>
                <div className="flex items-center gap-2">
                    <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}
                    />
                    <p className="font-semibold text-[#261E33] text-sm">{title}</p>
                    <span className="grid h-6 min-w-6 place-items-center rounded-md border bg-white px-2 text-[#6F6B99] text-xs">
                        {count}
                    </span>
                </div>

                <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 font-medium text-[#261E33] text-sm hover:bg-[#FAFAFA]"
                    onClick={(e) => {
                        e.stopPropagation();
                    }}>
                    <Plus className="h-4 w-4" />
                    Thêm
                </button>
            </div>

            <div
                className={`transition-all duration-300 ease-in-out ${
                    open ? "max-h-[2000px] opacity-100" : "max-h-0 overflow-hidden opacity-0"
                }`}>
                <div className="grid min-w-[900px] grid-cols-12 gap-3 border-b bg-white px-4 py-2 font-medium text-[#6F6B99] text-xs">
                    <div className="col-span-5">Công việc</div>
                    <div className="col-span-2">Trạng thái</div>
                    <div className="col-span-2">Độ ưu tiên</div>
                    <div className="col-span-2">Hạn hoàn thành</div>
                    <div className="col-span-1 text-right" />
                </div>

                <div className="divide-y">{children}</div>
            </div>
        </div>
    );
}

function TaskRow({ t }: { t: Task }) {
    return (
        <div className="grid min-w-[900px] grid-cols-12 items-center gap-3 px-4 py-3 hover:bg-[#FAFAFA]">
            <div className="col-span-5 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-[#261E33] text-sm">{t.title}</p>

                    {(t.labels ?? []).length ? (
                        <div className="hidden flex-wrap gap-2 sm:flex">
                            {(t.labels ?? []).slice(0, 2).map((lb) => (
                                <span key={lb} className="rounded-md border bg-white px-2 py-1 text-[#6F6B99] text-xs">
                                    {lb}
                                </span>
                            ))}
                        </div>
                    ) : null}
                </div>

                {t.assignee ? (
                    <div className="mt-1 flex items-center gap-2 text-[#6F6B99] text-xs">
                        <Avatar initials={t.assignee.initials} />
                        <span>{t.assignee.name}</span>
                    </div>
                ) : (
                    <div className="mt-1 text-[#A19FB8] text-xs">Chưa giao</div>
                )}
            </div>

            <div className="col-span-2">
                <StatusPill status={t.status} />
            </div>

            <div className="col-span-2">
                <PriorityPill priority={t.priority} />
            </div>

            <div className="col-span-2">
                {t.dueDate ? (
                    <span className="rounded-md border bg-[#FAFAFA] px-2 py-1 text-[#6F6B99] text-xs">{t.dueDate}</span>
                ) : (
                    <span className="text-[#A19FB8] text-xs">—</span>
                )}
            </div>

            <div className="col-span-1 flex justify-end">
                <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-md hover:bg-[#F6F5FF]"
                    aria-label="Thao tác"
                    onClick={() => {}}>
                    <MoreHorizontal className="h-4 w-4 text-[#6F6B99]" />
                </button>
            </div>
        </div>
    );
}

export function GroupListScreen() {
    //Demo data
    const tasks: Task[] = [
        {
            id: "1",
            title: "Thiết lập hệ thống thiết kế",
            status: "To Do",
            priority: "Medium",
            labels: ["BL", "YR"],
            dueDate: "2025-11-20",
            assignee: { name: "Dũng", initials: "DL" }
        },
        {
            id: "2",
            title: "Chỉnh UI luồng mời thành viên",
            status: "In progress",
            priority: "High",
            labels: ["UI"],
            dueDate: "2025-11-22",
            assignee: { name: "Minh", initials: "NM" }
        },
        {
            id: "3",
            title: "Sửa đồng bộ nhóm yêu thích (star)",
            status: "In progress",
            priority: "High",
            labels: ["API", "BUG"],
            dueDate: "2025-11-23",
            assignee: { name: "Bắc", initials: "VB" }
        },
        {
            id: "4",
            title: "Checklist phát hành",
            status: "Done",
            priority: "Low",
            labels: ["DOC"],
            dueDate: "2025-11-18",
            assignee: { name: "Đạt", initials: "DD" }
        }
    ];

    const todo = tasks.filter((t) => t.status === "To Do");
    const inprogress = tasks.filter((t) => t.status === "In progress");
    const done = tasks.filter((t) => t.status === "Done");

    return (
        <div className="bg-[#FAFAFA]">
            <Container>
                <div className="flex items-center justify-end">
                    <button
                        type="button"
                        className="inline-flex items-center justify-center gap-2 rounded-lg border bg-white px-3 py-2 font-medium text-[#261E33] text-sm hover:bg-[#FAFAFA]"
                        onClick={() => {}}>
                        <Plus className="h-4 w-4" />
                        Tạo mới +
                    </button>
                </div>

                <div className="mt-5 grid gap-4">
                    <div className="overflow-x-auto">
                        <Section title="Cần làm" count={todo.length}>
                            {todo.length ? (
                                todo.map((t) => <TaskRow key={t.id} t={t} />)
                            ) : (
                                <div className="px-4 py-10 text-center">
                                    <p className="font-medium text-[#261E33] text-sm">Chưa có công việc</p>
                                    <p className="mt-1 text-[#6F6B99] text-sm">Tạo công việc mới để bắt đầu.</p>
                                </div>
                            )}
                        </Section>
                    </div>

                    <div className="overflow-x-auto">
                        <Section title="Đang thực hiện" count={inprogress.length}>
                            {inprogress.length ? (
                                inprogress.map((t) => <TaskRow key={t.id} t={t} />)
                            ) : (
                                <div className="px-4 py-10 text-center">
                                    <p className="font-medium text-[#261E33] text-sm">Chưa có công việc</p>
                                    <p className="mt-1 text-[#6F6B99] text-sm">
                                        Công việc đang thực hiện sẽ hiển thị ở đây.
                                    </p>
                                </div>
                            )}
                        </Section>
                    </div>

                    <div className="overflow-x-auto">
                        <Section title="Hoàn thành" count={done.length}>
                            {done.length ? (
                                done.map((t) => <TaskRow key={t.id} t={t} />)
                            ) : (
                                <div className="px-4 py-10 text-center">
                                    <p className="font-medium text-[#261E33] text-sm">Chưa có công việc hoàn thành</p>
                                    <p className="mt-1 text-[#6F6B99] text-sm">
                                        Các công việc đã hoàn thành sẽ hiển thị ở đây.
                                    </p>
                                </div>
                            )}
                        </Section>
                    </div>
                </div>
            </Container>
        </div>
    );
}
