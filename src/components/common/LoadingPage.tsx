/**
 * LoadingPage Component
 * Full-page loading state with spinner and message
 */

import { Spinner } from "./Loading";

interface LoadingPageProps {
    message?: string;
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function LoadingPage({ message, size = "lg", className = "" }: LoadingPageProps) {
    return (
        <div className={`flex min-h-screen items-center justify-center bg-gray-50 ${className}`}>
            <div className="flex flex-col items-center gap-4">
                <Spinner size={size} color="primary" />
                {message && <p className="text-muted-foreground text-sm">{message}</p>}
            </div>
        </div>
    );
}
