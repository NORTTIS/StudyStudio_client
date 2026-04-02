"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import {
    deleteStudioLogo,
    requestStudioLogoUpload,
    completeStudioLogoUpload,
    toPublicUrl,
    uploadToPresignedUrl,
    validateLogoFile,
} from "@/api/banner-logo";
import { hexToGradient } from "@/lib/utils";

interface LogoUploadProps {
    studioId: string;
    logoUrl?: string | null;
    colorHex?: string | null;
    onUploadSuccess?: (url: string) => void;
    onDeleteSuccess?: () => void;
    onError?: (message: string) => void;
    disabled?: boolean;
}

export function LogoUpload({
    studioId,
    logoUrl,
    colorHex,
    onUploadSuccess,
    onDeleteSuccess,
    onError,
    disabled,
}: LogoUploadProps) {
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const gradient = hexToGradient(colorHex ?? "#FF5F3D");
    const displayUrl = logoUrl ? toPublicUrl(logoUrl) : null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validationError = validateLogoFile(file);
        if (validationError) {
            onError?.(validationError);
            if (inputRef.current) inputRef.current.value = "";
            return;
        }

        setUploading(true);
        try {
            const { data: reqData } = await requestStudioLogoUpload(studioId, {
                contentType: file.type,
                fileSize: file.size,
            });

            if (reqData?.uploadUrl) {
                await uploadToPresignedUrl(reqData.uploadUrl, file);
                await completeStudioLogoUpload(studioId, { fileKey: reqData.fileKey });
                const publicUrl = toPublicUrl(reqData.uploadUrl);
                onUploadSuccess?.(publicUrl);
            }
        } catch {
            onError?.("Tải lên thất bại. Vui lòng thử lại.");
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    const handleDelete = async () => {
        try {
            await deleteStudioLogo(studioId);
            onDeleteSuccess?.();
        } catch {
            onError?.("Xóa thất bại. Vui lòng thử lại.");
        }
    };

    return (
        <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-border bg-muted/50 group/upload">
            {displayUrl ? (
                <img
                    src={displayUrl}
                    alt="Logo"
                    className="w-full h-full object-cover"
                />
            ) : (
                <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: gradient }}
                >
                    <span className="text-white/60 text-xs font-medium">Chưa có logo</span>
                </div>
            )}

            {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {!disabled && !uploading && (
                <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover/upload:opacity-100 transition-opacity bg-black/40">
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="p-1.5 bg-white/90 rounded-full hover:bg-white text-gray-700 transition-colors"
                    >
                        <ImagePlus className="w-3.5 h-3.5" />
                    </button>
                    {logoUrl && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="p-1.5 bg-white/90 rounded-full hover:bg-white text-red-500 transition-colors"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleFileChange}
            />
        </div>
    );
}
