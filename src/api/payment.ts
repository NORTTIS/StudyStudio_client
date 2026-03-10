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
    planId: string;
    status: string;
    paidAt: string | null;
}

export interface PaymentHistoryResponse {
    paymentHistories: PaymentHistory[];
}

// Helper to get API base URL
const getApiBaseUrl = () => {
    return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";
};

// Create Payment
export async function createPayment(planId: string, locale: string): Promise<ApiResponse<CreatePaymentResponse>> {
    try {
        const baseUrl = getApiBaseUrl();
        const response = await apiPost<CreatePaymentResponse>(`${baseUrl}/payment/create`, { planId }, locale);
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
    try {
        const baseUrl = getApiBaseUrl();
        const response = await apiGet<PaymentStatusResponse>(`${baseUrl}/payment/${paymentId}/status`, locale);
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
        const baseUrl = getApiBaseUrl();
        const response = await apiPost<CreatePaymentResponse>(`${baseUrl}/payment/${paymentId}/retry`, {}, locale);
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
        const baseUrl = getApiBaseUrl();
        const response = await apiPost<PaymentStatusResponse>(`${baseUrl}/payment/${paymentId}/cancel`, {}, locale);
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
        const baseUrl = getApiBaseUrl();
        const response = await apiGet<PaymentHistoryResponse>(`${baseUrl}/payment/history`, locale);
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
