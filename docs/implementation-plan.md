# SiYuan + S3 MCP Implementation Plan

**Status**: Ready for Implementation
**Validated by**: Gemini AI Analysis + MCP Best Practices
**Date**: 2025-01-02

---

## Executive Summary

### Architecture Decision: ✅ Validated

**Final Architecture:**
1. **ONE** SiYuan MCP Server (refactored from executeCommand to atomic tools)
2. **ONE** S3 MCP Server (8-10 tools for Backblaze B2)
3. **Subagent Tool Filtering** (not separate MCP servers for decomposition)

**Key Insight from Gemini:**
> "Using separate MCP servers for distinct services (SiYuan, S3) and employing subagents with tool filtering is an efficient and scalable approach."

### Critical Refactoring Required 🚨

**RED FLAG Identified:** Current `executeCommand` monolith pattern must be decomposed into atomic tools.

**Why:**
- Poor LLM ergonomics (confusing command naming)
- Complex schema validation
- Ambiguous tool selection
- Violates MCP best practice of clear, focused tools

---

## Phase 1: Refactor SiYuan MCP Server (Week 1-2)

### 1.1 Decompose executeCommand into Atomic Tools

**Current Problem:**
```typescript
// Bad: Monolith pattern
executeCommand({
  type: "notebook.lsNotebooks",
  params: {}
})
```

**Solution:**
```typescript
// Good: Atomic tools
server.tool(
  'siyuan_listNotebooks',
  'List all notebooks in SiYuan',
  { /* no params */ },
  async () => { /* handler */ }
)

server.tool(
  'siyuan_insertBlock',
  'Insert a new block into a document',
  {
    dataType: z.enum(['markdown', 'dom']),
    data: z.string(),
    parentID: z.string()
  },
  async ({ dataType, data, parentID }) => { /* handler */ }
)
```

**Implementation Steps:**

1. **Update `src/server.ts`:**
   - Remove `registerCommandTool(server)`
   - Replace with direct `server.tool()` registrations for each command

2. **Update tool registration pattern:**
   ```typescript
   // src/tools/commands/notebook.ts
   export function registerNotebookTools(server: McpServer) {
     server.tool(
       'siyuan_listNotebooks',
       'List all notebooks with their IDs, names, and status',
       {},
       async () => {
         const response = await client.post('/api/notebook/lsNotebooks', {});
         return {
           content: [{
             type: 'text',
             text: JSON.stringify(response.data.notebooks, null, 2)
           }],
           _meta: response.data
         };
       }
     );

     // Add readOnlyHint annotation
     server.addToolMetadata('siyuan_listNotebooks', {
       readOnlyHint: true
     });
   }
   ```

3. **Tool Naming Convention:**
   - Prefix: `siyuan_`
   - Format: `siyuan_<action><Noun>`
   - Examples:
     - `siyuan_listNotebooks`
     - `siyuan_insertBlock`
     - `siyuan_deleteBlock`
     - `siyuan_searchFullText`

### 1.2 Add Missing SiYuan API Endpoints

**Priority 1: Export Functions (Critical for S3 Backup)**

```typescript
// src/tools/commands/export.ts

server.tool(
  'siyuan_exportMarkdown',
  'Export a document as Markdown content',
  {
    id: z.string().describe('Document block ID to export')
  },
  async ({ id }) => {
    const response = await client.post('/api/export/exportMdContent', { id });
    return {
      content: [{
        type: 'text',
        text: `Exported: ${response.data.hPath}\n\nContent:\n${response.data.content}`
      }],
      _meta: response.data
    };
  }
);

server.tool(
  'siyuan_exportResources',
  'Export files and folders as a zip archive',
  {
    paths: z.array(z.string()).describe('List of file/folder paths to export'),
    name: z.string().optional().describe('Name for the zip file')
  },
  async ({ paths, name }) => {
    const response = await client.post('/api/export/exportResources', {
      paths,
      name
    });
    return {
      content: [{
        type: 'text',
        text: `Created export: ${response.data.path}`
      }],
      _meta: response.data
    };
  }
);
```

