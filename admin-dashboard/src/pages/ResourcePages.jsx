import { DeleteOutlined, DownloadOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { adminApiRequest, ApiError } from "../lib/api";

const { Paragraph, Text, Title } = Typography;

function useAdminGuard() {
  const navigate = useNavigate();
  const { token, logout } = useAuth();

  const handleAuthError = (error) => {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      logout();
      navigate("/login", { replace: true });
      return true;
    }
    return false;
  };

  return { token, handleAuthError };
}

function csvEscape(value) {
  const raw = String(value ?? "");
  if (raw.includes(",") || raw.includes("\n") || raw.includes('"')) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function PoojaTypesPage() {
  const { token, handleAuthError } = useAdminGuard();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await adminApiRequest("/admin/pooja-types?page=1&limit=100", { token });
      setItems(response.data || []);
    } catch (error) {
      if (handleAuthError(error)) return;
      message.error(error.message || "Unable to load pooja types");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ duration_minutes: 60, is_active: true, samagri_list: [{ item: "", brought_by: "pandit" }] });
    setOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      ...record,
      samagri_list: Array.isArray(record.samagri_list) && record.samagri_list.length
        ? record.samagri_list.map((item) => ({
            item: item.item || item.item_en || item.item_name_en || item.name || "",
            brought_by: item.brought_by || item.provided_by || "pandit",
          }))
        : [{ item: "", brought_by: "pandit" }],
    });
    setOpen(true);
  };

  const handleSubmit = async (values) => {
    try {
      setSaving(true);
      const payload = {
        ...values,
        samagri_list: (values.samagri_list || [])
          .filter((item) => item && item.item && item.item.trim())
          .map((item) => ({
            item: item.item.trim(),
            item_en: item.item.trim(),
            item_hi: item.item.trim(),
            brought_by: item.brought_by || "pandit",
          })),
      };
      if (editing) {
        await adminApiRequest(`/admin/pooja-types/${editing.id}`, { method: "PUT", token, body: payload });
        message.success("Pooja type updated");
      } else {
        await adminApiRequest("/admin/pooja-types", { method: "POST", token, body: payload });
        message.success("Pooja type created");
      }
      setOpen(false);
      form.resetFields();
      await loadItems();
    } catch (error) {
      if (handleAuthError(error)) return;
      message.error(error.message || "Unable to save pooja type");
    } finally {
      setSaving(false);
    }
  };

  const deactivateItem = async (record) => {
    try {
      await adminApiRequest(`/admin/pooja-types/${record.id}`, { method: "DELETE", token });
      message.success("Pooja type deactivated");
      await loadItems();
    } catch (error) {
      if (handleAuthError(error)) return;
      message.error(error.message || "Unable to deactivate pooja type");
    }
  };

  const columns = [
    { title: "Name (EN)", dataIndex: "name_en", key: "name_en" },
    { title: "Name (HI)", dataIndex: "name_hi", key: "name_hi" },
    { title: "Base Price", dataIndex: "base_price", key: "base_price", render: (value) => `Rs ${value}` },
    { title: "Duration", dataIndex: "duration_minutes", key: "duration_minutes", render: (value) => `${value} min` },
    { title: "Samagri Items", key: "samagri_list", render: (_value, record) => Array.isArray(record.samagri_list) ? record.samagri_list.length : 0 },
    { title: "Status", key: "is_active", render: (_value, record) => record.is_active ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag> },
    { title: "Actions", key: "actions", render: (_value, record) => <Space><Button onClick={() => openEdit(record)}>Edit</Button><Button danger disabled={!record.is_active} onClick={() => deactivateItem(record)}>Deactivate</Button></Space> },
  ];

  return (
    <>
      <Card title="Pooja Types" extra={<Space><Button icon={<ReloadOutlined />} onClick={loadItems}>Refresh</Button><Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Pooja Type</Button></Space>}>
        <Table rowKey="id" loading={loading} columns={columns} dataSource={items} scroll={{ x: 980 }} />
      </Card>

      <Modal open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} confirmLoading={saving} width={920} title={editing ? "Edit Pooja Type" : "Add Pooja Type"}>
        <Form layout="vertical" form={form} onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col xs={24} md={12}><Form.Item name="name_en" label="Name (English)" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="name_hi" label="Name (Hindi)" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="description_en" label="Description (English)"><Input.TextArea rows={3} /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="description_hi" label="Description (Hindi)"><Input.TextArea rows={3} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="base_price" label="Base Price" rules={[{ required: true }]}><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="duration_minutes" label="Duration (minutes)" rules={[{ required: true }]}><InputNumber min={1} style={{ width: "100%" }} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="is_active" label="Active" valuePropName="checked"><Switch /></Form.Item></Col>
          </Row>

          <Form.List name="samagri_list">
            {(fields, { add, remove }) => (
              <Card size="small" title="Samagri List Builder" extra={<Button icon={<PlusOutlined />} onClick={() => add({ item: "", brought_by: "pandit" })}>Add Item</Button>}>
                <Space direction="vertical" className="page-stack" size={12}>
                  {fields.map((field) => (
                    <Row gutter={12} key={field.key} className="samagri-row">
                      <Col xs={24} md={14}><Form.Item {...field} name={[field.name, "item"]} label="Item" rules={[{ required: true }]}><Input placeholder="Samagri item name" /></Form.Item></Col>
                      <Col xs={24} md={8}><Form.Item {...field} name={[field.name, "brought_by"]} label="Brought By" rules={[{ required: true }]}><Select options={[{ label: "Pandit", value: "pandit" }, { label: "User", value: "user" }]} /></Form.Item></Col>
                      <Col xs={24} md={2}><Button danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} className="samagri-delete" /></Col>
                    </Row>
                  ))}
                </Space>
              </Card>
            )}
          </Form.List>
        </Form>
      </Modal>
    </>
  );
}

