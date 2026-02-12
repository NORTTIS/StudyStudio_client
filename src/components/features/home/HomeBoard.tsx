"use client";

import {
  Clock,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Plus,
} from "lucide-react";
import { useState } from "react";
import type { BoardSection, TaskPriority } from "@/components/features/home/types";

interface HomeBoardProps {
  sections: BoardSection[];
}

const priorityClasses: Record<TaskPriority, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-orange-100 text-orange-600",
  high: "bg-red-100 text-red-600",
  urgent: "bg-red-600 text-white",
};

export function HomeBoard({ sections }: HomeBoardProps) {
  const [openColumn, setOpenColumn] = useState<string | null>(null);

  return (
    <div className="mt-8 space-y-12">
      {sections.map((section) => (
        <section key={section.title}>
          <h2 className="mb-4 text-sm font-semibold text-gray-400 uppercase tracking-wide">
            {section.title}
          </h2>

          <div className="flex items-start gap-6 overflow-x-auto pb-4">
            {section.columns.map((column) => (
              <div
                key={column.name}
                className="min-w-[300px] max-w-[300px] rounded-2xl border border-gray-200 bg-[#F7F7F7]"
              >
                {/* Column Header */}
                {/* Column Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-white rounded-t-2xl">

                  {/* Title + Count inline */}
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {column.name}
                    </p>

                    {/* Count Badge */}
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-100 px-2 text-[11px] font-medium text-gray-500">
                      {column.count}
                    </span>
                  </div>

                  {/* Plus Button */}
                  <button
                    type="button"
                    onClick={() =>
                      setOpenColumn(openColumn === column.name ? null : column.name)
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Task List */}
                <div className="space-y-4 px-4 py-4">
                  {/* Create Task UI */}
                  {openColumn === column.name && (
                    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                      <input
                        type="text"
                        placeholder="Nhập tên công việc..."
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />

                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          onClick={() => setOpenColumn(null)}
                          className="rounded-md px-3 py-1 text-xs text-gray-500 hover:bg-gray-100"
                        >
                          Hủy
                        </button>
                        <button className="rounded-md bg-orange-500 px-3 py-1 text-xs font-semibold text-white hover:bg-orange-600">
                          Tạo
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Empty State */}
                  {column.tasks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-xs text-gray-400">
                      Không có công việc
                    </div>
                  ) : (
                    column.tasks.map((task) => (
                      <article
                        key={task.title}
                        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-gray-900">
                            {task.title}
                          </h3>

                          <button className="text-gray-400 hover:text-gray-600">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-2">
                          <span
                            className={`inline-flex rounded-md px-2 py-[2px] text-[10px] font-semibold ${priorityClasses[task.priority]}`}
                          >
                            {task.priority}
                          </span>
                        </div>

                        <div className="mt-4 flex items-center gap-4 text-[11px] text-gray-500">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {task.stats.comments ?? 0}
                          </span>

                          <span className="flex items-center gap-1">
                            <Paperclip className="h-3 w-3" />
                            {task.stats.attachments ?? 0}
                          </span>

                          {task.stats.date && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {task.stats.date}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 rounded-md bg-gray-100 px-2 py-1 text-[10px] text-gray-500">
                          {section.title}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
