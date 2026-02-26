"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { createInviteLink, sendInviteEmail } from "@/api/invites";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

type InviteMemberModalProps = {
    isOpen: boolean;
    onClose: () => void;
    groupId: string;
    groupName: string;
};

export function InviteMemberModal({ isOpen, onClose, groupId, groupName }: InviteMemberModalProps) {
    const t = useTranslations("InviteMemberModal");
    const locale = useLocale();
    const { toast } = useToast();

    const [email, setEmail] = useState("");
    const [role, _setRole] = useState("member");
    const [inviteLink, setInviteLink] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    if (!isOpen) return null;

    const handleGenerateLink = async () => {
        setIsLoading(true);
        try {
            const result = await createInviteLink({ groupId, role }, locale);

            if (result.status === "success" && result.data) {
                setInviteLink(result.data.inviteUrl);
                toast({ description: t("linkGenerated"), variant: "success" });
            } else {
                toast({ description: t("linkError"), variant: "destructive" });
            }
        } catch (error) {
            console.error("Generate link failed:", error);
            toast({ description: t("linkError"), variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyLink = async () => {
        if (!inviteLink) return;

        try {
            await navigator.clipboard.writeText(inviteLink);
            setIsCopied(true);
            toast({ description: t("linkCopied"), variant: "success" });
            setTimeout(() => setIsCopied(false), 2000);
        } catch (error) {
            console.error("Copy failed:", error);
            toast({ description: t("copyError"), variant: "destructive" });
        }
    };

    const handleSendEmail = async () => {
        if (!email.trim()) {
            toast({ description: t("emailRequired"), variant: "destructive" });
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast({ description: t("emailInvalid"), variant: "destructive" });
            return;
        }

        setIsLoading(true);
        try {
            const result = await sendInviteEmail({ groupId, role, email }, locale);

            if (result.status === "success") {
                toast({ description: t("emailSent"), variant: "success" });
                setEmail("");
            } else {
                toast({ description: t("emailError"), variant: "destructive" });
            }
        } catch (error) {
            console.error("Send email failed:", error);
            toast({ description: t("emailError"), variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setEmail("");
        setInviteLink("");
        setIsCopied(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="font-semibold text-[#261E33] text-xl">
                        {t("title")} {groupName}
                    </h2>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="text-[#6F6B99] transition-colors hover:text-[#261E33]">
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* Invite by email */}
                <div className="mb-6">
                    <label htmlFor="invite-email" className="mb-2 block font-medium text-[#261E33] text-sm">
                        {t("inviteByEmail")}
                    </label>
                    <div className="relative">
                        <input
                            id="invite-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t("emailPlaceholder")}
                            className="w-full rounded-lg border border-gray-300 py-2 pr-10 pl-3 text-sm focus:border-[#FF5F3D] focus:outline-none focus:ring-2 focus:ring-[#FF5F3D]/20"
                        />
                        {email && (
                            <button
                                type="button"
                                onClick={() => setEmail("")}
                                className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* Role selector */}
                <div className="mb-6">
                    <span className="mb-2 block font-medium text-[#261E33] text-sm">{t("inviteAs")}</span>
                    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
                            <svg
                                className="h-5 w-5 text-[#6F6B99]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-[#261E33] text-sm">{t("member")}</span>
                                <svg
                                    className="h-4 w-4 text-[#6F6B99]"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </div>
                            <p className="text-[#6F6B99] text-xs">{t("memberDescription")}</p>
                        </div>
                    </div>
                </div>

                {/* Send invite button */}
                <Button
                    onClick={handleSendEmail}
                    disabled={isLoading}
                    className="mb-6 w-full bg-[#261E33] hover:bg-[#1a1525]">
                    {isLoading ? t("sending") : t("sendInvite")}
                </Button>

                {/* Divider */}
                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-gray-200 border-t" />
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-white px-3 text-[#6F6B99] text-sm">{t("orInviteViaLink")}</span>
                    </div>
                </div>

                {/* Invite link */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={inviteLink || t("linkPlaceholder")}
                            readOnly
                            className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pr-3 pl-3 text-[#6F6B99] text-sm"
                        />
                    </div>
                    <Button
                        onClick={inviteLink ? handleCopyLink : handleGenerateLink}
                        disabled={isLoading}
                        variant="outline"
                        className="flex items-center gap-2 border-[#FF5F3D] text-[#FF5F3D] hover:bg-[#FF5F3D] hover:text-white">
                        {inviteLink ? (
                            <>
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                    />
                                </svg>
                                {isCopied ? t("copied") : t("getLink")}
                            </>
                        ) : (
                            t("getLink")
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
