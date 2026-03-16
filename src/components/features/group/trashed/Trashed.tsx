"use client";

import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Filter,
    MoreHorizontal,
    RotateCcw,
    Search,
    Trash2,
    X
} from "lucide-react";
import { useParams } from "next/navigation";
import * as React from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Container } from "@/components/common";

// ─── Shared helpers ───────────────────────────────────────────────────────────

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function parseDateString(value?: string) {
    if (!value) return undefined;
    const [y, m, d] = value.split("-").map(Number);
    if (!y || !m || !d) return undefined;
    return new Date(y, m - 1, d);
}

function formatDateToInputValue(date?: Date) {
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function addDays(date: Date, amount: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
}

function startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateDisplay(value?: string) {
    const date = parseDateString(value);
    if (!date) return "Select a date";

    const today = startOfDay(new Date());
    const target = startOfDay(date);
    const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";

    return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: target.getFullYear() !== today.getFullYear() ? "numeric" : undefined
    }).format(target);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ApiResponse<T> = {
    status?: string;
    code?: string | null;
    message?: string | null;
    data?: T;
};

type TaskDeleteResponse = {
    deletedBy?: string;
    deletedOn?: string;
    deleteTaskId?: string;
    taskName?: string | null;
};

type GroupMemberDto = {
    userId?: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
    role?: string | null;
    joinedAt?: string;
};

type GroupMemberListResponse = {
    groupId?: string;
    groupName?: string | null;
    members?: GroupMemberDto[] | null;
    totalMembers?: number;
};

type TrashItem = {
    id: string;
    rowKey: string;
    name: string;
    type: "Task";
    deletedOn: string;
    deletedOnRaw?: string;
    deletedBy?: string | null;
    deletedByName?: string | null;
};

type DeletedByOption = {
    id: string;
    name: string;
};

type FilterView = "root" | "deletedBy" | "deletedDate";

type DeletedDateFilter = {
    startDate: string;
    endDate: string;
};

// ─── API helpers ──────────────────────────────────────────────────────────────

function isUuidLike(v: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

const readText = async (res: Response) => {
    try {
        return await res.text();
    } catch {
        return "";
    }
};

function parseMaybeJson(raw: string) {
    const text = (raw ?? "").toString().trim();
    if (!text) return { json: null as any, text: "" };
    try {
        const cleaned = text.replace(/^\uFEFF/, "");
        return { json: JSON.parse(cleaned), text };
    } catch {
        return { json: null as any, text };
    }
}

const okByJsonStatus = (obj: any) => {
    const s = String(obj?.status ?? "").toLowerCase();
    return s === "" || s === "success" || s === "ok" || s === "true";
};

const extractApiMessage = (text: string, json: any) => {
    const msg = (json?.message ?? "").toString().trim();
    if (msg) return msg;
    const t = (text ?? "").toString().trim();
    return t || "Đã xảy ra lỗi";
};

function getApiBase() {
    const raw = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    return String(raw).replace(/\/+$/, "");
}

function apiUrl(path: string) {
    const base = getApiBase();
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    if (!base) return cleanPath;
    if (base.endsWith("/api")) return `${base}${cleanPath}`;
    return `${base}/api${cleanPath}`;
}

function getAccessTokenOrNull() {
    if (typeof window === "undefined") return null;
    const t = localStorage.getItem("accessToken");
    return t ? String(t) : null;
}

async function apiFetchJson<T>(input: RequestInfo, init: RequestInit): Promise<ApiResponse<T> | null> {
    const res = await fetch(input, init);
    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);

    if (!res.ok || (json && !okByJsonStatus(json))) {
        throw new Error(extractApiMessage(raw, json));
    }

    return (json ?? null) as ApiResponse<T> | null;
}

async function apiPermanentDeleteTask(args: { groupId: string; taskId: string }) {
    const apiBase = getApiBase();
    const token = getAccessTokenOrNull();

    if (!apiBase) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");
    if (!(args.groupId && isUuidLike(args.groupId))) throw new Error("groupId không hợp lệ.");
    if (!(args.taskId && isUuidLike(args.taskId))) throw new Error("taskId không hợp lệ.");

    const url = apiUrl(`/Task/${encodeURIComponent(args.groupId)}/${encodeURIComponent(args.taskId)}/permanent`);

    await apiFetchJson<unknown>(url, {
        method: "DELETE",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
    });

    return true;
}

async function apiGetDeletedTasks(groupId: string) {
    const apiBase = getApiBase();
    const token = getAccessTokenOrNull();

    if (!apiBase) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");
    if (!(groupId && isUuidLike(groupId))) throw new Error("groupId không hợp lệ.");

    const url = apiUrl(`/Task/${encodeURIComponent(groupId)}/deleted-task`);

    return apiFetchJson<TaskDeleteResponse[]>(url, {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        cache: "no-store"
    });
}

async function apiGetGroupMembers(groupId: string) {
    const apiBase = getApiBase();
    const token = getAccessTokenOrNull();

    if (!apiBase) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");
    if (!(groupId && isUuidLike(groupId))) throw new Error("groupId không hợp lệ.");

    const url = apiUrl(`/group/${encodeURIComponent(groupId)}/members`);

    return apiFetchJson<GroupMemberListResponse>(url, {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        cache: "no-store"
    });
}

