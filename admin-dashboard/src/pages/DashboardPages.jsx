import {
  ArrowUpOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
  StopOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  Modal,
  Input,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Timeline,
  Typography,
  message,
} from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../auth/AuthProvider";
import { adminApiRequest, ApiError } from "../lib/api";

const { Paragraph, Text, Title } = Typography;
const { RangePicker } = DatePicker;
const STATUS_COLORS = {
  pending: "#f59e0b",
  confirmed: "#2563eb",
  completed: "#16a34a",
  cancelled: "#dc2626",
  expired: "#7c3aed",
};
const BOOKING_STATUS_OPTIONS = ["pending", "confirmed", "completed", "cancelled", "expired"];

function useAdminApiState(loader) {
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const run = async () => {
    try {
      setLoading(true);
      setError("");
      const result = await loader(token);
      setData(result);
    } catch (loadError) {
      if (loadError instanceof ApiError && (loadError.status === 401 || loadError.status === 403)) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      setError(loadError.message || "Unable to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    run();
  }, []);

  return { data, loading, error, reload: run };
}

function useDashboardStats() {
  return useAdminApiState(async (token) => {
    const response = await adminApiRequest("/admin/dashboard-stats", { token });
    return response.data;
  });
}

function usePanditsData() {
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const [pandits, setPandits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");

  const loadPandits = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await adminApiRequest("/admin/pandits", { token });
      setPandits(response.data || []);
    } catch (loadError) {
      if (loadError instanceof ApiError && (loadError.status === 401 || loadError.status === 403)) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      setError(loadError.message || "Unable to load pandits");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPandits();
  }, []);

  const toggleVerification = async (panditId, verify) => {
    try {
      setActionLoadingId(panditId);
      await adminApiRequest(`/admin/pandits/${panditId}/verify`, {
        method: "PUT",
        token,
        body: { verify },
      });
      message.success(verify ? "Pandit approved successfully" : "Pandit approval revoked");
      await loadPandits();
    } catch (actionError) {
      if (actionError instanceof ApiError && (actionError.status === 401 || actionError.status === 403)) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      message.error(actionError.message || "Unable to update pandit");
    } finally {
      setActionLoadingId(null);
    }
  };

  return {
    pandits,
    loading,
    error,
    actionLoadingId,
    reload: loadPandits,
    toggleVerification,
  };
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MetricCard({ title, value, prefix, accent, suffix, formatter }) {
  return (
    <Card className={`metric-card ${accent || ""}`.trim()}>
      <Statistic title={title} value={value} prefix={prefix} suffix={suffix} formatter={formatter} />
    </Card>
  );
}

function StatusTag({ value }) {
  return <Tag color={STATUS_COLORS[value] || "default"}>{value || "unknown"}</Tag>;
}

export function OverviewPage() {
  const { data, error, reload } = useDashboardStats();

  const bookings = data?.bookings || { today: 0, week: 0, month: 0 };
  const revenue = data?.revenue || { today: 0, week: 0, month: 0, trend: [] };
  const pandits = data?.pandits || { active: 0, totalRegistered: 0, pendingApproval: 0 };
  const statusBreakdown = data?.bookingStatusBreakdown || [];
  const needsAttention = data?.needsAttention || {
    expiredBookings: [],
    pendingPanditApprovals: [],
  };

  const activePanditPercent = pandits.totalRegistered
    ? Math.round((pandits.active / pandits.totalRegistered) * 100)
    : 0;

  return (
    <Space direction="vertical" size={24} className="page-stack">
      <div className="hero-panel">
        <div>
          <Text className="hero-kicker">Marketplace Overview</Text>
          <Title level={2} className="hero-title">
            Real-time operational intelligence for bookings, revenue, and supply health.
          </Title>
          <Paragraph className="hero-copy">
            A single dashboard call now powers the top-line metrics, the 30-day platform-cut trend,
            booking status distribution, and the action queues that need admin follow-up.
          </Paragraph>
        </div>
        <div className="hero-metrics">
          <div className="hero-metric-card">
            <span>Active Pandits</span>
            <strong>{pandits.active}/{pandits.totalRegistered}</strong>
          </div>
          <div className="hero-metric-card">
            <span>Pending Approvals</span>
            <strong>{pandits.pendingApproval}</strong>
          </div>
        </div>
      </div>

      {error ? <Alert type="error" message="Dashboard stats could not be loaded" description={error} action={<Button icon={<ReloadOutlined />} onClick={reload}>Retry</Button>} /> : null}

      <Row gutter={[18, 18]}>
        <Col xs={24} sm={12} xl={4}><MetricCard title="Bookings Today" value={bookings.today} accent="warning" /></Col>
        <Col xs={24} sm={12} xl={4}><MetricCard title="Bookings This Week" value={bookings.week} accent="warning" /></Col>
        <Col xs={24} sm={12} xl={4}><MetricCard title="Bookings This Month" value={bookings.month} accent="warning" /></Col>
        <Col xs={24} sm={12} xl={4}><MetricCard title="Revenue Today" value={revenue.today} formatter={formatCurrency} /></Col>
        <Col xs={24} sm={12} xl={4}><MetricCard title="Revenue This Week" value={revenue.week} formatter={formatCurrency} /></Col>
        <Col xs={24} sm={12} xl={4}><MetricCard title="Revenue This Month" value={revenue.month} formatter={formatCurrency} /></Col>
      </Row>

      <Row gutter={[18, 18]}>
        <Col xs={24} xl={16}>
          <Card title="30-Day Platform Revenue Trend" extra={<Tag color="gold">30% platform cut</Tag>} className="chart-card">
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={revenue.trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={4} />
                  <YAxis tickFormatter={(value) => `Rs ${value}`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => [formatCurrency(value), "Revenue"]} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Platform Revenue" stroke="#b45309" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card title="Pandit Supply Health" className="chart-card">
            <Space direction="vertical" size={18} className="page-stack">
              <MetricCard title="Active vs Registered" value={`${pandits.active}/${pandits.totalRegistered}`} prefix={<CheckCircleOutlined />} accent="success" />
              <div>
                <div className="progress-row"><Text>Activation ratio</Text><Text strong>{activePanditPercent}%</Text></div>
                <Progress percent={activePanditPercent} strokeColor="#15803d" />
              </div>
              <div className="supply-health-grid">
                <div className="supply-health-tile"><span>Total Registered</span><strong>{pandits.totalRegistered}</strong></div>
                <div className="supply-health-tile"><span>Pending Approval</span><strong>{pandits.pendingApproval}</strong></div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
      <Row gutter={[18, 18]}>
        <Col xs={24} xl={10}>
          <Card title="Bookings by Status" className="chart-card">
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie data={statusBreakdown} dataKey="count" nameKey="status" innerRadius={72} outerRadius={110} paddingAngle={3}>
                    {statusBreakdown.map((entry) => <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#94a3b8"} />)}
                  </Pie>
                  <Tooltip formatter={(value, _name, item) => [value, item.payload.status]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} xl={14}>
          <Card title="Needs Attention" extra={<Button icon={<ReloadOutlined />} onClick={reload}>Refresh</Button>}>
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <div className="attention-panel">
                  <div className="attention-header"><Title level={5}>Expired bookings</Title><Tag color="red">{needsAttention.expiredBookings.length}</Tag></div>
                  <Space direction="vertical" size={12} className="page-stack">
                    {needsAttention.expiredBookings.length ? needsAttention.expiredBookings.map((booking) => (
                      <div key={booking.id} className="attention-item danger">
                        <div><Text strong>{booking.pooja_name}</Text><div className="table-subline">{booking.user_name} • {booking.user_phone}</div></div>
                        <Space wrap size={[8, 8]}><Tag color="red">Expired</Tag><Tag>{booking.booking_date}</Tag><Tag>{formatCurrency(booking.platform_cut)}</Tag></Space>
                      </div>
                    )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No expired bookings in queue" />}
                  </Space>
                </div>
              </Col>

              <Col xs={24} lg={12}>
                <div className="attention-panel">
                  <div className="attention-header"><Title level={5}>Pandits pending approval</Title><Tag color="orange">{needsAttention.pendingPanditApprovals.length}</Tag></div>
                  <Space direction="vertical" size={12} className="page-stack">
                    {needsAttention.pendingPanditApprovals.length ? needsAttention.pendingPanditApprovals.map((pandit) => (
                      <div key={pandit.id} className="attention-item warning">
                        <div><Text strong>{pandit.name}</Text><div className="table-subline">{pandit.phone} • {pandit.email || "No email"}</div></div>
                        <Space wrap size={[8, 8]}><Tag color="orange">Approval pending</Tag><Tag>{pandit.experience_years || 0}+ yrs</Tag><Tag icon={<EnvironmentOutlined />}>{pandit.service_radius_km || 0} km</Tag></Space>
                      </div>
                    )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No pending pandit approvals" />}
                  </Space>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}

export function BookingsPage() {
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [poojaTypes, setPoojaTypes] = useState([]);
  const [panditOptions, setPanditOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableState, setTableState] = useState({ page: 1, limit: 10, total: 0, sortBy: "created_at", sortOrder: "desc", status: undefined, poojaTypeId: undefined, startDate: undefined, endDate: undefined });
  const [error, setError] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState("");
  const [assignPanditId, setAssignPanditId] = useState(undefined);
  const [actionLoading, setActionLoading] = useState("");

  const handleAuthError = (apiError) => {
    if (apiError instanceof ApiError && (apiError.status === 401 || apiError.status === 403)) {
      logout();
      navigate("/login", { replace: true });
      return true;
    }
    return false;
  };

  const loadOptions = async () => {
    try {
      const [poojaResponse, panditResponse] = await Promise.all([
        adminApiRequest("/admin/pooja-types?page=1&limit=100", { token }),
        adminApiRequest("/admin/pandits", { token }),
      ]);
      setPoojaTypes(poojaResponse.data || []);
      setPanditOptions((panditResponse.data || []).filter((pandit) => pandit.is_active && pandit.is_verified));
    } catch (apiError) {
      if (handleAuthError(apiError)) return;
      message.error(apiError.message || "Unable to load admin options");
    }
  };

  const loadBookings = async (nextState = tableState) => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ page: String(nextState.page), limit: String(nextState.limit), sortBy: nextState.sortBy, sortOrder: nextState.sortOrder });
      if (nextState.status) params.set("status", nextState.status);
      if (nextState.poojaTypeId) params.set("poojaTypeId", nextState.poojaTypeId);
      if (nextState.startDate) params.set("startDate", nextState.startDate);
      if (nextState.endDate) params.set("endDate", nextState.endDate);
      const response = await adminApiRequest(`/admin/bookings?${params.toString()}`, { token });
      setBookings(response.data || []);
      setTableState((current) => ({ ...current, ...nextState, total: response.pagination?.total || 0 }));
    } catch (apiError) {
      if (handleAuthError(apiError)) return;
      setError(apiError.message || "Unable to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const loadTimeline = async (bookingId) => {
    try {
      setTimelineLoading(true);
      setTimelineError("");
      const response = await adminApiRequest(`/admin/bookings/${bookingId}/timeline`, { token });
      setTimelineData(response.data);
      setAssignPanditId(response.data?.booking?.confirmed_pandit_id || undefined);
    } catch (apiError) {
      if (handleAuthError(apiError)) return;
      setTimelineError(apiError.message || "Unable to load booking timeline");
    } finally {
      setTimelineLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
    loadBookings(tableState);
  }, []);

  const handleTableChange = (pagination, _filters, sorter) => {
    const nextState = { ...tableState, page: pagination.current || 1, limit: pagination.pageSize || 10, sortBy: sorter?.field || "created_at", sortOrder: sorter?.order === "ascend" ? "asc" : "desc" };
    loadBookings(nextState);
  };

  const openBooking = (record) => {
    setSelectedBookingId(record.id);
    setTimelineData(null);
    loadTimeline(record.id);
  };

  const closeModal = () => {
    setSelectedBookingId(null);
    setTimelineData(null);
    setTimelineError("");
    setAssignPanditId(undefined);
  };

  const runBookingAction = async (actionKey, request) => {
    try {
      setActionLoading(actionKey);
      await request();
      await loadBookings();
      if (selectedBookingId) await loadTimeline(selectedBookingId);
    } catch (apiError) {
      if (handleAuthError(apiError)) return;
      message.error(apiError.message || "Action failed");
    } finally {
      setActionLoading("");
    }
  };

  const selectedBooking = timelineData?.booking;

  const columns = [
    { title: "Booking ID", dataIndex: "id", key: "id", ellipsis: true, render: (value) => <span className="mono-cell">{value}</span> },
    { title: "User", dataIndex: "user_name", key: "user_name", render: (_value, record) => <div><Text strong>{record.user_name}</Text><div className="table-subline">{record.user_phone}</div></div> },
    { title: "Pandit", dataIndex: "pandit_name", key: "pandit_name", render: (_value, record) => <div><Text>{record.pandit_name || "Not assigned"}</Text><div className="table-subline">{record.pandit_phone || "-"}</div></div> },
    { title: "Pooja Type", dataIndex: "pooja_type_name", key: "pooja_type_name" },
    { title: "Date", dataIndex: "booking_date", key: "booking_date", sorter: true, render: (value, record) => <div><Text>{formatDate(value)}</Text><div className="table-subline">{record.booking_time || "-"}</div></div> },
    { title: "Status", dataIndex: "status", key: "status", sorter: true, render: (value) => <StatusTag value={value} /> },
    { title: "Prepaid", dataIndex: "prepaid_status", key: "prepaid_status", sorter: true, render: (value) => <StatusTag value={value === "paid" ? "completed" : value} /> },
    { title: "Payout", dataIndex: "pandit_payout_status", key: "pandit_payout_status", sorter: true, render: (value) => <StatusTag value={value === "paid" ? "completed" : value} /> },
    { title: "Actions", key: "actions", render: (_value, record) => <Space wrap><Button size="small" onClick={(event) => { event.stopPropagation(); openBooking(record); }}>View</Button><Button size="small" danger disabled={record.status === "expired"} loading={actionLoading === `expire-${record.id}`} onClick={(event) => { event.stopPropagation(); runBookingAction(`expire-${record.id}`, async () => { await adminApiRequest(`/admin/bookings/${record.id}/force-expire`, { method: "PATCH", token }); message.success("Booking force expired"); }); }}>Force Expire</Button></Space> },
  ];

  return (
    <>
      <Space direction="vertical" size={20} className="page-stack">
        <Card className="filters-card">
          <Space wrap size={[12, 12]}>
            <Select placeholder="Filter by status" allowClear value={tableState.status} style={{ width: 180 }} options={BOOKING_STATUS_OPTIONS.map((status) => ({ label: status, value: status }))} onChange={(value) => loadBookings({ ...tableState, page: 1, status: value || undefined })} />
            <Select placeholder="Filter by pooja type" allowClear showSearch optionFilterProp="label" value={tableState.poojaTypeId} style={{ width: 240 }} options={poojaTypes.map((pooja) => ({ label: pooja.name_en, value: pooja.id }))} onChange={(value) => loadBookings({ ...tableState, page: 1, poojaTypeId: value || undefined })} />
            <RangePicker onChange={(values) => loadBookings({ ...tableState, page: 1, startDate: values?.[0] ? values[0].format("YYYY-MM-DD") : undefined, endDate: values?.[1] ? values[1].format("YYYY-MM-DD") : undefined })} />
            <Button icon={<ReloadOutlined />} onClick={() => loadBookings({ ...tableState })}>Refresh</Button>
            <Button onClick={() => loadBookings({ page: 1, limit: tableState.limit, total: tableState.total, sortBy: "created_at", sortOrder: "desc", status: undefined, poojaTypeId: undefined, startDate: undefined, endDate: undefined })}>Reset Filters</Button>
          </Space>
        </Card>

        <Card title="Bookings Control Desk">
          {error ? <Alert type="error" showIcon className="panel-alert" message="Bookings could not be loaded" description={error} /> : null}
          <Table rowKey="id" loading={loading} columns={columns} dataSource={bookings} onChange={handleTableChange} pagination={{ current: tableState.page, pageSize: tableState.limit, total: tableState.total, showSizeChanger: true, pageSizeOptions: ["10", "20", "50"] }} scroll={{ x: 1420 }} onRow={(record) => ({ onClick: () => openBooking(record) })} />
        </Card>
      </Space>

      <Modal open={Boolean(selectedBookingId)} onCancel={closeModal} footer={null} width={980} title="Booking Timeline">
        {timelineError ? <Alert type="error" showIcon message={timelineError} /> : null}
        {timelineLoading ? <div className="modal-loading">Loading booking details...</div> : selectedBooking ? (
          <Space direction="vertical" size={18} className="page-stack">
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Booking ID">{selectedBooking.id}</Descriptions.Item>
              <Descriptions.Item label="Pooja Type">{selectedBooking.pooja_type_name}</Descriptions.Item>
              <Descriptions.Item label="User">{selectedBooking.user_name}</Descriptions.Item>
              <Descriptions.Item label="Phone">{selectedBooking.user_phone}</Descriptions.Item>
              <Descriptions.Item label="Pandit">{selectedBooking.confirmed_pandit_name || "Not assigned"}</Descriptions.Item>
              <Descriptions.Item label="Status"><StatusTag value={selectedBooking.status} /></Descriptions.Item>
              <Descriptions.Item label="Booking Date">{formatDate(selectedBooking.booking_date)}</Descriptions.Item>
              <Descriptions.Item label="Booking Time">{selectedBooking.booking_time}</Descriptions.Item>
              <Descriptions.Item label="Prepaid Status">{selectedBooking.prepaid_status}</Descriptions.Item>
              <Descriptions.Item label="Payout Status">{selectedBooking.pandit_payout_status}</Descriptions.Item>
              <Descriptions.Item label="Total Price">{formatCurrency(selectedBooking.total_price)}</Descriptions.Item>
              <Descriptions.Item label="Platform Cut">{formatCurrency(selectedBooking.prepaid_amount)}</Descriptions.Item>
              <Descriptions.Item label="Pandit Payout">{formatCurrency(selectedBooking.pandit_payout_amount)}</Descriptions.Item>
              <Descriptions.Item label="Manual Attention">{selectedBooking.flagged_for_manual_intervention ? "Yes" : "No"}</Descriptions.Item>
              <Descriptions.Item label="Address" span={2}>{selectedBooking.address}</Descriptions.Item>
            </Descriptions>

            <Card size="small" title="Manual Actions">
              <Space wrap size={[12, 12]}>
                <Button danger loading={actionLoading === `expire-${selectedBooking.id}`} onClick={() => runBookingAction(`expire-${selectedBooking.id}`, async () => { await adminApiRequest(`/admin/bookings/${selectedBooking.id}/force-expire`, { method: "PATCH", token }); message.success("Booking force expired"); })}>Force expire</Button>
                <Select placeholder="Select pandit to assign" style={{ width: 280 }} showSearch optionFilterProp="label" value={assignPanditId} onChange={setAssignPanditId} options={panditOptions.map((pandit) => ({ label: `${pandit.name} (${pandit.phone})`, value: pandit.id }))} />
                <Button type="primary" disabled={!assignPanditId} loading={actionLoading === `assign-${selectedBooking.id}`} onClick={() => runBookingAction(`assign-${selectedBooking.id}`, async () => { await adminApiRequest(`/admin/bookings/${selectedBooking.id}/manual-assign`, { method: "PATCH", token, body: { pandit_id: assignPanditId } }); message.success("Pandit assigned successfully"); })}>Manually assign pandit</Button>
                <Button loading={actionLoading === `payout-${selectedBooking.id}`} disabled={selectedBooking.pandit_payout_status === "paid" || !selectedBooking.confirmed_pandit_id} onClick={() => runBookingAction(`payout-${selectedBooking.id}`, async () => { await adminApiRequest(`/admin/bookings/${selectedBooking.id}/mark-payout-paid`, { method: "PATCH", token }); message.success("Payout marked as paid"); })}>Mark payout as paid</Button>
              </Space>
            </Card>

            <Card size="small" title="Booking Requests Timeline">
              {timelineData?.timeline?.length ? <Timeline items={timelineData.timeline.map((item) => ({ color: STATUS_COLORS[item.status] || "gray", children: <div className="timeline-item-body"><Text strong>{item.pandit_name}</Text><div className="table-subline">{item.pandit_phone}</div><Space wrap size={[8, 8]}><Tag>Batch {item.batch_number}</Tag><StatusTag value={item.status} /><Tag icon={<CalendarOutlined />}>Requested {formatDateTime(item.created_at)}</Tag>{item.responded_at ? <Tag>Responded {formatDateTime(item.responded_at)}</Tag> : null}</Space></div> }))} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No booking request timeline available" />}
            </Card>
          </Space>
        ) : null}
      </Modal>
    </>
  );
}

export function PanditsPage() {
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const { pandits, loading, error, reload, toggleVerification, actionLoadingId } = usePanditsData();
  const [selectedPanditId, setSelectedPanditId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [reason, setReason] = useState("");
  const [detailActionLoading, setDetailActionLoading] = useState("");

  const handleAuthError = (apiError) => {
    if (apiError instanceof ApiError && (apiError.status === 401 || apiError.status === 403)) {
      logout();
      navigate("/login", { replace: true });
      return true;
    }
    return false;
  };

  const loadPanditDetail = async (panditId) => {
    try {
      setDetailLoading(true);
      setDetailError("");
      const response = await adminApiRequest(`/admin/pandits/${panditId}`, { token });
      setDetailData(response.data);
    } catch (apiError) {
      if (handleAuthError(apiError)) return;
      setDetailError(apiError.message || "Unable to load pandit details");
    } finally {
      setDetailLoading(false);
    }
  };

  const openPandit = (record) => {
    setSelectedPanditId(record.id);
    setReason("");
    setDetailData(null);
    loadPanditDetail(record.id);
  };

  const closeModal = () => {
    setSelectedPanditId(null);
    setDetailData(null);
    setDetailError("");
    setReason("");
  };

  const runDetailAction = async (key, request) => {
    try {
      setDetailActionLoading(key);
      await request();
      await reload();
      if (selectedPanditId) {
        await loadPanditDetail(selectedPanditId);
      }
      setReason("");
    } catch (apiError) {
      if (handleAuthError(apiError)) return;
      message.error(apiError.message || "Action failed");
    } finally {
      setDetailActionLoading("");
    }
  };

  const columns = [
    {
      title: "Pandit",
      dataIndex: "name",
      key: "name",
      render: (_value, record) => (
        <div>
          <Text strong>{record.name || "Unnamed Pandit"}</Text>
          <div className="table-subline">{record.email || "No email"}</div>
        </div>
      ),
    },
    { title: "Phone", dataIndex: "phone", key: "phone" },
    { title: "Rating", dataIndex: "rating", key: "rating", render: (value) => Number(value || 0).toFixed(1) },
    { title: "Total Bookings", dataIndex: "total_bookings", key: "total_bookings" },
    {
      title: "Verification",
      key: "verification",
      render: (_value, record) => record.is_verified ? <Tag color="green">Verified</Tag> : <Tag color="orange">Pending</Tag>,
    },
    {
      title: "Status",
      key: "status",
      render: (_value, record) => record.is_active ? <Tag color="blue">Active</Tag> : <Tag color="red">Inactive</Tag>,
    },
    {
      title: "Actions",
      key: "action",
      render: (_value, record) => (
        <Space>
          <Button type="primary" onClick={(event) => { event.stopPropagation(); openPandit(record); }}>View</Button>
          <Button onClick={(event) => { event.stopPropagation(); toggleVerification(record.id, true); }} loading={actionLoadingId === record.id} disabled={record.is_verified}>Approve</Button>
        </Space>
      ),
    },
  ];

  const profile = detailData?.profile;

  return (
    <>
      <Card title="Pandit Verification Desk" extra={<Button icon={<ReloadOutlined />} onClick={reload}>Refresh</Button>}>
        {error ? <Alert type="error" message="Pandit approvals are unavailable" description={error} showIcon className="panel-alert" /> : null}
        <Table rowKey="id" loading={loading} columns={columns} dataSource={pandits} scroll={{ x: 1100 }} pagination={{ pageSize: 8, showSizeChanger: false }} onRow={(record) => ({ onClick: () => openPandit(record) })} />
      </Card>

      <Modal open={Boolean(selectedPanditId)} onCancel={closeModal} footer={null} width={1080} title="Pandit Detail Review">
        {detailError ? <Alert type="error" showIcon message={detailError} className="panel-alert" /> : null}
        {detailLoading ? <div className="modal-loading">Loading pandit details...</div> : profile ? (
          <Space direction="vertical" size={18} className="page-stack">
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Name">{profile.name}</Descriptions.Item>
              <Descriptions.Item label="Phone">{profile.phone}</Descriptions.Item>
              <Descriptions.Item label="Email">{profile.email || "-"}</Descriptions.Item>
              <Descriptions.Item label="Source">{profile.source || "-"}</Descriptions.Item>
              <Descriptions.Item label="Rating">{Number(profile.rating || 0).toFixed(1)}</Descriptions.Item>
              <Descriptions.Item label="Ratings Count">{profile.total_ratings_count || 0}</Descriptions.Item>
              <Descriptions.Item label="Total Bookings">{profile.total_bookings || 0}</Descriptions.Item>
              <Descriptions.Item label="Experience">{profile.experience_years || 0} years</Descriptions.Item>
              <Descriptions.Item label="Service Radius">{profile.service_radius_km || 0} km</Descriptions.Item>
              <Descriptions.Item label="Verified">{profile.is_verified ? "Yes" : "No"}</Descriptions.Item>
              <Descriptions.Item label="Active">{profile.is_active ? "Yes" : "No"}</Descriptions.Item>
              <Descriptions.Item label="Created At">{formatDateTime(profile.created_at)}</Descriptions.Item>
              <Descriptions.Item label="Address" span={2}>{profile.address || "-"}</Descriptions.Item>
              <Descriptions.Item label="Specializations" span={2}>{Array.isArray(profile.specializations) && profile.specializations.length ? profile.specializations.join(", ") : "-"}</Descriptions.Item>
            </Descriptions>

            <Row gutter={[16, 16]}>
              <Col xs={24} lg={10}>
                <Card size="small" title="Uploaded ID Proof">
                  {profile.id_proof_url ? <img src={profile.id_proof_url} alt="Pandit ID proof" className="id-proof-image" /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No ID proof uploaded" />}
                </Card>
              </Col>
              <Col xs={24} lg={14}>
                <Card size="small" title="Verification / Deactivation Actions">
                  <Space direction="vertical" size={12} className="page-stack">
                    <Input.TextArea rows={4} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Enter rejection or deactivation reason here" />
                    <Space wrap>
                      <Button type="primary" loading={detailActionLoading === "approve"} disabled={profile.is_verified} onClick={() => runDetailAction("approve", async () => { await adminApiRequest(`/admin/pandits/${profile.id}/verify`, { method: "PATCH", token, body: { verify: true } }); message.success("Pandit verification approved"); })}>Approve Verification</Button>
                      <Button danger loading={detailActionLoading === "reject"} onClick={() => runDetailAction("reject", async () => { await adminApiRequest(`/admin/pandits/${profile.id}/verify`, { method: "PATCH", token, body: { verify: false, reason } }); message.success("Pandit verification rejected"); })}>Reject Verification</Button>
                      <Button loading={detailActionLoading === "deactivate"} disabled={!profile.is_active} onClick={() => runDetailAction("deactivate", async () => { await adminApiRequest(`/admin/pandits/${profile.id}/deactivate`, { method: "PATCH", token, body: { reason } }); message.success("Pandit deactivated"); })}>Deactivate Pandit</Button>
                    </Space>
                    <Text type="secondary">Reject and deactivate actions require a reason. Rejection triggers a WhatsApp notification through the backend notification service.</Text>
                  </Space>
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card size="small" title="Booking History">
                  <Table rowKey="id" size="small" pagination={false} dataSource={detailData?.bookingHistory || []} columns={[
                    { title: "Booking", dataIndex: "id", key: "id", render: (value) => <span className="mono-cell">{value}</span> },
                    { title: "Pooja", dataIndex: "pooja_type_name", key: "pooja_type_name" },
                    { title: "User", dataIndex: "user_name", key: "user_name" },
                    { title: "Date", dataIndex: "booking_date", key: "booking_date", render: (value) => formatDate(value) },
                    { title: "Status", dataIndex: "status", key: "status", render: (value) => <StatusTag value={value} /> },
                  ]} scroll={{ x: 680 }} />
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card size="small" title="Ratings Received">
                  <Table rowKey="id" size="small" pagination={false} dataSource={detailData?.ratings || []} columns={[
                    { title: "Rating", dataIndex: "rating", key: "rating" },
                    { title: "By", dataIndex: "rated_by", key: "rated_by" },
                    { title: "Comment", dataIndex: "comment", key: "comment", render: (value) => value || "-" },
                    { title: "Date", dataIndex: "created_at", key: "created_at", render: (value) => formatDateTime(value) },
                  ]} locale={{ emptyText: "No ratings yet" }} scroll={{ x: 620 }} />
                </Card>
              </Col>
            </Row>

            <Card size="small" title="Admin Action Log">
              <Table rowKey="id" size="small" pagination={false} dataSource={detailData?.adminActions || []} columns={[
                { title: "Action", dataIndex: "action_type", key: "action_type" },
                { title: "Reason", dataIndex: "reason", key: "reason", render: (value) => value || "-" },
                { title: "Admin", key: "admin", render: (_value, record) => record.admin_name || record.admin_email || "System" },
                { title: "When", dataIndex: "created_at", key: "created_at", render: (value) => formatDateTime(value) },
              ]} locale={{ emptyText: "No admin actions logged yet" }} scroll={{ x: 720 }} />
            </Card>
          </Space>
        ) : null}
      </Modal>
    </>
  );
}

export function ModulePlaceholderPage({ title, description, accent = "default" }) {
  const accentIconMap = { users: <CheckCircleOutlined />, pooja: <StopOutlined />, payments: <WalletOutlined />, reports: <ArrowUpOutlined />, default: <ClockCircleOutlined /> };

  return (
    <Card className="placeholder-card">
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<Space direction="vertical" size={4}><Tag color="gold" icon={accentIconMap[accent]}>{title}</Tag><Title level={4}>{title} module scaffolded</Title><Paragraph className="placeholder-copy">{description}</Paragraph></Space>} />
    </Card>
  );
}


