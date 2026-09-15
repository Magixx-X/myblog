import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],

  // 部署到 https://<user>.github.io/<repo>/ 时，
  // GitHub Actions 会注入 VITE_BASE=/<repo>/；本地和根域名部署则为 '/'
  base: process.env.VITE_BASE || '/',

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },

  server: {
    port: 5173,
    open: false
  },

  build: {
    outDir: 'dist',
    // Markdown 正文全部内联进 bundle，方便纯静态部署
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1200
  }
})
