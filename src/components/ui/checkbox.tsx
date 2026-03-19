"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

interface CheckboxProps extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
    checked?: boolean | "indeterminate";
    onCheckedChange?: (checked: boolean | "indeterminate") => void;
}

const Checkbox = React.forwardRef<React.ComponentRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
    ({ className, checked, onCheckedChange, ...props }, ref) => (
        <CheckboxPrimitive.Root
            ref={ref}
            checked={checked}
            onCheckedChange={onCheckedChange}
            className={cn(
                "peer h-5 w-5 shrink-0 rounded-[4px] border border-gray-300 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-orange-500 data-[state=indeterminate]:border-orange-500 data-[state=checked]:bg-orange-500 data-[state=indeterminate]:bg-orange-500 data-[state=checked]:text-white data-[state=indeterminate]:text-white",
                className
            )}
            {...props}>
            <CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-current")}>
                <CheckIcon className="h-3.5 w-3.5" />
            </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
    )
);
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