async function apiRestoreTask(args: { groupId: string; taskId: string }) {
    const apiBase = getApiBase();
    const token = getAccessTokenOrNull();

    if (!apiBase) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");
    if (!(args.groupId && isUuidLike(args.groupId))) throw new Error("groupId không hợp lệ.");
    if (!(args.taskId && isUuidLike(args.taskId))) throw new Error("taskId không hợp lệ.");

    const url = apiUrl(`/Task/${encodeURIComponent(args.groupId)}/${encodeURIComponent(args.taskId)}/restore`);

    await apiFetchJson<unknown>(url, {
        method: "PUT",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
    });

    return true;
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function formatDeletedOn(input?: string | null) {
    const s = String(input ?? "").trim();
    if (!s) return "--";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    }).format(d);
}

function buildFullName(firstName?: string | null, lastName?: string | null, fallback?: string | null) {
    const full = `${firstName ?? ""} ${lastName ?? ""}`.trim();
    if (full) return full;
    return String(fallback ?? "").trim();
}

function getInitials(input?: string | null) {
    const raw = String(input ?? "").trim();
    if (!raw) return "?";
    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function normalizeText(input?: string | null) {
    return String(input ?? "")
        .toLocaleLowerCase("vi-VN")
        .trim();
}

function matchDeletedDate(raw?: string | null, filter?: DeletedDateFilter | null) {
    if (!filter) return true;
    const { startDate, endDate } = filter;
    if (!startDate && !endDate) return true;
    const s = String(raw ?? "").trim();
    if (!s) return false;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return false;
    const dateOnly = formatDateToInputValue(startOfDay(d));
    if (startDate && dateOnly < startDate) return false;
    if (endDate && dateOnly > endDate) return false;
    return true;
}

// ─── Avatar helpers ───────────────────────────────────────────────────────────

const avatarTones = ["bg-blue-500", "bg-violet-500", "bg-amber-500", "bg-emerald-500", "bg-rose-500", "bg-cyan-500"];

function pickAvatarTone(seed: string) {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    return avatarTones[Math.abs(hash) % avatarTones.length];
}

// ─── TrelloDatePicker (copied from file 3) ────────────────────────────────────

const monthOptions = [
    { value: "0", label: "January" },
    { value: "1", label: "February" },
    { value: "2", label: "March" },
    { value: "3", label: "April" },
    { value: "4", label: "May" },
    { value: "5", label: "June" },
    { value: "6", label: "July" },
    { value: "7", label: "August" },
    { value: "8", label: "September" },
    { value: "9", label: "October" },
    { value: "10", label: "November" },
    { value: "11", label: "December" }
] as const;

type PopupPosition = {
    top: number;
    left: number;
    width: number;
};

type TrelloDatePickerProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    min?: string;
    max?: string;
};

