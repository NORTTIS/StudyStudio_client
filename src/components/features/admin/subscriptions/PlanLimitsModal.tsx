"use client";

import { useState } from "react";
import {
    type AdminSubscriptionPlan,
    planToUpdateRequest,
    updateSubscriptionPlan
} from "@/api/admin-subscription-plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type PlanLimitsModalProps = {
    isOpen: boolean;
    onClose: () => void;
    plan: AdminSubscriptionPlan;
    onSuccess?: () => void;
};

export function PlanLimitsModal({ isOpen, onClose, plan, onSuccess }: PlanLimitsModalProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [limits, setLimits] = useState({
        maxStudios: plan.maxStudios,
        maxGroups: plan.maxGroups,
        maxMembersPerGroup: plan.maxMembersPerGroup,
        maxStorageMb: plan.maxStorageMb,
        maxAiRequestsPerDay: plan.maxAiRequestsPerDay
    });

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const result = await updateSubscriptionPlan(planToUpdateRequest(plan, limits), "vi");

            if (result.status === "success") {
                toast({
                    description: `${plan.planName} plan limits updated successfully!`,
                    variant: "default"
                });
                onSuccess?.();
                onClose();
            } else {
                toast({
                    description: result.message || "Failed to update plan limits",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Failed to update plan limits:", error);
            toast({
                description: "An error occurred while updating plan limits",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="font-bold text-[#261E33] text-xl">Chỉnh Sửa Giới Hạn - {plan.planName}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-[#6F6B99] transition-colors hover:text-[#261E33]">
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <div className="space-y-4">
                    <div>
                        <label htmlFor="maxStudios" className="mb-2 block font-medium text-[#261E33] text-sm">
                            Studios tối đa
                        </label>
                        <Input
                            id="maxStudios"
                            type="number"
                            value={limits.maxStudios}
                            onChange={(e) => setLimits({ ...limits, maxStudios: Number(e.target.value) })}
                        />
                    </div>

                    <div>
                        <label htmlFor="maxGroups" className="mb-2 block font-medium text-[#261E33] text-sm">
                            Nhóm tối đa
                        </label>
                        <Input
                            id="maxGroups"
                            type="number"
                            value={limits.maxGroups}
                            onChange={(e) => setLimits({ ...limits, maxGroups: Number(e.target.value) })}
                        />
                    </div>

                    <div>
                        <label htmlFor="maxMembersPerGroup" className="mb-2 block font-medium text-[#261E33] text-sm">
                            thành viên tối đa mỗi nhóm
                        </label>
                        <Input
                            id="maxMembersPerGroup"
                            type="number"
                            value={limits.maxMembersPerGroup}
                            onChange={(e) => setLimits({ ...limits, maxMembersPerGroup: Number(e.target.value) })}
                        />
                    </div>

                    <div>
                        <label htmlFor="maxStorageMb" className="mb-2 block font-medium text-[#261E33] text-sm">
                            Dung lượng lưu trữ (MB) tối đa 
                        </label>
                        <Input
                            id="maxStorageMb"
                            type="number"
                            value={limits.maxStorageMb}
                            onChange={(e) => setLimits({ ...limits, maxStorageMb: Number(e.target.value) })}
                        />
                    </div>

                    <div>
                        <label htmlFor="maxAiRequestsPerDay" className="mb-2 block font-medium text-[#261E33] text-sm">
                            Lượt Yêu Cầu AI Mỗi Ngày
                        </label>
                        <Input
                            id="maxAiRequestsPerDay"
                            type="number"
                            value={limits.maxAiRequestsPerDay}
                            onChange={(e) => setLimits({ ...limits, maxAiRequestsPerDay: Number(e.target.value) })}
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex gap-3">
                    <Button variant="outline" onClick={onClose} className="flex-1" disabled={isLoading}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="flex-1 bg-[#FF5F3D] hover:bg-[#ff4620]"
                        disabled={isLoading}>
                        {isLoading ? "Đang Lưu..." : "Lưu Thay Đổi"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
