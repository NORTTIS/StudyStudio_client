/**
 * GoogleIcon Component
 * Google logo SVG for OAuth buttons
 */

interface GoogleIconProps {
    size?: number;
    className?: string;
}

export function GoogleIcon({ size = 18, className = "" }: GoogleIconProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            width={size}
            height={size}
            className={className}
            aria-label="Google">
            <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.2 1.53 7.63 2.8l5.56-5.56C33.64 3.36 29.24 1.5 24 1.5 14.98 1.5 7.21 6.98 3.69 14.91l6.91 5.36C12.4 14.3 17.77 9.5 24 9.5z"
            />
            <path
                fill="#4285F4"
                d="M46.14 24.5c0-1.64-.15-3.22-.43-4.75H24v9h12.46c-.54 2.88-2.16 5.32-4.6 6.98l7.05 5.49C43.73 36.36 46.14 30.9 46.14 24.5z"
            />
            <path
                fill="#FBBC05"
                d="M10.6 28.27A14.5 14.5 0 0 1 9.5 24c0-1.48.26-2.91.72-4.27l-6.9-5.36A23.9 23.9 0 0 0 1.5 24c0 3.86.93 7.5 2.82 10.73l6.28-6.46z"
            />
            <path
                fill="#34A853"
                d="M24 46.5c6.48 0 11.92-2.13 15.9-5.78l-7.05-5.49c-1.96 1.32-4.47 2.1-8.85 2.1-6.2 0-11.45-4.19-13.3-9.83l-6.3 6.47C7.9 41.94 15.5 46.5 24 46.5z"
            />
        </svg>
    );
}
