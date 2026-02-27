export function UsageBar({ current, max }: { current: number; max: number }) {
    const safeMax = Math.max(1, max);
    const ratio = current / safeMax;

    // clamp %
    const pct = Math.max(0, Math.min(100, Math.round(ratio * 100)));

    const isUnlimited = max <= 0;
    const isFull = !isUnlimited && current >= max;
    const isNear = !isUnlimited && !isFull && pct >= 80;

    const status = isUnlimited ? "unlimited" : isFull ? "full" : isNear ? "near" : "ok";

    const tone =
        status === "full"
            ? {
                wrapper: "border-orange-200 bg-orange-50/70",
                badge: "bg-orange-100 text-orange-700 ring-orange-200",
                barBg: "bg-orange-100",
                barFg: "bg-orange-500",
                title: "Đã chạm giới hạn",
                hint: `Bạn đã dùng hết ${max} không gian nhóm của gói miễn phí.`,
            }
            : status === "near"
                ? {
                    wrapper: "border-amber-200 bg-amber-50/60",
                    badge: "bg-amber-100 text-amber-700 ring-amber-200",
                    barBg: "bg-amber-100",
                    barFg: "bg-amber-500",
                    title: "Sắp chạm giới hạn",
                    hint: `Bạn sắp dùng hết giới hạn ${max} không gian nhóm.`,
                }
                : status === "unlimited"
                    ? {
                        wrapper: "border-emerald-200 bg-emerald-50/60",
                        badge: "bg-emerald-100 text-emerald-700 ring-emerald-200",
                        barBg: "bg-emerald-100",
                        barFg: "bg-emerald-500",
                        title: "Không giới hạn",
                        hint: "Gói hiện tại của bạn không giới hạn số không gian nhóm.",
                    }
                    : {
                        wrapper: "border-[#EAE9F2] bg-white",
                        badge: "bg-slate-100 text-slate-700 ring-slate-200",
                        barBg: "bg-slate-100",
                        barFg: "bg-slate-800",
                        title: "Sử dụng gói",
                        hint: "Theo dõi số không gian nhóm đang dùng.",
                    };

    return (
        <div
            className={[
                "mt-4 w-full rounded-2xl border p-5 shadow-sm",
                "transition-colors duration-200",
                tone.wrapper
            ].join(" ")}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[#261E33]">{tone.title}</p>

                        <span
                            className={[
                                "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
                                "ring-1 ring-inset",
                                tone.badge
                            ].join(" ")}>
                            {status === "full" ? "FULL" : status === "near" ? "NEAR LIMIT" : status === "unlimited" ? "PRO" : "OK"}
                        </span>
                    </div>

                    <p className="mt-1 text-sm text-[#6F6B99]">{tone.hint}</p>
                </div>

                {/* Right meta */}
                <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-[#261E33]">
                        {isUnlimited ? (
                            <>
                                <span className="text-emerald-700">∞</span> / ∞
                            </>
                        ) : (
                            <>
                                <span>{current}</span> <span className="text-[#6F6B99]">/</span> <span>{max}</span>
                            </>
                        )}
                    </p>
                    {!isUnlimited && (
                        <p className="mt-0.5 text-xs text-[#6F6B99]">{pct}%</p>
                    )}
                </div>
            </div>

            {/* Progress */}
            <div className="mt-4">
                <div className={["h-2.5 w-full rounded-full", tone.barBg].join(" ")}>
                    <div
                        className={[
                            "relative h-2.5 rounded-full",
                            "transition-[width] duration-300 ease-out",
                            tone.barFg
                        ].join(" ")}
                        style={{ width: isUnlimited ? "100%" : `${pct}%` }}>
                        {/* subtle shine */}
                        <span className="pointer-events-none absolute inset-0 rounded-full opacity-30 [background:linear-gradient(90deg,transparent,rgba(255,255,255,.8),transparent)]" />
                    </div>
                </div>

                {/* Footer row */}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-[#6F6B99]">
                        {isUnlimited ? (
                            <>Bạn có thể tạo thêm không gian nhóm bất kỳ lúc nào.</>
                        ) : (
                            <>
                                <span className="font-semibold text-[#261E33]">{current}</span> / {max} không gian nhóm đang được sử dụng.
                            </>
                        )}
                    </p>

                    {/* CTA only when near/full */}
                    {!isUnlimited && (isNear || isFull) && (
                        <button
                            type="button"
                            className={[
                                "inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-sm font-semibold",
                                "shadow-sm transition",
                                "focus:outline-none focus:ring-2 focus:ring-orange-300",
                                isFull
                                    ? "bg-orange-600 text-white hover:bg-orange-700"
                                    : "bg-amber-600 text-white hover:bg-amber-700"
                            ].join(" ")}>
                            Nâng cấp gói
                            <span className="ml-2 text-white/80">→</span>
                        </button>
                    )}
                </div>

                {/* Extra note for full */}
                {!isUnlimited && isFull && (
                    <div className="mt-3 rounded-xl border border-orange-200 bg-white/60 p-3">
                        <p className="text-sm text-[#261E33]">
                            <span className="font-semibold text-orange-700">Nâng cấp lên gói đăng ký</span> để tạo lên tới{" "}
                            <span className="font-semibold">10</span> không gian nhóm.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}