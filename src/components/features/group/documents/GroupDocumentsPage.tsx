"use client";

import { Download, FileText, MoreHorizontal, Trash2, Upload } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { twMerge } from "tailwind-merge";
import { Container, Modal } from "@/components/common";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import {
    completeDocumentUpload,
    deleteGroupDocument,
    fetchGroupDocuments,
    getDocumentDownloadUrl,
    requestDocumentUpload
} from "../group.api";

type DocItem = {
    id: string;
    name: string;
    updatedText: string;
    fileType: "pdf" | "txt" | "doc" | "md" | "other";
    status: string;
};

const ACCEPTED_EXTENSIONS = new Set(["pdf", "txt", "docx", "md"]);
const ACCEPTED_CONTENT_TYPES = new Set([
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);
const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
    pdf: "application/pdf",
    txt: "text/plain",
    md: "text/markdown",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
};
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const stripLocale = (p: string) => p.replace(/^\/[a-z]{2}(?=\/)/i, "");
const extractGroupIdFromPath = (pathname: string) => {
    const p = stripLocale(pathname || "");
    const m = p.match(/^\/group\/([^/]+)/i);
    return m?.[1] || "";
};

function getExt(name: string) {
    const m = name.toLowerCase().match(/\.([a-z0-9]+)$/i);
    return m?.[1] || "";
}

function niceType(ext: string): DocItem["fileType"] {
    if (ext === "pdf") return "pdf";
    if (ext === "txt") return "txt";
    if (ext === "md") return "md";
    if (ext === "doc" || ext === "docx") return "doc";
    return "other";
}

function resolveContentType(file: File) {
    const ext = getExt(file.name);
    return file.type || CONTENT_TYPE_BY_EXTENSION[ext] || "";
}

function isAllowedFile(file: File) {
    const ext = getExt(file.name);
    const contentType = resolveContentType(file);
    if (!ACCEPTED_EXTENSIONS.has(ext)) return false;
    if (!contentType) return true;
    if (contentType === "application/octet-stream") return true;
    return ACCEPTED_CONTENT_TYPES.has(contentType);
}

function formatUpdatedText(createdAt?: string, firstName?: string | null, lastName?: string | null) {
    const uploaderName = [firstName, lastName].filter(Boolean).join(" ").trim() || "Unknown";
    if (!createdAt) return `Uploaded by ${uploaderName}`;
    const date = new Date(createdAt);
    const formatted = Number.isNaN(date.getTime()) ? createdAt : date.toLocaleString("vi-VN");
    return `${uploaderName} • ${formatted}`;
}

