export function UsageBar({ current, max }: { current: number; max: number }) {
    const isUnlimited = max <= 0;
    const safeMax = isUnlimited ? 1 : Math.max(1, max);
    const ratio = isUnlimited ? 1 : current / safeMax;
    const pct = isUnlimited ? 100 : Math.max(0, Math.min(100, Math.round(ratio * 100)));

    const isFull = !isUnlimited && current >= max;
    const isNear = !isUnlimited && !isFull && pct >= 80;

    const status = isUnlimited ? "unlimited" : isFull ? "full" : isNear ? "near" : "ok";

    const tone =
        status === "full"
            ? {
                wrapper:
                    "border-orange-200 bg-gradient-to-br from-[#FFF7F1] via-[#FFF4EC] to-[#FFF9F5]",
                badge: "bg-orange-100 text-orange-700 ring-orange-200",
                barBg: "bg-orange-100",
                barFg: "bg-gradient-to-r from-orange-500 to-rose-500",
                title: "Đã đạt giới hạn nhóm",
                hint: `Bạn đang sử dụng ${current}/${max} nhóm. Hãy nâng cấp để tạo thêm nhóm mới.`,
                cta: "bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 focus:ring-orange-300",
                box: "border-orange-200 bg-white/80"
            }
            : status === "near"
                ? {
                    wrapper:
                        "border-amber-200 bg-gradient-to-br from-[#FFF9ED] via-[#FFF6E8] to-[#FFFDF8]",
                    badge: "bg-amber-100 text-amber-700 ring-amber-200",
                    barBg: "bg-amber-100",
                    barFg: "bg-gradient-to-r from-amber-400 to-orange-500",
                    title: "Sắp chạm giới hạn nhóm",
                    hint: `Bạn đang sử dụng ${current}/${max} nhóm. Có thể cần nâng cấp sớm để tránh bị giới hạn.`,
                    cta: "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 focus:ring-amber-300",
                    box: "border-amber-200 bg-white/80"
                }
                : status === "unlimited"
                    ? {
                        wrapper:
                            "border-emerald-200 bg-gradient-to-br from-[#F1FFF8] via-[#ECFFF7] to-[#F8FFFC]",
                        badge: "bg-emerald-100 text-emerald-700 ring-emerald-200",
                        barBg: "bg-emerald-100",
                        barFg: "bg-gradient-to-r from-emerald-400 to-teal-500",
                        title: "Không giới hạn nhóm",
                        hint: "Gói hiện tại cho phép bạn tạo nhóm không giới hạn.",
                        cta: "",
                        box: "border-emerald-200 bg-white/80"
                    }
                    : {
                        wrapper:
                            "border-[#E9DED2] bg-gradient-to-br from-[#FAF7F2] via-[#F7F3EE] to-[#FFF7F0]",
                        badge: "bg-orange-100 text-orange-700 ring-orange-200",
                        barBg: "bg-[#E9E2DA]",
                        barFg: "bg-gradient-to-r from-orange-400 to-rose-500",
                        title: "Tình trạng sử dụng",
                        hint: `Bạn đang sử dụng ${current}/${max} nhóm. Bạn có thể nâng cấp để tăng giới hạn.`,
                        cta: "bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-300",
                        box: "border-[#E7DED4] bg-white/85"
                    };

    const badgeText =
        status === "full" ? "Đã đầy" : status === "near" ? "Gần đầy" : status === "unlimited" ? "PRO" : "Đang dùng";

    const remaining = !isUnlimited ? Math.max(0, max - current) : null;

    return (
        <div
            className={[
                "mt-4 w-full rounded-3xl border p-5 shadow-[0_10px_30px_-14px_rgba(15,23,42,0.15)]",
                "transition-colors duration-200",
                tone.wrapper
            ].join(" ")}>
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{tone.title}</p>

                        <span
                            className={[
                                "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
                                tone.badge
                            ].join(" ")}>
                            {badgeText}
                        </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-600">{tone.hint}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span
                            className={[
                                "inline-flex items-center rounded-xl border px-3 py-1.5 text-slate-800 shadow-sm",
                                tone.box
                            ].join(" ")}>
                            Hiện có: <span className="ml-1 font-semibold">{current}</span>
                        </span>

                        <span
                            className={[
                                "inline-flex items-center rounded-xl border px-3 py-1.5 text-slate-800 shadow-sm",
                                tone.box
                            ].join(" ")}>
                            Tối đa: <span className="ml-1 font-semibold">{isUnlimited ? "∞" : max}</span>
                        </span>

                        {!isUnlimited ? (
                            <span
                                className={[
                                    "inline-flex items-center rounded-xl border px-3 py-1.5 text-slate-800 shadow-sm",
                                    tone.box
                                ].join(" ")}>
                                Còn trống: <span className="ml-1 font-semibold">{remaining}</span>
                            </span>
                        ) : null}
                    </div>
                </div>
            </div>

            <div className="mt-4">
                <div className={["h-3 w-full rounded-full overflow-hidden", tone.barBg].join(" ")}>
                    <div
                        className={[
                            "relative h-full rounded-full transition-[width] duration-300 ease-out",
                            tone.barFg
                        ].join(" ")}
                        style={{ width: `${pct}%` }}>
                        <span className="pointer-events-none absolute inset-0 opacity-25 [background:linear-gradient(90deg,transparent,rgba(255,255,255,.85),transparent)]" />
                    </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-600">
                        {isUnlimited ? (
                            <>Bạn có thể tạo thêm nhóm bất kỳ lúc nào.</>
                        ) : isFull ? (
                            <>
                                Bạn đã dùng hết <span className="font-semibold text-slate-900">{max}</span> nhóm trong
                                gói hiện tại.
                            </>
                        ) : (
                            <>
                                Bạn còn <span className="font-semibold text-slate-900">{remaining}</span> nhóm có thể
                                tạo.
                            </>
                        )}
                    </p>

                    {!isUnlimited && (isNear || isFull) ? (
                        <button
                            type="button"
                            className={[
                                "inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold",
                                "shadow-sm transition focus:outline-none focus:ring-4",
                                tone.cta
                            ].join(" ")}>
                            Nâng cấp gói
                            <span className="ml-2 text-white/80">→</span>
                        </button>
                    ) : null}
                </div>

                {!isUnlimited && isFull ? (
                    <div className="mt-4 rounded-2xl border border-orange-200/80 bg-white/70 p-4">
                        <p className="text-sm text-slate-700">
                            Nâng cấp để tăng giới hạn nhóm và mở rộng thêm không gian học tập mới.
                        </p>
                    </div>
                ) : null}
            </div>
        </div>
    );
}