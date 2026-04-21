/**
 * Authentication and Token Management
 * Handles token storage, retrieval, and refresh logic
 */

export type AuthTokens = {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isAdmin?: boolean; // Add isAdmin field from API
    avatarUrl?: string | null; // User avatar URL
    accessToken: string;
    accessExpireIn: number;
    refreshToken: string;
    refreshExpireIn: number;
};

import { clearUserProfileCache } from "@/api/user-profile";
import { clearAllUserSnapshotCaches } from "@/lib/user-snapshot-cache";

type RefreshResponse = {
    status: "success" | "error";
    code: string;
    message: string;
    data: AuthTokens | null;
};

type RefreshTokenRequest = {
    refreshToken: string;
};

const STORAGE_KEYS = {
    ACCESS_TOKEN: "accessToken",
    REFRESH_TOKEN: "refreshToken",
    USER_DATA: "userData",
    TOKEN_EXPIRY: "tokenExpiry"
} as const;

/**
 * Check if code is running in browser
 */
const isBrowser = typeof window !== "undefined";

// Mutex to prevent concurrent token refresh calls
let refreshPromise: Promise<AuthTokens | null> | null = null;

/**
 * Store authentication tokens and user data in localStorage and cookies
 */
export function setAuthTokens(data: AuthTokens): void {
    if (!isBrowser) return;

    clearUserProfileCache();

    const { accessToken, refreshToken, accessExpireIn, ...userData } = data;

    // Calculate expiry timestamp (current time + expireIn milliseconds)
    const expiryTime = Date.now() + accessExpireIn;

    // Store in localStorage
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));

    // Also store access token in cookies for server-side access
    // Note: This is not httpOnly, so less secure than server-set cookies
    // For production, consider having the API set httpOnly cookies
    const expiryDate = new Date(expiryTime);
    /* eslint-disable */
    document.cookie = `accessToken=${accessToken}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Lax`;
    document.cookie = `refreshToken=${refreshToken}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Lax`;
    /* eslint-enable */
}

/**
 * Get access token from localStorage
 */
export function getAccessToken(): string | null {
    if (!isBrowser) return null;
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

/**
 * Get refresh token from localStorage
 */
export function getRefreshToken(): string | null {
    if (!isBrowser) return null;
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
}

/**
 * Get user data from localStorage
 */
export function getUserData(): Omit<
    AuthTokens,
    "accessToken" | "refreshToken" | "accessExpireIn" | "refreshExpireIn"
> | null {
    if (!isBrowser) return null;

    const userDataStr = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (!userDataStr) return null;

    try {
        return JSON.parse(userDataStr);
    } catch {
        return null;
    }
}

/**
 * Check if access token is expired
 */
export function isTokenExpired(): boolean {
    if (!isBrowser) return true;

    const expiryStr = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
    if (!expiryStr) return true;

    const expiryTime = Number.parseInt(expiryStr, 10);
    // Add 30 second buffer to refresh before actual expiry (reduced from 60s)
    return Date.now() >= expiryTime - 30000;
}

/**
 * Clear all authentication data from localStorage and cookies
 */
export function clearAuthTokens(): void {
    if (!isBrowser) return;

    clearUserProfileCache();
    clearAllUserSnapshotCaches();

    // Clear localStorage
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);

    // Clear cookies
    /* eslint-disable */
    document.cookie = "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
    document.cookie = "refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
    /* eslint-enable */
}

/**
 * Refresh access token using refresh token
 * @param locale - Current locale for Accept-Language header
 */
export async function refreshAccessToken(locale = "vi"): Promise<AuthTokens | null> {
    // If a refresh is already in progress, wait for it instead of starting another
    if (refreshPromise) {
        return refreshPromise;
    }

    const refreshToken = getRefreshToken();

    if (!refreshToken) {
        // No refresh token available, return null immediately
        return null;
    }

    // Create the refresh promise and store it to prevent concurrent calls
    refreshPromise = (async () => {
        try {
            const requestBody: RefreshTokenRequest = {
                refreshToken
            };

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept-Language": locale
                },
                body: JSON.stringify(requestBody)
            });

            const data: RefreshResponse = await response.json();

            if (data.status === "success" && data.data) {
                setAuthTokens(data.data);
                return data.data;
            }

            // Refresh failed, clear tokens
            clearAuthTokens();
            return null;
        } catch {
            // Network error, clear tokens
            clearAuthTokens();
            return null;
        } finally {
            // Clear the promise so future refreshes can proceed
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
    return !!getAccessToken() && !isTokenExpired();
}

/**
 * Logout user - Clear tokens and call logout API
 * @param locale - Current locale for Accept-Language header
 */
export async function logout(locale = "vi"): Promise<boolean> {
    const accessToken = getAccessToken();

    // Clear local tokens first
    clearAuthTokens();

    // Call logout API if we have a token
    if (accessToken) {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/logout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept-Language": locale,
                    Authorization: `Bearer ${accessToken}`
                }
            });
            return true;
        } catch {
            // Even if API call fails, tokens are already cleared
            return true;
        }
    }

    return true;
}
