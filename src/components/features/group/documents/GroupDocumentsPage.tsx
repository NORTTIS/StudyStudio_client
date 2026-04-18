"use client";

import { Download, FileText, MoreHorizontal, Trash2, Upload } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
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
    fetchGroupDetailRole,
    fetchGroupDocuments,
    getDocumentDownloadUrl,
    requestDocumentUpload
} from "../group.api";

// Kiểu dữ liệu dùng để hiển thị một tài liệu trên UI
type DocItem = {
    id: string;
    name: string;
    updatedText: string; // Chuỗi mô tả người upload + thời gian upload
    fileType: "pdf" | "txt" | "doc" | "md" | "other";
    status: string;
};

// Danh sách extension được chấp nhận khi upload
const ACCEPTED_EXTENSIONS = new Set(["pdf", "txt", "docx", "md"]);

// Danh sách MIME type được chấp nhận
const ACCEPTED_CONTENT_TYPES = new Set([
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

// Mapping extension -> MIME type fallback
// Dùng khi browser không trả về file.type chính xác
const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
    pdf: "application/pdf",
    txt: "text/plain",
    md: "text/markdown",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
};

// Giới hạn dung lượng file tối đa: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Loại bỏ locale ở đầu pathname
 * Ví dụ:
 * /vi/group/123   -> /group/123
 * /en/group/abc   -> /group/abc
 */
const stripLocale = (p: string) => p.replace(/^\/[a-z]{2}(?=\/)/i, "");

/**
 * Lấy groupId từ URL hiện tại
 * Ví dụ:
 * /group/123/documents -> 123
 */
const extractGroupIdFromPath = (pathname: string) => {
    const p = stripLocale(pathname || "");
    const m = p.match(/^\/group\/([^/]+)/i);
    return m?.[1] || "";
};

/**
 * Lấy extension từ tên file
 * Ví dụ:
 * abc.pdf -> pdf
 */
function getExt(name: string) {
    const m = name.toLowerCase().match(/\.([a-z0-9]+)$/i);
    return m?.[1] || "";
}

/**
 * Chuẩn hóa extension sang loại file dùng cho UI
 */
function niceType(ext: string): DocItem["fileType"] {
    if (ext === "pdf") return "pdf";
    if (ext === "txt") return "txt";
    if (ext === "md") return "md";
    if (ext === "doc" || ext === "docx") return "doc";
    return "other";
}

/**
 * Xác định content-type thực tế của file
 * Ưu tiên file.type từ browser, nếu không có thì fallback theo extension
 */
function resolveContentType(file: File) {
    const ext = getExt(file.name);
    return file.type || CONTENT_TYPE_BY_EXTENSION[ext] || "";
}

/**
 * Kiểm tra file có hợp lệ để upload hay không
 * Điều kiện:
 * - extension nằm trong danh sách cho phép
 * - MIME type hợp lệ (nếu browser cung cấp)
 */
function isAllowedFile(file: File) {
    const ext = getExt(file.name);
    const contentType = resolveContentType(file);

    // Chặn ngay nếu extension không hợp lệ
    if (!ACCEPTED_EXTENSIONS.has(ext)) return false;

    // Một số browser có thể không trả về content-type -> tạm chấp nhận
    if (!contentType) return true;

    // Một số file trả về octet-stream generic -> tạm chấp nhận
    if (contentType === "application/octet-stream") return true;

    return ACCEPTED_CONTENT_TYPES.has(contentType);
}

// Kiểu hàm translate dùng trong component này
type GroupDocumentsTranslate = (key: string, values?: Record<string, string | number>) => string;

/**
 * Format text hiển thị thông tin người upload và thời gian upload
 * Ví dụ:
 * "Nguyen Van A • 18/04/2026, 09:30"
 */
function formatUpdatedText(
    t: GroupDocumentsTranslate,
    locale: string,
    createdAt?: string,
    firstName?: string | null,
    lastName?: string | null
) {
    const uploaderName = [firstName, lastName].filter(Boolean).join(" ").trim() || t("unknownUploader");

    // Nếu không có createdAt thì chỉ hiển thị tên uploader
    if (!createdAt) return t("uploadedBy", { name: uploaderName });

    const date = new Date(createdAt);
    const dateLocale = locale === "vi" ? "vi-VN" : "en-US";

    // Nếu parse date thất bại thì dùng raw string từ backend
    const formatted = Number.isNaN(date.getTime()) ? createdAt : date.toLocaleString(dateLocale);

    return `${uploaderName} • ${formatted}`;
}

/**
 * Card hiển thị một tài liệu
 * Bao gồm:
 * - Icon file
 * - Tên file
 * - Metadata
 * - Menu thao tác (download / delete)
 */
function DocumentCard({
    item,
    canModify,
    onDelete,
    onDownload
}: {
    item: DocItem;
    canModify: boolean;
    onDelete: (id: string) => void;
    onDownload: (id: string) => void;
}) {
    const t = useTranslations("GroupDocumentsPage");

    return (
        <div className="group relative rounded-xl border border-[#E5E5E5] bg-white px-5 py-4 shadow-sm transition hover:shadow-md">
            <div className="flex items-start gap-4">
                {/* Icon đại diện file */}
                <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg bg-[#F5F5F7]">
                    <FileText className="h-5 w-5 text-[#261E33]" />
                </div>

                {/* Thông tin file */}
                <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[#261E33] text-[15px]">{item.name}</p>
                    <p className="mt-1 text-[#6F6B99] text-sm">{item.updatedText}</p>
                </div>

                {/* Menu thao tác */}
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
                        {/* Tải file */}
                        <DropdownMenuItem onClick={() => onDownload(item.id)}>
                            <Download className="mr-2 h-4 w-4" />
                            {t("download")}
                        </DropdownMenuItem>

                        {/* Chỉ hiện nút xóa khi user có quyền chỉnh sửa */}
                        {canModify && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => onDelete(item.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t("delete")}
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

/**
 * Trang quản lý tài liệu của group
 * Chức năng:
 * - Load danh sách tài liệu
 * - Upload tài liệu
 * - Download tài liệu
 * - Delete tài liệu
 * - Kiểm soát quyền theo role của user
 */
export default function GroupDocumentsPage() {
    const locale = useLocale();
    const t = useTranslations("GroupDocumentsPage");
    const pathname = usePathname();
    const groupId = extractGroupIdFromPath(pathname || "");
    const { toast } = useToast();

    // Danh sách documents hiển thị trên UI
    const [docs, setDocs] = React.useState<DocItem[]>([]);

    // State loading danh sách
    const [isLoading, setIsLoading] = React.useState(false);

    // State upload file
    const [isUploading, setIsUploading] = React.useState(false);

    // State delete file
    const [isDeleting, setIsDeleting] = React.useState(false);

    // Trạng thái dialog confirm delete
    const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

    // Tài liệu đang được chọn để xóa
    const [deleteTarget, setDeleteTarget] = React.useState<Pick<DocItem, "id" | "name"> | null>(null);

    // Trạng thái mở/đóng modal upload
    const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);

    // Trạng thái drag file vào vùng drop
    const [isDragActive, setIsDragActive] = React.useState(false);

    // Ref tới input file ẩn
    const fileRef = React.useRef<HTMLInputElement | null>(null);

    // Role hiện tại của user trong group
    const [currentUserRole, setCurrentUserRole] = React.useState<string | null>(null);

    /**
     * Lấy role của user theo groupId hiện tại
     * Reset về null trước để tránh dùng nhầm quyền cũ khi đổi group
     */
    React.useEffect(() => {
        if (!groupId) return;

        // Reset role ngay khi group đổi để tránh trạng thái stale
        setCurrentUserRole(null);

        fetchGroupDetailRole(groupId).then((role) => setCurrentUserRole(role));
    }, [groupId]);

    /**
     * Xác định user có được phép sửa/xóa/upload hay không
     * Mặc định false khi role chưa load xong để an toàn
     */
    const canModify = React.useMemo(() => {
        if (currentUserRole === null) return false;
        return currentUserRole !== "commenter" && currentUserRole !== "viewer";
    }, [currentUserRole]);

    /**
     * Load danh sách tài liệu từ backend
     * Đồng thời map dữ liệu API sang dữ liệu hiển thị trên UI
     */
    const loadDocuments = React.useCallback(async () => {
        if (!groupId) return;

        setIsLoading(true);
        try {
            const items = await fetchGroupDocuments(groupId);

            const mapped: DocItem[] = items.map((item) => {
                const fileName = item.fileName || t("untitled");
                const ext = getExt(fileName);

                return {
                    // fallback id trong trường hợp backend thiếu attachmentId
                    id: item.attachmentId || `${fileName}_${item.createdAt || Date.now()}`,
                    name: fileName,
                    updatedText: formatUpdatedText(
                        t,
                        locale,
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
    }, [groupId, locale, toast, t]);

    // Tự động load documents khi component mount hoặc khi groupId thay đổi
    React.useEffect(() => {
        void loadDocuments();
    }, [loadDocuments]);

    // Mở modal upload
    const onUploadClick = () => setIsUploadModalOpen(true);

    /**
     * Upload 1 file theo flow:
     * 1. Xin upload URL từ backend
     * 2. PUT file lên storage
     * 3. Gọi complete để backend finalize record
     */
    const uploadSingleFile = async (file: File) => {
        const contentType = resolveContentType(file);

        const requested = await requestDocumentUpload({
            groupId,
            fileName: file.name,
            fileSize: file.size,
            contentType
        });

        // Upload file trực tiếp lên storage/presigned URL
        const uploadRes = await fetch(requested.uploadUrl as string, {
            method: "PUT",
            headers: {
                "Content-Type": contentType
            },
            body: file
        });

        if (!uploadRes.ok) {
            throw new Error(t("uploadHttpFailed", { name: file.name, status: uploadRes.status }));
        }

        // Xác nhận upload hoàn tất với backend
        await completeDocumentUpload(requested.attachmentId as string);
    };

    /**
     * Hàm xử lý upload file từ mọi nguồn:
     * - file picker
     * - drag & drop
     */
    const handleUploadFile = async (file: File) => {
        // Không xác định được groupId thì dừng
        if (!groupId) {
            toast({ variant: "destructive", description: t("cannotDetectGroupId") });
            return;
        }

        // Không có quyền thì chặn
        if (!canModify) {
            toast({ variant: "destructive", description: t("noPermissionToUpload") });
            return;
        }

        // Validate loại file
        if (!isAllowedFile(file)) {
            toast({ variant: "destructive", description: t("invalidFileType", { name: file.name }) });
            return;
        }

        // Validate dung lượng
        if (file.size > MAX_FILE_SIZE) {
            toast({ variant: "destructive", description: t("fileTooLarge", { name: file.name }) });
            return;
        }

        setIsUploading(true);
        try {
            await uploadSingleFile(file);

            toast({ variant: "success", description: t("uploadedFiles", { count: 1 }) });

            // Đóng modal sau khi upload thành công
            setIsUploadModalOpen(false);

            // Reload lại danh sách tài liệu
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

    /**
     * Xử lý khi user chọn file qua input[type=file]
     * Chỉ cho phép upload 1 file mỗi lần
     */
    const onPickFiles: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
        const files = Array.from(e.target.files || []);

        // Reset input value để có thể chọn lại đúng cùng 1 file sau này
        e.target.value = "";

        if (!files.length) return;

        // Chặn upload nhiều file cùng lúc
        if (files.length > 1) {
            toast({ variant: "destructive", description: t("tooManyFiles") });
            return;
        }

        await handleUploadFile(files[0]);
    };

    /**
     * Mở dialog xác nhận xóa
     */
    const onDelete = (id: string) => {
        if (!canModify) return;

        const doc = docs.find((d) => d.id === id);

        if (!doc) {
            toast({ variant: "destructive", description: t("documentNotFound") });
            return;
        }

        setDeleteTarget({ id: doc.id, name: doc.name });
        setDeleteConfirmOpen(true);
    };

    /**
     * Xác nhận xóa tài liệu
     * Sau khi xóa thành công thì cập nhật lại state local
     */
    const confirmDelete = async () => {
        if (!deleteTarget) return;

        setIsDeleting(true);
        try {
            await deleteGroupDocument(deleteTarget.id);

            // Xóa item khỏi danh sách hiện tại mà không cần reload toàn bộ
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

    /**
     * Download tài liệu bằng cách lấy signed URL từ backend
     * Sau đó tạo thẻ a tạm để trigger download
     */
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

    /**
     * Xử lý drag & drop file vào vùng upload
     * Chỉ cho phép 1 file
     */
    const onDrop: React.DragEventHandler<HTMLDivElement> = async (event) => {
        event.preventDefault();
        event.stopPropagation();

        setIsDragActive(false);

        // Nếu đang upload thì bỏ qua
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
        <div className="min-h-screen w-full bg-transparent">
            <Container className="min-h-screen bg-transparent px-6 py-4">
                {/* Header */}
                <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                        <p className="rounded-xl border border-[#E5E5E5] bg-white px-4 py-4 font-medium text-[#6F6B99] text-sm">
                            {t("sharedProjectDocuments")}
                        </p>
                    </div>

                    {/* Nút upload chỉ hiện nếu user có quyền */}
                    <div className="flex items-center gap-3">
                        {canModify && (
                            <>
                                {/* Input file ẩn, được trigger bằng button hoặc vùng drag/drop */}
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
                            </>
                        )}
                    </div>
                </div>

                {/* Trạng thái loading */}
                {isLoading ? <p className="mb-4 text-[#6F6B99] text-sm">{t("loadingDocuments")}</p> : null}

                {/* Trạng thái rỗng */}
                {!isLoading && docs.length === 0 ? (
                    <p className="mb-4 text-[#6F6B99] text-sm">{t("noDocuments")}</p>
                ) : null}

                {/* Grid danh sách tài liệu */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {docs.map((d) => (
                        <DocumentCard
                            key={d.id}
                            item={d}
                            canModify={canModify}
                            onDelete={onDelete}
                            onDownload={onDownload}
                        />
                    ))}
                </div>
            </Container>

            {/* Modal upload file */}
            <Modal
                isOpen={isUploadModalOpen}
                onClose={() => {
                    // Không cho đóng modal nếu đang upload
                    if (!isUploading) setIsUploadModalOpen(false);
                    setIsDragActive(false);
                }}
                title={t("uploadModalTitle")}
                size="md">
                <div className="space-y-4">
                    {/** biome-ignore lint/a11y/useSemanticElements: dùng div để custom drag-drop area */}
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={() => fileRef.current?.click()}
                        onKeyDown={(e) => {
                            // Hỗ trợ mở file picker bằng Enter / Space
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
                        {/* Icon upload */}
                        <Upload className="mb-2 h-8 w-8 text-[#FF5722]" />

                        {/* Tiêu đề vùng upload */}
                        <p className="font-semibold text-[#261E33] text-base">{t("dragDropTitle")}</p>

                        {/* Mô tả vùng upload */}
                        <p className="mt-1 text-[#6F6B99] text-sm">{t("dragDropSubtitle")}</p>

                        {/* Nút browse file */}
                        <Button
                            type="button"
                            disabled={isUploading}
                            className="mt-3 rounded-xl bg-[#FF5722] px-5 text-white hover:bg-[#e24d1e]">
                            {t("browseFile")}
                        </Button>
                    </div>

                    {/* Hint upload */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[#6F6B99] text-sm">{t("uploadHint")}</p>
                    </div>
                </div>
            </Modal>

            {/* Dialog xác nhận xóa file */}
            <AlertDialog
                open={deleteConfirmOpen}
                onOpenChange={(open) => {
                    setDeleteConfirmOpen(open);

                    // Nếu dialog đóng và không trong lúc deleting thì clear target
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