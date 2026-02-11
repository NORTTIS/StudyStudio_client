"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [invoiceEmail, setInvoiceEmail] = useState("");
  const [currentPlan, setCurrentPlan] = useState("free");
  const [_mounted, setMounted] = useState(false);

  // Get current locale to determine currency
  const locale = t("plans.period").includes("tháng") ? "vi" : "en";
  const EXCHANGE_RATE = 26000; // 1 USD = 26,000 VND

  // Helper function to format price based on locale
  const formatPrice = (usdPrice: number) => {
    if (locale === "vi") {
      const vndPrice = usdPrice * EXCHANGE_RATE;
      return `${vndPrice.toLocaleString("vi-VN")}₫`;
    }
    return `$${usdPrice}`;
  };

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem("billingEmail");
      const savedNotifications = localStorage.getItem("billingEmailNotifications");
      const savedPlan = localStorage.getItem("currentPlan");

      if (savedEmail) setInvoiceEmail(savedEmail);
      if (savedNotifications) setEmailNotifications(savedNotifications === "true");
      if (savedPlan) setCurrentPlan(savedPlan);
    }
  }, []);

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
        t("plans.free.feature4")
      ],
      buttonText: t("plans.free.button")
    },
    {
      id: "pro",
      name: t("plans.pro.name"),
      price: 9.99,
      period: t("plans.period"),
      isFeatured: true,
      features: [t("plans.pro.feature1"), t("plans.pro.feature2"), t("plans.pro.feature3"), t("plans.pro.feature4")],
      buttonText: t("plans.pro.button")
    },
    {
      id: "premium",
      name: t("plans.premium.name"),
      price: 29.99,
      period: t("plans.period"),
      features: [
        t("plans.premium.feature1"),
        t("plans.premium.feature2"),
        t("plans.premium.feature3"),
        t("plans.premium.feature4")
      ],
      buttonText: t("plans.premium.button")
    }
  ];

  const billingHistory: BillingItem[] = [
    { id: "1", invoice: "SKU-2024-0105", date: t("history.today"), description: t("history.annual"), amount: 89.99 },
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

  const handleSaveInvoiceInfo = () => {
    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("billingEmail", invoiceEmail);
      localStorage.setItem("billingEmailNotifications", emailNotifications.toString());
    }
    alert(t("invoiceInfo.saveSuccess"));
  };

  const handlePlanChange = (planId: string) => {
    setCurrentPlan(planId);
    if (typeof window !== "undefined") {
      localStorage.setItem("currentPlan", planId);
      const planHistory = JSON.parse(localStorage.getItem("planHistory") || "[]");
      planHistory.push({
        planId,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem("planHistory", JSON.stringify(planHistory));
    }
    alert(`Đã chuyển sang gói ${planId.toUpperCase()}`);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Subscription Plans */}
      <div>
        <h2 className="mb-2 font-bold text-2xl text-[#261E33]">{t("plansTitle")}</h2>
        <p className="mb-8 text-[#6F6B99] text-sm">{t("plansSubtitle")}</p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {subscriptionPlans.map((plan) => (
            <div
              key={plan.id}
              className={`relative overflow-hidden rounded-2xl border-2 transition-all ${
                plan.isFeatured ? "border-[#FF5F3D] bg-white shadow-lg" : "border-[#E5E5E5] bg-white"
              }`}>
              {plan.isFeatured && (
                <div className="absolute top-0 right-0 rounded-bl-lg bg-[#FF5F3D] px-4 py-1 font-bold text-white text-xs">
                  {t("recommended")}
                </div>
              )}
              <div className="p-6">
                <h3 className="mb-2 font-bold text-[#261E33] text-lg">{plan.name}</h3>
                <p className="mb-6 text-[#6F6B99] text-sm">{t("plansDescription")}</p>
                <div className="mb-6">
                  <span className="font-bold text-3xl text-[#261E33]">{formatPrice(plan.price)}</span>
                  <span className="text-[#6F6B99]">{plan.period}</span>
                </div>
                <Button
                  onClick={() => handlePlanChange(plan.id)}
                  disabled={currentPlan === plan.id}
                  className={`mb-6 w-full rounded-lg py-2.5 font-semibold ${
                    plan.isFeatured
                      ? "bg-[#FF5F3D] text-white hover:bg-[#ff4620]"
                      : "bg-[#261E33] text-white hover:bg-[#1a1424]"
                  } disabled:cursor-not-allowed disabled:opacity-50`}>
                  {currentPlan === plan.id ? t("plans.free.button") : plan.buttonText}
                </Button>
                <div className="space-y-3 border-[#E5E5E5] border-t pt-6">
                  {plan.features.map((feature, featureIdx) => (
                    <div key={`${plan.id}-feature-${featureIdx}`} className="flex items-start gap-3">
                      <svg
                        className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#FF5F3D]"
                        fill="currentColor"
                        viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-[#6F6B99] text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <hr className="border-[#E5E5E5]" />

      {/* Billing History */}
      <div>
        <h2 className="mb-2 font-bold text-2xl text-[#261E33]">{t("historyTitle")}</h2>
        <p className="mb-6 text-[#6F6B99] text-sm">{t("historySubtitle")}</p>
        <div className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-[#E5E5E5] border-b">
                <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">{t("table.invoice")}</th>
                <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">{t("table.date")}</th>
                <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">{t("table.description")}</th>
                <th className="px-6 py-4 text-right font-semibold text-[#261E33] text-sm">{t("table.amount")}</th>
              </tr>
            </thead>
            <tbody>
              {billingHistory.map((item) => (
                <tr key={item.id} className="border-[#E5E5E5] border-b transition-colors hover:bg-[#F9F9F9]">
                  <td className="px-6 py-4 font-medium text-[#261E33] text-sm">{item.invoice}</td>
                  <td className="px-6 py-4 text-[#6F6B99] text-sm">{item.date}</td>
                  <td className="px-6 py-4 text-[#6F6B99] text-sm">{item.description}</td>
                  <td className="px-6 py-4 text-right font-semibold text-[#261E33] text-sm">
                    {formatPrice(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <hr className="border-[#E5E5E5]" />

      {/* Invoice Details */}
      <div>
        <h2 className="mb-2 font-bold text-2xl text-[#261E33]">{t("invoiceInfo.title")}</h2>
        <p className="mb-6 text-[#6F6B99] text-sm">{t("invoiceInfo.subtitle")}</p>
        <div className="space-y-6 rounded-2xl border border-[#E5E5E5] bg-white p-8">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="mb-2 block font-semibold text-[#261E33] text-sm">{t("invoiceInfo.email")}</label>
              <Input
                type="email"
                value={invoiceEmail}
                onChange={(e) => setInvoiceEmail(e.target.value)}
                placeholder="dat@studist.edu.vn"
                className="rounded-lg border-[#E5E5E5] bg-white py-2.5 text-[#261E33] placeholder:text-[#9CA3AF]"
              />
            </div>
            <div>
              <label className="mb-2 block font-semibold text-[#261E33] text-sm">
                {t("invoiceInfo.paymentMethod")}
              </label>
              <Input
                type="text"
                placeholder="Visa ****1234"
                readOnly
                className="rounded-lg border-[#E5E5E5] bg-[#F5F5F5] py-2.5 text-[#261E33]"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-[#F5F5F5] p-4">
            <input
              type="checkbox"
              id="emailNotif"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
              className="h-4 w-4 cursor-pointer"
            />
            <label htmlFor="emailNotif" className="cursor-pointer text-[#6F6B99] text-sm">
              {t("invoiceInfo.emailNotification")}
            </label>
          </div>
          <div className="flex justify-end gap-3 border-[#E5E5E5] border-t pt-4">
            <Button className="rounded-lg border border-[#E5E5E5] bg-white px-6 py-2.5 font-semibold text-[#261E33] text-sm hover:bg-[#F5F5F5]">
              {t("invoiceInfo.cancelButton")}
            </Button>
            <Button
              onClick={handleSaveInvoiceInfo}
              className="rounded-lg bg-[#FF5F3D] px-6 py-2.5 font-semibold text-sm text-white hover:bg-[#ff4620]">
              {t("invoiceInfo.saveButton")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