export function UsersPage() {
  const { token, handleAuthError } = useAdminGuard();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, limit: 10 });

  const loadRows = async (nextPage = page, nextSearch = search) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(nextPage), limit: String(pagination.limit), search: nextSearch });
      const response = await adminApiRequest(`/admin/users?${params.toString()}`, { token });
      setRows(response.data || []);
      setPagination({ total: response.pagination?.total || 0, limit: response.pagination?.limit || 10 });
      setPage(nextPage);
    } catch (error) {
      if (handleAuthError(error)) return;
      message.error(error.message || "Unable to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows(1, "");
  }, []);

  const columns = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Phone", dataIndex: "phone", key: "phone" },
    { title: "Email", dataIndex: "email", key: "email", render: (value) => value || "-" },
    { title: "Total Bookings", dataIndex: "total_bookings", key: "total_bookings" },
    { title: "Join Date", dataIndex: "created_at", key: "created_at", render: (value) => new Date(value).toLocaleDateString("en-IN") },
  ];

  return (
    <Card title="Registered Users" extra={<Space><Input.Search placeholder="Search name or phone" allowClear onSearch={(value) => { setSearch(value); loadRows(1, value); }} style={{ width: 280 }} /><Button icon={<ReloadOutlined />} onClick={() => loadRows(page, search)}>Refresh</Button></Space>}>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={rows} pagination={{ current: page, pageSize: pagination.limit, total: pagination.total, onChange: (nextPage) => loadRows(nextPage, search) }} scroll={{ x: 900 }} />
    </Card>
  );
}

