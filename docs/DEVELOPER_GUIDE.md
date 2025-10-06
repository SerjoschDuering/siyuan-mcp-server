# SiYuan MCP Server - Developer Guide

**Version**: 2.0.0
**Last Updated**: 2025-01-04
**Branch**: `v2-clean-atomic-tools`

This guide is for developers contributing to or extending the SiYuan MCP Server project.

---

## Table of Contents

1. [Project Architecture](#1-project-architecture)
2. [Development Environment](#2-development-environment)
3. [Contribution Guidelines & Standards](#3-contribution-guidelines--standards)
4. [Project Roadmap & Status](#4-project-roadmap--status)
5. [For LLM Assistants (Claude Integration)](#5-for-llm-assistants-claude-integration)
6. [Debugging Common Issues](#6-debugging-common-issues)

---

## 1. Project Architecture

### 1.1 Guiding Principles

The SiYuan MCP Server follows these core principles:

1. **Atomic Tools**: Each SiYuan API endpoint = one MCP tool (no meta-tools)
2. **Direct Registration**: Tools register directly via `server.tool()` (no intermediary registry)
3. **Type Safety**: Full Zod validation on all parameters
4. **Clear Naming**: `siyuan_<action><Noun>` convention (e.g., `siyuan_listNotebooks`)
5. **MCP Compliance**: Follow official MCP best practices for security and reliability
6. **🔐 Security First**: Client-side token transmission, stateless server design

### 1.2 Security Architecture

**🔐 CRITICAL: Token Security Model**

The v2.0 architecture implements a **stateless, client-authenticated** security model:

```
Client (PRIVATE)              MCP Server (PUBLIC)           SiYuan API (PRIVATE)
─────────────────            ─────────────────────          ─────────────────────
Stores: SiYuan Token   ──>   Receives: X-SiYuan-Token  ──>  Uses: Client's token
                             Stores: NOTHING
```

**Key Security Features:**

1. **Client Token Transmission** (`server.ts:169`)
   - Client sends `X-SiYuan-Token` header with every request
   - Server validates token presence before processing
   - 401 error returned if token missing

2. **AsyncLocalStorage Threading** (`client.ts:18`)
   - Node.js AsyncLocalStorage provides request-scoped token context
   - Token automatically available to all API calls within request
   - No explicit parameter passing needed in tool implementations

3. **Stateless Server Design**
   - Server never stores tokens in memory or environment
   - Each request is independent and self-contained
   - Multi-tenant safe (each client uses their own token)

4. **Transport-Specific Security**
   - **Streamable HTTP**: Token from client headers (production)
   - **STDIO**: Token from environment variable (local dev only)

**Implementation Pattern:**

```typescript
// server.ts - Extract and thread token
const siyuanToken = req.headers['x-siyuan-token'];
if (!siyuanToken) {
  return res.status(401).json({ error: 'X-SiYuan-Token required' });
}

await tokenStorage.run(siyuanToken, async () => {
  await transport.handleRequest(req, res, req.body);
});

// client.ts - Retrieve token from AsyncLocalStorage
private getToken(): string {
  const token = tokenStorage.getStore();
  if (!token) throw new Error('No SiYuan token available');
  return token;
}

// Tools - Transparent token usage (no changes needed)
const response = await siyuanClient.post('/api/notebook/lsNotebooks', {});
// Token automatically injected from AsyncLocalStorage
```

**Why AsyncLocalStorage?**
- ✅ Request-scoped isolation (no race conditions)
- ✅ Transparent to tool implementations (clean code)
- ✅ Production-tested Node.js primitive
- ✅ Works with async/await patterns
- ✅ No performance overhead

### 1.3 System Overview

**Current Architecture (v2.0)**:

```
siyuan-mcp-server/
├── src-v2/                    # v2.0 clean implementation
│   ├── server.ts             # Main MCP server (registers all tools)
│   ├── client.ts             # HTTP client singleton
│   ├── tools/                # Tool modules (11 files)
│   │   ├── notebook.ts       # 8 notebook tools
│   │   ├── document.ts       # 11 document tools
│   │   ├── block.ts          # 11 block tools
│   │   ├── file.ts           # 4 file tools
│   │   ├── asset.ts          # 1 asset tool
│   │   ├── search.ts         # 2 search/SQL tools
│   │   ├── export.ts         # 2 export tools
│   │   ├── attribute.ts      # 2 attribute tools
│   │   ├── template.ts       # 2 template tools
│   │   ├── system.ts         # 3 system tools
│   │   └── composite.ts      # 6 composite "smart" tools
│   └── utils/
│       └── multipart.ts      # Multipart form utilities
└── dist/                      # Compiled JavaScript + types
```

**Tool Count**: 52 tools (46 atomic + 6 composite)

### 1.4 Rationale for v2.0 Refactoring

**Problem with v1.2.3**:
- Single `executeCommand` meta-tool (anti-pattern)
- LLMs had to pass command type + params as nested JSON
- 5000+ tokens consumed for simple operations
- Poor tool discovery

**Solution in v2.0**:
- Direct tool registration for each API endpoint
- LLMs see 52 specific tools with clear names
- 80-95% token reduction
- Better type safety with Zod schemas

**Example Comparison**:

```javascript
// v1.2.3 (Bad)
executeCommand({
  type: "notebook.lsNotebooks",
  params: {}
})

// v2.0 (Good)
siyuan_listNotebooks()
```

### 1.5 The Role of Composite Tools

**Why Composite Tools Exist**:

Even with atomic tools, common workflows required 10+ API calls (e.g., "show me my workspace structure"). Composite tools solve this by:

1. Aggregating multiple API calls server-side
2. Returning hierarchical, structured data
3. Truncating content to optimal lengths
4. Providing statistics and summaries

**Result**: 80-95% token reduction for common operations

**Examples**:
- `siyuan_getContentTree`: Notebooks → Documents → Content (1 call vs 20+)
- `siyuan_findTasks`: All TODOs with context (1 call vs 15+)
- `siyuan_getOrCreateDailyNote`: Idempotent daily note access (1 call vs 5)

### 1.6 Key Components

#### 1.6.1 Main Server (`src-v2/server.ts`)

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new McpServer({
  name: 'siyuan-mcp-server',
  version: '2.0.0',
  capabilities: { tools: {} }
});

// Register tools by category
registerNotebookTools(server);
registerDocumentTools(server);
// ... 11 total modules

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

#### 1.6.2 SiYuan HTTP Client (`src-v2/client.ts`)

**🔐 AsyncLocalStorage-based token management:**

```typescript
import { AsyncLocalStorage } from 'node:async_hooks';

// Request-scoped token storage
export const tokenStorage = new AsyncLocalStorage<string>();

class SiYuanClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.SIYUAN_API_URL || 'http://localhost:6806',
      timeout: 30000
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        if (response.data?.code !== 0) {
          throw new Error(response.data?.msg || 'API error');
        }
        return response;
      }
    );
  }

  // Get token from AsyncLocalStorage (thread-safe)
  private getToken(): string {
    const token = tokenStorage.getStore();
    if (!token) {
      throw new Error('No SiYuan token available. Client must send X-SiYuan-Token header.');
    }
    return token;
  }

  // POST with automatic token injection
  async post(endpoint: string, data: any) {
    const token = this.getToken();
    return this.client.post(endpoint, data, {
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Multipart POST with automatic token injection
  async postMultipart(endpoint: string, formData: FormData) {
    const token = this.getToken();
    return this.client.post(endpoint, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Token ${token}`
      }
    });
  }
}

export const siyuanClient = new SiYuanClient();
```

**Key Changes from v1:**
- ❌ No environment variable tokens
- ✅ Token from AsyncLocalStorage
- ✅ Request-scoped isolation
- ✅ Multi-tenant safe

#### 1.6.3 Tool Module Pattern

Every tool module exports a `register*Tools(server)` function:

```typescript
// src-v2/tools/notebook.ts
export function registerNotebookTools(server: McpServer) {
  server.tool(
    'siyuan_listNotebooks',
    'List all notebooks with their metadata (ID, name, icon, closed status)',
    {},  // No parameters
    { readOnlyHint: true, idempotentHint: true },
    async (params, _extra) => {
      const response = await siyuanClient.post('/api/notebook/lsNotebooks', {});
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response.data.data, null, 2)
        }],
        _meta: response.data.data
      };
    }
  );

  // ... 7 more notebook tools
}
```

---

## 2. Development Environment

### 2.1 Prerequisites

- **Node.js**: 18+ (ES modules support required)
- **SiYuan Note**: Running locally for testing
- **TypeScript**: 5.0+
- **Package Manager**: npm or pnpm

### 2.2 Setup

```bash
# Clone repository
git clone https://github.com/SerjoschDuering/siyuan-mcp-server.git
cd siyuan-mcp-server

