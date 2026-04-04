"use client";

import { Button } from "@/components/ui/button";

type Plan = {
    id: "free" | "premium";
    name: string;
    price: number;
    description: string;
    activeSubscribers: number;
    isActive: boolean;
    limits: {
        maxStudios: number;
        groupsPerStudio: number;
        membersPerGroup: number;
        storagePerGroup: string;
        aiRequestsPerDay: number;
    };
};

type PlanCardProps = {
    plan: Plan;
    onEditLimits: () => void;
    onEditPrice: () => void;
};

export function PlanCard({ plan, onEditLimits, onEditPrice }: PlanCardProps) {
    return (
        <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
            {/* Header */}
            <div className="mb-4 flex items-start justify-between">
                <div>
                    <div className="mb-1 flex items-center gap-2">
                        <h3 className="font-bold text-[#261E33] text-xl">{plan.name}</h3>
                        {plan.isActive && (
                            <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-green-700 text-xs">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                Active
                            </span>
                        )}
                    </div>
                    <p className="text-[#6F6B99] text-sm">{plan.description}</p>
                </div>
            </div>

            {/* Price */}
            <div className="mb-4">
                <p className="font-bold text-3xl text-[#261E33]">
                    {plan.price === 0 ? "0 VND" : `${plan.price.toLocaleString()} VND`}
                </p>
                <p className="text-[#6F6B99] text-sm">/month</p>
            </div>

            {/* Active Subscribers */}
            <div className="mb-4 rounded-lg bg-[#F8F8F8] p-4">
                <p className="mb-1 text-[#6F6B99] text-xs">Active Subscribers</p>
                <p className="font-bold text-2xl text-[#261E33]">{(plan.activeSubscribers ?? 0).toLocaleString()}</p>
            </div>

            {/* Plan Limits */}
            <div className="mb-4 space-y-2 border-t pt-4">
                <p className="mb-3 font-semibold text-[#261E33] text-sm">Plan Limits</p>

                <div className="flex items-center justify-between text-sm">
                    <span className="text-[#6F6B99]">Max Studios</span>
                    <span className="font-medium text-[#261E33]">{plan.limits.maxStudios}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                    <span className="text-[#6F6B99]">Groups per Studio</span>
                    <span className="font-medium text-[#261E33]">{plan.limits.groupsPerStudio}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                    <span className="text-[#6F6B99]">Members per Group</span>
                    <span className="font-medium text-[#261E33]">{plan.limits.membersPerGroup}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                    <span className="text-[#6F6B99]">Storage per Group</span>
                    <span className="font-medium text-[#261E33]">{plan.limits.storagePerGroup}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                    <span className="text-[#6F6B99]">AI Requests/Day</span>
                    <span className="font-medium text-[#261E33]">{plan.limits.aiRequestsPerDay}</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onEditLimits}
                    className="flex-1 border-[#FF5F3D] text-[#FF5F3D] hover:bg-[#FF5F3D] hover:text-white">
                    <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                    </svg>
                    Edit Limits
                </Button>
            </div>
        </div>
    );
}
