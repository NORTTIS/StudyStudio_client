"use client";

import {
    CheckCircleFilled,
    ClockCircleOutlined,
    CrownFilled,
    ExclamationCircleFilled,
    HistoryOutlined,
    RocketOutlined,
    StarFilled,
    ThunderboltOutlined,
    WarningFilled
} from "@ant-design/icons";
import { Badge, Button, ConfigProvider, Modal, message, Skeleton, Spin, Table, Tag, Typography } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { cancelPayment, createPayment, getPaymentHistory, type PaymentHistory, retryPayment } from "@/api/payment";
import { getSubscriptionPlans, type SubscriptionPlan } from "@/api/subscription-plans";
import { getUserProfile } from "@/api/user-profile";
import { sortPlansByBillingCycle } from "@/utils/payment-status";

const { Text, Title, Paragraph } = Typography;

const PRIMARY = "#FF5F3D";
const DARK = "#261E33";
const MUTED = "#6F6B99";
const BORDER = "#E5E5E5";
const BG = "#F8F8F8";

const formatPrice = (vnd: number) => (vnd === 0 ? "Miễn phí" : `${vnd.toLocaleString("vi-VN")}₫`);

/* ══════════════════════════════════════════════════════════════
   STATUS TAG
══════════════════════════════════════════════════════════════ */
function StatusTag({ status }: { status: number }) {
    const map: Record<number, { color: string; label: string; icon: React.ReactNode }> = {
        0: { color: "warning", label: "Chờ xử lý", icon: <ClockCircleOutlined /> },
        1: { color: "success", label: "Đã thanh toán", icon: <CheckCircleFilled /> },
        2: { color: "default", label: "Đã hủy", icon: <ExclamationCircleFilled /> },
        3: { color: "error", label: "Thất bại", icon: <ExclamationCircleFilled /> }
    };
    const info = map[status] ?? { color: "default", label: String(status), icon: null };
    return (
        <Tag color={info.color} icon={info.icon} style={{ borderRadius: 20, fontWeight: 600, fontSize: 11 }}>
            {info.label}
        </Tag>
    );
}

