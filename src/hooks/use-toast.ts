import { toast as sonnerToast } from "sonner";
import { sanitizeErrorMessage } from "@/utils/error-message";

export interface ToastProps {
    description: string;
    variant?: "default" | "destructive" | "success";
}

export function useToast() {
    const toast = ({ description, variant = "default" }: ToastProps) => {
        const normalizedDescription = sanitizeErrorMessage(description, "Đã xảy ra lỗi");

        switch (variant) {
            case "destructive":
                sonnerToast.error(normalizedDescription);
                break;
            case "success":
                sonnerToast.success(normalizedDescription);
                break;
            default:
                sonnerToast(normalizedDescription);
                break;
        }
    };

    return { toast };
}
