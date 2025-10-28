# Obsidian Sflood Sync 插件使用指南

## 快速开始

### 1. 安装插件

#### 方式一: 开发安装(推荐用于测试)

```bash
cd /home/ht/dev/sflood/obsidian-sflood-sync
chmod +x install.sh
./install.sh
```

然后将整个文件夹复制到你的Obsidian vault:

```bash
# 替换为你的 vault 路径
cp -r /home/ht/dev/sflood/obsidian-sflood-sync /path/to/your/vault/.obsidian/plugins/
```

#### 方式二: 手动安装

1. 进入插件目录并安装依赖:
```bash
cd /home/ht/dev/sflood/obsidian-sflood-sync
npm install
npm run build
```

2. 复制到Obsidian插件目录
3. 在Obsidian中启用插件

### 2. 获取API访问令牌

#### 方法一: 通过管理后台生成长期令牌(推荐)

1. 登录 Sflood 管理后台
   - 开发环境: http://localhost:3001
   - 生产环境: https://admin.stillflood.dev (或你的域名)

2. 进入 **API 令牌** 页面
   - 在左侧导航栏点击 "API 令牌"

3. 创建新令牌
   - 点击 "创建新令牌" 按钮
   - 输入令牌名称，例如: `Obsidian 插件`
   - 选择有效期（推荐 30 天或更长）
   - 点击 "创建令牌"

4. 复制令牌
   - ⚠️ **重要**: 令牌只会显示一次，请立即复制并保存
   - 点击 "复制" 按钮将令牌复制到剪贴板

> **提示**: 这种方式生成的是长期有效的 API Token，不需要频繁更新。与短期的 JWT 令牌不同，API Token 专为第三方集成设计，更加稳定可靠。

#### 方法二: 手动获取 JWT 令牌(仅用于开发测试)

> ⚠️ **不推荐**: JWT 令牌有效期短（默认 15 分钟），需要频繁刷新，不适合日常使用。

```bash
# 登录获取短期 JWT 令牌
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your-password"
  }'

# 响应中会包含 accessToken (15分钟有效)
```

### 3. 配置插件

在 Obsidian 中:

1. 打开设置 → 社区插件 → Sflood Notes Sync
2. 配置基本设置:
   - **API地址**: `http://localhost:4000/api` (开发) 或 `https://api.stillflood.dev/api` (生产)
   - **访问令牌**: 粘贴刚才从管理后台复制的 API Token
   - **同步文件夹**: `Notes` (或你想同步的文件夹)

3. 配置同步选项:
   - ✅ 保存时同步 (推荐)
   - ✅ 启用自动同步 (可选)
   - 同步间隔: 30分钟 (可调整)

## 使用示例

### 创建一个可同步的笔记

在Obsidian中创建新笔记 `Notes/my-first-note.md`:

```yaml
---
title: 我的第一篇技术笔记
slug: my-first-note
status: published
summary: 这是一篇关于如何使用Obsidian同步到Sflood的笔记
tags:
  - tech
  - tutorial
---

# 我的第一篇技术笔记

这是笔记内容...

## 代码示例

\`\`\`typescript
console.log('Hello Sflood!');
\`\`\`

## 使用标签

你可以在内容中使用标签:
#publish/tech #publish/obsidian

这些标签会被同步到Sflood。
```

### 同步笔记

**方式一: 自动同步**
- 保存文件后自动同步 ✨

**方式二: 手动同步**
- 打开命令面板 (`Ctrl/Cmd + P`)
- 输入 "Sync to Sflood"
- 选择 "同步当前笔记到Sflood"

**方式三: 使用功能区图标**
- 点击侧边栏的云图标 ☁️

### 验证同步结果

1. 同步成功后,frontmatter会自动添加 `sfloodId`:

```yaml
---
title: 我的第一篇技术笔记
sfloodId: 550e8400-e29b-41d4-a716-446655440000
---
```

2. 访问Sflood网站查看笔记:
   - http://localhost:3000/notes (前端)
   - http://localhost:3001/notes (管理后台)

## 高级配置

### 文件夹到分类映射

如果你想将不同的Obsidian文件夹同步到不同的Sflood分类:

1. 在Sflood管理后台创建笔记分类,获取分类UUID
2. 在插件设置中添加映射:

