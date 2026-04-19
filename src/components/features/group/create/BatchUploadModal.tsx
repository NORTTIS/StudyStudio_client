"use client";

import { Download, UploadCloud, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { BatchAssignResponse, BatchErrorRow } from "@/api/studios";
import { uploadBatchAssignCsv } from "@/api/studios";
import { Button } from "@/components/common/Button";

// Trạng thái tổng thể của modal upload
type UploadState = "idle" | "uploading" | "success" | "error";

interface BatchUploadModalProps {
    open: boolean;
    onClose: () => void;
    studioId: string;
    onSuccess?: () => void;
}

// Giới hạn dung lượng file tối đa: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Các định dạng file được phép upload
const ALLOWED_EXTENSIONS = [".csv", ".xlsx", ".xls"];

export function BatchUploadModal({ open, onClose, studioId, onSuccess }: BatchUploadModalProps) {
    const t = useTranslations("BatchUploadModal");

    // State quản lý trạng thái hiển thị / upload
    const [state, setState] = useState<UploadState>("idle");
    const [isUploading, setIsUploading] = useState(false);

    // File người dùng đã chọn
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Dùng để đổi style khi kéo file vào vùng drop
    const [dragOver, setDragOver] = useState(false);

    // Kết quả trả về sau khi upload thành công
    const [uploadResult, setUploadResult] = useState<BatchAssignResponse | null>(null);

    // Nội dung lỗi hiển thị cho người dùng
    const [errorMessage, setErrorMessage] = useState("");

    // Ref để trigger input file ẩn
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset toàn bộ state mỗi khi modal được mở lại
    useEffect(() => {
        if (open) {
            setState("idle");
            setIsUploading(false);
            setSelectedFile(null);
            setUploadResult(null);
            setErrorMessage("");
            setDragOver(false);
        }
    }, [open]);

    // Đóng modal khi nhấn phím Escape
    useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    // Validate định dạng và dung lượng file
    const validateFile = useCallback(
        (file: File): string | null => {
            const extension = "." + file.name.split(".").pop()?.toLowerCase();

            // Kiểm tra định dạng file hợp lệ
            if (!ALLOWED_EXTENSIONS.includes(extension)) {
                return t("selectError.invalidFormat");
            }

            // Kiểm tra kích thước file
            if (file.size > MAX_FILE_SIZE) {
                return t("selectError.fileTooLarge");
            }

            return null;
        },
        [t]
    );

    // Xử lý khi người dùng chọn file hoặc drop file
    const handleFileSelect = useCallback(
        (file: File) => {
            const validationError = validateFile(file);

            // Nếu file không hợp lệ thì hiển thị lỗi
            if (validationError) {
                setSelectedFile(null);
                setErrorMessage(validationError);
                return;
            }

            // Lưu file hợp lệ vào state
            setSelectedFile(file);
            setErrorMessage("");
        },
        [validateFile]
    );

    // Xử lý khi người dùng thả file vào drop zone
    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragOver(false);

            const file = e.dataTransfer.files[0];
            if (file) {
                handleFileSelect(file);
            }
        },
        [handleFileSelect]
    );

    // Khi kéo file đi vào vùng drop
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    // Khi kéo file ra khỏi vùng drop
    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    }, []);

    // Xử lý khi chọn file qua input type=file
    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                handleFileSelect(file);
            }
        },
        [handleFileSelect]
    );

    // Thực hiện upload file lên server
    const handleUpload = useCallback(async () => {
        if (!selectedFile) return;

        setIsUploading(true);
        setErrorMessage("");

        try {
            const response = await uploadBatchAssignCsv(studioId, selectedFile);

            // Nếu API trả về thành công
            if (response.status === "success" && response.data) {
                setUploadResult(response.data);
                setState("success");
            } else {
                // Nếu API trả về lỗi nghiệp vụ
                setErrorMessage(response.message || "Tải lên thất bại");
                setState("error");
            }
        } catch (err) {
            // Lỗi ngoài mong đợi (network, server...)
            console.error("[BatchUploadModal] Upload failed:", err);
            setErrorMessage(t("errors.uploadFailed"));
            setState("error");
        } finally {
            setIsUploading(false);
        }
    }, [selectedFile, studioId, t]);

    // Tải danh sách lỗi về máy dưới dạng TSV để mở bằng Excel
    const handleDownloadErrors = useCallback(() => {
        if (!uploadResult?.errors || uploadResult.errors.length === 0) return;

        // Header cho file export
        const headers = ["STT", "Email", "Nhóm", "Lý do"];

        // Map danh sách lỗi thành từng dòng dữ liệu
        const rows = uploadResult.errors.map((error: BatchErrorRow) => [
            error.row?.toString() || "",
            error.email || "",
            error.groupName || "",
            error.reason || error.message || ""
        ]);

        // Ghép thành nội dung TSV
        const tsvContent = [headers.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n");

        // Thêm BOM để Excel đọc tiếng Việt đúng encoding UTF-8
        const blob = new Blob(["\ufeff" + tsvContent], { type: "text/tab-separated-values;charset=utf-8" });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = t("downloadErrorsFilename");
        a.click();

        URL.revokeObjectURL(url);
    }, [uploadResult, t]);

    // Đóng modal; nếu upload thành công thì gọi callback onSuccess
    const handleClose = useCallback(() => {
        if (state === "success" && onSuccess) {
            onSuccess();
        }
        onClose();
    }, [state, onSuccess, onClose]);

    // Format dung lượng file để hiển thị thân thiện
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} ${t("fileSize.bytes")}`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${t("fileSize.kb")}`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} ${t("fileSize.mb")}`;
    };

    // Không render gì nếu modal đang đóng
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60" onClick={handleClose} />

            <div className="relative mx-auto flex min-h-[100vh] items-center justify-center px-4 py-6">
                <div className="flex min-w-175 max-w-lg flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 px-8 py-6 sm:px-10">
                        <div>
                            <h2 className="font-bold text-2xl text-[#2A2438] tracking-tight">{t("title")}</h2>
                            <p className="mt-2 text-[#6F6B99] text-sm">{t("subtitle")}</p>
                        </div>

                        {/* Nút đóng modal */}
                        <button
                            type="button"
                            onClick={handleClose}
                            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-orange-200 text-[#2A2438] hover:bg-orange-50"
                            aria-label={t("closeButton")}>
                            <X size={18} />
                        </button>
                    </div>

                    {/* Nội dung chính */}
                    <div className="px-8 pb-6 sm:px-10">
                        {state === "idle" && (
                            <>
                                {/* Vùng kéo thả file */}
                                <div
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-10 transition-colors ${dragOver
                                        ? "border-orange-400 bg-orange-50"
                                        : "border-[#E6E6E6] bg-[#FAFAFF] hover:border-[#CFCFCF]"
                                        }`}>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv,.xlsx,.xls"
                                        onChange={handleInputChange}
                                        className="hidden"
                                    />

                                    <div className="flex flex-col items-center text-center">
                                        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white shadow-sm">
                                            <UploadCloud className="h-8 w-8 text-[#6F6B99]" />
                                        </div>
                                        <p className="mt-4 font-medium text-[#2A2438] text-sm">{t("dropzone.text")}</p>
                                        <p className="mt-2 text-[#6F6B99] text-xs">{t("dropzone.maxSize")}</p>
                                    </div>
                                </div>

                                {/* Thanh hiển thị thông tin file đã chọn */}
                                {selectedFile && (
                                    <div className="mt-4 flex items-center justify-between rounded-xl border border-[#E6E6E6] bg-white px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#FAFAFF]">
                                                <UploadCloud className="h-5 w-5 text-[#6F6B99]" />
                                            </div>
                                            <div>
                                                <div className="max-w-[200px] truncate font-medium text-[#2A2438] text-sm">
                                                    {selectedFile.name}
                                                </div>
                                                <div className="text-[#6F6B99] text-xs">
                                                    {formatFileSize(selectedFile.size)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Xóa file đã chọn */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedFile(null);

                                                // Reset input để có thể chọn lại cùng 1 file nếu cần
                                                if (fileInputRef.current) fileInputRef.current.value = "";
                                            }}
                                            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#6F6B99] hover:bg-gray-100 hover:text-red-500">
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}

                                {/* Hiển thị lỗi validate / upload */}
                                {errorMessage && (
                                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600 text-sm">
                                        {errorMessage}
                                    </div>
                                )}

                                {/* Các nút thao tác */}
                                <div className="mt-6 flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="font-medium text-[#6F6B99] text-sm hover:text-[#2A2438]">
                                        {t("buttons.cancel")}
                                    </button>
                                    <Button
                                        onClick={handleUpload}
                                        disabled={!selectedFile}
                                        isLoading={isUploading}
                                        className="h-11 rounded-xl bg-orange-500 px-8 font-semibold text-sm hover:bg-orange-600 disabled:bg-gray-300">
                                        {t("buttons.upload")}
                                    </Button>
                                </div>
                            </>
                        )}

                        {state === "uploading" && (
                            <div className="flex flex-col items-center py-10">
                                <div className="grid h-16 w-16 place-items-center rounded-full bg-orange-100">
                                    <UploadCloud className="h-8 w-8 animate-bounce text-orange-500" />
                                </div>
                                <p className="mt-4 font-medium text-[#2A2438] text-sm">{t("uploading.title")}</p>
                                <p className="mt-2 text-[#6F6B99] text-xs">{t("uploading.hint")}</p>
                            </div>
                        )}

                        {state === "success" && uploadResult && (
                            <>
                                {/* Banner thông báo upload thành công */}
                                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-green-100">
                                            <svg
                                                className="h-5 w-5 text-green-600"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M5 13l4 4L19 7"
                                                />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="font-semibold text-green-700 text-sm">
                                                {t("success.title")}
                                            </div>
                                            <div className="text-green-600 text-xs">
                                                {t("success.subtitle", { totalRows: uploadResult.totalRows || 0 })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Các chỉ số thống kê sau upload */}
                                <div className="mt-4 grid grid-cols-3 gap-4">
                                    <div className="rounded-xl border border-[#E6E6E6] bg-white px-4 py-3 text-center">
                                        <div className="font-bold text-green-600 text-xl">
                                            {uploadResult.successCount || 0}
                                        </div>
                                        <div className="text-[#6F6B99] text-xs">{t("stats.success")}</div>
                                    </div>

                                    <div className="rounded-xl border border-[#E6E6E6] bg-white px-4 py-3 text-center">
                                        <div className="font-bold text-amber-600 text-xl">
                                            {uploadResult.skippedCount || 0}
                                        </div>
                                        <div className="text-[#6F6B99] text-xs">{t("stats.skipped")}</div>
                                    </div>

                                    <div className="rounded-xl border border-[#E6E6E6] bg-white px-4 py-3 text-center">
                                        <div className="font-bold text-red-600 text-xl">
                                            {uploadResult.errors?.length || 0}
                                        </div>
                                        <div className="text-[#6F6B99] text-xs">{t("stats.error")}</div>
                                    </div>
                                </div>

                                {/* Bảng danh sách lỗi nếu có */}
                                {uploadResult.errors && uploadResult.errors.length > 0 && (
                                    <div className="mt-4">
                                        <div className="mb-2 font-semibold text-[#2A2438] text-sm">
                                            {t("errorList.title", { count: uploadResult.errors.length })}
                                        </div>

                                        <div className="max-h-48 overflow-y-auto rounded-xl border border-[#E6E6E6]">
                                            <table className="w-full text-sm">
                                                <thead className="sticky top-0 bg-[#FAFAFF]">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left font-semibold text-[#2A2438]">
                                                            {t("table.row")}
                                                        </th>
                                                        <th className="px-4 py-2 text-left font-semibold text-[#2A2438]">
                                                            {t("table.email")}
                                                        </th>
                                                        <th className="px-4 py-2 text-left font-semibold text-[#2A2438]">
                                                            {t("table.group")}
                                                        </th>
                                                        <th className="px-4 py-2 text-left font-semibold text-[#2A2438]">
                                                            {t("table.reason")}
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {uploadResult.errors.map((error: BatchErrorRow, index: number) => (
                                                        <tr key={index} className="border-[#E6E6E6] border-t">
                                                            <td className="px-4 py-2 text-[#6F6B99]">{error.row}</td>
                                                            <td className="px-4 py-2 text-[#2A2438]">{error.email}</td>
                                                            <td className="px-4 py-2 text-[#2A2438]">
                                                                {error.groupName}
                                                            </td>
                                                            <td className="px-4 py-2 text-red-600">{error.message}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Nút tải file lỗi và đóng modal */}
                                <div className="mt-6 flex items-center justify-end gap-3">
                                    {uploadResult.errors && uploadResult.errors.length > 0 && (
                                        <Button variant="outline" size="sm" onClick={handleDownloadErrors}>
                                            <Download className="h-4 w-4" />
                                            {t("buttons.downloadErrors")}
                                        </Button>
                                    )}
                                    <Button
                                        onClick={handleClose}
                                        className="h-11 rounded-xl bg-orange-500 px-8 font-semibold text-sm hover:bg-orange-600">
                                        {t("buttons.close")}
                                    </Button>
                                </div>
                            </>
                        )}

                        {state === "error" && (
                            <>
                                {/* Banner hiển thị lỗi upload */}
                                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-100">
                                            <svg
                                                className="h-5 w-5 text-red-600"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M6 18L18 6M6 6l12 12"
                                                />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="font-semibold text-red-700 text-sm">{t("error.title")}</div>
                                            <div className="text-red-600 text-xs">{errorMessage}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Nút đóng hoặc thử lại */}
                                <div className="mt-6 flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="font-medium text-[#6F6B99] text-sm hover:text-[#2A2438]">
                                        {t("buttons.close")}
                                    </button>
                                    <Button
                                        onClick={() => setState("idle")}
                                        className="h-11 rounded-xl bg-orange-500 px-8 font-semibold text-sm hover:bg-orange-600">
                                        {t("buttons.tryAgain")}
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
