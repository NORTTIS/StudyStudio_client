/**
 * Utility functions for exporting data to real Excel files using SheetJS
 */

export interface ExcelColumn {
    header: string;
    key: string;
    width?: number;
    format?: (value: unknown) => string;
}

export interface ExcelExportOptions {
    filename: string;
    sheetName: string;
    columns: ExcelColumn[];
    data: unknown[];
    filterInfo?: {
        searchQuery?: string;
        status?: string;
        dateRange?: string;
    };
}

// SheetJS type declarations
interface SheetJS {
    utils: {
        book_new: () => unknown;
        aoa_to_sheet: (data: unknown[][]) => unknown;
        decode_range: (ref: string) => { e: { c: number; r: number } };
        book_append_sheet: (workbook: unknown, worksheet: unknown, name: string) => void;
    };
    writeFile: (workbook: unknown, filename: string) => void;
}

/**
 * Load SheetJS library dynamically from CDN
 */
function loadSheetJS(): Promise<SheetJS> {
    return new Promise((resolve, reject) => {
        // Check if XLSX is already loaded
        const win = window as unknown as Record<string, unknown>;
        if (typeof win.XLSX !== "undefined") {
            resolve(win.XLSX as SheetJS);
            return;
        }

        // Load SheetJS from CDN
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
        script.onload = () => {
            resolve(win.XLSX as SheetJS);
        };
        script.onerror = () => {
            reject(new Error("Failed to load SheetJS library"));
        };
        document.head.appendChild(script);
    });
}

/**
 * Export data to real Excel file (.xlsx) using SheetJS
 */
export async function exportToExcel(options: ExcelExportOptions): Promise<void> {
    const { filename, sheetName, columns, data, filterInfo } = options;

    try {
        // Load SheetJS library
        const XLSX = await loadSheetJS();

        // Create a new workbook
        const workbook = XLSX.utils.book_new() as {
            SheetNames: string[];
            Sheets: Record<string, unknown>;
        };

        // Prepare worksheet data
        const worksheetData: unknown[][] = [];

        // Add title row
        worksheetData.push([`Báo cáo lịch sử thanh toán - ${new Date().toLocaleDateString("vi-VN")}`]);
        worksheetData.push([]); // Empty row

        // Add filter info if exists
        if (filterInfo) {
            worksheetData.push(["Bộ lọc áp dụng:"]);
            if (filterInfo.searchQuery) {
                worksheetData.push(["Tìm kiếm:", filterInfo.searchQuery]);
            }
            if (filterInfo.status) {
                worksheetData.push(["Trạng thái:", filterInfo.status]);
            }
            if (filterInfo.dateRange) {
                worksheetData.push(["Khoảng thời gian:", filterInfo.dateRange]);
            }
            worksheetData.push([]); // Empty row
        }

        // Add headers
        const headers = columns.map((col) => col.header);
        worksheetData.push(headers);

        // Add data rows
        for (const row of data) {
            const rowData = columns.map((col) => {
                let value = (row as Record<string, unknown>)[col.key];

                // Apply formatting if provided
                if (col.format && value !== null && value !== undefined) {
                    value = col.format(value);
                }

                // Handle null/undefined values
                if (value === null || value === undefined) {
                    value = "";
                }

                return value;
            });
            worksheetData.push(rowData);
        }

        // Add summary
        worksheetData.push([]);
        worksheetData.push([`Tổng số bản ghi: ${data.length}`]);
        worksheetData.push([`Xuất lúc: ${new Date().toLocaleString("vi-VN")}`]);

        // Create worksheet from array of arrays
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData) as {
            "!ref"?: string;
            "!cols"?: { wch: number }[];
            "!merges"?: { s: { r: number; c: number }; e: { r: number; c: number } }[];
        };

        // Set column widths
        const columnWidths = columns.map((col) => ({ wch: col.width || 15 }));
        worksheet["!cols"] = columnWidths;

        // Style the title row (merge cells if possible)
        const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
        if (range.e?.c !== undefined && range.e.c >= headers.length - 1) {
            worksheet["!merges"] = [
                {
                    s: { r: 0, c: 0 },
                    e: { r: 0, c: headers.length - 1 }
                }
            ];
        }

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        // Generate and download Excel file
        XLSX.writeFile(workbook, `${filename}.xlsx`);

        console.log(`Exported ${data.length} billing records to ${filename}.xlsx`);
    } catch (error) {
        console.error("Failed to export Excel file:", error);
        // Fallback to CSV if Excel export fails
        exportToCSV(options);
    }
}

/**
 * Fallback CSV export function
 */
function exportToCSV(options: ExcelExportOptions): void {
    const { filename, columns, data, filterInfo } = options;

    // Prepare data for CSV
    let csvContent = "";

    // Add title
    csvContent += `Báo cáo lịch sử thanh toán - ${new Date().toLocaleDateString("vi-VN")}\n\n`;

    // Add filter info if exists
    if (filterInfo) {
        csvContent += "Bộ lọc áp dụng:\n";
        if (filterInfo.searchQuery) {
            csvContent += `Tìm kiếm:,${filterInfo.searchQuery}\n`;
        }
        if (filterInfo.status) {
            csvContent += `Trạng thái:,${filterInfo.status}\n`;
        }
        if (filterInfo.dateRange) {
            csvContent += `Khoảng thời gian:,${filterInfo.dateRange}\n`;
        }
        csvContent += "\n";
    }

    // Add headers
    const headers = columns.map((col) => col.header);
    csvContent += `${headers.join(",")}\n`;

    // Add data rows
    for (const row of data) {
        const rowData = columns.map((col) => {
            let value = (row as Record<string, unknown>)[col.key];

            // Apply formatting if provided
            if (col.format && value !== null && value !== undefined) {
                value = col.format(value);
            }

            // Handle null/undefined values
            if (value === null || value === undefined) {
                value = "";
            }

            // Escape CSV values
            const stringValue = String(value);
            if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }

            return stringValue;
        });
        csvContent += `${rowData.join(",")}\n`;
    }

    // Add summary
    csvContent += "\n";
    csvContent += `Tổng số bản ghi:,${data.length}\n`;
    csvContent += `Xuất lúc:,${new Date().toLocaleString("vi-VN")}\n`;

    // Create and download CSV file
    const BOM = "\uFEFF"; // UTF-8 BOM for proper Vietnamese display
    const blob = new Blob([BOM + csvContent], {
        type: "text/csv;charset=utf-8;"
    });

    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);

    console.log(`Exported ${data.length} billing records to ${filename}.csv (fallback)`);
}

/**
 * Format date for Excel export
 */
export function formatDateForExport(dateString: string): string {
    if (!dateString) return "";

    try {
        const date = new Date(dateString);
        return date.toLocaleString("vi-VN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        });
    } catch {
        return dateString;
    }
}

/**
 * Format currency for Excel export
 */
export function formatCurrencyForExport(amount: number): string {
    if (typeof amount !== "number") return "";
    return `${amount.toLocaleString("vi-VN")} VND`;
}

/**
 * Format payment status for Excel export
 */
export function formatPaymentStatusForExport(status: number): string {
    switch (status) {
        case 0:
            return "Đang chờ";
        case 1:
            return "Thành công";
        case 2:
            return "Đã hủy";
        case 3:
            return "Thất bại";
        default:
            return "Không xác định";
    }
}
