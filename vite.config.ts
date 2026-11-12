import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"

// Vite config — https://vite.dev/config/
export default defineConfig(() => {
  return {
    base: "/",
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    server: {
      host: process.env.DEV_SERVER_HOST || "0.0.0.0",
      port: parseInt(process.env.PORT || "8443"),
      strictPort: true,
      // Reenvía las llamadas /api al backend de Express (pnpm run dev:backend)
      proxy: {
        "/api": `http://localhost:${process.env.BACKEND_PORT || "3000"}`,
      },
    },
    preview: {
      host: process.env.DEV_SERVER_HOST || "0.0.0.0",
      port: parseInt(process.env.PORT || "8443"),
    },
  }
})