function DocumentCard({
    item,
    onDelete,
    onDownload
}: {
    item: DocItem;
    onDelete: (id: string) => void;
    onDownload: (id: string) => void;
}) {
    const t = useTranslations("GroupDocumentsPage");

    return (
        <div className="group relative rounded-xl border border-[#E5E5E5] bg-white px-5 py-4 shadow-sm transition hover:shadow-md">
            <div className="flex items-start gap-4">
                <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg bg-[#F5F5F7]">
                    <FileText className="h-5 w-5 text-[#261E33]" />
                </div>

                <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-[#261E33]">{item.name}</p>
                    <p className="mt-1 text-sm text-[#6F6B99]">{item.updatedText}</p>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className={twMerge(
                                "rounded-lg p-2 text-[#261E33] opacity-80 transition hover:bg-[#FAFAFA] hover:opacity-100",
                                "focus:outline-none focus:ring-2 focus:ring-black/10"
                            )}
                            aria-label={t("more")}>
                            <MoreHorizontal className="h-5 w-5" />
                        </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-44 border bg-white shadow-md">
                        <DropdownMenuItem onClick={() => onDownload(item.id)}>
                            <Download className="mr-2 h-4 w-4" />
                            {t("download")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDelete(item.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t("delete")}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

export default function GroupDocumentsPage() {
    const t = useTranslations("GroupDocumentsPage");
    const pathname = usePathname();
    const groupId = extractGroupIdFromPath(pathname || "");
    const { toast } = useToast();

    const [docs, setDocs] = React.useState<DocItem[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isUploading, setIsUploading] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
    const [deleteTarget, setDeleteTarget] = React.useState<Pick<DocItem, "id" | "name"> | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
    const [isDragActive, setIsDragActive] = React.useState(false);
    const fileRef = React.useRef<HTMLInputElement | null>(null);

    const loadDocuments = React.useCallback(async () => {
        if (!groupId) return;
        setIsLoading(true);
        try {
            const items = await fetchGroupDocuments(groupId);
            const mapped: DocItem[] = items.map((item) => {
                const fileName = item.fileName || t("untitled");
                const ext = getExt(fileName);
                return {
                    id: item.attachmentId || `${fileName}_${item.createdAt || Date.now()}`,
                    name: fileName,
                    updatedText: formatUpdatedText(
                        item.createdAt,
                        item.uploadedBy?.firstName,
                        item.uploadedBy?.lastName
                    ),
                    fileType: niceType(ext),
                    status: item.status || t("unknownStatus")
                };
            });
            setDocs(mapped);
        } catch (error) {
            toast({
                variant: "destructive",
                description: error instanceof Error ? error.message : t("cannotLoadDocuments")
            });
        } finally {
            setIsLoading(false);
        }
    }, [groupId, toast, t]);

    React.useEffect(() => {
        void loadDocuments();
    }, [loadDocuments]);

    const onUploadClick = () => setIsUploadModalOpen(true);

    const uploadSingleFile = async (file: File) => {
        const contentType = resolveContentType(file);
        const requested = await requestDocumentUpload({
            groupId,
            fileName: file.name,
            fileSize: file.size,
            contentType
        });

        const uploadRes = await fetch(requested.uploadUrl as string, {
            method: "PUT",
            headers: {
                "Content-Type": contentType
            },
            body: file
        });

        if (!uploadRes.ok) {
            throw new Error(`Upload failed: ${file.name} (${uploadRes.status})`);
        }

        await completeDocumentUpload(requested.attachmentId as string);
    };

    const handleUploadFile = async (file: File) => {
        if (!groupId) {
            toast({ variant: "destructive", description: t("cannotDetectGroupId") });
            return;
        }

        if (!isAllowedFile(file)) {
            toast({ variant: "destructive", description: t("invalidFileType", { name: file.name }) });
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            toast({ variant: "destructive", description: t("fileTooLarge", { name: file.name }) });
            return;
        }

        setIsUploading(true);
        try {
            await uploadSingleFile(file);
            toast({ variant: "success", description: t("uploadedFiles", { count: 1 }) });
            setIsUploadModalOpen(false);
            await loadDocuments();
        } catch (error) {
            toast({
                variant: "destructive",
                description: error instanceof Error ? error.message : t("uploadFailed")
            });
        } finally {
            setIsUploading(false);
        }
    };

    const onPickFiles: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = "";
        if (!files.length) return;

        if (files.length > 1) {
            toast({ variant: "destructive", description: t("tooManyFiles") });
            return;
        }

        await handleUploadFile(files[0]);
    };

    const onDelete = (id: string) => {
        const doc = docs.find((d) => d.id === id);
        if (!doc) {
            toast({ variant: "destructive", description: t("documentNotFound") });
            return;
        }
        setDeleteTarget({ id: doc.id, name: doc.name });
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await deleteGroupDocument(deleteTarget.id);
            setDocs((prev) => prev.filter((d) => d.id !== deleteTarget.id));
            setDeleteConfirmOpen(false);
            setDeleteTarget(null);
            toast({ variant: "success", description: t("documentDeleted") });
        } catch (error) {
            toast({
                variant: "destructive",
                description: error instanceof Error ? error.message : t("deleteFailed")
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const onDownload = async (id: string) => {
        const doc = docs.find((d) => d.id === id);
        if (!doc) {
            toast({ variant: "destructive", description: t("documentNotFound") });
            return;
        }

        try {
            const downloadUrl = await getDocumentDownloadUrl(id);
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.download = doc.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            toast({
                variant: "destructive",
                description: error instanceof Error ? error.message : t("downloadFailed")
            });
        }
    };

    const onDrop: React.DragEventHandler<HTMLDivElement> = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragActive(false);
        if (isUploading) return;
        const files = Array.from(event.dataTransfer?.files || []);
        if (!files.length) return;
        if (files.length > 1) {
            toast({ variant: "destructive", description: t("tooManyFiles") });
            return;
        }
        await handleUploadFile(files[0]);
    };

    return (
        <div className="min-h-screen w-full bg-white">
            <Container className="bg-white px-6 py-4">
                <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-[#6F6B99]">{t("sharedProjectDocuments")}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            ref={fileRef}
                            type="file"
                            className="hidden"
                            accept=".pdf,.txt,.docx,.md"
                            onChange={onPickFiles}
                        />
                        <Button
                            onClick={onUploadClick}
                            disabled={isUploading}
                            className="rounded-xl bg-[#FF5722] px-5 text-white hover:bg-[#e24d1e]">
                            <Upload className="mr-2 h-4 w-4" />
                            {isUploading ? t("uploading") : t("upload")}
                        </Button>
                    </div>
                </div>

                {isLoading ? <p className="mb-4 text-sm text-[#6F6B99]">{t("loadingDocuments")}</p> : null}

                {!isLoading && docs.length === 0 ? (
                    <p className="mb-4 text-sm text-[#6F6B99]">{t("noDocuments")}</p>
                ) : null}

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {docs.map((d) => (
                        <DocumentCard key={d.id} item={d} onDelete={onDelete} onDownload={onDownload} />
                    ))}
                </div>
            </Container>

            <Modal
                isOpen={isUploadModalOpen}
                onClose={() => {
                    if (!isUploading) setIsUploadModalOpen(false);
                    setIsDragActive(false);
                }}
                title={t("uploadModalTitle")}
                size="md">
                <div className="space-y-4">
                    {/** biome-ignore lint/a11y/useSemanticElements: <explanation> */}
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={() => fileRef.current?.click()}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                fileRef.current?.click();
                            }
                        }}
                        onDragEnter={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setIsDragActive(true);
                        }}
                        onDragOver={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setIsDragActive(true);
                        }}
                        onDragLeave={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setIsDragActive(false);
                        }}
                        onDrop={onDrop}
                        className={twMerge(
                            "flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-6 text-center transition",
                            isDragActive ? "border-[#FF5722] bg-[#FFF3EE]" : "border-[#E5E5E5] bg-white"
                        )}>
                        <Upload className="mb-2 h-8 w-8 text-[#FF5722]" />
                        <p className="text-base font-semibold text-[#261E33]">{t("dragDropTitle")}</p>
                        <p className="mt-1 text-sm text-[#6F6B99]">{t("dragDropSubtitle")}</p>
                        <Button
                            type="button"
                            disabled={isUploading}
                            className="rounded-xl bg-[#FF5722] px-5 text-white hover:bg-[#e24d1e]">
                            {t("browseFile")}
                        </Button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-[#6F6B99]">{t("uploadHint")}</p>
                    </div>
                </div>
            </Modal>

            <AlertDialog
                open={deleteConfirmOpen}
                onOpenChange={(open) => {
                    setDeleteConfirmOpen(open);
                    if (!(open || isDeleting)) setDeleteTarget(null);
                }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("confirmDeleteTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("confirmDeleteDescriptionPrefix")}{" "}
                            <span className="font-semibold text-gray-900">
                                {deleteTarget?.name || t("thisDocument")}
                            </span>{" "}
                            {t("confirmDeleteDescriptionSuffix")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            disabled={isDeleting}
                            onClick={(e) => {
                                e.preventDefault();
                                void confirmDelete();
                            }}>
                            {isDeleting ? t("deleting") : t("deleteDocument")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}