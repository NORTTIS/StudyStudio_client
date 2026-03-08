"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

type Plan = {
    id: "free" | "premium";
    name: string;
    limits: {
        maxStudios: number;
        groupsPerStudio: number;
        membersPerGroup: number;
        storagePerGroup: string;
        aiRequestsPerDay: number;
    };
};

type PlanLimitsModalProps = {
    isOpen: boolean;
    onClose: () => void;
    plan: Plan;
};

export function PlanLimitsModal({ isOpen, onClose, plan }: PlanLimitsModalProps) {
    const { toast } = useToast();
    const [limits, setLimits] = useState(plan.limits);

    if (!isOpen) return null;

    const handleSave = () => {
        // TODO: Call API to update limits
        toast({
            description: `${plan.name} plan limits updated successfully!`,
            variant: "success"
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="font-bold text-[#261E33] text-xl">Edit Limits - {plan.name} Plan</h2>
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
                            Max Studios
                        </label>
                        <Input
                            id="maxStudios"
                            type="number"
                            value={limits.maxStudios}
                            onChange={(e) => setLimits({ ...limits, maxStudios: Number(e.target.value) })}
                        />
                    </div>

                    <div>
                        <label htmlFor="groupsPerStudio" className="mb-2 block font-medium text-[#261E33] text-sm">
                            Groups per Studio
                        </label>
                        <Input
                            id="groupsPerStudio"
                            type="number"
                            value={limits.groupsPerStudio}
                            onChange={(e) => setLimits({ ...limits, groupsPerStudio: Number(e.target.value) })}
                        />
                    </div>

                    <div>
                        <label htmlFor="membersPerGroup" className="mb-2 block font-medium text-[#261E33] text-sm">
                            Members per Group
                        </label>
                        <Input
                            id="membersPerGroup"
                            type="number"
                            value={limits.membersPerGroup}
                            onChange={(e) => setLimits({ ...limits, membersPerGroup: Number(e.target.value) })}
                        />
                    </div>

                    <div>
                        <label htmlFor="storagePerGroup" className="mb-2 block font-medium text-[#261E33] text-sm">
                            Storage per Group
                        </label>
                        <Input
                            id="storagePerGroup"
                            type="text"
                            value={limits.storagePerGroup}
                            onChange={(e) => setLimits({ ...limits, storagePerGroup: e.target.value })}
                            placeholder="e.g., 500MB, 1GB"
                        />
                    </div>

                    <div>
                        <label htmlFor="aiRequestsPerDay" className="mb-2 block font-medium text-[#261E33] text-sm">
                            AI Requests per Day
                        </label>
                        <Input
                            id="aiRequestsPerDay"
                            type="number"
                            value={limits.aiRequestsPerDay}
                            onChange={(e) => setLimits({ ...limits, aiRequestsPerDay: Number(e.target.value) })}
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex gap-3">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} className="flex-1 bg-[#FF5F3D] hover:bg-[#ff4620]">
                        Save Changes
                    </Button>
                </div>
            </div>
        </div>
    );
}
