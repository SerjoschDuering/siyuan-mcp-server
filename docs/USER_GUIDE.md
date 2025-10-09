# SiYuan MCP Server - User Guide

**Version**: 2.0.0
**Last Updated**: 2025-01-04

## 👋 Welcome!

Imagine having an AI assistant that can read, write, and organize your SiYuan notes as naturally as you do. That's what this MCP server enables!

Instead of manually navigating through notebooks, creating documents, or searching for content, you can simply tell Claude (or any MCP-compatible AI):
- *"Show me everything I worked on this week"*
- *"Create a new project document with this architecture diagram"*
- *"Find all my open tasks and organize them by priority"*
- *"Add this meeting summary to today's daily note"*

The SiYuan MCP Server acts as a bridge between AI assistants and your SiYuan workspace, giving them **52 specialized tools (46 atomic + 6 composite)** to interact with your notes intelligently. Think of it as teaching Claude how to use SiYuan, so it can help you stay organized and productive.

**What makes it special?**
- **Smart Tools**: Instead of 20 API calls, one "smart" tool gets you a complete workspace overview
- **File Upload**: Upload images, PDFs, and documents directly through conversation
- **Task Tracking**: Automatically find and manage TODO items across all notebooks
- **Daily Notes**: Instantly access or create today's note without manual navigation
- **Context-Aware**: Search results come with surrounding content, so Claude understands the full picture

Whether you're a developer building workflows, a knowledge worker organizing research, or anyone who wants an AI assistant for their notes, this guide will get you up and running.

Let's get started! 🚀

---

## 1. Overview

### What is SiYuan MCP Server?

The SiYuan MCP Server is a Model Context Protocol server that enables AI assistants like Claude to directly interact with your SiYuan Note workspace. It provides 52 tools (46 atomic + 6 composite) for creating, reading, updating, and managing notes, documents, and files.

### What Can You Accomplish?

- **Workspace Navigation**: Get hierarchical overviews of notebooks and documents
- **Content Management**: Create, edit, and organize notes programmatically
- **File Operations**: Upload images, PDFs, and other assets
- **Smart Search**: Find content with contextual information
- **Task Management**: Track and manage TODO items across notebooks
- **Daily Note Automation**: Automatically access or create daily notes
- **Backup & Sync**: Export content and manage assets

---

## 2. Server Modes: STDIO vs. HTTP

SiYuan MCP Server v2.0 offers **two transport modes** to fit different use cases:

### 🖥️ STDIO Mode (Local Development)

**Best for**: Claude Desktop, single-user local usage

- **File**: `dist/server-stdio.js`
- **Transport**: Standard Input/Output (stdio)
- **Security**: Token stored in environment variable (`SIYUAN_TOKEN`)
- **Use case**: Personal local workflows, Claude Desktop integration

**Pros**: Simple setup, no network configuration needed
**Cons**: Single-user only, token in environment variable

### 🌐 HTTP Mode (Production & Multi-Client)

**Best for**: Remote access, multiple AI clients, production deployments

- **File**: `dist/server.js`
- **Transport**: Streamable HTTP
- **Security**: Token sent via HTTP header (`X-SiYuan-Token`) per request
- **Use case**: Remote access, multi-client scenarios, production servers

**Pros**: Stateless, secure (token per request), supports multiple clients
**Cons**: Requires network setup, HTTPS mandatory for production

### 🔐 Security Comparison

| Mode | Token Storage | Multi-Client | Production Ready |
|------|--------------|--------------|------------------|
| **STDIO** | Environment variable | ❌ Single-user | ⚠️ Local only |
| **HTTP** | Client header (per request) | ✅ Yes | ✅ Yes (with HTTPS) |

**💡 Recommendation**: Use STDIO for local Claude Desktop, HTTP for remote access or multi-user scenarios.

---

## 3. Quick Start & Configuration

### Prerequisites

1. **SiYuan Note** running locally (default: `http://localhost:6806`)
2. **Node.js 18+** installed
3. **Claude Desktop** or compatible MCP client

### Installation

```bash
# Clone or download the repository
cd siyuan-mcp-server

# Install dependencies
npm install

# Build the server
npm run build
```

### Configuration

#### Step 1: Get Your SiYuan API Token

1. Open SiYuan Note
2. Go to **Settings** → **About**
3. Copy your API Token

#### Step 2: Configure Claude Desktop

