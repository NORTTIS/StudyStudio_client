"use client";

import { Plus } from "lucide-react";
import { Container } from "@/components/common";

function Column({ title, count }: { title: string; count?: number }) {
    return (
        <div className="min-w-[280px] max-w-[280px] rounded-xl border bg-white">
            <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#261E33] text-sm">{title}</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="grid h-6 min-w-6 place-items-center rounded-md border bg-[#FAFAFA] px-2 text-[#6F6B99] text-xs">
                        {count ?? 0}
                    </span>
                    <button type="button" className="grid h-7 w-7 place-items-center rounded-md hover:bg-[#F6F5FF]">
                        <span className="text-[#6F6B99] text-lg leading-none">…</span>
                    </button>
                </div>
            </div>

            <div className="px-3 pb-3">
                <div className="rounded-lg border border-dashed bg-white p-2">
                    <div className="rounded-lg border bg-white p-3 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-[#261E33] text-sm">Thiết lập hệ thống thiết kế</p>
                            <button type="button" className="grid h-7 w-7 place-items-center rounded-md hover:bg-[#F6F5FF]">
                                <span className="text-[#6F6B99] text-lg leading-none">…</span>
                            </button>
                        </div>

                        <div className="mt-2 flex items-center gap-2 text-[#6F6B99] text-xs">
                            <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
                            <span>BL</span>
                            <span className="h-4 w-px bg-[#E5E5E5]" />
                            <span>YR</span>
                        </div>

                        <div className="mt-2 rounded-md border bg-[#FAFAFA] px-2 py-1 text-[#6F6B99] text-xs">
                            Hạn hoàn thành: 20-11-2025
                        </div>
                    </div>

                    <button
                        type="button"
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border bg-white py-2 text-[#261E33] text-sm hover:bg-[#FAFAFA]">
                        <Plus className="h-4 w-4" />
                        Thêm công việc
                    </button>
                </div>
            </div>
        </div>
    );
}

export function GroupBoardScreen() {
    return (
        <div className="min-h-[calc(100vh-0px)] bg-[#FAFAFA]">
            <Container>
                <div className="mt-4 flex gap-4 overflow-x-auto pb-4">
                    <Column title="Cần làm" count={2} />
                    <Column title="Đang thực hiện" count={2} />
                    <Column title="Đang xem xét" count={2} />
                    <Column title="Hoàn thành" count={2} />

                    <div className="min-w-[280px] max-w-[280px]">
                        <button
                            type="button"
                            className="w-full rounded-xl border bg-white px-4 py-3 text-left font-medium text-[#261E33] text-sm hover:bg-[#FAFAFA]">
                            Tạo cột mới +
                        </button>
                    </div>
                </div>
            </Container>
        </div>
    );
}
