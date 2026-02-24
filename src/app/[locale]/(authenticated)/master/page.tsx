"use client";

import { useLocale } from "next-intl";
import { useState } from "react";

export default function MasterPage() {
    const locale = useLocale();
    const [isLoading] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="mx-auto max-w-7xl">
                <h1 className="mb-2 font-bold text-3xl text-gray-900">Master Studio</h1>
                <p className="text-gray-600">Manage your master studios here</p>

                {isLoading && (
                    <div className="mt-8 text-center">
                        <p className="text-gray-500">Loading...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