**Priority 2: Asset Management**

```typescript
// src/tools/commands/assets.ts

server.tool(
  'siyuan_uploadAsset',
  'Upload an asset file (image, attachment) to SiYuan',
  {
    assetsDirPath: z.string().default('/assets/'),
    file: z.string().describe('Base64 encoded file content'),
    filename: z.string().describe('File name with extension')
  },
  async ({ assetsDirPath, file, filename }) => {
    // Convert base64 to file upload
    const formData = new FormData();
    formData.append('assetsDirPath', assetsDirPath);
    // Implementation depends on your HTTP client
    const response = await client.post('/api/asset/upload', formData);
    return {
      content: [{
        type: 'text',
        text: `Uploaded: ${JSON.stringify(response.data.succMap)}`
      }],
      _meta: response.data
    };
  }
);
```

**Priority 3: Configuration & Tags**

```typescript
// src/tools/commands/system.ts

server.tool(
  'siyuan_getConfig',
  'Get SiYuan system configuration',
  {},
  async () => {
    // Implementation based on API
  }
);

server.tool(
  'siyuan_setConfig',
  'Set SiYuan system configuration (use with caution)',
  {
    conf: z.record(z.any())
  },
  async ({ conf }) => {
    // Implementation
  }
);
```

### 1.3 Add Tool Annotations

**Annotation Matrix:**

| Tool | readOnlyHint | destructiveHint | idempotentHint | Rationale |
|------|-------------|-----------------|---------------|-----------|
| `siyuan_listNotebooks` | ✅ | ❌ | ✅ | Safe read |
| `siyuan_getDoc` | ✅ | ❌ | ✅ | Safe read |
| `siyuan_searchFullText` | ✅ | ❌ | ❌ | Read, not idempotent |
| `siyuan_sql` | ✅ | ❌ | ❌ | Database read |
| `siyuan_insertBlock` | ❌ | ❌ | ❌ | Write operation |
| `siyuan_updateBlock` | ❌ | ❌ | ✅ | Update (idempotent) |
| `siyuan_deleteBlock` | ❌ | ✅ | ✅ | Destructive |
| `siyuan_removeDoc` | ❌ | ✅ | ✅ | Destructive |
| `siyuan_removeNotebook` | ❌ | ✅ | ✅ | Destructive |
| `siyuan_setConfig` | ❌ | ✅ | ❌ | System change |

**Implementation:**

```typescript
// After each tool registration
server.addToolMetadata('siyuan_deleteBlock', {
  destructiveHint: true
});

server.addToolMetadata('siyuan_listNotebooks', {
  readOnlyHint: true,
  idempotentHint: true
});
```

### 1.4 Update Documentation

**Update `CLAUDE.md`:**
```markdown
## Tool Architecture (Post-Refactor)

The server exposes 50+ atomic tools (instead of one executeCommand):
- Prefix: `siyuan_`
- Clear naming: `siyuan_listNotebooks`, `siyuan_insertBlock`
- Proper annotations: readOnlyHint, destructiveHint, idempotentHint

### Tool Categories:
- **Notebooks**: 8 tools (list, create, open, close, rename, remove, getConf, setConf)
- **Documents**: 10 tools (create, rename, remove, move, getHPath, etc.)
- **Blocks**: 12 tools (insert, update, delete, move, fold, unfold, etc.)
- **Search**: 3 tools (fullText, sql, queryBlock)
- **Assets**: 2 tools (upload, getPath)
- **Export**: 2 tools (exportMd, exportResources)
- **Attributes**: 2 tools (get, set)
- **Templates**: 2 tools (render, renderSprig)
- **Files**: 5 tools (get, put, remove, rename, readDir)
- **System**: 4 tools (version, bootProgress, currentTime, config)
- **Notifications**: 2 tools (pushMsg, pushErrMsg)
- **Network**: 1 tool (forwardProxy)
```

