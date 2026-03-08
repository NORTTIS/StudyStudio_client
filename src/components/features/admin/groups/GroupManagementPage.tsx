"use client";

import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    EyeOutlined,
    FolderOutlined,
    LockOutlined,
    SearchOutlined,
    StopOutlined,
    TeamOutlined,
    UnlockOutlined,
    UserOutlined
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
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";

const { Title, Text } = Typography;
const { Search } = Input;

export type Group = {
    id: string;
    name: string;
    studioName: string;
    ownerName: string;
    ownerEmail: string;
    memberCount: number;
    maxMembers: number;
    status: "active" | "inactive";
    type: "public" | "private";
    createdAt: string;
    lastActivity: string;
    reportCount: number;
};

const MOCK_GROUPS: Group[] = [
    {
        id: "GRP-001",
        name: "Toán cao cấp K22",
        studioName: "Studio Toán học",
        ownerName: "Nguyễn Văn An",
        ownerEmail: "an.nv@example.com",
        memberCount: 45,
        maxMembers: 50,
        status: "active",
        type: "public",
        createdAt: "10/01/2024",
        lastActivity: "05/03/2024",
        reportCount: 0
    },
    {
        id: "GRP-002",
        name: "Lập trình Python nâng cao",
        studioName: "Studio CNTT",
        ownerName: "Trần Thị Bích",
        ownerEmail: "bich.tt@example.com",
        memberCount: 28,
        maxMembers: 50,
        status: "active",
        type: "private",
        createdAt: "12/01/2024",
        lastActivity: "04/03/2024",
        reportCount: 1
    },
    {
        id: "GRP-003",
        name: "Ôn thi IELTS 2024",
        studioName: "Studio Ngoại ngữ",
        ownerName: "Lê Minh Công",
        ownerEmail: "cong.lm@example.com",
        memberCount: 50,
        maxMembers: 50,
        status: "active",
        type: "public",
        createdAt: "15/01/2024",
        lastActivity: "05/03/2024",
        reportCount: 0
    },
    {
        id: "GRP-004",
        name: "Vi phạm cộng đồng",
        studioName: "Studio Test",
        ownerName: "Phạm Thị Dung",
        ownerEmail: "dung.pt@example.com",
        memberCount: 12,
        maxMembers: 50,
        status: "inactive",
        type: "public",
        createdAt: "20/01/2024",
        lastActivity: "10/02/2024",
        reportCount: 5
    },
    {
        id: "GRP-005",
        name: "Vật lý lý thuyết",
        studioName: "Studio Khoa học",
        ownerName: "Hoàng Văn Ế",
        ownerEmail: "e.hv@example.com",
        memberCount: 37,
        maxMembers: 50,
        status: "active",
        type: "private",
        createdAt: "22/01/2024",
        lastActivity: "03/03/2024",
        reportCount: 0
    },
    {
        id: "GRP-006",
        name: "Hoá học hữu cơ",
        studioName: "Studio Khoa học",
        ownerName: "Vũ Thị Phương",
        ownerEmail: "phuong.vt@example.com",
        memberCount: 19,
        maxMembers: 50,
        status: "active",
        type: "public",
        createdAt: "25/01/2024",
        lastActivity: "02/03/2024",
        reportCount: 2
    },
    {
        id: "GRP-007",
        name: "Spam & quảng cáo",
        studioName: "Studio Ảo",
        ownerName: "Đặng Quốc Hưng",
        ownerEmail: "hung.dq@example.com",
        memberCount: 3,
        maxMembers: 50,
        status: "inactive",
        type: "private",
        createdAt: "28/01/2024",
        lastActivity: "05/02/2024",
        reportCount: 8
    },
    {
        id: "GRP-008",
        name: "Lịch sử Việt Nam",
        studioName: "Studio Xã hội",
        ownerName: "Bùi Thị Kim",
        ownerEmail: "kim.bt@example.com",
        memberCount: 41,
        maxMembers: 50,
        status: "active",
        type: "public",
        createdAt: "01/02/2024",
        lastActivity: "05/03/2024",
        reportCount: 0
    }
];

