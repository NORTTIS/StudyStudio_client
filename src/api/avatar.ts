/**
 * Avatar Upload API - 3-step presigned URL flow
 *
 * Step 1: POST /api/avatar/{entityType}/{entityId}/request-upload
 *         → Returns { uploadUrl, fileKey, expiresIn }
 * Step 2: PUT {uploadUrl} with binary file (no Content-Type header)
 * Step 3: POST /api/avatar/{entityType}/{entityId}/complete
 *         → Body: { fileKey }
 *
 * Delete: DELETE /api/avatar/{entityType}/{entityId}
 */

import { type ApiResponse, apiDelete, apiFetch } from "./api-client";

export type EntityType = "group" | "studio";

export const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const AVATAR_ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"] as const;

export type AllowedMimeType = (typeof AVATAR_ALLOWED_TYPES)[number];

export type RequestAvatarUploadResponse = {
    uploadUrl: string;
    fileKey: string;
    expiresIn: number;
};

/**
 * Step 1: Request a presigned upload URL from the backend.
 */
export async function requestAvatarUpload(
    entityType: EntityType,
    entityId: string,
    body: { contentType: string; fileSize: number },
    locale = "vi"
): Promise<ApiResponse<RequestAvatarUploadResponse>> {
    return apiFetch<RequestAvatarUploadResponse>(`/avatar/${entityType}/${entityId}/request-upload`, {
        method: "POST",
        body: JSON.stringify(body),
        locale
    });
}

/**
 * Step 2: Upload the file directly to the presigned URL.
 * IMPORTANT: B2 presigned URLs do NOT accept an Authorization header.
 * The signature is already embedded in the URL itself.
 * Content-Type is set automatically by the browser based on the File object's type.
 */
export async function uploadToPresignedUrl(uploadUrl: string, file: File): Promise<void> {
    const res = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
            // NOTE: No Authorization header — B2 uses URL-embedded signature
        },
        body: file
    });

    if (!res.ok) {
        throw new Error(`Avatar upload failed: ${res.status} ${res.statusText}`);
    }
}

/**
 * Step 3: Notify the backend that the upload is complete.
 * The backend will verify the file exists and update the entity's avatarUrl.
 */
export async function completeAvatarUpload(
    entityType: EntityType,
    entityId: string,
    body: { fileKey: string },
    locale = "vi"
): Promise<ApiResponse<void>> {
    return apiFetch<void>(`/avatar/${entityType}/${entityId}/complete`, {
        method: "POST",
        body: JSON.stringify(body),
        locale
    });
}

/**
 * Delete the avatar for a group or studio.
 */
export async function deleteAvatar(
    entityType: EntityType,
    entityId: string,
    locale = "vi"
): Promise<ApiResponse<void>> {
    return apiDelete<void>(`/avatar/${entityType}/${entityId}`, locale);
}

/**
 * Strip query parameters from a B2 presigned URL to get the clean public URL.
 * The presigned URL (e.g. "https://s3.../avatar.png?X-Amz-...") becomes
 * "https://s3.../avatar.png" for public read access.
 */
export function toPublicUrl(presignedOrPublicUrl: string): string {
    return presignedOrPublicUrl.split("?")[0];
}

/**
 * Validate a file before uploading.
 * Returns an error message string if invalid, or null if valid.
 */
export function validateAvatarFile(file: File): string | null {
    if (file.size > AVATAR_MAX_SIZE_BYTES) {
        return "File quá lớn. Kích thước tối đa là 5MB.";
    }

    if (!AVATAR_ALLOWED_TYPES.includes(file.type as AllowedMimeType)) {
        return "Định dạng không hỗ trợ. Chỉ chấp nhận: JPG, PNG, WEBP, GIF.";
    }

    return null;
}
