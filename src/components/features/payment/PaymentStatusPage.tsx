"use client";

import { ArrowLeft, CheckCircle, Clock, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { cancelPayment, getPaymentStatus, type PaymentStatusResponse } from "@/api/payment";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface PaymentStatusPageProps {
    paymentId: string;
}

export function PaymentStatusPage({ paymentId }: PaymentStatusPageProps) {
    const locale = useLocale();
    const router = useRouter();
    const { toast } = useToast();
    const [payment, setPayment] = useState<PaymentStatusResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCancelling, setIsCancelling] = useState(false);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const result = await getPaymentStatus(paymentId, locale);
                if (result.status === "success" && result.data) {
                    setPayment(result.data);
                }
            } catch (error) {
                console.error("Failed to fetch payment status:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStatus();

        // Poll every 5 seconds if payment is pending
        const interval = setInterval(() => {
            if (payment?.paymentStatus?.toLowerCase() === "pending") {
                fetchStatus();
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [paymentId, locale, payment?.paymentStatus]);

    const handleCancel = async () => {
        if (!payment) return;

        setIsCancelling(true);
        try {
            const result = await cancelPayment(paymentId, locale);
            if (result.status === "success") {
                toast({
                    description: "Đã hủy thanh toán thành công",
                    variant: "default"
                });
                router.push(`/${locale}/payment/history`);
            } else {
                toast({
                    description: result.message || "Không thể hủy thanh toán",
                    variant: "destructive"
                });
            }
        } catch (_error) {
            toast({
                description: "Có lỗi xảy ra. Vui lòng thử lại!",
                variant: "destructive"
            });
        } finally {
            setIsCancelling(false);
        }
    };

    const getStatusIcon = () => {
        if (!payment) return null;

        switch (payment.paymentStatus?.toLowerCase()) {
            case "completed":
            case "success":
                return <CheckCircle className="h-16 w-16 text-green-500" />;
            case "pending":
                return <Clock className="h-16 w-16 text-yellow-500" />;
            case "cancelled":
            case "failed":
                return <XCircle className="h-16 w-16 text-red-500" />;
            default:
                return <Clock className="h-16 w-16 text-gray-500" />;
        }
    };

    const getStatusText = () => {
        if (!payment) return "";

        switch (payment.paymentStatus?.toLowerCase()) {
            case "completed":
            case "success":
                return "Thanh toán thành công";
            case "pending":
                return "Đang chờ thanh toán";
            case "cancelled":
                return "Đã hủy thanh toán";
            case "failed":
                return "Thanh toán thất bại";
            default:
                return payment.paymentStatus;
        }
    };

    const getStatusColor = () => {
        if (!payment) return "text-gray-600";

        switch (payment.paymentStatus?.toLowerCase()) {
            case "completed":
            case "success":
                return "text-green-600";
            case "pending":
                return "text-yellow-600";
            case "cancelled":
            case "failed":
                return "text-red-600";
            default:
                return "text-gray-600";
        }
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
                            <Link href={`/${locale}/payment/history`}>
                                <Button variant="ghost" size="sm" className="gap-2">
                                    <ArrowLeft className="h-4 w-4" />
                                    Quay lại
                                </Button>
                            </Link>
                            <div>
                                <h1 className="mb-1 font-bold text-2xl text-[#261E33]">Chi tiết thanh toán</h1>
                                <p className="text-[#6F6B99] text-sm">Thông tin chi tiết về giao dịch</p>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-12">
                                <div className="text-center">
                                    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[#FF5F3D]" />
                                    <p className="text-[#6F6B99] text-sm">Đang tải...</p>
                                </div>
                            </div>
                        ) : !payment ? (
                            <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-12">
                                <div className="text-center">
                                    <XCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
                                    <h3 className="mb-2 font-semibold text-[#261E33]">Không tìm thấy thanh toán</h3>
                                    <p className="text-[#6F6B99] text-sm">Mã thanh toán không hợp lệ hoặc đã bị xóa</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Status Card */}
                                <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
                                    <div className="mx-auto mb-4 flex justify-center">{getStatusIcon()}</div>
                                    <h2 className={`mb-2 font-bold text-2xl ${getStatusColor()}`}>{getStatusText()}</h2>
                                    <p className="text-[#6F6B99]">Mã giao dịch: {payment.orderCode}</p>
                                </div>

                                {/* Payment Details */}
                                <div className="rounded-xl border border-gray-200 bg-white p-6">
                                    <h3 className="mb-4 font-semibold text-[#261E33]">Thông tin thanh toán</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between border-gray-100 border-b pb-3">
                                            <span className="text-[#6F6B99] text-sm">Gói đăng ký</span>
                                            <span className="font-medium text-[#261E33]">{payment.planName}</span>
                                        </div>
                                        <div className="flex justify-between border-gray-100 border-b pb-3">
                                            <span className="text-[#6F6B99] text-sm">Số tiền</span>
                                            <span className="font-semibold text-[#261E33] text-lg">
                                                {payment.amount.toLocaleString()} VNĐ
                                            </span>
                                        </div>
                                        <div className="flex justify-between border-gray-100 border-b pb-3">
                                            <span className="text-[#6F6B99] text-sm">Ngày tạo</span>
                                            <span className="text-[#261E33]">
                                                {new Date(payment.createdAt).toLocaleString("vi-VN")}
                                            </span>
                                        </div>
                                        {payment.paidAt && (
                                            <div className="flex justify-between pb-3">
                                                <span className="text-[#6F6B99] text-sm">Ngày thanh toán</span>
                                                <span className="text-[#261E33]">
                                                    {new Date(payment.paidAt).toLocaleString("vi-VN")}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-4">
                                    {payment.paymentStatus?.toLowerCase() === "pending" && (
                                        <Button
                                            onClick={handleCancel}
                                            disabled={isCancelling}
                                            variant="destructive"
                                            className="flex-1">
                                            {isCancelling ? "Đang hủy..." : "Hủy thanh toán"}
                                        </Button>
                                    )}
                                    <Link href={`/${locale}/payment`} className="flex-1">
                                        <Button variant="outline" className="w-full">
                                            Về trang gói đăng ký
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
