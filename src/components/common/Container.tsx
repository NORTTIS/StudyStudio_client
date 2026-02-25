import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type ContainerProps = ComponentProps<"div">;

export function Container({ className, ...props }: ContainerProps) {
    return <div className={cn("w-full px-4 py-2 sm:px-6 lg:px-8", className)} {...props} />;
}
