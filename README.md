# SiYuan Note MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![MCP Version](https://img.shields.io/badge/MCP-2025--03--26-blue)](https://modelcontextprotocol.io/)

<!-- Smithery badge - update after publishing -->
<!-- [![smithery badge](https://smithery.ai/badge/@your-org/siyuan-mcp-server)](https://smithery.ai/server/@your-org/siyuan-mcp-server) -->

**Enable AI assistants to interact with your [SiYuan Note](https://github.com/siyuan-note/siyuan) workspace through the Model Context Protocol**

---

## ✨ What is this?

A production-ready MCP server that bridges AI assistants (Claude, custom clients) with SiYuan Note, enabling natural language control of your knowledge base.

**Version 2.0** features a clean atomic tools architecture with **49 specialized tools** (43 atomic + 6 composite), validated by Gemini AI.

```
You: "Find all my open tasks and create today's daily note"
AI:  Uses siyuan_findTasks + siyuan_getOrCreateDailyNote
     ✅ Found 12 tasks, created note at /daily notes/2025/01/09
```

---

## 🚀 Quick Start

### Prerequisites

- [SiYuan Note](https://github.com/siyuan-note/siyuan) running (local or remote)
- Node.js 18+ installed
- MCP-compatible client (Claude Desktop, Claude Code, n8n)

### Installation

```bash
git clone https://github.com/SerjoschDuering/siyuan-mcp-server.git
cd siyuan-mcp-server
npm install && npm run build
```

### Configuration

#### For Claude Desktop (Local)

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

#### For Claude Code / n8n (Remote)

Start HTTP server:
```bash
PORT=3000 npm run dev
```

Configure client:
```json
{
  "mcpServers": {
    "siyuan": {
      "url": "https://your-server.com/siyuan/mcp",
      "transport": "streamable-http",
      "headers": {
        "X-SiYuan-Token": "your-token-here",
        "X-SiYuan-URL": "http://localhost:6806"
      }
    }
  }
}
```

**📖 Complete setup guide:** [docs/CONFIGURATION.md](./docs/CONFIGURATION.md)

---

## 🎯 Key Features

### 49 Specialized Tools

**43 Atomic Tools** - Direct 1:1 mapping to SiYuan API:
- 📚 Notebook Management (8 tools)
- 📄 Document Operations (7 tools)
- 🧱 Block Control (11 tools)
- 📁 File Management (4 tools)
- 🔍 SQL Query (2 tools)
- 🏷️ Attributes (2 tools)
- 📤 Export (2 tools)
- 📋 Templates (2 tools)
- ⚙️ System (3 tools)
- 📎 Asset Upload (1 tool)

**6 Composite Tools** - Optimized multi-step operations:
- `siyuan_getContentTree` - Workspace hierarchy (95% token savings)
- `siyuan_getDocumentOutline` - Document structure (80% token savings)
- `siyuan_searchWithContext` - Search with surrounding context (90% token savings)
- `siyuan_getRecentContent` - Recent changes tracking (85% token savings)
- `siyuan_getOrCreateDailyNote` - Daily note automation (80% token savings)
- `siyuan_findTasks` - Task management (90% token savings)

**📖 Complete API reference:** [docs/TOOL_REFERENCE.md](./docs/TOOL_REFERENCE.md)

### Two Transport Modes

| Mode | Use Case | Clients |
|------|----------|---------|
| **STDIO** | Local development | Claude Desktop, Smithery |
| **HTTP** | Production, multi-client | Claude Code, n8n, custom clients |

### Security Model

**🔐 Stateless & Secure**
- Client sends token with each request (HTTP header)
- Server never stores credentials
- Multi-tenant ready (each user connects to their own SiYuan)
- HTTPS required for production

---

## 📚 Documentation

| Guide | Description |
|-------|-------------|
| [**CONFIGURATION.md**](./docs/CONFIGURATION.md) | Complete setup for all clients (Claude Desktop, Claude Code, n8n) |
| [**USER_GUIDE.md**](./docs/USER_GUIDE.md) | Workflows, examples, and best practices |
| [**DEPLOYMENT.md**](./docs/DEPLOYMENT.md) | Production deployment with Docker, Caddy/Nginx, PM2 |
| [**DEVELOPER_GUIDE.md**](./docs/DEVELOPER_GUIDE.md) | Architecture, contributing, development |
| [**TOOL_REFERENCE.md**](./docs/TOOL_REFERENCE.md) | Complete API documentation for all 49 tools |
| [**CLAUDE.md**](./CLAUDE.md) | Claude Code development conventions |

---

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Development mode (STDIO)
npm run dev

# Development mode (HTTP)
npm run dev:http
```

**📖 Contribution guide:** [docs/DEVELOPER_GUIDE.md](./docs/DEVELOPER_GUIDE.md)

---

## 🌐 Transport Modes Explained

### STDIO (Standard Input/Output)

**Simple Terms:** Like running a program directly on your computer.

**Best for:**
- Claude Desktop (local use)
- Single-user workflows
- No network setup needed

**Configuration:**
```json
{
  "command": "node",
  "args": ["/path/to/dist/server-stdio.js"],
  "env": {
    "SIYUAN_TOKEN": "your-token",
    "SIYUAN_API_URL": "http://localhost:6806"
  }
}
```

### HTTP Streamable

**Simple Terms:** Like running a web server that multiple clients can connect to.

**Best for:**
- Claude Code (remote access)
- n8n workflows
- Production deployments
- Multiple users

**Configuration:**
```json
{
  "url": "https://your-server.com/siyuan/mcp",
  "transport": "streamable-http",
  "headers": {
    "X-SiYuan-Token": "your-token"
  }
}
```

**📖 Detailed comparison:** [docs/CONFIGURATION.md#transport-modes](./docs/CONFIGURATION.md)

---

## 🔐 Security Model

### HTTP Transport (Production)

```
Client (PRIVATE)              MCP Server (PUBLIC)           SiYuan API (PRIVATE)
─────────────────            ─────────────────────          ─────────────────────
Stores: Token          ──>   Receives: X-SiYuan-Token  ──>  Uses: Client Token
                             Stores: NOTHING
```

**Why This Matters:**
- MCP server URL is public (accessible via HTTPS)
- Token sent with EVERY request
- Server is stateless (no secrets stored)
- **HTTPS mandatory** to encrypt headers

### STDIO Transport (Local)

```
Client (LOCAL)                MCP Server (LOCAL)            SiYuan API (LOCAL)
─────────────────            ─────────────────────          ─────────────────────
Env: SIYUAN_TOKEN      ──>   Reads: env.SIYUAN_TOKEN   ──>  Uses: Env Token
```

**Use case:** Local development only

---

## 📊 Tool Annotations

All tools include MCP hints to help AI understand behavior:

- `readOnlyHint: true` - Safe, no side effects (19 tools)
- `destructiveHint: true` - Deletes or modifies data (6 tools)
- `idempotentHint: true` - Same result on repeated calls (8 tools)

---

## 🚦 Project Status

| Aspect | Status |
|--------|--------|
| **Version** | 2.0.0 |
| **Status** | ✅ Production Ready |
| **Tools** | 49 (43 atomic + 6 composite) |
| **Branch** | `v2-clean-atomic-tools` |
| **MCP Protocol** | 2025-03-26 |
| **Node.js** | ≥18.0.0 |

---

## 🤝 Related Projects

- [SiYuan Note](https://github.com/siyuan-note/siyuan) - Official SiYuan project
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP specification
- [Claude Code](https://claude.com/claude-code) - AI coding assistant
- [Claude Desktop](https://claude.ai/desktop) - Desktop AI assistant

---

## 📝 License

MIT License - see [LICENSE](./LICENSE) file for details

---

## 🙏 Acknowledgments

- SiYuan Note team for the excellent API
- Anthropic for the Model Context Protocol
- Community contributors and testers

---

**Ready to get started?** → [Configuration Guide](./docs/CONFIGURATION.md)

**Need help?** → [Open an issue](https://github.com/SerjoschDuering/siyuan-mcp-server/issues)