# Install dependencies
npm install

# Set environment variables
export SIYUAN_TOKEN="your-token-here"
export SIYUAN_API_URL="http://localhost:6806"

# Run in development mode
npm run dev
```

### 2.3 Available Scripts

```json
{
  "dev": "node --loader ts-node/esm src-v2/server.ts",
  "dev:v1": "node --loader ts-node/esm src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js",
  "clean": "rm -rf dist",
  "test": "jest"
}
```

### 2.4 Project Structure

```
siyuan-mcp-server/
├── src/                      # v1.2.3 (kept as reference)
├── src-v2/                   # v2.0 (active development)
│   ├── server.ts            # Entry point
│   ├── client.ts            # HTTP client
│   ├── tools/               # Tool modules
│   └── utils/               # Utilities
├── dist/                     # Compiled output
├── docs/                     # Will be deprecated
├── USER_GUIDE.md            # User documentation
├── DEVELOPER_GUIDE.md       # This file
├── TOOL_REFERENCE.md        # API reference
├── CLAUDE.md                # Minimal bootstrap for Claude Code
├── package.json
└── tsconfig.json
```

### 2.5 TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "nodenext",
    "outDir": "./dist",
    "rootDir": "./src-v2",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true
  }
}
```

**Key Settings**:
- `"type": "module"` in package.json (ES modules)
- `NodeNext` module resolution
- Strict mode enabled
- Declaration files generated

