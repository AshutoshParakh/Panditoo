import React, { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Typography,
  Space,
  Timeline,
  Progress,
  Button,
  Tooltip,
  Badge,
  Modal,
  List,
  Avatar,
  Alert,
} from "antd";
import {
  CompassOutlined,
  EyeOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  CreditCardOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  MobileOutlined,
  DesktopOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { DateRangeFilter } from "../components/DateRangeFilter";
import { adminApiRequest } from "../lib/api";
import { useAuth } from "../auth/AuthProvider";

const { Title, Text, Paragraph } = Typography;

export function CustomerJourneyPage() {
  const { token, handleAuthError } = useAuth();
  const [dateRange, setDateRange] = useState([null, null]);
  const [loading, setLoading] = useState(true);
  const [selectedStageModal, setSelectedStageModal] = useState(null);
  const [data, setData] = useState({
    funnel: {
      session_start: 0,
      authed_session_start: 0,
      pooja_view: 0,
      authed_pooja_view: 0,
      booking_started: 0,
      authed_booking_started: 0,
      checkout_view: 0,
      authed_checkout_view: 0,
      payment_initiated: 0,
      authed_payment_initiated: 0,
      booking_completed: 0,
      authed_booking_completed: 0,
    },
    dropoffs: [],
    authedCustomersByStage: {},
    sessions: [],
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange && dateRange[0]) params.append("startDate", dateRange[0]);
      if (dateRange && dateRange[1]) params.append("endDate", dateRange[1]);

      const res = await adminApiRequest(`/admin/analytics/journey-funnel?${params.toString()}`, { token });
      if (res?.success) {
        setData(res.data);
      }
    } catch (err) {
      if (handleAuthError && handleAuthError(err)) return;
      console.error("Failed to fetch journey analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const { funnel, dropoffs, authedCustomersByStage = {}, sessions } = data;

  const initial = funnel.session_start || 1;
  const poojaViewPct = Math.round((funnel.pooja_view / initial) * 100);
  const bookingStartPct = Math.round((funnel.booking_started / initial) * 100);
  const checkoutPct = Math.round((funnel.checkout_view / initial) * 100);
  const paymentPct = Math.round((funnel.payment_initiated / initial) * 100);
  const completedPct = Math.round((funnel.booking_completed / initial) * 100);

  const getStageColor = (stage) => {
    switch (stage) {
      case "payment_gateway":
        return "volcano";
      case "address_entry":
        return "orange";
      case "date_time_selection":
        return "gold";
      case "pandit_selection":
        return "blue";
      case "pooja_details":
        return "purple";
      default:
        return "default";
    }
  };

  const formatStageLabel = (stage) => {
    switch (stage) {
      case "payment_gateway":
        return "Payment Gateway Abandoned";
      case "address_entry":
        return "Address Entry Exit";
      case "date_time_selection":
        return "Date/Time Selection Exit";
      case "pandit_selection":
        return "Pandit Preference Exit";
      case "pooja_details":
        return "Pooja Details Exit";
      case "browsing_exit":
        return "Browsing Exit";
      default:
        return stage?.replace(/_/g, " ");
    }
  };

  const columns = [
    {
      title: "Session & Devotee Profile",
      key: "session",
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Space>
            {record.platform === "mobile_app" ? (
              <MobileOutlined style={{ color: "#722ed1" }} />
            ) : (
              <DesktopOutlined style={{ color: "#1890ff" }} />
            )}
            <Text strong style={{ fontSize: 13 }}>
              {record.session_id.slice(0, 18)}...
            </Text>
          </Space>
          {record.user_name ? (
            <Tag icon={<UserOutlined />} color="gold" style={{ fontWeight: 600, padding: "2px 8px" }}>
              👤 {record.user_name} ({record.user_phone || record.user_email || "Authenticated"})
            </Tag>
          ) : (
            <Tag color="default" style={{ fontSize: 11 }}>
              Guest / Guest Devotee
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Target Ceremony",
      dataIndex: "target_pooja",
      key: "target_pooja",
      render: (val) =>
        val ? (
          <Tag color="purple" style={{ fontWeight: 600 }}>
            {val}
          </Tag>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Total Actions",
      dataIndex: "event_count",
      key: "event_count",
      render: (count) => <Badge count={`${count} events`} style={{ backgroundColor: "#b45309" }} />,
    },
    {
      title: "Status & Stage Outcome",
      key: "status",
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          {record.is_completed ? (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Booking Completed ✅
            </Tag>
          ) : (
            <Tag color={getStageColor(record.last_dropoff_stage)} icon={<CloseCircleOutlined />}>
              Exited @ {formatStageLabel(record.last_dropoff_stage)}
            </Tag>
          )}
          <Text type="secondary" style={{ fontSize: 11 }}>
            Last active: {new Date(record.last_active_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </Text>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Top Header */}
      <Card style={{ marginBottom: 24, borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Space align="center" size="middle">
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #b45309, #d97706)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 22,
                }}
              >
                <CompassOutlined />
              </div>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  Customer Journey & Authenticated Funnel Tracker
                </Title>
                <Text type="secondary">
                  Track authenticated devotees across every stage & identify exact drop-off points with customer details
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space size="middle">
              <DateRangeFilter onChange={setDateRange} />
              <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Funnel Pipeline Visualizer with Authenticated Customer Breakdown */}
      <Card title="📈 Step-by-Step Conversion Funnel (All vs Authenticated Devotees)" style={{ marginBottom: 24, borderRadius: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={4}>
            <Card bordered style={{ textAlign: "center", borderRadius: 12, background: "#fafafa" }}>
              <EyeOutlined style={{ fontSize: 24, color: "#1890ff", marginBottom: 8 }} />
              <Statistic title="1. App / Web Visits" value={funnel.session_start || 0} />
              <Tag color="cyan" style={{ marginTop: 4 }}>
                👤 {funnel.authed_session_start || 0} Logged-in
              </Tag>
              <Progress percent={100} size="small" status="active" strokeColor="#1890ff" style={{ marginTop: 8 }} />
            </Card>
          </Col>

          <Col xs={24} sm={12} md={4}>
            <Card bordered style={{ textAlign: "center", borderRadius: 12, background: "#fafafa" }}>
              <EyeOutlined style={{ fontSize: 24, color: "#722ed1", marginBottom: 8 }} />
              <Statistic title="2. Viewed Pooja" value={funnel.pooja_view || 0} />
              <Tag color="purple" style={{ marginTop: 4 }}>
                👤 {funnel.authed_pooja_view || 0} Logged-in
              </Tag>
              <Progress percent={poojaViewPct} size="small" strokeColor="#722ed1" style={{ marginTop: 8 }} />
            </Card>
          </Col>

          <Col xs={24} sm={12} md={4}>
            <Card bordered style={{ textAlign: "center", borderRadius: 12, background: "#fafafa" }}>
              <CalendarOutlined style={{ fontSize: 24, color: "#fa8c16", marginBottom: 8 }} />
              <Statistic title="3. Started Booking" value={funnel.booking_started || 0} />
              <Tag color="orange" style={{ marginTop: 4 }}>
                👤 {funnel.authed_booking_started || 0} Logged-in
              </Tag>
              <Progress percent={bookingStartPct} size="small" strokeColor="#fa8c16" style={{ marginTop: 8 }} />
            </Card>
          </Col>

          <Col xs={24} sm={12} md={4}>
            <Card bordered style={{ textAlign: "center", borderRadius: 12, background: "#fafafa" }}>
              <EnvironmentOutlined style={{ fontSize: 24, color: "#faad14", marginBottom: 8 }} />
              <Statistic title="4. Checkout Screen" value={funnel.checkout_view || 0} />
              <Tag color="gold" style={{ marginTop: 4 }}>
                👤 {funnel.authed_checkout_view || 0} Logged-in
              </Tag>
              <Progress percent={checkoutPct} size="small" strokeColor="#faad14" style={{ marginTop: 8 }} />
            </Card>
          </Col>

          <Col xs={24} sm={12} md={4}>
            <Card bordered style={{ textAlign: "center", borderRadius: 12, background: "#fafafa" }}>
              <CreditCardOutlined style={{ fontSize: 24, color: "#f5222d", marginBottom: 8 }} />
              <Statistic title="5. Payment Gateway" value={funnel.payment_initiated || 0} />
              <Tag color="volcano" style={{ marginTop: 4 }}>
                👤 {funnel.authed_payment_initiated || 0} Logged-in
              </Tag>
              <Progress percent={paymentPct} size="small" strokeColor="#f5222d" style={{ marginTop: 8 }} />
            </Card>
          </Col>

          <Col xs={24} sm={12} md={4}>
            <Card bordered style={{ textAlign: "center", borderRadius: 12, background: "#f6ffed", borderColor: "#52c41a" }}>
              <CheckCircleOutlined style={{ fontSize: 24, color: "#52c41a", marginBottom: 8 }} />
              <Statistic title="6. Booked ✅" value={funnel.booking_completed || 0} valueStyle={{ color: "#52c41a" }} />
              <Tag color="success" style={{ marginTop: 4 }}>
                👤 {funnel.authed_booking_completed || 0} Logged-in
              </Tag>
              <Progress percent={completedPct} size="small" strokeColor="#52c41a" style={{ marginTop: 8 }} />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Stage Drop-off Breakdown & Authenticated Customers List */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={10}>
          <Card title="🚪 Stage Drop-offs & Devotees Lost" style={{ height: "100%", borderRadius: 16 }}>
            <Paragraph type="secondary" style={{ fontSize: 13 }}>
              Click on any stage to view the full details (Name, Phone, Email) of authenticated customers who dropped off:
            </Paragraph>
            {dropoffs.length === 0 ? (
              <Alert message="No drop-offs recorded for this date range." type="info" showIcon />
            ) : (
              dropoffs.map((item, idx) => {
                const authedList = authedCustomersByStage[item.stage] || [];
                return (
                  <Card
                    key={idx}
                    type="inner"
                    size="small"
                    style={{ marginBottom: 12, borderRadius: 10, cursor: "pointer" }}
                    onClick={() => setSelectedStageModal({ stage: item.stage, list: authedList })}
                  >
                    <Row justify="space-between" align="middle">
                      <Col>
                        <Tag color={getStageColor(item.stage)} style={{ padding: "4px 10px", fontSize: 13, borderRadius: 6 }}>
                          {formatStageLabel(item.stage)}
                        </Tag>
                      </Col>
                      <Col>
                        <Space>
                          <Text strong style={{ fontSize: 14 }}>
                            {item.count} sessions
                          </Text>
                          {authedList.length > 0 && (
                            <Tag color="gold" style={{ fontWeight: 600 }}>
                              👤 {authedList.length} Authenticated
                            </Tag>
                          )}
                          <ArrowRightOutlined />
                        </Space>
                      </Col>
                    </Row>
                  </Card>
                );
              })
            )}
          </Card>
        </Col>

        {/* Live Customer Journeys Table */}
        <Col xs={24} md={14}>
          <Card title="🔍 Customer Session Clickstreams (Authenticated & Guest)" style={{ height: "100%", borderRadius: 16 }}>
            <Table
              dataSource={sessions}
              columns={columns}
              rowKey="session_id"
              loading={loading}
              pagination={{ pageSize: 6 }}
              expandable={{
                expandedRowRender: (record) => (
                  <div style={{ padding: "16px 24px", background: "#fcfcfc", borderRadius: 10, border: "1px solid #f0f0f0" }}>
                    <Space direction="vertical" style={{ width: "100%", marginBottom: 14 }}>
                      <Text strong style={{ fontSize: 14 }}>
                        Customer Journey Clickstream Timeline: {record.session_id}
                      </Text>
                      {record.user_name && (
                        <Alert
                          type="warning"
                          showIcon
                          icon={<UserOutlined />}
                          message={
                            <Space size="middle">
                              <span><b>Devotee Name:</b> {record.user_name}</span>
                              {record.user_phone && <span><b>Phone:</b> +91 {record.user_phone}</span>}
                              {record.user_email && <span><b>Email:</b> {record.user_email}</span>}
                            </Space>
                          }
                        />
                      )}
                    </Space>

                    <Timeline mode="left">
                      {record.events.map((evt, i) => (
                        <Timeline.Item
                          key={evt.id || i}
                          color={
                            evt.event_type === "booking_completed"
                              ? "green"
                              : evt.event_type === "payment_initiated"
                              ? "red"
                              : evt.event_type === "funnel_dropoff"
                              ? "orange"
                              : "blue"
                          }
                        >
                          <Space wrap>
                            <Text strong style={{ fontSize: 12 }}>
                              {new Date(evt.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </Text>
                            <Tag color="geekblue">{evt.event_type.replace(/_/g, " ").toUpperCase()}</Tag>
                            {evt.page_path && <Tag>{evt.page_path}</Tag>}
                            {evt.pooja_name && <Tag color="purple">{evt.pooja_name}</Tag>}
                            {evt.user_name && <Tag color="gold">👤 {evt.user_name}</Tag>}
                            {evt.dropoffStage && (
                              <Tag color="volcano">Exited @ {formatStageLabel(evt.dropoffStage)}</Tag>
                            )}
                          </Space>
                        </Timeline.Item>
                      ))}
                    </Timeline>
                  </div>
                ),
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Authenticated Devotees Modal per Drop-off Stage */}
      <Modal
        title={
          selectedStageModal ? (
            <Space>
              <UserOutlined style={{ color: "#b45309" }} />
              <span>
                Authenticated Customers who exited at: <b>{formatStageLabel(selectedStageModal.stage)}</b>
              </span>
            </Space>
          ) : (
            "Authenticated Devotees"
          )
        }
        visible={!!selectedStageModal}
        onCancel={() => setSelectedStageModal(null)}
        footer={null}
        width={700}
      >
        {selectedStageModal?.list?.length ? (
          <List
            itemLayout="horizontal"
            dataSource={selectedStageModal.list}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} style={{ backgroundColor: "#b45309" }} />}
                  title={
                    <Space>
                      <Text strong style={{ fontSize: 15 }}>{item.user_name}</Text>
                      {item.pooja_name && <Tag color="purple">{item.pooja_name}</Tag>}
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={2} style={{ marginTop: 4 }}>
                      <Space size="middle">
                        {item.user_phone && (
                          <span><PhoneOutlined /> +91 {item.user_phone}</span>
                        )}
                        {item.user_email && (
                          <span><MailOutlined /> {item.user_email}</span>
                        )}
                      </Space>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Last Active: {new Date(item.last_active_at).toLocaleString()}
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Alert
            message="No authenticated (logged-in) customers dropped off at this stage."
            description="All visitors who exited at this stage were guest/anonymous users."
            type="info"
            showIcon
          />
        )}
      </Modal>
    </div>
  );
}
