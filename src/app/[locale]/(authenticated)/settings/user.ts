/**
 * User Profile & Settings API
 * Handles user profile operations, password changes, and report submissions
 */

import { apiFetch } from "../../../../api/api-client";
import type { components } from "../../../../api/types";

// ===== Type Definitions =====

export type UserProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  bio?: string;
  avatar?: string;
  language: string;
  emailNotificationEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UpdateProfileRequest = {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  bio?: string;
  language?: string;
  emailNotificationEnabled?: boolean;
  avatar?: File;
};

export type ChangePasswordRequest = components["schemas"]["ChangePasswordRequest"];

export type ReportRequest = components["schemas"]["ReportRequest"];

// ===== API Functions =====

/**
 * Get user profile
 */
export async function getUserProfile(locale = "vi") {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  return apiFetch<UserProfile>(`${baseUrl}/user-profile`, {
    method: "GET",
    locale
  });
}

/**
 * Update user profile
 * Handles multipart/form-data for avatar upload
 */
export async function updateUserProfile(data: UpdateProfileRequest, locale = "vi") {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const formData = new FormData();

  // Append form fields
  if (data.firstName) formData.append("FirstName", data.firstName);
  if (data.lastName) formData.append("LastName", data.lastName);
  if (data.phoneNumber) formData.append("PhoneNumber", data.phoneNumber);
  if (data.bio) formData.append("Bio", data.bio);
  if (data.language) formData.append("Language", data.language);
  if (data.emailNotificationEnabled !== undefined) {
    formData.append("EmailNotificationEnabled", String(data.emailNotificationEnabled));
  }
  if (data.avatar) formData.append("Avatar", data.avatar);

  // Use apiFetch with custom headers for multipart/form-data
  const headers = new Headers();
  headers.set("Accept-Language", locale);

  const token = localStorage.getItem("accessToken");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    const response = await fetch(`${baseUrl}/user-profile`, {
      method: "PUT",
      headers,
      body: formData
    });

    const result = await response.json();
    return result;
  } catch {
    return {
      status: "error",
      code: "NETWORK_ERROR",
      message:
        locale === "vi"
          ? "Không thể cập nhật thông tin. Vui lòng thử lại."
          : "Cannot update profile. Please try again.",
      data: null
    };
  }
}

/**
 * Delete current user account
 */
export async function deleteUserProfile(locale = "vi") {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  return apiFetch<null>(`${baseUrl}/user-profile`, {
    method: "DELETE",
    locale
  });
}

/**
 * Change password
 */
export async function changePassword(data: ChangePasswordRequest, locale = "vi") {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  return apiFetch<null>(`${baseUrl}/change-password`, {
    method: "POST",
    body: JSON.stringify(data),
    locale
  });
}

/**
 * Send report/feedback
 */
export async function sendReport(data: ReportRequest, locale = "vi") {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  return apiFetch<null>(`${baseUrl}/reports`, {
    method: "POST",
    body: JSON.stringify(data),
    locale
  });
}
