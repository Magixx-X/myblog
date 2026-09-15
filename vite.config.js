import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

/**
 * GitHub Pages 静态托管没有 SPA 兜底：
 * 直接访问/刷新 /posts/xxx 这类深链时，服务器上并不存在该文件，
 * GitHub 会返回自己的 404 页面（"File not found ... does not contain the requested file"）。
 *
 * 这里在构建时产出一个 404.html：它把用户原本想访问的路径临时存进
 * sessionStorage，再跳回站点根目录；应用启动后由 src/router/index.js
 * 把路径还原（用 history.replaceState，地址栏看起来完全没变过）。
 *
 * base 由构建配置注入（GitHub Actions 传 VITE_BASE=/<repo>/），
 * 所以同一份代码部署到根域名或子路径都能正确工作。
 */
function spaFallback404() {
  let base = '/'

  return {
    name: 'spa-fallback-404',
    apply: 'build',

    configResolved(config) {
      base = config.base
    },

    generateBundle() {
      const source = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>正在载入…</title>
<script>
  /* 由 vite.config.js 的 spaFallback404 插件在构建时生成，请勿手动修改 dist/404.html */
  (function () {
    var base = ${JSON.stringify(base)};
    var root = base.replace(/\\/$/, '');
    var path = window.location.pathname;
    var rest = path.indexOf(root) === 0 ? path.slice(root.length) : path;
    if (!rest || rest.charAt(0) !== '/') rest = '/' + rest;
    var target = rest + window.location.search + window.location.hash;
    try {
      window.sessionStorage.setItem('blog:spa-redirect', target);
    } catch (e) {
      /* 隐私模式下 sessionStorage 可能不可用：退化为只回首页，站点仍能正常浏览 */
    }
    window.location.replace(base);
  })();
</script>
</head>
<body></body>
</html>
`

      this.emitFile({ type: 'asset', fileName: '404.html', source })
    }
  }
}

export default defineConfig({
  plugins: [vue(), spaFallback404()],

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
