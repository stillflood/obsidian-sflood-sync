#!/bin/bash

# Obsidian Sflood Sync 插件安装脚本

echo "📦 开始安装 Obsidian Sflood Sync 插件..."

# 检查是否安装了 npm
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未找到 npm。请先安装 Node.js 和 npm。"
    exit 1
fi

# 进入插件目录
cd "$(dirname "$0")"

echo "📥 安装依赖..."
npm install

echo "🔨 构建插件..."
npm run build

echo ""
echo "✅ 插件构建完成!"
echo ""
echo "📋 后续步骤:"
echo "1. 将整个 obsidian-sflood-sync 文件夹复制到你的 Obsidian vault:"
echo "   目标路径: /path/to/your/vault/.obsidian/plugins/obsidian-sflood-sync/"
echo ""
echo "2. 在 Obsidian 中启用插件:"
echo "   - 打开设置 → 社区插件"
echo "   - 关闭安全模式(如果已开启)"
echo "   - 在已安装插件中找到 'Sflood Notes Sync'"
echo "   - 点击启用"
echo ""
echo "3. 配置插件:"
echo "   - 设置 API 地址: http://localhost:4000/api (或你的生产环境地址)"
echo "   - 设置访问令牌(从 Sflood 管理后台获取)"
echo "   - 配置同步选项"
echo ""
echo "🚀 开始同步你的笔记吧!"
