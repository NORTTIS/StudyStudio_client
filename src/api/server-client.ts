/**
 * Server-side API Client
 * Used in Server Components to fetch data from backend API
 */

import { cookies } from "next/headers";

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
     * GET request
     */
    async GET<T = unknown>(endpoint: string, options?: FetchOptions): Promise<ApiResponse<T>> {
        try {
            const headers = await this.buildHeaders(options?.headers);
            const url = `${this.baseURL}${endpoint}`;
            const response = await fetch(url, {
                method: "GET",
                headers,
                cache: options?.cache || "no-store",
                next: options?.revalidate ? { revalidate: options.revalidate } : undefined
            });

            // Check if response is ok and has content
            if (!response.ok) {
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
     * POST request
     */
    async POST<T = unknown>(endpoint: string, body?: unknown, options?: FetchOptions): Promise<ApiResponse<T>> {
        try {
            const headers = await this.buildHeaders(options?.headers);
            const url = `${this.baseURL}${endpoint}`;

            const response = await fetch(url, {
                method: "POST",
                headers,
                body: body ? JSON.stringify(body) : undefined,
                cache: options?.cache || "no-store"
            });

            // Check if response is ok and has content
            if (!response.ok) {
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
     * PUT request
     */
    async PUT<T = unknown>(endpoint: string, body?: unknown, options?: FetchOptions): Promise<ApiResponse<T>> {
        try {
            const headers = await this.buildHeaders(options?.headers);
            const url = `${this.baseURL}${endpoint}`;

            const response = await fetch(url, {
                method: "PUT",
                headers,
                body: body ? JSON.stringify(body) : undefined,
                cache: options?.cache || "no-store"
            });

            // Check if response is ok and has content
            if (!response.ok) {
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
     * DELETE request
     */
    async DELETE<T = unknown>(endpoint: string, options?: FetchOptions): Promise<ApiResponse<T>> {
        try {
            const headers = await this.buildHeaders(options?.headers);
            const url = `${this.baseURL}${endpoint}`;

            const response = await fetch(url, {
                method: "DELETE",
                headers,
                cache: options?.cache || "no-store"
            });

            // Check if response is ok and has content
            if (!response.ok) {
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
