"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    studioName: string;
}

export function DeleteConfirmModal({ isOpen, onClose, onConfirm, studioName }: DeleteConfirmModalProps) {
    const t = useTranslations("MasterPage");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                        <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                    <div>
                        <h2 className="font-bold text-[#261E33] text-xl">{t("deleteModal.title")}</h2>
                    </div>
                </div>

                <p className="mb-2 text-[#6F6B99]">
                    {t("deleteModal.message")} <span className="font-semibold text-[#261E33]">{studioName}</span>?
                </p>

                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-red-700 text-sm">{t("deleteModal.warning")}</p>
                </div>

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={onClose}>
                        {t("deleteModal.cancel")}
                    </Button>
                    <Button type="button" onClick={onConfirm} className="bg-red-600 hover:bg-red-700">
                        {t("deleteModal.confirm")}
                    </Button>
                </div>
            </div>
        </div>
    );
}