function TrelloDatePicker({ label, value, onChange, min, max }: TrelloDatePickerProps) {
    const [open, setOpen] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);
    const [popupPosition, setPopupPosition] = React.useState<PopupPosition | null>(null);

    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const triggerRef = React.useRef<HTMLButtonElement | null>(null);

    const selectedDate = React.useMemo(() => parseDateString(value), [value]);
    const minDate = React.useMemo(() => parseDateString(min), [min]);
    const maxDate = React.useMemo(() => parseDateString(max), [max]);

    const initialMonth = React.useMemo(() => selectedDate ?? minDate ?? new Date(), [selectedDate, minDate]);
    const [month, setMonth] = React.useState<Date>(initialMonth);

    React.useEffect(() => setMounted(true), []);

    React.useEffect(() => {
        if (open) {
            setMonth(selectedDate ?? minDate ?? new Date());
        }
    }, [open, selectedDate, minDate]);

    const updatePopupPosition = React.useCallback(() => {
        const trigger = triggerRef.current;
        if (!trigger) return;

        const rect = trigger.getBoundingClientRect();
        const popupWidth = 420;
        const popupHeight = 560;
        const gap = 8;
        const viewportPadding = 12;

        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const shouldOpenUp = spaceBelow < popupHeight && spaceAbove > spaceBelow;

        let top = shouldOpenUp ? rect.top - popupHeight - gap : rect.bottom + gap;
        let left = rect.left;

        if (left + popupWidth > window.innerWidth - viewportPadding) {
            left = window.innerWidth - popupWidth - viewportPadding;
        }
        if (left < viewportPadding) left = viewportPadding;
        if (top < viewportPadding) top = viewportPadding;
        if (top + popupHeight > window.innerHeight - viewportPadding) {
            top = Math.max(viewportPadding, window.innerHeight - popupHeight - viewportPadding);
        }

        setPopupPosition({ top, left, width: popupWidth });
    }, []);

    React.useEffect(() => {
        if (!open) return;

        updatePopupPosition();

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            const popup = rootRef.current;
            const trigger = triggerRef.current;
            if (popup?.contains(target)) return;
            if (trigger?.contains(target)) return;
            setOpen(false);
        };

        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };

        document.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("keydown", handleEsc);
        window.addEventListener("resize", updatePopupPosition);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("keydown", handleEsc);
            window.removeEventListener("resize", updatePopupPosition);
        };
    }, [open, updatePopupPosition]);

    const pickDate = (date?: Date) => {
        if (!date) return;
        const normalized = startOfDay(date);
        if (minDate && normalized < startOfDay(minDate)) return;
        if (maxDate && normalized > startOfDay(maxDate)) return;
        onChange(formatDateToInputValue(normalized));
        setOpen(false);
    };

    const yearOptions = React.useMemo(() => {
        const currentYear = new Date().getFullYear();
        const startYear = Math.min(minDate?.getFullYear() ?? currentYear - 5, currentYear - 5);
        const endYear = currentYear + 10;
        return Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
    }, [minDate]);

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setMonth(new Date(month.getFullYear(), Number(e.target.value), 1));
    };

    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setMonth(new Date(Number(e.target.value), month.getMonth(), 1));
    };

    const goPrevMonth = () => {
        const next = new Date(month.getFullYear(), month.getMonth() - 1, 1);
        if (minDate) {
            const minMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
            if (next < minMonth) return;
        }
        setMonth(next);
    };

    const goNextMonth = () => {
        setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
    };

    const isPrevDisabled = React.useMemo(() => {
        if (!minDate) return false;
        const prev = new Date(month.getFullYear(), month.getMonth() - 1, 1);
        const minMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
        return prev < minMonth;
    }, [month, minDate]);

    const isNextDisabled = React.useMemo(() => {
        if (!maxDate) return false;
        const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
        const maxMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
        return next > maxMonth;
    }, [month, maxDate]);

    const popup =
        mounted && open && popupPosition
            ? createPortal(
                  <div
                      ref={rootRef}
                      className="fixed z-[20000] rounded-[24px] border border-zinc-200 bg-white p-4 shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
                      style={{
                          top: popupPosition.top,
                          left: popupPosition.left,
                          width: popupPosition.width
                      }}>
                      {/* Month / Year selects */}
                      <div className="mb-4 flex items-center gap-3">
                          <div className="relative flex-1">
                              <select
                                  value={month.getMonth()}
                                  onChange={handleMonthChange}
                                  className="h-12 w-full appearance-none rounded-2xl border border-zinc-200 bg-white px-4 pr-10 text-base font-semibold text-zinc-800 outline-none hover:border-zinc-300 focus:border-orange-400">
                                  {monthOptions.map((item) => (
                                      <option key={item.value} value={item.value}>
                                          {item.label}
                                      </option>
                                  ))}
                              </select>
                              <ChevronRight className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-zinc-500" />
                          </div>

                          <div className="relative w-[140px]">
                              <select
                                  value={month.getFullYear()}
                                  onChange={handleYearChange}
                                  className="h-12 w-full appearance-none rounded-2xl border border-zinc-200 bg-white px-4 pr-10 text-base font-semibold text-zinc-800 outline-none hover:border-zinc-300 focus:border-orange-400">
                                  {yearOptions.map((year) => (
                                      <option key={year} value={year}>
                                          {year}
                                      </option>
                                  ))}
                              </select>
                              <ChevronRight className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-zinc-500" />
                          </div>
                      </div>

                      {/* Calendar grid */}
                      <div className="rounded-[20px] border border-zinc-200 p-4">
                          <div className="mb-4 flex items-center justify-between">
                              <button
                                  type="button"
                                  onClick={goPrevMonth}
                                  disabled={isPrevDisabled}
                                  className="grid h-11 w-11 place-items-center rounded-2xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40">
                                  <ChevronLeft className="h-5 w-5" />
                              </button>

                              <div className="text-[18px] font-bold text-zinc-900">
                                  {monthOptions[month.getMonth()]?.label} {month.getFullYear()}
                              </div>

                              <button
                                  type="button"
                                  onClick={goNextMonth}
                                  disabled={isNextDisabled}
                                  className="grid h-11 w-11 place-items-center rounded-2xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40">
                                  <ChevronRight className="h-5 w-5" />
                              </button>
                          </div>

                          <DayPicker
                              mode="single"
                              month={month}
                              onMonthChange={setMonth}
                              selected={selectedDate}
                              onSelect={pickDate}
                              disabled={
                                  maxDate && minDate
                                      ? { before: minDate, after: maxDate }
                                      : maxDate
                                        ? { after: maxDate }
                                        : minDate
                                          ? { before: minDate }
                                          : undefined
                              }
                              showOutsideDays
                              className="w-full"
                              styles={{
                                  day: { outline: "none", boxShadow: "none" },
                                  button: { outline: "none", boxShadow: "none" }
                              }}
                              classNames={{
                                  months: "flex w-full flex-col",
                                  month: "w-full space-y-3",
                                  month_caption: "hidden",
                                  caption: "hidden",
                                  caption_label: "hidden",
                                  nav: "hidden",
                                  table: "w-full border-collapse",
                                  month_grid: "w-full border-collapse",
                                  tbody: "w-full",
                                  weekdays: "flex w-full justify-between",
                                  weekday: "h-10 w-10 text-center text-[13px] font-semibold text-zinc-500",
                                  head_row: "flex w-full justify-between",
                                  head_cell: "h-10 w-10 text-center text-[13px] font-semibold text-zinc-500",
                                  weeks: "w-full",
                                  week: "mt-2 flex w-full justify-between",
                                  row: "mt-2 flex w-full justify-between",
                                  day: "h-10 w-10 p-0 text-center",
                                  cell: "h-10 w-10 p-0 text-center",
                                  day_button:
                                      "h-10 w-10 rounded-xl border-0 bg-transparent p-0 text-sm font-medium text-zinc-800 shadow-none outline-none ring-0 transition hover:bg-orange-50 focus:outline-none focus:ring-0",
                                  selected: "!bg-orange-500 !text-white rounded-xl",
                                  day_selected: "!bg-orange-500 !text-white hover:!bg-orange-500 hover:!text-white",
                                  today: "text-orange-600 font-bold",
                                  day_today: "text-orange-600 font-bold",
                                  outside: "opacity-30",
                                  day_outside: "opacity-30",
                                  disabled: "opacity-30",
                                  day_disabled: "opacity-30 cursor-not-allowed",
                                  hidden: "invisible",
                                  day_hidden: "invisible"
                              }}
                          />
                      </div>

                      {/* Quick shortcuts */}
                      <div className="mt-4 grid grid-cols-2 gap-3">
                          <button
                              type="button"
                              onClick={() => pickDate(new Date())}
                              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base font-semibold text-zinc-700 hover:bg-zinc-50">
                              Today
                          </button>

                          <button
                              type="button"
                              onClick={() => pickDate(addDays(new Date(), 1))}
                              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base font-semibold text-zinc-700 hover:bg-zinc-50">
                              Tomorrow
                          </button>

                          <button
                              type="button"
                              onClick={() => pickDate(addDays(new Date(), 7))}
                              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base font-semibold text-zinc-700 hover:bg-zinc-50">
                              Next week
                          </button>

                          <button
                              type="button"
                              onClick={() => {
                                  onChange("");
                                  setOpen(false);
                              }}
                              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base font-semibold text-rose-500 hover:bg-rose-50">
                              No date
                          </button>
                      </div>
                  </div>,
                  document.body
              )
            : null;

    return (
        <>
            <div className="relative">
                <div className="text-sm font-semibold text-zinc-600">{label}</div>

                <button
                    ref={triggerRef}
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className={cn(
                        "mt-2 flex h-11 w-full items-center justify-between rounded-xl border px-3 text-sm transition",
                        open
                            ? "border-orange-400 bg-orange-50 text-zinc-900 ring-2 ring-orange-100"
                            : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
                    )}>
                    <div className="flex min-w-0 items-center gap-2">
                        <div
                            className={cn(
                                "grid h-7 w-7 shrink-0 place-items-center rounded-md",
                                open ? "bg-orange-100 text-orange-600" : "bg-zinc-100 text-zinc-500"
                            )}>
                            <CalendarDays className="h-4 w-4" />
                        </div>

                        <span
                            className={cn("truncate text-left", value ? "font-medium text-zinc-900" : "text-zinc-400")}>
                            {formatDateDisplay(value)}
                        </span>
                    </div>
                </button>
            </div>

            {popup}
        </>
    );
}

