import { toast as sonnerToast } from "sonner";

export interface ToastProps {
    description: string;
    variant?: "default" | "destructive" | "success";
}

export function useToast() {
    const toast = ({ description, variant = "default" }: ToastProps) => {
        switch (variant) {
            case "destructive":
                sonnerToast.error(description);
                break;
            case "success":
                sonnerToast.success(description);
                break;
            default:
                sonnerToast(description);
                break;
        }
    };

    return { toast };
}
