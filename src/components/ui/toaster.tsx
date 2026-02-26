"use client";

import { Toast, ToastClose, ToastDescription, ToastProvider, ToastViewport } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";

export function Toaster() {
    const { toasts } = useToast();

    return (
        <ToastProvider>
            {toasts.map(({ id, description, action, open, onOpenChange, variant }) => (
                <Toast key={id} variant={variant} onOpenChange={onOpenChange} open={open}>
                    <div className="grid gap-1">
                        {description && <ToastDescription>{description}</ToastDescription>}
                    </div>
                    {action}
                    <ToastClose />
                </Toast>
            ))}
            <ToastViewport />
        </ToastProvider>
    );
}
