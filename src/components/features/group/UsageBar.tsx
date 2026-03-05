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
                  wrapper: "border-orange-200 bg-orange-50/70",
                  badge: "bg-orange-100 text-orange-700 ring-orange-200",
                  barBg: "bg-orange-100",
                  barFg: "bg-orange-500",
                  title: "Đã đạt giới hạn nhóm",
                  hint: `Bạn đang dùng ${current}/${max} nhóm. Muốn tạo thêm nhóm, hãy nâng cấp gói.`,
                  cta: "bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-300"
              }
            : status === "near"
              ? {
                    wrapper: "border-amber-200 bg-amber-50/60",
                    badge: "bg-amber-100 text-amber-700 ring-amber-200",
                    barBg: "bg-amber-100",
                    barFg: "bg-amber-500",
                    title: "Sắp chạm giới hạn nhóm",
                    hint: `Bạn đang dùng ${current}/${max} nhóm. Nâng cấp để tạo thêm nhóm.`,
                    cta: "bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-300"
                }
              : status === "unlimited"
                ? {
                      wrapper: "border-emerald-200 bg-emerald-50/60",
                      badge: "bg-emerald-100 text-emerald-700 ring-emerald-200",
                      barBg: "bg-emerald-100",
                      barFg: "bg-emerald-500",
                      title: "Không giới hạn nhóm",
                      hint: "Gói hiện tại không giới hạn số nhóm bạn có thể tạo.",
                      cta: ""
                  }
                : {
                      wrapper: "border-[#EAE9F2] bg-white",
                      badge: "bg-orange-100 text-orange-700 ring-orange-200",
                      barBg: "bg-orange-100",
                      barFg: "bg-orange-500",
                      title: "Tình trạng sử dụng",
                      hint: `Bạn đang dùng ${current}/${max} nhóm. Bạn có thể nâng cấp để tăng giới hạn.`,
                      cta: "bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-300"
                  };

    const badgeText =
        status === "full" ? "ĐẦY" : status === "near" ? "GẦN ĐẦY" : status === "unlimited" ? "PRO" : "ĐANG DÙNG";

    const remaining = !isUnlimited ? Math.max(0, max - current) : null;

    return (
        <div
            className={[
                "mt-4 w-full rounded-2xl border p-5 shadow-sm",
                "transition-colors duration-200",
                tone.wrapper
            ].join(" ")}>
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[#261E33]">{tone.title}</p>

                        <span
                            className={[
                                "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
                                "ring-1 ring-inset",
                                tone.badge
                            ].join(" ")}>
                            {badgeText}
                        </span>
                    </div>

                    <p className="mt-1 text-sm text-[#6F6B99]">{tone.hint}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center rounded-xl border border-[#EAE9F2] bg-white/70 px-3 py-1 text-[#261E33]">
                            Tối đa: <span className="ml-1 font-semibold">{isUnlimited ? "∞" : max}</span>
                        </span>
                        <span className="inline-flex items-center rounded-xl border border-[#EAE9F2] bg-white/70 px-3 py-1 text-[#261E33]">
                            Hiện có: <span className="ml-1 font-semibold">{current}</span>
                        </span>
                        {!isUnlimited ? (
                            <span className="inline-flex items-center rounded-xl border border-[#EAE9F2] bg-white/70 px-3 py-1 text-[#261E33]">
                                Còn trống: <span className="ml-1 font-semibold">{remaining}</span>
                            </span>
                        ) : null}
                    </div>
                </div>

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
                    {!isUnlimited ? <p className="mt-0.5 text-xs text-[#6F6B99]">{pct}%</p> : null}
                </div>
            </div>

            <div className="mt-4">
                <div className={["h-2.5 w-full rounded-full", tone.barBg].join(" ")}>
                    <div
                        className={[
                            "relative h-2.5 rounded-full",
                            "transition-[width] duration-300 ease-out",
                            tone.barFg
                        ].join(" ")}
                        style={{ width: `${pct}%` }}>
                        <span className="pointer-events-none absolute inset-0 rounded-full opacity-25 [background:linear-gradient(90deg,transparent,rgba(255,255,255,.85),transparent)]" />
                    </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-[#6F6B99]">
                        {isUnlimited ? (
                            <>Bạn có thể tạo thêm nhóm bất kỳ lúc nào.</>
                        ) : isFull ? (
                            <>
                                Bạn đã dùng hết <span className="font-semibold text-[#261E33]">{max}</span> nhóm. Nâng
                                cấp để tạo thêm.
                            </>
                        ) : (
                            <>
                                Bạn còn <span className="font-semibold text-[#261E33]">{remaining}</span> nhóm có thể
                                tạo.
                            </>
                        )}
                    </p>

                    {!isUnlimited && (isNear || isFull) ? (
                        <button
                            type="button"
                            className={[
                                "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold",
                                "shadow-sm transition",
                                "focus:outline-none focus:ring-2",
                                tone.cta
                            ].join(" ")}>
                            Nâng cấp gói
                            <span className="ml-2 text-white/80">→</span>
                        </button>
                    ) : null}
                </div>

                {!isUnlimited && isFull ? (
                    <div className="mt-3 rounded-xl border border-orange-200 bg-white/70 p-3">
                        <p className="text-sm text-[#261E33]">
                            Nâng cấp để tăng giới hạn nhóm và tạo thêm không gian học tập mới.
                        </p>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
