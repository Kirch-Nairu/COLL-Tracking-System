import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "COLL Attendance",
        short_name: "COLL",
        description: "COLL member attendance and event operations",
        display: "standalone",
        start_url: "/",
        theme_color: "#0f2744",
        background_color: "#f5f7fb"
      }
    }),
    cloudflare()
  ]
});
