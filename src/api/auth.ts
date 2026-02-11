/**
 * Authentication and Token Management
 * Handles token storage, retrieval, and refresh logic
 */

export type AuthTokens = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  accessToken: string;
  accessExpireIn: number;
  refreshToken: string;
  refreshExpireIn: number;
};

type RefreshResponse = {
  status: "success" | "error";
  code: string;
  message: string;
  data: AuthTokens | null;
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

/**
 * Store authentication tokens and user data in localStorage
 */
export function setAuthTokens(data: AuthTokens): void {
  if (!isBrowser) return;

  const { accessToken, refreshToken, accessExpireIn, ...userData } = data;

  // Calculate expiry timestamp (current time + expireIn milliseconds)
  const expiryTime = Date.now() + accessExpireIn;

  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
  localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
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
  // Add 60 second buffer to refresh before actual expiry
  return Date.now() >= expiryTime - 60000;
}

/**
 * Clear all authentication data from localStorage
 */
export function clearAuthTokens(): void {
  if (!isBrowser) return;

  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
  localStorage.removeItem(STORAGE_KEYS.USER_DATA);
}

/**
 * Refresh access token using refresh token
 * @param locale - Current locale for Accept-Language header
 */
export async function refreshAccessToken(locale = "vi"): Promise<AuthTokens | null> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    clearAuthTokens();
    return null;
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": locale,
        Authorization: `Bearer ${refreshToken}`
      }
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
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken() && !isTokenExpired();
}
