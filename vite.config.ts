import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/CipherDispatch/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Auto Appraisal",
        short_name: "Appraisal",
        start_url: "/CipherDispatch/",
        display: "standalone",
        background_color: "#ffffff",
        icons: [],
      },
    }),
  ],
});
