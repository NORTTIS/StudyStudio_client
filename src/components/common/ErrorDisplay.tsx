"use client";

interface ErrorDisplayProps {
  message?: string;
  title?: string;
}

/**
 * ErrorDisplay - Generic error component for displaying API failures
 * Used in Server Components when data fetching fails
 */
export default function ErrorDisplay({
  message = "Đã có lỗi xảy ra khi tải dữ liệu",
  title = "Có lỗi xảy ra"
}: ErrorDisplayProps) {
  return (
    <div className="flex min-h-100 items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-[#E26060]/20 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-[#E26060]/10">
          <svg className="size-8 text-[#E26060]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h2 className="mb-2 font-semibold text-[#261E33] text-xl">{title}</h2>

        <p className="mb-6 text-[#6F6B99] text-sm">{message}</p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-[#E26060] px-6 py-2.5 font-medium text-sm text-white transition-colors hover:bg-[#E26060]/90">
          Thử lại
        </button>
      </div>
    </div>
  );
}
