import { defineConfig } from "vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  build: {
    lib: { entry: resolve(root, "src/index.ts"), formats: ["es"], fileName: () => "mini-display-panel.js" },
    outDir: resolve(root, "../../custom_components/mini_display/frontend"),
    emptyOutDir: true,
    sourcemap: true,
  },
});
