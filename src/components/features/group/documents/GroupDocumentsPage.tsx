"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { twMerge } from "tailwind-merge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { FileText, MoreHorizontal, Upload, Download, Trash2 } from "lucide-react";

type DocItem = {
    id: string;
    name: string;
    updatedText: string;
    fileType: "pdf" | "sql" | "doc" | "other";
};

const stripLocale = (p: string) => p.replace(/^\/[a-z]{2}(?=\/)/i, "");
const extractGroupIdFromPath = (pathname: string) => {
    const p = stripLocale(pathname || "");
    const m = p.match(/^\/group\/([^/]+)/i);
    return m?.[1] || "";
};

const demoDocs: DocItem[] = [
    { id: "1", name: "Yêu cầu dự án.pdf", updatedText: "2 ngày trước • Đạt", fileType: "pdf" },
    { id: "2", name: "Schema CSDL.sql", updatedText: "2 ngày trước • Đạt", fileType: "sql" },
    { id: "3", name: "Schema CSDL.sql", updatedText: "2 ngày trước • Đạt", fileType: "sql" },
    { id: "4", name: "Schema CSDL.sql", updatedText: "2 ngày trước • Đạt", fileType: "sql" },
    { id: "5", name: "Yêu cầu dự án.pdf", updatedText: "2 ngày trước • Đạt", fileType: "pdf" },
    { id: "6", name: "Schema CSDL.sql", updatedText: "2 ngày trước • Đạt", fileType: "sql" }
];

function getExt(name: string) {
    const m = name.toLowerCase().match(/\.([a-z0-9]+)$/i);
    return m?.[1] || "";
}

function niceType(ext: string): DocItem["fileType"] {
    if (ext === "pdf") return "pdf";
    if (ext === "sql") return "sql";
    if (ext === "doc" || ext === "docx") return "doc";
    return "other";
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
                            className={twMerge(
                                "rounded-lg p-2 text-[#261E33] opacity-80 transition hover:bg-[#FAFAFA] hover:opacity-100",
                                "focus:outline-none focus:ring-2 focus:ring-black/10"
                            )}
                            aria-label="Thêm"
                        >
                            <MoreHorizontal className="h-5 w-5" />
                        </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => onDownload(item.id)}>
                            <Download className="mr-2 h-4 w-4" />
                            Tải xuống
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => onDelete(item.id)}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Xóa
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

export default function GroupDocumentsPage() {
    const pathname = usePathname();
    const groupId = extractGroupIdFromPath(pathname || "");

    const [docs, setDocs] = React.useState<DocItem[]>(demoDocs);
    const fileRef = React.useRef<HTMLInputElement | null>(null);

    const onUploadClick = () => fileRef.current?.click();

    const onPickFiles: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const now = new Date();
        const updatedText = "Vừa xong • Bạn";

        setDocs((prev) => {
            const mapped: DocItem[] = files.map((f) => {
                const ext = getExt(f.name);
                return {
                    id: String(now.getTime()) + "_" + Math.random().toString(16).slice(2),
                    name: f.name,
                    updatedText,
                    fileType: niceType(ext)
                };
            });
            return [...mapped, ...prev];
        });

        e.target.value = "";
    };

    const onDelete = (id: string) => {
        const ok = window.confirm("Bạn có muốn xóa tài liệu này không?");
        if (!ok) return;
        setDocs((prev) => prev.filter((d) => d.id !== id));
    };

    const onDownload = (id: string) => {
        const doc = docs.find((d) => d.id === id);
        window.alert(doc ? `Tải xuống: ${doc.name}` : "Không tìm thấy");
    };

    return (
        <div className="w-full">
            <div className="mx-auto w-full max-w-6xl px-6 py-8">
                <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-[#6F6B99]">Tài liệu dự án được chia sẻ</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            ref={fileRef}
                            type="file"
                            className="hidden"
                            multiple
                            onChange={onPickFiles}
                        />
                        <Button
                            onClick={onUploadClick}
                            className="rounded-xl bg-[#FF5722] px-5 text-white hover:bg-[#e24d1e]"
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            Tải lên
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {docs.map((d) => (
                        <DocumentCard key={d.id} item={d} onDelete={onDelete} onDownload={onDownload} />
                    ))}
                </div>
            </div>
        </div>
    );
}