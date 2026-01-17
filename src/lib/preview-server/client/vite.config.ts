import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "../../../../dist/preview-client",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3004",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:3004",
        ws: true,
      },
    },
  },
});
