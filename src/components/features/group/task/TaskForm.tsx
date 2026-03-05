"use client";

import * as React from "react";
import { X, Calendar } from "lucide-react";
import { createPortal } from "react-dom";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export type TaskPriority = "low" | "medium" | "high";
export type TaskFormValues = {
    title: string;
    description: string;
    assigneeId: string | null;
    statusId: string | null;
    priority: TaskPriority;
    startDate: string; // yyyy-mm-dd
    dueDate: string; // yyyy-mm-dd
};

export type TaskFormOption = { value: string; label: string };

type Props = {
    open: boolean;
    onClose: () => void;
    onSubmit: (values: TaskFormValues) => Promise<void> | void;

    // dropdown data
    members?: TaskFormOption[];
    statuses?: TaskFormOption[];

    // default selected values (optional)
    defaultStatusId?: string | null;
    defaultAssigneeId?: string | null;
    defaultPriority?: TaskPriority;
};

function PriorityDot({ p }: { p: TaskPriority }) {
    const klass =
        p === "low" ? "bg-emerald-500" : p === "medium" ? "bg-amber-500" : "bg-rose-500";
    return <span className={cn("inline-block h-2.5 w-2.5 rounded-full", klass)} />;
}

export default function TaskFormModal({
    open,
    onClose,
    onSubmit,
    members = [],
    statuses = [],
    defaultStatusId = null,
    defaultAssigneeId = null,
    defaultPriority = "low"
}: Props) {
    const [mounted, setMounted] = React.useState(false);

    const [title, setTitle] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [assigneeId, setAssigneeId] = React.useState<string | null>(defaultAssigneeId);
    const [statusId, setStatusId] = React.useState<string | null>(defaultStatusId);
    const [priority, setPriority] = React.useState<TaskPriority>(defaultPriority);
    const [startDate, setStartDate] = React.useState("");
    const [dueDate, setDueDate] = React.useState("");

    const [submitting, setSubmitting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => setMounted(true), []);

    // Reset defaults each time open changes to true
    React.useEffect(() => {
        if (!open) return;
        setError(null);
        setSubmitting(false);

        setTitle("");
        setDescription("");
        setAssigneeId(defaultAssigneeId);
        setStatusId(defaultStatusId ?? (statuses[0]?.value ?? null));
        setPriority(defaultPriority);
        setStartDate("");
        setDueDate("");
    }, [open, defaultAssigneeId, defaultStatusId, defaultPriority, statuses]);

    React.useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    const canSubmit = title.trim().length > 0 && !submitting;

    const handleSubmit = async () => {
        const t = title.trim();
        if (!t) {
            setError("Vui lòng nhập tên công việc.");
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            await onSubmit({
                title: t,
                description: description.trim(),
                assigneeId,
                statusId,
                priority,
                startDate,
                dueDate
            });
            onClose();
        } catch (e: any) {
            setError(e?.message ?? "Tạo công việc thất bại");
        } finally {
            setSubmitting(false);
        }
    };

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
                className="w-[92vw] max-w-[720px] max-h-[90vh] rounded-2xl bg-white shadow-2xl flex flex-col"
                onPointerDown={(e) => e.stopPropagation()}
            >
                {/* Header (smaller padding) */}
                <div className="flex items-center justify-between px-6 py-4">
                    <h2 className="text-xl md:text-2xl font-bold text-zinc-900">Add new task</h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body (scrollable) */}
                <div className="px-4 md:px-6 pb-6 overflow-y-auto">
                    {/* Task name */}
                    <label className="block text-base md:text-lg font-semibold text-zinc-800">
                        Task name
                    </label>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter task name"
                        className={cn(
                            "mt-3 h-12 md:h-14 w-full rounded-2xl border border-zinc-200 bg-white px-5 text-base text-zinc-900 outline-none",
                            "focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                        )}
                    />

                    {/* Description */}
                    <label className="mt-6 md:mt-8 block text-base md:text-lg font-semibold text-zinc-800">
                        Description
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Add a description (optional)"
                        rows={3}
                        className={cn(
                            "mt-3 w-full resize-none rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-base text-zinc-900 outline-none",
                            "focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                        )}
                    />

                    {/* Row: Assignee / Status / Priority */}
                    <div className="mt-6 md:mt-8 grid grid-cols-1 gap-5 md:gap-6 md:grid-cols-3">
                        {/* Assignee */}
                        <div>
                            <label className="block text-base md:text-lg font-semibold text-zinc-800">
                                Assignee
                            </label>
                            <div className="mt-3">
                                <select
                                    value={assigneeId ?? ""}
                                    onChange={(e) => setAssigneeId(e.target.value ? e.target.value : null)}
                                    className={cn(
                                        "h-12 md:h-14 w-full rounded-2xl border border-zinc-200 bg-white px-5 text-base text-zinc-800 outline-none",
                                        "focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                                    )}
                                >
                                    <option value="">Select member</option>
                                    {members.map((m) => (
                                        <option key={m.value} value={m.value}>
                                            {m.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-base md:text-lg font-semibold text-zinc-800">
                                Status
                            </label>
                            <div className="mt-3">
                                <select
                                    value={statusId ?? ""}
                                    onChange={(e) => setStatusId(e.target.value ? e.target.value : null)}
                                    className={cn(
                                        "h-12 md:h-14 w-full rounded-2xl border border-zinc-200 bg-white px-5 text-base text-zinc-800 outline-none",
                                        "focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                                    )}
                                >
                                    {statuses.length === 0 ? (
                                        <option value="">(No status)</option>
                                    ) : (
                                        statuses.map((s) => (
                                            <option key={s.value} value={s.value}>
                                                {s.label}
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>
                        </div>

                        {/* Priority */}
                        <div>
                            <label className="block text-base md:text-lg font-semibold text-zinc-800">
                                Priority
                            </label>
                            <div className="mt-3 relative">
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                                    className={cn(
                                        "h-12 md:h-14 w-full appearance-none rounded-2xl border border-zinc-200 bg-white pl-12 pr-5 text-base text-zinc-800 outline-none",
                                        "focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                                    )}
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>

                                <div className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2">
                                    <PriorityDot p={priority} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Row: Start date / Due date */}
                    <div className="mt-6 md:mt-8 grid grid-cols-1 gap-5 md:gap-6 md:grid-cols-2">
                        <div>
                            <label className="block text-base md:text-lg font-semibold text-zinc-800">
                                Start date
                            </label>
                            <div className="mt-3 relative">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className={cn(
                                        "h-12 md:h-14 w-full rounded-2xl border border-zinc-200 bg-white px-5 pr-12 text-base text-zinc-800 outline-none",
                                        "focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                                    )}
                                />
                                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500">
                                    <Calendar className="h-5 w-5" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-base md:text-lg font-semibold text-zinc-800">
                                Due date
                            </label>
                            <div className="mt-3 relative">
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className={cn(
                                        "h-12 md:h-14 w-full rounded-2xl border border-zinc-200 bg-white px-5 pr-12 text-base text-zinc-800 outline-none",
                                        "focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                                    )}
                                />
                                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500">
                                    <Calendar className="h-5 w-5" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {error ? <div className="mt-4 text-sm font-semibold text-rose-600">{error}</div> : null}
                </div>

                {/* Footer (sticky in view because modal is flex-col, body scrolls) */}
                <div className="flex items-center justify-end gap-6 border-t border-zinc-200 px-4 md:px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className={cn(
                            "text-base font-semibold text-zinc-700 hover:text-zinc-900",
                            submitting && "opacity-60 pointer-events-none"
                        )}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className={cn(
                            "h-11 md:h-12 rounded-2xl px-7 md:px-8 text-base font-semibold text-white transition",
                            canSubmit ? "bg-zinc-900 hover:bg-zinc-800" : "bg-zinc-400"
                        )}
                    >
                        Add task
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}