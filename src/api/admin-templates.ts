import { apiDelete, apiGet, apiPost, apiPut } from "./api-client";
import type { components } from "./types";

// Re-export types from OpenAPI
export type TemplateResponse = components["schemas"]["TemplateResponse"];
export type CreateTemplateRequest = components["schemas"]["CreateTemplateRequest"];
export type UpdateTemplateRequest = components["schemas"]["UpdateTemplateRequest"];

export interface ApiResponse<T> {
    status: string;
    code: string;
    message: string;
    data: T | null;
}

/** Enriched template item used in the admin list — extends TemplateResponse with typed taskStatuses array */
export interface TemplateListItem extends TemplateResponse {
    /** Typed task statuses (derived from groupTaskStatuses) */
    taskStatuses: TaskStatusItem[];
}

/** Local type for task status rows in the editor */
export interface TaskStatusItem {
    statusId?: string;
    statusName: string;
    position: number;
}

/** Form data for creating a template */
export interface CreateTemplateFormData {
    groupName: string;
    description?: string;
    groupTaskStatuses: TaskStatusItem[];
}

/** Form data for partial update */
export interface UpdateTemplateFormData {
    groupId?: string;
    groupName?: string;
    groupDescription?: string;
    isActive?: boolean;
    groupTaskStatuses?: TaskStatusItem[];
    bannerUrl?: string | null;
}

/**
 * Get all templates (for admin)
 * GET /api/admin/templates
 */
export async function getTemplates(locale: string): Promise<ApiResponse<TemplateResponse[]>> {
    try {
        const response = await apiGet<TemplateResponse[]>("/admin/templates", locale);
        if (response.status === "success" && response.data) {
            return {
                status: response.status,
                code: response.code,
                message: response.message,
                data: response.data
            };
        }
        return {
            status: "error",
            code: response.code || "API_ERROR",
            message: response.message || "Khong the tai danh sach template",
            data: null
        };
    } catch (error: unknown) {
        console.error("[admin-templates] Loi khi goi API getTemplates:", error);
        return {
            status: "error",
            code: "FETCH_ERROR",
            message: error instanceof Error ? error.message : "Co loi khong xac dinh xay ra",
            data: null
        };
    }
}

/**
 * Get single template by ID
 * GET /api/admin/templates/{templateId}
 */
export async function getTemplateById(
    templateId: string,
    locale: string
): Promise<ApiResponse<TemplateResponse>> {
    try {
        const response = await apiGet<TemplateResponse>(`/admin/templates/${templateId}`, locale);
        if (response.status === "success" && response.data) {
            return {
                status: response.status,
                code: response.code,
                message: response.message,
                data: response.data
            };
        }
        return {
            status: "error",
            code: response.code || "API_ERROR",
            message: response.message || "Khong the tai chi tiet template",
            data: null
        };
    } catch (error: unknown) {
        console.error("[admin-templates] Loi khi goi API getTemplateById:", error);
        return {
            status: "error",
            code: "FETCH_ERROR",
            message: error instanceof Error ? error.message : "Co loi khong xac dinh xay ra",
            data: null
        };
    }
}

/**
 * Create new template
 * POST /api/admin/templates
 */
export async function createTemplate(
    data: CreateTemplateFormData,
    locale: string
): Promise<ApiResponse<TemplateResponse>> {
    try {
        const request: CreateTemplateRequest = {
            groupName: data.groupName,
            description: data.description,
            isActive: false,
            groupTaskStatuses: data.groupTaskStatuses.map((s, index) => ({
                statusName: s.statusName,
                position: index
            }))
        };

        const response = await apiPost<TemplateResponse>("/admin/templates", request, locale);

        if (response.status === "success" && response.data) {
            return {
                status: response.status,
                code: response.code,
                message: response.message,
                data: response.data
            };
        }
        return {
            status: "error",
            code: response.code || "API_ERROR",
            message: response.message || "Khong the tao template",
            data: null
        };
    } catch (error: unknown) {
        console.error("[admin-templates] Loi khi tao template:", error);
        return {
            status: "error",
            code: "CREATE_ERROR",
            message: error instanceof Error ? error.message : "Co loi khong xac dinh xay ra",
            data: null
        };
    }
}

/**
 * Update template (partial update)
 * PUT /api/admin/templates/{templateId}
 */
export async function updateTemplate(
    templateId: string,
    data: UpdateTemplateFormData,
    locale: string
): Promise<ApiResponse<TemplateResponse>> {
    try {
        const request: UpdateTemplateRequest = {
            groupId: data.groupId ?? "",
            ...(data.groupName !== undefined && { groupName: data.groupName }),
            ...(data.groupDescription !== undefined && { groupDescription: data.groupDescription }),
            ...(data.isActive !== undefined && { isActive: data.isActive }),
            ...(data.groupTaskStatuses !== undefined && {
                groupTaskStatuses: data.groupTaskStatuses.map((s, index) => ({
                    statusName: s.statusName,
                    position: s.position ?? index
                }))
            }),
            // bannerUrl is not yet in the OpenAPI-generated UpdateTemplateRequest type,
            // but we send it anyway — the backend will persist it.
            ...(data.bannerUrl !== undefined && { bannerUrl: data.bannerUrl })
        };

        const response = await apiPut<TemplateResponse>(
            `/admin/templates/${templateId}`,
            request,
            locale
        );

        if (response.status === "success" && response.data) {
            return {
                status: response.status,
                code: response.code,
                message: response.message,
                data: response.data
            };
        }
        return {
            status: "error",
            code: response.code || "API_ERROR",
            message: response.message || "Khong the cap nhat template",
            data: null
        };
    } catch (error: unknown) {
        console.error("[admin-templates] Loi khi cap nhat template:", error);
        return {
            status: "error",
            code: "UPDATE_ERROR",
            message: error instanceof Error ? error.message : "Co loi khong xac dinh xay ra",
            data: null
        };
    }
}

/**
 * Inactive template (soft delete)
 * DELETE /api/admin/templates/{templateId}
 */
export async function inactiveTemplate(
    templateId: string,
    locale: string
): Promise<ApiResponse<null>> {
    try {
        const response = await apiDelete<null>(`/admin/templates/${templateId}`, locale);

        if (response.status === "success") {
            return {
                status: response.status,
                code: response.code,
                message: response.message,
                data: null
            };
        }
        return {
            status: "error",
            code: response.code || "API_ERROR",
            message: response.message || "Khong the vo hieu hoa template",
            data: null
        };
    } catch (error: unknown) {
        console.error("[admin-templates] Loi khi vo hieu hoa template:", error);
        return {
            status: "error",
            code: "DELETE_ERROR",
            message: error instanceof Error ? error.message : "Co loi khong xac dinh xay ra",
            data: null
        };
    }
}

/**
 * Hard-delete template permanently
 * DELETE /api/admin/templates/{templateId}/hard
 */
export async function hardDeleteTemplate(
    templateId: string,
    locale: string
): Promise<ApiResponse<null>> {
    try {
        const response = await apiDelete<null>(`/admin/templates/${templateId}/hard`, locale);

        if (response.status === "success") {
            return {
                status: response.status,
                code: response.code,
                message: response.message,
                data: null
            };
        }
        return {
            status: "error",
            code: response.code || "API_ERROR",
            message: response.message || "Khong the xoa template",
            data: null
        };
    } catch (error: unknown) {
        console.error("[admin-templates] Loi khi xoa cung template:", error);
        return {
            status: "error",
            code: "DELETE_ERROR",
            message: error instanceof Error ? error.message : "Co loi khong xac dinh xay ra",
            data: null
        };
    }
}

