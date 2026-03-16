"use client";

import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    EyeOutlined,
    LockOutlined,
    MailOutlined,
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
import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";
import {
    getUsers,
    getUserById,
    updateUserStatus,
    canChangeUserStatus,
    convertApiStatus,
    formatDate,
    getInitials,
    type UserListItem,
    type UserDetailItem,
    type GetUsersParams,
    type UserDisplayStatus
} from "@/api/admin-users";

const { Title, Text } = Typography;
const { Search } = Input;

/**
 * Convert API user to display format
 */
export type User = {
    id: string;
    name: string;
    email: string;
    role: "user" | "premium" | "admin";
    status: UserDisplayStatus;
    originalStatus?: string; // Store original status from API to check if deleted
    joinDate: string;
    lastLogin: string;
    groups: number;
    studios: number;
    avatarUrl?: string;
};

/**
 * Convert UserListItem from API to User type
 */
function convertToUser(apiUser: UserListItem): User {
    return {
        id: apiUser.userId || "",
        name: apiUser.fullName || "Unknown",
        email: apiUser.email || "",
        role:
            convertApiStatus(apiUser.package) === "inactive" && apiUser.package
                ? "user"
                : apiUser.package === "Premium"
                  ? "premium"
                  : "user",
        status: convertApiStatus(apiUser.status),
        joinDate: formatDate(apiUser.createdAt),
        lastLogin: formatDate(apiUser.lastLoginAt),
        groups: apiUser.groupCount || 0,
        studios: apiUser.studioCount || 0,
        avatarUrl: undefined
    };
}

const ROLE_CONFIG: Record<User["role"], { color: string; label: string }> = {
    admin: { color: "red", label: "Admin" },
    premium: { color: "orange", label: "Premium" },
    user: { color: "default", label: "Free" }
};