Edit your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**🔐 SECURITY MODEL:**
- Your SiYuan token is sent in the `X-SiYuan-Token` header with each request
- The MCP server does NOT store your token
- The server is stateless and acts as a pass-through proxy

Add the SiYuan server:

```json
{
  "mcpServers": {
    "siyuan": {
      "url": "http://localhost:3000/mcp",
      "transport": "streamable-http",
      "headers": {
        "X-SiYuan-Token": "your-token-here"
      },
      "env": {
        "SIYUAN_API_URL": "http://localhost:6806"
      }
    }
  }
}
```

**Note:** For local development, you can run the server with `npm run dev` (default port 3000). For production deployment, see the deployment documentation.

### Environment Variables

The MCP server can be configured using the following environment variables:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SIYUAN_API_URL` | SiYuan API endpoint URL | `http://127.0.0.1:6806` | No |
| `SIYUAN_TOKEN` | Your SiYuan API token (STDIO mode only) | - | For STDIO |
| `PORT` | HTTP server port | `3000` | No |

**Note:** In HTTP mode, the token and URL are sent via headers (`X-SiYuan-Token` and `X-SiYuan-URL`) with each request, not environment variables. See the configuration examples above.

#### Step 3: Verify Connection

1. Restart Claude Desktop
2. Start a new conversation
3. Ask: "List my SiYuan notebooks"
4. Claude should use `siyuan_listNotebooks` and show your notebooks

---

## 3. Core Workflows & Examples

### Workflow 1: Get Workspace Overview

**Use Case**: Understand your workspace structure without manual exploration

```javascript
// Single call returns complete hierarchy
siyuan_getContentTree({
  includeContent: true,
  maxDepth: 3,
  contentLength: 200
})
```

**What You Get**:
- All notebooks with status (open/closed)
- Document tree for each notebook
- Content previews (first 200 chars)
- Document metadata (size, dates)
- Statistics (total notebooks, documents)

**Token Savings**: 20-50 API calls → 1 call (95% reduction)

---

### Workflow 2: Create a Document with Image

**Use Case**: Create a new document and include an uploaded image

**Step 1: Upload the Image**

```javascript
siyuan_uploadAsset({
  files: [{
    filename: "architecture.png",
    data: "iVBORw0KGgoAAAANSUhEUgAAAA..." // base64 encoded
  }]
})

// Returns: "assets/architecture-20250104120000-abc123.png"
```

**Step 2: Create Document with Image**

```javascript
siyuan_createDocWithMd({
  notebook: "20210817205410-2kvfpfn",
  path: "/projects/system-design",
  markdown: `# System Architecture

![Architecture Diagram](assets/architecture-20250104120000-abc123.png)

Our system consists of three main components...
`
})
```

**Converting Files to Base64**:

**Node.js**:
```javascript
const fs = require('fs');
const imageBuffer = fs.readFileSync('image.png');
const base64Data = imageBuffer.toString('base64');
```

**Python**:
```python
import base64
with open("image.png", "rb") as file:
    base64_data = base64.b64encode(file.read()).decode('utf-8')
```

**Browser**:
```javascript
const file = event.target.files[0];
const reader = new FileReader();
reader.onloadend = () => {
  const base64 = reader.result.split(',')[1];
  // Use with siyuan_uploadAsset
};
reader.readAsDataURL(file);
```

---

### Workflow 3: Daily Note Automation

**Use Case**: Add tasks to today's daily note without manual navigation

```javascript
// Step 1: Get or create today's note (idempotent!)
const dailyNote = await siyuan_getOrCreateDailyNote({
  notebookId: "20210817205410-2kvfpfn"
})

// Response: { status: "exists", id: "20250104120000-abc", path: "/daily notes/2025/01/04" }

// Step 2: Add a task
siyuan_appendBlock({
  parentID: dailyNote.id,
  dataType: "markdown",
  data: "- [ ] Review PR #123"
})
```

**How It Works**:
1. Reads notebook's `dailyNoteSavePath` template
2. Renders template for today's date
3. Checks if document exists
4. If not, creates it using `dailyNoteTemplatePath`
5. Returns document ID (always works!)

**Token Savings**: 5 API calls → 1 call (80% reduction)

---

### Workflow 4: Task Management

**Use Case**: Find and manage TODO items across your workspace

**Find All Open Tasks**:

