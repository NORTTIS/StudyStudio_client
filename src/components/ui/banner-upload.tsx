"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import {
    completeGroupBannerUpload,
    completeStudioBannerUpload,
    completeTemplateBannerUpload,
    deleteGroupBanner,
    deleteStudioBanner,
    deleteTemplateBanner,
    requestGroupBannerUpload,
    requestStudioBannerUpload,
    requestTemplateBannerUpload,
    toPublicUrl,
    uploadToPresignedUrl,
    validateBannerFile
} from "@/api/banner-logo";
import { hexToGradient } from "@/lib/utils";

interface BannerUploadProps {
    entityType: "group" | "studio" | "template";
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
    disabled
}: BannerUploadProps) {
    const t = useTranslations("BannerUpload");
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
            let uploadReqFn: typeof requestGroupBannerUpload;
            let completeReqFn: typeof completeGroupBannerUpload;
            if (entityType === "group") {
                uploadReqFn = requestGroupBannerUpload;
                completeReqFn = completeGroupBannerUpload;
            } else if (entityType === "studio") {
                uploadReqFn = requestStudioBannerUpload;
                completeReqFn = completeStudioBannerUpload;
            } else {
                uploadReqFn = requestTemplateBannerUpload;
                completeReqFn = completeTemplateBannerUpload;
            }

            const res1 = await uploadReqFn(entityId, {
                contentType: file.type,
                fileSize: file.size
            });

            if (res1.status !== "success" || !res1.data) {
                throw new Error(res1.message || t("errors.requestUploadUrl"));
            }

            const { uploadUrl, fileKey } = res1.data;

            await uploadToPresignedUrl(uploadUrl, file);

            const res3 = await completeReqFn(entityId, { fileKey });
            if (res3.status !== "success") {
                throw new Error(res3.message || t("errors.completeUpload"));
            }

            onUploadSuccess?.(toPublicUrl(uploadUrl));
        } catch (err) {
            onError?.(err instanceof Error ? err.message : t("errors.uploadFailed"));
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    const handleDelete = async () => {
        try {
            let deleteFn: typeof deleteGroupBanner;
            if (entityType === "group") {
                deleteFn = deleteGroupBanner;
            } else if (entityType === "studio") {
                deleteFn = deleteStudioBanner;
            } else {
                deleteFn = deleteTemplateBanner;
            }
            await deleteFn(entityId);
            onDeleteSuccess?.();
        } catch {
            onError?.(t("errors.deleteFailed"));
        }
    };

    return (
        <div className="group/upload relative aspect-[16/7] min-h-[180px] w-full overflow-hidden rounded-xl border border-border bg-muted/50">
            {displayUrl ? (
                <img src={displayUrl} alt={t("alt")} className="h-full w-full object-cover" />
            ) : (
                <div className="flex h-full w-full items-center justify-center" style={{ background: gradient }}>
                    <span className="font-medium text-sm text-white/60">{t("empty")}</span>
                </div>
            )}

            {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent border-white" />
                </div>
            )}

            {!disabled && !uploading && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover/upload:opacity-100">
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="rounded-full bg-white/90 p-2 text-gray-700 transition-colors hover:bg-white"
                        aria-label={t("upload")}
                        title={t("upload")}
                    >
                        <ImagePlus className="h-4 w-4" />
                    </button>
                    {bannerUrl && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="rounded-full bg-white/90 p-2 text-red-500 transition-colors hover:bg-white"
                            aria-label={t("remove")}
                            title={t("remove")}
                        >
                            <Trash2 className="h-4 w-4" />
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
