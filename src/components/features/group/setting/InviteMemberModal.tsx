"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Link2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type InviteRole = "Moderator" | "Member" | "Commenter" | "Viewer";

const roleNote: Record<InviteRole, string> = {
  Moderator: "Can manage members and content in your Groups.",
  Member: "Can access all public items in your Groups.",
  Commenter: "Can view and comment on items in your Groups.",
  Viewer: "Can view items in your Groups."
};

const roleOptions: InviteRole[] = ["Moderator", "Member", "Commenter", "Viewer"];

export function InviteMemberModal({
  open,
  onClose,
  groupName,
  canManage,
  onCreateLink,
  onSendInvite
}: {
  open: boolean;
  onClose: () => void;
  groupName: string;
  canManage: boolean;
  onCreateLink: (payload: { role: InviteRole }) => Promise<string>;
  onSendInvite: (payload: { email: string; role: InviteRole }) => Promise<void> | void;
}) {
  const [mounted, setMounted] = useState(false);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("Member");
  const [sending, setSending] = useState(false);

  const [inviteLink, setInviteLink] = useState<string>("");
  const [creatingLink, setCreatingLink] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => setMounted(true), []);

  const canSend = useMemo(() => {
    const e = email.trim();
    return canManage && e.length > 0 && !sending;
  }, [canManage, email, sending]);

  const hasLink = useMemo(() => inviteLink.trim().length > 0, [inviteLink]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setRole("Member");
    setSending(false);
    setCreatingLink(false);
    setCopied(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1200);
    return () => window.clearTimeout(t);
  }, [copied, open]);

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      await onSendInvite({ email: email.trim(), role });
      setEmail("");
    } finally {
      setSending(false);
    }
  };

  const copyLink = async () => {
    const url = inviteLink.trim();
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
      } catch {
        // ignore
      }
    }
  };

  const handleCreateOrCopyLink = async () => {
    if (!canManage) return;

    if (hasLink) {
      await copyLink();
      return;
    }

    if (creatingLink) return;

    setCreatingLink(true);
    try {
      const url = await onCreateLink({ role });
      if (url?.trim()) {
        setInviteLink(url);
        await copyLink();
      }
    } finally {
      setCreatingLink(false);
    }
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[2147483647]">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          className="w-full max-w-[720px] rounded-2xl bg-white shadow-2xl"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-4 px-8 pt-7">
            <h2 className="text-3xl font-semibold tracking-tight text-[#111827]">{`Invite user(s) to ${groupName}`}</h2>

            <button
              type="button"
              onClick={onClose}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#111827] hover:bg-gray-50"
              aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-8 pb-8 pt-6">
            <div>
              <div className="text-base font-medium text-[#111827]">Invite by email</div>

              <div className="relative mt-3">
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                  disabled={!canManage || sending}
                  className="h-12 rounded-xl border-[#E5E7EB] pr-12 text-base text-[#111827] placeholder:text-[#9CA3AF] focus-visible:ring-0 focus-visible:border-[#D1D5DB]"
                />

                {email.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setEmail("")}
                    disabled={!canManage || sending}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#6B7280] hover:bg-gray-100 disabled:opacity-50"
                    aria-label="Clear email">
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-7">
              <div className="text-base font-medium text-[#111827]">Invite as</div>

              <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-[#6B7280]">
                    <Users className="h-6 w-6" />
                  </div>

                  <div className="min-w-0">
                    <Select
                      value={role}
                      onValueChange={(v) => {
                        const next = v as InviteRole;
                        setRole(next);
                        setInviteLink("");
                        setCopied(false);
                      }}
                      disabled={!canManage || sending || creatingLink}>
                      <SelectTrigger
                        className="
                          h-auto w-fit border-0 bg-transparent p-0 shadow-none
                          focus:ring-0 focus:outline-none
                          inline-flex items-center gap-2
                          [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-[#6B7280]
                        ">
                        <span className="text-2xl font-semibold leading-none text-[#111827]">
                          <SelectValue />
                        </span>
                      </SelectTrigger>

                      <SelectContent
                        position="popper"
                        sideOffset={8}
                        className="z-[2147483648] min-w-[280px] rounded-2xl border border-[#E5E7EB] bg-white p-2 shadow-xl">
                        {roleOptions.map((r) => (
                          <SelectItem
                            key={r}
                            value={r}
                            className="
                              rounded-xl px-3 py-2.5 text-[15px] text-[#111827]
                              focus:bg-[#F3F4F6] data-[state=checked]:bg-[#F3F4F6]
                            ">
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="mt-2 max-w-[420px] text-base leading-snug text-[#6B7280]">{roleNote[role]}</div>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleSend}
                  disabled={!canSend}
                  className="
                    h-12 w-full rounded-xl px-8 text-base font-semibold text-white
                    sm:w-auto sm:min-w-[200px]
                    bg-orange-600 hover:bg-orange-700
                    disabled:bg-orange-400 disabled:opacity-100 disabled:hover:bg-orange-400
                  ">
                  {sending ? "Sending..." : "Send invite"}
                </Button>
              </div>
            </div>

            <div className="mt-8">
              <div className="text-base font-medium text-[#6B7280]">Or invite via link</div>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  value={inviteLink}
                  readOnly
                  tabIndex={-1}
                  aria-readonly="true"
                  onMouseDown={(e) => e.preventDefault()}
                  onFocus={(e) => e.currentTarget.blur()}
                  placeholder="Invite link will appear here..."
                  className="h-12 flex-1 cursor-default rounded-xl border-[#E5E7EB] bg-white text-base text-[#111827] placeholder:text-[#9CA3AF] focus-visible:ring-0 focus-visible:border-[#D1D5DB]"
                />

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCreateOrCopyLink}
                  disabled={!canManage || creatingLink || (!hasLink && sending)}
                  className="h-12 rounded-xl border-blue-500 bg-white px-5 text-blue-600 hover:bg-blue-50">
                  {hasLink ? (
                    <>
                      <Copy className="mr-2 h-5 w-5" />
                      {copied ? "Copied!" : "Copy link"}
                    </>
                  ) : (
                    <>
                      <Link2 className="mr-2 h-5 w-5" />
                      {creatingLink ? "Creating..." : "Create link"}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {!canManage ? (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                You don&apos;t have permission to invite members in this group.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
