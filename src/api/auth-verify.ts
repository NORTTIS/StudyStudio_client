import type { ApiResponse } from "@/api/api-client";
import { apiGet, apiPost } from "@/api/api-client";
import type { components } from "@/api/types";

export function verifyEmailToken(token: string, locale: string): Promise<ApiResponse> {
    const url = `/auth/verify-email?token=${encodeURIComponent(token)}`;

    return apiGet(url, locale, true);
}

export function verifyResetToken(token: string, locale: string): Promise<ApiResponse> {
    const url = `/auth/verify-reset-token?token=${encodeURIComponent(token)}`;

    return apiGet(url, locale, true);
}

type ResendVerifyEmailRequest = components["schemas"]["ResendVerifyEmailRequest"];

export function resendVerifyEmail(email: string | undefined, locale: string): Promise<ApiResponse> {
    const url = "/auth/resend-email-verify";
    const payload: ResendVerifyEmailRequest = { email };

    return apiPost(url, payload, locale, true);
}