export function PaymentsPage() {
  const { token, handleAuthError } = useAdminGuard();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: "", status: undefined, type: undefined, page: 1, limit: 10, total: 0 });

  const loadRows = async (next = filters) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(next.page), limit: String(next.limit) });
      if (next.search) params.set("search", next.search);
      if (next.status) params.set("status", next.status);
      if (next.type) params.set("type", next.type);
      const response = await adminApiRequest(`/admin/payments?${params.toString()}`, { token });
      setRows(response.data || []);
      setFilters((current) => ({ ...current, ...next, total: response.pagination?.total || 0, limit: response.pagination?.limit || next.limit }));
    } catch (error) {
      if (handleAuthError(error)) return;
      message.error(error.message || "Unable to load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows(filters);
  }, []);

  const exportCsv = async () => {
    try {
      const params = new URLSearchParams({ page: "1", limit: "500" });
      if (filters.search) params.set("search", filters.search);
      if (filters.status) params.set("status", filters.status);
      if (filters.type) params.set("type", filters.type);
      const response = await adminApiRequest(`/admin/payments?${params.toString()}`, { token });
      const dataset = response.data || [];
      downloadCsv("payments-export.csv", [
        ["Payment ID", "Booking ID", "Type", "Status", "Amount", "Razorpay Payment ID", "Razorpay Order ID", "Booking Status", "User", "Pandit", "Pooja Type", "Created At"],
        ...dataset.map((row) => [row.id, row.booking_id, row.type, row.status, row.amount, row.razorpay_payment_id || "", row.razorpay_order_id || "", row.booking_status || "", row.user_name || "", row.pandit_name || "", row.pooja_type_name || "", row.created_at || ""]),
      ]);
      message.success("Payments CSV exported");
    } catch (error) {
      if (handleAuthError(error)) return;
      message.error(error.message || "Unable to export payments");
    }
  };

  const columns = [
    { title: "Payment", dataIndex: "id", key: "id", render: (value) => <span className="mono-cell">{value}</span> },
    { title: "Booking", dataIndex: "booking_id", key: "booking_id", render: (value) => <span className="mono-cell">{value}</span> },
    { title: "Type", dataIndex: "type", key: "type", render: (value) => <Tag color={value === "prepayment" ? "gold" : "blue"}>{value}</Tag> },
    { title: "Status", dataIndex: "status", key: "status", render: (value) => <Tag color={value === "paid" ? "green" : value === "failed" ? "red" : "default"}>{value}</Tag> },
    { title: "Amount", dataIndex: "amount", key: "amount", render: (value) => formatCurrency(value) },
    { title: "Razorpay Payment ID", dataIndex: "razorpay_payment_id", key: "razorpay_payment_id", render: (value) => value || "-" },
    { title: "Razorpay Order ID", dataIndex: "razorpay_order_id", key: "razorpay_order_id", render: (value) => value || "-" },
    { title: "User", dataIndex: "user_name", key: "user_name", render: (value) => value || "-" },
    { title: "Pandit", dataIndex: "pandit_name", key: "pandit_name", render: (value) => value || "-" },
    { title: "Created", dataIndex: "created_at", key: "created_at", render: (value) => new Date(value).toLocaleString("en-IN") },
  ];

  return (
    <Card title="Payments Ledger" extra={<Space><Input.Search placeholder="Search payment/order/booking id" allowClear onSearch={(value) => loadRows({ ...filters, page: 1, search: value })} style={{ width: 260 }} /><Select placeholder="Status" allowClear style={{ width: 140 }} options={[{ label: "created", value: "created" }, { label: "paid", value: "paid" }, { label: "failed", value: "failed" }, { label: "refunded", value: "refunded" }]} onChange={(value) => loadRows({ ...filters, page: 1, status: value || undefined })} /><Select placeholder="Type" allowClear style={{ width: 150 }} options={[{ label: "Prepayment", value: "prepayment" }, { label: "Payout", value: "pandit_payout" }]} onChange={(value) => loadRows({ ...filters, page: 1, type: value || undefined })} /><Button icon={<DownloadOutlined />} onClick={exportCsv}>Export CSV</Button><Button icon={<ReloadOutlined />} onClick={() => loadRows(filters)}>Refresh</Button></Space>}>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={rows} pagination={{ current: filters.page, pageSize: filters.limit, total: filters.total, onChange: (nextPage, nextPageSize) => loadRows({ ...filters, page: nextPage, limit: nextPageSize }) }} scroll={{ x: 1500 }} />
    </Card>
  );
}
