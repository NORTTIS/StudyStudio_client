import type { ApiResponse } from "@/api/api-client";
import { apiGet } from "@/api/api-client";

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
