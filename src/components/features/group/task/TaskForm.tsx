"use client";

import { X } from "lucide-react";
import * as React from "react";
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
    startDate?: string;
    dueDate?: string;
};

export type TaskFormOption = {
    value: string;
    label: string;
};

type Props = {
    open: boolean;
    onClose: () => void;
    onSubmit: (values: TaskFormValues) => Promise<void> | void;

    members?: TaskFormOption[];
    statuses?: TaskFormOption[];

    defaultStatusId?: string | null;
    defaultAssigneeId?: string | null;
    defaultPriority?: TaskPriority;
};

function PriorityDot({ p }: { p: TaskPriority }) {
    const klass = p === "low" ? "bg-emerald-500" : p === "medium" ? "bg-amber-500" : "bg-rose-500";

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

    React.useEffect(() => {
        if (!open) return;

        setError(null);
        setSubmitting(false);

        setTitle("");
        setDescription("");

        setAssigneeId(defaultAssigneeId);
        setStatusId(defaultStatusId ?? statuses[0]?.value ?? null);
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

            const payload: TaskFormValues = {
                title: t,
                description: description.trim(),
                assigneeId,
                statusId,
                priority
            };

            if (startDate) payload.startDate = startDate;
            if (dueDate) payload.dueDate = dueDate;

            await onSubmit(payload);

            onClose();
        } catch (e: any) {
            setError(e?.message ?? "Tạo công việc thất bại");
        } finally {
            setSubmitting(false);
        }
    };

    if (!(open && mounted)) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            onPointerDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}>
            <div
                className="flex max-h-[90vh] w-[92vw] max-w-[720px] flex-col rounded-2xl bg-white shadow-2xl"
                onPointerDown={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4">
                    <h2 className="font-bold text-xl text-zinc-900 md:text-2xl">Thêm công việc mới</h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="overflow-y-auto px-4 pb-6 md:px-6">
                    <label className="block font-semibold text-base text-zinc-800 md:text-lg">Tên công việc</label>

                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Nhập tên công việc"
                        className="mt-3 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-5 text-base outline-none focus:ring-2 focus:ring-indigo-200 md:h-14"
                    />

                    <label className="mt-6 block font-semibold text-base text-zinc-800 md:mt-8 md:text-lg">Mô tả</label>

                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Thêm mô tả (không bắt buộc)"
                        rows={3}
                        className="mt-3 w-full resize-none rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-base outline-none focus:ring-2 focus:ring-indigo-200"
                    />

                    <div className="mt-6 grid grid-cols-1 gap-5 md:mt-8 md:grid-cols-3">
                        <div>
                            <label className="block font-semibold text-base text-zinc-800 md:text-lg">
                                Người phụ trách
                            </label>

                            <select
                                value={assigneeId ?? ""}
                                onChange={(e) => setAssigneeId(e.target.value || null)}
                                className="mt-3 h-12 w-full rounded-2xl border border-zinc-200 px-5 text-base outline-none focus:ring-2 focus:ring-indigo-200 md:h-14">
                                <option value="">Chọn thành viên</option>

                                {members.map((m) => (
                                    <option key={m.value} value={m.value}>
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block font-semibold text-base text-zinc-800 md:text-lg">Trạng thái</label>

                            <select
                                value={statusId ?? ""}
                                onChange={(e) => setStatusId(e.target.value || null)}
                                className="mt-3 h-12 w-full rounded-2xl border border-zinc-200 px-5 text-base outline-none focus:ring-2 focus:ring-indigo-200 md:h-14">
                                {statuses.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block font-semibold text-base text-zinc-800 md:text-lg">Độ ưu tiên</label>

                            <div className="relative mt-3">
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                                    className="h-12 w-full appearance-none rounded-2xl border border-zinc-200 pr-5 pl-12 text-base outline-none focus:ring-2 focus:ring-indigo-200 md:h-14">
                                    <option value="low">Thấp</option>
                                    <option value="medium">Trung bình</option>
                                    <option value="high">Cao</option>
                                </select>

                                <div className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2">
                                    <PriorityDot p={priority} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-5 md:mt-8 md:grid-cols-2">
                        <div>
                            <label className="block font-semibold text-base text-zinc-800 md:text-lg">
                                Ngày bắt đầu
                            </label>

                            <input
                                type="datetime-local"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="mt-3 h-12 w-full rounded-2xl border border-zinc-200 px-5 text-base outline-none focus:ring-2 focus:ring-indigo-200 md:h-14"
                            />
                        </div>

                        <div>
                            <label className="block font-semibold text-base text-zinc-800 md:text-lg">
                                Hạn hoàn thành
                            </label>

                            <input
                                type="datetime-local"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="mt-3 h-12 w-full rounded-2xl border border-zinc-200 px-5 text-base outline-none focus:ring-2 focus:ring-indigo-200 md:h-14"
                            />
                        </div>
                    </div>

                    {error && <div className="mt-4 font-semibold text-rose-600 text-sm">{error}</div>}
                </div>

                <div className="flex items-center justify-end gap-6 border-zinc-200 border-t px-4 py-4 md:px-6">
                    <button onClick={onClose} className="font-semibold text-base text-zinc-700 hover:text-zinc-900">
                        Hủy
                    </button>

                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className={cn(
                            "h-11 rounded-2xl px-7 font-semibold text-base text-white md:h-12 md:px-8",
                            canSubmit ? "bg-zinc-900 hover:bg-zinc-800" : "bg-zinc-400"
                        )}>
                        Thêm công việc
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