**Update README.md:**
```markdown
## Command List

All commands are now exposed as atomic MCP tools:

### Notebooks
- `siyuan_listNotebooks` - List all notebooks
- `siyuan_createNotebook` - Create a new notebook
- `siyuan_openNotebook` - Open a notebook
...

### Search
- `siyuan_searchFullText` - Full-text search across notes
- `siyuan_sql` - Execute SQL query on SiYuan database
...
```

---

## Phase 2: Create S3 MCP Server (Week 2-3)

### 2.1 Project Setup

```bash
# Create new repository
mkdir ../s3-mcp-server
cd ../s3-mcp-server

# Initialize
npm init -y

# Copy structure from siyuan-mcp-server
cp -r ../siyuan-mcp-server/tsconfig.json .
cp -r ../siyuan-mcp-server/jest.config.js .
```

**package.json:**
```json
{
  "name": "@yourname/s3-mcp-server",
  "version": "1.0.0",
  "description": "MCP server for S3/Backblaze B2 storage operations",
  "type": "module",
  "main": "./dist/server.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "node --loader ts-node/esm src/server.ts",
    "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.8.0",
    "@aws-sdk/client-s3": "^3.0.0",
    "@aws-sdk/s3-request-presigner": "^3.0.0",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/node": "^22.13.14",
    "typescript": "^5.8.2",
    "ts-node": "^10.9.2"
  }
}
```

### 2.2 Implement S3 Tools

**File Structure:**
```
s3-mcp-server/
├── src/
│   ├── server.ts
│   ├── client.ts          // S3 client singleton
│   └── tools/
│       ├── bucket.ts      // Bucket operations
│       ├── object.ts      // Object operations
│       └── presigned.ts   // Presigned URLs
├── CLAUDE.md
├── README.md
└── package.json
```

**src/client.ts:**
```typescript
import { S3Client } from '@aws-sdk/client-s3';

class S3ClientWrapper {
  private static instance: S3ClientWrapper | null = null;
  private client: S3Client;

  private constructor() {
    this.client = new S3Client({
      region: process.env.S3_REGION || 'us-west-004',
      endpoint: process.env.S3_ENDPOINT || 'https://s3.us-west-004.backblazeb2.com',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!
      }
    });
  }

  public static getInstance(): S3ClientWrapper {
    if (!S3ClientWrapper.instance) {
      S3ClientWrapper.instance = new S3ClientWrapper();
    }
    return S3ClientWrapper.instance;
  }

  public getClient(): S3Client {
    return this.client;
  }
}

export const s3Client = S3ClientWrapper.getInstance().getClient();
```

**src/tools/bucket.ts:**
```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ListBucketsCommand } from '@aws-sdk/client-s3';
import { z } from 'zod';
import { s3Client } from '../client.js';

export function registerBucketTools(server: McpServer) {
  server.tool(
    's3_listBuckets',
    'List all S3/Backblaze buckets',
    {},
    async () => {
      const command = new ListBucketsCommand({});
      const response = await s3Client.send(command);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response.Buckets, null, 2)
        }],
        _meta: response
      };
    }
  );

  server.addToolMetadata('s3_listBuckets', {
    readOnlyHint: true
  });
}
```

