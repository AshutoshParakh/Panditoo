import { BankOutlined, CheckOutlined, CloseOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Card, Input, Modal, Select, Space, Table, Tag, Typography, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { adminApiRequest } from "../lib/api";
import { DateRangeFilter } from "../components/DateRangeFilter";

const { Text, Title } = Typography;
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value || 0));
const statusColor = { pending: "gold", approved: "blue", paid: "green", rejected: "red" };

export function WithdrawalsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState();
  const [dateRange, setDateRange] = useState([null, null]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (dateRange[0]) params.set("startDate", dateRange[0]);
      if (dateRange[1]) params.set("endDate", dateRange[1]);
      const result = await adminApiRequest(`/admin/withdrawals?${params.toString()}`, { token });
      setRows(result.data || []);
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [status, dateRange, token]);

  useEffect(() => { load(); }, [load]);

  const update = (row, nextStatus) => {
    let note = "";
    Modal.confirm({
      title: `${nextStatus === "paid" ? "Mark paid" : nextStatus === "approved" ? "Approve" : "Reject"} withdrawal of ${money(row.amount)}?`,
      content: (
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text type="secondary">
            {nextStatus === "rejected" ? "The held amount will return to the pandit's wallet." : nextStatus === "paid" ? "Confirm only after the bank transfer is completed." : "Approved requests should be transferred within 2–3 working days."}
          </Text>
          <Input.TextArea placeholder="Admin note / bank reference (optional)" onChange={(event) => { note = event.target.value; }} />
        </Space>
      ),
      okText: nextStatus === "paid" ? "Mark paid" : nextStatus === "approved" ? "Approve" : "Reject and refund",
      okButtonProps: { danger: nextStatus === "rejected" },
      onOk: async () => {
        await adminApiRequest(`/admin/withdrawals/${row.id}`, { method: "PATCH", token, body: { status: nextStatus, admin_note: note } });
        message.success("Withdrawal updated");
        load();
      }
    });
  };

  const columns = [
    { title: "Pandit", render: (_, row) => <><Text strong>{row.pandit_name}</Text><br /><Text type="secondary">{row.pandit_phone}</Text></> },
    { title: "Amount", dataIndex: "amount", render: (value) => <Text strong>{money(value)}</Text> },
    { title: "Requested", dataIndex: "requested_at", render: (value) => new Date(value).toLocaleString("en-IN") },
    { title: "Bank account", render: (_, row) => { const bank = row.bank_snapshot || {}; const account = bank.accountNo || bank.accountNumber; return <><Text>{bank.bankName || "—"}</Text><br /><Text type="secondary">{account ? `•••• ${String(account).slice(-4)}` : "No account"} · {bank.ifscCode || "No IFSC"}</Text></>; } },
    { title: "Status", dataIndex: "status", render: (value) => <Tag color={statusColor[value]}>{value.toUpperCase()}</Tag> },
    { title: "Admin note", dataIndex: "admin_note", render: (value) => value || "—" },
    { title: "Actions", fixed: "right", render: (_, row) => <Space>{row.status === "pending" && <><Button type="primary" icon={<CheckOutlined />} onClick={() => update(row, "approved")}>Approve</Button><Button danger icon={<CloseOutlined />} onClick={() => update(row, "rejected")}>Reject</Button></>}{row.status === "approved" && <><Button type="primary" icon={<BankOutlined />} onClick={() => update(row, "paid")}>Mark paid</Button><Button danger onClick={() => update(row, "rejected")}>Reject</Button></>}</Space> },
  ];

  return (
    <Space direction="vertical" size={20} className="page-stack">
      <Card><Title level={3}><BankOutlined /> Pandit Wallet Withdrawals</Title><Text type="secondary">Requests are held immediately. Approve, transfer within 2–3 working days, then mark paid. Rejection automatically refunds the wallet.</Text></Card>
      <Card title="Withdrawal queue" extra={<Space wrap><DateRangeFilter value={dateRange} onChange={setDateRange} /><Select allowClear placeholder="All statuses" style={{ width: 140 }} value={status} onChange={setStatus} options={["pending", "approved", "paid", "rejected"].map((value) => ({ value, label: value.toUpperCase() }))} /><Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button></Space>}>
        <Table rowKey="id" loading={loading} dataSource={rows} columns={columns} scroll={{ x: 1100 }} />
      </Card>
    </Space>
  );
}
