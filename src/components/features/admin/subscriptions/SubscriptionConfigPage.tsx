"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import {
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Edit3,
    Save,
    Star,
    Users,
    Zap,
} from "lucide-react";

type PlanLimit = {
    maxStudios: number;
    groupsPerStudio: number;
    membersPerGroup: number;
    storagePerGroup: string;
    aiRequestsPerDay: number;
};

type Plan = {
    id: "free" | "premium";
    name: string;
    price: number;
    description: string;
    color: string;
    accentColor: string;
    icon: React.ReactNode;
    activeSubscribers: number;
    isActive: boolean;
    limits: PlanLimit;
};

const INITIAL_PLANS: Plan[] = [
    {
        id: "free",
        name: "Free",
        price: 0,
        description: "Dành cho cá nhân và nhóm nhỏ muốn trải nghiệm",
        color: "border-gray-200 bg-white",
        accentColor: "text-[#261E33]",
        icon: <Users className="h-6 w-6 text-[#6F6B99]" />,
        activeSubscribers: 10117,
        isActive: true,
        limits: {
            maxStudios: 3,
            groupsPerStudio: 5,
            membersPerGroup: 10,
            storagePerGroup: "500MB",
            aiRequestsPerDay: 20,
        },
    },
    {
        id: "premium",
        name: "Premium",
        price: 299000,
        description: "Dành cho nhóm cần sức mạnh và tính linh hoạt hơn",
        color: "border-[#FF5F3D]/30 bg-gradient-to-br from-[#FFF5F3] to-white",
        accentColor: "text-[#FF5F3D]",
        icon: <Star className="h-6 w-6 text-[#FF5F3D]" />,
        activeSubscribers: 2341,
        isActive: true,
        limits: {
            maxStudios: 10,
            groupsPerStudio: 10,
            membersPerGroup: 50,
            storagePerGroup: "1GB",
            aiRequestsPerDay: 100,
        },
    },
];

const FEATURES = [
    { label: "Tạo Studio", free: "3 studio", premium: "10 studio" },
    { label: "Nhóm / Studio", free: "5 nhóm", premium: "10 nhóm" },
    { label: "Thành viên / Nhóm", free: "10 người", premium: "50 người" },
    { label: "Lưu trữ / Nhóm", free: "500 MB", premium: "1 GB" },
    { label: "AI Q&A / ngày", free: "20 lượt", premium: "100 lượt" },
    { label: "Ưu tiên hỗ trợ", free: false, premium: true },
    { label: "Xuất PDF báo cáo", free: false, premium: true },
    { label: "Phân tích nâng cao", free: false, premium: true },
];

type EditState = {
    price: number;
    maxStudios: number;
    groupsPerStudio: number;
    membersPerGroup: number;
    storagePerGroup: string;
    aiRequestsPerDay: number;
};

