/**
 * Studios API
 * Handles studio/workspace operations
 */

import { apiFetch } from "./api-client";

export type Studio = {
  id: string;
  name: string;
  description: string;
  type: "personal" | "group";
  memberCount: number;
  videoCount: number;
  createdAt: string;
  updatedAt: string;
};

export type StudioListResponse = {
  studios: Studio[];
  total: number;
};

export type CreateStudioRequest = {
  name: string;
  description: string;
  type: "personal" | "group";
};

export type UpdateStudioRequest = {
  name?: string;
  description?: string;
  type?: "personal" | "group";
};

/**
 * Get list of studios
 */
export async function getStudios(locale = "vi") {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  return apiFetch<StudioListResponse>(`${baseUrl}/studios`, {
    method: "GET",
    locale
  });
}

/**
 * Get studio by ID
 */
export async function getStudioById(id: string, locale = "vi") {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  return apiFetch<Studio>(`${baseUrl}/studios/${id}`, {
    method: "GET",
    locale
  });
}

/**
 * Create new studio
 */
export async function createStudio(data: CreateStudioRequest, locale = "vi") {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  return apiFetch<Studio>(`${baseUrl}/studios`, {
    method: "POST",
    body: JSON.stringify(data),
    locale
  });
}

/**
 * Update studio
 */
export async function updateStudio(id: string, data: UpdateStudioRequest, locale = "vi") {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  return apiFetch<Studio>(`${baseUrl}/studios/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
    locale
  });
}

/**
 * Delete studio
 */
export async function deleteStudio(id: string, locale = "vi") {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  return apiFetch<null>(`${baseUrl}/studios/${id}`, {
    method: "DELETE",
    locale
  });
}