```javascript
siyuan_findTasks({
  status: "open",
  includeContext: true
})
```

**Response**:
```json
{
  "total": 12,
  "status": "open",
  "statistics": {
    "open": 12,
    "completed": 0,
    "byNotebook": {
      "Work Notes": 8,
      "Personal": 4
    }
  },
  "tasks": [
    {
      "id": "block-123",
      "text": "Review PR #123",
      "completed": false,
      "updated": "2025-01-04 14:30:00",
      "document": {
        "title": "Daily Note - Jan 04"
      },
      "notebook": {
        "name": "Work Notes"
      },
      "context": "## Sprint Tasks"
    }
  ]
}
```

**Filter Options**:
- By status: `"open"`, `"completed"`, `"all"`
- By notebook: `notebookId: "..."`
- By document: `documentId: "..."`
- By time: `daysBack: 7` (tasks updated in last 7 days)
- Context: `includeContext: true` (adds parent heading)

**Token Savings**: 15-20 API calls → 1 call (90% reduction)

---

### Workflow 5: Smart Search with Context

**Use Case**: Find content and understand where it appears

```javascript
siyuan_searchWithContext({
  query: "API integration",
  contextBlocks: 2,      // 2 blocks before/after
  maxResults: 10
})
```

**What You Get**:
- Matched content with highlighting
- Surrounding blocks for context
- Document and notebook information
- Preview with search terms highlighted

**Example Use**: "Find all mentions of 'machine learning' with context"

---

### Workflow 6: Document Analysis

**Use Case**: Understand a document's structure before editing

```javascript
siyuan_getDocumentOutline({
  documentId: "20240103092549-abc123",
  includeContent: true,
  maxDepth: 6,
  contentLength: 150
})
```

**Response Includes**:
- Hierarchical block outline
- Table of contents (heading tree)
- Statistics (total blocks, headings, paragraphs)
- Content previews (truncated)
- Block metadata

**Token Savings**: 5-10 API calls → 1 call (80% reduction)

---

### Workflow 7: Recent Activity Review

**Use Case**: Daily/weekly review of workspace changes

```javascript
siyuan_getRecentContent({
  days: 7,
  limit: 50,
  includeContent: true
})
```

**Response Includes**:
- Changes grouped by: today, yesterday, this week
- Most active notebooks
- Content previews
- Statistics (total changes, per-day breakdown)

**Token Savings**: 15-25 API calls → 1 call (85% reduction)

---

## 4. Using "Smart" Composite Tools

### Why Use Composite Tools?

**Problem**: Manual API calls are verbose and consume excessive tokens

**Example (Manual Approach)**:
```javascript
// Need 20+ API calls to understand workspace:
const notebooks = await siyuan_listNotebooks()
for (const nb of notebooks) {
  const docs = await siyuan_sql({ stmt: `SELECT * FROM blocks WHERE box='${nb.id}'` })
  for (const doc of docs) {
    const content = await siyuan_getBlock({ id: doc.id })
    // Build structure manually...
  }
}
// Result: 5000+ tokens, complex logic, slow
```

**Solution (Composite Tool)**:
```javascript
// Single call, optimized response:
const tree = await siyuan_getContentTree()
// Result: 1000 tokens, structured data, fast
```

### Available Smart Tools

| Tool | Purpose | Token Savings |
|------|---------|---------------|
| `siyuan_getContentTree` | Workspace hierarchy overview | 95% |
| `siyuan_getDocumentOutline` | Document structure analysis | 80% |
| `siyuan_searchWithContext` | Search with surrounding blocks | 90% |
| `siyuan_getRecentContent` | Recent activity tracking | 85% |
| `siyuan_getOrCreateDailyNote` | Daily note automation | 80% |
| `siyuan_findTasks` | Task management | 90% |

### Best Practices

1. **Start with Overview**: Always begin with `getContentTree` to understand workspace
2. **Use Appropriate Depth**: Don't request more depth than needed
   - Quick overview: `maxDepth: 1`
   - Detailed analysis: `maxDepth: 3`
3. **Filter by Time**: Use `getRecentContent` for time-based queries
4. **Context-Aware Search**: Use `searchWithContext` instead of basic SQL
5. **Idempotent Operations**: `getOrCreateDailyNote` is safe to call multiple times

---

## 5. Troubleshooting

### Tools Not Available

**Symptom**: Claude says "I don't have access to siyuan_* tools"

