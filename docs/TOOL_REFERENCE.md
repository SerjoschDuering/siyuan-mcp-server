# SiYuan MCP Server - Tool Reference

**Version**: 2.0.0
**Last Updated**: 2025-01-09
**Total Tools**: 49 (43 atomic + 6 composite)

This document is the complete API reference for all tools provided by the SiYuan MCP Server.

---

## Table of Contents

1. [Atomic Tools](#atomic-tools)
   - [1.1 Notebooks (8 tools)](#11-notebooks)
   - [1.2 Documents (7 tools)](#12-documents)
   - [1.3 Blocks (11 tools)](#13-blocks)
   - [1.4 Files (4 tools)](#14-files)
   - [1.5 Assets (1 tool)](#15-assets)
   - [1.6 Search & SQL (2 tools)](#16-search--sql)
   - [1.7 Export (2 tools)](#17-export)
   - [1.8 Attributes (2 tools)](#18-attributes)
   - [1.9 Templates (2 tools)](#19-templates)
   - [1.10 System (3 tools)](#110-system)
2. [Composite Tools](#2-composite-tools)
   - [2.1 Workspace Navigation (2 tools)](#21-workspace-navigation)
   - [2.2 Content Management (2 tools)](#22-content-management)
   - [2.3 Workflow Automation (2 tools)](#23-workflow-automation)
3. [Appendix](#3-appendix)
   - [3.1 Annotation Reference](#31-annotation-reference)
   - [3.2 Common Parameter Types](#32-common-parameter-types)

---

## 1. Atomic Tools

Atomic tools provide direct 1:1 access to SiYuan API endpoints.

### 1.1 Notebooks

#### `siyuan_listNotebooks`

**Description**: List all notebooks with their metadata.

**Parameters**: None

**Annotations**: `readOnlyHint`, `idempotentHint`

**Returns**:
```json
{
  "notebooks": [
    {
      "id": "20210817205410-2kvfpfn",
      "name": "Work Notes",
      "icon": "1f4d3",
      "closed": false,
      "sort": 0
    }
  ]
}
```

---

#### `siyuan_openNotebook`

**Description**: Open a closed notebook by its ID.

**Parameters**:
- `notebook` (string): Notebook ID

**Annotations**: None

**Example**:
```javascript
siyuan_openNotebook({ notebook: "20210817205410-2kvfpfn" })
```

---

#### `siyuan_closeNotebook`

**Description**: Close an open notebook by its ID.

**Parameters**:
- `notebook` (string): Notebook ID

**Annotations**: None

---

#### `siyuan_renameNotebook`

**Description**: Rename a notebook.

**Parameters**:
- `notebook` (string): Notebook ID
- `name` (string): New notebook name

**Annotations**: None

---

#### `siyuan_createNotebook`

**Description**: Create a new notebook.

**Parameters**:
- `name` (string): Notebook name

**Annotations**: None

**Returns**:
```json
{
  "notebook": {
    "id": "20250104120000-abc123",
    "name": "New Notebook"
  }
}
```

---

#### `siyuan_removeNotebook`

**Description**: Delete a notebook and all its contents.

**Parameters**:
- `notebook` (string): Notebook ID

**Annotations**: `destructiveHint`

⚠️ **Warning**: This permanently deletes all documents in the notebook.

---

#### `siyuan_getNotebookConf`

**Description**: Get notebook configuration including daily note settings.

**Parameters**:
- `notebook` (string): Notebook ID

**Annotations**: `readOnlyHint`

**Returns**:
```json
{
  "conf": {
    "dailyNoteSavePath": "/daily notes/{{now | date \"2006/01\"}}/{{now | date \"2006-01-02\"}}",
    "dailyNoteTemplatePath": "/templates/daily-note.md"
  }
}
```

---

#### `siyuan_setNotebookConf`

**Description**: Update notebook configuration.

**Parameters**:
- `notebook` (string): Notebook ID
- `conf` (object): Configuration object

**Annotations**: None

---

### 1.2 Documents

#### `siyuan_createDocWithMd`

**Description**: Create a new document with Markdown content.

**Parameters**:
- `notebook` (string): Notebook ID
- `path` (string): Document path (e.g., "/folder/document")
- `markdown` (string): Document content in Markdown format

**Annotations**: None

**Returns**:
```json
{
  "id": "20250104120000-abc123"
}
```

**Example**:
```javascript
siyuan_createDocWithMd({
  notebook: "20210817205410-2kvfpfn",
  path: "/projects/new-feature",
  markdown: "# New Feature\n\nThis document describes..."
})
```

---

#### `siyuan_renameDocByID`

**Description**: Rename a document by its ID (preferred over path-based rename).

**Parameters**:
- `notebook` (string): Notebook ID
- `id` (string): Document ID
- `title` (string): New document title

**Annotations**: None

---

#### `siyuan_removeDocByID`

**Description**: Delete a document by its ID (preferred).

**Parameters**:
- `notebook` (string): Notebook ID
- `id` (string): Document ID

**Annotations**: `destructiveHint`

---

#### `siyuan_moveDocsByID`

**Description**: Move multiple documents by IDs (preferred).

**Parameters**:
- `fromIDs` (string[]): Array of document IDs
- `toNotebook` (string): Target notebook ID
- `toPath` (string): Target path

**Annotations**: None

---

#### `siyuan_getHPathByID`

**Description**: Get human-readable path from document ID.

**Parameters**:
- `id` (string): Document ID

**Annotations**: `readOnlyHint`

---

#### `siyuan_getPathByID`

**Description**: Get storage path from document ID.

**Parameters**:
- `id` (string): Document ID

**Annotations**: `readOnlyHint`

---

#### `siyuan_getIDsByHPath`

**Description**: Get document IDs from human-readable path.

**Parameters**:
- `notebook` (string): Notebook ID
- `path` (string): Human-readable path

**Annotations**: `readOnlyHint`

**Returns**:
```json
["20240103092549-abc123"]
```

---

### 1.3 Blocks

#### `siyuan_insertBlock`

**Description**: Insert a new block at a specific position relative to anchor block.

**Parameters**:
- `dataType` (string): "markdown" or "dom"
- `data` (string): Block content
- `previousID` (string, optional): Insert after this block
- `parentID` (string, optional): Insert as child of this block
- `nextID` (string, optional): Insert before this block

**Annotations**: None

**Example**:
```javascript
siyuan_insertBlock({
  dataType: "markdown",
  data: "# New Heading",
  parentID: "20240103092549-abc123"
})
```

---

#### `siyuan_prependBlock`

**Description**: Prepend a block as the first child of parent.

**Parameters**:
- `dataType` (string): "markdown" or "dom"
- `data` (string): Block content
- `parentID` (string): Parent block ID

**Annotations**: None

---

#### `siyuan_appendBlock`

**Description**: Append a block as the last child of parent.

**Parameters**:
- `dataType` (string): "markdown" or "dom"
- `data` (string): Block content
- `parentID` (string): Parent block ID

**Annotations**: None

---

#### `siyuan_updateBlock`

**Description**: Update existing block content.

**Parameters**:
- `id` (string): Block ID
- `dataType` (string): "markdown" or "dom"
- `data` (string): New block content

**Annotations**: None

---

#### `siyuan_deleteBlock`

**Description**: Delete a block and all its children.

**Parameters**:
- `id` (string): Block ID

**Annotations**: `destructiveHint`

---

#### `siyuan_moveBlock`

**Description**: Move a block to a new position.

**Parameters**:
- `id` (string): Block ID to move
- `previousID` (string, optional): Move after this block
- `parentID` (string, optional): Move as child of this block

**Annotations**: None

---

#### `siyuan_foldBlock`

**Description**: Fold a block in the UI (collapse children).

**Parameters**:
- `id` (string): Block ID

**Annotations**: None

---

#### `siyuan_unfoldBlock`

**Description**: Unfold a block in the UI (expand children).

**Parameters**:
- `id` (string): Block ID

**Annotations**: None

---

#### `siyuan_getBlockKramdown`

**Description**: Get block content in Kramdown format.

**Parameters**:
- `id` (string): Block ID

**Annotations**: `readOnlyHint`

**Returns**:
```json
{
  "id": "20240103092549-abc123",
  "kramdown": "# Heading\n\nParagraph content"
}
```

---

#### `siyuan_getChildBlocks`

**Description**: Get all child blocks of a parent block.

**Parameters**:
- `id` (string): Parent block ID

**Annotations**: `readOnlyHint`

**Returns**:
```json
[
  {
    "id": "child-1",
    "type": "p",
    "content": "First paragraph"
  },
  {
    "id": "child-2",
    "type": "h",
    "content": "Heading"
  }
]
```

---

#### `siyuan_transferBlockRef`

**Description**: Transfer block references from one block to another.

**Parameters**:
- `fromID` (string): Source block ID
- `toID` (string): Target block ID

**Annotations**: None

---

### 1.4 Files

#### `siyuan_getFile`

**Description**: Get file content from workspace.

**Parameters**:
- `path` (string): File path relative to workspace

**Annotations**: `readOnlyHint`

**Returns**: File content (binary or text)

---

#### `siyuan_removeFile`

**Description**: Delete a file or directory.

**Parameters**:
- `path` (string): File/directory path

**Annotations**: `destructiveHint`

---

#### `siyuan_renameFile`

**Description**: Rename or move a file.

**Parameters**:
- `path` (string): Current file path
- `newPath` (string): New file path

**Annotations**: None

---

#### `siyuan_readDir`

**Description**: List directory contents.

**Parameters**:
- `path` (string): Directory path

**Annotations**: `readOnlyHint`

**Returns**:
```json
{
  "entries": [
    {
      "name": "file.txt",
      "isDir": false,
      "size": 1024
    }
  ]
}
```

---

### 1.5 Assets

#### `siyuan_uploadAsset`

**Description**: Upload files (images, PDFs, etc.) to SiYuan workspace.

**Parameters**:
- `files` (array): Array of file objects
  - `filename` (string): Original filename
  - `data` (string): Base64 encoded file data
  - `mimeType` (string, optional): MIME type (auto-detected if omitted)
- `assetsDirPath` (string, optional): Target directory (default: "/assets/")

**Annotations**: None

**Example**:
```javascript
siyuan_uploadAsset({
  files: [{
    filename: "screenshot.png",
    data: "iVBORw0KGgoAAAANSUhEUg..." // base64 encoded
  }],
  assetsDirPath: "/assets/screenshots/"
})
```

**Returns**:
```json
{
  "succMap": {
    "screenshot.png": "assets/screenshot-20250104120000-abc123.png"
  },
  "errFiles": []
}
```

**Limitations**:
- Max file size: 100MB
- Max files per request: 10
- Base64 overhead: ~33%

---

### 1.6 Search & SQL

#### `siyuan_sql`

**Description**: Execute SQL query on SiYuan database.

**Parameters**:
- `stmt` (string): SQL statement

**Annotations**: `readOnlyHint` (for SELECT queries)

**Example**:
```javascript
siyuan_sql({
  stmt: "SELECT id, content FROM blocks WHERE type = 'd' LIMIT 10"
})
```

**Returns**: Array of rows matching query

**Database Schema**: See SiYuan API documentation for table structures.

---

#### `siyuan_flushTransaction`

**Description**: Flush pending database transactions.

**Parameters**: None

**Annotations**: None

---

### 1.7 Export

#### `siyuan_exportMarkdown`

**Description**: Export document to Markdown format.

**Parameters**:
- `id` (string): Document ID

**Annotations**: `readOnlyHint`

**Returns**:
```json
{
  "zip": "base64_encoded_zip_data"
}
```

---

#### `siyuan_exportResources`

**Description**: Export files/folders as ZIP archive.

**Parameters**:
- `paths` (string[]): Array of paths to export

**Annotations**: `readOnlyHint`

**Returns**:
```json
{
  "zip": "base64_encoded_zip_data"
}
```

---

### 1.8 Attributes

#### `siyuan_getBlockAttrs`

**Description**: Get custom attributes of a block.

**Parameters**:
- `id` (string): Block ID

**Annotations**: `readOnlyHint`

**Returns**:
```json
{
  "custom-attr-1": "value1",
  "custom-attr-2": "value2"
}
```

---

#### `siyuan_setBlockAttrs`

**Description**: Set custom attributes on a block.

**Parameters**:
- `id` (string): Block ID
- `attrs` (object): Attributes to set

**Annotations**: `idempotentHint`

**Example**:
```javascript
siyuan_setBlockAttrs({
  id: "20240103092549-abc123",
  attrs: {
    "custom-status": "reviewed",
    "custom-priority": "high"
  }
})
```

---

### 1.9 Templates

#### `siyuan_renderTemplate`

**Description**: Render a template file with current context.

**Parameters**:
- `path` (string): Template file path

**Annotations**: `readOnlyHint`

**Returns**:
```json
{
  "content": "Rendered template content"
}
```

---

#### `siyuan_renderSprig`

**Description**: Render a Sprig template string.

**Parameters**:
- `template` (string): Sprig template string

**Annotations**: `readOnlyHint`, `idempotentHint`

**Example**:
```javascript
siyuan_renderSprig({
  template: "Today is {{now | date \"Monday, Jan 02\"}}"
})
// Returns: "Today is Friday, Jan 05"
```

---

### 1.10 System

#### `siyuan_bootProgress`

**Description**: Get SiYuan boot progress percentage.

**Parameters**: None

**Annotations**: `readOnlyHint`

**Returns**:
```json
{
  "progress": 100
}
```

---

#### `siyuan_version`

**Description**: Get SiYuan version information.

**Parameters**: None

**Annotations**: `readOnlyHint`, `idempotentHint`

**Returns**:
```json
{
  "version": "2.11.3"
}
```

---

#### `siyuan_currentTime`

**Description**: Get current server time as Unix timestamp.

**Parameters**: None

**Annotations**: `readOnlyHint`

**Returns**:
```json
{
  "time": 1704369600000
}
```

---

## 2. Composite Tools

Composite tools aggregate multiple API calls for optimized, hierarchical responses.

### 2.1 Workspace Navigation

#### `siyuan_getContentTree`

**Description**: Get hierarchical overview of notebooks and documents with content previews.

**Parameters**:
- `includeContent` (boolean, optional): Include content previews (default: true)
- `maxDepth` (number, optional): Maximum tree depth (default: 3)
- `contentLength` (number, optional): Preview length in chars (default: 200)

**Annotations**: `readOnlyHint`

**Returns**:
```json
{
  "summary": "Found 5 notebooks (4 open) containing 127 documents",
  "statistics": {
    "totalNotebooks": 5,
    "openNotebooks": 4,
    "totalDocuments": 127
  },
  "tree": [
    {
      "id": "20210817205410-2kvfpfn",
      "name": "Work Notes",
      "closed": false,
      "documentCount": 45,
      "documents": [
        {
          "id": "20240103092549-abc123",
          "path": "/Projects/Q1 Planning",
          "title": "Q1 2024 Roadmap",
          "preview": "# Q1 2024 Roadmap\n\nOur focus...",
          "size": "12.5KB",
          "created": "2024-01-03",
          "updated": "2024-01-04"
        }
      ]
    }
  ]
}
```

**Token Savings**: 20-50 API calls → 1 call (95% reduction)

---

#### `siyuan_getDocumentOutline`

**Description**: Get structured outline of a document with block hierarchy.

**Parameters**:
- `documentId` (string): Document ID
- `includeContent` (boolean, optional): Include content previews (default: true)
- `maxDepth` (number, optional): Maximum outline depth (default: 6)
- `contentLength` (number, optional): Preview length (default: 150)

**Annotations**: `readOnlyHint`

**Returns**:
```json
{
  "document": {
    "id": "20240103092549-abc123",
    "title": "Project Architecture",
    "path": "/Tech/Architecture"
  },
  "statistics": {
    "totalBlocks": 156,
    "headingCount": 12,
    "paragraphCount": 89
  },
  "tableOfContents": "• Introduction\n  • Background\n• Architecture",
  "outline": [
    {
      "id": "block-1",
      "type": "h",
      "headingLevel": 1,
      "heading": "Introduction",
      "preview": "This document describes...",
      "children": [...]
    }
  ]
}
```

**Token Savings**: 5-10 API calls → 1 call (80% reduction)

---

### 2.2 Content Management

#### `siyuan_searchWithContext`

**Description**: Search content and get results with surrounding context blocks.

**Parameters**:
- `query` (string): Search query
- `contextBlocks` (number, optional): Blocks before/after match (default: 2)
- `maxResults` (number, optional): Maximum results (default: 10)
- `searchType` (string, optional): "content", "title", or "all" (default: "all")

**Annotations**: `readOnlyHint`

**Returns**:
```json
{
  "query": "API integration",
  "resultCount": 8,
  "results": [
    {
      "id": "block-123",
      "content": "We need to implement API integration...",
      "highlighted": "We need to implement **API integration**...",
      "document": {
        "path": "/Projects/Payment System",
        "title": "Payment Gateway Integration"
      },
      "notebook": "Work Notes",
      "context": {
        "before": [
          {
            "type": "h",
            "content": "## Technical Requirements"
          }
        ],
        "after": [
          {
            "type": "p",
            "content": "The integration should..."
          }
        ]
      }
    }
  ]
}
```

**Token Savings**: 10-30 API calls → 1 call (90% reduction)

---

#### `siyuan_getRecentContent`

**Description**: Get recently modified content across all notebooks.

**Parameters**:
- `days` (number, optional): Look back N days (default: 7)
- `limit` (number, optional): Maximum items (default: 50)
- `includeContent` (boolean, optional): Include previews (default: true)

**Annotations**: `readOnlyHint`

**Returns**:
```json
{
  "summary": {
    "totalChanges": 142,
    "period": "Last 7 days",
    "today": 23,
    "yesterday": 31,
    "thisWeek": 88
  },
  "mostActiveNotebooks": [
    {
      "notebook": "Work Notes",
      "changes": 67
    }
  ],
  "recentContent": {
    "today": [
      {
        "id": "20250104120000-xyz",
        "type": "d",
        "title": "Meeting Notes",
        "preview": "Discussed Q1 roadmap...",
        "updated": "2025-01-04 14:30:00"
      }
    ],
    "yesterday": [...],
    "thisWeek": [...]
  }
}
```

**Token Savings**: 15-25 API calls → 1 call (85% reduction)

---

### 2.3 Workflow Automation

#### `siyuan_getOrCreateDailyNote`

**Description**: Get or create today's daily note in a single idempotent call.

**Parameters**:
- `notebookId` (string): Notebook ID where daily notes are stored

**Annotations**: `idempotentHint`

**Returns**:
```json
{
  "status": "exists",
  "id": "20250104120000-abc123",
  "path": "/daily notes/2025/01/2025-01-04",
  "created": false,
  "document": {
    "id": "20250104120000-abc123",
    "content": "# Monday, Jan 04",
    "created": "20250104120000",
    "updated": "20250104143000"
  }
}
```

**How It Works**:
1. Reads notebook's `dailyNoteSavePath` template
2. Renders template for today's date
3. Checks if document exists
4. If not, creates using `dailyNoteTemplatePath` template
5. Returns document ID (idempotent!)

**Token Savings**: 5 API calls → 1 call (80% reduction)

---

#### `siyuan_findTasks`

**Description**: Find all TODO items across workspace with rich context.

**Parameters**:
- `status` (string, optional): "open", "completed", or "all" (default: "open")
- `notebookId` (string, optional): Filter by notebook
- `documentId` (string, optional): Filter by document
- `daysBack` (number, optional): Only tasks updated in last N days
- `includeContext` (boolean, optional): Include parent heading (default: true)
- `limit` (number, optional): Maximum tasks (default: 100)

**Annotations**: `readOnlyHint`

**Returns**:
```json
{
  "total": 12,
  "status": "open",
  "statistics": {
    "total": 12,
    "open": 12,
    "completed": 0,
    "byNotebook": {
      "Work Notes": 8,
      "Personal": 4
    }
  },
  "tasks": [
    {
      "id": "20250104120000-task1",
      "text": "Review PR #123",
      "completed": false,
      "updated": "2025-01-04 14:30:00",
      "path": "/daily notes/2025/01/2025-01-04",
      "document": {
        "id": "20250104100000-doc1",
        "title": "Daily Note - Jan 04"
      },
      "notebook": {
        "id": "20210808180117-work",
        "name": "Work Notes"
      },
      "context": "## Sprint Tasks"
    }
  ]
}
```

**Token Savings**: 15-20 API calls → 1 call (90% reduction)

**Extensibility**: Future versions will support custom markers, priority tags, and due dates.

---

## 3. Appendix

### 3.1 Annotation Reference

| Annotation | Meaning | Example Tools |
|------------|---------|---------------|
| `readOnlyHint` | Doesn't modify environment | `listNotebooks`, `getFile`, `sql` (SELECT) |
| `destructiveHint` | Destructive operation | `removeNotebook`, `deleteBlock`, `removeFile` |
| `idempotentHint` | Repeated calls safe | `getOrCreateDailyNote`, `setBlockAttrs` |

### 3.2 Common Parameter Types

**Block ID**: 20-character format (e.g., `20210808180117-6v0mkxr`)

**Notebook ID**: Same format as Block ID

**Document Path**: Human-readable path (e.g., `/projects/architecture`)

**Storage Path**: Internal path format

**DataType**: `"markdown"` (Kramdown format) or `"dom"` (HTML)

**Markdown**: Standard Markdown with Kramdown extensions

---

**Version**: 2.0.0 | **Tools**: 49 (43 atomic + 6 composite) | **Status**: Production Ready ✅
