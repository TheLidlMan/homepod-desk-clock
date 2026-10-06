import { defineConfig } from "vite";
import minifyLiterals from "rollup-plugin-html-literals";

export default defineConfig({
  base: "/",
  define: {
    __MINI_DISPLAY_FEATURE_TLS__: JSON.stringify(
      process.env.MINI_DISPLAY_FEATURE_TLS === "1",
    ),
  },
  plugins: [
    minifyLiterals({
      include: ["**/*.ts"],
      failOnError: true,
      options: { sourceMap: false },
    }),
  ],
  build: {
    modulePreload: { polyfill: false },
    target: "es2020",
    cssMinify: "esbuild",
    minify: "terser",
    terserOptions: {
      ecma: 2020,
      module: true,
      compress: {
        passes: 3,
        pure_getters: "strict",
      },
      format: { comments: false },
    },
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: "assets/app.js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