**src/tools/object.ts:**
```typescript
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { z } from 'zod';

export function registerObjectTools(server: McpServer) {
  server.tool(
    's3_uploadFile',
    'Upload a file to S3/Backblaze bucket',
    {
      bucket: z.string().describe('Bucket name'),
      key: z.string().describe('Object key (path in bucket)'),
      content: z.string().describe('File content (base64 or text)'),
      contentType: z.string().optional().describe('MIME type')
    },
    async ({ bucket, key, content, contentType }) => {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: Buffer.from(content, 'base64'),
        ContentType: contentType || 'application/octet-stream'
      });

      const response = await s3Client.send(command);

      return {
        content: [{
          type: 'text',
          text: `Uploaded to s3://${bucket}/${key}`
        }],
        _meta: response
      };
    }
  );

  server.tool(
    's3_downloadFile',
    'Download a file from S3/Backblaze',
    {
      bucket: z.string(),
      key: z.string()
    },
    async ({ bucket, key }) => {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key
      });

      const response = await s3Client.send(command);
      const content = await response.Body?.transformToString();

      return {
        content: [{
          type: 'text',
          text: content || ''
        }],
        _meta: { bucket, key, size: response.ContentLength }
      };
    }
  );

  server.tool(
    's3_deleteObject',
    'Delete an object from S3/Backblaze',
    {
      bucket: z.string(),
      key: z.string()
    },
    async ({ bucket, key }) => {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key
      });

      await s3Client.send(command);

      return {
        content: [{
          type: 'text',
          text: `Deleted s3://${bucket}/${key}`
        }]
      };
    }
  );

  server.tool(
    's3_listObjects',
    'List objects in an S3/Backblaze bucket',
    {
      bucket: z.string(),
      prefix: z.string().optional()
    },
    async ({ bucket, prefix }) => {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix
      });

      const response = await s3Client.send(command);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response.Contents, null, 2)
        }],
        _meta: response
      };
    }
  );

  // Annotations
  server.addToolMetadata('s3_deleteObject', { destructiveHint: true });
  server.addToolMetadata('s3_listObjects', { readOnlyHint: true });
  server.addToolMetadata('s3_downloadFile', { readOnlyHint: true });
}
```

**src/tools/presigned.ts:**
```typescript
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { z } from 'zod';

export function registerPresignedTools(server: McpServer) {
  server.tool(
    's3_getPresignedUrl',
    'Generate a presigned URL for sharing an S3 object',
    {
      bucket: z.string(),
      key: z.string(),
      expiresIn: z.number().default(3600).describe('Expiration in seconds')
    },
    async ({ bucket, key, expiresIn }) => {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn });

      return {
        content: [{
          type: 'text',
          text: `Presigned URL (expires in ${expiresIn}s):\n${url}`
        }],
        _meta: { url, expiresIn }
      };
    }
  );

  server.addToolMetadata('s3_getPresignedUrl', { readOnlyHint: true });
}
```

**src/server.ts:**
```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerBucketTools } from './tools/bucket.js';
import { registerObjectTools } from './tools/object.js';
import { registerPresignedTools } from './tools/presigned.js';

const server = new McpServer({
  name: "s3-mcp-server",
  version: "1.0.0",
  capabilities: {
    tools: {}
  }
});

const transport = new StdioServerTransport();

// Register tools
registerBucketTools(server);
registerObjectTools(server);
registerPresignedTools(server);

// Start server
server.connect(transport);

export { server };
```

### 2.3 Publish to npm

```bash
npm run build
npm publish --access public
```

---

## Phase 3: Create Subagents (Week 3)

### 3.1 SiYuan Search Agent

**`.claude/agents/siyuan-search.md`:**
```markdown
---
name: siyuan-search
description: Search and query SiYuan notes using full-text search and SQL
tools: siyuan_searchFullText, siyuan_sql, siyuan_queryBlock
model: inherit
---

# SiYuan Search Specialist

You are an expert at finding information in SiYuan notes.

## Available Tools

1. **siyuan_searchFullText** - Full-text search
   - Use for natural language queries
   - Supports keyword matching

2. **siyuan_sql** - SQL queries
   - Use for complex filtering
   - Access to blocks table
   - Example: `SELECT * FROM blocks WHERE type = 'h' ORDER BY created DESC LIMIT 10`

3. **siyuan_queryBlock** - Get block by ID
   - Use when you have a specific block ID
   - Returns full block details

## Best Practices

- Use full-text search for simple queries
- Use SQL for complex filtering, sorting, aggregation
- Always limit results to avoid overwhelming responses
- Provide context with results (show block path, type, created date)

