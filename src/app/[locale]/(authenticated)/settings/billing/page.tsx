"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
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
}

export default function BillingPage() {
    const t = useTranslations("BillingPage");
    const { toast } = useToast();

    const [emailNotifications, setEmailNotifications] = useState(true);

    const [invoiceEmail, setInvoiceEmail] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("");

    const [currentPlan, setCurrentPlan] = useState("free");
    const [isEditingInvoice, setIsEditingInvoice] = useState(false);

    /* ======================= */
    /* CURRENCY */
    /* ======================= */
    const locale = t("plans.period").includes("tháng") ? "vi" : "en";
    const EXCHANGE_RATE = 26000;

    const formatPrice = (usdPrice: number) => {
        if (locale === "vi") {
            return `${(usdPrice * EXCHANGE_RATE).toLocaleString("vi-VN")}₫`;
        }
        return `$${usdPrice}`;
    };

    /* ======================= */
    /* LOAD LOCAL STORAGE */
    /* ======================= */
    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedEmail = localStorage.getItem("billingEmail");
            const savedPayment = localStorage.getItem("billingPaymentMethod");
            const savedNotifications = localStorage.getItem("billingEmailNotifications");
            const savedPlan = localStorage.getItem("currentPlan");

            if (savedEmail) setInvoiceEmail(savedEmail);
            if (savedPayment) setPaymentMethod(savedPayment);

            if (savedNotifications) setEmailNotifications(savedNotifications === "true");

            if (savedPlan) setCurrentPlan(savedPlan);
        }
    }, []);

    /* ======================= */
    /* PLANS */
    /* ======================= */
    const subscriptionPlans: Plan[] = [
        {
            id: "free",
            name: t("plans.free.name"),
            price: 0,
            period: t("plans.period"),
            features: [
                t("plans.free.feature1"),
                t("plans.free.feature2"),
                t("plans.free.feature3"),
                t("plans.free.feature4"),
                t("plans.free.feature5")
            ],
            buttonText: t("plans.free.button")
        },

        {
            id: "premium",
            name: t("plans.premium.name"),
            price: 299000,
            period: t("plans.period"),
            isFeatured: true,
            features: [
                t("plans.premium.feature1"),
                t("plans.premium.feature2"),
                t("plans.premium.feature3"),
                t("plans.premium.feature4"),
                t("plans.premium.feature5")
            ],
            buttonText: t("plans.premium.button")
        }
    ];

    const activePlan = subscriptionPlans.find((p) => p.id === currentPlan);

    /* ======================= */
    /* HISTORY */
    /* ======================= */
    const billingHistory: BillingItem[] = [
        {
            id: "1",
            invoice: "SKU-2024-0105",
            date: t("history.today"),
            description: t("history.annual"),
            amount: 89.99
        },
        {
            id: "2",
            invoice: "SKU-2025-0903",
            date: t("history.lastMonth"),
            description: t("history.annual"),
            amount: 89.99
        },
        {
            id: "3",
            invoice: "SKU-2025-1235",
            date: t("history.twoMonthsAgo"),
            description: t("history.subscription"),
            amount: 89.99
        },
        {
            id: "4",
            invoice: "SKU-2025-1385",
            date: t("history.threeMonthsAgo"),
            description: t("history.subscription"),
            amount: 89.99
        }
    ];

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
    /* CHANGE PLAN */
    /* ======================= */
    const handlePlanChange = (planId: string) => {
        setCurrentPlan(planId);

        if (typeof window !== "undefined") {
            localStorage.setItem("currentPlan", planId);
        }
    };

    return (
        <div className="mx-auto max-w-5xl space-y-8 pb-16">
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
                                <p className="font-bold text-2xl text-[#261E33]">{formatPrice(activePlan.price)}</p>
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
                                <Button variant="outline">{t("currentPlan.changeButton")}</Button>

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
                    {subscriptionPlans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`rounded-2xl border-2 p-6 transition ${
                                currentPlan === plan.id ? "border-[#FF5F3D] shadow-lg" : "border-[#E5E5E5]"
                            }`}>
                            <h3 className="font-bold text-lg">{plan.name}</h3>

                            <p className="mt-3 font-bold text-3xl">{plan.price.toLocaleString("vi-VN")}₫</p>

                            <Button
                                onClick={() => handlePlanChange(plan.id)}
                                disabled={currentPlan === plan.id}
                                className="mt-5 w-full rounded-lg">
                                {currentPlan === plan.id ? t("plans.current") : plan.buttonText}
                            </Button>

                            <div className="mt-6 space-y-3 border-t pt-5">
                                {plan.features.map((feature) => (
                                    <p key={feature} className="flex gap-2 text-[#6F6B99] text-sm">
                                        <span className="font-bold text-[#FF5F3D]">✓</span>
                                        {feature}
                                    </p>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ================= BILLING HISTORY ================= */}
            <div className="rounded-2xl border bg-white p-8">
                <h2 className="mb-4 font-bold text-2xl">{t("historyTitle")}</h2>

                <div className="overflow-hidden rounded-xl border">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-[#FAFAFA] font-semibold text-sm">
                                <th className="px-6 py-4 text-left">{t("table.invoice")}</th>
                                <th className="px-6 py-4 text-left">{t("table.date")}</th>
                                <th className="px-6 py-4 text-left">{t("table.description")}</th>
                                <th className="px-6 py-4 text-right">{t("table.amount")}</th>
                            </tr>
                        </thead>

                        <tbody>
                            {billingHistory.map((item) => (
                                <tr key={item.id} className="border-t text-sm">
                                    <td className="px-6 py-4 font-medium">{item.invoice}</td>
                                    <td className="px-6 py-4 text-[#6F6B99]">{item.date}</td>
                                    <td className="px-6 py-4 text-[#6F6B99]">{item.description}</td>
                                    <td className="px-6 py-4 text-right font-semibold">{formatPrice(item.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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
        </div>
    );
}
