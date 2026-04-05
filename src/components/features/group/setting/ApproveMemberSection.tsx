"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock3, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { approvePendingMember, getPendingMembers, rejectPendingMember } from "@/api/invites";
import {
    isPendingJoinRequestCanceledByMember,
    pendingJoinEvents,
    PENDING_JOIN_CHANGED_EVENT
} from "@/components/features/group/group.api";
import type { PendingMemberDto } from "@/api/invites";

export type PendingMember = PendingMemberDto & {
    id: string;
    name: string;
};

type ApproveMemberSectionProps = {
    groupId?: string;
    canManage?: boolean;
    showMemberApprovalToggle?: boolean;
    requiresMemberApproval?: boolean;
    canEditMemberApproval?: boolean;
    onRequiresMemberApprovalChange?: (checked: boolean) => void;
};

export function ApproveMemberSection({
    groupId,
    canManage = false,
    showMemberApprovalToggle = false,
    requiresMemberApproval = false,
    canEditMemberApproval = false,
    onRequiresMemberApprovalChange
}: ApproveMemberSectionProps) {
    const t = useTranslations("GroupSettingView.approveMember");
    const [items, setItems] = useState<PendingMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [approveLoadingByUserId, setApproveLoadingByUserId] = useState<Record<string, boolean>>({});
    const [rejectLoadingByUserId, setRejectLoadingByUserId] = useState<Record<string, boolean>>({});

    const loadPendingMembers = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            if (!groupId) {
                setItems([]);
                setLoading(false);
                return;
            }

            const response = await getPendingMembers(groupId);

            if (response?.status === "success" && response?.data) {
                const pendingMembers = (response.data.pendingMembers || [])
                    .map((member) => {
                        const firstName = member.firstName || "";
                        const lastName = member.lastName || "";
                        const name = `${firstName} ${lastName}`.trim() || member.email || "Unknown";
                        return {
                            ...member,
                            id: member.userId || "",
                            name
                        };
                    })
                    .filter((member) => !isPendingJoinRequestCanceledByMember(groupId, member));

                setItems(pendingMembers);
            } else {
                setItems([]);
                if (response?.message) {
                    setError(response.message);
                }
            }
        } catch (err) {
            console.error("[ApproveMemberSection] Failed to load pending members:", err);
            setError(t("error"));
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [groupId, t, requiresMemberApproval]);

    useEffect(() => {
        void loadPendingMembers();
    }, [loadPendingMembers]);

    useEffect(() => {
        const handlePendingJoinChanged = (event: Event) => {
            const customEvent = event as CustomEvent<{ groupId?: string; marker?: { userId?: string } }>;
            const changedGroupId = String(customEvent.detail?.groupId ?? "").trim();
            const canceledUserId = String(customEvent.detail?.marker?.userId ?? "").trim();

            if (changedGroupId && groupId && changedGroupId !== groupId) {
                return;
            }

            if (canceledUserId) {
                setItems((prev) => prev.filter((item) => item.id !== canceledUserId));
            }

            window.setTimeout(() => {
                void loadPendingMembers();
            }, 800);
        };

        pendingJoinEvents.addEventListener(PENDING_JOIN_CHANGED_EVENT, handlePendingJoinChanged);

        return () => {
            pendingJoinEvents.removeEventListener(PENDING_JOIN_CHANGED_EVENT, handlePendingJoinChanged);
        };
    }, [groupId, loadPendingMembers]);

    const approvalEnabled = !!requiresMemberApproval;
    const approvalTone = approvalEnabled
        ? {
            wrapper: "border-orange-200 bg-orange-50/80",
            title: "text-orange-800",
            description: "text-orange-700/80",
            badge: "bg-orange-600 text-white",
            badgeText: t("statusOn"),
            switchTrack: "data-[state=checked]:bg-orange-600 data-[state=unchecked]:bg-gray-300"
        }
        : {
            wrapper: "border-slate-200 bg-slate-50/80",
            title: "text-slate-800",
            description: "text-slate-500",
            badge: "bg-slate-200 text-slate-700",
            badgeText: t("statusOff"),
            switchTrack: "data-[state=checked]:bg-orange-600 data-[state=unchecked]:bg-slate-300"
        };

    const handleApprove = async (userId: string) => {
        if (!canManage || !groupId) return;

        setApproveLoadingByUserId((prev) => ({ ...prev, [userId]: true }));
        setError("");

        try {
            const response = await approvePendingMember(groupId, userId);

            if (response?.status === "success") {
                setItems((prev) => prev.filter((item) => item.id !== userId));
                pendingJoinEvents.dispatchEvent(
                    new CustomEvent(PENDING_JOIN_CHANGED_EVENT, {
                        detail: { groupId, userId }
                    })
                );
            } else {
                setError(response?.message || t("approveFailed"));
            }
        } catch (err) {
            console.error("[ApproveMemberSection] Approval failed:", err);
            setError(t("approveFailed"));
        } finally {
            setApproveLoadingByUserId((prev) => ({ ...prev, [userId]: false }));
        }
    };

    const handleReject = async (userId: string) => {
        if (!canManage || !groupId) return;

        setRejectLoadingByUserId((prev) => ({ ...prev, [userId]: true }));
        setError("");

        try {
            await rejectPendingMember(groupId, userId);

            setItems((prev) => prev.filter((item) => item.id !== userId));
            pendingJoinEvents.dispatchEvent(
                new CustomEvent(PENDING_JOIN_CHANGED_EVENT, {
                    detail: { groupId, userId }
                })
            );
        } catch (err) {
            console.error("[ApproveMemberSection] Rejection failed:", err);
            setError(t("rejectFailed"));
        } finally {
            setRejectLoadingByUserId((prev) => ({ ...prev, [userId]: false }));
        }
    };

    return (
        <section className="rounded-2xl border bg-white shadow-sm">
            <div className="flex items-start justify-between border-b px-6 py-5">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100">
                        <Clock3 className="h-4 w-4 text-gray-700" />
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-900 text-sm">{t("title")}</h2>
                        <p className="mt-0.5 text-gray-500 text-xs">{t("subtitle")}</p>
                    </div>
                </div>

                <div className="rounded-full bg-orange-50 px-3 py-1 font-semibold text-orange-700 text-xs">
                    {t("pendingCount", { count: items.length })}
                </div>
            </div>

            <div className="px-6 py-6">
                {showMemberApprovalToggle ? (
                    <motion.div
                        layout
                        initial={false}
                        animate={{
                            scale: approvalEnabled ? 1.01 : 1,
                            boxShadow: approvalEnabled
                                ? "0 16px 34px rgba(249, 115, 22, 0.12)"
                                : "0 10px 24px rgba(148, 163, 184, 0.08)"
                        }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className={`mb-5 flex items-center justify-between rounded-2xl border px-4 py-4 shadow-sm transition-all duration-300 ease-out ${approvalTone.wrapper}`}
                    >
                        <div className="flex items-center gap-3">
                            <motion.div
                                key={approvalTone.badgeText}
                                initial={{ opacity: 0, y: 6, scale: 0.92 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.22, ease: "easeOut" }}
                                className={`rounded-full px-3 py-1 font-semibold text-[11px] uppercase tracking-[0.14em] transition-colors duration-300 ${approvalTone.badge}`}
                            >
                                {approvalTone.badgeText}
                            </motion.div>
                            <div>
                                <AnimatePresence mode="wait" initial={false}>
                                    <motion.div
                                        key={approvalEnabled ? "approval-on" : "approval-off"}
                                        initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                        exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                                        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                                    >
                                        <div className={`font-semibold text-xs transition-colors duration-300 ${approvalTone.title}`}>
                                            {approvalEnabled ? t("enabledTitle") : t("disabledTitle")}
                                        </div>
                                        <div className={`mt-0.5 text-xs transition-colors duration-300 ${approvalTone.description}`}>
                                            {approvalEnabled ? t("enabledDescription") : t("disabledDescription")}
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>
                        <motion.div
                            animate={{ rotate: approvalEnabled ? 0 : -2, scale: approvalEnabled ? 1.03 : 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 18 }}
                        >
                            <Switch
                                checked={requiresMemberApproval}
                                onCheckedChange={(checked) => {
                                    if (!canEditMemberApproval) return;
                                    onRequiresMemberApprovalChange?.(checked);
                                }}
                                disabled={!canEditMemberApproval}
                                className={`scale-110 transition-all duration-300 ease-out data-[state=checked]:shadow-[0_0_0_6px_rgba(249,115,22,0.12)] ${approvalTone.switchTrack}`}
                            />
                        </motion.div>
                    </motion.div>
                ) : null}

                {loading ? (
                    <div className="text-gray-500 text-sm">{t("loading")}</div>
                ) : items.length === 0 ? (
                    <div className="rounded-2xl border border-dashed px-4 py-10 text-center text-gray-500 text-sm">
                        {t("empty")}
                    </div>
                ) : (
                    <div className="divide-y rounded-2xl border">
                        {items.map((item) => {
                            const approving = !!approveLoadingByUserId[item.id];
                            const rejecting = !!rejectLoadingByUserId[item.id];
                            const busy = approving || rejecting || !canManage;

                            return (
                                <div
                                    key={item.id}
                                    className="flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between"
                                >
                                    <div className="min-w-0">
                                        <div className="font-semibold text-gray-900 text-sm">{item.name}</div>
                                        <div className="truncate text-gray-500 text-xs">{item.email}</div>

                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            {item.role ? (
                                                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700 text-xs">
                                                    {t("requestedRole", { role: item.role })}
                                                </span>
                                            ) : null}

                                            {item.requestedAt ? (
                                                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700 text-xs">
                                                    {t("requestedAt", { time: new Date(item.requestedAt).toLocaleString() })}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            disabled={busy}
                                            onClick={() => void handleApprove(item.id)}
                                            className="h-10 gap-1.5 rounded-xl bg-orange-600 px-4 font-semibold text-sm text-white hover:bg-orange-700"
                                        >
                                            <Check className="h-4 w-4" />
                                            {approving ? t("approving") : t("approve")}
                                        </Button>

                                        <Button
                                            variant="outline"
                                            disabled={busy}
                                            onClick={() => void handleReject(item.id)}
                                            className="h-10 gap-1.5 rounded-xl border-red-200 px-4 font-semibold text-red-600 text-sm hover:bg-red-50"
                                        >
                                            <X className="h-4 w-4" />
                                            {rejecting ? t("rejecting") : t("reject")}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {error ? (
                    <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-xs">
                        {error}
                    </div>
                ) : null}
            </div>
        </section>
    );
}
