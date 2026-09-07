import React, { useEffect, useState, useMemo } from "react";
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
  Modal,
  List,
  Avatar,
  Alert,
  Input,
  Segmented,
  Tooltip,
  Descriptions,
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
  SearchOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  NodeIndexOutlined,
} from "@ant-design/icons";
import { DateRangeFilter } from "../components/DateRangeFilter";
import { adminApiRequest } from "../lib/api";
import { useAuth } from "../auth/AuthProvider";

const { Title, Text, Paragraph } = Typography;

const safeFormatTime = (val) => {
  if (!val) return "";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch (_) {
    return "";
  }
};

const safeFormatDateTime = (val) => {
  if (!val) return "N/A";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleString();
  } catch (_) {
    return "N/A";
  }
};

class ModalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ModalErrorBoundary caught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20 }}>
          <Alert
            message="Modal Render Error"
            description={
              <div>
                <p><b>Error:</b> {this.state.error?.toString()}</p>
                <pre style={{ fontSize: 11, background: "#fff", padding: 10, overflow: "auto" }}>
                  {this.state.errorInfo?.componentStack}
                </pre>
                <Button type="primary" onClick={() => this.setState({ hasError: false, error: null })}>
                  Reset Modal
                </Button>
              </div>
            }
            type="error"
            showIcon
          />
        </div>
      );
    }
    return this.props.children;
  }
}