**Solution**:
1. Check `claude_desktop_config.json` is correct
2. Verify absolute path to `dist/server.js`
3. Restart Claude Desktop
4. Check Claude Desktop logs: **Help** → **View Logs**

---

### Authentication Errors

**Symptom**: "401 Unauthorized" or "Invalid token"

**Solution**:
1. Verify `SIYUAN_TOKEN` in config
2. Get fresh token from SiYuan: **Settings** → **About**
3. Ensure SiYuan is running on `http://localhost:6806`
4. Check `SIYUAN_API_URL` if using custom port

---

### File Upload Fails

**Symptom**: "Asset upload failed" or "Invalid base64 data"

**Solution**:
1. Verify base64 encoding is correct (no extra spaces/newlines)
2. Check file size < 100MB
3. Ensure no path traversal in filename (`../` not allowed)
4. Try uploading a small test file first

**Test with 1x1 pixel PNG**:
```javascript
siyuan_uploadAsset({
  files: [{
    filename: "test.png",
    data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
  }]
})
```

---

### Slow Performance

**Symptom**: Operations take several seconds

**Possible Causes**:
1. Using atomic tools instead of composite tools (too many API calls)
2. Large workspace with many documents
3. Network latency to SiYuan

**Solution**:
1. Use composite tools (`getContentTree`, etc.) for aggregated data
2. Reduce `maxDepth` and `contentLength` parameters
3. Use `limit` parameter to cap results
4. Filter by notebook/document to reduce scope

---

### Empty Results

**Symptom**: Tools return empty arrays or "no data"

**Solution**:
1. Verify notebook is **open** (closed notebooks excluded by default)
2. Check notebook/document IDs are correct (20-character format)
3. Use `siyuan_listNotebooks` to find correct IDs
4. For SQL queries, check database schema matches your SiYuan version

---

## 6. Advanced Tips

### Combining Tools for Workflows

**Example: Weekly Review Automation**
```javascript
// 1. Get this week's changes
const recent = await siyuan_getRecentContent({ days: 7 })

// 2. Find completed tasks
const completed = await siyuan_findTasks({
  status: "completed",
  daysBack: 7
})

// 3. Get or create weekly review note
const reviewNote = await siyuan_getOrCreateDailyNote({
  notebookId: "reviews-notebook-id"
})

// 4. Generate summary and append to review note
const summary = `
## Weekly Summary
- Total changes: ${recent.summary.totalChanges}
- Tasks completed: ${completed.total}
- Most active: ${recent.mostActiveNotebooks[0].notebook}
`

siyuan_appendBlock({
  parentID: reviewNote.id,
  dataType: "markdown",
  data: summary
})
```

### Working with SQL Queries

For advanced queries not covered by composite tools, use `siyuan_sql`:

```javascript
// Find all documents with "project" in title
siyuan_sql({
  stmt: `
    SELECT id, content, hpath
    FROM blocks
    WHERE type = 'd'
      AND content LIKE '%project%'
    ORDER BY updated DESC
    LIMIT 20
  `
})
```

**Note**: See `TOOL_REFERENCE.md` for complete SQL schema details.

---

## 7. Performance Guidelines

### Token Usage Comparison

| Operation | Manual Approach | Composite Tool | Savings |
|-----------|----------------|----------------|---------|
| Workspace overview | ~5000 tokens | ~1000 tokens | 80% |
| Document outline | ~3000 tokens | ~600 tokens | 80% |
| Task list | ~4000 tokens | ~800 tokens | 80% |
| Search with context | ~3500 tokens | ~700 tokens | 80% |

### Optimization Tips

1. **Use composite tools first** - They aggregate multiple operations
2. **Set reasonable limits** - Use `limit`, `maxDepth`, `contentLength`
3. **Filter early** - Specify `notebookId` or `documentId` when possible
4. **Batch operations** - Upload multiple files in one `uploadAsset` call
5. **Cache results** - Store workspace tree if querying repeatedly

---

## 8. Next Steps

- **For API details**: See `TOOL_REFERENCE.md` for complete tool documentation
- **For development**: See `DEVELOPER_GUIDE.md` to contribute or extend
- **For examples**: Check the workflows above and adapt to your needs

---

**Version**: 2.0.0 | **Tools**: 52 (46 atomic + 6 composite) | **Status**: Production Ready ✅
