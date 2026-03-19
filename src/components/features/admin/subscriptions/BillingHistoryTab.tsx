"use client";

import { CalendarOutlined, DownloadOutlined, EyeOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Card, Col, DatePicker, Empty, Input, Row, Select, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { type AdminBillingHistoryItem, getAdminBillingHistory } from "@/api/admin-billing";
import {
    type ExcelColumn,
    exportToExcel,
    formatCurrencyForExport,
    formatDateForExport,
    formatPaymentStatusForExport
} from "@/utils/export-excel";
import { getPaymentStatusInfo } from "@/utils/payment-status";

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export function BillingHistoryTab() {
    const t = useTranslations("BillingHistoryTab");
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<number | "all">("all");
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [billingRecords, setBillingRecords] = useState<AdminBillingHistoryItem[]>([]);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total: number, range: [number, number]) => `${range[0]}-${range[1]} của ${total} bản ghi`,
        pageSizeOptions: ["10", "20", "50", "100"]
    });

    // Load billing history from API
    useEffect(() => {
        const loadBillingHistory = async () => {
            setIsLoading(true);
            try {
                // Prepare date range for API
                let startDate: string | undefined;
                let endDate: string | undefined;

                if (dateRange?.[0] && dateRange[1]) {
                    startDate = dateRange[0].startOf("day").toISOString();
                    endDate = dateRange[1].endOf("day").toISOString();
                }

                const result = await getAdminBillingHistory(
                    {
                        searchTerm: searchQuery || undefined,
                        paymentStatus: filterStatus === "all" ? undefined : filterStatus,
                        startDate,
                        endDate,
                        pageNumber: pagination.current,
                        pageSize: pagination.pageSize
                    },
                    "vi"
                );

                if (result.status === "success" && result.data) {
                    setBillingRecords(result.data.items);
                    setPagination((prev) => ({
                        ...prev,
                        total: result.data!.totalCount
                    }));
                } else {
                    // Fallback to mock data if API fails
                    console.warn("API failed, using mock data:", result.message);
                    setBillingRecords([
                        {
                            paymentId: "1",
                            orderCode: 2024001,
                            paymentStatus: 1, // SUCCESS
                            amount: 299000,
                            paymentMethod: "Bank Transfer",
                            createdAt: "2024-03-05T10:00:00Z",
                            paidAt: "2024-03-05T10:05:00Z",
                            userId: "user-1",
                            userEmail: "nguyenvana@example.com",
                            userName: "Nguyễn Văn A",
                            planId: "premium-plan",
                            planName: "Premium"
                        },
                        {
                            paymentId: "2",
                            orderCode: 2024002,
                            paymentStatus: 0, // PENDING
                            amount: 299000,
                            paymentMethod: "Credit Card",
                            createdAt: "2024-03-04T15:30:00Z",
                            paidAt: null,
                            userId: "user-2",
                            userEmail: "tranthib@example.com",
                            userName: "Trần Thị B",
                            planId: "premium-plan",
                            planName: "Premium"
                        },
                        {
                            paymentId: "3",
                            orderCode: 2024003,
                            paymentStatus: 3, // FAILED
                            amount: 299000,
                            paymentMethod: "Credit Card",
                            createdAt: "2024-03-03T09:15:00Z",
                            paidAt: null,
                            userId: "user-3",
                            userEmail: "levanc@example.com",
                            userName: "Lê Văn C",
                            planId: "premium-plan",
                            planName: "Premium"
                        }
                    ]);
                    setPagination((prev) => ({
                        ...prev,
                        total: 3
                    }));
                }
            } catch (error) {
                console.error("Failed to load billing history:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadBillingHistory();
    }, [searchQuery, filterStatus, dateRange, pagination.current, pagination.pageSize]);

    // Handle search with debounce
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            // Reset to page 1 when search or filter changes
            setPagination((prev) => ({ ...prev, current: 1 }));
        }, 500);

        return () => clearTimeout(timeoutId);
    }, []);

    const handleExport = async () => {
        setIsExporting(true);

        try {
            // Prepare date range for API
            let startDate: string | undefined;
            let endDate: string | undefined;

            if (dateRange?.[0] && dateRange[1]) {
                startDate = dateRange[0].startOf("day").toISOString();
                endDate = dateRange[1].endOf("day").toISOString();
            }

            // Fetch all data for export (without pagination)
            const result = await getAdminBillingHistory(
                {
                    searchTerm: searchQuery || undefined,
                    paymentStatus: filterStatus === "all" ? undefined : filterStatus,
                    startDate,
                    endDate,
                    pageNumber: 1,
                    pageSize: 10000 // Get all records
                },
                "vi"
            );

            let exportData: AdminBillingHistoryItem[] = [];

            if (result.status === "success" && result.data) {
                exportData = result.data.items;
            } else {
                // Use current displayed data if API fails
                exportData = billingRecords;
            }

            // Define Excel columns
            const columns: ExcelColumn[] = [
                {
                    header: "Mã đơn hàng",
                    key: "orderCode",
                    width: 15,
                    format: (value: unknown) => `#${value}`
                },
                {
                    header: "Tên người dùng",
                    key: "userName",
                    width: 20
                },
                {
                    header: "Email",
                    key: "userEmail",
                    width: 25
                },
                {
                    header: "Gói dịch vụ",
                    key: "planName",
                    width: 15
                },
                {
                    header: "Số tiền",
                    key: "amount",
                    width: 15,
                    format: (value: unknown) => formatCurrencyForExport(value as number)
                },
                {
                    header: "Phương thức thanh toán",
                    key: "paymentMethod",
                    width: 20
                },
                {
                    header: "Trạng thái",
                    key: "paymentStatus",
                    width: 15,
                    format: (value: unknown) => formatPaymentStatusForExport(value as number)
                },
                {
                    header: "Ngày tạo",
                    key: "createdAt",
                    width: 20,
                    format: (value: unknown) => formatDateForExport(value as string)
                },
                {
                    header: "Ngày thanh toán",
                    key: "paidAt",
                    width: 20,
                    format: (value: unknown) => (value ? formatDateForExport(value as string) : "Chưa thanh toán")
                }
            ];

            // Prepare filter info for export
            const filterInfo = {
                searchQuery: searchQuery || undefined,
                status:
                    filterStatus === "all"
                        ? undefined
                        : filterStatus === 0
                          ? "Đang chờ"
                          : filterStatus === 1
                            ? "Thành công"
                            : filterStatus === 2
                              ? "Đã hủy"
                              : filterStatus === 3
                                ? "Thất bại"
                                : undefined,
                dateRange:
                    dateRange?.[0] && dateRange[1]
                        ? `${dateRange[0].format("DD/MM/YYYY")} - ${dateRange[1].format("DD/MM/YYYY")}`
                        : undefined
            };

            // Generate filename with current date
            const now = new Date();
            const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
            const filename = `billing-history-${dateStr}`;

            // Export to Excel
            await exportToExcel({
                filename,
                sheetName: "Lịch sử thanh toán",
                columns,
                data: exportData,
                filterInfo
            });

            console.log(`Exported ${exportData.length} billing records to ${filename}.xlsx`);
        } catch (error) {
            console.error("Export failed:", error);
        } finally {
            setIsExporting(false);
        }
    };

    const handleViewDetails = (record: AdminBillingHistoryItem) => {
        console.log("View details for:", record.paymentId);
    };

    const columns: ColumnsType<AdminBillingHistoryItem> = [
        {
            title: t("table.orderCode"),
            dataIndex: "orderCode",
            key: "orderCode",
            width: 120,
            render: (orderCode: number) => <Typography.Text strong>#{orderCode}</Typography.Text>
        },
        {
            title: t("table.user"),
            key: "user",
            width: 200,
            render: (_, record) => (
                <div>
                    <div className="font-medium text-gray-900">{record.userName}</div>
                    <div className="text-gray-500 text-sm">{record.userEmail}</div>
                </div>
            )
        },
        {
            title: t("table.plan"),
            dataIndex: "planName",
            key: "planName",
            width: 100,
            render: (planName: string) => <Tag color="blue">{planName}</Tag>
        },
        {
            title: t("table.amount"),
            dataIndex: "amount",
            key: "amount",
            width: 120,
            align: "right",
            render: (amount: number) => (
                <Typography.Text strong className="text-green-600">
                    {amount.toLocaleString()} VND
                </Typography.Text>
            )
        },
        {
            title: t("table.method"),
            dataIndex: "paymentMethod",
            key: "paymentMethod",
            width: 120
        },
        {
            title: t("table.status"),
            dataIndex: "paymentStatus",
            key: "paymentStatus",
            width: 120,
            render: (status: number) => {
                const statusInfo = getPaymentStatusInfo(status);
                let color = "default";
                switch (status) {
                    case 0:
                        color = "processing";
                        break; // Pending
                    case 1:
                        color = "success";
                        break; // Success
                    case 2:
                        color = "warning";
                        break; // Cancelled
                    case 3:
                        color = "error";
                        break; // Failed
                }
                return <Tag color={color}>{statusInfo.label}</Tag>;
            }
        },
        {
            title: t("table.date"),
            dataIndex: "createdAt",
            key: "createdAt",
            width: 120,
            render: (date: string) => (
                <div>
                    <div>{new Date(date).toLocaleDateString("vi-VN")}</div>
                    <div className="text-gray-500 text-xs">
                        {new Date(date).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit"
                        })}
                    </div>
                </div>
            )
        },
        {
            title: t("table.actions"),
            key: "actions",
            width: 100,
            fixed: "right",
            render: (_, record) => (
                <Tooltip title="Xem chi tiết">
                    <Button
                        type="link"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewDetails(record)}
                        className="text-[#FF5F3D] hover:text-[#ff4620]"
                    />
                </Tooltip>
            )
        }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <Title level={3} className="!mb-2">
                    Lịch sử thanh toán
                </Title>
                <Typography.Text type="secondary">Quản lý và theo dõi tất cả giao dịch thanh toán</Typography.Text>
            </div>

            {/* Filters Card */}
            <Card>
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={8} lg={6}>
                        <Input
                            placeholder={t("search.placeholder")}
                            prefix={<SearchOutlined />}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            allowClear
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={6}>
                        <Select
                            value={filterStatus}
                            onChange={setFilterStatus}
                            style={{ width: "100%" }}
                            placeholder="Trạng thái">
                            <Option value="all">{t("filters.allStatus")}</Option>
                            <Option value={0}>{t("filters.pending")}</Option>
                            <Option value={1}>{t("filters.success")}</Option>
                            <Option value={2}>{t("filters.cancelled")}</Option>
                            <Option value={3}>{t("filters.failed")}</Option>
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={6}>
                        <RangePicker
                            value={dateRange}
                            onChange={setDateRange}
                            style={{ width: "100%" }}
                            placeholder={["Từ ngày", "Đến ngày"]}
                            format="DD/MM/YYYY"
                            suffixIcon={<CalendarOutlined />}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={6}>
                        <Button
                            type="primary"
                            icon={<DownloadOutlined />}
                            onClick={handleExport}
                            loading={isExporting}
                            className="w-full border-[#FF5F3D] bg-[#FF5F3D] hover:border-[#ff4620] hover:bg-[#ff4620]">
                            {t("actions.export")}
                        </Button>
                    </Col>
                </Row>
            </Card>

            {/* Table Card */}
            <Card>
                <Table
                    columns={columns}
                    dataSource={billingRecords}
                    rowKey="paymentId"
                    loading={isLoading}
                    pagination={{
                        ...pagination,
                        onChange: (page, pageSize) => {
                            setPagination((prev) => ({
                                ...prev,
                                current: page,
                                pageSize: pageSize || 10
                            }));
                        }
                    }}
                    locale={{
                        emptyText: (
                            <Empty description="Không có dữ liệu thanh toán" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        )
                    }}
                    scroll={{ x: 1000 }}
                    size="middle"
                />
            </Card>
        </div>
    );
}
