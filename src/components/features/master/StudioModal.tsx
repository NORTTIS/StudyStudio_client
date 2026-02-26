"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { StudioUI } from "@/api/studios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StudioModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string; description: string; type: "personal" | "group" }) => void;
    studio?: StudioUI | null;
    mode: "create" | "edit";
    existingStudios?: StudioUI[];
}

export function StudioModal({ isOpen, onClose, onSubmit, studio, mode, existingStudios = [] }: StudioModalProps) {
    const t = useTranslations("MasterPage");
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        type: "group" as "personal" | "group"
    });
    const [errors, setErrors] = useState({
        name: "",
        description: ""
    });
    const [touched, setTouched] = useState({
        name: false,
        description: false
    });

    // Reset form when modal opens/closes or mode changes
    useEffect(() => {
        if (isOpen) {
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
            setErrors({ name: "", description: "" });
            setTouched({ name: false, description: false });
        }
    }, [isOpen, studio, mode]);

    const validateField = (name: string, value: string) => {
        if (name === "name") {
            if (!value.trim()) {
                return t("modal.nameRequired") || "Tên studio là bắt buộc";
            }
            if (value.trim().length > 100) {
                return t("modal.nameTooLong") || "Tên studio không được vượt quá 100 ký tự";
            }
            // Check duplicate name (case-insensitive)
            const isDuplicate = existingStudios.some(
                (s) =>
                    s.name.toLowerCase().trim() === value.toLowerCase().trim() &&
                    (mode === "create" || s.id !== studio?.id)
            );
            if (isDuplicate) {
                return t("modal.duplicateName") || "Tên studio đã tồn tại. Vui lòng chọn tên khác.";
            }
        }
        if (name === "description") {
            if (!value.trim()) {
                return t("modal.descriptionRequired") || "Mô tả là bắt buộc";
            }
            if (value.trim().length > 500) {
                return t("modal.descriptionTooLong") || "Mô tả không được vượt quá 500 ký tự";
            }
        }
        return "";
    };

    const handleBlur = (field: "name" | "description") => {
        setTouched({ ...touched, [field]: true });
        const error = validateField(field, formData[field]);
        setErrors({ ...errors, [field]: error });
    };

    const handleChange = (field: "name" | "description", value: string) => {
        setFormData({ ...formData, [field]: value });
        if (touched[field]) {
            const error = validateField(field, value);
            setErrors({ ...errors, [field]: error });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate all fields
        const nameError = validateField("name", formData.name);
        const descriptionError = validateField("description", formData.description);

        setErrors({
            name: nameError,
            description: descriptionError
        });

        setTouched({
            name: true,
            description: true
        });

        // If no errors, submit
        if (!(nameError || descriptionError)) {
            onSubmit(formData);
        }
    };

    const handleClose = () => {
        setFormData({ name: "", description: "", type: "group" });
        setErrors({ name: "", description: "" });
        setTouched({ name: false, description: false });
        onClose();
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
                        <label htmlFor="studio-name" className="mb-2 block font-medium text-[#261E33] text-sm">
                            {t("modal.name")}
                        </label>
                        <Input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleChange("name", e.target.value)}
                            onBlur={() => handleBlur("name")}
                            placeholder={t("modal.namePlaceholder")}
                            className={errors.name && touched.name ? "border-red-500" : ""}
                        />
                        {errors.name && touched.name && <p className="mt-1 text-red-500 text-xs">{errors.name}</p>}
                    </div>

                    <div>
                        <label htmlFor="studio-description" className="mb-2 block font-medium text-[#261E33] text-sm">
                            {t("modal.description")}
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => handleChange("description", e.target.value)}
                            onBlur={() => handleBlur("description")}
                            placeholder={t("modal.descriptionPlaceholder")}
                            rows={3}
                            className={`w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-1 ${
                                errors.description && touched.description
                                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                    : "border-gray-300 focus:border-[#FF5F3D] focus:ring-[#FF5F3D]"
                            }`}
                        />
                        {errors.description && touched.description && (
                            <p className="mt-1 text-red-500 text-xs">{errors.description}</p>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={handleClose}>
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