export function UserManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
    const [filterRole, setFilterRole] = useState<"all" | User["role"]>("all");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedUserDetail, setSelectedUserDetail] = useState<UserDetailItem | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{
        open: boolean;
        user: User | null;
        action: "activate" | "deactivate";
    }>({ open: false, user: null, action: "activate" });
    const [messageApi, contextHolder] = message.useMessage();

    // Fetch users from API
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params: GetUsersParams = {
                PageSize: 100,
                SearchTerm: search || undefined,
                Status: filterStatus === "all" ? undefined : filterStatus === "active" ? 0 : 1
            };

            const response = await getUsers(params);

            if (response.status === "success" && response.data?.userList) {
                const convertedUsers: User[] = response.data.userList.map(
                    (apiUser): User => ({
                        id: apiUser.userId || "",
                        name: apiUser.fullName || "Unknown",
                        email: apiUser.email || "",
                        role: (apiUser.package === "Premium" ? "premium" : "user") as User["role"],
                        status: convertApiStatus(apiUser.status),
                        originalStatus: apiUser.status || undefined,
                        joinDate: formatDate(apiUser.createdAt),
                        lastLogin: formatDate(apiUser.lastLoginAt),
                        groups: apiUser.groupCount || 0,
                        studios: apiUser.studioCount || 0,
                        avatarUrl: undefined
                    })
                );
                setUsers(convertedUsers);
            } else {
                messageApi.error(response.message || "Không thể tải danh sách người dùng");
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            messageApi.error("Có lỗi xảy ra khi tải dữ liệu");
        } finally {
            setLoading(false);
        }
    }, [search, filterStatus, messageApi]);

    // Initial load and refetch on filter changes
    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Filter locally (for search)
    const filtered = users.filter((u) => {
        const matchSearch =
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase()) ||
            u.id.toLowerCase().includes(search.toLowerCase());
        const matchRole = filterRole === "all" || u.role === filterRole;
        return matchSearch && matchRole;
    });

    const handleToggleStatus = (user: User) => {
        const action = user.status === "active" ? "deactivate" : "activate";
        setConfirmModal({ open: true, user, action });
    };

    const confirmToggle = async () => {
        if (!confirmModal.user) return;

        // Check if user status can be changed (not deleted)
        if (!canChangeUserStatus(confirmModal.user.originalStatus)) {
            messageApi.error("Không thể thay đổi trạng thái của người dùng đã bị xóa");
            setConfirmModal({ open: false, user: null, action: "activate" });
            return;
        }

        const newStatusApi = confirmModal.action === "activate" ? "Active" : "Inactive";
        const newStatusLocal = confirmModal.action === "activate" ? "active" : "inactive";

        try {
            const response = await updateUserStatus(confirmModal.user.id, newStatusApi);

            if (response.status === "success") {
                // Update local state after successful API call
                setUsers((prev) =>
                    prev.map((u) => (u.id === confirmModal.user!.id ? { ...u, status: newStatusLocal } : u))
                );
                if (selectedUser?.id === confirmModal.user.id) {
                    setSelectedUser((prev) => (prev ? { ...prev, status: newStatusLocal } : null));
                }
                messageApi.success({
                    content:
                        confirmModal.action === "activate"
                            ? `Đã kích hoạt tài khoản ${confirmModal.user.name}`
                            : `Đã vô hiệu hoá tài khoản ${confirmModal.user.name}`,
                    icon:
                        confirmModal.action === "activate" ? (
                            <CheckCircleOutlined style={{ color: "#52c41a" }} />
                        ) : (
                            <StopOutlined style={{ color: "#ff4d4f" }} />
                        )
                });
            } else {
                messageApi.error(response.message || "Không thể cập nhật trạng thái");
            }
        } catch (error) {
            console.error("Error updating user status:", error);
            messageApi.error("Có lỗi xảy ra khi cập nhật trạng thái");
        }

        setConfirmModal({ open: false, user: null, action: "activate" });
    };

    // Handle viewing user details - fetch from API
    const handleViewUser = async (user: User) => {
        setSelectedUser(user);
        setDrawerOpen(true);

        try {
            const response = await getUserById(user.id);
            if (response.status === "success" && response.data) {
                setSelectedUserDetail(response.data);
            } else {
                messageApi.error(response.message || "Không thể tải thông tin người dùng");
            }
        } catch (error) {
            console.error("Error fetching user details:", error);
            messageApi.error("Có lỗi xảy ra khi tải thông tin người dùng");
        }
    };

    const columns: ColumnsType<User> = [
        {
            title: "Người dùng",
            key: "user",
            render: (_, record) => (
                <Space>
                    {record.avatarUrl ? (
                        <Avatar src={record.avatarUrl} style={{ flexShrink: 0 }} size={38} />
                    ) : (
                        <Avatar
                            style={{
                                backgroundColor: record.role === "premium" ? "#FF5F3D" : "#6F6B99",
                                flexShrink: 0
                            }}
                            size={38}>
                            {getInitials(record.name)}
                        </Avatar>
                    )}
                    <div>
                        <div style={{ fontWeight: 600, color: "#261E33" }}>{record.name}</div>
                        <div style={{ fontSize: 12, color: "#6F6B99" }}>{record.email}</div>
                    </div>
                </Space>
            )
        },
        {
            title: "Mã người dùng",
            dataIndex: "id",
            key: "id",
            render: (id) => <span style={{ fontFamily: "monospace", fontSize: 12, color: "#6F6B99" }}>{id}</span>
        },
        {
            title: "Gói",
            dataIndex: "role",
            key: "role",
            render: (role: User["role"]) => <Tag color={ROLE_CONFIG[role].color}>{ROLE_CONFIG[role].label}</Tag>
        },
        {
            title: "Nhóm / Studio",
            key: "activity",
            render: (_, record) => (
                <span style={{ color: "#6F6B99", fontSize: 13 }}>
                    {record.groups} nhóm · {record.studios} studio
                </span>
            )
        },
        {
            title: "Ngày tham gia",
            dataIndex: "joinDate",
            key: "joinDate",
            render: (d) => <span style={{ color: "#6F6B99", fontSize: 13 }}>{d}</span>
        },
        {
            title: "Đăng nhập gần nhất",
            dataIndex: "lastLogin",
            key: "lastLogin",
            render: (d) => <span style={{ color: "#6F6B99", fontSize: 13 }}>{d}</span>
        },
        {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            render: (status: UserDisplayStatus) => (
                <Badge
                    status={status === "active" ? "success" : status === "deleted" ? "error" : "default"}
                    text={status === "active" ? "Hoạt động" : status === "deleted" ? "Đã xóa" : "Bị vô hiệu"}
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
                            onClick={() => handleViewUser(record)}
                        />
                    </Tooltip>
                    {canChangeUserStatus(record.originalStatus) && (
                        <Tooltip title={record.status === "active" ? "Vô hiệu hoá" : "Kích hoạt"}>
                            <Switch
                                checked={record.status === "active"}
                                onChange={() => handleToggleStatus(record)}
                                checkedChildren={<UnlockOutlined />}
                                unCheckedChildren={<LockOutlined />}
                                style={{ backgroundColor: record.status === "active" ? "#FF5F3D" : undefined }}
                            />
                        </Tooltip>
                    )}
                </Space>
            )
        }
    ];

    const stats = {
        total: users.length,
        active: users.filter((u) => u.status === "active").length,
        inactive: users.filter((u) => u.status === "inactive").length,
        premium: users.filter((u) => u.role === "premium").length
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
                                Quản lý người dùng
                            </Title>
                            <Text style={{ color: "#6F6B99" }}>Xem và quản lý tài khoản người dùng trong hệ thống</Text>
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
                                { label: "Tổng người dùng", value: stats.total, color: "#261E33" },
                                { label: "Đang hoạt động", value: stats.active, color: "#52c41a" },
                                { label: "Bị vô hiệu", value: stats.inactive, color: "#ff4d4f" },
                                { label: "Người dùng Premium", value: stats.premium, color: "#FF5F3D" }
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
                                placeholder="Tìm tên, email, mã người dùng..."
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
                                value={filterRole}
                                onChange={(v) => setFilterRole(v)}
                                style={{ width: 140 }}
                                options={[
                                    { label: "Tất cả gói", value: "all" },
                                    { label: "Free", value: "user" },
                                    { label: "Premium", value: "premium" },
                                    { label: "Admin", value: "admin" }
                                ]}
                            />
                            <Text style={{ color: "#6F6B99", alignSelf: "center", marginLeft: "auto" }}>
                                Hiển thị {filtered.length} / {users.length} người dùng
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
                                loading={loading}
                                pagination={{ pageSize: 10, showSizeChanger: false }}
                                rowClassName={() => "hover-row"}
                            />
                        </div>
                    </div>
                </main>
            </div>

            {/* User Detail Drawer */}
            <Drawer
                title={
                    <Space>
                        {selectedUserDetail?.avatarUrl ? (
                            <Avatar src={selectedUserDetail.avatarUrl} />
                        ) : (
                            <Avatar
                                style={{
                                    backgroundColor: selectedUser?.role === "premium" ? "#FF5F3D" : "#6F6B99"
                                }}>
                                {getInitials(selectedUser?.name)}
                            </Avatar>
                        )}
                        <div>
                            <div style={{ fontWeight: 700, color: "#261E33" }}>{selectedUser?.name}</div>
                            <div style={{ fontSize: 12, color: "#6F6B99" }}>{selectedUser?.id}</div>
                        </div>
                    </Space>
                }
                open={drawerOpen}
                onClose={() => {
                    setDrawerOpen(false);
                    setSelectedUserDetail(null);
                }}
                width={480}
                extra={
                    selectedUser &&
                    canChangeUserStatus(selectedUser.originalStatus) && (
                        <Switch
                            checked={selectedUser.status === "active"}
                            onChange={() => {
                                setDrawerOpen(false);
                                handleToggleStatus(selectedUser);
                            }}
                            checkedChildren="Hoạt động"
                            unCheckedChildren="Vô hiệu"
                            style={{ backgroundColor: selectedUser.status === "active" ? "#FF5F3D" : undefined }}
                        />
                    )
                }>
                {selectedUser && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <div style={{ padding: "16px", background: "#F8F8F8", borderRadius: 10 }}>
                            <Badge
                                status={
                                    selectedUser.status === "active"
                                        ? "success"
                                        : selectedUser.status === "deleted"
                                          ? "error"
                                          : "default"
                                }
                                text={
                                    <Text
                                        strong
                                        style={{
                                            color:
                                                selectedUser.status === "active"
                                                    ? "#52c41a"
                                                    : selectedUser.status === "deleted"
                                                      ? "#ff4d4f"
                                                      : "#faad14"
                                        }}>
                                        {selectedUser.status === "active"
                                            ? "Tài khoản đang hoạt động"
                                            : selectedUser.status === "deleted"
                                              ? "Tài khoản đã bị xóa"
                                              : "Tài khoản bị vô hiệu hoá"}
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
                                        <MailOutlined /> Email
                                    </>
                                }>
                                {selectedUser.email}
                            </Descriptions.Item>
                            <Descriptions.Item label="Gói đăng ký">
                                <Tag color={ROLE_CONFIG[selectedUser.role].color}>
                                    {ROLE_CONFIG[selectedUser.role].label}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item
                                label={
                                    <>
                                        <TeamOutlined /> Nhóm
                                    </>
                                }>
                                {selectedUser.groups} nhóm
                            </Descriptions.Item>
                            <Descriptions.Item label="Studio">{selectedUser.studios} studio</Descriptions.Item>
                            <Descriptions.Item label="Ngày tham gia">{selectedUser.joinDate}</Descriptions.Item>
                            <Descriptions.Item
                                label={
                                    <>
                                        <ClockCircleOutlined /> Đăng nhập gần nhất
                                    </>
                                }>
                                {selectedUser.lastLogin}
                            </Descriptions.Item>
                        </Descriptions>

                        <div style={{ display: "flex", gap: 10 }}>
                            {canChangeUserStatus(selectedUser.originalStatus) && (
                                <Button
                                    block
                                    danger={selectedUser.status === "active"}
                                    type={selectedUser.status === "inactive" ? "primary" : "default"}
                                    icon={selectedUser.status === "active" ? <LockOutlined /> : <UnlockOutlined />}
                                    style={
                                        selectedUser.status === "inactive"
                                            ? { background: "#FF5F3D", borderColor: "#FF5F3D" }
                                            : {}
                                    }
                                    onClick={() => {
                                        setDrawerOpen(false);
                                        handleToggleStatus(selectedUser);
                                    }}>
                                    {selectedUser.status === "active" ? "Vô hiệu hoá tài khoản" : "Kích hoạt tài khoản"}
                                </Button>
                            )}
                        </div>
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
                        {confirmModal.action === "activate" ? "Kích hoạt tài khoản" : "Vô hiệu hoá tài khoản"}
                    </Space>
                }
                open={confirmModal.open}
                onOk={confirmToggle}
                onCancel={() => setConfirmModal({ open: false, user: null, action: "activate" })}
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
                    tài khoản của <strong>{confirmModal.user?.name}</strong>?
                </p>
                {confirmModal.action === "deactivate" && (
                    <p style={{ color: "#6F6B99", fontSize: 13, marginTop: 8 }}>
                        Người dùng sẽ không thể đăng nhập cho đến khi tài khoản được kích hoạt lại.
                    </p>
                )}
            </Modal>
        </div>
    );
}
