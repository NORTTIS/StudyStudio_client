"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { Studio } from "@/api/studios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string; type: "personal" | "group" }) => void;
  studio?: Studio | null;
  mode: "create" | "edit";
}

export function StudioModal({ isOpen, onClose, onSubmit, studio, mode }: StudioModalProps) {
  const t = useTranslations("MasterPage");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "group" as "personal" | "group"
  });

  useEffect(() => {
    if (studio && mode === "edit") {
      setFormData({
        name: studio.name,
        description: studio.description,
        type: studio.type
      });
    } else {
      setFormData({
        name: "",
        description: "",
        type: "group"
      });
    }
  }, [studio, mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 font-bold text-2xl text-[#261E33]">
          {mode === "create" ? t("modal.createTitle") : t("modal.editTitle")}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block font-medium text-[#261E33] text-sm">{t("modal.name")}</label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t("modal.namePlaceholder")}
              required
            />
          </div>

          <div>
            <label className="mb-2 block font-medium text-[#261E33] text-sm">{t("modal.description")}</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t("modal.descriptionPlaceholder")}
              rows={3}
              className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-[#FF5F3D] focus:outline-none focus:ring-1 focus:ring-[#FF5F3D]"
              required
            />
          </div>

          <div>
            <label className="mb-2 block font-medium text-[#261E33] text-sm">{t("modal.type")}</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as "personal" | "group" })}
              className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-[#FF5F3D] focus:outline-none focus:ring-1 focus:ring-[#FF5F3D]">
              <option value="personal">{t("personal")}</option>
              <option value="group">{t("group")}</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("modal.cancel")}
            </Button>
            <Button type="submit" className="bg-[#FF5F3D] hover:bg-[#ff4620]">
              {mode === "create" ? t("modal.create") : t("modal.save")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
