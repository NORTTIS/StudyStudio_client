"use client";

import { AlertCircle, Copy, Link2, Users, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type InviteRole = "Moderator" | "Member" | "Commenter" | "Viewer";

const roleOptions: InviteRole[] = ["Moderator", "Member", "Commenter", "Viewer"];

export function InviteMemberModal({
    open,
    onClose,
    groupName,
    canManage,
    onCreateLink,
    onSendInvite,
    hasModerator = false
}: {
    open: boolean;
    onClose: () => void;
    groupName: string;
    canManage: boolean;
    onCreateLink: (payload: { role: InviteRole }) => Promise<string>;
    onSendInvite: (payload: { email: string; role: InviteRole }) => Promise<void> | void;
    hasModerator?: boolean;
}) {
    const t = useTranslations("GroupInviteModal");
    const [mounted, setMounted] = useState(false);

    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");
    const [role, setRole] = useState<InviteRole>("Member");
    const [sending, setSending] = useState(false);

    const [inviteLink, setInviteLink] = useState<string>("");
    const [creatingLink, setCreatingLink] = useState(false);
    const [copied, setCopied] = useState(false);

    const roleNote: Record<InviteRole, string> = {
        Moderator: t("roles.Moderator.note"),
        Member: t("roles.Member.note"),
        Commenter: t("roles.Commenter.note"),
        Viewer: t("roles.Viewer.note")
    };

    const inviteEmailSchema = z
        .string()
        .trim()
        .min(1, t("validation.emailRequired"))
        .email(t("validation.emailInvalid"));

    useEffect(() => setMounted(true), []);

    const hasLink = useMemo(() => inviteLink.trim().length > 0, [inviteLink]);

    const visibleRoleOptions = useMemo(() => {
        return hasModerator ? roleOptions.filter((r) => r !== "Moderator") : roleOptions;
    }, [hasModerator]);

    const effectiveRole: InviteRole = useMemo(() => {
        if (hasModerator && role === "Moderator") return "Member";
        return role;
    }, [hasModerator, role]);

    useEffect(() => {
        if (!open) return;
        if (!hasModerator) return;
        if (role !== "Moderator") return;
        setRole("Member");
        setInviteLink("");
        setCopied(false);
    }, [open, hasModerator, role]);

    const isEmailValid = useMemo(() => {
        const e = email.trim();
        if (!e) return false;
        return inviteEmailSchema.safeParse(e).success;
    }, [email]);

    const canSend = useMemo(() => {
        return canManage && isEmailValid && !sending;
    }, [canManage, isEmailValid, sending]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        setEmail("");
        setEmailError("");
        setRole("Member");
        setSending(false);
        setCreatingLink(false);
        setCopied(false);
        setInviteLink("");
    }, [open]);

    useEffect(() => {
        if (!open) return;
        if (!copied) return;
        const tid = window.setTimeout(() => setCopied(false), 1200);
        return () => window.clearTimeout(tid);
    }, [copied, open]);

    const validateEmail = (raw: string) => {
        const trimmed = raw.trim();
        if (!trimmed) {
            setEmailError("");
            return false;
        }
        const validation = inviteEmailSchema.safeParse(trimmed);
        if (!validation.success) {
            setEmailError(validation.error.issues[0]?.message || t("validation.emailInvalid"));
            return false;
        }
        setEmailError("");
        return true;
    };

    const handleSend = async () => {
        if (!canManage || sending) return;

        const emailToValidate = email.trim();
        if (!validateEmail(emailToValidate)) return;

        const safeRole: InviteRole = hasModerator && effectiveRole === "Moderator" ? "Member" : effectiveRole;

        setSending(true);
        try {
            await onSendInvite({ email: emailToValidate, role: safeRole });
            setEmail("");
            setEmailError("");
        } catch {
            setEmailError(t("toast.inviteFailed"));
        } finally {
            setSending(false);
        }
    };

    const copyLink = async () => {
        const url = inviteLink.trim();
        if (!url) return;

        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
        } catch {
            try {
                const ta = document.createElement("textarea");
                ta.value = url;
                ta.style.position = "fixed";
                ta.style.left = "-9999px";
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
                setCopied(true);
            } catch { }
        }
    };

    const handleCreateOrCopyLink = async () => {
        if (!canManage) return;

        if (hasLink) {
            await copyLink();
            return;
        }

        if (creatingLink) return;

        const safeRole: InviteRole = hasModerator && effectiveRole === "Moderator" ? "Member" : effectiveRole;

        setCreatingLink(true);
        try {
            const url = await onCreateLink({ role: safeRole });
            if (url?.trim()) {
                setInviteLink(url);
                await copyLink();
            }
        } catch {
        } finally {
            setCreatingLink(false);
        }
    };

    if (!(open && mounted)) return null;

    return createPortal(
        <div className="fixed inset-0 z-[2147483647]">
            <div className="fixed inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                <div
                    className="w-full max-w-[720px] rounded-2xl bg-white shadow-2xl"
                    role="dialog"
                    aria-modal="true"
                    tabIndex={-1}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") onClose();
                    }}>
                    <div className="flex items-start justify-between gap-4 px-8 pt-7">
                        <h2 className="font-semibold text-3xl text-[#111827] tracking-tight">
                            {t("title", { groupName })}
                        </h2>

                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#111827] hover:bg-gray-50"
                            aria-label={t("closeAriaLabel")}>
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="px-8 pt-6 pb-8">
                        <div>
                            <div className="font-medium text-[#111827] text-base">{t("inviteByEmail")}</div>

                            <div className="mt-3">
                                <div className="relative">
                                    <Input
                                        value={email}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            setEmail(v);
                                            if (emailError) setEmailError("");
                                            if (v.trim().length > 0) validateEmail(v);
                                        }}
                                        onBlur={() => {
                                            if (email.trim().length > 0) validateEmail(email);
                                        }}
                                        placeholder={t("emailPlaceholder")}
                                        disabled={!canManage || sending}
                                        className={cn(
                                            "h-12 rounded-xl border-[#E5E7EB] pr-10 text-[#111827] text-base placeholder:text-[#9CA3AF] focus-visible:border-[#D1D5DB] focus-visible:ring-0",
                                            emailError && "border-red-400 focus-visible:border-red-500"
                                        )}
                                    />

                                    {email.length > 0 ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEmail("");
                                                setEmailError("");
                                            }}
                                            disabled={!canManage || sending}
                                            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-[#6B7280] hover:bg-gray-100 disabled:opacity-50"
                                            aria-label={t("clearEmailAriaLabel")}>
                                            <X className="h-4 w-4" />
                                        </button>
                                    ) : null}
                                </div>

                                {emailError ? (
                                    <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        <span>{emailError}</span>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="mt-7">
                            <div className="font-medium text-[#111827] text-base">{t("inviteAs")}</div>

                            <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                                <div className="flex min-w-0 items-start gap-4">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-[#6B7280]">
                                        <Users className="h-6 w-6" />
                                    </div>

                                    <div className="min-w-0">
                                        <Select
                                            value={effectiveRole}
                                            onValueChange={(v) => {
                                                const next = v as InviteRole;
                                                setRole(next);
                                                setInviteLink("");
                                                setCopied(false);
                                            }}
                                            disabled={!canManage || sending || creatingLink}>
                                            <SelectTrigger className="inline-flex h-auto w-fit items-center gap-2 border-0 bg-transparent p-0 shadow-none focus:outline-none focus:ring-0 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-[#6B7280]">
                                                <span className="font-semibold text-2xl text-[#111827] leading-none">
                                                    <SelectValue />
                                                </span>
                                            </SelectTrigger>

                                            <SelectContent
                                                position="popper"
                                                sideOffset={8}
                                                className="z-[2147483648] min-w-[280px] rounded-2xl border border-[#E5E7EB] bg-white p-2 shadow-xl">
                                                {visibleRoleOptions.map((r) => (
                                                    <SelectItem
                                                        key={r}
                                                        value={r}
                                                        className="rounded-xl px-3 py-2.5 text-[#111827] text-[15px] focus:bg-[#F3F4F6] data-[state=checked]:bg-[#F3F4F6]">
                                                        {t(`roles.${r}.label`)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <div className="mt-2 max-w-[420px] text-[#6B7280] text-base leading-snug">
                                            {roleNote[effectiveRole]}
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    type="button"
                                    onClick={handleSend}
                                    disabled={!canSend}
                                    className="h-12 w-full rounded-xl bg-orange-600 px-8 font-semibold text-base text-white hover:bg-orange-700 disabled:bg-orange-400 disabled:opacity-100 disabled:hover:bg-orange-400 sm:w-auto sm:min-w-[200px]">
                                    {sending ? t("buttons.sending") : t("buttons.sendInvite")}
                                </Button>
                            </div>
                        </div>

                        <div className="mt-8">
                            <div className="font-medium text-[#6B7280] text-base">{t("inviteViaLink")}</div>

                            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                                <Input
                                    value={inviteLink}
                                    readOnly
                                    tabIndex={-1}
                                    aria-readonly="true"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onFocus={(e) => e.currentTarget.blur()}
                                    placeholder={t("linkPlaceholder")}
                                    className="h-12 flex-1 cursor-default rounded-xl border-[#E5E7EB] bg-white text-[#111827] text-base placeholder:text-[#9CA3AF] focus-visible:border-[#D1D5DB] focus-visible:ring-0"
                                />

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCreateOrCopyLink}
                                    disabled={!canManage || creatingLink || (!hasLink && sending)}
                                    className="h-12 rounded-xl border-blue-500 bg-white px-5 text-blue-600 hover:bg-blue-50">
                                    {hasLink ? (
                                        <>
                                            <Copy className="mr-2 h-5 w-5" />
                                            {copied ? t("buttons.copied") : t("buttons.copyLink")}
                                        </>
                                    ) : (
                                        <>
                                            <Link2 className="mr-2 h-5 w-5" />
                                            {creatingLink ? t("buttons.creating") : t("buttons.createLink")}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {!canManage ? (
                            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm">
                                {t("permissionDenied")}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}