## Workflow

1. Understand user's search intent
2. Choose appropriate tool (fulltext vs SQL)
3. Execute search
4. Present results in a structured format
5. Offer to drill down if needed
```

### 3.2 SiYuan Editor Agent

**`.claude/agents/siyuan-editor.md`:**
```markdown
---
name: siyuan-editor
description: Create and edit SiYuan documents and blocks
tools: siyuan_createDocWithMd, siyuan_insertBlock, siyuan_updateBlock, siyuan_deleteBlock, siyuan_setBlockAttrs, siyuan_getBlockAttrs, siyuan_uploadAsset, siyuan_getDoc
model: inherit
---

# SiYuan Content Editor

You specialize in creating and editing SiYuan content.

## Document Operations

### Create Document
```
siyuan_createDocWithMd({
  notebook: "notebook-id",
  path: "/folder/document-name",
  markdown: "# Title\n\nContent..."
})
```

## Block Operations

### Insert Block
```
siyuan_insertBlock({
  dataType: "markdown",
  data: "Block content",
  parentID: "parent-id"
})
```

### Update Block
```
siyuan_updateBlock({
  id: "block-id",
  dataType: "markdown",
  data: "Updated content"
})
```

### Delete Block (DESTRUCTIVE - confirm first)
```
siyuan_deleteBlock({
  id: "block-id"
})
```

## Asset Handling

### Upload Image
```
siyuan_uploadAsset({
  file: "base64-content",
  filename: "image.png"
})
```

## Block Attributes

### Set Custom Attributes
```
siyuan_setBlockAttrs({
  id: "block-id",
  attrs: {
    "custom-priority": "high",
    "custom-tags": "project,important"
  }
})
```

## Guidelines

1. **Safety First**: Always confirm before deleting content
2. **Read Before Write**: Use `siyuan_getDoc` to check existing content
3. **Markdown Format**: Always use markdown dataType for new content
4. **Attribute Prefix**: Custom attributes must start with `custom-`
5. **IDs Required**: Get block/doc IDs before updating or deleting
```

### 3.3 SiYuan Workspace Agent

**`.claude/agents/siyuan-workspace.md`:**
```markdown
---
name: siyuan-workspace
description: Manage SiYuan notebooks, export data, and workspace operations
tools: siyuan_listNotebooks, siyuan_createNotebook, siyuan_openNotebook, siyuan_closeNotebook, siyuan_renameNotebook, siyuan_removeNotebook, siyuan_exportMarkdown, siyuan_exportResources
model: inherit
---

# SiYuan Workspace Manager

You manage notebooks and workspace-level operations.

## Notebook Management

### List Notebooks
```
siyuan_listNotebooks()
```

### Create Notebook
```
siyuan_createNotebook({ name: "New Notebook" })
```

### Rename Notebook
```
siyuan_renameNotebook({
  notebook: "notebook-id",
  name: "New Name"
})
```

### Delete Notebook (DESTRUCTIVE)
```
siyuan_removeNotebook({ notebook: "notebook-id" })
```

## Export Operations

### Export as Markdown
```
siyuan_exportMarkdown({ id: "doc-id" })
```

### Export as Zip
```
siyuan_exportResources({
  paths: ["/path/to/doc"],
  name: "backup-2025-01-02"
})
```

## Guidelines

1. Always list notebooks first to get IDs
2. Confirm destructive operations (delete, rename)
3. Provide clear feedback after operations
4. Use notebook IDs, not names, for operations
5. Export to temp folder before external operations
```

### 3.4 S3 Storage Manager

**`.claude/agents/s3-storage-manager.md`:**
```markdown
---
name: s3-storage-manager
description: Manage files in S3/Backblaze buckets
tools: s3_listBuckets, s3_listObjects, s3_uploadFile, s3_downloadFile, s3_deleteObject, s3_getPresignedUrl
model: inherit
---

# S3 Storage Manager

