"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { PlanCard } from "./PlanCard";
import { PlanLimitsModal } from "./PlanLimitsModal";
import { FeatureComparisonTable } from "./FeatureComparisonTable";
import { BillingHistoryTab } from "./BillingHistoryTab";
import { RevenueStatsTab } from "./RevenueStatsTab";
import { PaymentMethodsTab } from "./PaymentMethodsTab";

type TabType = "plans" | "billing" | "revenue" | "payments";

export function SubscriptionPlansPage() {
    const t = useTranslations("AdminSubscriptions");
    const [activeTab, setActiveTab] = useState<TabType>("plans");
    const [selectedPlan, setSelectedPlan] = useState<"free" | "premium" | null>(null);
    const [isLimitsModalOpen, setIsLimitsModalOpen] = useState(false);

    // Mock data - replace with real API
    const stats = {
        totalSubscribers: 12458,
        freeUsers: 10117,
        premiumUsers: 2341,
        conversionRate: 18.8
    };

    const plans = [
        {
            id: "free" as const,
            name: "Free",
            price: 0,
            description: "For individuals and small teams getting started",
            activeSubscribers: 10117,
            isActive: true,
            limits: {
                maxStudios: 3,
                groupsPerStudio: 5,
                membersPerGroup: 10,
                storagePerGroup: "500MB",
                aiRequestsPerDay: 20
            }
        },
        {
            id: "premium" as const,
            name: "Premium",
            price: 299000,
            description: "For teams that need more power and flexibility",
            activeSubscribers: 2341,
            isActive: true,
            limits: {
                maxStudios: 10,
                groupsPerStudio: 10,
                membersPerGroup: 50,
                storagePerGroup: "1GB",
                aiRequestsPerDay: 100
            }
        }
    ];


    const handleEditLimits = (planId: "free" | "premium") => {
        setSelectedPlan(planId);
        setIsLimitsModalOpen(true);
    };

    const handleEditPrice = (planId: "free" | "premium") => {
        console.log("Edit price for", planId);
    };

    return (
        <div className="min-h-screen bg-[#F8F8F8]">
            <div className="flex min-h-screen">
                <DashboardSidebar />
                <main className="flex-1">
                    <Header userProfile={null} />

                    <div className="px-6 py-6">
                        {/* Page Header */}
                        <div className="mb-6">
                            <h1 className="mb-2 font-bold text-2xl text-[#261E33]">{t("title")}</h1>
                            <p className="text-[#6F6B99] text-sm">{t("subtitle")}</p>
                        </div>

                        {/* Tabs */}
                        <div className="mb-6 flex gap-2 border-b border-gray-200">
                            {[
                                { id: "plans" as const, label: t("tabs.plans") },
                                { id: "billing" as const, label: t("tabs.billing") },
                                { id: "revenue" as const, label: t("tabs.revenue") },
                                { id: "payments" as const, label: t("tabs.payments") }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`border-b-2 px-4 py-3 font-medium text-sm transition-colors ${activeTab === tab.id
                                        ? "border-[#FF5F3D] text-[#FF5F3D]"
                                        : "border-transparent text-[#6F6B99] hover:text-[#261E33]"
                                        }`}>
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        {activeTab === "plans" && (
                            <>
                                {/* Stats Cards */}
                                <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                                        <div className="mb-2 flex items-center justify-between">
                                            <p className="text-[#6F6B99] text-sm">Total Subscribers</p>
                                            <svg className="h-5 w-5 text-[#6F6B99]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                        </div>
                                        <p className="font-bold text-2xl text-[#261E33]">{stats.totalSubscribers.toLocaleString()}</p>
                                    </div>

                                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                                        <div className="mb-2 flex items-center justify-between">
                                            <p className="text-[#6F6B99] text-sm">Free Users</p>
                                            <svg className="h-5 w-5 text-[#6F6B99]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <p className="font-bold text-2xl text-[#261E33]">{stats.freeUsers.toLocaleString()}</p>
                                    </div>

                                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                                        <div className="mb-2 flex items-center justify-between">
                                            <p className="text-[#6F6B99] text-sm">Premium Users</p>
                                            <svg className="h-5 w-5 text-[#FF5F3D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                            </svg>
                                        </div>
                                        <p className="font-bold text-2xl text-[#261E33]">{stats.premiumUsers.toLocaleString()}</p>
                                    </div>

                                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                                        <div className="mb-2 flex items-center justify-between">
                                            <p className="text-[#6F6B99] text-sm">Conversion Rate</p>
                                            <svg className="h-5 w-5 text-[#6F6B99]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                        </div>
                                        <p className="font-bold text-2xl text-[#261E33]">{stats.conversionRate}%</p>
                                    </div>
                                </div>

                                {/* Plan Cards */}
                                <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                                    {plans.map((plan) => (
                                        <PlanCard
                                            key={plan.id}
                                            plan={plan}
                                            onEditLimits={() => handleEditLimits(plan.id)}
                                            onEditPrice={() => handleEditPrice(plan.id)}
                                        />
                                    ))}
                                </div>

                                {/* Feature Comparison */}
                                <FeatureComparisonTable />
                            </>
                        )}

                        {activeTab === "billing" && <BillingHistoryTab />}
                        {activeTab === "revenue" && <RevenueStatsTab />}
                        {activeTab === "payments" && <PaymentMethodsTab />}
                    </div>
                </main>
            </div>

            {/* Modals */}
            {selectedPlan && (
                <PlanLimitsModal
                    isOpen={isLimitsModalOpen}
                    onClose={() => {
                        setIsLimitsModalOpen(false);
                        setSelectedPlan(null);
                    }}
                    plan={plans.find(p => p.id === selectedPlan)!}
                />
            )}
        </div>
    );
}