export function GroupManagementPage() {
    const [groups, setGroups] = useState<Group[]>(MOCK_GROUPS);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
    const [filterType, setFilterType] = useState<"all" | "public" | "private">("all");
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{
        open: boolean;
        group: Group | null;
        action: "activate" | "deactivate";
    }>({ open: false, group: null, action: "activate" });
    const [messageApi, contextHolder] = message.useMessage();

    const filtered = groups.filter((g) => {
        const matchSearch =
            g.name.toLowerCase().includes(search.toLowerCase()) ||
            g.studioName.toLowerCase().includes(search.toLowerCase()) ||
            g.ownerName.toLowerCase().includes(search.toLowerCase()) ||
            g.id.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === "all" || g.status === filterStatus;
        const matchType = filterType === "all" || g.type === filterType;
        return matchSearch && matchStatus && matchType;
    });

    const handleToggleStatus = (group: Group) => {
        const action = group.status === "active" ? "deactivate" : "activate";
        setConfirmModal({ open: true, group, action });
    };

    const confirmToggle = () => {
        if (!confirmModal.group) return;
        const newStatus = confirmModal.action === "activate" ? "active" : "inactive";
        setGroups((prev) => prev.map((g) => (g.id === confirmModal.group!.id ? { ...g, status: newStatus } : g)));
        if (selectedGroup?.id === confirmModal.group.id) {
            setSelectedGroup((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
        messageApi.success({
            content:
                confirmModal.action === "activate"
                    ? `Đã kích hoạt nhóm "${confirmModal.group.name}"`
                    : `Đã vô hiệu hoá nhóm "${confirmModal.group.name}"`
        });
        setConfirmModal({ open: false, group: null, action: "activate" });
    };

    const getMemberPercent = (count: number, max: number) => Math.round((count / max) * 100);

    const columns: ColumnsType<Group> = [
        {
            title: "Nhóm",
            key: "group",
            render: (_, record) => (
                <Space>
                    <Avatar
                        style={{
                            backgroundColor:
                                record.status === "inactive"
                                    ? "#d9d9d9"
                                    : record.reportCount > 3
                                      ? "#ff4d4f"
                                      : "#FF5F3D",
                            flexShrink: 0
                        }}
                        icon={<TeamOutlined />}
                        size={38}
                    />
                    <div>
                        <div
                            style={{
                                fontWeight: 600,
                                color: "#261E33",
                                display: "flex",
                                alignItems: "center",
                                gap: 6
                            }}>
                            {record.name}
                            {record.reportCount > 0 && (
                                <Tag color="red" style={{ fontSize: 10, padding: "0 4px", lineHeight: "16px" }}>
                                    {record.reportCount} báo cáo
                                </Tag>
                            )}
                        </div>
                        <div style={{ fontSize: 12, color: "#6F6B99" }}>{record.studioName}</div>
                    </div>
                </Space>
            )
        },
        {
            title: "Mã nhóm",
            dataIndex: "id",
            key: "id",
            render: (id) => <span style={{ fontFamily: "monospace", fontSize: 12, color: "#6F6B99" }}>{id}</span>
        },
        {
            title: "Chủ nhóm",
            key: "owner",
            render: (_, record) => (
                <div>
                    <div style={{ fontWeight: 500, color: "#261E33", fontSize: 13 }}>{record.ownerName}</div>
                    <div style={{ fontSize: 12, color: "#6F6B99" }}>{record.ownerEmail}</div>
                </div>
            )
        },
        {
            title: "Loại",
            dataIndex: "type",
            key: "type",
            render: (type: Group["type"]) => (
                <Tag color={type === "public" ? "blue" : "purple"}>{type === "public" ? "Công khai" : "Riêng tư"}</Tag>
            )
        },
        {
            title: "Thành viên",
            key: "members",
            render: (_, record) => {
                const pct = getMemberPercent(record.memberCount, record.maxMembers);
                return (
                    <div style={{ minWidth: 100 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#261E33" }}>
                            {record.memberCount} / {record.maxMembers}
                        </div>
                        <div
                            style={{
                                background: "#f0f0f0",
                                borderRadius: 4,
                                height: 4,
                                marginTop: 4,
                                overflow: "hidden"
                            }}>
                            <div
                                style={{
                                    width: `${pct}%`,
                                    height: "100%",
                                    background: pct >= 90 ? "#ff4d4f" : "#FF5F3D",
                                    borderRadius: 4
                                }}
                            />
                        </div>
                    </div>
                );
            }
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
            render: (status: Group["status"]) => (
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
                                setSelectedGroup(record);
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
        total: groups.length,
        active: groups.filter((g) => g.status === "active").length,
        inactive: groups.filter((g) => g.status === "inactive").length,
        reported: groups.filter((g) => g.reportCount > 0).length
    };

    return (
        <div style={{ minHeight: "100vh", background: "#F8F8F8" }}>
            {contextHolder}
            <div style={{ display: "flex", minHeight: "100vh" }}>
                <DashboardSidebar />
                <main style={{ flex: 1 }}>
                    <Header userProfile={null} />

                    <div style={{ padding: "24px" }}>
                        {/* Page Header */}
                        <div style={{ marginBottom: 24 }}>
                            <Title level={4} style={{ color: "#261E33", margin: 0 }}>
                                Quản lý nhóm học tập
                            </Title>
                            <Text style={{ color: "#6F6B99" }}>
                                Xem và quản lý nhóm — thực thi chính sách và theo dõi vi phạm
                            </Text>
                        </div>

                        {/* Stats */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(4, 1fr)",
                                gap: 16,
                                marginBottom: 24
                            }}>
                            {[
                                { label: "Tổng số nhóm", value: stats.total, color: "#261E33" },
                                { label: "Đang hoạt động", value: stats.active, color: "#52c41a" },
                                { label: "Bị vô hiệu", value: stats.inactive, color: "#ff4d4f" },
                                { label: "Có báo cáo vi phạm", value: stats.reported, color: "#FF5F3D" }
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

                        {/* Filters */}
                        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                            <Search
                                placeholder="Tìm tên nhóm, studio, chủ nhóm..."
                                allowClear
                                prefix={<SearchOutlined style={{ color: "#6F6B99" }} />}
                                onChange={(e) => setSearch(e.target.value)}
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
                            <Select
                                value={filterType}
                                onChange={(v) => setFilterType(v)}
                                style={{ width: 140 }}
                                options={[
                                    { label: "Tất cả loại", value: "all" },
                                    { label: "Công khai", value: "public" },
                                    { label: "Riêng tư", value: "private" }
                                ]}
                            />
                            <Text style={{ color: "#6F6B99", alignSelf: "center", marginLeft: "auto" }}>
                                Hiển thị {filtered.length} / {groups.length} nhóm
                            </Text>
                        </div>

                        {/* Table */}
                        <div
                            style={{
                                background: "#fff",
                                borderRadius: 12,
                                border: "1px solid #E5E5E5",
                                overflow: "hidden"
                            }}>
                            <Table
                                columns={columns}
                                dataSource={filtered}
                                rowKey="id"
                                pagination={{ pageSize: 10, showSizeChanger: false }}
                                rowClassName={(record) => (record.reportCount > 3 ? "table-row-warning" : "")}
                            />
                        </div>
                    </div>
                </main>
            </div>

            {/* Group Detail Drawer */}
            <Drawer
                title={
                    <Space>
                        <Avatar
                            style={{ backgroundColor: selectedGroup?.status === "inactive" ? "#d9d9d9" : "#FF5F3D" }}
                            icon={<TeamOutlined />}
                        />
                        <div>
                            <div style={{ fontWeight: 700, color: "#261E33" }}>{selectedGroup?.name}</div>
                            <div style={{ fontSize: 12, color: "#6F6B99" }}>{selectedGroup?.id}</div>
                        </div>
                    </Space>
                }
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                width={480}
                extra={
                    selectedGroup && (
                        <Switch
                            checked={selectedGroup.status === "active"}
                            onChange={() => {
                                setDrawerOpen(false);
                                handleToggleStatus(selectedGroup);
                            }}
                            checkedChildren="Hoạt động"
                            unCheckedChildren="Vô hiệu"
                            style={{ backgroundColor: selectedGroup.status === "active" ? "#FF5F3D" : undefined }}
                        />
                    )
                }>
                {selectedGroup && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {selectedGroup.reportCount > 0 && (
                            <div
                                style={{
                                    background: "#fff2f0",
                                    border: "1px solid #ffccc7",
                                    borderRadius: 8,
                                    padding: "12px 16px"
                                }}>
                                <Text style={{ color: "#ff4d4f" }}>
                                    ⚠️ Nhóm này có <strong>{selectedGroup.reportCount} báo cáo vi phạm</strong> chưa được
                                    xử lý.
                                </Text>
                            </div>
                        )}

                        <div style={{ padding: "16px", background: "#F8F8F8", borderRadius: 10 }}>
                            <Badge
                                status={selectedGroup.status === "active" ? "success" : "default"}
                                text={
                                    <Text
                                        strong
                                        style={{ color: selectedGroup.status === "active" ? "#52c41a" : "#ff4d4f" }}>
                                        {selectedGroup.status === "active"
                                            ? "Nhóm đang hoạt động"
                                            : "Nhóm bị vô hiệu hoá"}
                                    </Text>
                                }
                            />
                        </div>

                        <Descriptions
                            column={1}
                            bordered
                            size="small"
                            labelStyle={{ color: "#6F6B99", fontWeight: 500 }}>
                            <Descriptions.Item
                                label={
                                    <>
                                        <FolderOutlined /> Studio
                                    </>
                                }>
                                {selectedGroup.studioName}
                            </Descriptions.Item>
                            <Descriptions.Item label="Loại nhóm">
                                <Tag color={selectedGroup.type === "public" ? "blue" : "purple"}>
                                    {selectedGroup.type === "public" ? "Công khai" : "Riêng tư"}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item
                                label={
                                    <>
                                        <UserOutlined /> Chủ nhóm
                                    </>
                                }>
                                {selectedGroup.ownerName}
                            </Descriptions.Item>
                            <Descriptions.Item label="Email chủ nhóm">{selectedGroup.ownerEmail}</Descriptions.Item>
                            <Descriptions.Item
                                label={
                                    <>
                                        <TeamOutlined /> Thành viên
                                    </>
                                }>
                                {selectedGroup.memberCount} / {selectedGroup.maxMembers} người
                                <div
                                    style={{
                                        background: "#f0f0f0",
                                        borderRadius: 4,
                                        height: 6,
                                        marginTop: 6,
                                        overflow: "hidden"
                                    }}>
                                    <div
                                        style={{
                                            width: `${getMemberPercent(selectedGroup.memberCount, selectedGroup.maxMembers)}%`,
                                            height: "100%",
                                            background: "#FF5F3D",
                                            borderRadius: 4
                                        }}
                                    />
                                </div>
                            </Descriptions.Item>
                            <Descriptions.Item label="Ngày tạo">{selectedGroup.createdAt}</Descriptions.Item>
                            <Descriptions.Item
                                label={
                                    <>
                                        <ClockCircleOutlined /> Hoạt động cuối
                                    </>
                                }>
                                {selectedGroup.lastActivity}
                            </Descriptions.Item>
                            <Descriptions.Item label="Số báo cáo">
                                {selectedGroup.reportCount > 0 ? (
                                    <Tag color="red">{selectedGroup.reportCount} vi phạm</Tag>
                                ) : (
                                    <Tag color="green">Không có vi phạm</Tag>
                                )}
                            </Descriptions.Item>
                        </Descriptions>

                        <Button
                            block
                            danger={selectedGroup.status === "active"}
                            type={selectedGroup.status === "inactive" ? "primary" : "default"}
                            icon={selectedGroup.status === "active" ? <LockOutlined /> : <UnlockOutlined />}
                            style={
                                selectedGroup.status === "inactive"
                                    ? { background: "#52c41a", borderColor: "#52c41a" }
                                    : {}
                            }
                            onClick={() => {
                                setDrawerOpen(false);
                                handleToggleStatus(selectedGroup);
                            }}>
                            {selectedGroup.status === "active" ? "Vô hiệu hoá nhóm" : "Kích hoạt nhóm"}
                        </Button>
                    </div>
                )}
            </Drawer>

            {/* Confirm Modal */}
            <Modal
                title={
                    <Space>
                        {confirmModal.action === "activate" ? (
                            <CheckCircleOutlined style={{ color: "#52c41a" }} />
                        ) : (
                            <StopOutlined style={{ color: "#ff4d4f" }} />
                        )}
                        {confirmModal.action === "activate" ? "Kích hoạt nhóm" : "Vô hiệu hoá nhóm"}
                    </Space>
                }
                open={confirmModal.open}
                onOk={confirmToggle}
                onCancel={() => setConfirmModal({ open: false, group: null, action: "activate" })}
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
                    nhóm <strong>"{confirmModal.group?.name}"</strong>?
                </p>
                {confirmModal.action === "deactivate" && (
                    <p style={{ color: "#6F6B99", fontSize: 13, marginTop: 8 }}>
                        Các thành viên trong nhóm sẽ không thể truy cập nội dung cho đến khi nhóm được kích hoạt lại.
                    </p>
                )}
            </Modal>
        </div>
    );
}

function _getMemberPercent(count: number, max: number) {
    return Math.round((count / max) * 100);
}
