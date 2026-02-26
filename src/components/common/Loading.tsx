/** biome-ignore-all lint/a11y/useSemanticElements: <explanation> */
import { twMerge } from "tailwind-merge";

interface SpinnerProps {
    size?: "sm" | "md" | "lg";
    color?: "primary" | "secondary" | "white";
    className?: string;
}

export function Spinner({ size = "md", color = "primary", className }: SpinnerProps) {
    const sizeStyles = {
        sm: "h-4 w-4",
        md: "h-8 w-8",
        lg: "h-12 w-12"
    };

    const colorStyles = {
        primary: "text-[#F97316]",
        secondary: "text-[#FB923C]",
        white: "text-white"
    };

    return (
        <svg
            className={twMerge("animate-spin", sizeStyles[size], colorStyles[color], className)}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-label="Loading"
            role="status">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
        </svg>
    );
}

interface LoadingOverlayProps {
    message?: string;
}

export function LoadingOverlay({ message = "Loading..." }: LoadingOverlayProps) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-label="Loading">
            <div className="flex flex-col items-center gap-4 rounded-lg bg-white p-6 shadow-lg">
                <Spinner size="lg" />
                <p className="text-[#261E33]">{message}</p>
            </div>
        </div>
    );
}

interface SkeletonProps {
    width?: string;
    height?: string;
    className?: string;
    variant?: "text" | "circular" | "rectangular";
}

export function Skeleton({ width, height, className, variant = "text" }: SkeletonProps) {
    const variantStyles = {
        text: "h-4 rounded",
        circular: "rounded-full aspect-square",
        rectangular: "rounded-lg"
    };

    const widthStyle = width ? { width } : "";
    const heightStyle = height ? { height } : "";

    return (
        <div
            className={twMerge("animate-pulse bg-[#F8F8F8]", variantStyles[variant], className)}
            style={{ ...widthStyle, ...heightStyle }}
            aria-hidden="true"
        />
    );
}
