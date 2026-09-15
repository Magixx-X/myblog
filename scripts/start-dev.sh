#!/usr/bin/env bash
# ============================================================
#  我的博客 —— 开发服务器启动（Git Bash / WSL / macOS / Linux）
#
#  所有逻辑都在 scripts/start-dev.mjs 里：
#    - 依赖缺失时自动 npm install
#    - 清理占用端口的残留进程
#    - 启动 vite 并打开浏览器
#
#  这里只负责找到 Node 并转交。
#
#  用法：  bash scripts/start-dev.sh
#          PORT=3000 bash scripts/start-dev.sh
# ============================================================
set -uo pipefail

cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  [错误] 找不到 node，请先安装 Node.js 18+：https://nodejs.org/"
  echo ""
  exit 1
fi

exec node scripts/start-dev.mjs
