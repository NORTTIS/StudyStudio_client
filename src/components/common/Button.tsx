import type { ButtonHTMLAttributes, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  isLoading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  isLoading = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variantStyles = {
    primary: "bg-[#FF5722] text-white hover:bg-[#E64A19] focus:ring-[#FF5722]",
    secondary: "border-2 border-[#FF5722] bg-white text-[#FF5722] hover:bg-[#FFF3E0] focus:ring-[#FF5722]",
    outline: "border-2 border-[#E0E0E0] text-[#261E33] hover:bg-[#F8F8F8] focus:ring-[#E0E0E0]",
    ghost: "text-[#261E33] hover:bg-[#F8F8F8] focus:ring-[#E0E0E0]",
    danger: "bg-[#E26060] text-white hover:bg-[#c94f4f] focus:ring-[#E26060]"
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg"
  };

  const widthStyles = fullWidth ? "w-full" : "";

  const buttonStyles = disabled
    ? "bg-[#E0E0E0] text-[#999999] cursor-not-allowed border-[#E0E0E0]"
    : twMerge(baseStyles, variantStyles[variant], sizeStyles[size], widthStyles);

  return (
    <button className={twMerge(buttonStyles, className)} disabled={disabled || isLoading} {...props}>
      {isLoading && (
        <svg
          className="mr-2 h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
