"use client";

import { useState } from "react";
import { type AdminSubscriptionPlan, updateSubscriptionPlan } from "@/api/admin-subscription-plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type PlanPriceModalProps = {
    isOpen: boolean;
    onClose: () => void;
    plan: AdminSubscriptionPlan;
    onSuccess?: () => void;
};

export function PlanPriceModal({ isOpen, onClose, plan, onSuccess }: PlanPriceModalProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [price, setPrice] = useState(plan.price);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsLoading(true);
        console.log("Updating plan price:", {
            planId: plan.planId,
            planName: plan.planName,
            oldPrice: plan.price,
            newPrice: price
        });

        try {
            const result = await updateSubscriptionPlan(
                {
                    planId: plan.planId,
                    price: price
                },
                "vi"
            );

            console.log("Update result:", result);

            if (result.status === "success") {
                toast({
                    description: `${plan.planName} plan price updated successfully!`,
                    variant: "default"
                });
                onSuccess?.();
                onClose();
            } else {
                toast({
                    description: result.message || "Failed to update plan price",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Failed to update plan price:", error);
            toast({
                description: "An error occurred while updating plan price",
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
        const value = e.target.value.replace(/[^\d]/g, ""); // Chỉ cho phép số
        setPrice(Number(value));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="font-bold text-[#261E33] text-xl">Edit Price - {plan.planName} Plan</h2>
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

                {/* Current Price Display */}
                <div className="mb-4 rounded-lg bg-gray-50 p-4">
                    <p className="text-[#6F6B99] text-sm">Current Price</p>
                    <p className="font-bold text-2xl text-[#261E33]">{formatPrice(plan.price)} VND</p>
                </div>

                {/* Form */}
                <div className="space-y-4">
                    <div>
                        <label htmlFor="price" className="mb-2 block font-medium text-[#261E33] text-sm">
                            New Price (VND)
                        </label>
                        <Input
                            id="price"
                            type="text"
                            value={formatPrice(price)}
                            onChange={handlePriceChange}
                            placeholder="Enter price in VND"
                            className="text-right"
                        />
                        <p className="mt-1 text-[#6F6B99] text-xs">
                            Enter price without currency symbol. Example: 299000
                        </p>
                    </div>

                    {/* Price Preview */}
                    {price !== plan.price && (
                        <div className="rounded-lg border border-[#FF5F3D] bg-[#FFF7F4] p-3">
                            <p className="text-[#FF5F3D] text-sm">Price Change Preview:</p>
                            <div className="mt-1 flex items-center justify-between">
                                <span className="text-[#6F6B99] text-sm">From: {formatPrice(plan.price)} VND</span>
                                <span className="text-[#FF5F3D] text-sm">To: {formatPrice(price)} VND</span>
                            </div>
                            <div className="mt-1">
                                <span className={`text-sm ${price > plan.price ? "text-red-600" : "text-green-600"}`}>
                                    {price > plan.price ? "+" : ""}
                                    {formatPrice(price - plan.price)} VND (
                                    {price > plan.price ? "increase" : "decrease"})
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Warning for Free Plan */}
                    {plan.billingCycle === 0 && price > 0 && (
                        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                            <div className="flex items-start gap-2">
                                <svg
                                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600"
                                    fill="currentColor"
                                    viewBox="0 0 20 20">
                                    <path
                                        fillRule="evenodd"
                                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <div>
                                    <p className="font-medium text-sm text-yellow-800">Warning</p>
                                    <p className="text-sm text-yellow-700">
                                        Setting a price for the Free plan will convert it to a paid plan. This may
                                        affect existing free users.
                                    </p>
                                </div>
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
                        disabled={isLoading || price === plan.price}>
                        {isLoading ? "Saving..." : "Update Price"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
