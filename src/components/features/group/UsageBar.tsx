export function UsageBar({ current, max }: { current: number; max: number }) {
    const safeMax = Math.max(1, max);
    const pct = Math.min(100, Math.round((current / safeMax) * 100));
    const isFull = current >= max && max > 0;

    return (
        <div
            className={`mt-4 w-full rounded-2xl border px-6 py-4 ${isFull ? "border-orange-200 bg-orange-50" : "border-[#E5E5E5] bg-white"
                }`}
        >
            {isFull ? (
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 grid h-8 w-8 place-items-center rounded-full bg-orange-100 text-orange-600">
                        <span className="text-lg leading-none">!</span>
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#261E33]">
                            Bạn đã đạt đến giới hạn {max} không gian nhóm trong gói miễn phí.
                        </p>
                        <p className="mt-1 text-sm text-[#6F6B99]">
                            <span className="font-semibold text-orange-600">Nâng cấp lên gói đăng ký</span>{" "}
                            để có thể tạo lên tới 10 không gian nhóm.
                        </p>

                        <p className="mt-4 text-sm text-[#261E33]">
                            <span className="font-semibold">{current}</span> / {max} không gian nhóm đang được sử dụng.
                        </p>

                        <div className="mt-3 h-2 w-full rounded-full bg-orange-100">
                            <div className="h-2 rounded-full bg-orange-500" style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <p className="text-xs text-[#6F6B99]">
                        <span className="font-semibold text-[#261E33]">{current}</span> / {max} không gian nhóm đang được sử dụng.
                    </p>

                    <div className="mt-2 h-2 w-full rounded-full bg-orange-100">
                        <div className="h-2 rounded-full bg-orange-500" style={{ width: `${pct}%` }} />
                    </div>
                </>
            )}
        </div>
    );
}