import type { ApiResponse } from "@/api/api-client";
import { apiGet, apiPost } from "@/api/api-client";
import type { components } from "@/api/types";

export function verifyEmailToken(token: string, locale: string): Promise<ApiResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const url = `${baseUrl}/auth/verify-email?token=${encodeURIComponent(token)}`;

  return apiGet(url, locale, true);
}

export function verifyResetToken(token: string, locale: string): Promise<ApiResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const url = `${baseUrl}/auth/verify-reset-token?token=${encodeURIComponent(token)}`;

  return apiGet(url, locale, true);
}

type ResendVerifyEmailRequest = components["schemas"]["ResendVerifyEmailRequest"];

export function resendVerifyEmail(email: string | undefined, locale: string): Promise<ApiResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const url = `${baseUrl}/auth/resend-email-verify`;
  const payload: ResendVerifyEmailRequest = { email };

  return apiPost(url, payload, locale, true);
}
