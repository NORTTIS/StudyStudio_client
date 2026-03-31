"use client";

import { Download, FileText, MoreHorizontal, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { twMerge } from "tailwind-merge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export interface DocumentData {
    attachmentId: string;
    fileName: string;
    fileSize?: number;
    contentType?: string;
    uploadedBy?: {
        firstName?: string | null;
        lastName?: string | null;
    };
    createdAt?: string;
}

export interface DocumentCardProps {
    document: DocumentData;
    canDelete: boolean;
    onDownload: (attachmentId: string) => void;
    onDelete: (attachmentId: string) => void;
    isDeleting?: boolean;
    t: ReturnType<typeof useTranslations>;
}

function getExt(name: string) {
    const m = name.toLowerCase().match(/\.([a-z0-9]+)$/i);
    return m?.[1] || "";
}

function niceType(ext: string): string {
    if (ext === "pdf") return "PDF";
    if (ext === "txt") return "TXT";
    if (ext === "md") return "MD";
    if (ext === "doc" || ext === "docx") return "DOC";
    return ext.toUpperCase() || "FILE";
}

function formatBytes(bytes?: number): string {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(createdAt?: string): string {
    if (!createdAt) return "";
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return createdAt;
    return date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

export function DocumentCardComponent({ document, canDelete, onDownload, onDelete, isDeleting, t }: DocumentCardProps) {
    const ext = getExt(document.fileName);
    const fileType = niceType(ext);
    const uploaderName =
        [document.uploadedBy?.firstName, document.uploadedBy?.lastName].filter(Boolean).join(" ") ||
        t("unknownUploader");
    const uploadedText = document.createdAt ? `${uploaderName} • ${formatDate(document.createdAt)}` : uploaderName;

    return (
        <div className="group relative rounded-[18px] border border-slate-200 bg-white px-5 py-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
            <div className="flex items-start gap-4">
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                    <FileText className="h-5 w-5 text-slate-600" />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-slate-900 text-sm">{document.fileName}</p>
                        <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 font-medium font-mono text-[10px] text-slate-500">
                            {fileType}
                        </span>
                    </div>
                    <p className="mt-1 text-slate-500 text-xs">{uploadedText}</p>
                    {document.fileSize ? (
                        <p className="mt-0.5 text-slate-400 text-xs">{formatBytes(document.fileSize)}</p>
                    ) : null}
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className={twMerge(
                                "rounded-xl p-2 text-slate-400 transition-all duration-150 hover:bg-slate-100 hover:text-slate-600",
                                "focus:outline-none focus:ring-2 focus:ring-orange-200"
                            )}
                            aria-label="Actions">
                            <MoreHorizontal className="h-4 w-4" />
                        </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-40 border bg-white shadow-lg">
                        <DropdownMenuItem
                            onClick={() => onDownload(document.attachmentId)}
                            className="cursor-pointer text-slate-700 hover:bg-slate-50">
                            <Download className="mr-2 h-4 w-4" />
                            {t("download.action")}
                        </DropdownMenuItem>
                        {canDelete && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => onDelete(document.attachmentId)}
                                    disabled={isDeleting}
                                    className="cursor-pointer text-red-600 hover:bg-red-50 focus:text-red-600">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t("delete.action")}
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
