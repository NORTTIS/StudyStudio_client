"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { z } from "zod";
import type { StudioUI } from "@/api/studios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STUDIO_NAME_MAX_LENGTH = 30;
const STUDIO_DESCRIPTION_MAX_LENGTH = 200;

type StudioFormData = {
    name: string;
    description: string;
    type: "personal" | "group";
};

const studioSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Tên studio là bắt buộc")
        .max(STUDIO_NAME_MAX_LENGTH, `Tên studio tối đa ${STUDIO_NAME_MAX_LENGTH} ký tự`),
    description: z
        .string()
        .max(STUDIO_DESCRIPTION_MAX_LENGTH, `Mô tả không được vượt quá ${STUDIO_DESCRIPTION_MAX_LENGTH} ký tự`)
});

const applyFieldData = <T extends { name: string; description: string }>(
    data: T,
    field: "name" | "description",
    value: string
) => ({ ...data, [field]: value }) as T;

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
    const [formData, setFormData] = useState<StudioFormData>({
        name: "",
        description: "",
        type: "group"
    });
    const [errors, setErrors] = useState({
        name: "",
        description: ""
    });
    const [touched, setTouched] = useState({
        name: false,
        description: false
    });

    const getSchemaErrors = (data: { name: string; description: string }) => {
        const result = studioSchema.safeParse(data);
        const out = { name: "", description: "" };
        if (result.success) {
            return out;
        }
        for (const issue of result.error.issues) {
            const path = issue.path[0];
            if (path === "name" && !out.name) {
                out.name = issue.message;
            }
            if (path === "description" && !out.description) {
                out.description = issue.message;
            }
        }
        return out;
    };

    const getDuplicateNameError = (value: string) => {
        const normalized = value.toLowerCase().trim();
        const conflict = existingStudios.some(
            (s) => s.name.toLowerCase().trim() === normalized && (mode === "create" || s.id !== studio?.id)
        );
        return conflict ? t("modal.duplicateName") || "Tên studio đã tồn tại. Vui lòng chọn tên khác." : "";
    };

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

    const validateField = (field: "name" | "description", value: string, data: StudioFormData) => {
        const schemaErrors = getSchemaErrors(applyFieldData(data, field, value));
        if (field === "name") {
            return schemaErrors.name || getDuplicateNameError(value);
        }
        return schemaErrors.description;
    };

    const handleBlur = (field: "name" | "description") => {
        setTouched((prev) => ({ ...prev, [field]: true }));
        const nextData = applyFieldData(formData, field, formData[field]);
        const error = validateField(field, formData[field], nextData);
        setErrors((prev) => ({ ...prev, [field]: error }));
    };

    const handleChange = (field: "name" | "description", value: string) => {
        const maxLength = field === "name" ? STUDIO_NAME_MAX_LENGTH : STUDIO_DESCRIPTION_MAX_LENGTH;
        const boundedValue = value.slice(0, maxLength);
        const nextData = applyFieldData(formData, field, boundedValue);
        setFormData(nextData);
        if (touched[field]) {
            const error = validateField(field, boundedValue, nextData);
            setErrors((prev) => ({ ...prev, [field]: error }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const currentData = { ...formData };
        const schemaErrors = getSchemaErrors(currentData);
        const nameError = schemaErrors.name || getDuplicateNameError(formData.name);
        const descriptionError = schemaErrors.description;

        setErrors({
            name: nameError,
            description: descriptionError
        });

        setTouched({
            name: true,
            description: true
        });

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
                            maxLength={STUDIO_NAME_MAX_LENGTH}
                        />
                        <div className="mt-1 flex items-center justify-between text-xs">
                            <p
                                className={`max-w-[70%] overflow-hidden text-ellipsis text-xs ${
                                    errors.name && touched.name ? "text-red-500" : "text-transparent"
                                }`}
                                aria-live="assertive">
                                {errors.name && touched.name ? errors.name : "\u00A0"}
                            </p>
                            <p className="text-right text-gray-500 text-xs">
                                {formData.name.length}/{STUDIO_NAME_MAX_LENGTH}
                            </p>
                        </div>
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
                            maxLength={STUDIO_DESCRIPTION_MAX_LENGTH}
                        />
                        <p className="mt-1 text-right text-gray-500 text-xs">
                            {formData.description.length}/{STUDIO_DESCRIPTION_MAX_LENGTH}
                        </p>
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
