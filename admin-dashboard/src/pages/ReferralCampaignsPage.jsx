import { CopyOutlined, PlusOutlined, QrcodeOutlined } from "@ant-design/icons";
import { Button, Card, Col, DatePicker, Form, Input, InputNumber, Modal, QRCode, Row, Select, Space, Statistic, Switch, Table, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { adminApiRequest } from "../lib/api";

const { Text, Title } = Typography;
const appUrl = (import.meta.env.VITE_USER_APP_URL || "panditoo://register").replace(/\/$/, "");
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export function ReferralCampaignsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); const [qr, setQr] = useState(null); const [form] = Form.useForm();
  const load = async () => { try { setLoading(true); const result=await adminApiRequest("/admin/referrals",{token});setRows(result.data||[]);}catch(error){message.error(error.message);}finally{setLoading(false);} };
  useEffect(()=>{load();},[]);
  const totals=useMemo(()=>rows.reduce((a,r)=>({signups:a.signups+Number(r.signups||0),bookings:a.bookings+Number(r.paid_bookings||0),revenue:a.revenue+Number(r.revenue||0),cost:a.cost+Number(r.campaign_cost||0)}),{signups:0,bookings:0,revenue:0,cost:0}),[rows]);
  const open=(row=null)=>{setEditing(row||{});form.resetFields();form.setFieldsValue(row?{...row,starts_at:row.starts_at?dayjs(row.starts_at):null,ends_at:row.ends_at?dayjs(row.ends_at):null}:{discount_type:null,campaign_cost:0,min_order_amount:0,is_active:true});};
  const save=async(values)=>{try{const payload={...values,code:values.code.toUpperCase(),starts_at:values.starts_at?.toISOString()||null,ends_at:values.ends_at?.toISOString()||null};await adminApiRequest(`/admin/referrals${editing?.id?`/${editing.id}`:""}`,{method:editing?.id?"PUT":"POST",token,body:payload});message.success("Referral campaign saved");setEditing(null);load();}catch(error){message.error(error.message);}};
  const toggle=async(row)=>{try{await adminApiRequest(`/admin/referrals/${row.id}`,{method:"PATCH",token,body:{is_active:!row.is_active}});load();}catch(error){message.error(error.message);}};
  const link=(row)=>`${appUrl}/?ref=${encodeURIComponent(row.code)}`;
  const columns=[
    {title:"Campaign",render:(_,r)=><><Text strong>{r.name}</Text><br/><Text code>{r.code}</Text></>},
    {title:"Source",render:(_,r)=><><Tag>{r.channel}</Tag><br/><Text type="secondary">{r.location||"All locations"}</Text></>},
    {title:"Offer",render:(_,r)=>r.discount_type?(r.discount_type==="percent"?`${r.discount_value}% off${r.max_discount_amount?` (max ${money(r.max_discount_amount)})`:""}`:`${money(r.discount_value)} off`):"Tracking only"},
    {title:"Signups",dataIndex:"signups"},{title:"Paid bookings",dataIndex:"paid_bookings"},
    {title:"Revenue",dataIndex:"revenue",render:money},{title:"Spend",dataIndex:"campaign_cost",render:money},
    {title:"CPA",dataIndex:"cost_per_signup",render:v=>v==null?"-":money(v)},
    {title:"ROI",dataIndex:"roi_percent",render:v=>v==null?"-":<Tag color={Number(v)>=0?"green":"red"}>{v}%</Tag>},
    {title:"Active",render:(_,r)=><Switch checked={r.is_active} onChange={()=>toggle(r)}/>},
    {title:"",render:(_,r)=><Space><Button icon={<QrcodeOutlined/>} onClick={()=>setQr(r)}/><Button onClick={()=>open(r)}>Edit</Button></Space>},
  ];
  return <Space direction="vertical" size={18} className="page-stack">
    <Card><Space direction="vertical" size={2}><Title level={3}>Referral campaigns</Title><Text type="secondary">Track every signup and paid booking by source, location and campaign. Discounts are optional and applied securely at checkout.</Text></Space></Card>
    <Row gutter={14}><Col span={6}><Card><Statistic title="Attributed signups" value={totals.signups}/></Card></Col><Col span={6}><Card><Statistic title="Paid bookings" value={totals.bookings}/></Card></Col><Col span={6}><Card><Statistic title="Attributed revenue" value={totals.revenue} prefix="₹" precision={0}/></Card></Col><Col span={6}><Card><Statistic title="Campaign spend" value={totals.cost} prefix="₹" precision={0}/></Card></Col></Row>
    <Card title="Campaign performance" extra={<Button type="primary" icon={<PlusOutlined/>} onClick={()=>open()}>Create campaign</Button>}><Table rowKey="id" loading={loading} dataSource={rows} columns={columns} scroll={{x:1300}}/></Card>
    <Modal open={Boolean(editing)} onCancel={()=>setEditing(null)} onOk={()=>form.submit()} title={`${editing?.id?"Edit":"Create"} referral campaign`} width={820}><Form form={form} layout="vertical" onFinish={save}><Row gutter={16}>
      <Col span={8}><Form.Item name="code" label="Unique code" rules={[{required:true}]}><Input placeholder="TEMPLE01" onChange={e=>form.setFieldValue("code",e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g,""))}/></Form.Item></Col><Col span={8}><Form.Item name="name" label="Campaign name" rules={[{required:true}]}><Input placeholder="Mahakal Temple Banner"/></Form.Item></Col><Col span={8}><Form.Item name="channel" label="Marketing channel" rules={[{required:true}]}><Select showSearch options={["Temple Banner","Apartment Society","Instagram","Facebook","Shop Banner","Google","Influencer","Other"].map(value=>({value,label:value}))}/></Form.Item></Col>
      <Col span={12}><Form.Item name="location" label="Location"><Input placeholder="Vijay Nagar, Indore"/></Form.Item></Col><Col span={12}><Form.Item name="campaign_cost" label="Marketing spend"><InputNumber min={0} prefix="₹" style={{width:"100%"}}/></Form.Item></Col>
      <Col span={8}><Form.Item name="discount_type" label="Discount"><Select allowClear placeholder="Tracking only" options={[{value:"percent",label:"Percentage off"},{value:"fixed",label:"Fixed amount off"}]}/></Form.Item></Col><Col span={8}><Form.Item noStyle shouldUpdate>{({getFieldValue})=>getFieldValue("discount_type")?<Form.Item name="discount_value" label={getFieldValue("discount_type")==="percent"?"Discount %":"Discount amount"} rules={[{required:true}]}><InputNumber min={1} max={getFieldValue("discount_type")==="percent"?100:undefined} style={{width:"100%"}}/></Form.Item>:null}</Form.Item></Col><Col span={8}><Form.Item name="max_discount_amount" label="Maximum discount"><InputNumber min={0} prefix="₹" style={{width:"100%"}}/></Form.Item></Col>
      <Col span={8}><Form.Item name="min_order_amount" label="Minimum booking"><InputNumber min={0} prefix="₹" style={{width:"100%"}}/></Form.Item></Col><Col span={8}><Form.Item name="usage_limit" label="Paid booking limit"><InputNumber min={1} style={{width:"100%"}}/></Form.Item></Col><Col span={8}><Form.Item name="is_active" label="Active" valuePropName="checked"><Switch/></Form.Item></Col>
      <Col span={12}><Form.Item name="starts_at" label="Starts"><DatePicker showTime style={{width:"100%"}}/></Form.Item></Col><Col span={12}><Form.Item name="ends_at" label="Ends"><DatePicker showTime style={{width:"100%"}}/></Form.Item></Col>
    </Row></Form></Modal>
    <Modal open={Boolean(qr)} onCancel={()=>setQr(null)} footer={null} title={qr?`${qr.name} QR code`:"QR code"}><Space direction="vertical" align="center" style={{width:"100%"}} size={16}>{qr?<><QRCode value={link(qr)} size={240}/><Text code>{qr.code}</Text><Text copyable={{text:link(qr)}}>{link(qr)}</Text><Button icon={<CopyOutlined/>} onClick={()=>navigator.clipboard.writeText(link(qr)).then(()=>message.success("Link copied"))}>Copy campaign link</Button></>:null}</Space></Modal>
  </Space>;
}
