import { ArrowUpRight, Infinity, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

export function UsageBar({ current, max }: { current: number; max: number }) {
    const t = useTranslations("UsageBar");
    const router = useRouter();
    const locale = useLocale();
    const isUnlimited = max <= 0;
    const safeMax = isUnlimited ? 1 : Math.max(1, max);
    const ratio = isUnlimited ? 1 : current / safeMax;
    const pct = isUnlimited ? 100 : Math.max(0, Math.min(100, Math.round(ratio * 100)));

    const isFull = !isUnlimited && current >= max;
    const isNear = !(isUnlimited || isFull) && pct >= 80;

    const status = isUnlimited ? "unlimited" : isFull ? "full" : isNear ? "near" : "ok";

    const tone =
        status === "full"
            ? {
                  shell: "from-[#FFF6EF] via-[#FFF8F4] to-[#FFF3EC]",
                  border: "border-orange-200/80",
                  badge: "bg-orange-100 text-orange-700 ring-orange-200/80",
                  glowA: "bg-orange-200/40",
                  glowB: "bg-rose-200/30",
                  progressWrap: "bg-orange-100/80",
                  progressBar: "from-orange-500 via-orange-500 to-rose-500",
                  progressGlow: "shadow-[0_0_24px_rgba(249,115,22,0.35)]",
                  statBox: "border-orange-200/70 bg-white/78",
                  title: t("limitReached"),
                  hint: t("limitReachedHint", { usage: current, max }),
                  cta: "from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600",
                  soft: "bg-orange-50/90 text-orange-700"
              }
            : status === "near"
              ? {
                    shell: "from-[#FFF9ED] via-[#FFF8F1] to-[#FFFDF8]",
                    border: "border-amber-200/80",
                    badge: "bg-amber-100 text-amber-700 ring-amber-200/80",
                    glowA: "bg-amber-200/40",
                    glowB: "bg-orange-200/25",
                    progressWrap: "bg-amber-100/80",
                    progressBar: "from-amber-400 via-orange-400 to-orange-500",
                    progressGlow: "shadow-[0_0_24px_rgba(245,158,11,0.30)]",
                    statBox: "border-amber-200/70 bg-white/78",
                    title: t("nearLimit"),
                    hint: t("nearLimitHint", { usage: current, max }),
                    cta: "from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600",
                    soft: "bg-amber-50/90 text-amber-700"
                }
              : status === "unlimited"
                ? {
                      shell: "from-[#F1FFF8] via-[#F5FFFB] to-[#F8FFFC]",
                      border: "border-emerald-200/80",
                      badge: "bg-emerald-100 text-emerald-700 ring-emerald-200/80",
                      glowA: "bg-emerald-200/35",
                      glowB: "bg-teal-200/25",
                      progressWrap: "bg-emerald-100/80",
                      progressBar: "from-emerald-400 via-emerald-500 to-teal-500",
                      progressGlow: "shadow-[0_0_24px_rgba(16,185,129,0.28)]",
                      statBox: "border-emerald-200/70 bg-white/78",
                      title: t("unlimited"),
                      hint: t("unlimitedHint"),
                      cta: "",
                      soft: "bg-emerald-50/90 text-emerald-700"
                  }
                : {
                      shell: "from-[#FAF7F2] via-[#FBF8F5] to-[#FFF8F1]",
                      border: "border-[#E9DED2]",
                      badge: "bg-orange-100 text-orange-700 ring-orange-200/80",
                      glowA: "bg-orange-100/35",
                      glowB: "bg-rose-100/20",
                      progressWrap: "bg-[#E9E2DA]",
                      progressBar: "from-orange-400 via-orange-400 to-rose-500",
                      progressGlow: "shadow-[0_0_20px_rgba(251,146,60,0.22)]",
                      statBox: "border-[#E7DED4] bg-white/82",
                      title: t("usage"),
                      hint: t("normalHint", { usage: current, max }),
                      cta: "from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700",
                      soft: "bg-orange-50/90 text-orange-700"
                  };

    const badgeText =
        status === "full"
            ? t("badgeFull")
            : status === "near"
              ? t("badgeNear")
              : status === "unlimited"
                ? t("badgeUnlimited")
                : t("badgeInUse");

    const remaining = !isUnlimited ? Math.max(0, max - current) : null;

    const stats = [
        { label: t("currentLabel"), value: current },
        { label: t("maxLabel"), value: isUnlimited ? "∞" : max },
        ...(isUnlimited ? [] : [{ label: t("remainingLabel"), value: remaining }])
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={[
                "relative mt-4 w-full overflow-hidden rounded-[30px] border p-5 md:p-6",
                "bg-gradient-to-br shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl",
                tone.shell,
                tone.border
            ].join(" ")}>
            <div
                className={[
                    "pointer-events-none absolute -left-8 top-0 h-28 w-28 rounded-full blur-3xl",
                    tone.glowA
                ].join(" ")}
            />
            <div
                className={[
                    "pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full blur-3xl",
                    tone.glowB
                ].join(" ")}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" />

            <div className="relative flex flex-col gap-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/70 bg-white/75 shadow-sm backdrop-blur">
                                {isUnlimited ? (
                                    <Infinity className="h-4.5 w-4.5 text-emerald-600" />
                                ) : (
                                    <Sparkles className="h-4.5 w-4.5 text-orange-500" />
                                )}
                            </div>

                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold text-[#1F2937] text-[15px] md:text-base">
                                        {tone.title}
                                    </p>
                                    <span
                                        className={[
                                            "inline-flex items-center rounded-full px-2.5 py-1 font-semibold text-[11px] ring-1 ring-inset shadow-sm",
                                            tone.badge
                                        ].join(" ")}>
                                        {badgeText}
                                    </span>
                                </div>
                                <p className="mt-1 text-[#667085] text-sm leading-6">{tone.hint}</p>
                            </div>
                        </div>
                    </div>

                    <div className="shrink-0">
                        <div className="inline-flex items-center rounded-full border border-white/80 bg-white/80 px-3 py-1.5 font-semibold text-[#5B4A3E] text-xs shadow-sm backdrop-blur">
                            {isUnlimited ? t("unlimitedText") : `${pct}${t("percentUsed")}`}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    {stats.map((item, index) => (
                        <motion.div
                            key={item.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.28, delay: index * 0.05 }}
                            whileHover={{ y: -2 }}
                            className={[
                                "rounded-2xl border px-4 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)] backdrop-blur transition-all",
                                tone.statBox
                            ].join(" ")}>
                            <p className="text-[#8A7A6D] text-xs">{item.label}</p>
                            <p className="mt-1 font-semibold text-[#1F2937] text-lg">{item.value}</p>
                        </motion.div>
                    ))}
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-[#8A7A6D]">
                        <span>{t("usageLevel")}</span>
                        <span>{isUnlimited ? t("unlimitedText") : t("usageAmount", { current, max })}</span>
                    </div>

                    <div className={["relative h-4 w-full overflow-hidden rounded-full", tone.progressWrap].join(" ")}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                            className={[
                                "relative h-full rounded-full bg-gradient-to-r",
                                tone.progressBar,
                                tone.progressGlow
                            ].join(" ")}>
                            <span className="pointer-events-none absolute inset-0 opacity-40 [background:linear-gradient(90deg,transparent,rgba(255,255,255,.9),transparent)]" />
                        </motion.div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="rounded-2xl border border-white/70 bg-white/60 px-4 py-3 text-sm text-[#5F6C7B] shadow-sm backdrop-blur">
                        {isUnlimited ? (
                            <>{t("canCreateMessage")}</>
                        ) : isFull ? (
                            <>{t("fullGroupsMessage", { max })}</>
                        ) : (
                            <>{t("remainingGroupsMessage", { remaining: remaining ?? 0 })}</>
                        )}
                    </div>

                    {!isUnlimited && (isNear || isFull) ? (
                        <motion.button
                            whileHover={{ y: -1, scale: 1.01 }}
                            whileTap={{ scale: 0.985 }}
                            type="button"
                            onClick={() => router.push(`/${locale}/settings/billing`)}
                            className={[
                                "inline-flex items-center justify-center rounded-2xl bg-gradient-to-r px-4 py-2.5 font-semibold text-sm text-white",
                                "shadow-[0_14px_28px_rgba(15,23,42,0.12)] transition focus:outline-none focus:ring-4",
                                tone.cta
                            ].join(" ")}>
                            {t("upgradeButton")}
                            <ArrowUpRight className="ml-2 h-4 w-4" />
                        </motion.button>
                    ) : null}
                </div>

                {!isUnlimited && isFull ? (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-[22px] border border-orange-200/70 bg-white/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur">
                        <p className="text-[#5F6C7B] text-sm leading-6">{t("usageNote")}</p>
                    </motion.div>
                ) : null}
            </div>
        </motion.div>
    );
}
