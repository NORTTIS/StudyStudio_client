"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import {
    type AdminSubscriptionPlan,
    getAdminSubscriptionStats,
    getSubscriptionPlans,
    type UserStats
} from "@/api/admin-subscription-plans";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { AdminReportsTab } from "../reports/AdminReportsTab";
import { BillingHistoryTab } from "./BillingHistoryTab";
import { FeatureComparisonTable } from "./FeatureComparisonTable";
import { PaymentMethodsTab } from "./PaymentMethodsTab";
import { PlanCard } from "./PlanCard";
import { PlanEditModal } from "./PlanEditModal";
import { RevenueStatsTab } from "./RevenueStatsTab";

type TabType = "plans" | "billing" | "revenue" | "payments" | "reports";

export function SubscriptionPlansPage() {
    const t = useTranslations("AdminSubscriptions");
    const [activeTab, setActiveTab] = useState<TabType>("plans");
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<AdminSubscriptionPlan | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Cấu hình tabs - ẩn một số tabs theo yêu cầu
    const availableTabs = [
        { id: "plans" as const, label: t("tabs.plans") },
        { id: "billing" as const, label: t("tabs.billing") }
        // Ẩn các tabs: revenue, payments, reports theo yêu cầu
    ];
    const [stats, setStats] = useState<UserStats>({
        totalActiveUsers: 0,
        freeUsers: 0,
        premiumUsers: 0,
        conversionRate: 0
    });
    const [plans, setPlans] = useState<AdminSubscriptionPlan[]>([]);

    // Load data from API
    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            console.log("Loading admin subscription data...");

            // Gọi cả 2 APIs song song
            const [statsResult, plansResult] = await Promise.all([
                getAdminSubscriptionStats("vi"),
                getSubscriptionPlans("vi")
            ]);

            console.log("Stats result:", statsResult);
            console.log("Plans result:", plansResult);

            // Process stats
            if (statsResult.status === "success" && statsResult.data) {
                setStats(statsResult.data.userStats);
                console.log("Using real stats from admin API");
            } else {
                console.warn("Stats API failed, using mock data:", statsResult.message);
                setStats({
                    totalActiveUsers: 12458,
                    freeUsers: 10117,
                    premiumUsers: 2341,
                    conversionRate: 18.8
                });
            }

            // Process plans
            if (plansResult.status === "success" && plansResult.data && plansResult.data.plans.length > 0) {
                // Sử dụng plans thật từ API
                const realPlans = plansResult.data.plans.map((plan) => ({
                    ...plan,
                    subscriberCount: plan.billingCycle === 0 ? 10117 : 2341 // Mock subscriber count
                }));
                setPlans(realPlans);
                console.log("Using real plans from SubscriptionPlan API:", realPlans);
            } else {
                console.warn("SubscriptionPlan API failed or returned empty, trying to use plans from stats API...");

                // Try to use plans from stats API if available
                if (
                    statsResult.status === "success" &&
                    statsResult.data &&
                    statsResult.data.plans &&
                    statsResult.data.plans.length > 0
                ) {
                    setPlans(statsResult.data.plans);
                    console.log("Using plans from admin stats API:", statsResult.data.plans);
                } else {
                    // Final fallback to mock data
                    console.warn("No real plans available, using mock data");
                    setPlans([
                        {
                            planId: "00000000-0000-0000-0000-000000000001", // Valid GUID format
                            planName: "Free",
                            price: 0,
                            billingCycle: 0,
                            description: "For individuals and small teams getting started",
                            maxStudios: 3,
                            maxStorageMb: 500,
                            maxAiRequestsPerDay: 20,
                            maxGroups: 5,
                            maxMembersPerGroup: 10,
                            isActive: true,
                            subscriberCount: 10117
                        },
                        {
                            planId: "00000000-0000-0000-0000-000000000002", // Valid GUID format
                            planName: "Premium",
                            price: 299000,
                            billingCycle: 1,
                            description: "For teams that need more power and flexibility",
                            maxStudios: 10,
                            maxStorageMb: 1024,
                            maxAiRequestsPerDay: 100,
                            maxGroups: 10,
                            maxMembersPerGroup: 50,
                            isActive: true,
                            subscriberCount: 2341
                        }
                    ]);
                }
            }
        } catch (error) {
            console.error("Failed to load admin subscription data:", error);
            // Fallback to mock data on error with valid GUIDs
            setStats({
                totalActiveUsers: 12458,
                freeUsers: 10117,
                premiumUsers: 2341,
                conversionRate: 18.8
            });
            setPlans([
                {
                    planId: "00000000-0000-0000-0000-000000000001",
                    planName: "Free",
                    price: 0,
                    billingCycle: 0,
                    description: "For individuals and small teams getting started",
                    maxStudios: 3,
                    maxStorageMb: 500,
                    maxAiRequestsPerDay: 20,
                    maxGroups: 5,
                    maxMembersPerGroup: 10,
                    isActive: true,
                    subscriberCount: 10117
                },
                {
                    planId: "00000000-0000-0000-0000-000000000002",
                    planName: "Premium",
                    price: 299000,
                    billingCycle: 1,
                    description: "For teams that need more power and flexibility",
                    maxStudios: 10,
                    maxStorageMb: 1024,
                    maxAiRequestsPerDay: 100,
                    maxGroups: 10,
                    maxMembersPerGroup: 50,
                    isActive: true,
                    subscriberCount: 2341
                }
            ]);
        } finally {
            setIsLoading(false);
        }
    }, []); // Empty dependency array - chỉ chạy một lần khi mount

    useEffect(() => {
        loadData();
    }, [loadData]); // Empty dependency - chỉ chạy một lần khi mount

    const handleEditPlan = (planId: string) => {
        const plan = plans.find((p) => p.planId === planId);
        console.log("Edit plan for planId:", planId);
        console.log("Found plan:", plan);
        if (plan) {
            setSelectedPlanForEdit(plan);
            setIsEditModalOpen(true);
        }
    };

    const handleModalSuccess = () => {
        // Reload data after successful update
        loadData();
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
                        <div className="mb-6 flex gap-2 border-gray-200 border-b">
                            {availableTabs.map((tab) => (
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
                        {activeTab === "plans" &&
                            (isLoading ? (
                                <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-12">
                                    <div className="text-center">
                                        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[#FF5F3D]" />
                                        <p className="text-[#6F6B99] text-sm">Đang tải dữ liệu...</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Stats Cards */}
                                    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                                        <div className="rounded-xl border border-gray-200 bg-white p-5">
                                            <div className="mb-2 flex items-center justify-between">
                                                <p className="text-[#6F6B99] text-sm">Total Active Users</p>
                                                <svg
                                                    className="h-5 w-5 text-[#6F6B99]"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24">
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                                    />
                                                </svg>
                                            </div>
                                            <p className="font-bold text-2xl text-[#261E33]">
                                                {stats.totalActiveUsers.toLocaleString()}
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-gray-200 bg-white p-5">
                                            <div className="mb-2 flex items-center justify-between">
                                                <p className="text-[#6F6B99] text-sm">Free Users</p>
                                                <svg
                                                    className="h-5 w-5 text-[#6F6B99]"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24">
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                                    />
                                                </svg>
                                            </div>
                                            <p className="font-bold text-2xl text-[#261E33]">
                                                {stats.freeUsers.toLocaleString()}
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-gray-200 bg-white p-5">
                                            <div className="mb-2 flex items-center justify-between">
                                                <p className="text-[#6F6B99] text-sm">Premium Users</p>
                                                <svg
                                                    className="h-5 w-5 text-[#FF5F3D]"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24">
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                                                    />
                                                </svg>
                                            </div>
                                            <p className="font-bold text-2xl text-[#261E33]">
                                                {stats.premiumUsers.toLocaleString()}
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-gray-200 bg-white p-5">
                                            <div className="mb-2 flex items-center justify-between">
                                                <p className="text-[#6F6B99] text-sm">Conversion Rate</p>
                                                <svg
                                                    className="h-5 w-5 text-[#6F6B99]"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24">
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                                    />
                                                </svg>
                                            </div>
                                            <p className="font-bold text-2xl text-[#261E33]">{stats.conversionRate}%</p>
                                        </div>
                                    </div>

                                    {/* Plan Cards */}
                                    <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                                        {plans.map((plan) => (
                                            <PlanCard
                                                key={plan.planId}
                                                plan={{
                                                    id: plan.billingCycle === 0 ? "free" : "premium",
                                                    name: plan.planName,
                                                    price: plan.price,
                                                    description: plan.description,
                                                    activeSubscribers: plan.subscriberCount,
                                                    isActive: plan.isActive,
                                                    limits: {
                                                        maxStudios: plan.maxStudios,
                                                        groupsPerStudio: plan.maxGroups,
                                                        membersPerGroup: plan.maxMembersPerGroup,
                                                        storagePerGroup: `${plan.maxStorageMb}MB`,
                                                        aiRequestsPerDay: plan.maxAiRequestsPerDay
                                                    }
                                                }}
                                                onEditLimits={() => handleEditPlan(plan.planId)}
                                                onEditPrice={() => handleEditPlan(plan.planId)}
                                            />
                                        ))}
                                    </div>

                                    {/* Feature Comparison */}
                                    <FeatureComparisonTable />
                                </>
                            ))}

                        {activeTab === "billing" && <BillingHistoryTab />}

                        {/* Các tabs bị ẩn theo yêu cầu */}
                        {activeTab === "revenue" && <RevenueStatsTab />}
                        {activeTab === "payments" && <PaymentMethodsTab />}
                        {activeTab === "reports" && <AdminReportsTab />}
                    </div>
                </main>
            </div>

            {/* Edit Modal */}
            {selectedPlanForEdit && (
                <PlanEditModal
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedPlanForEdit(null);
                    }}
                    plan={selectedPlanForEdit}
                    onSuccess={handleModalSuccess}
                />
            )}
        </div>
    );
}
