"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { type RandomAssignResponseApiResponse, randomAssignMembers, type StudioMemberResponse } from "@/api/studios";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface QuickAssignGroup {
    id: string;
    name: string;
    memberCount: number;
}

interface QuickAssignModalProps {
    open: boolean;
    onClose: () => void;
    studioId: string;
    groups: QuickAssignGroup[];
    studioOwnerId?: string;
    members: StudioMemberResponse[];
    onSuccess?: (assignedCount: number) => void;
}

type AssignScope = 0 | 1;
type GroupRole = 0 | 1 | 2 | 3 | 4;

const formSchema = z.object({
    scope: z.union([z.literal(0), z.literal(1)]),
    defaultRole: z.enum(["1", "2", "3", "4"]),
    targetGroupIds: z.array(z.string()),
    excludeUserIds: z.array(z.string())
});

type FormValues = z.infer<typeof formSchema>;

export function QuickAssignModal({
    open,
    onClose,
    studioId,
    groups,
    studioOwnerId,
    members,
    onSuccess
}: QuickAssignModalProps) {
    const t = useTranslations("QuickAssignModal");

    const [mounted, setMounted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            scope: 0,
            defaultRole: "2",
            targetGroupIds: [],
            excludeUserIds: []
        }
    });

    const scope = form.watch("scope");
    const excludeUserIds = form.watch("excludeUserIds");
    const targetGroupIds = form.watch("targetGroupIds");

    // Excluded user IDs (includes owner + user-selected)
    const allExcludedIds = useMemo(() => {
        const ids = new Set<string>(excludeUserIds);
        if (studioOwnerId) ids.add(studioOwnerId);
        return ids;
    }, [excludeUserIds, studioOwnerId]);

    // Studio owner info
    const studioOwner = useMemo(() => members.find((m) => m.userId === studioOwnerId), [members, studioOwnerId]);

    // Members available to exclude (excludes studio owner)
    const excludeableMembers = useMemo(
        () => members.filter((m) => m.userId !== studioOwnerId),
        [members, studioOwnerId]
    );

    // Members available to assign (excludes excluded)
    const assignableMembers = useMemo(
        () => members.filter((m) => m.userId && !allExcludedIds.has(m.userId)),
        [members, allExcludedIds]
    );

    const roleOptions = useMemo(
        () => [
            { value: "1", label: t("roles.moderator") },
            { value: "2", label: t("roles.member") },
            { value: "3", label: t("roles.commenter") },
            { value: "4", label: t("roles.viewer") }
        ],
        [t]
    );

    const scopeLabels: Record<AssignScope, string> = {
        0: t("scope.unassignedOnly"),
        1: t("scope.allMembers")
    };

    useEffect(() => setMounted(true), []);

    // Reset form when modal opens
    useEffect(() => {
        if (!open) return;
        form.reset({
            scope: 0,
            defaultRole: "2",
            targetGroupIds: [],
            excludeUserIds: []
        });
        setSubmitError(null);
        setSubmitSuccess(false);
    }, [open, form]);

    // Body scroll lock
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    // Escape key
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    const toggleExclude = useCallback(
        (userId: string | undefined) => {
            if (!userId) return;
            const current = form.getValues("excludeUserIds");
            if (current.includes(userId)) {
                form.setValue(
                    "excludeUserIds",
                    current.filter((id) => id !== userId),
                    { shouldValidate: true }
                );
            } else {
                form.setValue("excludeUserIds", [...current, userId], { shouldValidate: true });
            }
        },
        [form]
    );

    const toggleGroup = useCallback(
        (groupId: string) => {
            const current = form.getValues("targetGroupIds");
            if (current.includes(groupId)) {
                form.setValue(
                    "targetGroupIds",
                    current.filter((id) => id !== groupId),
                    { shouldValidate: true }
                );
            } else {
                form.setValue("targetGroupIds", [...current, groupId], { shouldValidate: true });
            }
        },
        [form]
    );

    const onSubmit = async (values: FormValues) => {
        setSubmitting(true);
        setSubmitError(null);

        try {
            const body = {
                scope: values.scope,
                defaultRole: Number.parseInt(values.defaultRole) as GroupRole,
                targetGroupIds: values.targetGroupIds.length > 0 ? values.targetGroupIds : null,
                excludeUserIds: allExcludedIds.size > 0 ? Array.from(allExcludedIds) : null
            };

            const result: RandomAssignResponseApiResponse = await randomAssignMembers(studioId, body);

            if (result.status === "success" || result.status === "Success") {
                const assignedCount = result.data?.assignedCount ?? 0;
                setSubmitSuccess(true);
                onSuccess?.(assignedCount);
                setTimeout(() => {
                    onClose();
                }, 1500);
            } else {
                setSubmitError(result.message || t("errors.assignFailed"));
            }
        } catch {
            setSubmitError(t("errors.assignException"));
        } finally {
            setSubmitting(false);
        }
    };

    if (!(open && mounted)) return null;

    return createPortal(
        <div className="fixed inset-0 z-[2147483647]">
            <div className="fixed inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                <div
                    className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-2xl bg-white shadow-2xl"
                    role="dialog"
                    aria-modal="true"
                    tabIndex={-1}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") onClose();
                    }}>
                    {/* Header */}
                    <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-gray-100 border-b bg-white px-8 pt-7 pb-5">
                        <div className="flex items-center gap-3">
                            <div>
                                <h2 className="font-semibold text-2xl text-[#111827] tracking-tight">
                                    {t("title")}
                                </h2>
                                <p className="text-[#6B7280] text-sm">{t("subtitle")}</p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#111827] transition-colors hover:bg-gray-50">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 px-8 py-6">
                        {/* Scope */}
                        <div>
                            <h3 className="font-semibold text-[#111827] text-base">{t("scope.title")}</h3>
                            <div className="mt-3 space-y-2">
                                <label
                                    className={cn(
                                        "flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all",
                                        scope === 0
                                            ? "border-orange-500 bg-orange-50"
                                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                    )}>
                                    <input
                                        type="radio"
                                        value="0"
                                        checked={scope === 0}
                                        onChange={() => form.setValue("scope", 0)}
                                        className="h-4 w-4 accent-orange-500"
                                    />
                                    <div className="flex-1">
                                        <span className="font-medium text-[#111827]">{scopeLabels[0]}</span>
                                        <p className="mt-0.5 text-[#6B7280] text-sm">
                                            {t("scope.unassignedDescription")}
                                        </p>
                                    </div>
                                </label>

                                <label
                                    className={cn(
                                        "flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all",
                                        scope === 1
                                            ? "border-orange-500 bg-orange-50"
                                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                    )}>
                                    <input
                                        type="radio"
                                        value="1"
                                        checked={scope === 1}
                                        onChange={() => form.setValue("scope", 1)}
                                        className="h-4 w-4 accent-orange-500"
                                    />
                                    <div className="flex-1">
                                        <span className="font-medium text-[#111827]">{scopeLabels[1]}</span>
                                        <p className="mt-0.5 text-[#6B7280] text-sm">{t("scope.allMembersDescription")}</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Default Role */}
                        <div>
                            <h3 className="font-semibold text-[#111827] text-base">{t("defaultRole.title")}</h3>
                            <div className="mt-3">
                                <select
                                    {...form.register("defaultRole")}
                                    className="h-11 w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 text-[#111827] text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20">
                                    {roleOptions.map(({ value, label }) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Target Groups */}
                        <div>
                            <h3 className="font-semibold text-[#111827] text-base">{t("targetGroups.title")}</h3>
                            <p className="mt-1 mb-3 text-[#6B7280] text-xs">{t("targetGroups.hint")}</p>
                            {groups.length > 0 ? (
                                <div className="max-h-[180px] space-y-2 overflow-y-auto rounded-xl border border-gray-200 p-3">
                                    {groups.map((group) => {
                                        const isSelected = targetGroupIds.includes(group.id);
                                        return (
                                            <label
                                                key={group.id}
                                                className={cn(
                                                    "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all",
                                                    isSelected
                                                        ? "border-orange-500 bg-orange-50"
                                                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                                )}>
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleGroup(group.id)}
                                                    className="h-4 w-4 rounded border-gray-300 data-[state=checked]:border-orange-500 data-[state=checked]:bg-orange-500"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <span className="block truncate font-medium text-[#111827] text-sm">
                                                        {group.name}
                                                    </span>
                                                    <span className="text-[#6B7280] text-xs">
                                                        {t("targetGroups.memberCount", { count: group.memberCount })}
                                                    </span>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-xl border border-gray-200 p-4 text-center text-[#6B7280] text-sm">
                                    {t("targetGroups.noGroups")}
                                </div>
                            )}
                        </div>

                        {/* Exclude Users */}
                        <div>
                            <h3 className="font-semibold text-[#111827] text-base">{t("excludeMembers.title")}</h3>
                            <p className="mt-1 mb-3 text-[#6B7280] text-xs">
                                {t("excludeMembers.hint")}
                            </p>

                            {/* Member multi-select */}
                            {excludeableMembers.filter((m) => m.userId).length > 0 ? (
                                <div className="max-h-[180px] space-y-2 overflow-y-auto rounded-xl border border-gray-200 p-3">
                                    {excludeableMembers
                                        .filter((m) => m.userId)
                                        .map((member) => {
                                            const isExcluded = member.userId
                                                ? excludeUserIds.includes(member.userId)
                                                : false;
                                            return (
                                                <label
                                                    key={member.userId}
                                                    className={cn(
                                                        "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all",
                                                        isExcluded
                                                            ? "border-orange-500 bg-orange-50"
                                                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                                    )}>
                                                    <Checkbox
                                                        checked={isExcluded}
                                                        onCheckedChange={() => toggleExclude(member.userId!)}
                                                        className="h-4 w-4 rounded border-gray-300 data-[state=checked]:border-orange-500 data-[state=checked]:bg-orange-500"
                                                    />
                                                    <div className="flex min-w-0 flex-1 items-center gap-2">
                                                        {member.avatarUrl ? (
                                                            <img
                                                                src={member.avatarUrl}
                                                                alt={member.userName || ""}
                                                                className="h-6 w-6 shrink-0 rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 font-semibold text-[10px] text-white">
                                                                {(member.userName || "?")
                                                                    .split(" ")
                                                                    .map((n) => n[0])
                                                                    .join("")
                                                                    .toUpperCase()
                                                                    .slice(0, 2)}
                                                            </div>
                                                        )}
                                                        <div className="min-w-0 flex-1">
                                                            <span className="block truncate font-medium text-[#111827] text-sm">
                                                                {member.userName}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                </div>
                            ) : (
                                <div className="rounded-xl border border-gray-200 p-4 text-center text-[#6B7280] text-sm">
                                    {t("excludeMembers.none")}
                                </div>
                            )}
                        </div>

                        {/* Error */}
                        {submitError && (
                            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{submitError}</span>
                            </div>
                        )}

                        {/* Success */}
                        {submitSuccess && (
                            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700 text-sm">
                                {t("success")}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={submitting}
                                className="h-11 rounded-xl border-gray-200 px-6 font-medium text-[#111827] hover:bg-gray-50">
                                {t("actions.cancel")}
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting || assignableMembers.length === 0 || groups.length === 0}
                                className="h-11 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-6 font-semibold text-white shadow-lg shadow-orange-500/30 hover:from-orange-600 hover:to-red-700 disabled:opacity-50">
                                {submitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t("actions.assigning")}
                                    </>
                                ) : (
                                    t("actions.assignRandom")
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
}