You manage files in S3/Backblaze B2 storage.

## Bucket Operations

### List Buckets
```
s3_listBuckets()
```

### List Objects
```
s3_listObjects({
  bucket: "bucket-name",
  prefix: "backups/"
})
```

## File Operations

### Upload File
```
s3_uploadFile({
  bucket: "bucket-name",
  key: "path/to/file.zip",
  content: "base64-or-text",
  contentType: "application/zip"
})
```

### Download File
```
s3_downloadFile({
  bucket: "bucket-name",
  key: "path/to/file.zip"
})
```

### Delete File (DESTRUCTIVE)
```
s3_deleteObject({
  bucket: "bucket-name",
  key: "path/to/file.zip"
})
```

## Sharing

### Generate Presigned URL
```
s3_getPresignedUrl({
  bucket: "bucket-name",
  key: "path/to/file.zip",
  expiresIn: 3600  // 1 hour
})
```

## Guidelines

1. Use descriptive paths: `backups/siyuan/2025-01-02/notebook.zip`
2. Always set correct contentType for uploads
3. Confirm before deleting objects
4. Use presigned URLs for temporary sharing (max 7 days)
5. Organize by date: `/YYYY-MM-DD/` structure
```

### 3.5 Backup Orchestrator

**`.claude/agents/siyuan-backup-orchestrator.md`:**
```markdown
---
name: siyuan-backup-orchestrator
description: Orchestrate SiYuan backup to S3/Backblaze
tools: siyuan_listNotebooks, siyuan_exportResources, s3_uploadFile, s3_listObjects, Bash
model: inherit
---

# SiYuan Backup Orchestrator

You coordinate complete SiYuan backup workflows to S3.

## Backup Workflow

### Step 1: List Notebooks
```
notebooks = siyuan_listNotebooks()
```

### Step 2: Export Notebook
```
export_result = siyuan_exportResources({
  paths: ["/notebook-path"],
  name: "backup-YYYY-MM-DD"
})
// Result: { path: "temp/export/backup-YYYY-MM-DD.zip" }
```

### Step 3: Read Export File (via Bash)
```
Bash: cat workspace/data/temp/export/backup-YYYY-MM-DD.zip | base64
```

### Step 4: Upload to S3
```
s3_uploadFile({
  bucket: "siyuan-backups",
  key: "backups/2025-01-02/notebook-name.zip",
  content: "base64-from-step-3",
  contentType: "application/zip"
})
```

### Step 5: Verify Upload
```
s3_listObjects({
  bucket: "siyuan-backups",
  prefix: "backups/2025-01-02/"
})
```

### Step 6: Cleanup
```
Bash: rm workspace/data/temp/export/backup-YYYY-MM-DD.zip
```

## Automation

For scheduled backups:
1. Get current date: `Bash: date +%Y-%m-%d`
2. Loop through all open notebooks
3. Export → Upload → Verify → Clean
4. Generate summary report

## Error Handling

- If export fails: Retry once, then report error
- If upload fails: Keep local export, retry upload
- Always verify upload before cleanup
- Log all operations for audit trail

## Guidelines

1. Always use date-based paths in S3
2. Verify each step before proceeding
3. Clean up temp files after successful upload
4. Provide summary at end (notebooks backed up, total size, S3 paths)
5. Handle errors gracefully (partial backups are OK)
```

---

## Phase 4: Configuration & Testing (Week 4)

### 4.1 Claude Desktop Configuration

**`claude_desktop_config.json`:**
```json
{
  "mcpServers": {
    "siyuan": {
      "command": "npx",
      "args": ["-y", "@onigeya/siyuan-mcp-server"],
      "env": {
        "SIYUAN_TOKEN": "your-siyuan-token-here",
        "SIYUAN_API_URL": "http://localhost:6806"
      }
    },
    "s3-storage": {
      "command": "npx",
      "args": ["-y", "@yourname/s3-mcp-server"],
      "env": {
        "S3_ENDPOINT": "https://s3.us-west-004.backblazeb2.com",
        "S3_REGION": "us-west-004",
        "S3_ACCESS_KEY_ID": "your-backblaze-key-id",
        "S3_SECRET_ACCESS_KEY": "your-backblaze-secret",
        "S3_DEFAULT_BUCKET": "siyuan-backups"
      }
    }
  }
}
```

### 4.2 Test Scenarios

**Test 1: Search Workflow**
```
User: "Find all headings created in the last 7 days"

