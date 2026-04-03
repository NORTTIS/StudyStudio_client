/**
 * API Client with automatic Accept-Language and Authorization headers
 * Handles API requests with proper error handling, i18n support, and token refresh
 */

import { getAccessToken, isTokenExpired, refreshAccessToken } from "@/api/auth";

export type ApiResponse<T = unknown> = {
    status: "success" | "error";
    code: string;
    message: string;
    data: T | null;
};

type FetchOptions = RequestInit & {
    locale?: string;
    skipAuth?: boolean; // Skip Authorization header (for login/register)
    skipDefaultHeaders?: boolean; // Skip Content-Type/Accept-Language headers (for FormData uploads)
};

/**
 * Build full URL from endpoint
 * Handles baseURL that already contains /api to avoid double /api
 * @param endpoint - API endpoint (e.g., "/api/users" or "/users")
 * @returns full URL
 */
function buildUrl(endpoint: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";

    // If endpoint starts with /api, remove it since baseUrl already has /api
    const cleanEndpoint = endpoint.startsWith("/api") ? endpoint.slice(4) : endpoint;
    const normalizedEndpoint = cleanEndpoint.startsWith("/") ? cleanEndpoint : `/${cleanEndpoint}`;

    return `${baseUrl}${normalizedEndpoint}`;
}

/**
 * Enhanced fetch with Accept-Language and Authorization headers
 * Automatically handles token refresh on 401 responses
 * @param url - API endpoint
 * @param options - Fetch options with optional locale and skipAuth
 */
export async function apiFetch<T = unknown>(url: string, options: FetchOptions = {}): Promise<ApiResponse<T>> {
    const { locale = "vi", skipAuth = false, skipDefaultHeaders = false, ...fetchOptions } = options;

    // Build full URL with base URL (handles /api deduplication)
    const fullUrl = url.startsWith("http") ? url : buildUrl(url);

    // Check if token needs refresh before making request (only for authenticated requests)
    if (!skipAuth && isTokenExpired()) {
        const refreshed = await refreshAccessToken(locale);
        if (!refreshed) {
            // Redirect to login if refresh fails (only in browser)
            if (typeof window !== "undefined") {
                window.location.href = `/${locale}/login`;
            }
            console.warn("Access token expired and refresh failed. Redirecting to login.");
            return {
                status: "error",
                code: "AUTH_REQUIRED",
                message: locale === "vi" ? "Vui lòng đăng nhập lại" : "Please login again",
                data: null
            };
        }
    }

    const headers = new Headers(fetchOptions.headers);
    if (!skipDefaultHeaders) {
        headers.set("Content-Type", "application/json");
        headers.set("Accept-Language", locale);
    }

    // Add Authorization header if not skipped
    if (!skipAuth) {
        const token = getAccessToken();
        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }
    }

    try {
        const response = await fetch(fullUrl, {
            ...fetchOptions,
            headers
        });

        const data: ApiResponse<T> = await response.json();

        // Handle 401 Unauthorized - try to refresh token and retry
        if (response.status === 401 && !skipAuth) {
            const refreshed = await refreshAccessToken(locale);

            if (refreshed) {
                // Retry original request with new token
                headers.set("Authorization", `Bearer ${refreshed.accessToken}`);
                const retryResponse = await fetch(fullUrl, {
                    ...fetchOptions,
                    headers
                });
                return await retryResponse.json();
            }

            // Redirect to login if refresh fails
            if (typeof window !== "undefined") {
                window.location.href = `/${locale}/login`;
            }
        }

        // Handle 429 Rate Limit - return error with proper message
        if (response.status === 429) {
            console.warn("Rate limit exceeded for:", fullUrl);
            return {
                status: "error",
                code: "RATE_LIMIT_EXCEEDED",
                message:
                    locale === "vi"
                        ? "Quá nhiều yêu cầu. Vui lòng thử lại sau."
                        : "Too many requests. Please try again later.",
                data: null
            };
        }
        console.log("API Response:", { url: fullUrl, options: fetchOptions, response, data });
        return data;
    } catch {
        // Network or parsing error
        return {
            status: "error",
            code: "NETWORK_ERROR",
            message:
                locale === "vi"
                    ? "Không thể kết nối tới server. Vui lòng thử lại."
                    : "Cannot connect to server. Please try again.",
            data: null
        };
    }
}

/**
 * Helper for POST requests
 * @param skipAuth - Set to true for login/register endpoints to skip Authorization header
 */
export async function apiPost<T = unknown>(
    url: string,
    body: unknown,
    locale?: string,
    skipAuth?: boolean
): Promise<ApiResponse<T>> {
    return apiFetch<T>(url, {
        method: "POST",
        body: JSON.stringify(body),
        locale,
        skipAuth
    });
}

export async function apiGet<T = unknown>(
    url: string,
    locale?: string,
    skipAuth?: boolean,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    return apiFetch<T>(url, {
        method: "GET",
        locale,
        skipAuth,
        ...options
    });
}

/**
 * Helper for downloading files
 */
export async function apiDownload(url: string, locale = "vi"): Promise<Blob> {
    const fullUrl = url.startsWith("http") ? url : buildUrl(url);
    const headers = new Headers();
    headers.set("Accept-Language", locale);

    const token = getAccessToken();
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(fullUrl, {
        method: "GET",
        headers
    });

    if (!response.ok) {
        throw new Error("Failed to download file");
    }

    return await response.blob();
}
/**
 * Helper for PUT requests
 * @param skipAuth - Set to true for public endpoints to skip Authorization header
 */
export async function apiPut<T = unknown>(
    url: string,
    body: unknown,
    locale?: string,
    skipAuth?: boolean
): Promise<ApiResponse<T>> {
    return apiFetch<T>(url, {
        method: "PUT",
        body: JSON.stringify(body),
        locale,
        skipAuth
    });
}

/**
 * Helper for DELETE requests
 * @param skipAuth - Set to true for public endpoints to skip Authorization header
 */
export async function apiDelete<T = unknown>(
    url: string,
    locale?: string,
    skipAuth?: boolean
): Promise<ApiResponse<T>> {
    return apiFetch<T>(url, {
        method: "DELETE",
        locale,
        skipAuth
    });
}

/**
 * Helper for PATCH requests
 * @param skipAuth - Set to true for public endpoints to skip Authorization header
 */
export async function apiPatch<T = unknown>(
    url: string,
    body: unknown,
    locale?: string,
    skipAuth?: boolean
): Promise<ApiResponse<T>> {
    return apiFetch<T>(url, {
        method: "PATCH",
        body: JSON.stringify(body),
        locale,
        skipAuth
    });
}
