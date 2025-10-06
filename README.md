# SiYuan Note MCP Server v2.0

<!-- Smithery badge - update after publishing your fork -->
<!-- [![smithery badge](https://smithery.ai/badge/@your-org/siyuan-mcp-server)](https://smithery.ai/server/@your-org/siyuan-mcp-server) -->

一个 MCP 服务器实现，提供与思源笔记系统的集成，使 AI 模型能够访问和操作笔记数据。v2.0 采用原子工具架构，提供 52 个 MCP 工具（46 个原子工具 + 6 个复合工具），经过 Gemini AI 验证。

An MCP server implementation that provides integration with the SiYuan Note system, enabling AI models to access and manipulate note data. v2.0 features atomic tools architecture with 52 MCP tools (46 atomic + 6 composite), validated by Gemini AI.

## 功能特性 | Features

### v2.0 新特性 | What's New in v2.0

* ✅ **原子工具架构** | Atomic Tools Architecture - 52 个 MCP 工具 (46 原子 + 6 复合) | 52 MCP tools (46 atomic + 6 composite)


### 核心功能 | Core Features

**46 个原子工具 (Atomic Tools) - 1:1 映射到 SiYuan API:**
* 笔记本管理 (8 tools) | Notebook Management
* 文档操作 (11 tools) | Document Operations
* 内容块控制 (11 tools) | Block Control
* 文件管理 (4 tools) | File Management
* SQL 查询 (2 tools) | SQL Query
* 属性管理 (2 tools) | Attribute Management
* 导出功能 (2 tools) | Export Functions
* 模板渲染 (2 tools) | Template Rendering
* 系统功能 (3 tools) | System Functions
* 资产上传 (1 tool) | Asset Upload

**6 个复合工具 (Composite Tools) - 优化的多步操作:**
* 内容树查询 | Content Tree Query
* 文档大纲 | Document Outline
* 上下文搜索 | Context Search
* 最近内容 | Recent Content
* 每日笔记 | Daily Note (创建或获取 | Get or Create)
* 任务查找 | Task Finder

📖 完整工具参考 | Full tool reference: [TOOL_REFERENCE.md](./docs/TOOL_REFERENCE.md)

## 快速开始 | Quick Start

### 方法 1: 本地构建 | Method 1: Local Build (Recommended)

```bash
git clone https://github.com/SerjoschDuering/siyuan-mcp-server.git
cd siyuan-mcp-server
npm install && npm run build
```

然后添加到 Claude Desktop 配置 | Then add to Claude Desktop config (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "siyuan": {
      "command": "node",
      "args": ["/absolute/path/to/siyuan-mcp-server/dist/server-stdio.js"],
      "env": {
        "SIYUAN_TOKEN": "your-token-from-siyuan-settings",
        "SIYUAN_API_URL": "http://127.0.0.1:6806"
      }
    }
  }
}
```

### 方法 2: Smithery 安装 | Method 2: Via Smithery

**🚧 即将推出 | Coming Soon**

计划发布到 Smithery 注册表 | Publishing to Smithery registry soon:
```bash
# 待发布后 | Once published:
smithery install @your-npm-org/siyuan-mcp-server
```

如需立即使用，请使用方法 1 或 3 | For immediate use, use Method 1 or 3.

### 方法 3: HTTP 服务器部署 | Method 3: HTTP Server (Production)

适用于远程访问或多客户端场景 | For remote access or multi-client scenarios:

```bash
git clone https://github.com/SerjoschDuering/siyuan-mcp-server.git
cd siyuan-mcp-server
npm install && npm run build
PORT=3000 npm run dev  # HTTP server on port 3000
```

客户端配置 | Client configuration:
```json
{
  "mcpServers": {
    "siyuan": {
      "url": "https://your-server.com/siyuan",
      "transport": "streamable-http",
      "headers": {
        "X-SiYuan-Token": "your-token-here"
      }
    }
  }
}
```

📖 详细配置说明 | Detailed setup guide: [USER_GUIDE.md](./docs/USER_GUIDE.md) | [CLAUDE.md](./CLAUDE.md)

---

## 🧩 优化上下文窗口 | Optimizing Context Windows

### 单一智能体 vs 多智能体 | Single vs Multi-Agent

**推荐使用单一智能体配置 | Recommended: Single Agent Setup**

虽然 52 个工具看似很多，但实际上：
- 大多数对话只用到 5-10 个工具
- 复合工具（如 `getContentTree`, `findTasks`）已经优化了上下文使用
- MCP 客户端只在需要时加载工具定义，不占用持续上下文

While 52 tools seems like a lot, in practice:
- Most conversations only use 5-10 tools
- Composite tools (like `getContentTree`, `findTasks`) already optimize context usage
- MCP clients only load tool definitions when needed, not in persistent context

### 何时考虑多智能体 | When to Consider Multi-Agent

仅在以下场景下才考虑分离智能体 | Only separate agents for these specific scenarios:

**场景 1: 专用的批量操作智能体 | Scenario 1: Dedicated Batch Operations Agent**
```json
{
  "mcpServers": {
    "siyuan-batch": {
      "command": "node",
      "args": ["/path/to/dist/server-stdio.js"],
      "env": { "SIYUAN_TOKEN": "..." }
    }
  }
}
```
**用途 | Use for:**
- 批量导出笔记本 | Bulk notebook exports
- 大规模文档重组 | Large-scale document reorganization
- 数据迁移任务 | Data migration tasks

**场景 2: 只读查询智能体（节省成本）| Scenario 2: Read-Only Query Agent (Cost Saving)**
```json
{
  "mcpServers": {
    "siyuan-readonly": {
      "command": "node",
      "args": ["/path/to/dist/server-stdio.js"],
      "env": { "SIYUAN_TOKEN": "readonly-token" }
    }
  }
}
```
**用途 | Use for:**
- 搜索和检索（无修改权限）| Search and retrieval (no modification rights)
- 防止意外更改 | Prevent accidental modifications
- 使用限制权限的令牌 | Use restricted-permission token

### 💡 智能优化建议 | Smart Optimization Tips

**优先使用复合工具 | Prefer Composite Tools:**
- ✅ `getContentTree` - 一次调用获取完整层级结构 | Get full hierarchy in one call
- ✅ `findTasks` - 自动聚合所有待办事项 | Auto-aggregates all TODOs
- ✅ `searchWithContext` - 返回带上下文的结果 | Returns results with context
- ❌ 避免手动调用多个原子工具拼接结果 | Avoid manually chaining atomic tools

**让智能体自己选择工具 | Let Agent Choose Tools:**
大多数情况下，单一配置已足够，AI 会根据任务智能选择合适的工具子集。

In most cases, a single configuration is sufficient - AI will intelligently select the appropriate tool subset for each task.

📖 高级工作流示例 | Advanced workflow examples: [USER_GUIDE.md](./docs/USER_GUIDE.md#workflows)

---

## 🔌 理解传输模式 | Understanding Transport Modes

SiYuan MCP 服务器提供两种"传输方式"——可以把它想象成不同的通信渠道：

The SiYuan MCP Server offers two "transport modes" - think of them as different communication channels:

### 📡 STDIO (标准输入输出 | Standard Input/Output)

**用简单的话说 | In Simple Terms:**
- 就像直接在你的电脑上运行一个程序
- AI 客户端启动这个程序，直接与它对话
- 程序结束时，连接也结束了
- Like running a program directly on your computer
- The AI client starts the program and talks to it directly
- When the program ends, the connection ends

**适用于 | Best For:**
- ✅ **Claude Desktop** (本地使用 | local use)
- ✅ **Smithery.ai** (本地安装 | local installation)
- ✅ 单用户个人工作流 | Single-user personal workflows
- ✅ 不需要网络配置 | No network setup needed

**限制 | Limitations:**
- ⚠️ 一次只能一个客户端 | Only one client at a time
- ⚠️ 需要本地安装 | Requires local installation
- ⚠️ 令牌存储在环境变量中 | Token stored in environment variables

**配置示例 | Example (Claude Desktop):**
```json
{
  "mcpServers": {
    "siyuan": {
      "command": "node",
      "args": ["/path/to/dist/server-stdio.js"],
      "env": {
        "SIYUAN_TOKEN": "your-token",
        "SIYUAN_API_URL": "http://127.0.0.1:6806"
      }
    }
  }
}
```

### 🌐 HTTP Streamable (HTTP 流式传输)

**用简单的话说 | In Simple Terms:**
- 就像运行一个网站服务器
- 客户端通过网络连接到它（可以是本地或远程）
- 多个客户端可以同时连接
- Like running a web server
- Clients connect to it over the network (local or remote)
- Multiple clients can connect at the same time

**适用于 | Best For:**
- ✅ **n8n** (工作流自动化 | workflow automation)
- ✅ **远程访问** | Remote access
- ✅ 多个 AI 客户端同时使用 | Multiple AI clients simultaneously
- ✅ 生产环境部署 | Production deployments

**优势 | Advantages:**
- ✅ 多客户端支持 | Multi-client support
- ✅ 更安全（令牌每次请求发送）| More secure (token sent per request)
- ✅ 可以远程访问 | Can be accessed remotely
- ✅ 无状态设计 | Stateless design

**配置示例 | Example (n8n or Remote Access):**

**启动服务器 | Start Server:**
```bash
PORT=3000 npm run dev  # Runs server.ts
```

**客户端配置 | Client Configuration:**
```json
{
  "mcpServers": {
    "siyuan": {
      "url": "http://localhost:3000",  # 或远程 URL | or remote URL
      "transport": "streamable-http",
      "headers": {
        "X-SiYuan-Token": "your-token"
      }
    }
  }
}
```

### 🤔 我该选哪个？| Which Should I Use?

**选择 STDIO，如果你... | Choose STDIO if you...**
- 只在自己电脑上使用 Claude Desktop | Only use Claude Desktop on your own computer
- 通过 Smithery 安装 | Install via Smithery
- 想要最简单的设置 | Want the simplest setup
- 只有你一个人用 | Only you will use it

**选择 HTTP Streamable，如果你... | Choose HTTP Streamable if you...**
- 使用 n8n 工作流 | Use n8n workflows
- 需要远程访问（比如在服务器上运行）| Need remote access (e.g., running on a server)
- 有多个客户端/用户 | Have multiple clients/users
- 在生产环境部署 | Deploying in production

### 📊 快速对比 | Quick Comparison

| 特性 | Feature | STDIO | HTTP Streamable |
|------|---------|-------|-----------------|
| 设置难度 | Setup | 简单 Easy | 中等 Medium |
| 多客户端 | Multi-client | ❌ | ✅ |
| 远程访问 | Remote access | ❌ | ✅ |
| 令牌安全 | Token security | 环境变量 Env var | 请求头 Header |
| 适用场景 | Use cases | 本地个人 Local | n8n/生产 Production |
| 文件 | File | `server-stdio.js` | `server.ts` |

---

## 工具列表 | Tool List

v2.0 提供 52 个工具（46 个原子工具 + 6 个复合工具）。所有工具名称遵循 `siyuan_<action><Noun>` 命名规范。

v2.0 provides 52 tools (46 atomic + 6 composite). All tool names follow the `siyuan_<action><Noun>` naming convention.

### 笔记本管理 | Notebook Management (8 tools)

* `siyuan_listNotebooks` - 列出所有笔记本 | List all notebooks
* `siyuan_openNotebook` - 打开笔记本 | Open notebook
* `siyuan_closeNotebook` - 关闭笔记本 | Close notebook
* `siyuan_renameNotebook` - 重命名笔记本 | Rename notebook
* `siyuan_createNotebook` - 创建笔记本 | Create notebook
* `siyuan_removeNotebook` - 删除笔记本 | Remove notebook (destructive)
* `siyuan_getNotebookConf` - 获取笔记本配置 | Get notebook configuration
* `siyuan_setNotebookConf` - 设置笔记本配置 | Set notebook configuration (destructive)

### 文档操作 | Document Operations (11 tools)

* `siyuan_createDocWithMd` - 使用 Markdown 创建文档 | Create document with Markdown
* `siyuan_renameDoc` - 通过路径重命名文档 | Rename document by path
* `siyuan_renameDocByID` - 通过 ID 重命名文档（推荐）| Rename document by ID (preferred)
* `siyuan_removeDoc` - 通过路径删除文档 | Remove document by path (destructive)
* `siyuan_removeDocByID` - 通过 ID 删除文档（推荐）| Remove document by ID (destructive, preferred)
* `siyuan_moveDocs` - 通过路径移动文档 | Move documents by paths
* `siyuan_moveDocsByID` - 通过 ID 移动文档（推荐）| Move documents by IDs (preferred)
* `siyuan_getHPathByPath` - 从存储路径获取可读路径 | Get human-readable path from storage path
* `siyuan_getHPathByID` - 从 ID 获取可读路径 | Get human-readable path from ID
* `siyuan_getPathByID` - 从 ID 获取存储路径 | Get storage path from ID
* `siyuan_getIDsByHPath` - 从可读路径获取 ID | Get IDs from human-readable path

### 内容块操作 | Block Operations (11 tools)

* `siyuan_insertBlock` - 插入内容块（带定位锚点）| Insert block with positioning anchors
* `siyuan_prependBlock` - 在首位插入子块 | Prepend block as first child
* `siyuan_appendBlock` - 在末位插入子块 | Append block as last child
* `siyuan_updateBlock` - 更新内容块 | Update block content
* `siyuan_deleteBlock` - 删除内容块 | Delete block (destructive)
* `siyuan_moveBlock` - 移动内容块 | Move block to new position
* `siyuan_foldBlock` - 折叠块 | Fold block in UI
* `siyuan_unfoldBlock` - 展开块 | Unfold block in UI
* `siyuan_getBlockKramdown` - 获取块的 kramdown 内容 | Get block kramdown content
* `siyuan_getChildBlocks` - 获取子块 | Get child blocks
* `siyuan_transferBlockRef` - 转移块引用 | Transfer block references

### 文件操作 | File Operations (4 tools)

* `siyuan_getFile` - 获取工作空间文件内容 | Get file content from workspace
* `siyuan_removeFile` - 删除文件/目录 | Remove file/directory (destructive)
* `siyuan_renameFile` - 重命名/移动文件 | Rename/move file
* `siyuan_readDir` - 列出目录内容 | List directory contents

### 属性管理 | Attribute Management (2 tools)

* `siyuan_getBlockAttrs` - 获取块属性 | Get block attributes
* `siyuan_setBlockAttrs` - 设置块属性 | Set block attributes

### 搜索与 SQL | Search & SQL (2 tools)

* `siyuan_sql` - 执行 SQL 查询 | Execute SQL query on database
* `siyuan_flushTransaction` - 刷新数据库事务 | Flush database transaction

### 导出功能 | Export Functions (2 tools)

* `siyuan_exportMarkdown` - 导出文档为 Markdown | Export document as Markdown
* `siyuan_exportResources` - 导出文件/文件夹为 zip | Export files/folders as zip

### 模板功能 | Template Functions (2 tools)

* `siyuan_renderTemplate` - 渲染模板文件 | Render template file
* `siyuan_renderSprig` - 渲染 Sprig 模板字符串 | Render Sprig template string

### 系统功能 | System Functions (3 tools)

* `siyuan_bootProgress` - 获取 SiYuan 启动进度 | Get SiYuan boot progress
* `siyuan_version` - 获取 SiYuan 版本 | Get SiYuan version
* `siyuan_currentTime` - 获取系统 Unix 时间戳 | Get system Unix timestamp

### 工具注释说明 | Tool Annotations

v2.0 工具包含以下 MCP 注释，帮助 AI 模型理解工具行为：

v2.0 tools include the following MCP annotations to help AI models understand tool behavior:

* `readOnlyHint: true` - 只读操作，安全无副作用 | Read-only operations, safe with no side effects (19 tools)
* `destructiveHint: true` - 破坏性操作，会删除或修改数据 | Destructive operations that delete or modify data (6 tools)
* `idempotentHint: true` - 幂等操作，重复调用结果相同 | Idempotent operations with same result on repeated calls (8 tools)

## 🔐 安全模型 | Security Model

### v2.0 重要安全变更 | v2.0 Critical Security Changes

**⚠️ v2.0 引入了新的安全架构以保护您的 SiYuan 令牌！**

**⚠️ v2.0 introduces a new security architecture to protect your SiYuan token!**

### 传输方式比较 | Transport Comparison

#### Streamable HTTP（生产环境推荐 | Recommended for Production）

**安全模型 | Security Model:**
```
客户端 (私密) Client (PRIVATE)       MCP 服务器 (公开) MCP Server (PUBLIC)    SiYuan API (私密) SiYuan API (PRIVATE)
─────────────────────              ────────────────────────────           ─────────────────────────
存储令牌 Stores Token       ──>    接收头部令牌 Receives Token        ──>    使用客户端令牌 Uses Client Token
                                   不存储 NOTHING STORED
```

**配置示例 | Configuration Example:**
```json
{
  "mcpServers": {
    "siyuan": {
      "url": "https://mcp.yourdomain.com/siyuan",
      "transport": "streamable-http",
      "headers": {
        "X-SiYuan-Token": "YOUR_PRIVATE_TOKEN"
      }
    }
  }
}
```

**优势 | Advantages:**
- ✅ 令牌由客户端发送（每次请求） | Token sent by client (per request)
- ✅ 服务器无状态（不存储密钥） | Server stateless (no secrets stored)
- ✅ 支持多客户端（会话隔离） | Multi-client support (session isolation)
- ✅ 生产环境安全 | Production-safe
- ⚠️ **必须使用 HTTPS** | **HTTPS required** (否则令牌可被拦截 | otherwise token can be intercepted)

#### STDIO（仅限本地开发 | Local Development Only）

**安全模型 | Security Model:**
```
客户端 (本地) Client (LOCAL)        MCP 服务器 (本地) MCP Server (LOCAL)     SiYuan API (本地) SiYuan API (LOCAL)
─────────────────────              ────────────────────────────           ─────────────────────────
传递环境变量令牌                     从环境变量读取令牌                        使用环境变量令牌
Passes env var token          ──>  Reads token from env var          ──>  Uses env var token
```

**配置示例 | Configuration Example:**
```json
{
  "mcpServers": {
    "siyuan": {
      "command": "node",
      "args": ["/path/to/dist/server-stdio.js"],
      "env": {
        "SIYUAN_TOKEN": "your-token-here",
        "SIYUAN_API_URL": "http://localhost:6806"
      }
    }
  }
}
```

## 相关资源 | Related Resources

### 官方文档 | Official Documentation
- [思源笔记 | SiYuan Note](https://github.com/siyuan-note/siyuan)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [思源笔记 API 文档 | SiYuan Note API Documentation](https://github.com/siyuan-note/siyuan/blob/master/API.md)

### 项目文档 | Project Documentation
- [USER_GUIDE.md](docs/USER_GUIDE.md) - 用户指南 | User guide (installation, configuration, workflows)
- [DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) - 开发者指南 | Developer guide (architecture, contribution)
- [TOOL_REFERENCE.md](docs/TOOL_REFERENCE.md) - 工具参考 | Tool reference (complete API documentation)
- [CLAUDE.md](CLAUDE.md) - Claude Desktop 配置 | Claude Desktop configuration
- [MCP_DEPLOYMENT_STRATEGY.md](MCP_DEPLOYMENT_STRATEGY.md) - 生产部署指南 | Production deployment guide