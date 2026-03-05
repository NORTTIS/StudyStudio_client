"use client";

import { Download, FileText, MoreHorizontal, Trash2, Upload } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { twMerge } from "tailwind-merge";
import { Container } from "@/components/common";
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

const ACCEPTED_EXTENSIONS = [".pdf", ".txt", ".docx", ".md"] as const;
const ACCEPTED_CONTENT_TYPES = new Set(["application/pdf", "text/plain", "text/markdown", "application/msword"]);
const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
    pdf: "application/pdf",
    txt: "text/plain",
    md: "text/markdown",
    docx: "application/msword"
};

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
    return CONTENT_TYPE_BY_EXTENSION[ext] || file.type || "";
}

function isAllowedFile(file: File) {
    const ext = getExt(file.name);
    const contentType = resolveContentType(file);
    return (
        ACCEPTED_EXTENSIONS.includes(`.${ext}` as (typeof ACCEPTED_EXTENSIONS)[number]) &&
        ACCEPTED_CONTENT_TYPES.has(contentType)
    );
}

function formatUpdatedText(createdAt?: string, firstName?: string | null, lastName?: string | null) {
    const uploaderName = [firstName, lastName].filter(Boolean).join(" ").trim() || "Unknown";
    if (!createdAt) return `Uploaded by ${uploaderName}`;
    const date = new Date(createdAt);
    const formatted = Number.isNaN(date.getTime()) ? createdAt : date.toLocaleString("vi-VN");
    return `${formatted} • ${uploaderName}`;
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
                    <p className="truncate font-semibold text-[#261E33] text-[15px]">{item.name}</p>
                    <p className="mt-1 text-[#6F6B99] text-sm">{item.updatedText}</p>
                    <p className="mt-1 text-[#6F6B99] text-xs">
                        {t("statusLabel")}: {item.status}
                    </p>
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

                    <DropdownMenuContent align="end" className="w-44">
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

    const onUploadClick = () => fileRef.current?.click();

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

    const onPickFiles: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = "";
        if (!files.length) return;

        if (!groupId) {
            toast({ variant: "destructive", description: t("cannotDetectGroupId") });
            return;
        }

        const invalid = files.filter((file) => !isAllowedFile(file));
        if (invalid.length) {
            toast({
                variant: "destructive",
                description: t("invalidFiles", { names: invalid.map((f) => f.name).join(", ") })
            });
        }

        const validFiles = files.filter((file) => isAllowedFile(file));
        if (!validFiles.length) return;

        setIsUploading(true);
        const failedNames: string[] = [];
        let successCount = 0;

        for (const file of validFiles) {
            try {
                await uploadSingleFile(file);
                successCount += 1;
            } catch {
                failedNames.push(file.name);
            }
        }

        setIsUploading(false);

        if (successCount > 0) {
            toast({ variant: "success", description: t("uploadedFiles", { count: successCount }) });
            await loadDocuments();
        }

        if (failedNames.length) {
            toast({
                variant: "destructive",
                description: t("failedFiles", { names: failedNames.join(", ") })
            });
        }
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

    return (
        <div className="w-full">
            <Container className="px-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                        <p className="font-medium text-[#6F6B99] text-sm">{t("sharedProjectDocuments")}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            ref={fileRef}
                            type="file"
                            className="hidden"
                            multiple
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

                {isLoading ? <p className="mb-4 text-[#6F6B99] text-sm">{t("loadingDocuments")}</p> : null}

                {!isLoading && docs.length === 0 ? (
                    <p className="mb-4 text-[#6F6B99] text-sm">{t("noDocuments")}</p>
                ) : null}

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {docs.map((d) => (
                        <DocumentCard key={d.id} item={d} onDelete={onDelete} onDownload={onDownload} />
                    ))}
                </div>
            </Container>

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
