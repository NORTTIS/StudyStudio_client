/**
 * Server-side API Client
 * Used in Server Components to fetch data from backend API
 */

import { cookies } from "next/headers";
import { sanitizeErrorMessage } from "@/utils/error-message";

interface ApiResponse<T = unknown> {
    status: "success" | "error";
    code: string;
    message: string;
    data: T | null;
}

interface FetchOptions {
    headers?: Record<string, string>;
    cache?: RequestCache;
    revalidate?: number;
}

class ServerApiClient {
    private baseURL: string;

    constructor() {
        this.baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    }

    /**
     * Get access token from cookies
     */
    private async getAccessToken(): Promise<string | null> {
        const cookieStore = await cookies();
        return cookieStore.get("accessToken")?.value || null;
    }

    /**
     * Build headers with authentication
     */
    private async buildHeaders(
        customHeaders?: Record<string, string>,
        skipAuth = false
    ): Promise<Record<string, string>> {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            ...customHeaders
        };

        if (!skipAuth) {
            const token = await this.getAccessToken();
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
        }

        return headers;
    }

    /**
     * Refresh access token via internal Next.js API route
     */
    private async _refreshToken(): Promise<string | null> {
        try {
            const refreshResponse = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/refresh`,
                { method: "POST" }
            );
            if (!refreshResponse.ok) return null;
            const data = await refreshResponse.json();
            return data.data?.accessToken ?? null;
        } catch {
            return null;
        }
    }

    /**
     * GET request with automatic 401 token refresh
     */
    async GET<T = unknown>(endpoint: string, options?: FetchOptions): Promise<ApiResponse<T>> {
        try {
            const headers = await this.buildHeaders(options?.headers);
            const url = `${this.baseURL}${endpoint}`;
            let response = await fetch(url, {
                method: "GET",
                headers,
                cache: options?.cache || "no-store",
                next: options?.revalidate ? { revalidate: options.revalidate } : undefined
            });

            // 401: refresh token and retry once
            if (response.status === 401) {
                const newToken = await this._refreshToken();
                if (newToken) {
                    headers.Authorization = `Bearer ${newToken}`;
                    response = await fetch(url, {
                        method: "GET",
                        headers,
                        cache: options?.cache || "no-store",
                        next: options?.revalidate ? { revalidate: options.revalidate } : undefined
                    });
                }
            }

            // Check if response is ok and has content
            if (!response.ok) {
                // Handle 429 Rate Limit specifically
                if (response.status === 429) {
                    console.warn(`Rate limit exceeded for ${endpoint}`);
                    return {
                        status: "error",
                        code: "RATE_LIMIT_EXCEEDED",
                        message: "Too many requests. Please try again later.",
                        data: null
                    };
                }
                console.log(`GET ${endpoint} failed with status ${response.status}`);
                return {
                    status: "error",
                    code: `HTTP_${response.status}`,
                    message: `Request failed with status ${response.status}`,
                    data: null
                };
            }

            // Check if response has content before parsing JSON
            const text = await response.text();
            if (!text) {
                return {
                    status: "error",
                    code: "EMPTY_RESPONSE",
                    message: "Server returned empty response",
                    data: null
                };
            }

            const data: ApiResponse<T> = JSON.parse(text);
            if (data.status === "error") {
                return {
                    ...data,
                    message: sanitizeErrorMessage(data.message, "Đã xảy ra lỗi")
                };
            }

            return data;
        } catch (error) {
            console.error(`GET ${endpoint} error:`, error);
            return {
                status: "error",
                code: "FETCH_ERROR",
                message: error instanceof Error ? error.message : "Unknown error",
                data: null
            };
        }
    }

    /**
     * POST request with automatic 401 token refresh
     */
    async POST<T = unknown>(endpoint: string, body?: unknown, options?: FetchOptions): Promise<ApiResponse<T>> {
        try {
            const headers = await this.buildHeaders(options?.headers);
            const url = `${this.baseURL}${endpoint}`;

            let response = await fetch(url, {
                method: "POST",
                headers,
                body: body ? JSON.stringify(body) : undefined,
                cache: options?.cache || "no-store"
            });

            // 401: refresh token and retry once
            if (response.status === 401) {
                const newToken = await this._refreshToken();
                if (newToken) {
                    headers.Authorization = `Bearer ${newToken}`;
                    response = await fetch(url, {
                        method: "POST",
                        headers,
                        body: body ? JSON.stringify(body) : undefined,
                        cache: options?.cache || "no-store"
                    });
                }
            }

            // Check if response is ok and has content
            if (!response.ok) {
                // Handle 429 Rate Limit specifically
                if (response.status === 429) {
                    console.warn(`Rate limit exceeded for ${endpoint}`);
                    return {
                        status: "error",
                        code: "RATE_LIMIT_EXCEEDED",
                        message: "Too many requests. Please try again later.",
                        data: null
                    };
                }
                return {
                    status: "error",
                    code: `HTTP_${response.status}`,
                    message: `Request failed with status ${response.status}`,
                    data: null
                };
            }

            // Check if response has content before parsing JSON
            const text = await response.text();
            if (!text) {
                return {
                    status: "error",
                    code: "EMPTY_RESPONSE",
                    message: "Server returned empty response",
                    data: null
                };
            }

            const data: ApiResponse<T> = JSON.parse(text);
            if (data.status === "error") {
                return {
                    ...data,
                    message: sanitizeErrorMessage(data.message, "Đã xảy ra lỗi")
                };
            }

            return data;
        } catch (error) {
            console.error(`POST ${endpoint} error:`, error);
            return {
                status: "error",
                code: "FETCH_ERROR",
                message: error instanceof Error ? error.message : "Unknown error",
                data: null
            };
        }
    }

    /**
     * PUT request with automatic 401 token refresh
     */
    async PUT<T = unknown>(endpoint: string, body?: unknown, options?: FetchOptions): Promise<ApiResponse<T>> {
        try {
            const headers = await this.buildHeaders(options?.headers);
            const url = `${this.baseURL}${endpoint}`;

            let response = await fetch(url, {
                method: "PUT",
                headers,
                body: body ? JSON.stringify(body) : undefined,
                cache: options?.cache || "no-store"
            });

            // 401: refresh token and retry once
            if (response.status === 401) {
                const newToken = await this._refreshToken();
                if (newToken) {
                    headers.Authorization = `Bearer ${newToken}`;
                    response = await fetch(url, {
                        method: "PUT",
                        headers,
                        body: body ? JSON.stringify(body) : undefined,
                        cache: options?.cache || "no-store"
                    });
                }
            }

            // Check if response is ok and has content
            if (!response.ok) {
                // Handle 429 Rate Limit specifically
                if (response.status === 429) {
                    console.warn(`Rate limit exceeded for ${endpoint}`);
                    return {
                        status: "error",
                        code: "RATE_LIMIT_EXCEEDED",
                        message: "Too many requests. Please try again later.",
                        data: null
                    };
                }
                return {
                    status: "error",
                    code: `HTTP_${response.status}`,
                    message: `Request failed with status ${response.status}`,
                    data: null
                };
            }

            // Check if response has content before parsing JSON
            const text = await response.text();
            if (!text) {
                return {
                    status: "error",
                    code: "EMPTY_RESPONSE",
                    message: "Server returned empty response",
                    data: null
                };
            }

            const data: ApiResponse<T> = JSON.parse(text);
            if (data.status === "error") {
                return {
                    ...data,
                    message: sanitizeErrorMessage(data.message, "Đã xảy ra lỗi")
                };
            }

            return data;
        } catch (error) {
            console.error(`PUT ${endpoint} error:`, error);
            return {
                status: "error",
                code: "FETCH_ERROR",
                message: error instanceof Error ? error.message : "Unknown error",
                data: null
            };
        }
    }

    /**
     * DELETE request with automatic 401 token refresh
     */
    async DELETE<T = unknown>(endpoint: string, options?: FetchOptions): Promise<ApiResponse<T>> {
        try {
            const headers = await this.buildHeaders(options?.headers);
            const url = `${this.baseURL}${endpoint}`;

            let response = await fetch(url, {
                method: "DELETE",
                headers,
                cache: options?.cache || "no-store"
            });

            // 401: refresh token and retry once
            if (response.status === 401) {
                const newToken = await this._refreshToken();
                if (newToken) {
                    headers.Authorization = `Bearer ${newToken}`;
                    response = await fetch(url, {
                        method: "DELETE",
                        headers,
                        cache: options?.cache || "no-store"
                    });
                }
            }

            // Check if response is ok and has content
            if (!response.ok) {
                // Handle 429 Rate Limit specifically
                if (response.status === 429) {
                    console.warn(`Rate limit exceeded for ${endpoint}`);
                    return {
                        status: "error",
                        code: "RATE_LIMIT_EXCEEDED",
                        message: "Too many requests. Please try again later.",
                        data: null
                    };
                }
                return {
                    status: "error",
                    code: `HTTP_${response.status}`,
                    message: `Request failed with status ${response.status}`,
                    data: null
                };
            }

            // Check if response has content before parsing JSON
            const text = await response.text();
            if (!text) {
                return {
                    status: "error",
                    code: "EMPTY_RESPONSE",
                    message: "Server returned empty response",
                    data: null
                };
            }

            const data: ApiResponse<T> = JSON.parse(text);
            if (data.status === "error") {
                return {
                    ...data,
                    message: sanitizeErrorMessage(data.message, "Đã xảy ra lỗi")
                };
            }

            return data;
        } catch (error) {
            console.error(`DELETE ${endpoint} error:`, error);
            return {
                status: "error",
                code: "FETCH_ERROR",
                message: error instanceof Error ? error.message : "Unknown error",
                data: null
            };
        }
    }
}

// Export singleton instance
export const serverFetchApi = new ServerApiClient();
