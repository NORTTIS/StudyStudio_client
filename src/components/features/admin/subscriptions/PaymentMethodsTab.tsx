"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

type PaymentMethod = {
    id: string;
    name: string;
    type: "card" | "bank" | "ewallet";
    isActive: boolean;
    transactions: number;
    revenue: number;
};

export function PaymentMethodsTab() {
    const { toast } = useToast();
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
        {
            id: "1",
            name: "Visa/Mastercard",
            type: "card",
            isActive: true,
            transactions: 1856,
            revenue: 554616000
        },
        {
            id: "2",
            name: "Bank Transfer",
            type: "bank",
            isActive: true,
            transactions: 485,
            revenue: 145101000
        },
        {
            id: "3",
            name: "MoMo",
            type: "ewallet",
            isActive: false,
            transactions: 0,
            revenue: 0
        },
        {
            id: "4",
            name: "ZaloPay",
            type: "ewallet",
            isActive: false,
            transactions: 0,
            revenue: 0
        }
    ]);

    const handleToggleMethod = (id: string) => {
        setPaymentMethods((methods) =>
            methods.map((method) => (method.id === id ? { ...method, isActive: !method.isActive } : method))
        );
        toast({
            description: "Payment method status updated",
            variant: "success"
        });
    };

    const totalTransactions = paymentMethods.reduce((sum, method) => sum + method.transactions, 0);
    const totalRevenue = paymentMethods.reduce((sum, method) => sum + method.revenue, 0);

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-[#6F6B99] text-sm">Active Methods</p>
                        <svg className="h-5 w-5 text-[#FF5F3D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <p className="font-bold text-2xl text-[#261E33]">
                        {paymentMethods.filter((m) => m.isActive).length}
                    </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-[#6F6B99] text-sm">Total Transactions</p>
                        <svg className="h-5 w-5 text-[#6F6B99]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                            />
                        </svg>
                    </div>
                    <p className="font-bold text-2xl text-[#261E33]">{totalTransactions.toLocaleString()}</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-[#6F6B99] text-sm">Total Revenue</p>
                        <svg className="h-5 w-5 text-[#6F6B99]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <p className="font-bold text-2xl text-[#261E33]">{totalRevenue.toLocaleString()} VND</p>
                </div>
            </div>

            {/* Payment Methods List */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-[#261E33] text-lg">Payment Methods</h3>
                        <p className="text-[#6F6B99] text-sm">Manage available payment options for users</p>
                    </div>
                    <Button className="bg-[#FF5F3D] hover:bg-[#ff4620]">
                        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Method
                    </Button>
                </div>

                <div className="space-y-4">
                    {paymentMethods.map((method) => (
                        <div
                            key={method.id}
                            className="flex items-center justify-between rounded-lg border border-gray-100 p-5 transition-all hover:border-[#FF5F3D]">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                                    <svg
                                        className="h-6 w-6 text-[#6F6B99]"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <div className="mb-1 flex items-center gap-2">
                                        <h4 className="font-semibold text-[#261E33]">{method.name}</h4>
                                        {method.isActive ? (
                                            <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-green-700 text-xs">
                                                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                                Active
                                            </span>
                                        ) : (
                                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600 text-xs">
                                                Inactive
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-4 text-[#6F6B99] text-sm">
                                        <span>{method.transactions.toLocaleString()} transactions</span>
                                        <span>•</span>
                                        <span>{method.revenue.toLocaleString()} VND revenue</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleToggleMethod(method.id)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        method.isActive ? "bg-[#FF5F3D]" : "bg-gray-300"
                                    }`}>
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            method.isActive ? "translate-x-6" : "translate-x-1"
                                        }`}
                                    />
                                </button>

                                <button
                                    type="button"
                                    className="rounded-lg p-2 text-[#6F6B99] transition-colors hover:bg-gray-100">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Payment Method Stats */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-4 font-bold text-[#261E33] text-lg">Usage Distribution</h3>
                <div className="space-y-3">
                    {paymentMethods
                        .filter((m) => m.transactions > 0)
                        .map((method) => {
                            const percentage = (method.transactions / totalTransactions) * 100;

                            return (
                                <div key={method.id}>
                                    <div className="mb-1 flex items-center justify-between text-sm">
                                        <span className="text-[#261E33]">{method.name}</span>
                                        <span className="text-[#6F6B99]">{percentage.toFixed(1)}%</span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                        <div className="h-full bg-[#FF5F3D]" style={{ width: `${percentage}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>
        </div>
    );
}
