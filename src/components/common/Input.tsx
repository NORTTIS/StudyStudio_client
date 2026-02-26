import type { InputHTMLAttributes } from "react";
import { forwardRef } from "react";
import { twMerge } from "tailwind-merge";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    fullWidth?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helperText, fullWidth = false, leftIcon, rightIcon, className, id, disabled, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
        const hasError = Boolean(error);

        const baseStyles = "px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2";
        const widthStyles = fullWidth ? "w-full" : "";
        const iconPaddingLeft = leftIcon ? "pl-10" : "";
        const iconPaddingRight = rightIcon ? "pr-10" : "";

        const stateStyles = hasError
            ? "border-[#E26060] focus:ring-[#E26060] focus:border-[#E26060]"
            : "border-[#8A8A8A] focus:ring-[#4C6AA8] focus:border-[#4C6AA8]";

        const disabledStyles = disabled ? "bg-[#F8F8F8] cursor-not-allowed" : "bg-white";

        return (
            <div className={twMerge("flex flex-col", fullWidth && "w-full")}>
                {label && (
                    <label htmlFor={inputId} className="mb-1.5 font-medium text-[#261E33] text-sm">
                        {label}
                    </label>
                )}

                <div className="relative">
                    {leftIcon && (
                        <div className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#6F6B99]">
                            {leftIcon}
                        </div>
                    )}

                    <input
                        ref={ref}
                        id={inputId}
                        disabled={disabled}
                        className={twMerge(
                            baseStyles,
                            widthStyles,
                            iconPaddingLeft,
                            iconPaddingRight,
                            stateStyles,
                            disabledStyles,
                            "text-[#261E33] placeholder:text-[#6F6B99]",
                            className
                        )}
                        aria-invalid={hasError}
                        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
                        {...props}
                    />

                    {rightIcon && (
                        <div className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#6F6B99]">
                            {rightIcon}
                        </div>
                    )}
                </div>

                {error && (
                    <span id={`${inputId}-error`} className="mt-1 text-[#E26060] text-sm" role="alert">
                        {error}
                    </span>
                )}

                {helperText && !error && (
                    <span id={`${inputId}-helper`} className="mt-1 text-[#6F6B99] text-sm">
                        {helperText}
                    </span>
                )}
            </div>
        );
    }
);

Input.displayName = "Input";
