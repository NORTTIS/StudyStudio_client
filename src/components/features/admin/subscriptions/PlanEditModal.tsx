"use client";

import { useState } from "react";
import {
    type AdminSubscriptionPlan,
    planToUpdateRequest,
    updateSubscriptionPlan
} from "@/api/admin-subscription-plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type PlanEditModalProps = {
    isOpen: boolean;
    onClose: () => void;
    plan: AdminSubscriptionPlan;
    onSuccess?: () => void;
};

export function PlanEditModal({ isOpen, onClose, plan, onSuccess }: PlanEditModalProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    // Form state with all required fields
    const [formData, setFormData] = useState({
        planName: plan.planName,
        price: plan.price,
        description: plan.description,
        maxStudios: plan.maxStudios,
        maxStorageMb: plan.maxStorageMb,
        maxAiRequestsPerDay: plan.maxAiRequestsPerDay,
        maxGroups: plan.maxGroups,
        maxMembersPerGroup: plan.maxMembersPerGroup,
        isActive: plan.isActive
    });

    if (!isOpen) return null;

    const handleInputChange = (field: string, value: string | number | boolean) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = async () => {
        // Kiểm tra các trường bắt buộc trước khi gửi
        if (!formData.planName.trim()) {
            toast({
                description: "Tên gói không được để trống",
                variant: "destructive"
            });
            return;
        }

        if (!formData.description.trim()) {
            toast({
                description: "Mô tả gói không được để trống",
                variant: "destructive"
            });
            return;
        }

        if (
            formData.maxStudios <= 0 ||
            formData.maxGroups <= 0 ||
            formData.maxMembersPerGroup <= 0 ||
            formData.maxStorageMb <= 0
        ) {
            toast({
                description: "Các giới hạn phải lớn hơn 0",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);
        console.log("Bắt đầu cập nhật gói:", {
            planId: plan.planId,
            planName: plan.planName,
            formData: formData
        });

        try {
            const result = await updateSubscriptionPlan(
                planToUpdateRequest(plan, {
                    planName: formData.planName.trim(),
                    price: Number(formData.price),
                    description: formData.description.trim(),
                    maxStudios: Number(formData.maxStudios),
                    maxStorageMb: Number(formData.maxStorageMb),
                    maxAiRequestsPerDay: Number(formData.maxAiRequestsPerDay),
                    maxGroups: Number(formData.maxGroups),
                    maxMembersPerGroup: Number(formData.maxMembersPerGroup),
                    isActive: true
                }),
                "vi"
            );

            console.log("Update result:", result);

            if (result.status === "success") {
                toast({
                    description: `${formData.planName} plan updated successfully!`,
                    variant: "default"
                });
                onSuccess?.();
                onClose();
            } else {
                toast({
                    description: result.message || "Failed to update plan",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Failed to update plan:", error);
            toast({
                description: "An error occurred while updating plan",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const formatPrice = (value: number) => {
        return value.toLocaleString("vi-VN");
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^\d]/g, "");
        handleInputChange("price", Number(value));
    };

    const getBillingCycleText = (cycle: number) => {
        switch (cycle) {
            case 0:
                return "Free";
            case 1:
                return "Monthly";
            case 3:
                return "Quarterly";
            case 12:
                return "Yearly";
            default:
                return `${cycle} months`;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-[#261E33] text-xl">Edit Plan - {plan.planName}</h2>
                        <p className="text-[#6F6B99] text-sm">{getBillingCycleText(plan.billingCycle)} Plan</p>
                    </div>
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
                <div className="space-y-6">
                    {/* Basic Info Section */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-[#261E33] text-lg">Basic Information</h3>

                        <div>
                            <label htmlFor="planName" className="mb-2 block font-medium text-[#261E33] text-sm">
                                Plan Name *
                            </label>
                            <Input
                                id="planName"
                                type="text"
                                value={formData.planName}
                                onChange={(e) => handleInputChange("planName", e.target.value)}
                                placeholder="Enter plan name"
                            />
                        </div>

                        <div>
                            <label htmlFor="price" className="mb-2 block font-medium text-[#261E33] text-sm">
                                Price (VND) *
                            </label>
                            <Input
                                id="price"
                                type="text"
                                value={formatPrice(formData.price)}
                                onChange={handlePriceChange}
                                placeholder="Enter price in VND"
                                className="text-right"
                            />
                            <p className="mt-1 text-[#6F6B99] text-xs">
                                Enter price without currency symbol. Example: 299000
                            </p>
                        </div>

                        <div>
                            <label htmlFor="description" className="mb-2 block font-medium text-[#261E33] text-sm">
                                Description *
                            </label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => handleInputChange("description", e.target.value)}
                                placeholder="Enter plan description"
                                rows={3}
                            />
                        </div>
                    </div>

                    {/* Limits Section */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-[#261E33] text-lg">Plan Limits</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="maxStudios" className="mb-2 block font-medium text-[#261E33] text-sm">
                                    Max Studios *
                                </label>
                                <Input
                                    id="maxStudios"
                                    type="number"
                                    value={formData.maxStudios}
                                    onChange={(e) => handleInputChange("maxStudios", Number(e.target.value))}
                                    min="0"
                                />
                            </div>

                            <div>
                                <label htmlFor="maxGroups" className="mb-2 block font-medium text-[#261E33] text-sm">
                                    Max Groups *
                                </label>
                                <Input
                                    id="maxGroups"
                                    type="number"
                                    value={formData.maxGroups}
                                    onChange={(e) => handleInputChange("maxGroups", Number(e.target.value))}
                                    min="0"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="maxMembersPerGroup"
                                    className="mb-2 block font-medium text-[#261E33] text-sm">
                                    Max Members Per Group *
                                </label>
                                <Input
                                    id="maxMembersPerGroup"
                                    type="number"
                                    value={formData.maxMembersPerGroup}
                                    onChange={(e) => handleInputChange("maxMembersPerGroup", Number(e.target.value))}
                                    min="0"
                                />
                            </div>

                            <div>
                                <label htmlFor="maxStorageMb" className="mb-2 block font-medium text-[#261E33] text-sm">
                                    Max Storage (MB) *
                                </label>
                                <Input
                                    id="maxStorageMb"
                                    type="number"
                                    value={formData.maxStorageMb}
                                    onChange={(e) => handleInputChange("maxStorageMb", Number(e.target.value))}
                                    min="0"
                                />
                            </div>

                            <div className="col-span-2">
                                <label
                                    htmlFor="maxAiRequestsPerDay"
                                    className="mb-2 block font-medium text-[#261E33] text-sm">
                                    Max AI Requests Per Day
                                </label>
                                <Input
                                    id="maxAiRequestsPerDay"
                                    type="number"
                                    value={formData.maxAiRequestsPerDay}
                                    onChange={(e) => handleInputChange("maxAiRequestsPerDay", Number(e.target.value))}
                                    min="0"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Status Section */}
                    <div className="hidden space-y-4">
                        <h3 className="font-semibold text-[#261E33] text-lg">Status</h3>

                        <div className="flex items-center space-x-2">
                            <input
                                id="isActive"
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => handleInputChange("isActive", e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-[#FF5F3D] focus:ring-[#FF5F3D]"
                            />
                            <label htmlFor="isActive" className="font-medium text-[#261E33] text-sm">
                                Plan is active and available for subscription
                            </label>
                        </div>
                    </div>

                    {/* Preview Changes */}
                    {(formData.price !== plan.price ||
                        formData.planName !== plan.planName ||
                        formData.description !== plan.description ||
                        formData.maxStudios !== plan.maxStudios ||
                        formData.maxGroups !== plan.maxGroups ||
                        formData.maxMembersPerGroup !== plan.maxMembersPerGroup ||
                        formData.maxStorageMb !== plan.maxStorageMb ||
                        formData.maxAiRequestsPerDay !== plan.maxAiRequestsPerDay ||
                        formData.isActive !== plan.isActive) && (
                            <div className="rounded-lg border border-[#FF5F3D] bg-[#FFF7F4] p-4">
                                <p className="mb-2 font-medium text-[#FF5F3D] text-sm">Changes Preview:</p>
                                <div className="space-y-1 text-sm">
                                    {formData.planName !== plan.planName && (
                                        <div className="flex justify-between">
                                            <span className="text-[#6F6B99]">Name:</span>
                                            <span className="text-[#FF5F3D]">
                                                {plan.planName} → {formData.planName}
                                            </span>
                                        </div>
                                    )}
                                    {formData.price !== plan.price && (
                                        <div className="flex justify-between">
                                            <span className="text-[#6F6B99]">Price:</span>
                                            <span className="text-[#FF5F3D]">
                                                {formatPrice(plan.price)} → {formatPrice(formData.price)} VND
                                            </span>
                                        </div>
                                    )}
                                    {formData.maxStudios !== plan.maxStudios && (
                                        <div className="flex justify-between">
                                            <span className="text-[#6F6B99]">Max Studios:</span>
                                            <span className="text-[#FF5F3D]">
                                                {plan.maxStudios} → {formData.maxStudios}
                                            </span>
                                        </div>
                                    )}
                                    {formData.maxGroups !== plan.maxGroups && (
                                        <div className="flex justify-between">
                                            <span className="text-[#6F6B99]">Max Groups:</span>
                                            <span className="text-[#FF5F3D]">
                                                {plan.maxGroups} → {formData.maxGroups}
                                            </span>
                                        </div>
                                    )}
                                    {formData.isActive !== plan.isActive && (
                                        <div className="flex justify-between">
                                            <span className="text-[#6F6B99]">Status:</span>
                                            <span className="text-[#FF5F3D]">
                                                {plan.isActive ? "Active" : "Inactive"} →{" "}
                                                {formData.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                </div>

                {/* Actions */}
                <div className="mt-6 flex gap-3">
                    <Button variant="outline" onClick={onClose} className="flex-1" disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="flex-1 bg-[#FF5F3D] hover:bg-[#ff4620]"
                        disabled={isLoading}>
                        {isLoading ? "Saving..." : "Update Plan"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
