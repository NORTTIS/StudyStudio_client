/**
 * Banner & Logo Upload API - 3-step presigned URL flow
 * Mirrors the avatar.ts pattern but for wider banner images and studio logos.
 *
 * Step 1: POST /api/avatar/{type}/{id}/{asset}/request-upload
 *         → Returns { uploadUrl, fileKey, expiresIn }
 * Step 2: PUT {uploadUrl} with binary file (no Authorization header)
 * Step 3: POST /api/avatar/{type}/{id}/{asset}/complete
 *         → Body: { fileKey }
 *
 * Delete: DELETE /api/avatar/{type}/{id}/{asset}
 */

import { type ApiResponse, apiDelete, apiFetch } from "./api-client";

export type BannerEntityType = "group" | "studio";
export type LogoEntityType = "studio";

export const BANNER_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const LOGO_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const BANNER_ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"] as const;
export const LOGO_ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"] as const;

export type AllowedBannerType = (typeof BANNER_ALLOWED_TYPES)[number];
export type AllowedLogoType = (typeof LOGO_ALLOWED_TYPES)[number];

export type RequestBannerUploadResponse = {
    uploadUrl: string;
    fileKey: string;
    expiresIn: number;
};

// ─── Group Banner ─────────────────────────────────────────────────────────────

export async function requestGroupBannerUpload(
    groupId: string,
    body: { contentType: string; fileSize: number },
    locale = "vi"
): Promise<ApiResponse<RequestBannerUploadResponse>> {
    return apiFetch<RequestBannerUploadResponse>(
        `/avatar/group/${groupId}/banner/request-upload`,
        { method: "POST", body: JSON.stringify(body), locale }
    );
}

export async function completeGroupBannerUpload(
    groupId: string,
    body: { fileKey: string },
    locale = "vi"
): Promise<ApiResponse<void>> {
    return apiFetch<void>(
        `/avatar/group/${groupId}/banner/complete`,
        { method: "POST", body: JSON.stringify(body), locale }
    );
}

export async function deleteGroupBanner(
    groupId: string,
    locale = "vi"
): Promise<ApiResponse<void>> {
    return apiDelete<void>(`/avatar/group/${groupId}/banner`, locale);
}

// ─── Studio Banner ───────────────────────────────────────────────────────────

export async function requestStudioBannerUpload(
    studioId: string,
    body: { contentType: string; fileSize: number },
    locale = "vi"
): Promise<ApiResponse<RequestBannerUploadResponse>> {
    return apiFetch<RequestBannerUploadResponse>(
        `/avatar/studio/${studioId}/banner/request-upload`,
        { method: "POST", body: JSON.stringify(body), locale }
    );
}

export async function completeStudioBannerUpload(
    studioId: string,
    body: { fileKey: string },
    locale = "vi"
): Promise<ApiResponse<void>> {
    return apiFetch<void>(
        `/avatar/studio/${studioId}/banner/complete`,
        { method: "POST", body: JSON.stringify(body), locale }
    );
}

export async function deleteStudioBanner(
    studioId: string,
    locale = "vi"
): Promise<ApiResponse<void>> {
    return apiDelete<void>(`/avatar/studio/${studioId}/banner`, locale);
}

// ─── Studio Logo ──────────────────────────────────────────────────────────────

export async function requestStudioLogoUpload(
    studioId: string,
    body: { contentType: string; fileSize: number },
    locale = "vi"
): Promise<ApiResponse<RequestBannerUploadResponse>> {
    return apiFetch<RequestBannerUploadResponse>(
        `/avatar/studio/${studioId}/logo/request-upload`,
        { method: "POST", body: JSON.stringify(body), locale }
    );
}

export async function completeStudioLogoUpload(
    studioId: string,
    body: { fileKey: string },
    locale = "vi"
): Promise<ApiResponse<void>> {
    return apiFetch<void>(
        `/avatar/studio/${studioId}/logo/complete`,
        { method: "POST", body: JSON.stringify(body), locale }
    );
}

export async function deleteStudioLogo(
    studioId: string,
    locale = "vi"
): Promise<ApiResponse<void>> {
    return apiDelete<void>(`/avatar/studio/${studioId}/logo`, locale);
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

export async function uploadToPresignedUrl(uploadUrl: string, file: File): Promise<void> {
    const res = await fetch(uploadUrl, {
        method: "PUT",
        headers: {},
        body: file
    });
    if (!res.ok) {
        throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
    }
}

export function validateBannerFile(file: File): string | null {
    if (file.size > BANNER_MAX_SIZE_BYTES) {
        return "File quá lớn. Kích thước tối đa là 10MB.";
    }
    if (!BANNER_ALLOWED_TYPES.includes(file.type as AllowedBannerType)) {
        return "Định dạng không hỗ trợ. Chỉ chấp nhận: JPG, PNG, WEBP.";
    }
    return null;
}

export function validateLogoFile(file: File): string | null {
    if (file.size > LOGO_MAX_SIZE_BYTES) {
        return "File quá lớn. Kích thước tối đa là 5MB.";
    }
    if (!LOGO_ALLOWED_TYPES.includes(file.type as AllowedLogoType)) {
        return "Định dạng không hỗ trợ. Chỉ chấp nhận: JPG, PNG, WEBP, SVG.";
    }
    return null;
}

export function toPublicUrl(presignedOrPublicUrl: string): string {
    return presignedOrPublicUrl.split("?")[0];
}