export function CustomerJourneyPage() {
  const { token, handleAuthError } = useAuth();
  const [dateRange, setDateRange] = useState([null, null]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [sessionFilter, setSessionFilter] = useState("all");

  // Modals
  const [selectedStageModal, setSelectedStageModal] = useState(null); // { title: '', stage: '', list: [] }
  const [selectedSessionModal, setSelectedSessionModal] = useState(null); // session record

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
    authedCustomersByFunnelStage: {},
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

  const {
    funnel = {},
    dropoffs = [],
    authedCustomersByStage = {},
    authedCustomersByFunnelStage = {},
    sessions = [],
  } = data;

  const initial = funnel.session_start || 1;
  const poojaViewPct = Math.min(100, Math.round((funnel.pooja_view / initial) * 100));
  const bookingStartPct = Math.min(100, Math.round((funnel.booking_started / initial) * 100));
  const checkoutPct = Math.min(100, Math.round((funnel.checkout_view / initial) * 100));
  const paymentPct = Math.min(100, Math.round((funnel.payment_initiated / initial) * 100));
  const completedPct = Math.min(100, Math.round((funnel.booking_completed / initial) * 100));

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
      case "otp_pending":
        return "magenta";
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
      case "otp_pending":
        return "OTP Waiting Exit";
      case "pooja_details":
        return "Pooja Details Exit";
      case "browsing_exit":
        return "Browsing Exit";
      default:
        return stage?.replace(/_/g, " ") || "Browsing Exit";
    }
  };

  // Filtered Sessions for table
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // Type filter
      if (sessionFilter === "authed" && !s.user_id) return false;
      if (sessionFilter === "dropped" && s.is_completed) return false;
      if (sessionFilter === "completed" && !s.is_completed) return false;

      // Search text filter
      if (!searchText.trim()) return true;
      const q = searchText.toLowerCase();
      const matchId = s.session_id?.toLowerCase().includes(q);
      const matchName = s.user_name?.toLowerCase().includes(q);
      const matchPhone = s.user_phone?.toLowerCase().includes(q);
      const matchEmail = s.user_email?.toLowerCase().includes(q);
      const matchPooja = s.target_pooja?.toLowerCase().includes(q);
      return matchId || matchName || matchPhone || matchEmail || matchPooja;
    });
  }, [sessions, sessionFilter, searchText]);

  const openSessionModal = (record) => {
    setSelectedSessionModal(record);
  };

  const openStageModal = (title, stageKey, list) => {
    const stageSessions = (sessions || []).filter((s) => s.last_dropoff_stage === stageKey);
    setSelectedStageModal({ title, stage: stageKey, list: list || [], sessions: stageSessions });
  };

  const columns = [
    {
      title: "Session & Devotee Profile",
      key: "session",
      width: 310,
      render: (_, record) => (
        <Space direction="vertical" size={2} style={{ width: "100%" }}>
          <Space align="center">
            {record.platform === "mobile_app" ? (
              <MobileOutlined style={{ color: "#722ed1", fontSize: 16 }} />
            ) : (
              <DesktopOutlined style={{ color: "#1890ff", fontSize: 16 }} />
            )}
            <Text
              strong
              style={{
                fontSize: 13,
                color: "#1890ff",
                fontFamily: "monospace",
                whiteSpace: "nowrap",
              }}
            >
              {record.session_id}
            </Text>
          </Space>
          {record.user_name ? (
            <Tag icon={<UserOutlined />} color="gold" style={{ fontWeight: 600, padding: "2px 8px", width: "fit-content" }}>
              👤 {record.user_name} ({record.user_phone ? `+91 ${record.user_phone}` : record.user_email || "Logged-in"})
            </Tag>
          ) : (
            <Tag color="default" style={{ fontSize: 11, width: "fit-content" }}>
              Guest Devotee (Anonymous)
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Target Ceremony",
      dataIndex: "target_pooja",
      key: "target_pooja",
      width: 150,
      render: (val) =>
        val ? (
          <Tag color="purple" style={{ fontWeight: 600, whiteSpace: "normal" }}>
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
      width: 110,
      render: (count) => <Tag color="orange" style={{ fontWeight: 600 }}>{count} events</Tag>,
    },
    {
      title: "Status & Stage Outcome",
      key: "status",
      width: 200,
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
            Last active: {safeFormatTime(record.last_active_at) || "N/A"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 130,
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            openSessionModal(record);
          }}
          style={{ borderRadius: 6 }}
        >
          View Events
        </Button>
      ),
    },
  ];

  const funnelCards = [
    {
      key: "session_start",
      title: "1. App / Web Visits",
      icon: <EyeOutlined style={{ fontSize: 24, color: "#1890ff" }} />,
      count: funnel.session_start || 0,
      authedCount: funnel.authed_session_start || 0,
      pct: 100,
      color: "#1890ff",
      tagColor: "cyan",
      stageKey: "session_start",
    },
    {
      key: "pooja_view",
      title: "2. Viewed Pooja",
      icon: <EyeOutlined style={{ fontSize: 24, color: "#722ed1" }} />,
      count: funnel.pooja_view || 0,
      authedCount: funnel.authed_pooja_view || 0,
      pct: poojaViewPct,
      color: "#722ed1",
      tagColor: "purple",
      stageKey: "pooja_view",
    },
    {
      key: "booking_started",
      title: "3. Started Booking",
      icon: <CalendarOutlined style={{ fontSize: 24, color: "#fa8c16" }} />,
      count: funnel.booking_started || 0,
      authedCount: funnel.authed_booking_started || 0,
      pct: bookingStartPct,
      color: "#fa8c16",
      tagColor: "orange",
      stageKey: "booking_started",
    },
    {
      key: "checkout_view",
      title: "4. Checkout Screen",
      icon: <EnvironmentOutlined style={{ fontSize: 24, color: "#faad14" }} />,
      count: funnel.checkout_view || 0,
      authedCount: funnel.authed_checkout_view || 0,
      pct: checkoutPct,
      color: "#faad14",
      tagColor: "gold",
      stageKey: "checkout_view",
    },
    {
      key: "payment_initiated",
      title: "5. Payment Gateway",
      icon: <CreditCardOutlined style={{ fontSize: 24, color: "#f5222d" }} />,
      count: funnel.payment_initiated || 0,
      authedCount: funnel.authed_payment_initiated || 0,
      pct: paymentPct,
      color: "#f5222d",
      tagColor: "volcano",
      stageKey: "payment_initiated",
    },
    {
      key: "booking_completed",
      title: "6. Booked ✅",
      icon: <CheckCircleOutlined style={{ fontSize: 24, color: "#52c41a" }} />,
      count: funnel.booking_completed || 0,
      authedCount: funnel.authed_booking_completed || 0,
      pct: completedPct,
      color: "#52c41a",
      tagColor: "success",
      stageKey: "booking_completed",
      isSuccess: true,
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
                  Track customer journeys across every stage, view step clickstreams, and inspect authenticated devotees.
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

      {/* Funnel Pipeline Visualizer */}
      <Card
        title={
          <Space>
            <span>📈 Step-by-Step Conversion Funnel (All vs Authenticated Devotees)</span>
            <Tooltip title="Click any stage card to view all authenticated devotees who reached that stage!">
              <InfoCircleOutlined style={{ color: "#1890ff" }} />
            </Tooltip>
          </Space>
        }
        style={{ marginBottom: 24, borderRadius: 16 }}
      >
        <Row gutter={[16, 16]}>
          {funnelCards.map((fc) => {
            const list = authedCustomersByFunnelStage[fc.stageKey] || [];
            return (
              <Col xs={24} sm={12} md={4} key={fc.key}>
                <Card
                  hoverable
                  bordered
                  style={{
                    textAlign: "center",
                    borderRadius: 12,
                    background: fc.isSuccess ? "#f6ffed" : "#fafafa",
                    borderColor: fc.isSuccess ? "#52c41a" : "#e8e8e8",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onClick={() => openStageModal(fc.title, fc.stageKey, list)}
                >
                  <div style={{ marginBottom: 8 }}>{fc.icon}</div>
                  <Statistic
                    title={fc.title}
                    value={fc.count}
                    valueStyle={fc.isSuccess ? { color: "#52c41a", fontWeight: "bold" } : {}}
                  />
                  <Tooltip title="Click to view authenticated customers at this stage">
                    <Tag color={fc.tagColor} style={{ marginTop: 6, fontWeight: 600, cursor: "pointer" }}>
                      👤 {fc.authedCount} Logged-in
                    </Tag>
                  </Tooltip>
                  <Progress percent={fc.pct} size="small" strokeColor={fc.color} style={{ marginTop: 8 }} />
                </Card>
              </Col>
            );
          })}
        </Row>
      </Card>

      {/* Stage Drop-off Breakdown & Authenticated Customers List */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={10}>
          <Card
            title={
              <Space>
                <span>🚪 Stage Drop-offs & Devotees Lost</span>
                <Tooltip title="Click on any stage to see authenticated customers who exited at that point">
                  <InfoCircleOutlined style={{ color: "#fa8c16" }} />
                </Tooltip>
              </Space>
            }
            style={{ height: "100%", borderRadius: 16 }}
          >
            <Paragraph type="secondary" style={{ fontSize: 13 }}>
              Click on any stage card below to view details (Name, Phone, Email) of authenticated customers who dropped off:
            </Paragraph>

            {dropoffs.length === 0 ? (
              <Alert message="No drop-offs recorded for this date range." type="info" showIcon />
            ) : (
              dropoffs.map((item, idx) => {
                const authedList = authedCustomersByStage[item.stage] || [];
                return (
                  <Card
                    key={idx}
                    hoverable
                    type="inner"
                    size="small"
                    style={{ marginBottom: 12, borderRadius: 10, cursor: "pointer", border: "1px solid #f0f0f0" }}
                    onClick={() => openStageModal(formatStageLabel(item.stage), item.stage, authedList)}
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
                          {authedList.length > 0 ? (
                            <Tag color="gold" style={{ fontWeight: 600 }}>
                              👤 {authedList.length} Authenticated
                            </Tag>
                          ) : (
                            <Tag color="default" style={{ fontSize: 11 }}>
                              Guest Only
                            </Tag>
                          )}
                          <ArrowRightOutlined style={{ color: "#b45309" }} />
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
          <Card
            title={
              <Row justify="space-between" align="middle" style={{ width: "100%" }}>
                <Col>
                  <span>🔍 Customer Session Clickstreams ({filteredSessions.length})</span>
                </Col>
                <Col>
                  <Segmented
                    value={sessionFilter}
                    onChange={setSessionFilter}
                    options={[
                      { label: "All", value: "all" },
                      { label: "Logged-in", value: "authed" },
                      { label: "Dropped Off", value: "dropped" },
                      { label: "Booked", value: "completed" },
                    ]}
                    size="small"
                  />
                </Col>
              </Row>
            }
            style={{ height: "100%", borderRadius: 16 }}
          >
            <div style={{ marginBottom: 16 }}>
              <Input
                placeholder="Search by Session ID, Name, Phone, Email or Pooja..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </div>

            <Table
              dataSource={filteredSessions}
              columns={columns}
              rowKey="session_id"
              loading={loading}
              scroll={{ x: 900 }}
              pagination={{ pageSize: 7 }}
              onRow={(record) => ({
                onClick: () => openSessionModal(record),
                style: { cursor: "pointer" },
              })}
              expandable={{
                expandedRowRender: (record) => (
                  <div style={{ padding: "16px 24px", background: "#fafafa", borderRadius: 10, border: "1px solid #f0f0f0" }}>
                    <Space direction="vertical" style={{ width: "100%", marginBottom: 14 }}>
                      <Space justify="space-between" style={{ width: "100%" }}>
                        <Text strong style={{ fontSize: 14 }}>
                          Customer Journey Clickstream: {record.session_id}
                        </Text>
                        <Button type="link" onClick={() => openSessionModal(record)}>
                          Open Full Modal Audit →
                        </Button>
                      </Space>

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

                    <Timeline
                      items={(record.events || []).map((evt, i) => {
                        const eventTypeStr = (evt.event_type || "event").replace(/_/g, " ").toUpperCase();
                        const timeStr = safeFormatTime(evt.created_at);

                        const color =
                          evt.event_type === "booking_completed"
                            ? "green"
                            : evt.event_type === "payment_initiated"
                              ? "red"
                              : evt.event_type === "funnel_dropoff"
                                ? "orange"
                                : "blue";

                        return {
                          key: evt.id || i,
                          color,
                          children: (
                            <Space wrap align="center">
                              {timeStr && (
                                <Text strong style={{ fontSize: 12 }}>
                                  {timeStr}
                                </Text>
                              )}
                              <Tag color="geekblue">{eventTypeStr}</Tag>
                              {evt.page_path && <Tag>{evt.page_path}</Tag>}
                              {evt.pooja_name && <Tag color="purple">{evt.pooja_name}</Tag>}
                              {evt.user_name && <Tag color="gold">👤 {evt.user_name}</Tag>}
                              {evt.dropoffStage && (
                                <Tag color="volcano">Exited @ {formatStageLabel(evt.dropoffStage)}</Tag>
                              )}
                            </Space>
                          ),
                        };
                      })}
                    />
                  </div>
                ),
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Stage Dropoff / Funnel Stage Audit Modal */}
      <Modal
        title={
          selectedStageModal ? (
            <Space align="center">
              <NodeIndexOutlined style={{ color: "#b45309" }} />
              <span>
                Stage Audit Details: <b>{selectedStageModal.title}</b>
              </span>
            </Space>
          ) : (
            "Stage Audit Details"
          )
        }
        open={!!selectedStageModal}
        onCancel={() => setSelectedStageModal(null)}
        footer={
          <Button type="primary" onClick={() => setSelectedStageModal(null)}>
            Close
          </Button>
        }
        width={780}
      >
        {selectedStageModal && (
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            {/* Header info alert */}
            <Alert
              message={`Detailed breakdown of customers lost at stage: ${selectedStageModal.title}`}
              description={
                selectedStageModal.list?.length
                  ? `Found ${selectedStageModal.list.length} authenticated devotee(s) who abandoned at this stage. You can call them directly or audit their exact clickstream below.`
                  : `Found ${selectedStageModal.sessions?.length || 0} total session(s) recorded at this stage.`
              }
              type={selectedStageModal.list?.length ? "warning" : "info"}
              showIcon
            />

            {/* List of Devotees / Sessions */}
            {((selectedStageModal.list && selectedStageModal.list.length > 0) || (selectedStageModal.sessions && selectedStageModal.sessions.length > 0)) ? (
              <List
                itemLayout="vertical"
                size="small"
                dataSource={
                  selectedStageModal.list?.length > 0
                    ? selectedStageModal.list
                    : selectedStageModal.sessions
                }
                renderItem={(item) => {
                  const matchingSession = (sessions || []).find(
                    (s) => s.session_id === item.session_id || (item.user_id && s.user_id === item.user_id)
                  ) || item;

                  const isAuthed = !!(item.user_name || item.user_phone || item.user_email || matchingSession?.user_name);
                  const devoteeName = item.user_name || matchingSession?.user_name || "Guest Devotee (Anonymous)";
                  const devoteePhone = item.user_phone || matchingSession?.user_phone;
                  const devoteeEmail = item.user_email || matchingSession?.user_email;
                  const targetPooja = item.pooja_name || matchingSession?.target_pooja;

                  return (
                    <List.Item key={item.session_id || item.user_id} style={{ padding: "8px 0" }}>
                      <Card
                        size="small"
                        style={{
                          borderRadius: 10,
                          background: isAuthed ? "#fffbe6" : "#fafafa",
                          borderColor: isAuthed ? "#ffe58f" : "#f0f0f0",
                        }}
                      >
                        <Row justify="space-between" align="middle" gutter={[12, 12]}>
                          <Col>
                            <Space align="center" size="middle">
                              <Avatar
                                icon={<UserOutlined />}
                                style={{ backgroundColor: isAuthed ? "#d97706" : "#8c8c8c" }}
                              />
                              <div>
                                <Space wrap>
                                  <Text strong style={{ fontSize: 15 }}>
                                    {devoteeName}
                                  </Text>
                                  {targetPooja && <Tag color="purple">🙏 {targetPooja}</Tag>}
                                  <Tag color={isAuthed ? "gold" : "default"}>
                                    {isAuthed ? "👤 Logged-in Devotee" : "👁 Guest Visitor"}
                                  </Tag>
                                </Space>

                                <div style={{ marginTop: 4 }}>
                                  <Space wrap size="small">
                                    {devoteePhone && (
                                      <Tag color="blue">
                                        <PhoneOutlined /> +91 {devoteePhone}
                                      </Tag>
                                    )}
                                    {devoteeEmail && (
                                      <Tag color="cyan">
                                        <MailOutlined /> {devoteeEmail}
                                      </Tag>
                                    )}
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                      Session: {item.session_id}
                                    </Text>
                                  </Space>
                                </div>
                              </div>
                            </Space>
                          </Col>

                          <Col style={{ textAlign: "right" }}>
                            <Space wrap>
                              {devoteePhone && (
                                <Button
                                  type="primary"
                                  size="small"
                                  icon={<PhoneOutlined />}
                                  href={`tel:+91${devoteePhone}`}
                                >
                                  Call
                                </Button>
                              )}
                              {matchingSession && (
                                <Button
                                  type="default"
                                  size="small"
                                  icon={<EyeOutlined />}
                                  onClick={() => {
                                    setSelectedStageModal(null);
                                    openSessionModal(matchingSession);
                                  }}
                                >
                                  Audit Clickstream →
                                </Button>
                              )}
                            </Space>
                          </Col>
                        </Row>
                      </Card>
                    </List.Item>
                  );
                }}
              />
            ) : (
              <Alert message="No recorded sessions found for this stage." type="info" showIcon />
            )}
          </Space>
        )}
      </Modal>

      {/* Full Customer Session Clickstream Audit Modal */}
      <Modal
        title={
          <Space align="center">
            <NodeIndexOutlined style={{ color: "#1890ff" }} />
            <span>
              Customer Session Clickstream Audit: <b>{selectedSessionModal?.session_id || ""}</b>
            </span>
          </Space>
        }
        open={!!selectedSessionModal}
        onCancel={() => setSelectedSessionModal(null)}
        footer={
          <Button type="primary" onClick={() => setSelectedSessionModal(null)}>
            Close
          </Button>
        }
        width={800}
      >
        {selectedSessionModal && (
          <Space direction="vertical" style={{ width: "100%" }} size="large">
            {/* Devotee Overview Header */}
            <Card
              size="small"
              style={{
                borderRadius: 12,
                background: selectedSessionModal.user_name ? "#fffbe6" : "#fafafa",
                borderColor: selectedSessionModal.user_name ? "#ffe58f" : "#d9d9d9",
              }}
            >
              <Row justify="space-between" align="middle" gutter={[12, 12]}>
                <Col>
                  <Space align="center" size="middle">
                    <Avatar
                      size={44}
                      icon={<UserOutlined />}
                      style={{ backgroundColor: selectedSessionModal.user_name ? "#d97706" : "#8c8c8c" }}
                    />
                    <div>
                      <Space wrap>
                        <Text strong style={{ fontSize: 16 }}>
                          {selectedSessionModal.user_name || "Guest Devotee (Anonymous)"}
                        </Text>
                        <Tag color={selectedSessionModal.platform === "mobile_app" ? "purple" : "blue"}>
                          {selectedSessionModal.platform === "mobile_app" ? "📱 Mobile App" : "💻 Web App"}
                        </Tag>
                      </Space>
                      <div>
                        <Space wrap size="small" style={{ marginTop: 2 }}>
                          {selectedSessionModal.user_phone && (
                            <Tag color="blue">
                              <PhoneOutlined /> +91 {selectedSessionModal.user_phone}
                            </Tag>
                          )}
                          {selectedSessionModal.user_email && (
                            <Tag color="cyan">
                              <MailOutlined /> {selectedSessionModal.user_email}
                            </Tag>
                          )}
                          {selectedSessionModal.target_pooja && (
                            <Tag color="purple">
                              🙏 {selectedSessionModal.target_pooja}
                            </Tag>
                          )}
                        </Space>
                      </div>
                    </div>
                  </Space>
                </Col>

                <Col style={{ textAlign: "right" }}>
                  <Space direction="vertical" size={2} align="end">
                    {selectedSessionModal.is_completed ? (
                      <Tag color="success" style={{ fontSize: 13, padding: "4px 10px" }}>
                        Booking Completed ✅
                      </Tag>
                    ) : (
                      <Tag color={getStageColor(selectedSessionModal.last_dropoff_stage)} style={{ fontSize: 13, padding: "4px 10px" }}>
                        Exited @ {formatStageLabel(selectedSessionModal.last_dropoff_stage)}
                      </Tag>
                    )}
                    {selectedSessionModal.user_phone && (
                      <Button
                        type="primary"
                        size="small"
                        icon={<PhoneOutlined />}
                        href={`tel:+91${selectedSessionModal.user_phone}`}
                        style={{ marginTop: 4 }}
                      >
                        Call Devotee
                      </Button>
                    )}
                  </Space>
                </Col>
              </Row>
            </Card>

            {/* Quick Session Details Bar */}
            <Row gutter={[12, 12]}>
              <Col span={8}>
                <Card size="small" style={{ textAlign: "center", borderRadius: 8, background: "#f9fafb" }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Target Ceremony</Text>
                  <div style={{ fontWeight: 600, color: "#722ed1", marginTop: 2 }}>
                    {selectedSessionModal.target_pooja || "General Browsing"}
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ textAlign: "center", borderRadius: 8, background: "#f9fafb" }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Recorded Actions</Text>
                  <div style={{ fontWeight: 600, color: "#d97706", marginTop: 2 }}>
                    {selectedSessionModal.events ? selectedSessionModal.events.length : selectedSessionModal.event_count || 0} Actions
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ textAlign: "center", borderRadius: 8, background: "#f9fafb" }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Last Activity</Text>
                  <div style={{ fontWeight: 600, color: "#2563eb", marginTop: 2 }}>
                    {safeFormatDateTime(selectedSessionModal.last_active_at)}
                  </div>
                </Card>
              </Col>
            </Row>

            <div>
              <Title level={5} style={{ marginBottom: 12 }}>
                ⏱ Session Event History Timeline:
              </Title>

              {selectedSessionModal.events && selectedSessionModal.events.length > 0 ? (
                <List
                  itemLayout="vertical"
                  size="small"
                  dataSource={selectedSessionModal.events}
                  renderItem={(evt, index) => {
                    let parsedMeta = evt.metadata;
                    if (typeof parsedMeta === "string") {
                      try {
                        parsedMeta = JSON.parse(parsedMeta);
                      } catch (_) {
                        parsedMeta = null;
                      }
                    }
                    const eventTypeStr = (evt.event_type || "event").replace(/_/g, " ").toUpperCase();
                    const eventTimeStr = safeFormatTime(evt.created_at);

                    const tagColor =
                      evt.event_type === "booking_completed"
                        ? "success"
                        : evt.event_type === "payment_initiated"
                          ? "error"
                          : evt.event_type === "funnel_dropoff"
                            ? "warning"
                            : "geekblue";

                    return (
                      <List.Item key={evt.id || index} style={{ padding: "8px 0" }}>
                        <Card size="small" style={{ borderRadius: 8, background: "#fcfcfc", border: "1px solid #f0f0f0" }}>
                          <Row justify="space-between" align="middle" style={{ marginBottom: 4 }}>
                            <Col>
                              <Space wrap>
                                <Tag color={tagColor} style={{ fontWeight: 600 }}>
                                  #{index + 1} {eventTypeStr}
                                </Tag>
                                {evt.pooja_name && <Tag color="purple">Pooja: {evt.pooja_name}</Tag>}
                                {evt.page_path && <Tag color="default">Path: {evt.page_path}</Tag>}
                                {evt.dropoffStage && (
                                  <Tag color="volcano">Dropoff @ {formatStageLabel(evt.dropoffStage)}</Tag>
                                )}
                              </Space>
                            </Col>
                            <Col>
                              {eventTimeStr && (
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                  🕒 {eventTimeStr}
                                </Text>
                              )}
                            </Col>
                          </Row>

                          {parsedMeta && typeof parsedMeta === "object" && Object.keys(parsedMeta).length > 0 && (
                            <div
                              style={{
                                marginTop: 6,
                                fontSize: 11,
                                color: "#4b5563",
                                background: "#ffffff",
                                padding: "6px 10px",
                                borderRadius: 6,
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              {Object.entries(parsedMeta).map(([k, v]) => (
                                <div key={k}>
                                  <b>{k}:</b> {typeof v === "object" ? JSON.stringify(v) : String(v)}
                                </div>
                              ))}
                            </div>
                          )}
                        </Card>
                      </List.Item>
                    );
                  }}
                />
              ) : (
                <Alert message="No recorded clickstream events found for this session." type="info" showIcon />
              )}
            </div>
          </Space>
        )}
      </Modal>
    </div>
  );
}