```
Notes/Tech       → 123e4567-e89b-12d3-a456-426614174001
Notes/Life       → 123e4567-e89b-12d3-a456-426614174002
Notes/Reading    → 123e4567-e89b-12d3-a456-426614174003
```

### 使用标签前缀过滤

如果你只想同步带特定标签的笔记:

1. 设置标签前缀为 `publish/`
2. 在笔记中使用标签:
   ```markdown
   #publish/tech #publish/tutorial
   ```
3. 只有带 `publish/` 前缀的标签会被同步

### 草稿和发布管理

通过frontmatter的 `status` 字段控制:

```yaml
---
status: draft      # 草稿,不公开显示
---
```

```yaml
---
status: published  # 发布,公开可见
---
```

## 工作流推荐

### 个人博客工作流

1. **在Obsidian中写作**
   - 使用 `Notes/Blog/` 文件夹
   - 先设置为 `status: draft`
   - 专注于内容创作

2. **完善和编辑**
   - 添加标签和摘要
   - 检查格式和图片

3. **发布**
   - 修改 `status: published`
   - 保存后自动同步
   - 在网站上查看效果

### 知识管理工作流

1. **笔记组织**
   ```
   Notes/
   ├── Tech/          → 技术分类
   ├── Reading/       → 读书笔记
   ├── Life/          → 生活感悟
   └── Ideas/         → 想法收集
   ```

2. **选择性同步**
   - 使用标签前缀: `#publish/`
   - 只同步成熟的笔记
   - 保留私密笔记在本地

3. **定期整理**
   - 批量同步: 命令面板 → "同步所有笔记到Sflood"
   - 自动同步间隔: 30分钟

## 故障排除

### 同步失败

**检查清单:**

1. ✅ API地址是否正确?
   ```bash
   # 测试API连接
   curl http://localhost:4000/api/v1/health
   ```

2. ✅ 访问令牌是否有效?
   ```bash
   # 测试令牌
   curl http://localhost:4000/api/v1/admin/notes \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. ✅ 网络连接是否正常?

4. ✅ 查看控制台错误日志:
   - 按 `Ctrl/Cmd + Shift + I` 打开开发者工具
   - 查看Console标签

### 令牌过期

JWT令牌可能会过期,需要重新获取:

```bash
# 重新登录获取新令牌
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your-username","password":"your-password"}'
```

### 找不到分类ID

在Sflood管理后台:
1. 进入 笔记分类管理
2. 点击分类查看详情
3. URL中包含分类UUID: `/notes/categories/[UUID]`

## 开发和调试

### 开发模式

```bash
cd /home/ht/dev/sflood/obsidian-sflood-sync
npm run dev  # 启动watch模式
```

修改代码后,在Obsidian中:
1. 打开命令面板
2. 运行 "Reload app without saving"
3. 或按 `Ctrl/Cmd + R`

### 查看日志

在Obsidian开发者工具中:
```javascript
// 控制台会显示
console.log('Sflood Sync Plugin loaded');
console.log('Auto-sync started: every 30 minutes');
```

### 测试API请求

```bash
# 测试创建笔记
curl -X POST http://localhost:4000/api/v1/admin/notes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试笔记",
    "slug": "test-note",
    "markdown": "# 测试\n这是测试内容",
    "summary": "测试摘要",
    "tags": ["test"],
    "status": "draft"
  }'
```

## 常见问题

**Q: 可以同步图片吗?**
A: 当前版本只同步markdown文本。图片需要:
1. 上传到Sflood的媒体库
2. 在markdown中使用绝对URL引用

**Q: 如何批量导入现有笔记?**
A: 使用 "同步所有笔记到Sflood" 命令,插件会批量处理所有符合条件的笔记。

**Q: 同步会覆盖服务器上的内容吗?**
A: 是的。如果笔记已存在(有sfloodId),同步会更新服务器内容。建议先备份重要数据。

**Q: 可以双向同步吗?**
A: 当前版本只支持从Obsidian → Sflood的单向同步。

**Q: 支持哪些markdown语法?**
A: 支持所有标准markdown语法,Sflood后端会将其转换为HTML。

## 下一步

- 探索更多Obsidian插件生态
- 自定义同步规则
- 贡献代码改进插件
- 分享你的使用经验

## 相关资源

- [Sflood项目文档](../README.md)
- [Sflood API文档](../services/api/README.md)
- [Obsidian插件开发指南](https://docs.obsidian.md/)
