export default async function Page({
    params,
    searchParams
}: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ studioId?: string }>;
}) {
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;
    const isVi = resolvedParams.locale.startsWith("vi");
    const studioId = String(resolvedSearchParams.studioId ?? "").trim();
    const backHref = studioId ? `/${resolvedParams.locale}/master/${studioId}` : `/${resolvedParams.locale}/master`;

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-xl">
                <div className="mb-6 flex items-center justify-center gap-3">
                    <svg width="48" height="48" viewBox="0 0 64 64">
                        <path d="M32 6L2 20L32 34L62 20L32 6Z" fill="#F97316" />
                        <path d="M12 26V38C12 45 20 50 32 50C44 50 52 45 52 38V26L32 36L12 26Z" fill="#FB923C" />
                    </svg>
                    <span className="text-3xl font-bold leading-tight text-orange-500">
                        Study <br /> Studio
                    </span>
                </div>

                <h1 className="mb-2 font-bold text-2xl text-[#261E33]">
                    {isVi ? "Bạn không có thẩm quyền" : "You do not have permission"}
                </h1>
                <p className="mb-6 text-sm text-muted-foreground">
                    {isVi
                        ? "Bạn không có quyền truy cập trang AI của studio này."
                        : "You do not have permission to access this studio's AI page."}
                </p>

                <a
                    href={backHref}
                    className="inline-flex w-full items-center justify-center rounded-lg bg-orange-600 px-4 py-2.5 font-semibold text-white hover:bg-orange-700">
                    {isVi ? "Quay lại studio" : "Back to studio"}
                </a>
            </div>
        </div>
    );
}
