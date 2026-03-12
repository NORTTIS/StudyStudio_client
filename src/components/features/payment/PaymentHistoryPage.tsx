"use client";

import { ArrowLeft, CheckCircle, Clock, XCircle } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { getPaymentHistory, type PaymentHistory } from "@/api/payment";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { getPaymentStatusInfo } from "@/utils/payment-status";

export function PaymentHistoryPage() {
    const t = useTranslations("PaymentHistoryPage");
    const locale = useLocale();
    const [payments, setPayments] = useState<PaymentHistory[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const result = await getPaymentHistory(locale);
                if (result.status === "success" && result.data) {
                    setPayments(result.data.paymentHistories);
                }
            } catch (error) {
                console.error("Failed to fetch payment history:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, [locale]);

    const getStatusIcon = (status: string | number) => {
        const statusInfo = getPaymentStatusInfo(status);

        switch (statusInfo.icon) {
            case "check-circle":
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case "clock":
                return <Clock className="h-5 w-5 text-yellow-500" />;
            case "x-circle":
                return <XCircle className="h-5 w-5 text-red-500" />;
            default:
                return <Clock className="h-5 w-5 text-gray-500" />;
        }
    };

    const getStatusText = (status: string | number) => {
        return getPaymentStatusInfo(status).label;
    };

    const getStatusColor = (status: string | number) => {
        const statusInfo = getPaymentStatusInfo(status);
        return `${statusInfo.color} ${statusInfo.bgColor}`;
    };

    return (
        <div className="min-h-screen bg-[#F8F8F8]">
            <div className="flex min-h-screen">
                <DashboardSidebar />
                <main className="flex-1">
                    <Header userProfile={null} />

                    <div className="px-6 py-6">
                        {/* Header */}
                        <div className="mb-6 flex items-center gap-4">
                            <Link href={`/${locale}/payment`}>
                                <Button variant="ghost" size="sm" className="gap-2">
                                    <ArrowLeft className="h-4 w-4" />
                                    {t("backButton")}
                                </Button>
                            </Link>
                            <div>
                                <h1 className="mb-1 font-bold text-2xl text-[#261E33]">{t("title")}</h1>
                                <p className="text-[#6F6B99] text-sm">{t("subtitle")}</p>
                            </div>
                        </div>

                        {/* Payment History Table */}
                        <div className="rounded-xl border border-gray-200 bg-white">
                            {isLoading ? (
                                <div className="flex items-center justify-center p-12">
                                    <div className="text-center">
                                        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[#FF5F3D]" />
                                        <p className="text-[#6F6B99] text-sm">Đang tải...</p>
                                    </div>
                                </div>
                            ) : payments.length === 0 ? (
                                <div className="flex items-center justify-center p-12">
                                    <div className="text-center">
                                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                                            <Clock className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <h3 className="mb-2 font-semibold text-[#261E33]">Chưa có giao dịch nào</h3>
                                        <p className="mb-4 text-[#6F6B99] text-sm">
                                            Bạn chưa thực hiện giao dịch thanh toán nào
                                        </p>
                                        <Link href={`/${locale}/payment`}>
                                            <Button className="bg-[#FF5F3D] hover:bg-[#FF5F3D]/90">
                                                Nâng cấp gói ngay
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="border-gray-200 border-b bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left font-semibold text-[#261E33] text-sm">
                                                    Mã thanh toán
                                                </th>
                                                <th className="px-6 py-3 text-left font-semibold text-[#261E33] text-sm">
                                                    Gói đăng ký
                                                </th>
                                                <th className="px-6 py-3 text-left font-semibold text-[#261E33] text-sm">
                                                    Trạng thái
                                                </th>
                                                <th className="px-6 py-3 text-left font-semibold text-[#261E33] text-sm">
                                                    Ngày thanh toán
                                                </th>
                                                <th className="px-6 py-3 text-left font-semibold text-[#261E33] text-sm">
                                                    Hành động
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {payments.map((payment) => (
                                                <tr key={payment.paymentId} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4">
                                                        <span className="font-mono text-[#261E33] text-sm">
                                                            {payment.paymentId.slice(0, 8)}...
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-[#261E33] text-sm">{payment.planId}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            {getStatusIcon(payment.status)}
                                                            <span
                                                                className={`rounded-full px-2 py-1 font-medium text-xs ${getStatusColor(
                                                                    payment.status
                                                                )}`}>
                                                                {getStatusText(payment.status)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-[#6F6B99] text-sm">
                                                            {payment.paidAt
                                                                ? new Date(payment.paidAt).toLocaleDateString("vi-VN")
                                                                : "—"}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <Link href={`/${locale}/payment/status/${payment.paymentId}`}>
                                                            <Button variant="ghost" size="sm">
                                                                Xem chi tiết
                                                            </Button>
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
