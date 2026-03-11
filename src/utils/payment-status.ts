/**
 * Payment Status Mapping
 * Maps backend PaymentStatus enum to frontend display
 */

export enum PaymentStatus {
    PENDING = 0,
    SUCCESS = 1,
    CANCELLED = 2,
    FAILED = 3
}

export interface PaymentStatusInfo {
    label: string;
    color: string;
    bgColor: string;
    icon: string;
}

export const PAYMENT_STATUS_MAP: Record<PaymentStatus, PaymentStatusInfo> = {
    [PaymentStatus.PENDING]: {
        label: "Đang xử lý",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
        icon: "clock"
    },
    [PaymentStatus.SUCCESS]: {
        label: "Thành công", 
        color: "text-green-600",
        bgColor: "bg-green-50",
        icon: "check-circle"
    },
    [PaymentStatus.CANCELLED]: {
        label: "Đã hủy",
        color: "text-red-600", 
        bgColor: "bg-red-50",
        icon: "x-circle"
    },
    [PaymentStatus.FAILED]: {
        label: "Thất bại",
        color: "text-red-600",
        bgColor: "bg-red-50", 
        icon: "x-circle"
    }
};

/**
 * Get payment status info by status string or number
 */
export function getPaymentStatusInfo(status: string | number): PaymentStatusInfo {
    // Handle string status (legacy)
    if (typeof status === 'string') {
        const normalizedStatus = status.toLowerCase();
        
        if (normalizedStatus === 'pending') return PAYMENT_STATUS_MAP[PaymentStatus.PENDING];
        if (normalizedStatus === 'success' || normalizedStatus === 'completed') return PAYMENT_STATUS_MAP[PaymentStatus.SUCCESS];
        if (normalizedStatus === 'cancelled') return PAYMENT_STATUS_MAP[PaymentStatus.CANCELLED];
        if (normalizedStatus === 'failed') return PAYMENT_STATUS_MAP[PaymentStatus.FAILED];
        
        // Default fallback
        return PAYMENT_STATUS_MAP[PaymentStatus.PENDING];
    }
    
    // Handle numeric status (from backend enum)
    const numericStatus = Number(status) as PaymentStatus;
    return PAYMENT_STATUS_MAP[numericStatus] || PAYMENT_STATUS_MAP[PaymentStatus.PENDING];
}

/**
 * Sort subscription plans by BillingCycle (low to high)
 * BillingCycle: 0 = Free, 1+ = Premium tiers
 */
export function sortPlansByBillingCycle<T extends { billingCycle: number }>(plans: T[]): T[] {
    return [...plans].sort((a, b) => a.billingCycle - b.billingCycle);
}