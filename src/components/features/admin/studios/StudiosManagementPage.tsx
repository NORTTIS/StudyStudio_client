"use client";

import {
    AppstoreOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    EyeOutlined,
    LockOutlined,
    SearchOutlined,
    StopOutlined,
    TeamOutlined,
    UnlockOutlined
} from "@ant-design/icons";
import {
    Avatar,
    Badge,
    Button,
    Descriptions,
    Drawer,
    Input,
    Modal,
    message,
    Select,
    Space,
    Switch,
    Table,
    Tag,
    Tooltip,
    Typography
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useState } from "react";
import { formatDate, getStudios, type StudioListItem, updateStudioStatus } from "@/api/admin-studios";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";

const { Title, Text } = Typography;
const { Search } = Input;

type StudioDisplayStatus = "active" | "inactive";

type Studio = {
    id: string;
    name: string;
    description: string | null;
    ownerName: string | null;
    ownerEmail: string | null;
    groupCount: number;
    memberCount: number;
    taskCount: number;
    status: StudioDisplayStatus;
    createdAt: string;
    lastActivity: string;
};

export function StudiosManagementPage() {
    const [studios, setStudios] = useState<Studio[]>([]);
    const [summary, setSummary] = useState({
        totalStudios: 0,
        activeStudios: 0,
        inactiveStudios: 0,
        totalMembers: 0,
        totalGroups: 0
    });
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
    const [selectedStudio, setSelectedStudio] = useState<Studio | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{
        open: boolean;
        studio: Studio | null;
        action: "activate" | "deactivate";
    }>({ open: false, studio: null, action: "activate" });
    const [messageApi, contextHolder] = message.useMessage();

    const [pageNumber, setPageNumber] = useState(1);
    const [pageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    const fetchStudios = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                PageNumber: pageNumber,
                PageSize: pageSize,
                SearchTerm: search || undefined
            };

            const response = await getStudios(params);

            if (response.status === "success" && response.data) {
                const mappedStudios: Studio[] = (response.data.studioList || []).map((item: StudioListItem) => ({
                    id: item.studioId || "",
                    name: item.studioName || "",
                    description: item.description || null,
                    ownerName: item.ownerName || null,
                    ownerEmail: item.ownerEmail || null,
                    groupCount: item.groupCount || 0,
                    memberCount: item.memberCount || 0,
                    taskCount: item.taskCount || 0,
                    status: item.isActive ? "active" : "inactive",
                    createdAt: formatDate(item.createdAt),
                    lastActivity: formatDate(item.lastActivityAt)
                }));

                setStudios(mappedStudios);
                if (response.data.summary) {
                    setSummary({
                        totalStudios: response.data.summary.totalStudios || 0,
                        activeStudios: response.data.summary.activeStudios || 0,
                        inactiveStudios: response.data.summary.inactiveStudios || 0,
                        totalMembers: response.data.summary.totalMembers || 0,
                        totalGroups: response.data.summary.totalGroups || 0
                    });
                }
                setTotalCount(response.data.totalCount || 0);
            } else {
                messageApi.error({
                    content: response.message || "Không thể tải danh sách studios"
                });
            }
        } catch (error) {
            console.error("Lỗi khi tải danh sách studios:", error);
            messageApi.error({
                content: "Có lỗi xảy ra khi tải danh sách studios"
            });
        } finally {
            setLoading(false);
        }
    }, [pageNumber, pageSize, search, messageApi]);

    useEffect(() => {
        fetchStudios();
    }, [fetchStudios]);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        setPageNumber(1);
    };

    const filteredStudios = studios.filter((s) => {
        const matchStatus = filterStatus === "all" || s.status === filterStatus;
        return matchStatus;
    });

    const handleToggleStatus = (studio: Studio) => {
        const action = studio.status === "active" ? "deactivate" : "activate";
        setConfirmModal({ open: true, studio, action });
    };

    const confirmToggle = async () => {
        if (!confirmModal.studio) return;

        const newStatus = confirmModal.action === "activate";
        const newStatusDisplay = confirmModal.action === "activate" ? "active" : "inactive";

        try {
            const response = await updateStudioStatus(confirmModal.studio.id, newStatus);

            if (response.status === "success") {
                setStudios((prev) =>
                    prev.map((s) => (s.id === confirmModal.studio!.id ? { ...s, status: newStatusDisplay } : s))
                );
                if (selectedStudio?.id === confirmModal.studio.id) {
                    setSelectedStudio((prev) => (prev ? { ...prev, status: newStatusDisplay } : null));
                }
                messageApi.success({
                    content:
                        confirmModal.action === "activate"
                            ? `Đã kích hoạt studio "${confirmModal.studio.name}"`
                            : `Đã vô hiệu hoá studio "${confirmModal.studio.name}"`
                });
            } else {
                messageApi.error({
                    content: response.message || "Không thể cập nhật trạng thái studio"
                });
            }
        } catch (error) {
            console.error("Lỗi khi cập nhật trạng thái studio:", error);
            messageApi.error({
                content: "Có lỗi xảy ra khi cập nhật trạng thái studio"
            });
        }

        setConfirmModal({ open: false, studio: null, action: "activate" });
    };

    const columns: ColumnsType<Studio> = [
        {
            title: "Studio",
            key: "studio",
            render: (_, record) => (
                <Space>
                    <Avatar
                        style={{
                            backgroundColor: record.status === "inactive" ? "#d9d9d9" : "#FF5F3D",
                            flexShrink: 0
                        }}
                        icon={<AppstoreOutlined />}
                        size={38}
                    />
                    <div>
                        <div style={{ fontWeight: 600, color: "#261E33" }}>{record.name}</div>
                        <div style={{ fontSize: 12, color: "#6F6B99" }}>{record.ownerName}</div>
                    </div>
                </Space>
            )
        },
        {
            title: "Email chủ sở hữu",
            dataIndex: "ownerEmail",
            key: "ownerEmail",
            render: (email) => <span style={{ fontSize: 12, color: "#6F6B99" }}>{email}</span>
        },
        {
            title: "Nhóm",
            dataIndex: "groupCount",
            key: "groupCount",
            align: "center",
            render: (count: number) => (
                <Tag color="blue" style={{ fontWeight: 600 }}>
                    {count}
                </Tag>
            )
        },
        {
            title: "Thành viên",
            dataIndex: "memberCount",
            key: "memberCount",
            align: "center",
            render: (count: number) => (
                <Tag color="green" style={{ fontWeight: 600 }}>
                    {count}
                </Tag>
            )
        },
        {
            title: "Tasks",
            dataIndex: "taskCount",
            key: "taskCount",
            align: "center",
            render: (count: number) => <span style={{ color: "#6F6B99", fontWeight: 500 }}>{count}</span>
        },
        {
            title: "Hoạt động cuối",
            dataIndex: "lastActivity",
            key: "lastActivity",
            render: (d) => <span style={{ color: "#6F6B99", fontSize: 13 }}>{d}</span>
        },
        {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            render: (status: StudioDisplayStatus) => (
                <Badge
                    status={status === "active" ? "success" : "default"}
                    text={status === "active" ? "Hoạt động" : "Bị vô hiệu"}
                />
            )
        },
        {
            title: "Hành động",
            key: "actions",
            render: (_, record) => (
                <Space>
                    <Tooltip title="Xem chi tiết">
                        <Button
                            type="text"
                            icon={<EyeOutlined />}
                            style={{ color: "#FF5F3D" }}
                            onClick={() => {
                                setSelectedStudio(record);
                                setDrawerOpen(true);
                            }}
                        />
                    </Tooltip>
                    <Tooltip title={record.status === "active" ? "Vô hiệu hoá" : "Kích hoạt"}>
                        <Switch
                            checked={record.status === "active"}
                            onChange={() => handleToggleStatus(record)}
                            checkedChildren={<UnlockOutlined />}
                            unCheckedChildren={<LockOutlined />}
                            style={{ backgroundColor: record.status === "active" ? "#FF5F3D" : undefined }}
                        />
                    </Tooltip>
                </Space>
            )
        }
    ];

    const stats = {
        total: summary.totalStudios,
        active: summary.activeStudios,
        inactive: summary.inactiveStudios
    };

    return (
        <div style={{ minHeight: "100vh", background: "#F8F8F8" }}>
            {contextHolder}
            <div style={{ display: "flex", minHeight: "100vh" }}>
                <DashboardSidebar />
                <main style={{ flex: 1 }}>
                    <Header userProfile={null} />

                    <div style={{ padding: "24px" }}>
                        <div style={{ marginBottom: 24 }}>
                            <Title level={4} style={{ color: "#261E33", margin: 0 }}>
                                Quản lý Studios
                            </Title>
                            <Text style={{ color: "#6F6B99" }}>Xem và quản lý studios trong hệ thống</Text>
                        </div>

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(3, 1fr)",
                                gap: 16,
                                marginBottom: 24
                            }}>
                            {[
                                { label: "Tổng số studios", value: stats.total, color: "#261E33" },
                                { label: "Đang hoạt động", value: stats.active, color: "#52c41a" },
                                { label: "Bị vô hiệu", value: stats.inactive, color: "#ff4d4f" }
                            ].map((s) => (
                                <div
                                    key={s.label}
                                    style={{
                                        background: "#fff",
                                        borderRadius: 12,
                                        border: "1px solid #E5E5E5",
                                        padding: "20px"
                                    }}>
                                    <div style={{ color: "#6F6B99", fontSize: 13, marginBottom: 8 }}>{s.label}</div>
                                    <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                            <Search
                                placeholder="Tìm tên studio, chủ sở hữu..."
                                allowClear
                                prefix={<SearchOutlined style={{ color: "#6F6B99" }} />}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                style={{ width: 320 }}
                            />
                            <Select
                                value={filterStatus}
                                onChange={(v) => setFilterStatus(v)}
                                style={{ width: 160 }}
                                options={[
                                    { label: "Tất cả trạng thái", value: "all" },
                                    { label: "Hoạt động", value: "active" },
                                    { label: "Bị vô hiệu", value: "inactive" }
                                ]}
                            />
                            <Text style={{ color: "#6F6B99", alignSelf: "center", marginLeft: "auto" }}>
                                Hiển thị {filteredStudios.length} / {totalCount} studios
                            </Text>
                        </div>

                        <div
                            style={{
                                background: "#fff",
                                borderRadius: 12,
                                border: "1px solid #E5E5E5",
                                overflow: "hidden"
                            }}>
                            <Table
                                columns={columns}
                                dataSource={filteredStudios}
                                rowKey="id"
                                loading={loading}
                                pagination={{
                                    current: pageNumber,
                                    pageSize: pageSize,
                                    total: totalCount,
                                    showSizeChanger: false,
                                    onChange: (page) => setPageNumber(page),
                                    showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} studios`
                                }}
                            />
                        </div>
                    </div>
                </main>
            </div>

            <Drawer
                title={
                    <Space>
                        <Avatar
                            style={{ backgroundColor: selectedStudio?.status === "inactive" ? "#d9d9d9" : "#FF5F3D" }}
                            icon={<AppstoreOutlined />}
                        />
                        <div>
                            <div style={{ fontWeight: 700, color: "#261E33" }}>{selectedStudio?.name}</div>
                            <div style={{ fontSize: 12, color: "#6F6B99" }}>{selectedStudio?.id}</div>
                        </div>
                    </Space>
                }
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                width={480}
                extra={
                    selectedStudio && (
                        <Switch
                            checked={selectedStudio.status === "active"}
                            onChange={() => {
                                setDrawerOpen(false);
                                handleToggleStatus(selectedStudio);
                            }}
                            checkedChildren="Hoạt động"
                            unCheckedChildren="Vô hiệu"
                            style={{ backgroundColor: selectedStudio.status === "active" ? "#FF5F3D" : undefined }}
                        />
                    )
                }>
                {selectedStudio && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <div style={{ padding: "16px", background: "#F8F8F8", borderRadius: 10 }}>
                            <Badge
                                status={selectedStudio.status === "active" ? "success" : "default"}
                                text={
                                    <Text
                                        strong
                                        style={{ color: selectedStudio.status === "active" ? "#52c41a" : "#ff4d4f" }}>
                                        {selectedStudio.status === "active"
                                            ? "Studio đang hoạt động"
                                            : "Studio bị vô hiệu hoá"}
                                    </Text>
                                }
                            />
                        </div>

                        {selectedStudio.description && (
                            <div>
                                <Text type="secondary">Mô tả:</Text>
                                <div style={{ marginTop: 8 }}>{selectedStudio.description}</div>
                            </div>
                        )}

                        <Descriptions
                            column={1}
                            bordered
                            size="small"
                            labelStyle={{ color: "#6F6B99", fontWeight: 500 }}>
                            <Descriptions.Item label="Chủ sở hữu">{selectedStudio.ownerName}</Descriptions.Item>
                            <Descriptions.Item label="Email">{selectedStudio.ownerEmail}</Descriptions.Item>
                            <Descriptions.Item
                                label={
                                    <>
                                        <AppstoreOutlined /> Nhóm
                                    </>
                                }>
                                <Tag color="blue">{selectedStudio.groupCount}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item
                                label={
                                    <>
                                        <TeamOutlined /> Thành viên
                                    </>
                                }>
                                <Tag color="green">{selectedStudio.memberCount}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Tasks">
                                <Tag color="purple">{selectedStudio.taskCount}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Ngày tạo">{selectedStudio.createdAt}</Descriptions.Item>
                            <Descriptions.Item
                                label={
                                    <>
                                        <ClockCircleOutlined /> Hoạt động cuối
                                    </>
                                }>
                                {selectedStudio.lastActivity}
                            </Descriptions.Item>
                        </Descriptions>

                        <Button
                            block
                            danger={selectedStudio.status === "active"}
                            type={selectedStudio.status === "inactive" ? "primary" : "default"}
                            icon={selectedStudio.status === "active" ? <LockOutlined /> : <UnlockOutlined />}
                            style={
                                selectedStudio.status === "inactive"
                                    ? { background: "#52c41a", borderColor: "#52c41a" }
                                    : {}
                            }
                            onClick={() => {
                                setDrawerOpen(false);
                                handleToggleStatus(selectedStudio);
                            }}>
                            {selectedStudio.status === "active" ? "Vô hiệu hoá studio" : "Kích hoạt studio"}
                        </Button>
                    </div>
                )}
            </Drawer>

            <Modal
                title={
                    <Space>
                        {confirmModal.action === "activate" ? (
                            <CheckCircleOutlined style={{ color: "#52c41a" }} />
                        ) : (
                            <StopOutlined style={{ color: "#ff4d4f" }} />
                        )}
                        {confirmModal.action === "activate" ? "Kích hoạt studio" : "Vô hiệu hoá studio"}
                    </Space>
                }
                open={confirmModal.open}
                onOk={confirmToggle}
                onCancel={() => setConfirmModal({ open: false, studio: null, action: "activate" })}
                okText={confirmModal.action === "activate" ? "Kích hoạt" : "Vô hiệu hoá"}
                cancelText="Huỷ"
                okButtonProps={{
                    style: {
                        background: confirmModal.action === "activate" ? "#52c41a" : "#ff4d4f",
                        borderColor: "transparent"
                    }
                }}>
                <p>
                    Bạn có chắc muốn <strong>{confirmModal.action === "activate" ? "kích hoạt" : "vô hiệu hoá"}</strong>{" "}
                    studio <strong>"{confirmModal.studio?.name}"</strong>?
                </p>
                {confirmModal.action === "deactivate" && (
                    <p style={{ color: "#6F6B99", fontSize: 13, marginTop: 8 }}>
                        Studio sẽ không thể truy cập cho đến khi được kích hoạt lại.
                    </p>
                )}
            </Modal>
        </div>
    );
}
