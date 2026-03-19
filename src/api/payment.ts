import { type ApiResponse, apiGet, apiPost } from "./api-client";

// Payment Types
export interface CreatePaymentRequest {
    planId: string;
}

export interface CreatePaymentResponse {
    paymentId: string;
    orderCode: number;
    paymentUrl: string;
    amount: number;
    planName: string;
}

export interface PaymentStatusResponse {
    paymentId: string;
    orderCode: number;
    paymentStatus: string;
    amount: number;
    planName: string;
    createdAt: string;
    paidAt: string | null;
}

export interface PaymentHistory {
    paymentId: string;
    orderCode: number;
    planId: string;
    status: number; // 0=PENDING, 1=SUCCESS, 2=CANCELLED, 3=FAILED
    paidAt: string | null;
}

export interface PaymentHistoryResponse {
    paymentHistories: PaymentHistory[];
}

// Create Payment
export async function createPayment(planId: string, locale: string): Promise<ApiResponse<CreatePaymentResponse>> {
    try {
        const response = await apiPost<CreatePaymentResponse>("/payment/create", { planId }, locale);
        return response;
    } catch (error: unknown) {
        return {
            status: "error",
            code: (error as any)?.response?.data?.code || "PAYMENT_ERROR",
            message: (error as any)?.response?.data?.message || "Failed to create payment",
            data: null
        };
    }
}

// Get Payment Status
export async function getPaymentStatus(paymentId: string, locale: string): Promise<ApiResponse<PaymentStatusResponse>> {
    if (!paymentId || paymentId === "undefined" || paymentId === "null") {
        return {
            status: "error",
            code: "INVALID_ID",
            message: "Mã thanh toán không hợp lệ",
            data: null
        };
    }
    try {
        const response = await apiGet<PaymentStatusResponse>(`/payment/${paymentId}/status`, locale, false, {
            cache: "no-store"
        });
        return response;
    } catch (error: unknown) {
        return {
            status: "error",
            code: (error as any)?.response?.data?.code || "PAYMENT_ERROR",
            message: (error as any)?.response?.data?.message || "Failed to get payment status",
            data: null
        };
    }
}

// Retry Payment - Get payment URL for existing payment
export async function retryPayment(paymentId: string, locale: string): Promise<ApiResponse<CreatePaymentResponse>> {
    try {
        const response = await apiPost<CreatePaymentResponse>(`/payment/${paymentId}/retry`, {}, locale);
        return response;
    } catch (error: unknown) {
        return {
            status: "error",
            code: (error as any)?.response?.data?.code || "PAYMENT_ERROR",
            message: (error as any)?.response?.data?.message || "Failed to retry payment",
            data: null
        };
    }
}

// Cancel Payment
export async function cancelPayment(paymentId: string, locale: string): Promise<ApiResponse<PaymentStatusResponse>> {
    try {
        const response = await apiPost<PaymentStatusResponse>(`/payment/${paymentId}/cancel`, {}, locale);
        return response;
    } catch (error: unknown) {
        return {
            status: "error",
            code: (error as any)?.response?.data?.code || "PAYMENT_ERROR",
            message: (error as any)?.response?.data?.message || "Failed to cancel payment",
            data: null
        };
    }
}

// Get Payment History
export async function getPaymentHistory(locale: string): Promise<ApiResponse<PaymentHistoryResponse>> {
    try {
        const response = await apiGet<PaymentHistoryResponse>("/payment/history", locale, false, {
            cache: "no-store"
        });
        return response;
    } catch (error: unknown) {
        return {
            status: "error",
            code: (error as any)?.response?.data?.code || "PAYMENT_ERROR",
            message: (error as any)?.response?.data?.message || "Failed to get payment history",
            data: null
        };
    }
}