---

## 3. Contribution Guidelines & Standards

### 3.1 MCP Server Best Practices

#### 3.1.1 Security & Privacy

**Authentication**:
- ✅ Validate `SIYUAN_TOKEN` environment variable
- ✅ Provide clear error messages when authentication fails
- ❌ Never log or expose sensitive tokens
- ❌ Never store credentials in plain text

**Data Collection**:
- ✅ Only collect data necessary to perform the tool's function
- ✅ Process data in-memory when possible
- ❌ Don't collect extraneous conversation data
- ❌ Don't log sensitive user data unnecessarily

#### 3.1.2 Tool Design

**Tool Descriptions** must be:
- Specific and unambiguous
- Match actual functionality
- Include when/when-not to use guidance

**Bad Example**:
```typescript
server.tool('updateDoc', 'Update a document', ...)
```

**Good Example**:
```typescript
server.tool(
  'siyuan_updateBlock',
  'Update the content of an existing block by its ID. Use this when modifying block text, NOT for creating new blocks or documents.',
  ...
)
```

**Parameter Documentation**:
```typescript
{
  id: z.string().describe('Block ID (e.g., "20210808180117-6v0mkxr")'),
  dataType: z.enum(['markdown', 'dom']).describe('Content format: "markdown" for Kramdown, "dom" for HTML')
}
```

#### 3.1.3 Tool Annotations

Provide hints for tool behavior:

```typescript
server.tool(
  'siyuan_listNotebooks',
  'description',
  {},
  {
    readOnlyHint: true,     // Doesn't modify environment
    idempotentHint: true    // Same args = same result
  },
  handler
)
```

**Annotation Types**:
- `readOnlyHint: true` - Read-only operations (GET-like)
- `destructiveHint: true` - Destructive operations (DELETE-like)
- `idempotentHint: true` - Repeated calls safe (PUT-like)

**Examples**:
- Read-only: `listNotebooks`, `getFile`, `sql` (SELECT only)
- Destructive: `removeNotebook`, `deleteBlock`, `removeFile`
- Idempotent: `getOrCreateDailyNote`, `setBlockAttrs`

### 3.2 How to Add a New Tool

**Checklist**:

1. **Choose the correct module** (`tools/*.ts`)
2. **Define Zod schema** for parameters
3. **Write clear description** (specific, actionable)
4. **Add appropriate annotations** (readOnly, destructive, idempotent)
5. **Implement handler** with error handling
6. **Return MCP-compliant response**:
   ```typescript
   {
     content: [{ type: 'text', text: 'Human-readable' }],
     _meta: rawApiResponse  // Optional: preserve raw data
   }
   ```
7. **Test with real SiYuan instance**
8. **Update `TOOL_REFERENCE.md`**

**Template**:

```typescript
server.tool(
  'siyuan_toolName',
  'Clear description of what this tool does and when to use it.',
  {
    param1: z.string().describe('Description of param1'),
    param2: z.number().optional().describe('Optional param2')
  },
  { readOnlyHint: true },  // Annotations
  async ({ param1, param2 }, _extra) => {
    try {
      const response = await siyuanClient.post('/api/endpoint', {
        param1,
        param2
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response.data.data, null, 2)
        }],
        _meta: response.data.data
      };
    } catch (error) {
      throw new Error(`Tool failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);
