import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { deno } from "./deno-plugin.ts";
import Inspect from "vite-plugin-inspect";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    Inspect(),
    deno(),
    preact(),
  ],
});
