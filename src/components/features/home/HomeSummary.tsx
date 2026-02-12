import { Calendar, ChevronDown, Plus } from "lucide-react";
import type { StatusChip } from "@/components/features/home/types";

interface HomeSummaryProps {
  statusChips: StatusChip[];
}

export function HomeSummary({ statusChips }: HomeSummaryProps) {
  return (
    <section className="mt-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-semibold text-2xl">Bảng điều khiển</h1>
          <p className="text-[#6F6B99] text-sm">Tổng quan công việc và hoạt động của bạn</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-[#E0E0E0] bg-white px-3 py-2 font-medium text-[#261E33] text-xs shadow-sm">
            <Calendar className="h-4 w-4 text-[#6F6B99]" />
            Calendar
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-[#4C6AA8] px-4 py-2 font-semibold text-white text-xs shadow-sm">
            <Plus className="h-4 w-4" />
            New Task
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {statusChips.map((chip) => (
          <div
            key={chip.label}
            className="inline-flex items-center gap-2 rounded-full border border-[#E0E0E0] bg-white px-3 py-1 font-medium text-[#261E33] text-xs shadow-sm">
            {chip.label}
            <span className="rounded-full bg-[#F1F1F1] px-2 py-[2px] text-[#6F6B99] text-[11px]">{chip.count}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-[#E0E0E0] bg-white px-3 py-2 text-[#261E33] text-xs shadow-sm">
          All Group
          <ChevronDown className="h-3 w-3 text-[#6F6B99]" />
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-[#E0E0E0] bg-white px-3 py-2 text-[#261E33] text-xs shadow-sm">
          <span>More Filters</span>
        </button>
      </div>
    </section>
  );
}