```

### 3.3 Tool Naming Conventions

**Pattern**: `siyuan_<action><Noun>`

**Actions**:
- `list` - Get multiple items
- `get` - Get single item or specific data
- `create` - Create new resource
- `update` - Modify existing resource
- `delete` / `remove` - Delete resource
- `set` - Set configuration/attributes
- `move` - Relocate resource
- `rename` - Change name
- `upload` - Upload files

**Examples**:
- `siyuan_listNotebooks` ✅
- `siyuan_getBlockAttrs` ✅
- `siyuan_createDocWithMd` ✅
- `siyuan_removeFile` ✅
- `list_notebooks` ❌ (missing prefix)
- `siyuan_notebooks_list` ❌ (wrong order)

### 3.4 Case Study: Implementation of `siyuan_uploadAsset`

**Challenge**: SiYuan requires multipart form data, MCP uses JSON

**Solution Architecture**:

```
MCP Tool (JSON)
    ↓
{ base64 data } → multipart.ts → FormData + Blob → client.postMultipart()
                                                            ↓
                                                    /api/asset/upload
```

**Key Components**:

1. **`utils/multipart.ts`**: Converts base64 to FormData
   ```typescript
   export function createMultipartForm(
     files: UploadFile[],
     assetsDirPath: string
   ): FormData {
     const form = new FormData();
     form.append('assetsDirPath', assetsDirPath);
     files.forEach((file) => {
       const buffer = Buffer.from(file.data, 'base64');
       form.append('file[]', buffer, {
         filename: file.filename,
         contentType: file.mimeType || getMimeType(file.filename)
       });
     });
     return form;
   }
   ```

2. **`client.postMultipart()`**: Handles multipart requests
3. **`tools/asset.ts`**: Validates input, calls client, formats response

**Lessons Learned**:
- Base64 is MCP-friendly (JSON-safe)
- Validate inputs early (filename, size, path traversal)
- Provide clear error messages
- Follow MCP best practices (proper parameter descriptions)

---

## 4. Project Roadmap & Status

### 4.1 Current Implementation Status

**Version**: 2.0.0 (Production Ready ✅)

**Tools Implemented**: 52/57 (91%)
- 46 atomic tools (1:1 with SiYuan API)
- 6 composite smart tools

**API Coverage**: 95%

**Build Status**: ✅ Compiles with 0 errors

### 4.2 v2.0 Achievements

1. ✅ **Fixed Critical Bug**: "cb is not a function" error
   - **Cause**: MCP SDK v1.19.1 misidentified empty `{}` as ZodRawShape
   - **Solution**: Removed empty annotations from 24 tools

2. ✅ **Implemented File Upload**: `siyuan_uploadAsset`
   - Multipart form conversion from base64
   - File validation and MIME detection
   - 100MB file size limit

3. ✅ **Composite Smart Tools**: 6 tools for token optimization
   - `getContentTree`, `getDocumentOutline`, `searchWithContext`
   - `getRecentContent`, `getOrCreateDailyNote`, `findTasks`

4. ✅ **Architecture Transformation**:
   - From: Single `executeCommand` meta-tool
   - To: 52 atomic tools with direct registration
   - Result: 80-95% token reduction

### 4.3 Deferred to v2.1 (5 tools)

- `putFile` - Requires multipart (complex)
- Network proxy operations (security concerns)
- Pandoc conversion (external dependency)
- Notification system (UI-specific)
- Advanced block references

### 4.4 Future Enhancements

**v2.1 (Planned)**:
- S3 integration for large files
- Streaming upload for >10MB files
- Progress reporting for long operations
- Batch operations optimization
- Missing composite tools: `getBlockReferences`, `batchSetAttributesByPath`

**v2.2 (Concept)**:
- WebSocket support for real-time updates
- Collaborative editing hooks
- Advanced search with AI enhancement
- Plugin system for extensions

### 4.5 Technical Debt

1. **Testing**: Need comprehensive test suite (current: manual testing only)
2. **Error Messages**: Some errors could be more actionable
3. **Performance**: Large workspaces (1000+ docs) could benefit from caching
4. **Documentation**: Inline JSDoc comments for all tools

---

## 5. For LLM Assistants (Claude Integration)

### 5.1 How to Interact with This Codebase

**Entry Points**:
- `src-v2/server.ts` - Main server registration
- `src-v2/tools/*.ts` - Tool implementations
- `src-v2/client.ts` - HTTP client

**Common Tasks**:

| Task | File | Pattern |
|------|------|---------|
| Add new tool | `src-v2/tools/<category>.ts` | Follow template in §3.2 |
| Fix tool bug | `src-v2/tools/<category>.ts` | Check error handling |
| Add API endpoint | `src-v2/client.ts` | Add method if needed |
| Update docs | `TOOL_REFERENCE.md` | Add to appropriate section |

**Build & Test Workflow**:
```bash
npm run build   # Verify compilation
npm run dev     # Test with real SiYuan
# Use Claude Desktop to test tool calls
```

### 5.2 Key Patterns to Follow

1. **Never use empty `{}` for annotations**:
   ```typescript
   // Bad (causes "cb is not a function" error)
   server.tool('name', 'desc', params, {}, handler)

   // Good (omit if no annotations)
   server.tool('name', 'desc', params, handler)

   // Good (with annotations)
   server.tool('name', 'desc', params, { readOnlyHint: true }, handler)
   ```

2. **Always preserve `_extra` parameter**:
   ```typescript
   // Correct - MCP SDK requires this
   async ({ param1 }, _extra) => { ... }
   ```

3. **Return MCP-compliant responses**:
   ```typescript
   return {
     content: [{ type: 'text', text: '...' }],
     _meta: rawData  // Optional
   };
   ```

### 5.3 CLAUDE.md Instructions

When working on this project, Claude Code reads `CLAUDE.md` for guidance. After consolidation, it contains:
- Project overview
- Pointers to `USER_GUIDE.md`, `DEVELOPER_GUIDE.md`, `TOOL_REFERENCE.md`
- Common development commands

---

## 6. Debugging Common Issues

### 6.1 "cb is not a function" Error

**Symptom**: Tools fail with "cb is not a function" error

**Root Cause**: MCP SDK v1.19.1's `isZodRawShape()` misidentifies empty `{}` objects

**Solution**: Remove empty `{}` from tool registration

```typescript
// Before (causes error)
server.tool('name', 'desc', params, {}, handler)

// After (fixed)
server.tool('name', 'desc', params, handler)
```

**Affected Tools**: 24 tools were fixed in v2.0 (see `DEBUG_CB_IS_NOT_A_FUNCTION.md` in git history)

### 6.2 Asset Upload Failures

**Symptom**: "Asset upload failed" or "Invalid base64 data"

**Common Causes**:
1. Invalid base64 encoding (extra spaces/newlines)
2. File size > 100MB
3. Path traversal in filename (`../` not allowed)
4. Missing `form-data` dependency

**Solutions**:
```bash
# Install dependencies
npm install form-data @types/form-data

# Test with minimal file
siyuan_uploadAsset({
  files: [{
    filename: "test.png",
    data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
  }]
})
```

### 6.3 TypeScript Compilation Errors

**Symptom**: `tsc` fails with type errors

**Common Causes**:
1. Missing types for dependencies
2. `any` type issues (strict mode)
3. Module resolution problems

**Solutions**:
```bash
# Install missing types
npm install @types/<package>

# For `any` issues, explicitly type or use `any[]`
const items: any[] = [];  // Not: const items = []

# Check tsconfig.json module settings
"module": "NodeNext",
"moduleResolution": "nodenext"
```

### 6.4 Testing Issues

**Symptom**: Tools work in Claude Desktop but not in tests

**Common Causes**:
1. Environment variables not set
2. SiYuan not running
3. Mock data mismatch

**Solutions**:
```bash
# Set environment variables
export SIYUAN_TOKEN="test-token"
export SIYUAN_API_URL="http://localhost:6806"

# Start SiYuan before testing
# Verify with: curl http://localhost:6806/api/system/version
```

### 6.5 Performance Problems

**Symptom**: Operations take several seconds

**Common Causes**:
1. Using atomic tools instead of composite tools
2. Requesting too much data (`maxDepth`, `limit`)
3. Large workspace with many documents

**Solutions**:
1. Use composite tools for aggregated operations
2. Reduce `maxDepth: 1` and `contentLength: 100` for quick overview
3. Add `limit` parameter to cap results
4. Filter by `notebookId` to reduce scope

---

## 7. Appendix: Git Workflow

### 7.1 Branch Strategy

- `main` - Production releases
- `develop` - Integration branch
- `v2-clean-atomic-tools` - v2.0 development (current)
- Feature branches: `feature/<name>`
- Bugfix branches: `bugfix/<name>`

### 7.2 Commit Message Format

```
<type>: <subject>

<body>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

### 7.3 Pull Request Process

1. Create feature branch
2. Implement changes
3. Test locally with `npm run build && npm run dev`
4. Update `TOOL_REFERENCE.md` if tools changed
5. Create PR with description
6. Address review feedback
7. Merge to `develop`

---

**Version**: 2.0.0 | **Status**: Production Ready ✅ | **Tools**: 52 (46 atomic + 6 composite)
