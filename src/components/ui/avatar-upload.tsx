"use client";

import { Camera, Trash2, User } from "lucide-react";
import { useRef, useState } from "react";
import {
    completeAvatarUpload,
    deleteAvatar,
    type EntityType,
    requestAvatarUpload,
    toPublicUrl,
    uploadToPresignedUrl,
    validateAvatarFile
} from "@/api/avatar";
import { hexToGradient } from "@/lib/utils";

interface AvatarUploadProps {
    entityType: EntityType;
    entityId: string;
    avatarUrl?: string | null;
    colorHex?: string | null;
    iconEmoji?: string | null;
    initials?: string;
    size?: number;
    onUploadSuccess?: (url: string) => void;
    onDeleteSuccess?: () => void;
    onError?: (message: string) => void;
    disabled?: boolean;
}

export function AvatarUpload({
    entityType,
    entityId,
    avatarUrl,
    colorHex,
    iconEmoji,
    initials,
    size = 80,
    onUploadSuccess,
    onDeleteSuccess,
    onError,
    disabled
}: AvatarUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [hovered, setHovered] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const gradient = hexToGradient(colorHex ?? "#FF5F3D");
    const displaySize = { width: size, height: size };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validationError = validateAvatarFile(file);
        if (validationError) {
            onError?.(validationError);
            if (inputRef.current) inputRef.current.value = "";
            return;
        }

        setUploading(true);
        try {
            // Step 1: request presigned URL
            const res1 = await requestAvatarUpload(entityType, entityId, {
                contentType: file.type,
                fileSize: file.size
            });
            if (res1.status !== "success" || !res1.data) {
                throw new Error(res1.message || "Không lấy được đường dẫn tải lên");
            }
            const { uploadUrl, fileKey } = res1.data;

            // Step 2: upload file to presigned URL
            await uploadToPresignedUrl(uploadUrl, file);

            // Step 3: complete upload
            const res3 = await completeAvatarUpload(entityType, entityId, { fileKey });
            if (res3.status !== "success") {
                throw new Error(res3.message || "Hoàn tất tải lên thất bại");
            }

            // Strip presigned query params → clean public URL for display
            onUploadSuccess?.(toPublicUrl(uploadUrl));
        } catch (err) {
            onError?.(err instanceof Error ? err.message : "Tải ảnh thất bại");
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    const handleDelete = async () => {
        if (!avatarUrl) return;
        setUploading(true);
        try {
            const res = await deleteAvatar(entityType, entityId);
            if (res.status !== "success") {
                throw new Error(res.message || "Xóa ảnh thất bại");
            }
            onDeleteSuccess?.();
        } catch (err) {
            onError?.(err instanceof Error ? err.message : "Xóa ảnh thất bại");
        } finally {
            setUploading(false);
        }
    };

    const isClickable = !(disabled || uploading);

    const avatarCircle = (
        <>
            {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : iconEmoji ? (
                <div
                    className="flex h-full w-full items-center justify-center text-3xl"
                    style={{ background: gradient }}>
                    {iconEmoji}
                </div>
            ) : (
                <div
                    className="flex h-full w-full items-center justify-center font-bold text-white"
                    style={{ background: gradient, fontSize: size * 0.35 }}>
                    {initials ? initials.slice(0, 2).toUpperCase() : <User className="text-white opacity-70" />}
                </div>
            )}

            {/* Hover overlay */}
            {hovered && isClickable && !uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Camera className="h-5 w-5 text-white" />
                </div>
            )}

            {/* Upload spinner */}
            {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
            )}
        </>
    );

    return (
        <div className="flex flex-col items-center gap-3">
            {/* Avatar circle */}
            {isClickable ? (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                    style={displaySize}
                    className="relative shrink-0 overflow-hidden rounded-full bg-transparent p-0 shadow-none">
                    {avatarCircle}
                </button>
            ) : (
                <div style={displaySize} className="relative shrink-0 overflow-hidden rounded-full">
                    {avatarCircle}
                </div>
            )}

            {/* Hidden file input */}
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileChange}
                disabled={disabled || uploading}
            />

            {/* Delete button */}
            {avatarUrl && !uploading && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete();
                    }}
                    disabled={disabled}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-red-500 text-xs transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                    <Trash2 className="h-3 w-3" />
                    Xóa ảnh
                </button>
            )}
        </div>
    );
}
