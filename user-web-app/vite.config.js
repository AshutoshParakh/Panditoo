import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxy = {
    "/api": {
      target: env.VITE_PROXY_TARGET || "https://api.panditoo.in",
      changeOrigin: true,
      secure: false,
    },
  };

  return {
    plugins: [react()],
    server: {
      port: 5174,
      proxy: apiProxy,
    },
    preview: { port: 4174, proxy: apiProxy },
  };
});
