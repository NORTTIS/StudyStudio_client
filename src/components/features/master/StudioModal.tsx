"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { z } from "zod";
import type { StudioUI } from "@/api/studios";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";
import { BannerUpload } from "@/components/ui/banner-upload";
import { LogoUpload } from "@/components/ui/logo-upload";

const STUDIO_NAME_MAX_LENGTH = 30;
const STUDIO_DESCRIPTION_MAX_LENGTH = 200;

type StudioFormData = {
    name: string;
    description: string;
    type: "personal" | "group";
    startDate: string;
    endDate: string;
    colorHex: string;
};

// Get today's date at midnight for comparison
const getToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
};

// Schema cho tạo mới - validate startDate không trong quá khứ
const studioCreateSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(1, "Tên studio là bắt buộc")
            .max(STUDIO_NAME_MAX_LENGTH, `Tên studio tối đa ${STUDIO_NAME_MAX_LENGTH} ký tự`),
        description: z
            .string()
            .max(STUDIO_DESCRIPTION_MAX_LENGTH, `Mô tả không được vượt quá ${STUDIO_DESCRIPTION_MAX_LENGTH} ký tự`),
        startDate: z.string(),
        endDate: z.string()
    })
    .refine(
        (data) => {
            if (!data.startDate) return true;
            const startDate = new Date(data.startDate);
            startDate.setHours(0, 0, 0, 0);
            return startDate >= getToday();
        },
        { message: "Ngày bắt đầu không được trong quá khứ", path: ["startDate"] }
    )
    .refine(
        (data) => {
            if (!(data.startDate && data.endDate)) return true;
            const startDate = new Date(data.startDate);
            const endDate = new Date(data.endDate);
            return endDate >= startDate;
        },
        { message: "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu", path: ["endDate"] }
    );

// Schema cho chỉnh sửa - không validate startDate (giữ nguyên giá trị cũ)
const studioEditSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(1, "Tên studio là bắt buộc")
            .max(STUDIO_NAME_MAX_LENGTH, `Tên studio tối đa ${STUDIO_NAME_MAX_LENGTH} ký tự`),
        description: z
            .string()
            .max(STUDIO_DESCRIPTION_MAX_LENGTH, `Mô tả không được vượt quá ${STUDIO_DESCRIPTION_MAX_LENGTH} ký tự`),
        startDate: z.string(),
        endDate: z.string()
    })
    .refine(
        (data) => {
            if (!(data.startDate && data.endDate)) return true;
            const startDate = new Date(data.startDate);
            const endDate = new Date(data.endDate);
            return endDate >= startDate;
        },
        { message: "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu", path: ["endDate"] }
    );

const applyFieldData = <T extends { name: string; description: string; startDate: string; endDate: string }>(
    data: T,
    field: "name" | "description" | "startDate" | "endDate",
    value: string
) => ({ ...data, [field]: value }) as T;

interface StudioModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
        name: string;
        description: string;
        type: "personal" | "group";
        startDate?: string | null;
        endDate?: string | null;
        colorHex?: string | null;
        avatarUrl?: string | null;
        bannerUrl?: string | null;
        logoUrl?: string | null;
        tagline?: string | null;
        alias?: string | null;
    }) => void;
    studio?: StudioUI | null;
    mode: "create" | "edit";
    existingStudios?: StudioUI[];
}

