"use client";

import { useTranslations } from "next-intl";
import type { Studio } from "@/api/studios";
import { Button } from "@/components/ui/button";

interface StudioDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  studio: Studio | null;
  onEdit: () => void;
  onDelete: () => void;
}

export function StudioDetailModal({ isOpen, onClose, studio, onEdit, onDelete }: StudioDetailModalProps) {
  const t = useTranslations("MasterPage");

  if (!(isOpen && studio)) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-gray-200 border-b p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 text-2xl">
              {studio.type === "personal" ? "🔷" : "🔶"}
            </div>
            <div>
              <h2 className="font-bold text-2xl text-[#261E33]">{studio.name}</h2>
              <span className="inline-block rounded-full bg-[#FF5F3D] px-2 py-0.5 text-white text-xs">
                {studio.type === "personal" ? t("personal") : t("group")}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="mb-2 font-semibold text-[#261E33]">{t("detailModal.description")}</h3>
            <p className="text-[#6F6B99]">{studio.description}</p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="mb-2 flex items-center gap-2 text-[#6F6B99]">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <span className="text-sm">{t("detailModal.members")}</span>
              </div>
              <p className="font-bold text-2xl text-[#261E33]">{studio.memberCount}</p>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <div className="mb-2 flex items-center gap-2 text-[#6F6B99]">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-sm">{t("detailModal.videos")}</span>
              </div>
              <p className="font-bold text-2xl text-[#261E33]">{studio.videoCount}</p>
            </div>
          </div>

          <div className="mb-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#6F6B99]">{t("detailModal.created")}</span>
              <span className="text-[#261E33]">{new Date(studio.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6F6B99]">{t("detailModal.updated")}</span>
              <span className="text-[#261E33]">{new Date(studio.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between border-gray-200 border-t p-6">
          <Button type="button" onClick={onDelete} className="bg-red-600 hover:bg-red-700">
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            {t("detailModal.delete")}
          </Button>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("detailModal.close")}
            </Button>
            <Button type="button" onClick={onEdit} className="bg-[#FF5F3D] hover:bg-[#ff4620]">
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              {t("detailModal.edit")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
