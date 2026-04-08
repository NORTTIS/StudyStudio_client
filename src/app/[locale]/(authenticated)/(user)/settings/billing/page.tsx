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
import { useEffect, useRef, useState } from "react";
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

/* ══════════════════════════════════════════════════════════════
   STATUS TAG
══════════════════════════════════════════════════════════════ */
function StatusTag({ status }: { status: number }) {
    const t = useTranslations("BillingPage");
    const map: Record<number, { color: string; label: string; icon: React.ReactNode }> = {
        0: { color: "warning", label: t("status.pending"), icon: <ClockCircleOutlined /> },
        1: { color: "success", label: t("status.paid"), icon: <CheckCircleFilled /> },
        2: { color: "default", label: t("status.cancelled"), icon: <ExclamationCircleFilled /> },
        3: { color: "error", label: t("status.failed"), icon: <ExclamationCircleFilled /> }
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
    const t = useTranslations("BillingPage");
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
                                {t("planCard.inUseBadge")}
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
                                {t("planCard.popularBadge")}
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
                                {t("planCard.perMonth")}
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
                                                        ? t("planCard.actions.current")
                            : isDisabled
                                                            ? t("planCard.actions.unavailable")
                              : isPremium
                                                                ? t("planCard.actions.upgradeNow")
                                                                : t("planCard.actions.selectPlan")}
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
    const t = useTranslations("BillingPage");
    const locale = useLocale();
    const [messageApi, contextHolder] = message.useMessage();
    const messageApiRef = useRef(messageApi);
    messageApiRef.current = messageApi;

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

    const formatPrice = (vnd: number) => {
        if (vnd === 0) return t("price.free");
        const localeCode = locale === "vi" ? "vi-VN" : "en-US";
        return `${vnd.toLocaleString(localeCode)}₫`;
    };

    // Check for success query param
    const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const isReturningFromSuccess = searchParams?.get("success") === "true";

    /* Load data */
    useEffect(() => {
        const loadData = async () => {
            try {
                // If returning from success, wait a bit for backend to process
                if (isReturningFromSuccess) {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }

                const plansResult = await getSubscriptionPlans(locale);
                let profileResult = await getUserProfile(locale);
                let historyResult = await getPaymentHistory(locale);

                if (plansResult.status === "success" && plansResult.data) {
                    setAvailablePlans(sortPlansByBillingCycle(plansResult.data.plans));
                }

                let isPremium = false;
                if (profileResult.status === "success" && profileResult.data) {
                    const userPlan = profileResult.data.subscriptionPlan;
                    isPremium = !!(userPlan && userPlan.billingCycle > 0);
                }

                // Initial history processing
                let histories =
                    historyResult.status === "success" && historyResult.data ? historyResult.data.paymentHistories : [];

                // AGGRESSIVE RETRY LOGIC for eventual consistency
                const needsRetry =
                    isReturningFromSuccess && !(isPremium && histories.some((p: PaymentHistory) => p.status === 1));

                if (needsRetry) {
                    setIsLoadingPlan(true); // Keep loading spinner
                    setIsLoadingHistory(true);

                    // Retry up to 3 times
                    for (let attempt = 1; attempt <= 3; attempt++) {
                        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt)); // wait 2s, 4s, 6s

                        profileResult = await getUserProfile(locale);
                        historyResult = await getPaymentHistory(locale);

                        if (profileResult.status === "success" && profileResult.data) {
                            const userPlan = profileResult.data.subscriptionPlan;
                            isPremium = !!(userPlan && userPlan.billingCycle > 0);
                        }

                        if (historyResult.status === "success" && historyResult.data) {
                            histories = historyResult.data.paymentHistories;
                        }

                        // If it became premium or success payment found, stop retrying
                        if (isPremium || histories.some((p: PaymentHistory) => p.status === 1)) {
                            if (isReturningFromSuccess) {
                                messageApiRef.current?.success(t("messages.paymentSynced"));
                            }
                            break;
                        }
                    }
                }

                // Final state update
                setPaymentHistoryData(histories);
                setCurrentPlan(isPremium ? "premium" : "free");
                localStorage.setItem("currentPlan", isPremium ? "premium" : "free");

                const pending = histories.filter((p: PaymentHistory) => p.status === 0);
                setPendingPayments(pending);
            } catch (err) {
                console.error("Load billing data failed:", err);
                setCurrentPlan("free");
                setPaymentHistoryData([]);
                setPendingPayments([]);
            } finally {
                setIsLoadingPlan(false);
                setIsLoadingHistory(false);
            }
        };
        loadData();
    }, [locale, isReturningFromSuccess]);

    const subscriptionPlans = availablePlans.map((plan) => ({
        id: plan.billingCycle === 0 ? "free" : "premium",
        name: plan.planName,
        price: plan.price,
        isFeatured: plan.billingCycle > 0,
        features: [
            t("features.maxStudios", { count: plan.maxStudios }),
            t("features.maxGroups", { count: plan.maxGroups }),
            t("features.maxMembersPerGroup", { count: plan.maxMembersPerGroup }),
            t("features.maxStorageMb", { count: plan.maxStorageMb }),
            t("features.maxAiRequestsPerDay", { count: plan.maxAiRequestsPerDay })
        ]
    }));

    const billingHistory = paymentHistoryData.map((payment) => {
        const plan = availablePlans.find((p) => p.planId === payment.planId);
        return {
            key: payment.paymentId,
            id: payment.paymentId,
            invoice: `PAY-${payment.paymentId.slice(0, 8).toUpperCase()}`,
            date: payment.paidAt
                ? new Date(payment.paidAt).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")
                : new Date().toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US"),
            description: plan?.planName ?? t("history.defaultPlanName"),
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
                messageApi.success(t("messages.cancelSuccess"));
                setIsLoadingHistory(true);
                const h = await getPaymentHistory(locale);
                if (h.status === "success" && h.data) {
                    setPaymentHistoryData(h.data.paymentHistories);
                    setPendingPayments(h.data.paymentHistories.filter((p: PaymentHistory) => p.status === 0));
                }
                setIsLoadingHistory(false);
            } else {
                messageApi.error(result.message || t("messages.cancelFailed"));
            }
        } catch {
            messageApi.error(t("messages.cancelError"));
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
                messageApi.error(result.message || t("messages.retryPaymentLinkFailed"));
            }
        } catch {
            messageApi.error(t("messages.genericError"));
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePlanChange = async (planId: string) => {
        if (planId === "free") {
            messageApi.warning(
                currentPlan === "premium"
                    ? t("messages.cannotDowngradePremium")
                    : t("messages.alreadyOnFree")
            );
            return;
        }
        if (planId === "premium" && currentPlan === "premium") {
            messageApi.info(t("messages.alreadyOnPremium"));
            return;
        }

        setIsProcessing(true);
        setSelectedPlan(planId);
        try {
            const premiumPlan = availablePlans.find((p) => p.billingCycle > 0);
            if (!premiumPlan) {
                messageApi.error(t("messages.premiumPlanNotFound"));
                return;
            }
            const result = await createPayment(premiumPlan.planId, locale);
            if (result.status === "success" && result.data) {
                window.location.href = result.data.paymentUrl;
            } else {
                messageApi.error(result.message || t("messages.createPaymentFailed"));
            }
        } catch {
            messageApi.error(t("messages.genericError"));
        } finally {
            setIsProcessing(false);
            setSelectedPlan(null);
        }
    };

    /* Table columns */
    const columns = [
        {
            title: t("table.transactionCode"),
            dataIndex: "invoice",
            key: "invoice",
            render: (v: string) => (
                <Text strong style={{ fontFamily: "monospace", fontSize: 13 }}>
                    {v}
                </Text>
            )
        },
        {
            title: t("table.date"),
            dataIndex: "date",
            key: "date",
            render: (v: string) => <Text style={{ color: MUTED, fontSize: 13 }}>{v}</Text>
        },
        {
            title: t("table.plan"),
            dataIndex: "description",
            key: "description",
            render: (v: string) => <Text style={{ fontSize: 13 }}>{v}</Text>
        },
        {
            title: t("table.status"),
            dataIndex: "status",
            key: "status",
            render: (status: number) => <StatusTag status={status} />
        },
        {
            title: t("table.amount"),
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
                                    <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                                        {t("currentPlan.heroLabel")}
                                    </Text>
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
                                        {t("currentPlan.activeBadge")}
                                    </span>
                                </div>
                                <Title level={3} style={{ color: "#fff", margin: "0 0 4px" }}>
                                    {activePlan.name}
                                </Title>
                                <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                                    {activePlan.price === 0
                                        ? t("currentPlan.freeDescription")
                                        : t("currentPlan.paidDescription", { price: formatPrice(activePlan.price) })}
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
                                    {t("currentPlan.changeButton")}
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
                                {t("plansTitle")}
                            </Title>
                            <Text style={{ color: MUTED, fontSize: 13 }}>{t("plansSubtitle")}</Text>
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
                            {t("historyTitle")}
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
                                    {t("history.loading")}
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
                                            <Text style={{ color: MUTED }}>{t("history.empty")}</Text>
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
                        {t("cancelModal.title")}
                    </Title>
                    <Text style={{ color: MUTED, fontSize: 13 }}>
                        {t("cancelModal.description")}
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
                        {t("cancelModal.keep")}
                    </Button>
                    <Button
                        block
                        danger
                        type="primary"
                        size="large"
                        style={{ borderRadius: 10 }}
                        onClick={handleConfirmCancel}>
                        {t("cancelModal.confirm")}
                    </Button>
                </div>
            </Modal>
        </ConfigProvider>
    );
}