// ─── DeletedDateRangePicker ───────────────────────────────────────────────────

function DeletedDateRangePicker({
    value,
    onChange
}: {
    value: DeletedDateFilter;
    onChange: (next: DeletedDateFilter) => void;
}) {
    return (
        <div className="flex flex-col gap-4 p-4">
            <TrelloDatePicker
                label="Từ ngày"
                value={value.startDate}
                onChange={(v) => onChange({ ...value, startDate: v })}
                max={value.endDate || undefined}
            />
            <TrelloDatePicker
                label="Đến ngày"
                value={value.endDate}
                onChange={(v) => onChange({ ...value, endDate: v })}
                min={value.startDate || undefined}
            />
        </div>
    );
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────

type ConfirmModalProps = {
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmTone?: "orange" | "indigo";
};

function ConfirmModal({
    open,
    title,
    description,
    confirmLabel = "Xác nhận",
    cancelLabel = "Hủy",
    onConfirm,
    onCancel,
    confirmTone = "indigo"
}: ConfirmModalProps) {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => setMounted(true), []);

    React.useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onCancel();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onCancel]);

    if (!(open && mounted)) return null;

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            onPointerDown={(e) => {
                if (e.target === e.currentTarget) onCancel();
            }}>
            <div
                className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
                onPointerDown={(e) => e.stopPropagation()}>
                <h2 className="text-base font-bold text-zinc-900">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{description}</p>

                <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100">
                        {cancelLabel}
                    </button>

                    <button
                        type="button"
                        onClick={onConfirm}
                        className={cn(
                            "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                            confirmTone === "orange"
                                ? "bg-orange-600 hover:bg-orange-700"
                                : "bg-indigo-600 hover:bg-indigo-700"
                        )}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── RowMenu ──────────────────────────────────────────────────────────────────

function RowMenu({
    open,
    onClose,
    onRestore,
    onDelete
}: {
    open: boolean;
    onClose: () => void;
    onRestore: () => void;
    onDelete: () => void;
}) {
    React.useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        const onPointerDown = () => onClose();

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("pointerdown", onPointerDown);

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("pointerdown", onPointerDown);
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="absolute top-10 right-0 z-20 w-56 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl"
            onPointerDown={(e) => e.stopPropagation()}>
            <button
                type="button"
                onClick={onRestore}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-100">
                <RotateCcw className="h-5 w-5" />
                Khôi phục
            </button>

            <button
                type="button"
                onClick={onDelete}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-red-500 hover:bg-red-50">
                <Trash2 className="h-5 w-5" />
                Xóa vĩnh viễn
            </button>
        </div>
    );
}

// ─── DeletedByPicker ──────────────────────────────────────────────────────────

