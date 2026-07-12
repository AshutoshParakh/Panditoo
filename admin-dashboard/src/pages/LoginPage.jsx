import { LockOutlined, MailOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Space, Typography } from "antd";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { adminApiRequest } from "../lib/api";

const { Paragraph, Text, Title } = Typography;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFinish = async (values) => {
    try {
      setLoading(true);
      setError("");
      const response = await adminApiRequest("/auth/admin/login", {
        method: "POST",
        body: values,
      });
      login({
        token: response.token,
        admin: response.admin,
      });
      const redirectTo = location.state?.from?.pathname || "/overview";
      navigate(redirectTo, { replace: true });
    } catch (loginError) {
      setError(loginError.message || "Unable to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-background-orb orb-one" />
      <div className="login-background-orb orb-two" />

      <div className="login-layout">
        <section className="login-copy-panel">
          <Tagline />
        </section>

        <Card className="login-card" bordered={false}>
          <Space direction="vertical" size={20} className="page-stack">
            <div>
              <Text className="muted-label">Superadmin access</Text>
              <Title level={2} className="login-title">
                Sign in to review pandit approvals and marketplace operations
              </Title>
              <Paragraph className="login-copy">
                Use your admin credentials to access the protected dashboard. Expired or invalid
                sessions are automatically redirected here.
              </Paragraph>
            </div>

            {error ? <Alert type="error" showIcon message={error} /> : null}

            <Form layout="vertical" onFinish={handleFinish} autoComplete="off">
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: "Email is required" },
                  { type: "email", message: "Enter a valid email" },
                ]}
              >
                <Input prefix={<MailOutlined />} size="large" placeholder="admin@company.com" />
              </Form.Item>

              <Form.Item
                label="Password"
                name="password"
                rules={[{ required: true, message: "Password is required" }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  size="large"
                  placeholder="Enter password"
                />
              </Form.Item>

              <Button type="primary" htmlType="submit" size="large" block loading={loading}>
                Login to Dashboard
              </Button>
            </Form>
          </Space>
        </Card>
      </div>
    </div>
  );
}

function Tagline() {
  return (
    <div className="login-showcase">
      <div className="showcase-chip">
        <SafetyCertificateOutlined />
        <span>Marketplace Governance</span>
      </div>
      <Title level={1} className="showcase-title">
        Advanced control for approvals, catalog quality, and platform operations.
      </Title>
      <Paragraph className="showcase-copy">
        A data-dense superadmin surface built for high-signal review. Track pending pandit
        verification, keep operational modules within one shell, and maintain a consistent
        protected workflow for administrators.
      </Paragraph>
      <div className="showcase-grid">
        <div className="showcase-stat">
          <strong>7</strong>
          <span>Core modules</span>
        </div>
        <div className="showcase-stat">
          <strong>24/7</strong>
          <span>Ops visibility</span>
        </div>
        <div className="showcase-stat">
          <strong>Secure</strong>
          <span>Token-gated routes</span>
        </div>
      </div>
    </div>
  );
}
