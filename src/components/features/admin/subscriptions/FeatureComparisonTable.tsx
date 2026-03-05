"use client";

export function FeatureComparisonTable() {
    const features = [
        { name: "Kanban Board", free: true, premium: true },
        { name: "Calendar View", free: true, premium: true },
        { name: "Document Upload", free: true, premium: true },
        { name: "Team Discussion", free: true, premium: true },
        { name: "AI Q&A Assistant", free: "Limited", premium: true },
        { name: "Analytics Dashboard", free: false, premium: true },
        { name: "Priority Support", free: false, premium: true },
        { name: "Custom Templates", free: false, premium: true },
        { name: "Export Reports", free: false, premium: true }
    ];

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-2 font-bold text-xl text-[#261E33]">Feature Comparison</h2>
            <p className="mb-6 text-[#6F6B99] text-sm">Overview of features included in each plan</p>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b">
                            <th className="px-4 py-3 text-left font-semibold text-[#261E33] text-sm">Feature</th>
                            <th className="px-4 py-3 text-center font-semibold text-[#261E33] text-sm">Free</th>
                            <th className="px-4 py-3 text-center font-semibold text-[#261E33] text-sm">Premium</th>
                        </tr>
                    </thead>
                    <tbody>
                        {features.map((feature, index) => (
                            <tr key={index} className="border-b last:border-b-0">
                                <td className="px-4 py-3 text-[#261E33] text-sm">{feature.name}</td>
                                <td className="px-4 py-3 text-center">
                                    {feature.free === true ? (
                                        <svg className="mx-auto h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : feature.free === "Limited" ? (
                                        <span className="text-[#6F6B99] text-xs">Limited</span>
                                    ) : (
                                        <svg className="mx-auto h-5 w-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {feature.premium === true ? (
                                        <svg className="mx-auto h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <svg className="mx-auto h-5 w-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
