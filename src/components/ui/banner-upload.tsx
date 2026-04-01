"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import {
    completeGroupBannerUpload,
    completeStudioBannerUpload,
    deleteGroupBanner,
    deleteStudioBanner,
    requestGroupBannerUpload,
    requestStudioBannerUpload,
    toPublicUrl,
    uploadToPresignedUrl,
    validateBannerFile,
} from "@/api/banner-logo";
import { hexToGradient } from "@/lib/utils";

interface BannerUploadProps {
    entityType: "group" | "studio";
    entityId: string;
    bannerUrl?: string | null;
    colorHex?: string | null;
    onUploadSuccess?: (url: string) => void;
    onDeleteSuccess?: () => void;
    onError?: (message: string) => void;
    disabled?: boolean;
}

export function BannerUpload({
    entityType,
    entityId,
    bannerUrl,
    colorHex,
    onUploadSuccess,
    onDeleteSuccess,
    onError,
    disabled,
}: BannerUploadProps) {
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const gradient = hexToGradient(colorHex ?? "#6366F1");
    const displayUrl = bannerUrl ? toPublicUrl(bannerUrl) : null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validationError = validateBannerFile(file);
        if (validationError) {
            onError?.(validationError);
            if (inputRef.current) inputRef.current.value = "";
            return;
        }

        setUploading(true);
        try {
            const uploadReqFn = entityType === "group"
                ? requestGroupBannerUpload
                : requestStudioBannerUpload;
            const completeReqFn = entityType === "group"
                ? completeGroupBannerUpload
                : completeStudioBannerUpload;

            // Step 1: request presigned URL
            const res1 = await uploadReqFn(entityId, {
                contentType: file.type,
                fileSize: file.size,
            });
            if (res1.status !== "success" || !res1.data) {
                throw new Error(res1.message || "Không lấy được đường dẫn tải lên");
            }
            const { uploadUrl, fileKey } = res1.data;

            // Step 2: upload file to presigned URL
            await uploadToPresignedUrl(uploadUrl, file);

            // Step 3: complete upload
            const res3 = await completeReqFn(entityId, { fileKey });
            if (res3.status !== "success") {
                throw new Error(res3.message || "Hoàn tất tải lên thất bại");
            }

            // Strip presigned query params → clean public URL for display
            onUploadSuccess?.(toPublicUrl(uploadUrl));
        } catch (err) {
            onError?.(err instanceof Error ? err.message : "Tải lên thất bại. Vui lòng thử lại.");
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    const handleDelete = async () => {
        try {
            const deleteFn = entityType === "group" ? deleteGroupBanner : deleteStudioBanner;
            await deleteFn(entityId);
            onDeleteSuccess?.();
        } catch {
            onError?.("Xóa thất bại. Vui lòng thử lại.");
        }
    };

    return (
        <div className="relative w-full aspect-[3/1] rounded-xl overflow-hidden border border-border bg-muted/50 group/upload">
            {displayUrl ? (
                <img
                    src={displayUrl}
                    alt="Banner"
                    className="w-full h-full object-cover"
                />
            ) : (
                <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: gradient }}
                >
                    <span className="text-white/60 text-sm font-medium">Chưa có banner</span>
                </div>
            )}

            {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {!disabled && !uploading && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover/upload:opacity-100 transition-opacity bg-black/40">
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="p-2 bg-white/90 rounded-full hover:bg-white text-gray-700 transition-colors"
                    >
                        <ImagePlus className="w-4 h-4" />
                    </button>
                    {bannerUrl && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="p-2 bg-white/90 rounded-full hover:bg-white text-red-500 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
            />
        </div>
    );
}