/* ══════════════════════════════════════════════════════════════
   PLAN CARD
══════════════════════════════════════════════════════════════ */
function PlanCard({
    plan,
    isCurrent,
    isDisabled,
    isProcessing,
    onSelect
}: {
    plan: { id: string; name: string; price: number; features: string[]; isFeatured?: boolean };
    isCurrent: boolean;
    isDisabled: boolean;
    isProcessing: boolean;
    onSelect: () => void;
}) {
    const isPremium = plan.isFeatured;

    return (
        <div
            style={{
                flex: 1,
                borderRadius: 20,
                padding: isPremium ? 0 : "2px",
                background: isPremium
                    ? `linear-gradient(135deg, ${PRIMARY} 0%, #FF8C6B 50%, #FFAD6A 100%)`
                    : "transparent",
                boxShadow: isPremium ? "0 8px 32px rgba(255,95,61,0.30)" : "none",
                transition: "transform 0.2s"
            }}
            onMouseEnter={(e) => {
                if (!(isCurrent || isDisabled))
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
            }}>
            <div
                style={{
                    borderRadius: 18,
                    background: isPremium ? DARK : "#fff",
                    border: isPremium ? "none" : `2px solid ${isCurrent ? PRIMARY : BORDER}`,
                    overflow: "hidden",
                    height: "100%"
                }}>
                {/* Card top */}
                <div
                    style={{
                        padding: "28px 28px 20px",
                        background: isPremium ? "linear-gradient(135deg, #2d2242 0%, #3a2a5e 100%)" : BG,
                        borderBottom: `1px solid ${isPremium ? "rgba(255,255,255,0.1)" : BORDER}`
                    }}>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: 16
                        }}>
                        <div
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                background: isPremium ? "linear-gradient(135deg, #FF5F3D 0%, #FF8C6B 100%)" : "#FFF0ED",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: isPremium ? "0 2px 8px rgba(255,95,61,0.4)" : "none"
                            }}>
                            {isPremium ? (
                                <CrownFilled style={{ color: "#fff", fontSize: 20 }} />
                            ) : (
                                <StarFilled style={{ color: PRIMARY, fontSize: 18 }} />
                            )}
                        </div>

                        {isCurrent && (
                            <span
                                style={{
                                    background: PRIMARY,
                                    color: "#fff",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: "3px 12px",
                                    borderRadius: 20,
                                    letterSpacing: "0.04em"
                                }}>
                                ĐANG DÙNG
                            </span>
                        )}
                        {isPremium && !isCurrent && (
                            <span
                                style={{
                                    background: "linear-gradient(90deg, #FF5F3D, #FFAD6A)",
                                    color: "#fff",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: "3px 12px",
                                    borderRadius: 20
                                }}>
                                PHỔ BIẾN
                            </span>
                        )}
                    </div>

                    <Title level={4} style={{ color: isPremium ? "#fff" : DARK, margin: "0 0 4px" }}>
                        {plan.name}
                    </Title>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                        <Text style={{ fontSize: 32, fontWeight: 800, color: isPremium ? "#FF8C6B" : PRIMARY }}>
                            {plan.price === 0 ? "0₫" : `${(plan.price / 1000).toLocaleString()}K`}
                        </Text>
                        {plan.price > 0 && (
                            <Text style={{ fontSize: 13, color: isPremium ? "rgba(255,255,255,0.5)" : MUTED }}>
                                ₫ /tháng
                            </Text>
                        )}
                    </div>
                </div>

                {/* Features */}
                <div style={{ padding: "20px 28px 24px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                        {plan.features.map((f, i) => (
                            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                                <CheckCircleFilled
                                    style={{
                                        color: isPremium ? "#FF8C6B" : PRIMARY,
                                        fontSize: 14,
                                        marginTop: 2,
                                        flexShrink: 0
                                    }}
                                />
                                <Text
                                    style={{
                                        fontSize: 13,
                                        color: isPremium ? "rgba(255,255,255,0.75)" : MUTED,
                                        lineHeight: "1.5"
                                    }}>
                                    {f}
                                </Text>
                            </div>
                        ))}
                    </div>

                    <Button
                        type={isPremium ? "primary" : "default"}
                        block
                        size="large"
                        icon={isPremium ? <ThunderboltOutlined /> : undefined}
                        disabled={isCurrent || isDisabled}
                        loading={isProcessing}
                        onClick={onSelect}
                        style={{
                            borderRadius: 12,
                            fontWeight: 700,
                            height: 46,
                            ...(isPremium && !isCurrent && !isDisabled
                                ? {
                                      background: `linear-gradient(90deg, ${PRIMARY} 0%, #FF8C6B 100%)`,
                                      border: "none",
                                      boxShadow: "0 4px 12px rgba(255,95,61,0.35)"
                                  }
                                : {}),
                            ...(isCurrent || isDisabled
                                ? {
                                      background: isPremium ? "rgba(255,255,255,0.1)" : "#f5f5f5",
                                      color: isPremium ? "rgba(255,255,255,0.4)" : "#aaa",
                                      border: "none"
                                  }
                                : {})
                        }}>
                        {isCurrent
                            ? "Đang sử dụng"
                            : isDisabled
                              ? "Không khả dụng"
                              : isPremium
                                ? "Nâng cấp ngay"
                                : "Chọn gói này"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function BillingPage() {
    const _t = useTranslations("BillingPage");
    const locale = useLocale();
    const [messageApi, contextHolder] = message.useMessage();

    const [currentPlan, setCurrentPlan] = useState("free");
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [isLoadingPlan, setIsLoadingPlan] = useState(true);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [paymentHistoryData, setPaymentHistoryData] = useState<PaymentHistory[]>([]);
    const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
    const [pendingPayments, setPendingPayments] = useState<PaymentHistory[]>([]);
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [paymentToCancel, setPaymentToCancel] = useState<string | null>(null);

    /* Load data */
    useEffect(() => {
        const loadData = async () => {
            try {
                const [plansResult, profileResult, historyResult] = await Promise.all([
                    getSubscriptionPlans(locale),
                    getUserProfile(locale),
                    getPaymentHistory(locale)
                ]);

                if (plansResult.status === "success" && plansResult.data) {
                    setAvailablePlans(sortPlansByBillingCycle(plansResult.data.plans));
                }

                let isPremium = false;
                if (profileResult.status === "success" && profileResult.data) {
                    const userPlan = profileResult.data.subscriptionPlan;
                    isPremium = !!(userPlan && userPlan.billingCycle > 0);
                }

                if (historyResult.status === "success" && historyResult.data) {
                    const histories = historyResult.data.paymentHistories;
                    setPaymentHistoryData(histories);

                    // If profile says free but history has success, re-fetch profile after a short delay
                    // This handles cases where the status is updated but the profile endpoint hasn't synced yet
                    if (!isPremium && histories.some((p: PaymentHistory) => p.status === 1)) {
                        await new Promise((resolve) => setTimeout(resolve, 1500));
                        const retryProfile = await getUserProfile(locale);
                        if (retryProfile.status === "success" && retryProfile.data) {
                            const userPlan = retryProfile.data.subscriptionPlan;
                            isPremium = !!(userPlan && userPlan.billingCycle > 0);
                        }
                    }

                    const pending = histories.filter((p: PaymentHistory) => p.status === 0);
                    setPendingPayments(pending);
                    if (pending.length > 0) {
                        messageApi.warning(`Bạn có ${pending.length} thanh toán đang chờ xử lý.`);
                    }
                } else {
                    setPaymentHistoryData([]);
                    setPendingPayments([]);
                }

                setCurrentPlan(isPremium ? "premium" : "free");
                localStorage.setItem("currentPlan", isPremium ? "premium" : "free");
            } catch {
                setCurrentPlan("free");
                setPaymentHistoryData([]);
                setPendingPayments([]);
            } finally {
                setIsLoadingPlan(false);
                setIsLoadingHistory(false);
            }
        };
        loadData();
    }, [locale, messageApi.warning]);

    const subscriptionPlans = availablePlans.map((plan) => ({
        id: plan.billingCycle === 0 ? "free" : "premium",
        name: plan.planName,
        price: plan.price,
        isFeatured: plan.billingCycle > 0,
        features: [
            `Tối đa ${plan.maxStudios} Không gian quản lý`,
            `Tối đa ${plan.maxGroups} Không gian nhóm`,
            `Tối đa ${plan.maxMembersPerGroup} thành viên/nhóm`,
            `${plan.maxStorageMb} MB lưu trữ/nhóm`,
            `${plan.maxAiRequestsPerDay} lượt AI mỗi ngày`
        ]
    }));

    const billingHistory = paymentHistoryData.map((payment) => {
        const plan = availablePlans.find((p) => p.planId === payment.planId);
        return {
            key: payment.paymentId,
            id: payment.paymentId,
            invoice: `PAY-${payment.paymentId.slice(0, 8).toUpperCase()}`,
            date: payment.paidAt
                ? new Date(payment.paidAt).toLocaleDateString("vi-VN")
                : new Date().toLocaleDateString("vi-VN"),
            description: plan?.planName ?? "Premium Plan",
            amount: plan?.price ?? 299000,
            status: payment.status
        };
    });

    const _handleCancelPaymentClick = (paymentId: string) => {
        setPaymentToCancel(paymentId);
        setCancelModalOpen(true);
    };

    const handleConfirmCancel = async () => {
        if (!paymentToCancel) return;
        try {
            const result = await cancelPayment(paymentToCancel, locale);
            if (result.status === "success") {
                messageApi.success("Đã hủy thanh toán thành công");
                setIsLoadingHistory(true);
                const h = await getPaymentHistory(locale);
                if (h.status === "success" && h.data) {
                    setPaymentHistoryData(h.data.paymentHistories);
                    setPendingPayments(h.data.paymentHistories.filter((p: PaymentHistory) => p.status === 0));
                }
                setIsLoadingHistory(false);
            } else {
                messageApi.error(result.message || "Không thể hủy thanh toán");
            }
        } catch {
            messageApi.error("Có lỗi xảy ra khi hủy thanh toán");
            setIsLoadingHistory(false);
        } finally {
            setCancelModalOpen(false);
            setPaymentToCancel(null);
        }
    };

    const _handleRetryPayment = async (paymentId: string) => {
        setIsProcessing(true);
        try {
            const result = await retryPayment(paymentId, locale);
            if (result.status === "success" && result.data) {
                window.location.href = result.data.paymentUrl;
            } else {
                messageApi.error(result.message || "Không thể lấy lại link thanh toán");
            }
        } catch {
            messageApi.error("Có lỗi xảy ra. Vui lòng thử lại!");
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePlanChange = async (planId: string) => {
        if (planId === "free") {
            messageApi.warning(
                currentPlan === "premium"
                    ? "Không thể chuyển từ Premium về Free. Vui lòng liên hệ hỗ trợ."
                    : "Bạn đã đang sử dụng gói Free"
            );
            return;
        }
        if (planId === "premium" && currentPlan === "premium") {
            messageApi.info("Bạn đã đang sử dụng gói Premium");
            return;
        }

        setIsProcessing(true);
        setSelectedPlan(planId);
        try {
            const premiumPlan = availablePlans.find((p) => p.billingCycle > 0);
            if (!premiumPlan) {
                messageApi.error("Không tìm thấy gói Premium");
                return;
            }
            const result = await createPayment(premiumPlan.planId, locale);
            if (result.status === "success" && result.data) {
                window.location.href = result.data.paymentUrl;
            } else {
                messageApi.error(result.message || "Không thể tạo thanh toán");
            }
        } catch {
            messageApi.error("Có lỗi xảy ra. Vui lòng thử lại!");
        } finally {
            setIsProcessing(false);
            setSelectedPlan(null);
        }
    };

    /* Table columns */
    const columns = [
        {
            title: "Mã giao dịch",
            dataIndex: "invoice",
            key: "invoice",
            render: (v: string) => (
                <Text strong style={{ fontFamily: "monospace", fontSize: 13 }}>
                    {v}
                </Text>
            )
        },
        {
            title: "Ngày",
            dataIndex: "date",
            key: "date",
            render: (v: string) => <Text style={{ color: MUTED, fontSize: 13 }}>{v}</Text>
        },
        {
            title: "Gói",
            dataIndex: "description",
            key: "description",
            render: (v: string) => <Text style={{ fontSize: 13 }}>{v}</Text>
        },
        {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            render: (status: number) => <StatusTag status={status} />
        },
        {
            title: "Số tiền",
            dataIndex: "amount",
            key: "amount",
            align: "right" as const,
            render: (v: number) => (
                <Text strong style={{ color: PRIMARY, fontSize: 14 }}>
                    {formatPrice(v)}
                </Text>
            )
        }
    ];

    /* ── Current plan summary bar ── */
    const activePlan = subscriptionPlans.find((p) => p.id === currentPlan);

    return (
        <ConfigProvider
            theme={{
                token: { colorPrimary: PRIMARY, borderRadius: 10, fontFamily: "inherit", colorBorder: BORDER },
                components: {
                    Table: { headerBg: BG, borderColor: BORDER, headerColor: DARK, headerSortHoverBg: "#f0f0f0" },
                    Button: { fontWeight: 600 }
                }
            }}>
            {contextHolder}

            <div style={{ display: "flex", flexDirection: "column", gap: 28, paddingBottom: 60 }}>
                {/* ══ PENDING BANNER ══ */}
                {pendingPayments.length > 0 && (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 14,
                            padding: "16px 20px",
                            borderRadius: 14,
                            background: "#FFFBE6",
                            border: "1.5px solid #FFE58F"
                        }}>
                        <WarningFilled style={{ color: "#FAAD14", fontSize: 20, flexShrink: 0, marginTop: 2 }} />
                        <div>
                            <Text strong style={{ color: "#7C5B00", display: "block", fontSize: 14 }}>
                                Bạn có {pendingPayments.length} thanh toán chờ xử lý
                            </Text>
                            <Text style={{ color: "#A07800", fontSize: 13 }}>
                                Bạn có thể thử lại hoặc hủy trong lịch sử bên dưới.
                            </Text>
                        </div>
                    </div>
                )}

                {/* ══ ACTIVE PLAN HERO ══ */}
                {isLoadingPlan ? (
                    <Skeleton active paragraph={{ rows: 3 }} />
                ) : (
                    activePlan && (
                        <div
                            style={{
                                borderRadius: 20,
                                background: `linear-gradient(135deg, ${DARK} 0%, #2d2242 60%, #FF5F3D18 100%)`,
                                padding: "28px 32px",
                                display: "flex",
                                alignItems: "center",
                                gap: 24,
                                boxShadow: "0 4px 24px rgba(38,30,51,0.20)"
                            }}>
                            {/* Icon */}
                            <div
                                style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: 16,
                                    background:
                                        currentPlan === "premium"
                                            ? `linear-gradient(135deg, ${PRIMARY} 0%, #FF8C6B 100%)`
                                            : "rgba(255,255,255,0.1)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    boxShadow: currentPlan === "premium" ? "0 4px 16px rgba(255,95,61,0.4)" : "none"
                                }}>
                                {currentPlan === "premium" ? (
                                    <CrownFilled style={{ color: "#fff", fontSize: 30 }} />
                                ) : (
                                    <StarFilled style={{ color: "rgba(255,255,255,0.4)", fontSize: 28 }} />
                                )}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                                    <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>Gói hiện tại</Text>
                                    <span
                                        style={{
                                            background: PRIMARY,
                                            color: "#fff",
                                            fontSize: 10,
                                            fontWeight: 700,
                                            padding: "2px 10px",
                                            borderRadius: 20,
                                            letterSpacing: "0.05em"
                                        }}>
                                        ACTIVE
                                    </span>
                                </div>
                                <Title level={3} style={{ color: "#fff", margin: "0 0 4px" }}>
                                    {activePlan.name}
                                </Title>
                                <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                                    {activePlan.price === 0
                                        ? "Hoàn toàn miễn phí"
                                        : `${formatPrice(activePlan.price)} / tháng`}
                                </Text>
                            </div>

                            {currentPlan === "free" && (
                                <Button
                                    type="primary"
                                    size="large"
                                    icon={<RocketOutlined />}
                                    onClick={() => handlePlanChange("premium")}
                                    loading={isProcessing && selectedPlan === "premium"}
                                    style={{
                                        background: `linear-gradient(90deg, ${PRIMARY} 0%, #FF8C6B 100%)`,
                                        border: "none",
                                        borderRadius: 12,
                                        fontWeight: 700,
                                        height: 46,
                                        flexShrink: 0,
                                        boxShadow: "0 4px 16px rgba(255,95,61,0.4)"
                                    }}>
                                    Nâng cấp Premium
                                </Button>
                            )}
                        </div>
                    )
                )}

                {/* ══ PLAN CARDS ══ */}
                {!isLoadingPlan && (
                    <div>
                        <div style={{ marginBottom: 16 }}>
                            <Title level={5} style={{ margin: 0, color: DARK }}>
                                Các gói dịch vụ
                            </Title>
                            <Text style={{ color: MUTED, fontSize: 13 }}>Chọn gói phù hợp với nhu cầu của bạn</Text>
                        </div>
                        <div style={{ display: "flex", gap: 20 }}>
                            {subscriptionPlans.map((plan) => (
                                <PlanCard
                                    key={plan.id}
                                    plan={plan}
                                    isCurrent={currentPlan === plan.id}
                                    isDisabled={plan.id === "free" && currentPlan === "premium"}
                                    isProcessing={isProcessing && selectedPlan === plan.id}
                                    onSelect={() => handlePlanChange(plan.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* ══ BILLING HISTORY ══ */}
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                        <HistoryOutlined style={{ color: PRIMARY, fontSize: 18 }} />
                        <Title level={5} style={{ margin: 0, color: DARK }}>
                            Lịch sử thanh toán
                        </Title>
                        <Badge count={billingHistory.length} style={{ background: PRIMARY }} />
                    </div>

                    <div
                        style={{
                            borderRadius: 16,
                            border: `1px solid ${BORDER}`,
                            overflow: "hidden",
                            background: "#fff",
                            boxShadow: "0 1px 6px rgba(0,0,0,0.05)"
                        }}>
                        {isLoadingHistory ? (
                            <div style={{ padding: 40, textAlign: "center" }}>
                                <Spin size="large" />
                                <Text style={{ display: "block", color: MUTED, marginTop: 12, fontSize: 13 }}>
                                    Đang tải lịch sử...
                                </Text>
                            </div>
                        ) : (
                            <Table
                                dataSource={billingHistory}
                                columns={columns}
                                pagination={billingHistory.length > 8 ? { pageSize: 8, size: "small" } : false}
                                locale={{
                                    emptyText: (
                                        <div style={{ padding: "40px 0", textAlign: "center" }}>
                                            <HistoryOutlined
                                                style={{
                                                    fontSize: 36,
                                                    color: "#d9d9d9",
                                                    display: "block",
                                                    marginBottom: 8
                                                }}
                                            />
                                            <Text style={{ color: MUTED }}>Chưa có lịch sử thanh toán</Text>
                                        </div>
                                    )
                                }}
                                style={{ fontSize: 13 }}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* ══ CANCEL MODAL ══ */}
            <Modal
                open={cancelModalOpen}
                onCancel={() => {
                    setCancelModalOpen(false);
                    setPaymentToCancel(null);
                }}
                footer={null}
                centered
                width={420}
                style={{ borderRadius: 20 }}>
                <div style={{ textAlign: "center", padding: "8px 0 20px" }}>
                    <div
                        style={{
                            width: 60,
                            height: 60,
                            borderRadius: "50%",
                            background: "#FFF2F0",
                            border: "2px solid #FFCCC7",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 16px"
                        }}>
                        <ExclamationCircleFilled style={{ fontSize: 28, color: "#ff4d4f" }} />
                    </div>
                    <Title level={4} style={{ color: DARK, marginBottom: 8 }}>
                        Xác nhận hủy thanh toán
                    </Title>
                    <Text style={{ color: MUTED, fontSize: 13 }}>
                        Bạn có chắc chắn muốn hủy thanh toán này? Hành động này không thể hoàn tác.
                    </Text>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                    <Button
                        block
                        size="large"
                        style={{ borderRadius: 10 }}
                        onClick={() => {
                            setCancelModalOpen(false);
                            setPaymentToCancel(null);
                        }}>
                        Không, giữ lại
                    </Button>
                    <Button
                        block
                        danger
                        type="primary"
                        size="large"
                        style={{ borderRadius: 10 }}
                        onClick={handleConfirmCancel}>
                        Có, hủy thanh toán
                    </Button>
                </div>
            </Modal>
        </ConfigProvider>
    );
}
