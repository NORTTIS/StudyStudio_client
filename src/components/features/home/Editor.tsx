"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type TaskProgressEditorProps = {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
};

const PROGRESS_OPTIONS = [0, 25, 50, 75, 100] as const;

function normalizeProgressValue(n?: number | null) {
    if (typeof n !== "number" || !Number.isFinite(n)) return 0;
    const value = Math.floor(n);
    if (value < 0) return 0;
    if (value > 100) return 100;
    return value;
}

function progressLabelOf(n?: number | null) {
    const value = normalizeProgressValue(n);
    if (value === 0) return "To do";
    if (value < 50) return "Started";
    if (value < 75) return "In progress";
    if (value < 100) return "Review";
    return "Done";
}

export function TaskProgressEditor({
    value,
    onChange,
    disabled = false
}: TaskProgressEditorProps) {
    const selectedProgressValue = React.useMemo(
        () => normalizeProgressValue(Number(value)),
        [value]
    );

    const selectedProgressLabel = React.useMemo(
        () => progressLabelOf(selectedProgressValue),
        [selectedProgressValue]
    );

    const handleProgressInputChange = (nextValue: string) => {
        const digits = nextValue.replace(/\D+/g, "");

        if (digits === "") {
            onChange("");
            return;
        }

        // 00, 000 -> 0
        if (/^0+$/.test(digits)) {
            onChange("0");
            return;
        }

        // cho phép 100
        if (digits === "100") {
            onChange("100");
            return;
        }

        // nếu gõ quá 100 thì khóa về 100
        if (digits.startsWith("100")) {
            onChange("100");
            return;
        }

        // còn lại giữ nguyên, tối đa 2 ký tự
        onChange(digits.slice(0, 2));
    };

    const handleProgressInputBlur = () => {
        if (value === "") {
            onChange("0");
            return;
        }

        if (value === "100") {
            return;
        }

        const n = Number(value);

        if (!Number.isFinite(n)) {
            onChange("0");
            return;
        }

        onChange(String(Math.min(Math.max(Math.floor(n), 0), 100)));
    };

    return (
        <div className="sm:col-span-2 xl:col-span-3">
            <div className="text-sm font-semibold text-zinc-600">Progress</div>

            <div className="mt-2 rounded-xl border border-zinc-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-zinc-800">
                        {selectedProgressLabel}
                    </span>

                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={value}
                            onChange={(e) =>
                                handleProgressInputChange(e.target.value)
                            }
                            onBlur={handleProgressInputBlur}
                            disabled={disabled}
                            placeholder="0"
                            className="h-9 w-16 rounded-lg border border-zinc-200 px-0 text-center text-sm font-semibold leading-none text-zinc-900 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
                        />
                        <span className="font-bold text-zinc-900">%</span>
                    </div>
                </div>

                <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-zinc-200">
                    <div
                        className="h-full rounded-full bg-orange-500 transition-all"
                        style={{ width: `${selectedProgressValue}%` }}
                    />
                </div>

                <div className="grid grid-cols-5 gap-2">
                    {PROGRESS_OPTIONS.map((item) => {
                        const active = selectedProgressValue === item;

                        return (
                            <button
                                key={item}
                                type="button"
                                disabled={disabled}
                                onClick={() => onChange(String(item))}
                                className={cn(
                                    "h-10 rounded-xl border text-sm font-semibold transition",
                                    active
                                        ? "border-orange-500 bg-orange-500 text-white"
                                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                                    disabled && "cursor-not-allowed opacity-70"
                                )}
                            >
                                {item}%
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}