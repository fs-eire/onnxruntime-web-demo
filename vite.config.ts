import { fileURLToPath, URL } from "node:url";

import { normalizePath, defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { viteStaticCopy } from 'vite-plugin-static-copy'
import path from "path"

const srcFolder = path.join(__dirname, 'node_modules', 'onnxruntime-web', 'dist');
const destFolder = path.join(__dirname, 'public');
const assetFolder = path.join(__dirname, 'src', 'assets');

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(), 
    viteStaticCopy({
      targets: [
        {
          src: normalizePath(path.join(srcFolder, 'ort-wasm.wasm')),
          dest: normalizePath(path.join(destFolder))
        },
        {
          src: normalizePath(path.join(srcFolder, 'ort-wasm-simd.wasm')),
          dest: normalizePath(path.join(destFolder))
        },
        {
          src: normalizePath(path.join(srcFolder, 'ort-wasm-threaded.wasm')),
          dest: normalizePath(path.join(destFolder))
        },
        {
          src: normalizePath(path.join(srcFolder, 'ort-wasm-simd-threaded.wasm')),
          dest: normalizePath(path.join(destFolder))
        },
        {
          src: normalizePath(path.join(srcFolder, 'ort.min.js')),
          dest: normalizePath(path.join(destFolder))
        },
        {
          src: normalizePath(path.join(assetFolder)),
          dest: normalizePath(path.join(destFolder))
        },
      ]
    })
  ],
  publicDir: 'public',
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  base: process.env.NODE_ENV === 'production' ? '/onnxruntime-web-demo/' : '/',
  build: {
    outDir: 'docs',
  },
});
