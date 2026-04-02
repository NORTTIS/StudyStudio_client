"use client";

import { Check, Clock3, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export type PendingMember = {
    id: string;
    name: string;
    email: string;
    requestedRole?: string;
    requestedAt?: string;
};

type ApproveMemberSectionProps = {
    groupId?: string;
    canManage?: boolean;
};

const MOCK_PENDING_MEMBERS: PendingMember[] = [
    {
        id: "pending-1",
        name: "Nguyen Van A",
        email: "nguyenvana@example.com",
        requestedRole: "Member",
        requestedAt: "2026-04-01 09:30"
    },
    {
        id: "pending-2",
        name: "Tran Thi B",
        email: "tranthib@example.com",
        requestedRole: "Commenter",
        requestedAt: "2026-04-01 10:15"
    },
    {
        id: "pending-3",
        name: "Le Van C",
        email: "levanc@example.com",
        requestedRole: "Viewer",
        requestedAt: "2026-04-01 11:00"
    }
];

export function ApproveMemberSection({ groupId, canManage = false }: ApproveMemberSectionProps) {
    const t = useTranslations("GroupSettingView.approveMember");
    const [items, setItems] = useState<PendingMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [approveLoadingByUserId, setApproveLoadingByUserId] = useState<Record<string, boolean>>({});
    const [rejectLoadingByUserId, setRejectLoadingByUserId] = useState<Record<string, boolean>>({});

    useEffect(() => {
        let alive = true;

        const loadPendingMembers = async () => {
            try {
                setLoading(true);
                setError("");

                // TODO: CALL API HERE
                // Ví dụ:
                // const res = await fetch(`/api/group/${groupId}/pending-members`);
                // const json = await res.json();
                // if (!alive) return;
                // setItems(json.data ?? []);

                await new Promise((resolve) => setTimeout(resolve, 300));

                if (!alive) return;

                if (!groupId) {
                    setItems([]);
                    setLoading(false);
                    return;
                }

                setItems(MOCK_PENDING_MEMBERS);
            } catch {
                if (!alive) return;
                setError(t("error"));
                setItems([]);
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        };

        void loadPendingMembers();

        return () => {
            alive = false;
        };
    }, [groupId]);

    const handleApprove = async (userId: string) => {
        if (!canManage) return;

        setApproveLoadingByUserId((prev) => ({ ...prev, [userId]: true }));
        setError("");

        try {
            // TODO: CALL API APPROVE HERE
            // Ví dụ:
            // await fetch(`/api/group/member/approve`, {
            //     method: "PUT",
            //     headers: { "Content-Type": "application/json" },
            //     body: JSON.stringify({ groupId, userId })
            // });

            await new Promise((resolve) => setTimeout(resolve, 400));

            setItems((prev) => prev.filter((item) => item.id !== userId));
        } catch {
            setError("Phê duyệt thành viên thất bại");
        } finally {
            setApproveLoadingByUserId((prev) => ({ ...prev, [userId]: false }));
        }
    };

    const handleReject = async (userId: string) => {
        if (!canManage) return;

        setRejectLoadingByUserId((prev) => ({ ...prev, [userId]: true }));
        setError("");

        try {
            // TODO: CALL API REJECT HERE
            // Ví dụ:
            // await fetch(`/api/group/member/reject`, {
            //     method: "DELETE",
            //     headers: { "Content-Type": "application/json" },
            //     body: JSON.stringify({ groupId, userId })
            // });

            await new Promise((resolve) => setTimeout(resolve, 400));

            setItems((prev) => prev.filter((item) => item.id !== userId));
        } catch {
            setError("Từ chối thành viên thất bại");
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
                        <p className="mt-0.5 text-gray-500 text-xs">
                            {t("subtitle")}
                        </p>
                    </div>
                </div>

                <div className="rounded-full bg-orange-50 px-3 py-1 font-semibold text-orange-700 text-xs">
                    {t("pendingCount", { count: items.length })}
                </div>
            </div>

            <div className="px-6 py-6">
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
                                            {item.requestedRole ? (
                                                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700 text-xs">
                                                    {t("requestedRole", { role: item.requestedRole })}
                                                </span>
                                            ) : null}

                                            {item.requestedAt ? (
                                                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700 text-xs">
                                                    {t("requestedAt", { time: item.requestedAt })}
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