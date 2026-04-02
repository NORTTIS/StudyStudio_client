"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface StudioLimitModalProps {
    isOpen: boolean;
    onClose: () => void;
    studioLimit: number;
}

export function StudioLimitModal({ isOpen, onClose, studioLimit }: StudioLimitModalProps) {
    const t = useTranslations("MasterPage");
    const router = useRouter();

    const handleUpgrade = () => {
        router.push("/settings/billing");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <div className="mb-4 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                        <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                            />
                        </svg>
                    </div>
                    <h2 className="mb-2 font-bold text-[#261E33] text-xl">{t("studioLimit.title")}</h2>
                    <p className="text-gray-600 text-sm">{t("modal.limitReached")}</p>
                </div>

                <div className="flex flex-col gap-3">
                    <Button onClick={handleUpgrade} className="bg-[#FF5F3D] text-white hover:bg-[#ff4620]">
                        {t("modal.upgradeButton")}
                    </Button>
                    <Button variant="outline" onClick={onClose}>
                        {t("studioLimit.close")}
                    </Button>
                </div>
            </div>
        </div>
    );
}
