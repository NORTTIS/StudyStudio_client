import type { HTMLAttributes, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "bordered" | "elevated";
  padding?: "none" | "sm" | "md" | "lg";
  children: ReactNode;
}

export function Card({ variant = "default", padding = "md", className, children, ...props }: CardProps) {
  const baseStyles = "rounded-lg bg-white";

  const variantStyles = {
    default: "",
    bordered: "border border-[#8A8A8A]",
    elevated: "shadow-lg"
  };

  const paddingStyles = {
    none: "",
    sm: "p-3",
    md: "p-4 md:p-6",
    lg: "p-6 md:p-8"
  };

  return (
    <div className={twMerge(baseStyles, variantStyles[variant], paddingStyles[padding], className)} {...props}>
      {children}
    </div>
  );
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <div className={twMerge("mb-4 border-[#8A8A8A] border-b pb-3", className)} {...props}>
      {children}
    </div>
  );
}

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

export function CardTitle({ as: Component = "h3", className, children, ...props }: CardTitleProps) {
  return (
    <Component className={twMerge("font-semibold text-[#261E33] text-xl", className)} {...props}>
      {children}
    </Component>
  );
}

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardContent({ className, children, ...props }: CardContentProps) {
  return (
    <div className={twMerge("text-[#261E33]", className)} {...props}>
      {children}
    </div>
  );
}

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardFooter({ className, children, ...props }: CardFooterProps) {
  return (
    <div className={twMerge("mt-4 flex items-center gap-3 border-[#8A8A8A] border-t pt-3", className)} {...props}>
      {children}
    </div>
  );
}
