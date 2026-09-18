import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Resolve @pulsechain/shared from workspace source — no build step needed
      "@pulsechain/shared": path.resolve(__dirname, "../shared/src/index.ts"),
    },
  },
});
