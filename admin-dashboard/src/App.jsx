import { App as AntdApp, ConfigProvider, theme } from "antd";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { AppRoutes } from "./routes/AppRoutes";

const adminTheme = {
  token: {
    colorPrimary: "#b45309",
    colorInfo: "#b45309",
    colorSuccess: "#15803d",
    colorWarning: "#d97706",
    colorError: "#dc2626",
    borderRadius: 16,
    fontFamily: "'Segoe UI', 'Inter', sans-serif",
    colorBgBase: "#f6f7fb",
  },
  algorithm: theme.defaultAlgorithm,
};

export default function App() {
  return (
    <ConfigProvider theme={adminTheme}>
      <AntdApp>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
}
