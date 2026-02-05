import { Clock, MessageSquare, MoreHorizontal, Paperclip } from "lucide-react";
import type { BoardSection, TaskPriority } from "@/components/features/home/types";

interface HomeBoardProps {
  sections: BoardSection[];
}

const priorityClasses: Record<TaskPriority, string> = {
  low: "bg-[#E8F5E9] text-[#2E7D32]",
  medium: "bg-[#FFE0B2] text-[#E65100]",
  high: "bg-[#FFCDD2] text-[#C62828]",
  urgent: "bg-[#D32F2F] text-white"
};

export function HomeBoard({ sections }: HomeBoardProps) {
  return (
    <div className="mt-8 space-y-10">
      {sections.map((section) => (
        <section key={section.title}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[#261E33] text-sm">{section.title}</h2>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-4">
            {section.columns.map((column) => (
              <div key={column.name} className="space-y-3">
                <div className="flex items-center justify-between font-semibold text-[#6F6B99] text-[11px] uppercase tracking-wide">
                  <span>{column.name}</span>
                  <span>{column.count}</span>
                </div>

                <div className="space-y-3">
                  {column.tasks.length === 0 ? (
                    <div className="rounded-[12px] border border-[#E0E0E0] border-dashed bg-white px-4 py-6 text-center text-[#8A8A8A] text-xs">
                      No tasks
                    </div>
                  ) : (
                    column.tasks.map((task) => (
                      <article
                        key={task.title}
                        className="rounded-[12px] border border-[#E6E6E6] bg-white p-3 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-semibold text-[#261E33] text-sm">{task.title}</h3>
                          <button type="button" className="text-[#8A8A8A]" aria-label="Task options">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-[2px] font-semibold text-[10px] ${priorityClasses[task.priority]}`}>
                            {task.priority.toUpperCase()}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-[#6F6B99] text-[11px]">
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {task.stats.comments ?? 0}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Paperclip className="h-3 w-3" />
                            {task.stats.attachments ?? 0}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {task.stats.date}
                          </span>
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
