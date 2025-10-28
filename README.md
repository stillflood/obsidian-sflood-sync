# Sflood Notes Sync - Obsidian插件

自动同步Obsidian笔记到Sflood个人网站平台的插件。

## 功能特性

- ✨ **一键同步**: 快速同步当前笔记或所有笔记到Sflood平台
- 🔄 **自动同步**: 支持保存时自动同步和定时批量同步
- 🏷️ **智能标签**: 支持标签前缀过滤，只同步特定标签的笔记
- 📁 **文件夹映射**: 支持将Obsidian文件夹映射到Sflood笔记分类
- 📝 **Frontmatter支持**: 自动管理笔记元数据和同步状态
- 🔐 **安全认证**: 使用JWT令牌进行API认证

## 安装方法

### 开发模式安装

1. 克隆或下载此插件到Obsidian插件文件夹:
   ```bash
   cd /path/to/your/vault/.obsidian/plugins
   git clone https://github.com/stillflood/sflood.git obsidian-sflood-sync
   cd obsidian-sflood-sync
   ```

2. 安装依赖:
   ```bash
   npm install
   ```

3. 构建插件:
   ```bash
   npm run build
   ```

4. 在Obsidian中启用插件:
   - 打开设置 → 社区插件
   - 关闭安全模式
   - 刷新已安装插件列表
   - 启用 "Sflood Notes Sync"

### 开发模式

```bash
npm run dev
```

## 配置说明

### 基础配置

1. **API地址**: Sflood API的基础URL
   - 示例: `http://localhost:4000/api` (本地开发)
   - 示例: `https://api.yoursite.com/api` (生产环境)

2. **访问令牌**: 从Sflood管理后台获取的JWT访问令牌
   - 登录管理后台
   - 在个人设置中生成API令牌
   - 复制并粘贴到插件设置中

3. **同步文件夹**: 指定要同步的笔记文件夹
   - 留空则同步所有markdown文件
   - 示例: `Notes` 或 `Notes/Blog`

### 同步选项

- **保存时同步**: 文件保存时自动同步到Sflood
- **启用自动同步**: 定时批量同步所有符合条件的笔记
- **同步间隔**: 自动同步的时间间隔（5-120分钟）
- **标签前缀**: 只同步带有特定前缀的标签
  - 示例: `publish/` → 只同步 `#publish/tech` 这类标签

### 分类映射

将Obsidian文件夹映射到Sflood笔记分类:

```
Obsidian文件夹       →  Sflood分类ID
Notes/Tech          →  uuid-tech-category
Notes/Life          →  uuid-life-category
Notes/Reading       →  uuid-reading-category
```

## 使用方法

### Frontmatter格式

在笔记顶部添加frontmatter来控制同步行为:

```yaml
---
title: 我的笔记标题
slug: my-note-slug
status: published  # draft 或 published
summary: 这是笔记摘要
tags:
  - tech
  - programming
categoryId: uuid-of-category
sfloodId: uuid-of-synced-note  # 自动生成，请勿手动修改
---

# 笔记内容

这里是你的markdown内容...
```

### 同步方式

1. **手动同步当前笔记**
   - 使用命令面板: `Ctrl/Cmd + P` → "同步当前笔记到Sflood"
   - 或点击侧边栏的云图标

2. **批量同步所有笔记**
   - 使用命令面板: `Ctrl/Cmd + P` → "同步所有笔记到Sflood"

3. **自动同步**
   - 在设置中启用"保存时同步"或"启用自动同步"

### 标签控制

使用标签前缀来选择性同步:

```markdown
# 笔记示例

#publish/tech #publish/tutorial

这篇笔记会被同步，且标签会变为: tech, tutorial
```

如果设置了标签前缀为 `publish/`，则只有带 `#publish/` 前缀的标签会被同步。

## API端点

插件使用以下Sflood API端点:

- `POST /api/v1/admin/notes` - 创建新笔记
- `PUT /api/v1/admin/notes/:id` - 更新笔记
- `GET /api/v1/admin/notes/:id` - 获取笔记详情

## 故障排除

### 同步失败

1. 检查API地址和访问令牌是否正确
2. 确保Sflood后端服务正在运行
3. 查看浏览器开发者工具的控制台日志
4. 检查网络连接

### 令牌过期

如果遇到认证失败:
1. 重新登录Sflood管理后台
2. 生成新的API令牌
3. 更新插件设置中的访问令牌

### 分类ID查找

在Sflood管理后台:
1. 进入笔记分类管理
2. 查看分类详情获取UUID
3. 复制ID到插件的分类映射中

## 开发

### 项目结构

```
obsidian-sflood-sync/
├── main.ts              # 插件主文件
├── manifest.json        # 插件清单
├── package.json         # 依赖配置
├── tsconfig.json        # TypeScript配置
├── esbuild.config.mjs   # 构建配置
└── README.md           # 文档
```

### 构建命令

```bash
# 开发模式（watch）
npm run dev

# 生产构建
npm run build

# 版本升级
npm run version
```

## 贡献

欢迎提交Issue和Pull Request！

## 许可证

MIT License

## 相关链接

- [Sflood主仓库](https://github.com/stillflood/sflood)
- [Obsidian插件开发文档](https://docs.obsidian.md/)
- [Sflood API文档](../services/api/README.md)
# obsidian-sflood-sync
