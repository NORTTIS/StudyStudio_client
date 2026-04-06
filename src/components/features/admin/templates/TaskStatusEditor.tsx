"use client";

import { useState } from "react";
import type { components } from "@/api/types";

export type TaskStatusItem = {
    statusId?: string;
    statusName: string;
    position: number;
};

interface TaskStatusEditorProps {
    items: TaskStatusItem[];
    onChange: (items: TaskStatusItem[]) => void;
    disabled?: boolean;
    locale?: string;
}

const DEFAULT_STATUSES: TaskStatusItem[] = [
    { statusId: "new-1", statusName: "To Do", position: 0 },
    { statusId: "new-2", statusName: "In Progress", position: 1 },
    { statusId: "new-3", statusName: "Done", position: 2 }
];

/** Convert TaskStatusDto from types.ts to local TaskStatusItem */
export function fromTaskStatusDto(dto: components["schemas"]["TaskStatusDto"]): TaskStatusItem {
    return {
        statusId: dto.statusId,
        statusName: dto.statusName ?? "",
        position: dto.position ?? 0
    };
}

export function TaskStatusEditor({
    items,
    onChange,
    disabled = false,
    locale = "vi"
}: TaskStatusEditorProps) {
    const [localItems, setLocalItems] = useState<TaskStatusItem[]>(
        items.length > 0 ? items : DEFAULT_STATUSES
    );

    const emit = (updated: TaskStatusItem[]) => {
        setLocalItems(updated);
        onChange(updated);
    };

    const handleNameChange = (index: number, value: string) => {
        const updated = [...localItems];
        updated[index] = { ...updated[index], statusName: value };
        emit(updated);
    };

    const handleMoveUp = (index: number) => {
        if (index === 0) return;
        const updated = [...localItems];
        [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
        emit(updated.map((item, i) => ({ ...item, position: i })));
    };

    const handleMoveDown = (index: number) => {
        if (index === localItems.length - 1) return;
        const updated = [...localItems];
        [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
        emit(updated.map((item, i) => ({ ...item, position: i })));
    };

    const handleDelete = (index: number) => {
        if (localItems.length <= 1) return;
        const updated = localItems.filter((_, i) => i !== index);
        emit(updated.map((item, i) => ({ ...item, position: i })));
    };

    const handleAdd = () => {
        const newId = `new-${Date.now()}`;
        emit([
            ...localItems,
            { statusId: newId, statusName: "", position: localItems.length }
        ]);
    };

    const labelOrder = locale === "vi" ? "Thứ tự" : "Order";
    const labelAddColumn = locale === "vi" ? "Thêm cột" : "Add column";
    const labelNamePlaceholder = locale === "vi" ? "Tên cột kanban..." : "Kanban column name...";
    const labelHelper = locale === "vi"
        ? "Tối thiểu 1 cột. Dùng mũi tên để sắp xếp lại thứ tự."
        : "Minimum 1 column. Use arrows to reorder.";

    return (
        <div className="space-y-2">

            {/* Status list */}
            <div className="space-y-2">
                {localItems.map((item, index) => {
                    const isFirst = index === 0;
                    const isLast = index === localItems.length - 1;
                    const canDelete = localItems.length > 1;

                    return (
                        <div
                            key={item.statusId || `temp-${index}`}
                            className="group flex items-center gap-3 rounded-xl border border-[#E5E5E5] bg-white px-4 py-3 transition-all duration-200 hover:border-[#FF5F3D]/30 has-[:focus-visible]:border-[#FF5F3D] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#FF5F3D]/10"
                        >
                            {/* Index indicator */}
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#F8F8F8] text-sm font-semibold text-[#6F6B99]">
                                {index + 1}
                            </div>

                            {/* Status name input */}
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={item.statusName}
                                    onChange={(e) => handleNameChange(index, e.target.value)}
                                    disabled={disabled}
                                    placeholder={labelNamePlaceholder}
                                    maxLength={50}
                                    className="w-full rounded-lg border-0 bg-transparent px-3 py-2 text-sm font-medium text-[#261E33] placeholder:text-[#6F6B99]/50 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
                                />
                            </div>

                            {/* Action buttons */}
                            <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 has-[:focus-visible]:opacity-100">
                                <button
                                    type="button"
                                    onClick={() => handleMoveUp(index)}
                                    disabled={disabled || isFirst}
                                    title={locale === "vi" ? "Di chuyen len" : "Move up"}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6F6B99] transition-colors duration-150 hover:bg-[#F8F8F8] hover:text-[#261E33] disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleMoveDown(index)}
                                    disabled={disabled || isLast}
                                    title={locale === "vi" ? "Di chuyen xuong" : "Move down"}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6F6B99] transition-colors duration-150 hover:bg-[#F8F8F8] hover:text-[#261E33] disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleDelete(index)}
                                    disabled={disabled || !canDelete}
                                    title={locale === "vi" ? "Xoa cot" : "Delete column"}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6F6B99] transition-colors duration-150 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add column button */}
            <button
                type="button"
                onClick={handleAdd}
                disabled={disabled}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#E5E5E5] py-3 text-sm font-medium text-[#6F6B99] transition-all duration-200 hover:border-[#FF5F3D] hover:bg-[#FF5F3D]/5 hover:text-[#FF5F3D] disabled:cursor-not-allowed disabled:opacity-40"
            >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {labelAddColumn}
            </button>

            {/* Helper text */}
            <p className="text-xs text-[#6F6B99]/70">{labelHelper}</p>
        </div>
    );
}
