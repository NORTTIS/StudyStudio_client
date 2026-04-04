"use client";

import {
    AppstoreOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    TeamOutlined
} from "@ant-design/icons";
import { Col, Descriptions, Divider, Drawer, Empty, Row, Statistic, Tag } from "antd";
import { formatDate, getStatusColor, getStatusText, type StudioListItem } from "@/api/admin-studios";

interface StudioDetailDrawerProps {
    visible: boolean;
    studio: StudioListItem | null;
    onClose: () => void;
}

export default function StudioDetailDrawer({ visible, studio, onClose }: StudioDetailDrawerProps) {
    if (!studio) {
        return (
            <Drawer title="Chi tiết Studio" placement="right" onClose={onClose} open={visible} width={600}>
                <Empty description="Không có dữ liệu" />
            </Drawer>
        );
    }

    return (
        <Drawer
            title={
                <div className="flex items-center justify-between pr-8">
                    <span className="font-semibold text-lg">Chi tiết Studio</span>
                    <Tag color={getStatusColor(studio.isActive)} className="text-sm">
                        {getStatusText(studio.isActive)}
                    </Tag>
                </div>
            }
            placement="right"
            onClose={onClose}
            open={visible}
            width={700}>
            <div className="space-y-6">
                {/* Basic Info */}
                <div>
                    <h3 className="mb-2 font-bold text-gray-900 text-xl">{studio.studioName}</h3>
                    {studio.description && <p className="text-gray-600">{studio.description}</p>}
                </div>

                <Divider />

                {/* Statistics Cards */}
                <div>
                    <h4 className="mb-4 font-semibold text-gray-700">Thống kê</h4>
                    <Row gutter={[16, 16]}>
                        <Col span={8}>
                            <div className="rounded-lg bg-blue-50 p-4 text-center">
                                <AppstoreOutlined className="mb-2 text-3xl text-blue-600" />
                                <Statistic
                                    title="Nhóm"
                                    value={studio.groupCount}
                                    valueStyle={{ color: "#1890ff", fontSize: "24px" }}
                                />
                            </div>
                        </Col>
                        <Col span={8}>
                            <div className="rounded-lg bg-green-50 p-4 text-center">
                                <TeamOutlined className="mb-2 text-3xl text-green-600" />
                                <Statistic
                                    title="Thành viên"
                                    value={studio.memberCount}
                                    valueStyle={{ color: "#52c41a", fontSize: "24px" }}
                                />
                            </div>
                        </Col>
                        <Col span={8}>
                            <div className="rounded-lg bg-purple-50 p-4 text-center">
                                <CheckCircleOutlined className="mb-2 text-3xl text-purple-600" />
                                <Statistic
                                    title="Tasks"
                                    value={studio.taskCount}
                                    valueStyle={{ color: "#722ed1", fontSize: "24px" }}
                                />
                            </div>
                        </Col>
                    </Row>
                </div>

                <Divider />

                {/* Owner Info */}
                <div>
                    <h4 className="mb-3 font-semibold text-gray-700">Thông tin chủ sở hữu</h4>
                    <Descriptions bordered column={1} size="small">
                        <Descriptions.Item label="Tên">{studio.ownerName}</Descriptions.Item>
                        <Descriptions.Item label="Email">
                            <a href={`mailto:${studio.ownerEmail}`} className="text-blue-600 hover:underline">
                                {studio.ownerEmail}
                            </a>
                        </Descriptions.Item>
                    </Descriptions>
                </div>

                <Divider />

                {/* System Info */}
                <div>
                    <h4 className="mb-3 font-semibold text-gray-700">Thông tin hệ thống</h4>
                    <Descriptions bordered column={1} size="small">
                        <Descriptions.Item label="Studio ID">
                            <code className="rounded bg-gray-100 px-2 py-1 text-xs">{studio.studioId}</code>
                        </Descriptions.Item>
                        <Descriptions.Item label="Trạng thái">
                            <Tag color={getStatusColor(studio.isActive)}>{getStatusText(studio.isActive)}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item
                            label={
                                <span>
                                    <CalendarOutlined className="mr-2" />
                                    Ngày tạo
                                </span>
                            }>
                            {formatDate(studio.createdAt)}
                        </Descriptions.Item>
                        <Descriptions.Item
                            label={
                                <span>
                                    <ClockCircleOutlined className="mr-2" />
                                    Hoạt động gần nhất
                                </span>
                            }>
                            {formatDate(studio.lastActivityAt)}
                        </Descriptions.Item>
                    </Descriptions>
                </div>

                {/* Activity Metrics */}
                <div className="rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-4">
                    <h4 className="mb-3 font-semibold text-gray-700">Mức độ hoạt động</h4>
                    <Row gutter={16}>
                        <Col span={12}>
                            <div className="text-center">
                                <div className="font-bold text-2xl text-blue-600">
                                    {studio.groupCount && studio.memberCount
                                        ? (studio.groupCount / studio.memberCount).toFixed(2)
                                        : "0"}
                                </div>
                                <div className="text-gray-600 text-sm">Nhóm / Thành viên</div>
                            </div>
                        </Col>
                        <Col span={12}>
                            <div className="text-center">
                                <div className="font-bold text-2xl text-purple-600">
                                    {studio.taskCount && studio.memberCount
                                        ? (studio.taskCount / studio.memberCount).toFixed(1)
                                        : "0"}
                                </div>
                                <div className="text-gray-600 text-sm">Tasks / Thành viên</div>
                            </div>
                        </Col>
                    </Row>
                </div>
            </div>
        </Drawer>
    );
}
