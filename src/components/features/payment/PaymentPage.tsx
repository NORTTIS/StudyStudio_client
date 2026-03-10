"use client";

import { Check, CreditCard, History } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { createPayment } from "@/api/payment";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const PLANS = [
    {
        id: "free",
        name: "Free",
        price: 0,
        currency: "VNĐ",
        features: [
            "Tối đa 3 Không gian quản lý",
            "Tối đa 5 Không gian nhóm",
            "Tối đa 10 thành viên/nhóm",
            "500 MB lưu trữ/nhóm",
            "20 yêu cầu AI/ngày"
        ],
        current: true
    },
    {
        id: "premium",
        name: "Premium",
        price: 99000,
        currency: "VNĐ",
        period: "/tháng",
        features: [
            "Tối đa 10 Không gian quản lý",
            "Tối đa 10 Không gian nhóm",
            "Tối đa 50 thành viên/nhóm",
            "1 GB lưu trữ/nhóm",
            "100 yêu cầu AI/ngày"
        ],
        popular: true
    },
    {
        id: "enterprise",
        name: "Enterprise",
        price: 299000,
        currency: "VNĐ",
        period: "/tháng",
        features: [
            "Không giới hạn Không gian quản lý",
            "Không giới hạn Không gian nhóm",
            "Không giới hạn thành viên",
            "10 GB lưu trữ/nhóm",
            "Không giới hạn yêu cầu AI"
        ]
    }
];

export function PaymentPage() {
    const _t = useTranslations("PaymentPage");
    const locale = useLocale();
    const _router = useRouter();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

    const handleUpgrade = async (planId: string) => {
        if (planId === "free") {
            toast({
                description: "Bạn đang sử dụng gói Free",
                variant: "default"
            });
            return;
        }

        setIsProcessing(true);
        setSelectedPlan(planId);

        try {
            const result = await createPayment(planId, locale);

            if (result.status === "success" && result.data) {
                // Redirect to payment URL
                window.location.href = result.data.paymentUrl;
            } else {
                toast({
                    description: result.message || "Không thể tạo thanh toán",
                    variant: "destructive"
                });
            }
        } catch (_error) {
            toast({
                description: "Có lỗi xảy ra. Vui lòng thử lại!",
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
            setSelectedPlan(null);
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
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h1 className="mb-2 font-bold text-2xl text-[#261E33]">Gói đăng ký</h1>
                                <p className="text-[#6F6B99] text-sm">Chọn gói phù hợp với nhu cầu của bạn</p>
                            </div>
                            <Link href={`/${locale}/payment/history`}>
                                <Button variant="outline" className="gap-2">
                                    <History className="h-4 w-4" />
                                    Lịch sử thanh toán
                                </Button>
                            </Link>
                        </div>

                        {/* Plans Grid */}
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {PLANS.map((plan) => (
                                <div
                                    key={plan.id}
                                    className={`relative rounded-xl border bg-white p-6 transition-shadow hover:shadow-lg ${
                                        plan.popular ? "border-[#FF5F3D] shadow-md" : "border-gray-200"
                                    }`}>
                                    {plan.popular && (
                                        <div className="absolute top-0 right-6 -translate-y-1/2">
                                            <span className="rounded-full bg-[#FF5F3D] px-3 py-1 font-medium text-white text-xs">
                                                Phổ biến
                                            </span>
                                        </div>
                                    )}

                                    {plan.current && (
                                        <div className="absolute top-0 right-6 -translate-y-1/2">
                                            <span className="rounded-full bg-green-500 px-3 py-1 font-medium text-white text-xs">
                                                Gói hiện tại
                                            </span>
                                        </div>
                                    )}

                                    <div className="mb-4">
                                        <h3 className="mb-2 font-bold text-[#261E33] text-xl">{plan.name}</h3>
                                        <div className="flex items-baseline gap-1">
                                            <span className="font-bold text-3xl text-[#261E33]">
                                                {plan.price.toLocaleString()}
                                            </span>
                                            <span className="text-[#6F6B99] text-sm">{plan.currency}</span>
                                            {plan.period && (
                                                <span className="text-[#6F6B99] text-sm">{plan.period}</span>
                                            )}
                                        </div>
                                    </div>

                                    <ul className="mb-6 space-y-3">
                                        {plan.features.map((feature, index) => (
                                            <li key={index} className="flex items-start gap-2">
                                                <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                                                <span className="text-[#6F6B99] text-sm">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <Button
                                        onClick={() => handleUpgrade(plan.id)}
                                        disabled={plan.current || isProcessing}
                                        className={`w-full ${
                                            plan.popular
                                                ? "bg-[#FF5F3D] hover:bg-[#FF5F3D]/90"
                                                : "bg-[#261E33] hover:bg-[#261E33]/90"
                                        }`}>
                                        {isProcessing && selectedPlan === plan.id ? (
                                            "Đang xử lý..."
                                        ) : plan.current ? (
                                            "Gói hiện tại"
                                        ) : (
                                            <>
                                                <CreditCard className="mr-2 h-4 w-4" />
                                                Nâng cấp ngay
                                            </>
                                        )}
                                    </Button>
                                </div>
                            ))}
                        </div>

                        {/* Info Section */}
                        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
                            <h3 className="mb-4 font-semibold text-[#261E33]">Thông tin thanh toán</h3>
                            <div className="space-y-2 text-[#6F6B99] text-sm">
                                <p>• Thanh toán an toàn qua cổng thanh toán PayOS</p>
                                <p>• Hỗ trợ thanh toán qua QR Code, chuyển khoản ngân hàng</p>
                                <p>• Gói đăng ký sẽ được kích hoạt ngay sau khi thanh toán thành công</p>
                                <p>• Bạn có thể hủy đăng ký bất cứ lúc nào</p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
