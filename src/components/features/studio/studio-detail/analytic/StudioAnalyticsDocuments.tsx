"use client";

import { motion } from "framer-motion";
import { Cloud, FileText, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import type { StudioGroupData } from "@/api/analytics";
import { Modal } from "@/components/common";
import {
    completeDocumentUpload,
    deleteGroupDocument,
    fetchGroupDocuments,
    getDocumentDownloadUrl,
    requestDocumentUpload
} from "@/components/features/group/group.api";
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
import { useToast } from "@/components/ui/use-toast";
import { DocumentCardComponent, type DocumentData } from "./DocumentCard";

const ACCEPTED_EXTENSIONS = new Set(["pdf", "txt", "docx", "md"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function getExt(name: string) {
    const m = name.toLowerCase().match(/\.([a-z0-9]+)$/i);
    return m?.[1] || "";
}

function formatBytes(bytes?: number): string {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatBytesMB(mb?: number): string {
    if (!mb) return "0 MB";
    if (mb < 1024) return `${mb} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
}

// Storage quota bar component
function StorageQuotaBar({
    usedBytes,
    limitMb,
    title,
    remainingLabel
}: {
    usedBytes: number;
    limitMb: number;
    title: string;
    remainingLabel: string;
}) {
    const limitBytes = limitMb * 1024 * 1024;
    const percent = limitBytes > 0 ? Math.min(100, (usedBytes / limitBytes) * 100) : 0;
    const remainingBytes = Math.max(0, limitBytes - usedBytes);

    const barColor = percent >= 90 ? "bg-red-500" : percent >= 70 ? "bg-orange-500" : "bg-emerald-500";
    const textColor = percent >= 90 ? "text-red-600" : percent >= 70 ? "text-orange-600" : "text-emerald-600";

    return (
        <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50/80 px-5 py-4">
            <div className="mb-2 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4 text-slate-500" />
                    <span className="font-medium text-slate-600 text-sm">{title}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium text-slate-600">
                        {formatBytes(usedBytes)} / {formatBytesMB(limitMb)}
                    </span>
                    <span className={textColor}>
                        {remainingLabel}: {formatBytes(remainingBytes)}
                    </span>
                </div>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}

interface StudioAnalyticsDocumentsProps {
    groups: StudioGroupData[];
    studioRole?: number; // 0 = owner, 1 = admin/member
    maxStorageMb?: number;
}

export default function StudioAnalyticsDocuments({ groups, studioRole, maxStorageMb }: StudioAnalyticsDocumentsProps) {
    const t = useTranslations("StudioAnalyticsDocuments");
    const { toast } = useToast();
    // studioRole: 0 = owner, 1 = admin/member
    const canManage = studioRole === 0 || studioRole === 1;

    // Tab state
    const [activeTab, setActiveTab] = React.useState<string>(groups[0]?.groupId ?? "");

    // Document state per group
    type GroupDocs = { docs: DocumentData[]; loading: boolean };
    const [docsByGroup, setDocsByGroup] = React.useState<Record<string, GroupDocs>>({});

    // Upload state
    const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
    const [isDragActive, setIsDragActive] = React.useState(false);
    const [isUploading, setIsUploading] = React.useState(false);
    const fileRef = React.useRef<HTMLInputElement | null>(null);

    // Delete state
    const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
    const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);

    // Current group ID for upload
    const currentGroupId = activeTab || null;

    // Load documents for a group
    const loadGroupDocs = React.useCallback(
        async (groupId: string) => {
            setDocsByGroup((prev) => ({
                ...prev,
                [groupId]: { ...prev[groupId], loading: true }
            }));
            try {
                const items = await fetchGroupDocuments(groupId);
                const mapped: DocumentData[] = items.map((item) => ({
                    attachmentId: item.attachmentId || "",
                    fileName: item.fileName || t("documents.untitled"),
                    fileSize: item.fileSize,
                    contentType: item.contentType ?? undefined,
                    uploadedBy: item.uploadedBy,
                    createdAt: item.createdAt
                }));
                setDocsByGroup((prev) => ({
                    ...prev,
                    [groupId]: { docs: mapped, loading: false }
                }));
            } catch {
                setDocsByGroup((prev) => ({
                    ...prev,
                    [groupId]: { docs: [], loading: false }
                }));
            }
        },
        [t]
    );

    // Initial load
    React.useEffect(() => {
        if (!activeTab) return;
        if (!docsByGroup[activeTab]) {
            void loadGroupDocs(activeTab);
        }
    }, [activeTab, loadGroupDocs, docsByGroup]);

    // Current docs based on tab
    const currentDocs = activeTab ? (docsByGroup[activeTab]?.docs ?? []) : [];
    const currentLoading = activeTab ? (docsByGroup[activeTab]?.loading ?? false) : false;

    // Total used bytes
    const usedBytes = React.useMemo(() => {
        return currentDocs.reduce((sum, d) => sum + (d.fileSize ?? 0), 0);
    }, [currentDocs]);

    // Upload helpers
    function isAllowedFile(file: File): boolean {
        const ext = getExt(file.name);
        return ACCEPTED_EXTENSIONS.has(ext);
    }

    async function uploadFile(file: File, groupId: string) {
        const ext = getExt(file.name);
        const contentTypeMap: Record<string, string> = {
            pdf: "application/pdf",
            txt: "text/plain",
            md: "text/markdown",
            docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        };
        const contentType = contentTypeMap[ext] || file.type || "";

        const requested = await requestDocumentUpload({
            groupId,
            fileName: file.name,
            fileSize: file.size,
            contentType
        });

        if (requested.uploadUrl) {
            const uploadRes = await fetch(requested.uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": contentType },
                body: file
            });
            if (!uploadRes.ok) throw new Error(`Upload failed (${uploadRes.status})`);
        }

        await completeDocumentUpload(requested.attachmentId as string);
    }

    const handleUploadFile = async (file: File) => {
        if (!currentGroupId) {
            toast({ variant: "destructive", description: t("upload.selectGroupFirst") });
            return;
        }
        if (!isAllowedFile(file)) {
            toast({ variant: "destructive", description: t("upload.invalidExtension") });
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            toast({ variant: "destructive", description: t("upload.fileTooLarge") });
            return;
        }

        setIsUploading(true);
        try {
            await uploadFile(file, currentGroupId);
            toast({ variant: "success", description: t("upload.success") });
            setIsUploadModalOpen(false);
            // Reload
            void loadGroupDocs(currentGroupId);
        } catch (error) {
            toast({
                variant: "destructive",
                description: error instanceof Error ? error.message : t("upload.failed")
            });
        } finally {
            setIsUploading(false);
        }
    };

    const onDrop: React.DragEventHandler<HTMLDivElement> = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragActive(false);
        if (isUploading) return;
        const files = Array.from(event.dataTransfer?.files || []);
        if (files.length > 1) {
            toast({ variant: "destructive", description: t("upload.onlyOneFile") });
            return;
        }
        if (files.length === 1) {
            await handleUploadFile(files[0]);
        }
    };

    // Delete
    const handleDelete = (id: string) => {
        const doc = currentDocs.find((d) => d.attachmentId === id);
        if (!doc) return;
        setDeleteTarget({ id, name: doc.fileName });
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await deleteGroupDocument(deleteTarget.id);
            // Update local state
            setDocsByGroup((prev) => ({
                ...prev,
                [activeTab]: {
                    ...prev[activeTab],
                    docs: (prev[activeTab]?.docs ?? []).filter((d) => d.attachmentId !== deleteTarget.id)
                }
            }));
            setDeleteConfirmOpen(false);
            setDeleteTarget(null);
            toast({ variant: "success", description: t("delete.success") });
        } catch (error) {
            toast({
                variant: "destructive",
                description: error instanceof Error ? error.message : t("delete.failed")
            });
        } finally {
            setIsDeleting(false);
        }
    };

    // Download
    const handleDownload = async (attachmentId: string) => {
        const doc = currentDocs.find((d) => d.attachmentId === attachmentId);
        if (!doc) return;
        try {
            const downloadUrl = await getDocumentDownloadUrl(attachmentId);
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.target = "_blank";
            link.download = doc.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            toast({
                variant: "destructive",
                description: error instanceof Error ? error.message : t("download.failed")
            });
        }
    };

    const tabs = groups
        .filter((g) => (g.groupId?.trim() ?? "") !== "")
        .map((g) => ({
            key: g.groupId?.trim() ?? "",
            label: g.groupName?.trim() ? g.groupName.trim() : t("tabs.unnamedGroup")
        }));

    const currentGroupName =
        groups.find((g) => g.groupId?.trim() === activeTab)?.groupName?.trim() || t("tabs.unnamedGroup");

    React.useEffect(() => {
        if (!tabs.length) return;
        if (!activeTab || !tabs.some((tab) => tab.key === activeTab)) {
            setActiveTab(tabs[0].key);
        }
    }, [tabs, activeTab]);

    return (
        <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.28 }}
            className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                {/* Section title */}
                <div>
                    <h2 className="font-semibold text-lg text-slate-900">{t("section.title")}</h2>
                    <p className="mt-1 text-slate-500 text-sm">{t("section.description")}</p>
                </div>

                {/* Upload button */}
                {canManage && (
                    <div className="flex items-center gap-3">
                        <input
                            ref={fileRef}
                            type="file"
                            className="hidden"
                            accept=".pdf,.txt,.docx,.md"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void handleUploadFile(file);
                                e.target.value = "";
                            }}
                        />
                        <Button
                            onClick={() => setIsUploadModalOpen(true)}
                            disabled={isUploading}
                            className="rounded-2xl bg-orange-500 px-5 text-white hover:opacity-90">
                            <Upload className="mr-2 h-4 w-4" />
                            {isUploading ? t("upload.loading") : t("upload.button")}
                        </Button>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="mb-5 flex flex-wrap items-center gap-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`rounded-2xl px-4 py-2 font-medium text-sm transition-all duration-200 ${
                            activeTab === tab.key
                                ? "bg-orange-500 text-white shadow-sm"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Storage quota */}
            <StorageQuotaBar
                usedBytes={usedBytes}
                limitMb={maxStorageMb ?? 100}
                title={t("storage.title")}
                remainingLabel={t("storage.remaining")}
            />

            {/* Document grid */}
            {currentLoading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="animate-pulse rounded-[18px] border border-slate-200 bg-slate-50 px-5 py-4">
                            <div className="flex items-start gap-4">
                                <div className="h-10 w-10 rounded-xl bg-slate-200" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-3/4 rounded bg-slate-200" />
                                    <div className="h-3 w-1/2 rounded bg-slate-200" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : currentDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-300 border-dashed py-16 text-center">
                    <FileText className="mb-3 h-12 w-12 text-slate-300" />
                    <p className="font-medium text-slate-500">{t("empty.title")}</p>
                    <p className="mt-1 text-slate-400 text-sm">{t("empty.description")}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {currentDocs.map((doc) => (
                        <DocumentCardComponent
                            key={doc.attachmentId}
                            document={doc}
                            canDelete={canManage}
                            onDownload={handleDownload}
                            onDelete={handleDelete}
                            isDeleting={isDeleting && deleteTarget?.id === doc.attachmentId}
                            t={t}
                        />
                    ))}
                </div>
            )}

            {/* Upload modal */}
            <Modal
                isOpen={isUploadModalOpen}
                onClose={() => {
                    if (!isUploading) setIsUploadModalOpen(false);
                    setIsDragActive(false);
                }}
                title={t("upload.modalTitle")}
                size="md">
                <div className="space-y-4">
                    {/* biome-ignore lint/a11y/useSemanticElements: <explanation> */}
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
                        className={`flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all duration-200 ${
                            isDragActive
                                ? "border-orange-400 bg-orange-50"
                                : "border-slate-300 bg-white hover:border-orange-300"
                        }`}>
                        <Upload className="mb-3 h-8 w-8 text-orange-500" />
                        <p className="font-semibold text-base text-slate-800">{t("upload.dropTitle")}</p>
                        <p className="mt-1 text-slate-500 text-sm">{t("upload.dropDescription")}</p>
                        <Button
                            type="button"
                            disabled={isUploading}
                            className="mt-4 rounded-xl bg-orange-500 text-white hover:opacity-90">
                            {t("upload.chooseFile")}
                        </Button>
                    </div>
                    <p className="text-slate-500 text-sm">
                        {t("upload.accepted", { types: "pdf, txt, docx, md", max: "5MB" })}
                    </p>
                    <p className="rounded-lg bg-slate-100 px-3 py-2 text-slate-600 text-sm">
                        {t("upload.targetGroup", { groupName: currentGroupName })}
                    </p>
                </div>
            </Modal>

            {/* Delete confirmation */}
            <AlertDialog
                open={deleteConfirmOpen}
                onOpenChange={(open) => {
                    setDeleteConfirmOpen(open);
                    if (!open) setDeleteTarget(null);
                }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("delete.title")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("delete.description", { name: deleteTarget?.name ?? "" })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>{t("delete.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            disabled={isDeleting}
                            onClick={(e) => {
                                e.preventDefault();
                                void confirmDelete();
                            }}>
                            {isDeleting ? t("delete.processing") : t("delete.confirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </motion.section>
    );
}
