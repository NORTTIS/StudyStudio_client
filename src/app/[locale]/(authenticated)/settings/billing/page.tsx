"use client";

import { CreditCard } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { cancelPayment, createPayment, getPaymentHistory, type PaymentHistory, retryPayment } from "@/api/payment";
import { getSubscriptionPlans, type SubscriptionPlan } from "@/api/subscription-plans";
import { getUserProfile } from "@/api/user-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

interface Plan {
    id: string;
    name: string;
    price: number;
    period: string;
    isFeatured?: boolean;
    features: string[];
    buttonText: string;
}

interface BillingItem {
    id: string;
    invoice: string;
    date: string;
    description: string;
    amount: number;
    status: string;
}

export default function BillingPage() {
    const t = useTranslations("BillingPage");
    const locale = useLocale();
    const { toast } = useToast();

    // No need for hardcoded plan IDs - use billingCycle to determine plan type
    // billingCycle: 0 = Free, billingCycle > 0 = Premium

    const [emailNotifications, setEmailNotifications] = useState(true);
    const [invoiceEmail, setInvoiceEmail] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("");
    const [currentPlan, setCurrentPlan] = useState("free");
    const [isEditingInvoice, setIsEditingInvoice] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [isLoadingPlan, setIsLoadingPlan] = useState(true);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [paymentHistoryData, setPaymentHistoryData] = useState<PaymentHistory[]>([]);
    const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
    const [pendingPayments, setPendingPayments] = useState<PaymentHistory[]>([]);
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [paymentToCancel, setPaymentToCancel] = useState<string | null>(null);

    /* ======================= */
    /* CURRENCY */
    /* ======================= */
    const formatPrice = (vndPrice: number) => {
        return `${vndPrice.toLocaleString("vi-VN")}₫`;
    };

    /* ======================= */
    /* LOAD LOCAL STORAGE & USER PROFILE */
    /* ======================= */
    useEffect(() => {
        const loadData = async () => {
            // Load local storage
            if (typeof window !== "undefined") {
                const savedEmail = localStorage.getItem("billingEmail");
                const savedPayment = localStorage.getItem("billingPaymentMethod");
                const savedNotifications = localStorage.getItem("billingEmailNotifications");

                if (savedEmail) setInvoiceEmail(savedEmail);
                if (savedPayment) setPaymentMethod(savedPayment);
                if (savedNotifications) setEmailNotifications(savedNotifications === "true");
            }

            // Gọi tất cả API song song để tăng tốc độ
            try {
                const [plansResult, profileResult, historyResult] = await Promise.all([
                    getSubscriptionPlans(locale),
                    getUserProfile(locale),
                    getPaymentHistory(locale)
                ]);

                // Process available plans
                if (plansResult.status === "success" && plansResult.data) {
                    setAvailablePlans(plansResult.data.plans);
                    console.log("Available plans:", plansResult.data.plans);
                }

                // Process user profile and current plan
                if (profileResult.status === "success" && profileResult.data) {
                    const userPlan = profileResult.data.subscriptionPlan;
                    console.log("User plan from API:", userPlan);

                    // Check user's current plan using billingCycle
                    if (userPlan && userPlan.billingCycle > 0) {
                        // billingCycle > 0 means Premium
                        setCurrentPlan("premium");
                        console.log("Setting current plan to: premium");
                        if (typeof window !== "undefined") {
                            localStorage.setItem("currentPlan", "premium");
                        }
                    } else {
                        // billingCycle = 0 means Free
                        setCurrentPlan("free");
                        console.log("Setting current plan to: free");
                        if (typeof window !== "undefined") {
                            localStorage.setItem("currentPlan", "free");
                        }
                    }
                } else {
                    console.error("Failed to get user profile:", profileResult.message);
                    setCurrentPlan("free"); // Default to free
                }

                // Process payment history
                if (historyResult.status === "success" && historyResult.data) {
                    setPaymentHistoryData(historyResult.data.paymentHistories);

                    // Check for pending payments
                    const pending = historyResult.data.paymentHistories.filter(
                        (payment: PaymentHistory) => payment.status === "PENDING"
                    );
                    setPendingPayments(pending);

                    // Show notification if there are pending payments
                    if (pending.length > 0) {
                        toast({
                            description: `Bạn có ${pending.length} thanh toán đang chờ xử lý. Bạn có thể hủy nếu không muốn tiếp tục.`,
                            variant: "default"
                        });
                    }
                } else {
                    console.error("Failed to get payment history:", historyResult.message);
                    setPaymentHistoryData([]); // Set empty array on error
                    setPendingPayments([]);
                }

                // Set loading states
                setIsLoadingHistory(false);
            } catch (error) {
                console.error("Failed to fetch data:", error);
                // Default to free on error
                setCurrentPlan("free");
                setPaymentHistoryData([]);
                setPendingPayments([]);
                setIsLoadingHistory(false);
            } finally {
                setIsLoadingPlan(false);
            }
        };

        loadData();
    }, [locale, toast]);

    /* ======================= */
    /* PLANS - Use data from API */
    /* ======================= */
    const subscriptionPlans: Plan[] = availablePlans.map((plan) => ({
        id: plan.billingCycle === 0 ? "free" : "premium", // Use simple identifier
        name: plan.planName,
        price: plan.price,
        period: t("plans.period"),
        isFeatured: plan.billingCycle > 0, // Premium is featured
        features: [
            `Tối đa ${plan.maxStudios} Không gian quản lý riêng biệt`,
            `Tối đa ${plan.maxGroups} Không gian nhóm`,
            `Tối đa ${plan.maxMembersPerGroup} thành viên ở mỗi Không gian nhóm`,
            `${plan.maxStorageMb} MB lưu trữ tài liệu cho mỗi Không gian nhóm`,
            `${plan.maxAiRequestsPerDay} lượt yêu cầu AI mỗi ngày`
        ],
        buttonText: plan.billingCycle === 0 ? t("plans.free.button") : t("plans.premium.button")
    }));

    const activePlan = subscriptionPlans.find((p) => {
        // Compare using plan type (free/premium)
        return p.id === currentPlan;
    });

    /* ======================= */
    /* HISTORY - Use real payment history */
    /* ======================= */
    const billingHistory: BillingItem[] = paymentHistoryData.map((payment: PaymentHistory) => {
        // Find plan name from available plans
        const plan = availablePlans.find((p) => p.planId === payment.planId);
        const planName = plan ? plan.planName : "Premium Plan"; // Fallback to Premium Plan

        return {
            id: payment.paymentId,
            invoice: `PAY-${payment.paymentId.slice(0, 8).toUpperCase()}`,
            date: payment.paidAt
                ? new Date(payment.paidAt).toLocaleDateString("vi-VN")
                : new Date().toLocaleDateString("vi-VN"), // Use current date for pending
            description: planName, // Use plan name instead of UUID
            amount: plan ? plan.price : 299000, // Use real price from plan
            status: payment.status // Add status field
        };
    });

    /* ======================= */
    /* SAVE INVOICE INFO */
    /* ======================= */
    const handleSaveInvoiceInfo = () => {
        if (typeof window !== "undefined") {
            localStorage.setItem("billingEmail", invoiceEmail);
            localStorage.setItem("billingPaymentMethod", paymentMethod);
            localStorage.setItem("billingEmailNotifications", emailNotifications.toString());
        }

        toast({
            variant: "success",
            description: t("invoiceInfo.saveSuccess")
        });
    };

    /* ======================= */
    /* CANCEL PAYMENT */
    /* ======================= */
    const handleCancelPaymentClick = (paymentId: string) => {
        setPaymentToCancel(paymentId);
        setCancelModalOpen(true);
    };

    const handleConfirmCancel = async () => {
        if (!paymentToCancel) return;

        try {
            const result = await cancelPayment(paymentToCancel, locale);

            if (result.status === "success") {
                toast({
                    description: "Đã hủy thanh toán thành công",
                    variant: "default"
                });

                // Refresh payment history only (faster than full reload)
                setIsLoadingHistory(true);
                const historyResult = await getPaymentHistory(locale);
                if (historyResult.status === "success" && historyResult.data) {
                    setPaymentHistoryData(historyResult.data.paymentHistories);

                    // Update pending payments
                    const pending = historyResult.data.paymentHistories.filter(
                        (payment: PaymentHistory) => payment.status === "PENDING"
                    );
                    setPendingPayments(pending);
                }
                setIsLoadingHistory(false);
            } else {
                toast({
                    description: result.message || "Không thể hủy thanh toán",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Cancel payment error:", error);
            toast({
                description: "Có lỗi xảy ra khi hủy thanh toán",
                variant: "destructive"
            });
            setIsLoadingHistory(false);
        } finally {
            setCancelModalOpen(false);
            setPaymentToCancel(null);
        }
    };

    const handleCancelModal = () => {
        setCancelModalOpen(false);
        setPaymentToCancel(null);
    };

    /* ======================= */
    /* RETRY PAYMENT */
    /* ======================= */
    const handleRetryPayment = async (paymentId: string) => {
        setIsProcessing(true);

        try {
            console.log("Retrying existing payment:", paymentId);

            // Use existing payment ID to get payment URL
            const result = await retryPayment(paymentId, locale);
            console.log("Retry payment result:", result);

            if (result.status === "success" && result.data) {
                // Redirect to payment URL
                window.location.href = result.data.paymentUrl;
            } else {
                toast({
                    description: result.message || "Không thể lấy lại link thanh toán",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Retry payment error:", error);
            toast({
                description: "Có lỗi xảy ra. Vui lòng thử lại!",
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    /* ======================= */
    /* CHANGE PLAN & PAYMENT */
    /* ======================= */
    const handlePlanChange = async (planId: string) => {
        console.log("handlePlanChange called with planId:", planId);
        console.log("currentPlan:", currentPlan);

        // Check if it's free plan
        if (planId === "free") {
            // Don't allow downgrade to free if already on free
            if (currentPlan === "free") {
                toast({
                    description: "Bạn đã đang sử dụng gói Free",
                    variant: "default"
                });
                return;
            }

            setCurrentPlan("free");
            if (typeof window !== "undefined") {
                localStorage.setItem("currentPlan", "free");
            }
            toast({
                description: "Đã chuyển về gói Free",
                variant: "default"
            });
            return;
        }

        // Check if already on premium
        if (planId === "premium" && currentPlan === "premium") {
            toast({
                description: "Bạn đã đang sử dụng gói Premium",
                variant: "default"
            });
            return;
        }

        // Nếu chọn gói Premium, tiến hành thanh toán
        console.log("Creating payment for Premium plan");
        setIsProcessing(true);
        setSelectedPlan(planId);

        try {
            // Find Premium plan from available plans (billingCycle > 0)
            const premiumPlan = availablePlans.find((plan) => plan.billingCycle > 0);

            if (!premiumPlan) {
                toast({
                    description: "Không tìm thấy gói Premium",
                    variant: "destructive"
                });
                return;
            }

            console.log("Using Premium planId for payment:", premiumPlan.planId);

            const result = await createPayment(premiumPlan.planId, locale);
            console.log("Payment result:", result);

            if (result.status === "success" && result.data) {
                // Redirect to payment URL
                window.location.href = result.data.paymentUrl;
            } else {
                toast({
                    description: result.message || "Không thể tạo thanh toán",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Payment error:", error);
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
        <div className="mx-auto max-w-5xl space-y-8 pb-16">
            {/* Loading State */}
            {isLoadingPlan ? (
                <div className="flex items-center justify-center rounded-2xl border bg-white p-12">
                    <div className="text-center">
                        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[#FF5F3D]" />
                        <p className="text-[#6F6B99] text-sm">Đang tải thông tin gói...</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* ================= PENDING PAYMENTS WARNING ================= */}
                    {pendingPayments.length > 0 && (
                        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path
                                            fillRule="evenodd"
                                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-yellow-800">Thanh toán đang chờ xử lý</h3>
                                    <p className="mt-1 text-sm text-yellow-700">
                                        Bạn có {pendingPayments.length} thanh toán chưa hoàn tất. Nếu bạn đã thoát khỏi
                                        trang thanh toán PayOS mà không hoàn tất, bạn có thể hủy các thanh toán này
                                        trong lịch sử bên dưới.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ================= CURRENT PLAN ================= */}
                    {activePlan && (
                        <div className="rounded-2xl border border-[#FFDFD8] bg-[#FFF7F4] p-8">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="font-semibold text-[#261E33]">{t("currentPlan.title")}</h2>

                                    <p className="mt-1 text-[#6F6B99] text-sm">
                                        {t("currentPlan.subtitle")}{" "}
                                        <span className="font-medium text-[#261E33]">{activePlan.name}</span>.
                                    </p>

                                    <div className="mt-4">
                                        <p className="font-bold text-2xl text-[#261E33]">
                                            {formatPrice(activePlan.price)}
                                        </p>
                                        <p className="text-[#6F6B99] text-sm">{activePlan.period}</p>
                                    </div>

                                    <ul className="mt-4 space-y-2">
                                        {activePlan.features.map((f) => (
                                            <li key={f} className="flex items-center gap-2 text-sm">
                                                <span className="font-bold text-[#FF5F3D]">✓</span>
                                                {f}
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="mt-5 flex gap-3">
                                        {currentPlan === "free" && (
                                            <Button variant="outline" onClick={() => handlePlanChange("premium")}>
                                                {t("currentPlan.changeButton")}
                                            </Button>
                                        )}

                                        {currentPlan !== "free" && (
                                            <Button variant="outline">{t("currentPlan.cancelButton")}</Button>
                                        )}
                                    </div>
                                </div>

                                <span className="rounded-full bg-[#FF5F3D] px-3 py-1 font-semibold text-white text-xs">
                                    {t("currentPlan.activeBadge")}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* ================= PLANS LIST ================= */}
                    <div className="rounded-2xl border bg-white p-8">
                        <h2 className="mb-2 font-bold text-2xl">{t("plansTitle")}</h2>
                        <p className="mb-8 text-[#6F6B99] text-sm">{t("plansSubtitle")}</p>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            {subscriptionPlans.map((plan) => {
                                // Check if this plan is currently active
                                const isCurrentPlan = currentPlan === plan.id;

                                return (
                                    <div
                                        key={plan.id}
                                        className={`rounded-2xl border-2 p-6 transition ${isCurrentPlan
                                                ? "border-[#FF5F3D] bg-gray-50 opacity-75 shadow-lg"
                                                : "border-[#E5E5E5] hover:border-gray-300"
                                            }`}>
                                        <h3 className={`font-bold text-lg ${isCurrentPlan ? "text-gray-600" : ""}`}>
                                            {plan.name}
                                        </h3>

                                        <p
                                            className={`mt-3 font-bold text-3xl ${isCurrentPlan ? "text-gray-600" : ""}`}>
                                            {formatPrice(plan.price)}
                                        </p>

                                        <Button
                                            onClick={() => handlePlanChange(plan.id)}
                                            disabled={isCurrentPlan || isProcessing}
                                            className={`mt-5 w-full gap-2 rounded-lg ${isCurrentPlan
                                                    ? "cursor-not-allowed bg-gray-300 text-gray-600 hover:bg-gray-300"
                                                    : ""
                                                }`}>
                                            {isProcessing && selectedPlan === plan.id ? (
                                                "Đang xử lý..."
                                            ) : isCurrentPlan ? (
                                                t("plans.current")
                                            ) : (
                                                <>
                                                    <CreditCard className="h-4 w-4" />
                                                    {plan.buttonText}
                                                </>
                                            )}
                                        </Button>

                                        <div className="mt-6 space-y-3 border-t pt-5">
                                            {plan.features.map((feature) => (
                                                <p
                                                    key={feature}
                                                    className={`flex gap-2 text-sm ${isCurrentPlan ? "text-gray-500" : "text-[#6F6B99]"
                                                        }`}>
                                                    <span
                                                        className={`font-bold ${isCurrentPlan ? "text-gray-400" : "text-[#FF5F3D]"
                                                            }`}>
                                                        ✓
                                                    </span>
                                                    {feature}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ================= BILLING HISTORY ================= */}
                    <div className="rounded-2xl border bg-white p-8">
                        <h2 className="mb-4 font-bold text-2xl">{t("historyTitle")}</h2>

                        {isLoadingHistory ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#FF5F3D]" />
                                    <p className="text-[#6F6B99] text-sm">Đang tải lịch sử thanh toán...</p>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-xl border">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-[#FAFAFA] font-semibold text-sm">
                                            <th className="px-6 py-4 text-left">{t("table.invoice")}</th>
                                            <th className="px-6 py-4 text-left">{t("table.date")}</th>
                                            <th className="px-6 py-4 text-left">{t("table.description")}</th>
                                            <th className="px-6 py-4 text-left">Trạng thái</th>
                                            <th className="px-6 py-4 text-right">{t("table.amount")}</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {billingHistory.length > 0 ? (
                                            billingHistory.map((item) => (
                                                <tr
                                                    key={item.id}
                                                    className={`border-t text-sm ${item.status === "PENDING"
                                                            ? "cursor-pointer transition-colors hover:bg-blue-50"
                                                            : ""
                                                        }`}
                                                    onClick={() => {
                                                        if (item.status === "PENDING") {
                                                            handleRetryPayment(item.id);
                                                        }
                                                    }}
                                                    title={item.status === "PENDING" ? "Click để thanh toán lại" : ""}>
                                                    <td className="px-6 py-4 font-medium">{item.invoice}</td>
                                                    <td className="px-6 py-4 text-[#6F6B99]">{item.date}</td>
                                                    <td className="px-6 py-4 text-[#6F6B99]">{item.description}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-xs ${item.status === "COMPLETED" ||
                                                                        item.status === "SUCCESS"
                                                                        ? "bg-green-100 text-green-800"
                                                                        : item.status === "PENDING"
                                                                            ? "bg-yellow-100 text-yellow-800"
                                                                            : item.status === "FAILED" ||
                                                                                item.status === "CANCELLED"
                                                                                ? "bg-red-100 text-red-800"
                                                                                : "bg-gray-100 text-gray-800"
                                                                    }`}>
                                                                {item.status === "COMPLETED" ||
                                                                    item.status === "SUCCESS"
                                                                    ? "Thành công"
                                                                    : item.status === "PENDING"
                                                                        ? "Đang xử lý"
                                                                        : item.status === "FAILED"
                                                                            ? "Thất bại"
                                                                            : item.status === "CANCELLED"
                                                                                ? "Đã hủy"
                                                                                : item.status}
                                                            </span>
                                                            {item.status === "PENDING" && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleCancelPaymentClick(item.id)}
                                                                    className="h-6 cursor-pointer px-2 text-red-600 text-xs hover:text-red-700"
                                                                    title="Hủy thanh toán">
                                                                    Hủy
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-semibold">
                                                        {formatPrice(item.amount)}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                                    Chưa có lịch sử thanh toán
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* ================= INVOICE INFO ================= */}
                    <div className="rounded-2xl border bg-white p-8">
                        <h2 className="mb-1 font-semibold text-lg">{t("invoiceInfo.title")}</h2>

                        <p className="mb-6 text-[#6F6B99] text-sm">{t("invoiceInfo.subtitle")}</p>

                        {!isEditingInvoice && (
                            <div className="space-y-5">
                                <div>
                                    <p className="font-medium">{t("invoiceInfo.email")}</p>
                                    <p className="text-[#6F6B99] text-sm">{invoiceEmail}</p>
                                </div>

                                <div>
                                    <p className="font-medium">{t("invoiceInfo.paymentMethod")}</p>
                                    <p className="text-[#6F6B99] text-sm">{paymentMethod}</p>
                                </div>

                                <div className="flex items-center gap-3 rounded-xl bg-[#F5F5F5] px-4 py-4">
                                    <input type="checkbox" checked={emailNotifications} disabled />
                                    <span className="text-[#6F6B99] text-sm">{t("invoiceInfo.emailNotification")}</span>
                                </div>

                                <Button variant="outline" onClick={() => setIsEditingInvoice(true)}>
                                    {t("invoiceInfo.editButton")}
                                </Button>
                            </div>
                        )}

                        {isEditingInvoice && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <div>
                                        <label htmlFor="invoiceEmail" className="font-semibold text-sm">
                                            {t("invoiceInfo.email")}
                                        </label>
                                        <Input
                                            id="invoiceEmail"
                                            value={invoiceEmail}
                                            onChange={(e) => setInvoiceEmail(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="paymentMethod" className="font-semibold text-sm">
                                            {t("invoiceInfo.paymentMethod")}
                                        </label>
                                        <Input
                                            id="paymentMethod"
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 rounded-xl bg-[#F5F5F5] px-4 py-4">
                                    <input
                                        type="checkbox"
                                        checked={emailNotifications}
                                        onChange={(e) => setEmailNotifications(e.target.checked)}
                                    />
                                    <span className="text-[#6F6B99] text-sm">{t("invoiceInfo.emailNotification")}</span>
                                </div>

                                <Button
                                    className="bg-[#FF5F3D] text-white"
                                    onClick={() => {
                                        handleSaveInvoiceInfo();
                                        setIsEditingInvoice(false);
                                    }}>
                                    {t("invoiceInfo.updateButton")}
                                </Button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ================= CANCEL PAYMENT MODAL ================= */}
            {cancelModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <div className="mb-4">
                            <h3 className="font-semibold text-[#261E33] text-lg">Xác nhận hủy thanh toán</h3>
                            <p className="mt-2 text-[#6F6B99] text-sm">
                                Bạn có chắc chắn muốn hủy thanh toán này không? Hành động này không thể hoàn tác.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" onClick={handleCancelModal} className="flex-1">
                                Không, giữ lại
                            </Button>
                            <Button
                                onClick={handleConfirmCancel}
                                className="flex-1 bg-red-600 text-white hover:bg-red-700">
                                Có, hủy thanh toán
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
