/* eslint-env node */
import process from "node:process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

const rawHttpsFlag = process.env.VITE_ENABLE_HTTPS;
const enableHttps = rawHttpsFlag !== "false";
const extraAllowedHosts = process.env.VITE_ALLOWED_HOSTS
  ? process.env.VITE_ALLOWED_HOSTS.split(",").map((host) => host.trim()).filter(Boolean)
  : [];
const allowedHosts = ["localhost", "127.0.0.1", "::1", "0.0.0.0", "10.0.2.2", "10.1.15.126", "172.19.224.1"];
const plugins = [react()];

for (const host of extraAllowedHosts) {
  if (!allowedHosts.includes(host)) {
    allowedHosts.push(host);
  }
}

if (enableHttps) {
  plugins.push(basicSsl());
}

export default defineConfig({
  plugins,
  server: {
    host: "0.0.0.0",
    port: 5173,
    https: enableHttps,
    allowedHosts,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
