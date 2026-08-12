import {
  BellOutlined,
  BookOutlined,
  CalendarOutlined,
  CompassOutlined,
  CreditCardOutlined,
  DashboardOutlined,
  LogoutOutlined,
  ReadOutlined,
  ShareAltOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Layout,
  Menu,
  Space,
  Tag,
  Typography,
} from "antd";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

const { Header, Sider, Content } = Layout;
const { Text, Title } = Typography;

const menuItems = [
  { key: "/overview", icon: <DashboardOutlined />, label: <NavLink to="/overview">Overview</NavLink> },
  { key: "/customer-journey", icon: <CompassOutlined />, label: <NavLink to="/customer-journey">Customer Journey</NavLink> },
  { key: "/bookings", icon: <CalendarOutlined />, label: <NavLink to="/bookings">Bookings</NavLink> },
  { key: "/pandits", icon: <SafetyCertificateOutlined />, label: <NavLink to="/pandits">Pandits</NavLink> },
  { key: "/users", icon: <UserOutlined />, label: <NavLink to="/users">Users</NavLink> },
  { key: "/pooja-types", icon: <ReadOutlined />, label: <NavLink to="/pooja-types">Pooja Types</NavLink> },
  { key: "/payments", icon: <CreditCardOutlined />, label: <NavLink to="/payments">Payments</NavLink> },
  { key: "/withdrawals", icon: <WalletOutlined />, label: <NavLink to="/withdrawals">Withdrawals</NavLink> },
  { key: "/pricing-control", icon: <CalendarOutlined />, label: <NavLink to="/pricing-control">Pricing Control</NavLink> },
  { key: "/referrals", icon: <ShareAltOutlined />, label: <NavLink to="/referrals">Referrals</NavLink> },
  { key: "/reports", icon: <BookOutlined />, label: <NavLink to="/reports">Reports</NavLink> },
];

const routeTitleMap = {
  "/overview": "Overview",
  "/customer-journey": "Customer Journey & Funnel",
  "/bookings": "Bookings",
  "/pandits": "Pandits",
  "/users": "Users",
  "/pooja-types": "Pooja Types",
  "/payments": "Payments",
  "/withdrawals": "Withdrawals",
  "/pricing-control": "Pricing Control",
  "/referrals": "Referral Campaigns",
  "/reports": "Reports",
};

export function AdminShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout } = useAuth();

  const selectedKey =
    menuItems.find((item) => location.pathname.startsWith(item.key))?.key ?? "/overview";
  const currentTitle = routeTitleMap[selectedKey] ?? "Overview";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <Layout className="admin-layout">
      <Sider width={280} className="admin-sider" breakpoint="lg" collapsedWidth="0">
        <div className="brand-block">
          <div className="brand-mark">SB</div>
          <div>
            <Title level={4} className="brand-title">
              Shree Booking
            </Title>
            <Text className="brand-subtitle">Superadmin Command Center</Text>
          </div>
        </div>

        <Card className="sider-profile-card" bordered={false}>
          <Space align="start">
            <Avatar size={52} icon={<TeamOutlined />} className="admin-avatar" />
            <div>
              <Text className="muted-label">Logged in as</Text>
              <Title level={5} className="sider-admin-name">
                {admin?.name || "Superadmin"}
              </Title>
              <Tag color="gold">{admin?.role || "admin"}</Tag>
            </div>
          </Space>
        </Card>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          className="admin-menu"
        />
      </Sider>

      <Layout>
        <Header className="admin-header">
          <div>
            <Breadcrumb
              items={[
                { title: "Superadmin" },
                { title: currentTitle },
              ]}
            />
            <Title level={3} className="page-title">
              {currentTitle}
            </Title>
          </div>

          <Space size="middle">
            <Badge count={3} size="small">
              <Button shape="circle" icon={<BellOutlined />} size="large" />
            </Badge>
            <div className="header-admin-chip">
              <Avatar icon={<UserOutlined />} />
              <div>
                <Text strong>{admin?.name || "Superadmin"}</Text>
                <Text className="muted-label">{admin?.email || "admin@localhost"}</Text>
              </div>
            </div>
            <Button icon={<LogoutOutlined />} onClick={handleLogout}>
              Logout
            </Button>
          </Space>
        </Header>

        <Content className="admin-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
