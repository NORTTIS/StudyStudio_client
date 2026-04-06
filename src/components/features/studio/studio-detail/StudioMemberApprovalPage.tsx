"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { getUserProfile, type UserProfile } from "@/api/user-profile";
import {
    approveStudioPendingMember,
    getStudioPendingMembers,
    rejectStudioPendingMember,
    type StudioPendingMemberDto
} from "@/api/studios";
import { hexToGradient } from "@/lib/utils";

export interface StudioMemberApprovalItem {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
    requestedAt: string;
    colorHex?: string | null;
}

function dedupeApprovalItems(items: StudioMemberApprovalItem[]) {
    const seen = new Set<string>();

    return items.filter((item) => {
        const key = String(item.id || "").trim() || String(item.email || "").trim().toLowerCase();

        if (!key || seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });
}

interface StudioMemberApprovalPageProps {
    studioName?: string;
    studioColorHex?: string | null;
}

function EmptyBlock({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[28px] border border-white/80 bg-white/82 p-14 text-center shadow-sm backdrop-blur">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#FFF1EC_0%,#F5F0FF_100%)]">
                <svg className="h-7 w-7 text-[#9B8CA8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            </div>
            <p className="text-sm font-medium text-slate-600">{title}</p>
            <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </motion.div>
    );
}

function ApprovalCardSkeleton() {
    return (
        <div className="rounded-[28px] border border-white/80 bg-white/88 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur">
            <div className="animate-pulse">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-slate-200" />
                        <div className="min-w-0 flex-1">
                            <div className="h-4 w-40 rounded bg-slate-200" />
                            <div className="mt-3 h-3 w-56 rounded bg-slate-200" />
                            <div className="mt-3 h-3 w-72 rounded bg-slate-200" />
                            <div className="mt-3 h-3 w-32 rounded bg-slate-200" />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="h-11 w-24 rounded-2xl bg-slate-200" />
                        <div className="h-11 w-28 rounded-2xl bg-slate-200" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function StudioMemberApprovalPage({
    studioName = "Studio Workspace",
    studioColorHex = "#FF5F3D"
}: StudioMemberApprovalPageProps) {
    const params = useParams();
    const router = useRouter();
    const locale = useLocale();
    const { toast } = useToast();

    const studioId = params.studioId as string;

    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [loadingApprovals, setLoadingApprovals] = useState(true);
    const [submittingId, setSubmittingId] = useState<string | null>(null);

    const [approvals, setApprovals] = useState<StudioMemberApprovalItem[]>([]);

    const mapPendingMember = useCallback((member: StudioPendingMemberDto): StudioMemberApprovalItem => {
        const firstName = String(member.firstName ?? "").trim();
        const lastName = String(member.lastName ?? "").trim();
        const fullName = `${firstName} ${lastName}`.trim() || String(member.email || "Unknown");

        return {
            id: String(member.userId || ""),
            fullName,
            email: String(member.email || ""),
            avatarUrl: member.avatarUrl ?? null,
            requestedAt: String(member.requestedAt || ""),
            colorHex: null
        };
    }, []);

    const loadUserProfile = useCallback(async () => {
        setLoadingProfile(true);
        try {
            const result = await getUserProfile(locale);
            if (result.status === "success" && result.data) {
                setUserProfile(result.data);
            }
        } catch (error) {
            console.error("Load profile failed:", error);
        } finally {
            setLoadingProfile(false);
        }
    }, [locale]);

    const loadApprovalRequests = useCallback(async () => {
        setLoadingApprovals(true);

        try {
            const result = await getStudioPendingMembers(studioId, locale);

            if (result.status === "success" && result.data) {
                const items = dedupeApprovalItems((result.data.pendingMembers || [])
                    .map(mapPendingMember)
                    .filter((item) => item.id));
                setApprovals(items);
                return;
            }

            setApprovals([]);
            toast({
                description: result.message || "Không tải được danh sách phê duyệt.",
                variant: "destructive"
            });
        } catch (error) {
            console.error("Load approval requests failed:", error);
            setApprovals([]);

            toast({
                description: "Không tải được danh sách phê duyệt.",
                variant: "destructive"
            });
        } finally {
            setLoadingApprovals(false);
        }
    }, [locale, mapPendingMember, studioId, toast]);

    useEffect(() => {
        loadUserProfile();
        loadApprovalRequests();
    }, [loadUserProfile, loadApprovalRequests]);

    const handleApprove = async (approvalId: string) => {
        setSubmittingId(approvalId);

        try {
            const result = await approveStudioPendingMember(studioId, approvalId, locale);
            if (result.status !== "success") {
                throw new Error("Approve failed");
            }

            setApprovals((prev) => prev.filter((item) => item.id !== approvalId));
            await loadApprovalRequests();
        } catch (error) {
            console.error("Approve member failed:", error);
            toast({
                description: "Phê duyệt thành viên thất bại",
                variant: "destructive"
            });
        } finally {
            setSubmittingId(null);
        }
    };

    const handleReject = async (approvalId: string) => {
        setSubmittingId(approvalId);

        try {
            await rejectStudioPendingMember(studioId, approvalId, locale);
            setApprovals((prev) => prev.filter((item) => item.id !== approvalId));
            await loadApprovalRequests();
        } catch (error) {
            console.error("Reject member failed:", error);
            toast({
                description: "Từ chối yêu cầu thất bại",
                variant: "destructive"
            });
        } finally {
            setSubmittingId(null);
        }
    };

    return (
        <div className="h-screen overflow-hidden bg-[linear-gradient(180deg,#FAFAFB_0%,#F7F8FA_100%)] text-[#261E33]">
            <div className="flex h-full">
                <DashboardSidebar />

                <main className="relative h-screen flex-1 overflow-y-auto overflow-x-hidden">
                    <Header userProfile={userProfile} />

                    <div className="px-6 py-6">
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 overflow-hidden rounded-[36px] border border-white/70 bg-white/72 px-6 py-7 shadow-[0_28px_90px_rgba(15,23,42,0.06)] backdrop-blur-2xl">
                            <div className="mb-5 flex items-start gap-4">
                                <motion.button
                                    whileHover={{ x: -2 }}
                                    whileTap={{ scale: 0.96 }}
                                    type="button"
                                    onClick={() => {
                                        if (studioId) {
                                            router.push(`/${locale}/studio/${studioId}`);
                                        }
                                    }}
                                    className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/90 text-[#6F6B99] shadow-sm transition-all hover:bg-orange-50 hover:text-orange-600">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15 19l-7-7 7-7"
                                        />
                                    </svg>
                                </motion.button>

                                <div className="flex min-w-0 flex-1 items-center gap-4">
                                    <div
                                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_16px_30px_rgba(255,95,61,0.18)]"
                                        style={{ background: hexToGradient(studioColorHex ?? "#FF5F3D") }}>
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                            />
                                        </svg>
                                    </div>

                                    <div className="min-w-0">
                                        <h1 className="truncate text-2xl font-bold text-[#261E33] sm:text-[30px]">
                                            Phê duyệt thành viên - {studioName}
                                        </h1>
                                        <p className="mt-2 text-sm leading-7 text-[#6F6B99]">
                                            Kiểm tra và xử lý các yêu cầu tham gia studio.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <Link
                                    href={`/${locale}/studio/${studioId}`}
                                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
                                    Danh sách thành viên
                                </Link>

                                <div className="rounded-xl bg-[linear-gradient(135deg,#E6492D_0%,#FF5A36_55%,#FF6B45_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(230,73,45,0.28)]">
                                    Phê duyệt thành viên ({approvals.length})
                                </div>
                            </div>
                        </motion.div>

                        {loadingProfile || loadingApprovals ? (
                            <div className="grid grid-cols-1 gap-5">
                                <ApprovalCardSkeleton />
                                <ApprovalCardSkeleton />
                                <ApprovalCardSkeleton />
                            </div>
                        ) : approvals.length === 0 ? (
                            <EmptyBlock
                                title="Không có yêu cầu chờ phê duyệt"
                                subtitle="Mọi yêu cầu tham gia mới sẽ hiển thị tại đây."
                            />
                        ) : (
                            <div className="grid grid-cols-1 gap-5">
                                {approvals.map((item) => {
                                    const isSubmitting = submittingId === item.id;

                                    return (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="rounded-[28px] border border-white/80 bg-white/88 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur">
                                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                                <div className="flex min-w-0 items-center gap-4">
                                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-lg font-semibold text-white">
                                                        {item.avatarUrl ? (
                                                            <img
                                                                src={item.avatarUrl}
                                                                alt={item.fullName}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <div
                                                                className="flex h-full w-full items-center justify-center"
                                                                style={{
                                                                    background: hexToGradient(
                                                                        item.colorHex ?? "#FF5F3D"
                                                                    )
                                                                }}>
                                                                {item.fullName.charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="min-w-0">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <h3 className="truncate text-base font-semibold text-slate-800">
                                                                {item.fullName}
                                                            </h3>
                                                            <span className="inline-flex shrink-0 items-center rounded-lg border border-orange-200 bg-white px-3 py-1 text-[12px] font-medium text-orange-600 shadow-sm">
                                                                Member
                                                            </span>
                                                        </div>

                                                        <p className="mt-1 text-sm text-slate-500">
                                                            {item.email}
                                                        </p>

                                                        <p className="mt-2 text-xs text-slate-400">
                                                            Yêu cầu lúc:{" "}
                                                            {new Date(item.requestedAt).toLocaleString(
                                                                locale === "vi" ? "vi-VN" : "en-US"
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex shrink-0 items-center gap-3">
                                                    <Button
                                                        type="button"
                                                        disabled={isSubmitting}
                                                        className="h-11 rounded-2xl bg-[linear-gradient(135deg,#E6492D_0%,#FF5A36_55%,#FF6B45_100%)] px-5 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(230,73,45,0.24)] hover:brightness-110"
                                                        onClick={() => handleApprove(item.id)}>
                                                        Phê duyệt
                                                    </Button>

                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        disabled={isSubmitting}
                                                        className="h-11 rounded-2xl border-red-200 px-5 text-sm font-semibold text-red-600 hover:bg-red-50"
                                                        onClick={() => handleReject(item.id)}>
                                                        Từ chối
                                                    </Button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
