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
import { useCallback, useEffect, useState } from "react";
import {
    convertGroupStatus,
    formatDate,
    GroupDisplayStatus,
    type GroupListItem,
    type GroupListSummary,
    getGroups,
    getGroupType,
    getGroupTypeLabel,
    getMemberPercent,
    updateGroupStatus
} from "@/api/admin-groups";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";

const { Title, Text } = Typography;
const { Search } = Input;

/**
 * Local Group type for UI (mapped from API GroupListItem)
 */
export type Group = {
    id: string;
    name: string;
    studioName: string;
    memberCount: number;
    maxMembers: number;
    status: GroupDisplayStatus;
    originalIsActive?: boolean;
    type: "public" | "private";
    createdAt: string;
    lastActivity: string;
};

const MAX_MEMBERS_DEFAULT = 50;

export function GroupManagementPage() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [summary, setSummary] = useState<GroupListSummary | null>(null);
    const [loading, setLoading] = useState(false);
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

    // Pagination state
    const [pageNumber, setPageNumber] = useState(1);
    const [pageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    // Fetch groups from API
    const fetchGroups = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                PageNumber: pageNumber,
                PageSize: pageSize,
                SearchTerm: search || undefined,
                GroupType: filterType !== "all" ? filterType : undefined
            };

            const response = await getGroups(params);

            if (response.status === "success" && response.data) {
                // Map API response to local Group type
                const mappedGroups: Group[] = (response.data.groupList || []).map((item: GroupListItem) => ({
                    id: item.groupId || "",
                    name: item.groupName || "",
                    studioName: item.studioName || "",
                    memberCount: item.memberCount || 0,
                    maxMembers: MAX_MEMBERS_DEFAULT,
                    status: convertGroupStatus(item.isActive),
                    originalIsActive: item.isActive,
                    type: getGroupType(item.groupType),
                    createdAt: formatDate(item.createdAt),
                    lastActivity: formatDate(item.lastActivityAt)
                }));

                setGroups(mappedGroups);
                setSummary(response.data.summary || null);
                setTotalCount(response.data.totalCount || 0);
            } else {
                messageApi.error({
                    content: response.message || "Không thể tải danh sách nhóm"
                });
            }
        } catch (error) {
            console.error("Lỗi khi tải danh sách nhóm:", error);
            messageApi.error({
                content: "Có lỗi xảy ra khi tải danh sách nhóm"
            });
        } finally {
            setLoading(false);
        }
    }, [pageNumber, pageSize, search, filterType, messageApi]);

    // Fetch data when filters change
    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

    // Reset page when search changes
    const handleSearchChange = (value: string) => {
        setSearch(value);
        setPageNumber(1);
    };

    // Reset page when filter type changes
    const handleFilterTypeChange = (value: "all" | "public" | "private") => {
        setFilterType(value);
        setPageNumber(1);
    };

    // Client-side filtering for status (since API doesn't have status filter)
    const filteredGroups = groups.filter((g) => {
        const matchStatus = filterStatus === "all" || g.status === filterStatus;
        return matchStatus;
    });

    const handleToggleStatus = (group: Group) => {
        const action = group.status === "active" ? "deactivate" : "activate";
        setConfirmModal({ open: true, group, action });
    };

    const confirmToggle = async () => {
        if (!confirmModal.group) return;

        const newStatus = confirmModal.action === "activate";
        const newStatusDisplay = confirmModal.action === "activate" ? "active" : "inactive";

        try {
            const response = await updateGroupStatus(confirmModal.group.id, newStatus);

            if (response.status === "success") {
                // Update local state
                setGroups((prev) =>
                    prev.map((g) => (g.id === confirmModal.group!.id ? { ...g, status: newStatusDisplay } : g))
                );
                if (selectedGroup?.id === confirmModal.group.id) {
                    setSelectedGroup((prev) => (prev ? { ...prev, status: newStatusDisplay } : null));
                }
                messageApi.success({
                    content:
                        confirmModal.action === "activate"
                            ? `Đã kích hoạt nhóm "${confirmModal.group.name}"`
                            : `Đã vô hiệu hoá nhóm "${confirmModal.group.name}"`
                });
            } else {
                messageApi.error({
                    content: response.message || "Không thể cập nhật trạng thái nhóm"
                });
            }
        } catch (error) {
            console.error("Lỗi khi cập nhật trạng thái nhóm:", error);
            messageApi.error({
                content: "Có lỗi xảy ra khi cập nhật trạng thái nhóm"
            });
        }

        setConfirmModal({ open: false, group: null, action: "activate" });
    };

    const columns: ColumnsType<Group> = [
        {
            title: "Nhóm",
            key: "group",
            render: (_, record) => (
                <Space>
                    <Avatar
                        style={{
                            backgroundColor: record.status === "inactive" ? "#d9d9d9" : "#FF5F3D",
                            flexShrink: 0
                        }}
                        icon={<TeamOutlined />}
                        size={38}
                    />
                    <div>
                        <div style={{ fontWeight: 600, color: "#261E33" }}>{record.name}</div>
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

    // Stats from API summary
    const stats = {
        total: summary?.totalGroups ?? filteredGroups.length,
        active: summary?.activeGroups ?? filteredGroups.filter((g) => g.status === "active").length,
        inactive: summary?.inactiveGroups ?? filteredGroups.filter((g) => g.status === "inactive").length
    };

    return (
        <div style={{ minHeight: "100vh", background: "#F8F8F8" }}>
            {contextHolder}
            <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
                <DashboardSidebar />
                <main style={{ flex: 1 }}>
                    <Header userProfile={null} />

                    <div style={{ padding: "24px" }}>
                        {/* Page Header */}
                        <div style={{ marginBottom: 24 }}>
                            <Title level={4} style={{ color: "#261E33", margin: 0 }}>
                                Quản lý nhóm học tập
                            </Title>
                            <Text style={{ color: "#6F6B99" }}>Xem và quản lý nhóm học tập</Text>
                        </div>

                        {/* Stats */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(3, 1fr)",
                                gap: 16,
                                marginBottom: 24
                            }}>
                            {[
                                { label: "Tổng số nhóm", value: stats.total, color: "#261E33" },
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

                        {/* Filters */}
                        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                            <Search
                                placeholder="Tìm tên nhóm, studio..."
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
                            <Select
                                value={filterType}
                                onChange={handleFilterTypeChange}
                                style={{ width: 140 }}
                                options={[
                                    { label: "Tất cả loại", value: "all" },
                                    { label: "Công khai", value: "public" },
                                    { label: "Riêng tư", value: "private" }
                                ]}
                            />
                            <Text style={{ color: "#6F6B99", alignSelf: "center", marginLeft: "auto" }}>
                                Hiển thị {filteredGroups.length} / {totalCount} nhóm
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
                                dataSource={filteredGroups}
                                rowKey="id"
                                loading={loading}
                                pagination={{
                                    current: pageNumber,
                                    pageSize: pageSize,
                                    total: totalCount,
                                    showSizeChanger: false,
                                    onChange: (page) => setPageNumber(page),
                                    showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} nhóm`
                                }}
                                rowClassName={() => ""}
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
