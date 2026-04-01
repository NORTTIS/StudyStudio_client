"use client";

import { AlertCircle } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

const ALIAS_MAX_LENGTH = 50;
const ALIAS_PATTERN = /^[a-zA-Z0-9\sÀ-ỹ_\-]+$/;

interface AliasInputProps {
    value: string;
    onChange?: (value: string) => void;
    disabled?: boolean;
    error?: string;
    label?: string;
    placeholder?: string;
}

export function AliasInput({
    value,
    onChange,
    disabled,
    error,
    label = "Biệt danh",
    placeholder = "Nhập biệt danh (VD: THPT Hoang Dieu)",
}: AliasInputProps) {
    const [touched, setTouched] = useState(false);

    const isValid = value.length === 0 || ALIAS_PATTERN.test(value);
    const showError = touched && !isValid && value.length > 0;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        if (raw.length > ALIAS_MAX_LENGTH) return;
        onChange?.(raw);
    };

    const displayError = error || (showError ? "Chỉ chấp nhận chữ cái, số, khoảng trắng, gạch dưới và gạch ngang" : null);

    return (
        <div className="space-y-1.5">
            {label && (
                <label className="block font-semibold text-gray-700 text-xs">
                    {label}
                </label>
            )}

            <Input
                value={value}
                onChange={handleChange}
                onBlur={() => setTouched(true)}
                disabled={disabled}
                placeholder={placeholder}
                maxLength={ALIAS_MAX_LENGTH}
                className={
                    showError || error
                        ? "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500"
                        : "border-gray-200 focus-visible:border-orange-500 focus-visible:ring-orange-500"
                }
            />

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 min-h-[16px]">
                    {displayError && (
                        <div className="flex items-center gap-1 text-red-500 text-xs">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>{displayError}</span>
                        </div>
                    )}
                </div>
                <span className="text-gray-400 text-xs ml-auto">
                    {value.length}/{ALIAS_MAX_LENGTH}
                </span>
            </div>

            {/* Live badge preview */}
            {value.length > 0 && isValid && !disabled && (
                <div className="mt-1">
                    <span className="inline-flex items-center rounded-full border border-orange-300 bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                        {value}
                    </span>
                </div>
            )}
        </div>
    );
}
