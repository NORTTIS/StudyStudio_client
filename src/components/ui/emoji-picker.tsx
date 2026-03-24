"use client";

import { Smile } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// Dynamically loaded to avoid SSR hydration issues
let PickerComponent: React.ComponentType<{
    data?: unknown;
    theme?: string;
    previewPosition?: string;
    onEmojiSelect: (emoji: { native?: string }) => void;
    locale?: string;
}> | null = null;

interface EmojiPickerProps {
    value?: string | null;
    onChange?: (emoji: string) => void;
    label?: string;
    disabled?: boolean;
}

export function EmojiPicker({ value, onChange, label, disabled }: EmojiPickerProps) {
    const [open, setOpen] = useState(false);
    const [Loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open || PickerComponent) return;

        setLoading(true);
        import("@emoji-mart/react")
            .then((mod) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                PickerComponent = mod.default ?? mod;
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
            });
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const handleSelect = useCallback(
        (emoji: { native?: string }) => {
            onChange?.(emoji.native ?? "");
            setOpen(false);
        },
        [onChange]
    );

    return (
        <div ref={containerRef} className="relative">
            {label && (
                <label htmlFor="emoji-picker-btn" className="mb-1.5 block font-semibold text-gray-700 text-xs">
                    {label}
                </label>
            )}

            <button
                id="emoji-picker-btn"
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setOpen((o) => !o)}
                aria-label="Chọn biểu tượng cảm xúc"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E6E6E6] bg-white text-lg transition-colors hover:border-orange-300 hover:bg-orange-50 disabled:cursor-default disabled:opacity-50">
                {value ? (
                    <span className="text-base leading-none">{value}</span>
                ) : (
                    <Smile className="h-5 w-5 text-[#6F6B99]" />
                )}
            </button>

            {open && (
                <div className="absolute top-full left-0 z-50 mt-2">
                    {Loading ? (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E6E6E6] bg-white shadow-xl">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-orange-500" />
                        </div>
                    ) : PickerComponent ? (
                        <PickerComponent
                            data={undefined}
                            theme="light"
                            previewPosition="none"
                            onEmojiSelect={handleSelect}
                            locale="vi"
                        />
                    ) : null}
                </div>
            )}
        </div>
    );
}