function DeletedByPicker({
    options,
    selectedId,
    onSelect
}: {
    options: DeletedByOption[];
    selectedId: string | null;
    onSelect: (value: string | null) => void;
}) {
    const [localSearch, setLocalSearch] = React.useState("");

    const q = normalizeText(localSearch);
    const filtered = !q
        ? options
        : options.filter((x) => normalizeText(x.name).includes(q) || normalizeText(x.id).includes(q));

    return (
        <div className="overflow-hidden">
            <div className="border-b border-zinc-200 px-6 py-5">
                <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-0 h-7 w-7 -translate-y-1/2 text-zinc-400" />
                    <input
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        placeholder="Search or enter email..."
                        className="h-11 w-full border-none bg-transparent pl-12 text-[18px] text-zinc-900 outline-none placeholder:text-zinc-400"
                    />
                </div>
            </div>

            <div className="max-h-[360px] overflow-y-auto py-3">
                <button
                    type="button"
                    onClick={() => onSelect(null)}
                    className={cn(
                        "flex w-full items-center gap-4 px-6 py-5 text-left hover:bg-zinc-50",
                        selectedId === null && "bg-zinc-100"
                    )}>
                    <div className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full bg-emerald-500 text-[18px] font-bold text-white">
                        Me
                    </div>
                    <div className="text-[20px] font-semibold text-zinc-900">Tất cả người xóa</div>
                </button>

                {filtered.map((option) => {
                    const initials = getInitials(option.name);
                    const tone = pickAvatarTone(option.name || option.id);

                    return (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => onSelect(option.id)}
                            className={cn(
                                "flex w-full items-center gap-4 px-6 py-5 text-left hover:bg-zinc-50",
                                selectedId === option.id && "bg-zinc-100"
                            )}>
                            <div
                                className={cn(
                                    "grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full text-[18px] font-bold text-white",
                                    tone
                                )}>
                                {initials}
                            </div>
                            <div className="text-[20px] font-semibold text-zinc-900">{option.name}</div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ─── FilterPopover ────────────────────────────────────────────────────────────

function FilterPopover({
    open,
    view,
    onChangeView,
    deletedByOptions,
    deletedByFilter,
    onChangeDeletedBy,
    deletedDateFilter,
    onChangeDeletedDate,
    onClose
}: {
    open: boolean;
    view: FilterView;
    onChangeView: (view: FilterView) => void;
    deletedByOptions: DeletedByOption[];
    deletedByFilter: string | null;
    onChangeDeletedBy: (value: string | null) => void;
    deletedDateFilter: DeletedDateFilter;
    onChangeDeletedDate: (next: DeletedDateFilter) => void;
    onClose: () => void;
}) {
    React.useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        const onPointerDown = () => onClose();

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("pointerdown", onPointerDown);

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("pointerdown", onPointerDown);
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="absolute top-[calc(100%+12px)] right-0 z-30 w-[380px] overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-2xl"
            onPointerDown={(e) => e.stopPropagation()}>
            {view === "root" && (
                <>
                    <div className="border-b border-zinc-200 px-6 py-4 text-[20px] font-medium text-zinc-400">
                        Filter by
                    </div>
                    <div className="p-3">
                        <button
                            type="button"
                            onClick={() => onChangeView("deletedBy")}
                            className="flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left text-[18px] font-semibold text-zinc-900 hover:bg-zinc-100">
                            <span>Người xóa</span>
                            <ChevronRight className="h-5 w-5 text-zinc-400" />
                        </button>

                        <button
                            type="button"
                            onClick={() => onChangeView("deletedDate")}
                            className="mt-2 flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left text-[18px] font-semibold text-zinc-900 hover:bg-zinc-100">
                            <span>Ngày xóa</span>
                            <ChevronRight className="h-5 w-5 text-zinc-400" />
                        </button>
                    </div>
                </>
            )}

            {view === "deletedBy" && (
                <>
                    <div className="flex items-center gap-3 border-b border-zinc-200 px-5 py-4">
                        <button
                            type="button"
                            onClick={() => onChangeView("root")}
                            className="rounded-lg px-2 py-1 text-sm font-semibold text-zinc-600 hover:bg-zinc-100">
                            ←
                        </button>
                        <div className="text-[18px] font-semibold text-zinc-900">Chọn người xóa</div>
                    </div>
                    <DeletedByPicker
                        options={deletedByOptions}
                        selectedId={deletedByFilter}
                        onSelect={(value) => {
                            onChangeDeletedBy(value);
                            onClose();
                        }}
                    />
                </>
            )}

            {view === "deletedDate" && (
                <>
                    <div className="flex items-center gap-3 border-b border-zinc-200 px-5 py-4">
                        <button
                            type="button"
                            onClick={() => onChangeView("root")}
                            className="rounded-lg px-2 py-1 text-sm font-semibold text-zinc-600 hover:bg-zinc-100">
                            ←
                        </button>
                        <div className="text-[18px] font-semibold text-zinc-900">Chọn ngày xóa</div>
                    </div>

                    <DeletedDateRangePicker value={deletedDateFilter} onChange={onChangeDeletedDate} />

                    <div className="flex items-center justify-end gap-3 border-t border-zinc-200 p-4">
                        <button
                            type="button"
                            onClick={() => onChangeDeletedDate({ startDate: "", endDate: "" })}
                            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100">
                            Xóa chọn
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">
                            Áp dụng
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

const ITEMS_PER_PAGE = 10;

export default function Trashed({ canManageTrash = false }: { canManageTrash?: boolean }) {
    const params = useParams<{ groupId: string }>();
    const groupId = params?.groupId ? String(params.groupId) : "";

    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [items, setItems] = React.useState<TrashItem[]>([]);
    const [search, setSearch] = React.useState("");
    const [openMenuKey, setOpenMenuKey] = React.useState<string | null>(null);
    const [processingId, setProcessingId] = React.useState<string | null>(null);
    const [page, setPage] = React.useState(1);

    const [memberNameMap, setMemberNameMap] = React.useState<Record<string, string>>({});
    const [deletedByFilter, setDeletedByFilter] = React.useState<string | null>(null);
    const [deletedDateFilter, setDeletedDateFilter] = React.useState<DeletedDateFilter>({
        startDate: "",
        endDate: ""
    });

    const [openFilter, setOpenFilter] = React.useState(false);
    const [filterView, setFilterView] = React.useState<FilterView>("root");

    const [confirmRestore, setConfirmRestore] = React.useState<{
        open: boolean;
        taskId: string | null;
        taskName: string;
    }>({ open: false, taskId: null, taskName: "" });

    const [permissionModal, setPermissionModal] = React.useState<{
        open: boolean;
        title: string;
        message: string;
    }>({
        open: false,
        title: "",
        message: ""
    });

    const closePermissionModal = () =>
        setPermissionModal({
            open: false,
            title: "",
            message: ""
        });

    const openNoPermissionModal = (message: string) =>
        setPermissionModal({
            open: true,
            title: "Không có thẩm quyền",
            message
        });

    const [confirmDelete, setConfirmDelete] = React.useState<{
        open: boolean;
        taskId: string | null;
        taskName: string;
    }>({ open: false, taskId: null, taskName: "" });

    const refresh = React.useCallback(async () => {
        if (!groupId) {
            setLoading(false);
            setError("Thiếu groupId trong route.");
            return;
        }

        if (!isUuidLike(groupId)) {
            setLoading(false);
            setError("groupId không hợp lệ.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const [trashRes, membersRes] = await Promise.all([
                apiGetDeletedTasks(groupId),
                apiGetGroupMembers(groupId).catch(() => null)
            ]);

            const members = membersRes?.data?.members ?? [];
            const nextMemberNameMap: Record<string, string> = {};

            for (const member of members) {
                const userId = String(member?.userId ?? "").trim();
                if (!userId) continue;
                const fullName = buildFullName(member?.firstName, member?.lastName, member?.email);
                nextMemberNameMap[userId] = fullName || member?.email || "Không rõ";
            }

            setMemberNameMap(nextMemberNameMap);

            const list = trashRes?.data ?? [];

            const mapped: TrashItem[] = (list ?? []).map((x, index) => {
                const id = String(x.deleteTaskId ?? "").trim();
                const deletedOnRaw = x.deletedOn ?? "";
                const deletedBy = x.deletedBy ?? null;
                const name = String(x.taskName ?? "").trim() || "Untitled task";
                const deletedByName = deletedBy ? (nextMemberNameMap[String(deletedBy)] ?? null) : null;

                return {
                    id,
                    rowKey: `${id || "empty"}-${deletedOnRaw || "no-date"}-${index}`,
                    name,
                    type: "Task",
                    deletedOn: formatDeletedOn(x.deletedOn),
                    deletedOnRaw,
                    deletedBy,
                    deletedByName
                };
            });

            setItems(mapped.filter((x) => x.id));
        } catch (e: any) {
            setError(e?.message ?? "Không tải được danh sách thùng rác.");
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [groupId]);

    React.useEffect(() => {
        void refresh();
    }, [refresh]);

    React.useEffect(() => {
        setPage(1);
    }, [search, deletedByFilter, deletedDateFilter.startDate, deletedDateFilter.endDate]);

    const deletedByOptions = React.useMemo<DeletedByOption[]>(() => {
        const map = new Map<string, string>();
        items.forEach((item) => {
            const id = String(item.deletedBy ?? "").trim();
            if (!id) return;
            const name = item.deletedByName || memberNameMap[id] || "Không rõ";
            map.set(id, name);
        });
        return Array.from(map.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name, "vi"));
    }, [items, memberNameMap]);

    const filteredItems = React.useMemo(() => {
        const q = normalizeText(search);

        return items.filter((item) => {
            const nameText = normalizeText(item.name);
            const typeText = normalizeText(item.type);
            const deletedOnText = normalizeText(item.deletedOn);
            const deletedByText = normalizeText(
                `${item.deletedByName ?? ""} ${memberNameMap[String(item.deletedBy ?? "")] ?? ""} ${item.deletedBy ?? ""}`
            );

            const matchesText =
                !q ||
                nameText.includes(q) ||
                typeText.includes(q) ||
                deletedOnText.includes(q) ||
                deletedByText.includes(q);

            const matchesDeletedBy = !deletedByFilter || String(item.deletedBy ?? "") === deletedByFilter;
            const matchesDeletedDate = matchDeletedDate(item.deletedOnRaw, deletedDateFilter);

            return matchesText && matchesDeletedBy && matchesDeletedDate;
        });
    }, [items, search, memberNameMap, deletedByFilter, deletedDateFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));

    React.useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const paginatedItems = React.useMemo(() => {
        const start = (page - 1) * ITEMS_PER_PAGE;
        return filteredItems.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredItems, page]);

    const activeFilterCount =
        (deletedByFilter ? 1 : 0) + (deletedDateFilter.startDate || deletedDateFilter.endDate ? 1 : 0);

    const selectedDeletedByName =
        deletedByOptions.find((x) => x.id === deletedByFilter)?.name ||
        (deletedByFilter ? memberNameMap[deletedByFilter] || "Không rõ" : "");

    const deletedDateLabel = [
        deletedDateFilter.startDate && `từ ${formatDateDisplay(deletedDateFilter.startDate)}`,
        deletedDateFilter.endDate && `đến ${formatDateDisplay(deletedDateFilter.endDate)}`
    ]
        .filter(Boolean)
        .join(" ");

    const handleAskRestore = (item: TrashItem) => {
        setOpenMenuKey(null);

        if (!canManageTrash) {
            openNoPermissionModal("Bạn không có thẩm quyền khôi phục task này");
            return;
        }

        setConfirmRestore({
            open: true,
            taskId: item.id,
            taskName: item.name
        });
    };

    const handleAskDelete = (item: TrashItem) => {
        setOpenMenuKey(null);

        if (!canManageTrash) {
            openNoPermissionModal("Bạn không có thẩm quyền xóa vĩnh viễn task này");
            return;
        }

        setConfirmDelete({
            open: true,
            taskId: item.id,
            taskName: item.name
        });
    };

    const handleConfirmRestore = async () => {
        const taskId = confirmRestore.taskId;
        setConfirmRestore({ open: false, taskId: null, taskName: "" });

        if (!taskId) return;

        const prev = items;
        setProcessingId(taskId);
        setItems((current) => current.filter((x) => x.id !== taskId));

        try {
            await apiRestoreTask({ groupId, taskId });
            await refresh();
        } catch (e: any) {
            setItems(prev);
            openNoPermissionModal("Bạn không có thẩm quyền khôi phục task này");
        } finally {
            setProcessingId(null);
        }
    };

    const handleConfirmDelete = async () => {
        const taskId = confirmDelete.taskId;
        setConfirmDelete({ open: false, taskId: null, taskName: "" });

        if (!taskId) return;

        const prev = items;
        setProcessingId(taskId);
        setItems((current) => current.filter((x) => x.id !== taskId));

        try {
            await apiPermanentDeleteTask({ groupId, taskId });
            await refresh();
        } catch (e: any) {
            setItems(prev);
            openNoPermissionModal("Bạn không có thẩm quyền xóa vĩnh viễn task này");
        } finally {
            setProcessingId(null);
        }
    };

    if (error) {
        return (
            <div className="min-h-[calc(100vh-0px)] bg-zinc-50">
                <Container>
                    <div className="pt-8">
                        <div className="rounded-3xl border border-rose-200 bg-white p-6 text-sm text-rose-700 shadow-sm">
                            {error}
                        </div>
                        <div className="mt-4">
                            <button
                                type="button"
                                onClick={() => void refresh()}
                                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100">
                                Tải lại
                            </button>
                        </div>
                    </div>
                </Container>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-0px)] bg-zinc-50">
            <ConfirmModal
                open={confirmRestore.open}
                title="Khôi phục task"
                description={`Bạn có chắc muốn khôi phục "${confirmRestore.taskName}" không?`}
                confirmLabel="Khôi phục"
                cancelLabel="Hủy"
                confirmTone="indigo"
                onConfirm={() => void handleConfirmRestore()}
                onCancel={() => setConfirmRestore({ open: false, taskId: null, taskName: "" })}
            />

            <ConfirmModal
                open={confirmDelete.open}
                title="Xóa vĩnh viễn task"
                description={`Bạn có chắc muốn xóa vĩnh viễn "${confirmDelete.taskName}" không?`}
                confirmLabel="Xóa vĩnh viễn"
                cancelLabel="Hủy"
                confirmTone="orange"
                onConfirm={() => void handleConfirmDelete()}
                onCancel={() => setConfirmDelete({ open: false, taskId: null, taskName: "" })}
            />

            <ConfirmModal
                open={permissionModal.open}
                title={permissionModal.title || "Không có thẩm quyền"}
                description={permissionModal.message}
                confirmLabel="Đóng"
                cancelLabel="Đóng"
                confirmTone="orange"
                onConfirm={closePermissionModal}
                onCancel={closePermissionModal}
            />

            <Container>
                <div className="pt-8 pb-8">
                    <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
                        <h1 className="text-[40px] font-bold tracking-tight text-zinc-900">Trash</h1>

                        <div className="mt-8 flex items-center gap-3">
                            <div className="relative w-full max-w-[680px]">
                                <Search className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Tìm kiếm"
                                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white pr-4 pl-11 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300"
                                />
                            </div>

                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setOpenFilter((prev) => !prev);
                                        setFilterView("root");
                                    }}
                                    className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                                    aria-label="Bộ lọc">
                                    <Filter className="h-5 w-5" />
                                    {activeFilterCount > 0 ? (
                                        <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
                                            {activeFilterCount}
                                        </span>
                                    ) : null}
                                </button>

                                <FilterPopover
                                    open={openFilter}
                                    view={filterView}
                                    onChangeView={setFilterView}
                                    deletedByOptions={deletedByOptions}
                                    deletedByFilter={deletedByFilter}
                                    onChangeDeletedBy={setDeletedByFilter}
                                    deletedDateFilter={deletedDateFilter}
                                    onChangeDeletedDate={setDeletedDateFilter}
                                    onClose={() => setOpenFilter(false)}
                                />
                            </div>
                        </div>

                        {(deletedByFilter || deletedDateFilter.startDate || deletedDateFilter.endDate) && (
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                {deletedByFilter ? (
                                    <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-sm text-zinc-700">
                                        <span>Người xóa: {selectedDeletedByName}</span>
                                        <button
                                            type="button"
                                            onClick={() => setDeletedByFilter(null)}
                                            className="rounded-full p-0.5 hover:bg-zinc-200">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : null}

                                {(deletedDateFilter.startDate || deletedDateFilter.endDate) && (
                                    <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-sm text-zinc-700">
                                        <span>Ngày xóa: {deletedDateLabel}</span>
                                        <button
                                            type="button"
                                            onClick={() => setDeletedDateFilter({ startDate: "", endDate: "" })}
                                            className="rounded-full p-0.5 hover:bg-zinc-200">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => {
                                        setDeletedByFilter(null);
                                        setDeletedDateFilter({ startDate: "", endDate: "" });
                                    }}
                                    className="text-sm font-semibold text-zinc-600 hover:text-zinc-900">
                                    Xóa tất cả bộ lọc
                                </button>
                            </div>
                        )}

                        <div className="mt-8 overflow-x-auto">
                            <table className="min-w-full table-fixed border-separate border-spacing-0">
                                <thead>
                                    <tr>
                                        <th className="w-[20%] border-b border-zinc-200 px-8 py-4 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                                            Tên
                                        </th>
                                        <th className="w-[10%] border-b border-zinc-200 px-4 py-4 text-center text-xs font-bold uppercase tracking-wide text-zinc-500">
                                            Loại
                                        </th>
                                        <th className="w-[28%] border-b border-zinc-200 px-4 py-4 text-center text-xs font-bold uppercase tracking-wide text-zinc-500">
                                            Thời gian xóa
                                        </th>
                                        <th className="w-[34%] border-b border-zinc-200 px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                                            Người xóa
                                        </th>
                                        <th className="w-[8%] border-b border-zinc-200 px-4 py-4" />
                                    </tr>
                                </thead>

                                <tbody>
                                    {paginatedItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-sm text-zinc-500">
                                                Không có task nào phù hợp.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedItems.map((item) => {
                                            const displayDeletedBy =
                                                item.deletedByName ||
                                                memberNameMap[String(item.deletedBy ?? "")] ||
                                                "Không rõ";

                                            const initials = getInitials(displayDeletedBy);
                                            const tone = pickAvatarTone(displayDeletedBy || item.rowKey);

                                            return (
                                                <tr key={item.rowKey}>
                                                    <td className="border-b border-zinc-100 px-8 py-8 align-middle">
                                                        <div className="max-w-[150px] truncate text-base font-semibold text-zinc-900">
                                                            {item.name}
                                                        </div>
                                                    </td>

                                                    <td className="border-b border-zinc-100 px-4 py-8 align-middle text-center text-base text-zinc-500">
                                                        {item.type}
                                                    </td>

                                                    <td className="border-b border-zinc-100 px-4 py-8 align-middle text-center text-base text-zinc-500">
                                                        <div className="inline-flex items-center gap-2">
                                                            <CalendarDays className="h-4 w-4 text-zinc-400" />
                                                            <span>{item.deletedOn}</span>
                                                        </div>
                                                    </td>

                                                    <td className="border-b border-zinc-100 px-4 py-8 align-middle">
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className={cn(
                                                                    "grid h-12 w-12 shrink-0 place-items-center rounded-full text-base font-bold text-white",
                                                                    tone
                                                                )}
                                                                title={displayDeletedBy}>
                                                                {initials}
                                                            </div>
                                                            <div className="max-w-[220px] truncate text-base font-medium text-zinc-800">
                                                                {displayDeletedBy}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="border-b border-zinc-100 px-4 py-8 align-middle text-center">
                                                        <div className="relative flex justify-center">
                                                            <button
                                                                type="button"
                                                                disabled={processingId === item.id}
                                                                onClick={() =>
                                                                    setOpenMenuKey((prev) =>
                                                                        prev === item.rowKey ? null : item.rowKey
                                                                    )
                                                                }
                                                                className="grid h-9 w-9 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 disabled:opacity-50"
                                                                aria-label="Tùy chọn">
                                                                <MoreHorizontal className="h-5 w-5" />
                                                            </button>

                                                            <RowMenu
                                                                open={openMenuKey === item.rowKey}
                                                                onClose={() => setOpenMenuKey(null)}
                                                                onRestore={() => handleAskRestore(item)}
                                                                onDelete={() => handleAskDelete(item)}
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-8 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                                <Trash2 className="h-4 w-4" />
                                <span>
                                    {filteredItems.length} mục • Trang {page}/{totalPages}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                    disabled={page <= 1}
                                    className="rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50">
                                    Trước
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                                    disabled={page >= totalPages}
                                    className="rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50">
                                    Sau
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Container>
        </div>
    );
}
