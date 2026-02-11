/**
 * API Client with automatic Accept-Language header
 * Handles API requests with proper error handling and i18n support
 */

type ApiResponse<T = unknown> = {
  status: "success" | "error";
  code: string;
  message: string;
  data: T | null;
};

type FetchOptions = RequestInit & {
  locale?: string;
};

/**
 * Enhanced fetch with Accept-Language header based on locale
 * @param url - API endpoint
 * @param options - Fetch options with optional locale
 */
export async function apiFetch<T = unknown>(url: string, options: FetchOptions = {}): Promise<ApiResponse<T>> {
  const { locale = "vi", ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Accept-Language", locale);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers
    });

    const data: ApiResponse<T> = await response.json();

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
 */
export async function apiPost<T = unknown>(url: string, body: unknown, locale?: string): Promise<ApiResponse<T>> {
  return apiFetch<T>(url, {
    method: "POST",
    body: JSON.stringify(body),
    locale
  });
}

/**
 * Helper for GET requests
 */
export async function apiGet<T = unknown>(url: string, locale?: string): Promise<ApiResponse<T>> {
  return apiFetch<T>(url, {
    method: "GET",
    locale
  });
}