export function SubscriptionConfigPage() {
    const [plans, setPlans] = useState<Plan[]>(INITIAL_PLANS);
    const [editingId, setEditingId] = useState<"free" | "premium" | null>(null);
    const [editState, setEditState] = useState<EditState | null>(null);
    const [saving, setSaving] = useState(false);
    const [savedId, setSavedId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<"free" | "premium" | null>("premium");

    const startEdit = (plan: Plan) => {
        setEditingId(plan.id);
        setEditState({
            price: plan.price,
            maxStudios: plan.limits.maxStudios,
            groupsPerStudio: plan.limits.groupsPerStudio,
            membersPerGroup: plan.limits.membersPerGroup,
            storagePerGroup: plan.limits.storagePerGroup,
            aiRequestsPerDay: plan.limits.aiRequestsPerDay,
        });
    };

    const handleSave = (planId: "free" | "premium") => {
        if (!editState) return;
        setSaving(true);
        setTimeout(() => {
            setPlans((prev) =>
                prev.map((p) =>
                    p.id === planId
                        ? {
                            ...p,
                            price: editState.price,
                            limits: {
                                maxStudios: editState.maxStudios,
                                groupsPerStudio: editState.groupsPerStudio,
                                membersPerGroup: editState.membersPerGroup,
                                storagePerGroup: editState.storagePerGroup,
                                aiRequestsPerDay: editState.aiRequestsPerDay,
                            },
                        }
                        : p
                )
            );
            setSaving(false);
            setEditingId(null);
            setEditState(null);
            setSavedId(planId);
            setTimeout(() => setSavedId(null), 2000);
        }, 800);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditState(null);
    };

    return (
        <div className="min-h-screen bg-[#F8F8F8]">
            <div className="flex min-h-screen">
                <DashboardSidebar />
                <main className="flex-1">
                    <Header userProfile={null} />

                    <div className="px-6 py-6">
                        {/* Header */}
                        <div className="mb-6">
                            <h1 className="mb-1 font-bold text-2xl text-[#261E33]">
                                Cấu hình gói đăng ký
                            </h1>
                            <p className="text-[#6F6B99] text-sm">
                                Thiết lập giá và giới hạn cho từng gói dịch vụ
                            </p>
                        </div>

                        {/* Stats */}
                        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                            {[
                                { label: "Tổng người dùng", value: "12,458", color: "text-[#261E33]" },
                                { label: "Người dùng Free", value: "10,117", color: "text-[#6F6B99]" },
                                { label: "Người dùng Premium", value: "2,341", color: "text-[#FF5F3D]" },
                                { label: "Tỷ lệ chuyển đổi", value: "18.8%", color: "text-green-600" },
                            ].map((stat) => (
                                <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-5">
                                    <p className="mb-1 text-[#6F6B99] text-sm">{stat.label}</p>
                                    <p className={`font-bold text-2xl ${stat.color}`}>{stat.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Plan Cards */}
                        <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                            {plans.map((plan) => {
                                const isEditing = editingId === plan.id;
                                const isExpanded = expandedId === plan.id;
                                return (
                                    <div
                                        key={plan.id}
                                        className={`rounded-2xl border-2 p-6 transition-all ${plan.color} ${savedId === plan.id ? "border-green-400" : ""}`}
                                    >
                                        {/* Plan header */}
                                        <div className="mb-5 flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-100 bg-white shadow-sm">
                                                    {plan.icon}
                                                </div>
                                                <div>
                                                    <h2 className={`font-bold text-xl ${plan.accentColor}`}>
                                                        {plan.name}
                                                    </h2>
                                                    <p className="text-[#6F6B99] text-xs">{plan.description}</p>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                {savedId === plan.id && (
                                                    <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-600">
                                                        <CheckCircle2 className="h-3.5 w-3.5" /> Đã lưu
                                                    </span>
                                                )}
                                                {!isEditing && (
                                                    <button
                                                        type="button"
                                                        onClick={() => startEdit(plan)}
                                                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-[#261E33] transition-colors hover:border-[#FF5F3D] hover:text-[#FF5F3D] cursor-pointer"
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5" />
                                                        Chỉnh sửa
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Price */}
                                        <div className="mb-5 rounded-xl border border-dashed border-gray-200 bg-white/70 p-4">
                                            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#6F6B99]">
                                                Giá / tháng
                                            </p>
                                            {isEditing ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={editState?.price ?? 0}
                                                        onChange={(e) =>
                                                            setEditState((s) => s ? { ...s, price: Number(e.target.value) } : s)
                                                        }
                                                        className="w-40 rounded-lg border border-[#FF5F3D] px-3 py-2 text-lg font-bold text-[#261E33] focus:outline-none focus:ring-2 focus:ring-[#FF5F3D]/20"
                                                    />
                                                    <span className="text-[#6F6B99] font-medium">VND</span>
                                                </div>
                                            ) : (
                                                <p className={`font-bold text-2xl ${plan.accentColor}`}>
                                                    {plan.price === 0
                                                        ? "Miễn phí"
                                                        : `${plan.price.toLocaleString()} VND`}
                                                </p>
                                            )}
                                            <p className="mt-1 text-[#6F6B99] text-xs">
                                                {plan.activeSubscribers.toLocaleString()} người đang dùng
                                            </p>
                                        </div>

                                        {/* Limits */}
                                        <div>
                                            <button
                                                type="button"
                                                className="mb-3 flex w-full items-center justify-between text-sm font-semibold text-[#261E33] cursor-pointer"
                                                onClick={() => setExpandedId(isExpanded ? null : plan.id)}
                                            >
                                                Giới hạn sử dụng
                                                {isExpanded ? (
                                                    <ChevronUp className="h-4 w-4 text-[#6F6B99]" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4 text-[#6F6B99]" />
                                                )}
                                            </button>

                                            {isExpanded && (
                                                <div className="space-y-3">
                                                    {[
                                                        {
                                                            label: "Số Studio tối đa",
                                                            key: "maxStudios" as const,
                                                            type: "number",
                                                            value: plan.limits.maxStudios,
                                                        },
                                                        {
                                                            label: "Nhóm / Studio",
                                                            key: "groupsPerStudio" as const,
                                                            type: "number",
                                                            value: plan.limits.groupsPerStudio,
                                                        },
                                                        {
                                                            label: "Thành viên / Nhóm",
                                                            key: "membersPerGroup" as const,
                                                            type: "number",
                                                            value: plan.limits.membersPerGroup,
                                                        },
                                                        {
                                                            label: "Lưu trữ / Nhóm",
                                                            key: "storagePerGroup" as const,
                                                            type: "text",
                                                            value: plan.limits.storagePerGroup,
                                                        },
                                                        {
                                                            label: "AI Q&A / ngày",
                                                            key: "aiRequestsPerDay" as const,
                                                            type: "number",
                                                            value: plan.limits.aiRequestsPerDay,
                                                        },
                                                    ].map((field) => (
                                                        <div
                                                            key={field.key}
                                                            className="flex items-center justify-between rounded-lg border border-gray-100 bg-white/80 px-4 py-3"
                                                        >
                                                            <p className="text-sm text-[#6F6B99]">{field.label}</p>
                                                            {isEditing ? (
                                                                <input
                                                                    type={field.type}
                                                                    value={
                                                                        editState
                                                                            ? String(editState[field.key])
                                                                            : String(field.value)
                                                                    }
                                                                    onChange={(e) =>
                                                                        setEditState((s) =>
                                                                            s
                                                                                ? {
                                                                                    ...s,
                                                                                    [field.key]:
                                                                                        field.type === "number"
                                                                                            ? Number(e.target.value)
                                                                                            : e.target.value,
                                                                                }
                                                                                : s
                                                                        )
                                                                    }
                                                                    className="w-28 rounded-lg border border-[#FF5F3D] px-3 py-1.5 text-right text-sm font-semibold text-[#261E33] focus:outline-none focus:ring-2 focus:ring-[#FF5F3D]/20"
                                                                />
                                                            ) : (
                                                                <p className="font-semibold text-sm text-[#261E33]">
                                                                    {String(field.value)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Save / Cancel */}
                                        {isEditing && (
                                            <div className="mt-5 flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={cancelEdit}
                                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-[#6F6B99] hover:bg-gray-50 cursor-pointer"
                                                >
                                                    Huỷ
                                                </button>
                                                <Button
                                                    onClick={() => handleSave(plan.id)}
                                                    disabled={saving}
                                                    className="bg-[#FF5F3D] hover:bg-[#ff4620]"
                                                >
                                                    {saving ? (
                                                        <span className="flex items-center gap-2">
                                                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                            </svg>
                                                            Đang lưu...
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-2">
                                                            <Save className="h-4 w-4" />
                                                            Lưu thay đổi
                                                        </span>
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Feature comparison table */}
                        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                            <div className="border-b border-gray-100 px-6 py-4">
                                <h2 className="font-bold text-lg text-[#261E33]">So sánh tính năng</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-[#F8F8F8]">
                                        <tr>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">
                                                Tính năng
                                            </th>
                                            <th className="px-6 py-4 text-center font-semibold text-[#261E33] text-sm">
                                                Free
                                            </th>
                                            <th className="px-6 py-4 text-center font-semibold text-[#FF5F3D] text-sm">
                                                Premium
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {FEATURES.map((feature, i) => (
                                            <tr key={i} className="border-t border-gray-100">
                                                <td className="px-6 py-4 text-sm text-[#261E33]">{feature.label}</td>
                                                <td className="px-6 py-4 text-center">
                                                    {typeof feature.free === "boolean" ? (
                                                        feature.free ? (
                                                            <CheckCircle2 className="mx-auto h-5 w-5 text-green-500" />
                                                        ) : (
                                                            <span className="mx-auto block h-0.5 w-5 bg-gray-300 rounded" />
                                                        )
                                                    ) : (
                                                        <span className="text-sm font-medium text-[#261E33]">
                                                            {feature.free}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {typeof feature.premium === "boolean" ? (
                                                        feature.premium ? (
                                                            <CheckCircle2 className="mx-auto h-5 w-5 text-[#FF5F3D]" />
                                                        ) : (
                                                            <span className="mx-auto block h-0.5 w-5 bg-gray-300 rounded" />
                                                        )
                                                    ) : (
                                                        <span className="text-sm font-semibold text-[#FF5F3D]">
                                                            {feature.premium}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