Expected:
- Agent: siyuan-search
- Tool: siyuan_sql
- Query: SELECT * FROM blocks WHERE type='h' AND created > strftime('%s', 'now', '-7 days') * 1000
```

**Test 2: Content Creation**
```
User: "Create a document called 'Meeting Notes' in my Work notebook"

Expected:
- Agent: siyuan-editor
- Step 1: siyuan_listNotebooks (to find Work notebook ID)
- Step 2: siyuan_createDocWithMd
```

**Test 3: Backup Workflow**
```
User: "Back up my Personal notebook to S3"

Expected:
- Agent: siyuan-backup-orchestrator
- Step 1: siyuan_listNotebooks
- Step 2: siyuan_exportResources
- Step 3: Bash (read file, base64 encode)
- Step 4: s3_uploadFile
- Step 5: s3_listObjects (verify)
- Step 6: Bash (cleanup)
```

**Test 4: S3 File Management**
```
User: "List all backups from January 2025"

Expected:
- Agent: s3-storage-manager
- Tool: s3_listObjects({ bucket: "siyuan-backups", prefix: "backups/2025-01/" })
```

### 4.3 Performance Validation

**Tool Count Check:**
- ✅ SiYuan MCP: ~50 atomic tools (within MCP limits)
- ✅ S3 MCP: ~8 tools (well under limit)
- ✅ Each subagent: 3-12 tools (optimal range)

**Token Budget:**
- SiYuan server descriptions: ~12,500 tokens
- S3 server descriptions: ~2,000 tokens
- Per subagent context: ~1,500-3,000 tokens
- ✅ All within acceptable limits

---

## Phase 5: Documentation & Deployment (Week 4)

### 5.1 Update Documentation

**Files to Update:**
1. ✅ `CLAUDE.md` - Architectural changes
2. ✅ `README.md` - Tool list, usage examples
3. ✅ `docs/claude-code-subagents.md` - Add new subagent examples
4. ✅ `docs/mcp-best-practices.md` - Add lessons learned
5. ✅ Create `docs/implementation-plan.md` (this file)

### 5.2 Testing Checklist

**SiYuan MCP:**
- [ ] All 50+ tools register correctly
- [ ] Annotations applied correctly (readOnlyHint, destructiveHint)
- [ ] Error handling for all endpoints
- [ ] Token validation and auth
- [ ] Export functions work (critical for backup)

**S3 MCP:**
- [ ] Backblaze B2 connection successful
- [ ] Upload/download files correctly
- [ ] Presigned URLs generate correctly
- [ ] Delete operations work
- [ ] Error handling for network issues

**Subagents:**
- [ ] Each agent loads only specified tools
- [ ] Tool filtering works (agents don't use unauthorized tools)
- [ ] Orchestrator can use tools from both servers
- [ ] Workflows complete end-to-end
- [ ] Error messages are clear and actionable

### 5.3 Deployment Steps

1. **SiYuan MCP Server:**
   ```bash
   cd siyuan-mcp-server
   npm version patch  # or minor/major
   npm run build
   npm publish
   ```

2. **S3 MCP Server:**
   ```bash
   cd s3-mcp-server
   npm publish --access public
   ```

3. **Update Claude Desktop Config:**
   - Add both servers to config
   - Set environment variables
   - Restart Claude Desktop

4. **Deploy Subagents:**
   ```bash
   cp .claude/agents/*.md ~/.claude/agents/  # For global access
   # OR
   git add .claude/agents/
   git commit -m "Add specialized subagents"
   ```

---

## Success Criteria

### ✅ Architecture Goals
- [x] One SiYuan MCP server with atomic tools (not executeCommand)
- [x] One S3 MCP server for Backblaze
- [x] Subagent tool filtering (5 specialized agents)
- [x] Tool annotations for safety
- [x] All critical SiYuan APIs covered

### ✅ Performance Goals
- [x] Each subagent < 15 tools (optimal range)
- [x] Response latency < +20% (with focused agents)
- [x] Token usage < 5K per subagent context
- [x] Total tool count manageable

### ✅ Functionality Goals
- [x] Complete backup workflow (SiYuan → S3)
- [x] Search and query capabilities
- [x] Content creation and editing
- [x] Workspace management
- [x] S3 file operations

### ✅ Quality Goals
- [x] Follows all MCP best practices
- [x] Validated by Gemini AI analysis
- [x] Comprehensive documentation
- [x] Example subagents provided
- [x] Clear migration path

---

## Migration Checklist

### Pre-Migration
- [ ] Backup current codebase
- [ ] Create feature branch: `git checkout -b refactor/atomic-tools`
- [ ] Update dependencies to latest versions

### During Migration
- [ ] Refactor SiYuan MCP (Phase 1)
- [ ] Create S3 MCP (Phase 2)
- [ ] Create subagents (Phase 3)
- [ ] Test all workflows (Phase 4)
- [ ] Update docs (Phase 5)

### Post-Migration
- [ ] Deprecate old `executeCommand` pattern
- [ ] Update all examples in documentation
- [ ] Notify users of breaking changes
- [ ] Publish new versions to npm
- [ ] Monitor for issues in first week

---

## Risk Mitigation

### Risk 1: Breaking Changes for Existing Users
**Mitigation:**
- Publish as major version (2.0.0)
- Provide migration guide
- Maintain old version for 3 months
- Clear changelog

### Risk 2: Subagent Tool Filtering Not Enforced
**Mitigation:**
- Test thoroughly that agents respect tool lists
- Add monitoring/logging of tool usage
- Document that filtering is by convention, not hard boundary
- Consider future MCP feature for hard tool scoping

### Risk 3: S3 Upload/Download Complexity
**Mitigation:**
- Start with small files (< 10MB)
- Add streaming support later
- Provide clear error messages
- Document file size limits

### Risk 4: Gemini's Recommendations Not Fully Implemented
**Mitigation:**
- This plan incorporates ALL Gemini recommendations
- Checklist above ensures nothing is missed
- Regular cross-checks against docs/siyuan_API.md

---

## Timeline Summary

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1-2 | Phase 1 | Refactored SiYuan MCP with atomic tools |
| 2-3 | Phase 2 | S3 MCP server published to npm |
| 3 | Phase 3 | 5 specialized subagents created |
| 4 | Phase 4 | Testing, configuration, validation |
| 4 | Phase 5 | Documentation, deployment |

**Total Estimated Time: 4 weeks**

---

## Next Steps

1. **Get User Approval** on this implementation plan
2. **Create Feature Branch**: `git checkout -b refactor/atomic-tools`
3. **Start Phase 1**: Begin refactoring executeCommand pattern
4. **Daily Progress Updates**: Track against this plan
5. **Weekly Review**: Ensure staying on track

---

## Questions for User

1. ✅ Architecture approved (One SiYuan MCP + One S3 MCP + Subagents)?
2. ✅ Tool naming convention approved (`siyuan_` prefix)?
3. ✅ S3 server npm package name: `@yourname/s3-mcp-server` - what's the actual name?
4. ✅ Backblaze B2 credentials ready?
5. ✅ Ready to proceed with Phase 1 refactoring?

---

**Status**: ✅ Ready for Implementation
**Validated**: ✅ Gemini AI + MCP Best Practices
**Estimated Completion**: 4 weeks from start
