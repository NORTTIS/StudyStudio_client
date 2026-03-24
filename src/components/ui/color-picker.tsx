"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";

export const BRAND_COLORS = [
    "#FF5F3D", // Coral
    "#FF7A54", // Ember
    "#FF4D6A", // Ruby
    "#FF3CAC", // Fuchsia
    "#7C3AED", // Violet
    "#4F46E5", // Indigo
    "#2563EB", // Blue
    "#06B6D4", // Cyan
    "#10B981", // Emerald
    "#84CC16", // Lime
    "#F59E0B", // Amber
    "#F43F5E" // Rose
];

interface ColorPickerProps {
    value: string;
    onChange?: (hex: string) => void;
    label?: string;
    disabled?: boolean;
}

export function ColorPicker({ value, onChange, label, disabled }: ColorPickerProps) {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setInputValue(value);
    }, [value]);

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

    const isValidHex = (v: string) => /^#[0-9A-Fa-f]{6}$/.test(v);

    const normalizeValue = (raw: string): string => {
        const trimmed = raw.trim();
        return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    };

    const handleInputChange = (raw: string) => {
        setInputValue(raw);
        const normalized = normalizeValue(raw);
        if (isValidHex(normalized)) {
            onChange?.(normalized.toUpperCase());
        }
    };

    const handleSwatchClick = (hex: string) => {
        onChange?.(hex.toUpperCase());
        setInputValue(hex.toUpperCase());
        setOpen(false);
    };

    const displayColor = isValidHex(value) ? value : "#E6E6E6";

    return (
        <div ref={containerRef} className="relative">
            {label && (
                <label htmlFor="color-picker-btn" className="mb-1.5 block font-semibold text-gray-700 text-xs">
                    {label}
                </label>
            )}

            <button
                id="color-picker-btn"
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setOpen((o) => !o)}
                className="flex w-full items-center gap-2 rounded-xl border border-[#E6E6E6] bg-white px-3 py-2 text-sm transition-colors hover:border-orange-300 disabled:cursor-default disabled:opacity-50">
                <span
                    className="h-5 w-5 shrink-0 rounded-full border border-black/10"
                    style={{ backgroundColor: displayColor }}
                />
                <span className="flex-1 text-left font-mono text-gray-600 text-xs">{value.toUpperCase()}</span>
                <ChevronDown
                    className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
                />
            </button>

            {open && (
                <div className="absolute top-full left-0 z-50 mt-2 w-64 rounded-2xl border border-[#E6E6E6] bg-white p-4 shadow-xl">
                    <HexColorPicker
                        color={isValidHex(value) ? value : "#FF5F3D"}
                        onChange={onChange ? (hex) => onChange(hex) : undefined}
                    />

                    <div className="mt-3 flex items-center gap-1">
                        <span className="shrink-0 font-mono text-gray-400 text-xs">#</span>
                        <input
                            type="text"
                            value={inputValue.replace("#", "")}
                            onChange={(e) => handleInputChange(`#${e.target.value}`)}
                            maxLength={6}
                            placeholder="FF5F3D"
                            className="flex-1 rounded-lg border border-[#E6E6E6] px-2 py-1.5 font-mono text-xs uppercase outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-100"
                        />
                    </div>

                    <div className="mt-3 grid grid-cols-6 gap-2">
                        {BRAND_COLORS.map((hex) => (
                            <button
                                key={hex}
                                type="button"
                                onClick={() => handleSwatchClick(hex)}
                                title={hex}
                                className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                                style={{
                                    backgroundColor: hex,
                                    borderColor: value.toUpperCase() === hex.toUpperCase() ? "#261E33" : "transparent"
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
