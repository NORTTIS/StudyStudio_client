"use client";

import { Bell, Search } from "lucide-react";

interface HeaderProps {
  /**
   * User initials to display in avatar
   */
  userInitials: string;
}

/**
 * Common header component with search and user avatar
 */
export function Header({ userInitials }: HeaderProps) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full max-w-[420px]">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#8A8A8A]" />
        <input
          type="search"
          placeholder="Search studios, tasks..."
          className="h-10 w-full rounded-full border border-[#E0E0E0] bg-white pr-4 pl-10 text-[#261E33] text-sm shadow-sm outline-none focus:border-[#4C6AA8]"
          aria-label="Search tasks"
        />
      </div>
      <div className="flex items-center justify-between gap-3 lg:justify-end">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E0E0E0] bg-white text-[#6F6B99] shadow-sm"
          aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4C6AA8] font-semibold text-white text-xs">
          {userInitials}
        </div>
      </div>
    </header>
  );
}