export function StudioModal({ isOpen, onClose, onSubmit, studio, mode, existingStudios = [] }: StudioModalProps) {
    const t = useTranslations("MasterPage");
    const [formData, setFormData] = useState<StudioFormData>({
        name: "",
        description: "",
        type: "group",
        startDate: "",
        endDate: "",
        colorHex: "#FF5F3D"
    });
    const [bannerUrl, setBannerUrl] = useState<string | null>(null);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [tagline, setTagline] = useState("");
    const [alias, setAlias] = useState("");
    const [errors, setErrors] = useState({
        name: "",
        description: "",
        startDate: "",
        endDate: ""
    });
    const [touched, setTouched] = useState({
        name: false,
        description: false,
        startDate: false,
        endDate: false
    });

    const getSchemaErrors = (data: StudioFormData, currentMode: "create" | "edit") => {
        const schema = currentMode === "create" ? studioCreateSchema : studioEditSchema;
        const result = schema.safeParse(data);
        const out = { name: "", description: "", startDate: "", endDate: "" };
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
            if (path === "startDate" && !out.startDate) {
                out.startDate = issue.message;
            }
            if (path === "endDate" && !out.endDate) {
                out.endDate = issue.message;
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
                    type: studio.type,
                    startDate: studio.startDate ?? "",
                    endDate: studio.endDate ?? "",
                    colorHex: studio.colorHex ?? "#FF5F3D"
                });
                setBannerUrl((studio as Record<string, unknown>).bannerUrl as string | null ?? null);
                setLogoUrl((studio as Record<string, unknown>).logoUrl as string | null ?? null);
                setTagline((studio as Record<string, unknown>).tagline as string ?? "");
                setAlias((studio as Record<string, unknown>).alias as string ?? "");
            } else {
                setFormData({
                    name: "",
                    description: "",
                    type: "group",
                    startDate: "",
                    endDate: "",
                    colorHex: "#FF5F3D"
                });
                setBannerUrl(null);
                setLogoUrl(null);
                setTagline("");
                setAlias("");
            }
            setErrors({ name: "", description: "", startDate: "", endDate: "" });
            setTouched({ name: false, description: false, startDate: false, endDate: false });
        }
    }, [isOpen, studio, mode]);

    const validateField = (
        field: "name" | "description" | "startDate" | "endDate",
        value: string,
        data: StudioFormData
    ) => {
        const schemaErrors = getSchemaErrors(applyFieldData(data, field, value), mode);
        if (field === "name") {
            return schemaErrors.name || getDuplicateNameError(value);
        }
        if (field === "description") return schemaErrors.description;
        if (field === "startDate") return schemaErrors.startDate;
        if (field === "endDate") return schemaErrors.endDate;
        return "";
    };

    const handleBlur = (field: "name" | "description" | "startDate" | "endDate") => {
        setTouched((prev) => ({ ...prev, [field]: true }));
        const nextData = applyFieldData(formData, field, formData[field]);
        const error = validateField(field, formData[field], nextData);
        setErrors((prev) => ({ ...prev, [field]: error }));
    };

    const handleChange = (field: "name" | "description" | "startDate" | "endDate", value: string) => {
        const maxLength =
            field === "name"
                ? STUDIO_NAME_MAX_LENGTH
                : field === "description"
                  ? STUDIO_DESCRIPTION_MAX_LENGTH
                  : undefined;
        const boundedValue = maxLength ? value.slice(0, maxLength) : value;
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
        const schemaErrors = getSchemaErrors(currentData, mode);
        const nameError = schemaErrors.name || getDuplicateNameError(formData.name);
        const descriptionError = schemaErrors.description;
        const startDateError = schemaErrors.startDate;
        const endDateError = schemaErrors.endDate;

        setErrors({
            name: nameError,
            description: descriptionError,
            startDate: startDateError,
            endDate: endDateError
        });

        setTouched({
            name: true,
            description: true,
            startDate: true,
            endDate: true
        });

        if (!(nameError || descriptionError || startDateError || endDateError)) {
            onSubmit({
                ...formData,
                startDate: formData.startDate || null,
                endDate: formData.endDate || null,
                colorHex: formData.colorHex || null,
                bannerUrl: bannerUrl || null,
                logoUrl: logoUrl || null,
                tagline: tagline.trim() || null,
                alias: alias.trim() || null
            });
        }
    };

    const handleClose = () => {
        setFormData({ name: "", description: "", type: "group", startDate: "", endDate: "", colorHex: "#FF5F3D" });
        setBannerUrl(null);
        setLogoUrl(null);
        setTagline("");
        setAlias("");
        setErrors({ name: "", description: "", startDate: "", endDate: "" });
        setTouched({ name: false, description: false, startDate: false, endDate: false });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="studio-modal-title"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            onKeyDown={(e) => {
                if (e.key === "Escape") onClose();
            }}>
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <h2 id="studio-modal-title" className="mb-4 font-bold text-2xl text-[#261E33]">
                    {mode === "create" ? t("modal.createTitle") : t("modal.editTitle")}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-2 block font-medium text-[#261E33] text-sm">Màu chủ đạo</label>
                        <ColorPicker
                            value={formData.colorHex}
                            onChange={(hex) => setFormData((f) => ({ ...f, colorHex: hex }))}
                        />
                    </div>

                    {/* Banner */}
                    {studio?.id && (
                        <div>
                            <label className="mb-2 block font-medium text-[#261E33] text-sm">Banner</label>
                            <BannerUpload
                                entityType="studio"
                                entityId={studio.id}
                                bannerUrl={bannerUrl}
                                colorHex={formData.colorHex}
                                onUploadSuccess={(url) => setBannerUrl(url)}
                                onDeleteSuccess={() => setBannerUrl(null)}
                            />
                        </div>
                    )}

                    {/* Logo */}
                    {studio?.id && (
                        <div>
                            <label className="mb-2 block font-medium text-[#261E33] text-sm">Logo</label>
                            <LogoUpload
                                studioId={studio.id}
                                logoUrl={logoUrl}
                                colorHex={formData.colorHex}
                                onUploadSuccess={(url) => setLogoUrl(url)}
                                onDeleteSuccess={() => setLogoUrl(null)}
                            />
                        </div>
                    )}

                    {/* Alias */}
                    <div>
                        <label htmlFor="studio-alias" className="mb-2 block font-medium text-[#261E33] text-sm">Biệt danh</label>
                        <Input
                            id="studio-alias"
                            type="text"
                            value={alias}
                            onChange={(e) => setAlias(e.target.value.slice(0, 50))}
                            placeholder="VD: THPT Hoang Dieu"
                            className="border-gray-300 focus:border-[#FF5F3D] focus:ring-[#FF5F3D]"
                        />
                        {alias.length > 0 && (
                            <div className="mt-1.5">
                                <span className="inline-flex items-center rounded-full border border-orange-300 bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">{alias}</span>
                            </div>
                        )}
                    </div>

                    {/* Tagline */}
                    <div>
                        <label htmlFor="studio-tagline" className="mb-2 block font-medium text-[#261E33] text-sm">Slogan</label>
                        <Input
                            id="studio-tagline"
                            type="text"
                            value={tagline}
                            onChange={(e) => setTagline(e.target.value.slice(0, 200))}
                            placeholder="Nhập slogan ngắn gọn"
                            className="border-gray-300 focus:border-[#FF5F3D] focus:ring-[#FF5F3D]"
                        />
                    </div>

                    <div>
                        <label htmlFor="studio-name" className="mb-2 block font-medium text-[#261E33] text-sm">
                            {t("modal.name")}
                        </label>
                        <Input
                            id="studio-name"
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
                            id="studio-description"
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

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="studio-startDate" className="mb-2 block font-medium text-[#261E33] text-sm">
                                Ngày bắt đầu
                            </label>
                            <Input
                                type="date"
                                id="studio-startDate"
                                value={formData.startDate}
                                min={mode === "create" ? new Date().toISOString().split("T")[0] : undefined}
                                onChange={(e) => handleChange("startDate", e.target.value)}
                                onBlur={() => handleBlur("startDate")}
                                className={errors.startDate && touched.startDate ? "border-red-500" : ""}
                            />
                            <p
                                className={`mt-1 text-xs ${
                                    errors.startDate && touched.startDate ? "text-red-500" : "text-transparent"
                                }`}
                                aria-live="assertive">
                                {errors.startDate && touched.startDate ? errors.startDate : "\u00A0"}
                            </p>
                        </div>

                        <div>
                            <label htmlFor="studio-endDate" className="mb-2 block font-medium text-[#261E33] text-sm">
                                Ngày kết thúc
                            </label>
                            <Input
                                type="date"
                                id="studio-endDate"
                                value={formData.endDate}
                                min={
                                    mode === "create"
                                        ? formData.startDate || new Date().toISOString().split("T")[0]
                                        : formData.startDate || undefined
                                }
                                onChange={(e) => handleChange("endDate", e.target.value)}
                                onBlur={() => handleBlur("endDate")}
                                className={errors.endDate && touched.endDate ? "border-red-500" : ""}
                            />
                            <p
                                className={`mt-1 text-xs ${
                                    errors.endDate && touched.endDate ? "text-red-500" : "text-transparent"
                                }`}
                                aria-live="assertive">
                                {errors.endDate && touched.endDate ? errors.endDate : "\u00A0"}
                            </p>
                        </div>
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
